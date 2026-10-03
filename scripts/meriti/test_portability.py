import hashlib
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import collect
import supplemental_sources


class PortabilityTests(unittest.TestCase):
    def test_collection_preserves_promoted_and_supplemental_rows(self):
        existing = {'seed': {'id': 'seed', 'status': 'curated'},
                    'supplement': {'id': 'supplement', 'status': 'promoted'}}
        result = collect.merge_inventory([{'id': 'seed', 'status': 'new'}, {'id': 'new'}], existing)
        self.assertEqual(result, [existing['seed'], {'id': 'new'}, existing['supplement']])
        self.assertEqual(len({row['id'] for row in result}), 3)

    def test_windows_receipt_paths_work_with_portable_root(self):
        parent = collect.ROOT / 'test-results/portability'
        parent.mkdir(parents=True, exist_ok=True)
        root = Path(tempfile.mkdtemp(dir=parent))
        folder = root / 'data/source'
        folder.mkdir(parents=True)
        content = b'preserved satellite crop'
        (folder / 'crop.tif').write_bytes(content)
        (folder / 'provenance.json').write_text(json.dumps({'files': [{
            'file': 'data\\source\\crop.tif', 'sha256': hashlib.sha256(content).hexdigest()
        }]}), encoding='utf-8')
        with patch.object(supplemental_sources, 'ROOT', root):
            supplemental_sources.verify_cached_inputs(folder)
            (folder / 'crop.tif').write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError, 'checksum mismatch'):
                supplemental_sources.verify_cached_inputs(folder)


if __name__ == '__main__':
    unittest.main()
