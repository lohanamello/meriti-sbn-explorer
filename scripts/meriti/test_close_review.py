import copy
import json
import unittest

from close_review import ROOT, reconcile


class ClosureTest(unittest.TestCase):
    def setUp(self):
        root = ROOT / 'data/processed/meriti/validation'
        self.analysis = json.loads((root/'assisted-review.json').read_text())
        closure = json.loads((root/'review-closure.json').read_text())
        # Recover the inputs from the published audit, so raw backups are not needed for tests.
        self.old = {'schema': 'meriti.cell-reviews.v1', 'records': [
            r['previousHumanRecord'] if r['reviewOrigin']=='final_priority' else r['humanRecord']
            for r in closure['records'] if (r['previousHumanRecord'] if r['reviewOrigin']=='final_priority' else r['humanRecord'])]}
        self.final = {'schema': 'meriti.cell-reviews.v1', 'records': [r['humanRecord'] for r in closure['records'] if r['reviewOrigin']=='final_priority']}

    def test_preserves_all_human_answers_and_separates_legacy_from_presence(self):
        rows, summary, merged = reconcile(self.analysis, self.old, self.final)
        self.assertEqual((summary['humanPresenceReviewed'], summary['humanPresent'], summary['humanAbsent']), (72, 54, 18))
        self.assertEqual((summary['historicalCriterionRecords'], summary['automaticOnly']), (58, 270))
        self.assertEqual((len(rows), len(merged)), (400, 130))
        current = {r['sampleId']: r for r in merged}
        for r in self.old['records']:
            if r.get('criterion') == 'visible-vegetation-v1':
                self.assertEqual(current[r['sampleId']], r)
        self.assertTrue(all(r['humanPresence'] is None for r in rows if r['reviewOrigin'] in ('historical_criterion', 'automatic_only')))
        self.assertIsNone(summary['confidenceInterval'])
        self.assertIsNone(summary['municipalVegetationFraction'])

    def test_rejects_incomplete_duplicate_or_stale_final_reviews(self):
        missing = copy.deepcopy(self.final); missing['records'].pop()
        duplicate = copy.deepcopy(self.final); duplicate['records'].append(duplicate['records'][0])
        stale = copy.deepcopy(self.final)
        record = next(r for r in stale['records'] if self.analysis['priorityBaseline'][r['sampleId']])
        record['updatedAt'] = self.analysis['priorityBaseline'][record['sampleId']]
        for invalid in (missing, duplicate, stale):
            with self.assertRaises(ValueError):
                reconcile(self.analysis, self.old, invalid)


if __name__ == '__main__':
    unittest.main()
