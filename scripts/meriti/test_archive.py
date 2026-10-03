import hashlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import archive


class Response(io.BytesIO):
    def geturl(self):
        return 'https://example.org/source'


class ArchiveTests(unittest.TestCase):
    def setUp(self):
        directory = archive.ROOT / 'test-results/archive'
        directory.mkdir(parents=True, exist_ok=True)
        self.root = Path(tempfile.mkdtemp(dir=directory))
        self.content = b'frozen scientific input'
        self.entry = dict(path='data/input.bin', bytes=len(self.content),
                          sha256=hashlib.sha256(self.content).hexdigest(),
                          downloadUrl='https://example.org/source')

    def test_rejects_paths_outside_repository(self):
        for name in ['../secret', '/absolute', 'C:\\secret', 'data/../../secret']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                archive.archive_path(self.root, name)

    def test_download_checks_hash_and_size(self):
        with patch.object(archive, 'urlopen', return_value=Response(self.content)):
            archive.fetch_file(self.root, self.entry)
        self.assertEqual((self.root / self.entry['path']).read_bytes(), self.content)

    def test_mismatch_preserves_download_without_promoting_it(self):
        with patch.object(archive, 'urlopen', return_value=Response(b'x' * len(self.content))):
            with self.assertRaises(RuntimeError):
                archive.fetch_file(self.root, self.entry)
        self.assertFalse((self.root / self.entry['path']).exists())
        self.assertEqual(len(list(self.root.rglob('*.download-*'))), 1)

    def test_existing_modified_file_is_not_overwritten(self):
        target = self.root / self.entry['path']
        target.parent.mkdir(parents=True)
        target.write_bytes(b'new researcher annotations')
        with patch.object(archive, 'urlopen') as request, self.assertRaises(ValueError):
            archive.fetch_file(self.root, self.entry)
        request.assert_not_called()
        self.assertEqual(target.read_bytes(), b'new researcher annotations')

    def test_existing_correct_file_needs_no_network(self):
        target = self.root / self.entry['path']
        target.parent.mkdir(parents=True)
        target.write_bytes(self.content)
        with patch.object(archive, 'urlopen') as request:
            archive.fetch_file(self.root, self.entry)
        request.assert_not_called()

    def test_oversized_response_is_rejected(self):
        with patch.object(archive, 'urlopen', return_value=Response(self.content * 2)):
            with self.assertRaises(RuntimeError):
                archive.fetch_file(self.root, self.entry)
        self.assertFalse((self.root / self.entry['path']).exists())

    def test_missing_download_url_is_explicit(self):
        self.entry.pop('downloadUrl')
        with self.assertRaisesRegex(ValueError, 'Manual recovery'):
            archive.fetch_file(self.root, self.entry)


if __name__ == '__main__':
    unittest.main()
