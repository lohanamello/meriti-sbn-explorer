import unittest

import pandas as pd

from field_evidence import arborization_record, count


class FieldEvidenceTests(unittest.TestCase):
    def test_published_municipality_denominator_includes_skipped(self):
        row = pd.Series({'V05200': '440574', 'V05230': '220713', 'V05231': '119051', 'V05232': '51157', 'V05233': '49285', 'V05234': '368'})
        value = arborization_record(row, 5200)
        self.assertEqual(value['withTrees'], 219493)
        self.assertAlmostEqual(value['withTreesPct'], 49.81978055899803)
        self.assertEqual(value['skipped'], 368)

    def test_suppressed_category_never_becomes_zero(self):
        row = pd.Series({'V05200': '20', 'V05230': '10', 'V05231': 'X', 'V05232': '0', 'V05233': '0', 'V05234': '0'})
        value = arborization_record(row, 5200)
        self.assertIsNone(value['withTrees'])
        self.assertIsNone(value['withTreesPct'])

    def test_zero_denominator_is_not_zero_percent(self):
        row = pd.Series({f'V{number:05d}': '0' for number in [5200, *range(5230, 5235)]})
        value = arborization_record(row, 5200)
        self.assertIsNone(value['withTreesPct'])
        self.assertIsNone(value['answeredPct'])

    def test_inconsistent_categories_fail(self):
        row = pd.Series({'V05200': '20', 'V05230': '10', 'V05231': '15', 'V05232': '0', 'V05233': '0', 'V05234': '0'})
        with self.assertRaises(ValueError):
            arborization_record(row, 5200)

    def test_missing_and_negative_counts(self):
        for symbol in ['X', '-', '..', '...', '']:
            self.assertIsNone(count(symbol))
        with self.assertRaises(ValueError):
            count('-1')


if __name__ == '__main__':
    unittest.main()
