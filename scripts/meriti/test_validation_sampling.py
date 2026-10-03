import copy
import math
import unittest

from validation_sampling import allocate, estimate_complete_sample


def fixture():
    design = dict(sampleCells=4, exactMunicipalAreaM2=1000, estimandDate='2026-10-01', strata=[
        dict(id='negative', populationCells=8, sampleCells=2),
        dict(id='positive', populationCells=2, sampleCells=2),
    ])
    master = [dict(sample_id=str(index), stratum='negative' if index < 2 else 'positive',
                   clipped_cell_area_m2=100) for index in range(4)]
    annotations = [dict(sample_id=str(index), review_status='adjudicated', live_vegetation_fraction=value,
        tree_canopy_fraction=value / 2, independent_reference_confirmed='yes', reference_source='Synthetic test fixture',
        reference_image_date='2026-10-01', reference_resolution_m='0.5', temporal_match_notes='Synthetic fixture',
        interpretation_method='Synthetic fixture', interpreter='Reader A', second_interpreter='Reader B',
        adjudication_notes='Synthetic fixture', reference_evidence_id=f'fixture-{index}',
        reference_adequacy_decision='approved', reference_adequacy_report='Synthetic fixture',
        pilot_concordance_report='Synthetic fixture', alignment_assessment_report='Synthetic fixture',
        reference_target_date='2026-10-01', temporal_stability_assessment='same_date', temporal_stability_report='')
        for index, value in enumerate([0.0, 0.5, 0.75, 1.0])]
    return master, annotations, design


class ValidationSamplingTests(unittest.TestCase):
    def test_weighted_total_and_finite_population_variance(self):
        result = estimate_complete_sample(*fixture())
        self.assertAlmostEqual(result['estimatedAreaM2'], 375)
        self.assertAlmostEqual(result['estimatedMunicipalPct'], 37.5)
        self.assertAlmostEqual(result['standardErrorAreaM2'], math.sqrt(30000))

    def test_tree_canopy_is_separate_subset(self):
        result = estimate_complete_sample(*fixture(), fraction_field='tree_canopy_fraction')
        self.assertAlmostEqual(result['estimatedAreaM2'], 187.5)

    def test_census_has_zero_sampling_variance(self):
        master, annotations, design = fixture()
        design['strata'][0]['populationCells'] = 2
        design['exactMunicipalAreaM2'] = 400
        result = estimate_complete_sample(master, annotations, design)
        self.assertAlmostEqual(result['estimatedAreaM2'], 225)
        self.assertEqual(result['standardErrorAreaM2'], 0)

    def test_missing_and_ambiguous_rows_cannot_be_excluded(self):
        master, annotations, design = fixture()
        with self.assertRaisesRegex(ValueError, 'exactly once'):
            estimate_complete_sample(master, annotations[:-1], design)
        annotations[0]['review_status'] = 'ambiguous'
        with self.assertRaisesRegex(ValueError, 'adjudicated'):
            estimate_complete_sample(master, annotations, design)

    def test_invalid_fractions_and_nonindependent_reference_are_rejected(self):
        for field, value in [('live_vegetation_fraction', ''), ('live_vegetation_fraction', 'nan'),
                             ('live_vegetation_fraction', 1.1), ('reference_source', ''),
                             ('reference_resolution_m', 0), ('independent_reference_confirmed', 'no'),
                             ('reference_adequacy_decision', 'pending'), ('pilot_concordance_report', ''),
                             ('alignment_assessment_report', ''),
                             ('second_interpreter', 'Reader A')]:
            with self.subTest(field=field, value=value):
                master, annotations, design = fixture()
                annotations[0][field] = value
                with self.assertRaises(ValueError):
                    estimate_complete_sample(master, annotations, design)

    def test_nominal_resolution_is_not_an_automatic_accuracy_gate(self):
        master, annotations, design = fixture()
        for row in annotations:
            row['reference_resolution_m'] = 2
        result = estimate_complete_sample(master, annotations, design)
        self.assertAlmostEqual(result['estimatedAreaM2'], 375)

    def test_target_date_must_be_explicit_in_design_and_annotation(self):
        master, annotations, design = fixture()
        design.pop('estimandDate')
        with self.assertRaisesRegex(ValueError, 'register the target'):
            estimate_complete_sample(master, annotations, design)
        master, annotations, design = fixture()
        annotations[0]['reference_target_date'] = '2026-09-01'
        with self.assertRaisesRegex(ValueError, 'must target'):
            estimate_complete_sample(master, annotations, design)

    def test_even_adjacent_date_requires_documented_stability(self):
        master, annotations, design = fixture()
        annotations[0]['reference_image_date'] = '2026-09-30'
        with self.assertRaisesRegex(ValueError, 'stable_at_target'):
            estimate_complete_sample(master, annotations, design)
        annotations[0]['temporal_stability_assessment'] = 'stable_at_target'
        with self.assertRaisesRegex(ValueError, 'documented stable_at_target'):
            estimate_complete_sample(master, annotations, design)
        annotations[0]['temporal_stability_report'] = 'Synthetic temporal evidence'
        result = estimate_complete_sample(master, annotations, design)
        self.assertEqual(result['estimandDate'], '2026-10-01')

    def test_unresolved_temporal_change_and_unknown_dates_are_rejected(self):
        for image_date, assessment in [('2026-04-26', 'changed_unresolved'),
                                       ('2026-09-30', 'ambiguous'),
                                       ('2026-10-01', 'ambiguous'),
                                       ('2026-08/2026-10', 'stable_at_target'),
                                       ('20261001', 'same_date'),
                                       ('unknown', 'stable_at_target')]:
            with self.subTest(image_date=image_date, assessment=assessment):
                master, annotations, design = fixture()
                annotations[0]['reference_image_date'] = image_date
                annotations[0]['temporal_stability_assessment'] = assessment
                annotations[0]['temporal_stability_report'] = 'Synthetic unresolved evidence'
                with self.assertRaises(ValueError):
                    estimate_complete_sample(master, annotations, design)

    def test_duplicate_ids_and_changed_sample_are_rejected(self):
        master, annotations, design = fixture()
        annotations[0] = copy.deepcopy(annotations[1])
        with self.assertRaisesRegex(ValueError, 'exactly once'):
            estimate_complete_sample(master, annotations, design)

    def test_allocation_covers_rare_and_negative_strata(self):
        result = allocate({'protected': 200, 'missing': 10, 'negative': 200000, 'positive': 10000}, 400)
        self.assertEqual(sum(result.values()), 400)
        self.assertGreaterEqual(result['protected'], 40)
        self.assertEqual(result['missing'], 10)
        self.assertGreaterEqual(result['positive'], 20)
        self.assertGreater(result['negative'], result['positive'])


if __name__ == '__main__':
    unittest.main()
