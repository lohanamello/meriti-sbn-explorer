import json
import unittest

from income import OUTPUT, MISSING_COLOR, color, number, source_rows


class IncomeTests(unittest.TestCase):
    def test_decimal_conventions_and_suppression(self):
        self.assertEqual(number('1893,05'), 1893.05)
        self.assertEqual(number('1849.5'), 1849.5)
        self.assertEqual(number('0'), 0)
        for missing in ['X', '-', '..', '...', '']:
            self.assertIsNone(number(missing))
            self.assertEqual(color(number(missing)), MISSING_COLOR)
        with self.assertRaises(ValueError):
            number('-1')

    def test_official_aggregates_at_each_scale_and_missing_geometries_are_preserved(self):
        app = json.loads((OUTPUT/'phase3-app-data.json').read_text())
        tables, _ = source_rows()
        income = app['income']
        self.assertEqual(income['sectorCoverage'], dict(total=809, published=805, no_record=2, suppressed=2))
        for unit in app['territorialUnits']:
            raw = tables[unit['unitType']].get(unit['id'])
            result = income['observations'][unit['id']]
            self.assertEqual(result['meanMonthlyBRL'], number(raw['V06004']) if raw else None)
            self.assertEqual(result['medianMonthlyBRL'], number(raw['V06006']) if raw else None)
        city = income['observations']['3305109']
        self.assertEqual(city['meanMonthlyBRL'], 1893.05)
        self.assertEqual(city['medianMonthlyBRL'], 1300)
        units = {u['id']: u for u in app['territorialUnits'] if u['unitType']=='census_sector'}
        for measure in ['median', 'mean']:
            geo = json.loads((OUTPUT/f'layers/income-{measure}.geojson').read_text())
            self.assertEqual(len(geo['features']), 809)
            self.assertEqual({f['properties']['id'] for f in geo['features']}, set(units))
            self.assertEqual(sum(f['properties']['overlayColor']==MISSING_COLOR for f in geo['features']), 4)
            for f in geo['features']:
                self.assertEqual(f['geometry'], units[f['properties']['id']]['geometry']['geometry'])
        self.assertNotIn('atlas-parque-novo-rio', income['observations'])


if __name__ == '__main__':
    unittest.main()
