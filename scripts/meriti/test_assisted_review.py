import copy
import unittest

from assisted_review import CRITERION, assess, select_priorities


def features(ndvi=.1):
    return dict(ndvi2026=ndvi, ndvi2025=.1, cellAreaM2=100,
                cbersMultispectralHasPixelCenter=True, neighborMin=.08, neighborMax=.12)


class AssistedReviewTests(unittest.TestCase):
    def test_low_signal_does_not_overwrite_confirmed_presence_or_invent_confidence(self):
        human = dict(vegetation='present', criterion=CRITERION)
        original = copy.deepcopy(human)
        result = assess(features(), human)
        self.assertEqual(human, original)
        self.assertEqual(result['humanAnswer'], 'present')
        self.assertFalse(result['needsReferenceReview'])
        self.assertEqual(result['signalClass'], 'weak_signal')
        self.assertIsNone(result['confidenceProbability'])
        self.assertIsNone(result['vegetationFraction'])

    def test_legacy_absence_is_never_accepted_as_a_reviewed_negative(self):
        low = assess(features(), dict(vegetation='absent'))
        high = assess(features(.65), dict(vegetation='absent'))
        self.assertTrue(low['needsReferenceReview'])
        self.assertTrue(high['needsReferenceReview'])
        self.assertGreater(high['priorityScore'], low['priorityScore'])
        self.assertEqual(low['status'], 'automatic_provisional')

    def test_missing_data_and_unsure_are_not_silently_made_absent(self):
        result = assess(features(None), dict(vegetation='unsure', criterion=CRITERION))
        self.assertEqual(result['signalClass'], 'insufficient_data')
        self.assertEqual(result['humanAnswer'], 'unsure')
        self.assertTrue(result['needsReferenceReview'])

    def test_priority_budget_does_not_accept_unselected_cells(self):
        rows = [dict(sampleId=f'cell-{i:03}', **assess(features(.35))) for i in range(40)]
        rows.append(dict(sampleId='confirmed', **assess(features(), dict(vegetation='present', criterion=CRITERION))))
        original = copy.deepcopy(rows)
        selected = select_priorities(rows, 30)
        self.assertEqual(len(set(selected)), 30)
        self.assertNotIn('confirmed', selected)
        self.assertEqual(rows, original)
        self.assertEqual(sum(r['needsReferenceReview'] for r in rows), 40)


if __name__ == '__main__':
    unittest.main()
