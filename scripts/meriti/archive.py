from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = ROOT / 'data/archive-manifest.json'


def archive_path(root, name):
    relative = PurePosixPath(name.replace('\\', '/'))
    if relative.is_absolute() or '..' in relative.parts or ':' in name:
        raise ValueError(f'Unsafe archive path: {name}')
    target = (root / relative).resolve()
    if not target.is_relative_to(root.resolve()) or target == root.resolve():
        raise ValueError(f'Archive path escapes repository: {name}')
    return target


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(4 * 1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def verify_file(path, entry):
    if not path.is_file():
        raise ValueError(f'Missing file: {entry["path"]}')
    if path.stat().st_size != entry['bytes'] or sha256(path) != entry['sha256']:
        raise ValueError(f'Content differs from frozen snapshot: {entry["path"]}')


def fetch_file(root, entry):
    target = archive_path(root, entry['path'])
    if target.exists():
        verify_file(target, entry)
        return 'already verified'
    url = entry.get('downloadUrl')
    if not url:
        raise ValueError(f'Manual recovery required: {entry.get("sourceUrl", entry["path"])}')
    parsed = urlsplit(url)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError('Downloads require HTTPS without embedded credentials')
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = target.with_name(target.name + '.download-' + uuid4().hex)
    try:
        with urlopen(Request(url, headers={'User-Agent': 'MeritiResearchArchive/1.0'}), timeout=90) as response:
            if urlsplit(response.geturl()).scheme != 'https':
                raise ValueError('The source redirected to an insecure URL')
            with partial.open('xb') as stream:
                received = 0
                for chunk in iter(lambda: response.read(4 * 1024 * 1024), b''):
                    received += len(chunk)
                    if received > entry['bytes']:
                        raise ValueError('The response exceeds the recorded file size')
                    stream.write(chunk)
        verify_file(partial, entry)
        if target.exists():
            raise ValueError('Destination appeared during download; refusing to replace it')
        partial.rename(target)
    except Exception as error:
        raise RuntimeError(f'{error}. Any partial download is preserved at {partial}') from error
    return 'downloaded and verified'


def main():
    parser = argparse.ArgumentParser(description='Verify the frozen research snapshot or recover omitted inputs.')
    sub = parser.add_subparsers(dest='action', required=True)
    sub.add_parser('list')
    verify = sub.add_parser('verify')
    verify.add_argument('--all-present', action='store_true')
    verify.add_argument('--require-all', action='store_true')
    fetch = sub.add_parser('fetch')
    selection = fetch.add_mutually_exclusive_group(required=True)
    selection.add_argument('--path', action='append')
    selection.add_argument('--all-external', action='store_true')
    args = parser.parse_args()
    entries = json.loads(MANIFEST.read_text(encoding='utf-8'))['files']
    if args.action == 'list':
        for entry in entries:
            if not entry['included']:
                print(f'{entry["bytes"] / 1024**3:.3f} GiB  {entry["path"]}')
                print(entry.get('downloadUrl', entry.get('sourceUrl')))
        return
    failures = []
    checked = 0
    if args.action == 'fetch':
        paths = set(args.path or [])
        known = {entry['path'] for entry in entries}
        if paths - known:
            parser.error(f'Paths are not registered in the manifest: {sorted(paths - known)}')
    for entry in entries:
        try:
            target = archive_path(ROOT, entry['path'])
            if args.action == 'verify':
                selected = entry['included'] or args.require_all or (args.all_present and target.exists())
                if not selected:
                    continue
                verify_file(target, entry)
            else:
                selected = entry['path'] in paths or (args.all_external and not entry['included'])
                if not selected:
                    continue
                print(entry['path'], fetch_file(ROOT, entry), flush=True)
            checked += 1
        except (OSError, ValueError, RuntimeError) as error:
            failures.append(str(error))
            print(f'FAIL: {error}', flush=True)
    print(f'{checked} files verified; {len(failures)} failures.')
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
