from __future__ import annotations

import argparse
import csv
import json
import math
from datetime import date
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
import shapely
from rasterio.features import geometry_mask
from rasterio.warp import Resampling, reproject

from collect import ROOT, digest_file, write_json


OUTPUT = ROOT / 'data/processed/meriti/validation'
NDVI = ROOT / 'data/interim/meriti/sentinel2-ndvi-2026.tif'
CITY = ROOT / 'data/processed/meriti/layers/municipality.geojson'
PROTECTED = ROOT / 'data/processed/meriti/layers/protected-areas.geojson'
LAND_COVER = ROOT / 'data/interim/meriti/land-cover-2023.tif'
SEED = 33051092026
TARGET_DATE = '2026-10-01'
REFERENCE_FIELDS = [
    'review_status', 'live_vegetation_fraction', 'tree_canopy_fraction',
    'reference_source', 'reference_image_date', 'reference_resolution_m',
    'temporal_match_notes', 'interpretation_method', 'interpreter',
    'second_interpreter', 'adjudication_notes', 'reference_evidence_id',
    'independent_reference_confirmed', 'notes',
]
ADEQUACY_FIELDS = [
    'reference_adequacy_decision', 'reference_adequacy_report',
    'pilot_concordance_report', 'alignment_assessment_report',
]
TEMPORAL_FIELDS = ['reference_target_date', 'temporal_stability_assessment', 'temporal_stability_report']


def workspace_path(value):
    path = Path(value).resolve()
    if not path.is_relative_to(ROOT):
        raise ValueError('Validation files must remain inside the project workspace.')
    return path


def allocate(counts, sample_size):
    allocation = {key: min(count, 40 if key == 'protected' else 20) for key, count in counts.items()}
    if sum(allocation.values()) > sample_size or sample_size > sum(counts.values()):
        raise ValueError('Sample size cannot satisfy the registered minimums or exceeds the population.')
    while sum(allocation.values()) < sample_size:
        candidates = [key for key in sorted(counts) if allocation[key] < counts[key]]
        key = max(candidates, key=lambda candidate: counts[candidate] / (allocation[candidate] + 1))
        allocation[key] += 1
    return allocation


def write_csv(path, rows, fields):
    with path.open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows({field: row.get(field, '') for field in fields} for row in rows)


def prepare_review(output=OUTPUT):
    output = workspace_path(output)
    destination = output / 'review-blinded-v3.csv'
    schema_path = output / 'review-form-v3.json'
    if destination.exists() or schema_path.exists():
        raise ValueError('The revised review form already exists. Preserve its annotations.')
    master_path = output / 'sample-master.csv'
    records = read_csv(master_path)
    for record in records:
        record['reference_target_date'] = TARGET_DATE
    fields = ['sample_id', 'longitude', 'latitude', 'clipped_cell_area_m2', *REFERENCE_FIELDS, *ADEQUACY_FIELDS, *TEMPORAL_FIELDS]
    write_csv(destination, records, fields)
    write_json(schema_path, dict(schemaVersion=3, form=destination.name, masterSha256=digest_file(master_path),
        formSha256=digest_file(destination), fields=fields,
        estimandDate=TARGET_DATE,
        temporalFields=dict(
            reference_target_date=f'Must equal {TARGET_DATE}; this is the date of the living-vegetation fraction, not the acquisition window used to stratify the sample',
            temporal_stability_assessment='same_date if the reference image was acquired on the target date; otherwise stable_at_target only after documented evidence supports unchanged fractions at the target date; pending, ambiguous or changed_unresolved block estimation',
            temporal_stability_report='Required traceable report for every reference acquisition date different from the target date, even adjacent dates; must document observations, dates, methods and the assessment of stability at the target date'),
        adequacyFields=dict(
            reference_adequacy_decision='approved only after the documented reference pilot and alignment review establish suitability for the target fraction; otherwise pending or rejected',
            reference_adequacy_report='Traceable report identifier evaluating temporal suitability, spatial resolution, cloud/shadow/missing data, mixed vegetation fractions and source limitations',
            pilot_concordance_report='Traceable independent pilot report documenting interpreter agreement and ambiguity for vegetation fractions across urban conditions',
            alignment_assessment_report='Traceable report of registration checks and residuals, independent check points when adjustment is applied, and consequences for the target fractions'),
        limitation='No fixed pixel-size cutoff certifies reference adequacy. These fields preserve the scientific review decision; software cannot verify the truth of an attestation.'))
    return destination


def generate(output=OUTPUT, sample_size=400, seed=SEED):
    output = workspace_path(output)
    if output.exists() and any(output.iterdir()):
        raise ValueError('Output already contains files. Choose a new directory to preserve samples and annotations.')
    with rasterio.open(NDVI) as source:
        ndvi, transform, crs = source.read(1), source.transform, source.crs
        nodata = source.nodata
    if crs.to_epsg() != 32723 or transform.a != 10 or transform.e != -10 or transform.b or transform.d:
        raise ValueError('The registered sampling design requires the native north-up 10 m EPSG:32723 grid.')
    city = gpd.read_file(CITY).to_crs(crs).geometry.union_all()
    protected = gpd.read_file(PROTECTED)
    protected = protected[protected.geometry.geom_type.isin(['Polygon', 'MultiPolygon'])].to_crs(crs)
    protected_union = protected.geometry.union_all()
    touched = geometry_mask([city], out_shape=ndvi.shape, transform=transform, invert=True, all_touched=True)
    rows, columns = np.nonzero(touched)
    xs = transform.c + columns * transform.a
    ys = transform.f + rows * transform.e
    cells = shapely.intersection(shapely.box(xs, ys - 10, xs + 10, ys), city)
    areas = shapely.area(cells)
    has_area = areas > 0
    rows, columns, cells, areas = rows[has_area], columns[has_area], cells[has_area], areas[has_area]
    if abs(float(areas.sum()) - city.area) > 0.01:
        raise ValueError('Sampling cells do not conserve the exact municipal polygon area.')
    in_protected = shapely.area(shapely.intersection(cells, protected_union)) > 0
    historical = np.zeros(ndvi.shape, dtype='uint8')
    with rasterio.open(LAND_COVER) as source:
        reproject(rasterio.band(source, 1), historical, src_transform=source.transform, src_crs=source.crs,
                  dst_transform=transform, dst_crs=crs, resampling=Resampling.nearest, src_nodata=source.nodata, dst_nodata=0)
    values = ndvi[rows, columns]
    valid = np.isfinite(values) & (values != nodata)
    bands = np.select([~valid, values < 0.3, values < 0.4, values < 0.5],
                      ['missing', 'below_0_3', '0_3_to_0_4', '0_4_to_0_5'], default='at_least_0_5')
    urban = historical[rows, columns] == 24
    strata = np.array([
        'protected' if protected_flag else 'missing' if band == 'missing' else
        f"{'urban_2023' if urban_flag else 'other_2023'}__{band}"
        for protected_flag, band, urban_flag in zip(in_protected, bands, urban)
    ])
    keys, population_counts = np.unique(strata, return_counts=True)
    counts = {str(key): int(count) for key, count in zip(keys, population_counts)}
    allocation = allocate(counts, sample_size)
    rng = np.random.Generator(np.random.PCG64(seed))
    selected = []
    stratum_reports = []
    for key in sorted(counts):
        population = np.flatnonzero(strata == key)
        selected.extend(rng.choice(population, size=allocation[key], replace=False).tolist())
        stratum_reports.append(dict(id=key, populationCells=counts[key], sampleCells=allocation[key],
                                    areaM2=float(areas[population].sum()), inclusionProbability=allocation[key] / counts[key]))
    selected = np.array(selected)[rng.permutation(sample_size)]
    selected_polygons = gpd.GeoSeries(cells[selected], crs=crs)
    selected_points = selected_polygons.representative_point().to_crs(4326)
    records = []
    for number, (index, point) in enumerate(zip(selected, selected_points), start=1):
        key = str(strata[index])
        records.append(dict(sample_id=f'MERITI-V1-{number:04d}', grid_row=int(rows[index]), grid_column=int(columns[index]),
            longitude=float(point.x), latitude=float(point.y), stratum=key, stratum_population=counts[key],
            stratum_sample=allocation[key], inclusion_probability=allocation[key] / counts[key],
            expansion_weight=counts[key] / allocation[key], clipped_cell_area_m2=float(areas[index]),
            ndvi_median=float(values[index]) if valid[index] else None, ndvi_band=str(bands[index]),
            mapbiomas_class_2023=int(historical[rows[index], columns[index]]),
            intersects_protected_area=bool(in_protected[index]),
            **dict.fromkeys(REFERENCE_FIELDS, '')))
    output.mkdir(parents=True, exist_ok=True)
    write_csv(output / 'sample-master.csv', records, list(records[0]))
    blinded_fields = ['sample_id', 'longitude', 'latitude', 'clipped_cell_area_m2', *REFERENCE_FIELDS]
    write_csv(output / 'review-blinded.csv', records, blinded_fields)
    blinded_properties = [{field: row[field] for field in ['sample_id', 'clipped_cell_area_m2']} for row in records]
    gpd.GeoDataFrame(blinded_properties, geometry=selected_points, crs=4326).to_file(output / 'sample-points-blinded.geojson', driver='GeoJSON')
    gpd.GeoDataFrame(blinded_properties, geometry=selected_polygons.to_crs(4326), crs=4326).to_file(output / 'sample-cells-blinded.geojson', driver='GeoJSON')
    prepare_review(output)
    planning_variance = sum(
        entry['populationCells'] ** 2 * (1 - entry['inclusionProbability']) *
        (entry['populationCells'] / (entry['populationCells'] - 1) if entry['populationCells'] > 1 else 0) *
        100 ** 2 / (4 * entry['sampleCells']) for entry in stratum_reports)
    report = dict(designId='meriti-live-vegetation-v1', status='awaiting_independent_reference', seed=seed,
        randomGenerator='numpy.random.PCG64', numpyVersion=np.__version__, sampleCells=sample_size,
        populationCells=int(len(cells)), exactMunicipalAreaM2=float(city.area), crs=str(crs),
        gridTransform=list(transform)[:6], cellSizeMeters=10, strata=stratum_reports,
        estimandDate=TARGET_DATE,
        stratificationImagePeriod=dict(start='2026-08-05', end='2026-10-01'),
        target=f'Projected horizontal fraction of living vegetation on {TARGET_DATE} in the municipal polygon, including trees, shrubs and herbaceous vegetation. Tree canopy is optional and remains a subset. The multi-date stratification composite is not the estimand.',
        unit='Intersection of one native 10 m grid cell with the exact municipal polygon. Reference fraction applies to this clipped cell, not just the marker point.',
        allocation='Minimum 40 protected cells and 20 per other nonempty stratum, capped at population size. Remaining units assigned by largest N_h/(n_h+1), ties by sorted stratum ID.',
        stratumOrder='Positive-area protected-area intersection first; otherwise missing NDVI; otherwise NDVI bins crossed with MapBiomas 2023 urban class 24 versus other classes.',
        planningNormal95HalfWidthPctUpperBound=100 * 1.96 * math.sqrt(planning_variance) / city.area,
        planningLimitation='Conservative normal-approximation planning bound using outcomes between 0 and 100 m2. Not an observed confidence interval, accuracy score, or guaranteed precision.',
        estimator='Stratified Horvitz-Thompson total: sum_h N_h mean_h(clipped_cell_area_m2 * live_vegetation_fraction). SRS without replacement variance with finite-population correction.',
        referenceLabelsCompleted=0,
        inputs=[dict(path=path.relative_to(ROOT).as_posix(), sha256=digest_file(path)) for path in [NDVI, CITY, PROTECTED, LAND_COVER]],
        files=[dict(name=path.name, sha256=digest_file(path)) for path in sorted(output.iterdir()) if path.is_file()])
    write_json(output / 'sampling-design.json', report)
    print(json.dumps({key: report[key] for key in ['status', 'sampleCells', 'populationCells', 'exactMunicipalAreaM2', 'planningNormal95HalfWidthPctUpperBound']}, ensure_ascii=False))
    return report


def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def estimate_complete_sample(master, annotations, design, fraction_field='live_vegetation_fraction'):
    if design.get('estimandDate') != TARGET_DATE:
        raise ValueError(f'The sampling design must explicitly register the target estimand date {TARGET_DATE}.')
    if len(master) != design['sampleCells'] or len({row['sample_id'] for row in master}) != len(master):
        raise ValueError('Master sample count or uniqueness differs from the sampling design.')
    if len(annotations) != len(master) or len({row['sample_id'] for row in annotations}) != len(annotations):
        raise ValueError('All registered sample units must be annotated exactly once. No silent nonresponse exclusions.')
    annotation_map = {row['sample_id']: row for row in annotations}
    if set(annotation_map) != {row['sample_id'] for row in master}:
        raise ValueError('Annotation IDs differ from the registered probability sample.')
    groups = {entry['id']: [] for entry in design['strata']}
    for row in master:
        annotation = annotation_map[row['sample_id']]
        if annotation.get('review_status') != 'adjudicated' or annotation.get('independent_reference_confirmed') != 'yes':
            raise ValueError(f"{row['sample_id']}: independent adjudicated reference is required.")
        required = ['reference_source', 'reference_image_date', 'reference_resolution_m', 'temporal_match_notes',
                    'interpretation_method', 'interpreter', 'second_interpreter', 'adjudication_notes', 'reference_evidence_id',
                    'reference_adequacy_report', 'pilot_concordance_report', 'alignment_assessment_report']
        if any(not str(annotation.get(field, '')).strip() for field in required):
            raise ValueError(f"{row['sample_id']}: incomplete reference provenance.")
        if annotation.get('reference_adequacy_decision') != 'approved':
            raise ValueError(f"{row['sample_id']}: documented pilot and alignment assessment must approve reference adequacy.")
        if annotation.get('reference_target_date') != TARGET_DATE:
            raise ValueError(f"{row['sample_id']}: the reference fraction must target {TARGET_DATE}.")
        try:
            image_date = date.fromisoformat(annotation['reference_image_date'])
        except (TypeError, ValueError) as error:
            raise ValueError(f"{row['sample_id']}: a single actual reference acquisition date in YYYY-MM-DD format is required.") from error
        if annotation['reference_image_date'] != image_date.isoformat():
            raise ValueError(f"{row['sample_id']}: reference acquisition date must use the exact YYYY-MM-DD format.")
        stability = annotation.get('temporal_stability_assessment')
        if image_date.isoformat() == TARGET_DATE:
            if stability != 'same_date':
                raise ValueError(f"{row['sample_id']}: reference from the target date must be explicitly assessed as same_date.")
        elif stability != 'stable_at_target' or not str(annotation.get('temporal_stability_report', '')).strip():
            raise ValueError(f"{row['sample_id']}: a different acquisition date requires a documented stable_at_target assessment; unresolved change blocks estimation.")
        if annotation['interpreter'].strip() == annotation['second_interpreter'].strip():
            raise ValueError(f"{row['sample_id']}: reviewers must be different people.")
        resolution = float(annotation['reference_resolution_m'])
        if not np.isfinite(resolution) or resolution <= 0:
            raise ValueError(f"{row['sample_id']}: a positive finite reference resolution is required; nominal resolution alone does not certify adequacy.")
        try:
            live_fraction = float(annotation['live_vegetation_fraction'])
            value = float(annotation[fraction_field])
        except (TypeError, ValueError, KeyError) as error:
            raise ValueError(f"{row['sample_id']}: complete numeric fractions are required, never zero-fill missing labels.") from error
        if not np.isfinite(live_fraction) or not np.isfinite(value) or not 0 <= value <= live_fraction <= 1:
            raise ValueError(f"{row['sample_id']}: fractions must satisfy 0 <= tree fraction <= live vegetation fraction <= 1.")
        groups[row['stratum']].append(float(row['clipped_cell_area_m2']) * value)
    total, variance = 0.0, 0.0
    for entry in design['strata']:
        values = np.array(groups[entry['id']], dtype=float)
        population, sample = entry['populationCells'], entry['sampleCells']
        if len(values) != sample or (sample < 2 and sample != population):
            raise ValueError('Stratum sample size does not support the registered variance estimator.')
        total += population * values.mean()
        variance += population ** 2 * (1 - sample / population) * (values.var(ddof=1) if sample > 1 else 0) / sample
    area = design['exactMunicipalAreaM2']
    half_width = 1.96 * math.sqrt(variance)
    return dict(status='estimated_from_complete_reference', estimandDate=TARGET_DATE, measure=fraction_field, estimatedAreaM2=total,
        estimatedAreaHa=total / 10000, estimatedMunicipalPct=100 * total / area,
        standardErrorAreaM2=math.sqrt(variance), normal95AreaM2=[total - half_width, total + half_width],
        normal95MunicipalPct=[100 * (total - half_width) / area, 100 * (total + half_width) / area],
        sampleCells=len(master), uncertainty='Design-based sampling uncertainty only, conditional on the reference fractions. Normal approximation; limits are not truncated. Does not include reference error, temporal mismatch or geolocation error.')


def estimate(annotation_path, design_dir=OUTPUT, output_path=None, tree_canopy=False):
    design_dir, annotation_path = workspace_path(design_dir), workspace_path(annotation_path)
    design = json.loads((design_dir / 'sampling-design.json').read_text(encoding='utf-8'))
    master_path = design_dir / 'sample-master.csv'
    expected = next(item['sha256'] for item in design['files'] if item['name'] == master_path.name)
    if digest_file(master_path) != expected:
        raise ValueError('The registered master sample was altered.')
    result = estimate_complete_sample(read_csv(master_path), read_csv(annotation_path), design,
                                      'tree_canopy_fraction' if tree_canopy else 'live_vegetation_fraction')
    result['annotationSha256'] = digest_file(annotation_path)
    result['samplingDesignSha256'] = digest_file(design_dir / 'sampling-design.json')
    if output_path:
        output_path = workspace_path(output_path)
        if output_path.exists():
            raise ValueError('Refusing to overwrite an existing validation result.')
        write_json(output_path, result)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest='command', required=True)
    sample_parser = subparsers.add_parser('generate')
    sample_parser.add_argument('--output', type=workspace_path, default=OUTPUT)
    sample_parser.add_argument('--sample-size', type=int, default=400)
    sample_parser.add_argument('--seed', type=int, default=SEED)
    estimate_parser = subparsers.add_parser('estimate')
    estimate_parser.add_argument('--annotations', type=workspace_path, required=True)
    estimate_parser.add_argument('--design-dir', type=workspace_path, default=OUTPUT)
    estimate_parser.add_argument('--output', type=workspace_path)
    estimate_parser.add_argument('--tree-canopy', action='store_true')
    review_parser = subparsers.add_parser('prepare-review')
    review_parser.add_argument('--design-dir', type=workspace_path, default=OUTPUT)
    arguments = parser.parse_args()
    if arguments.command == 'generate':
        generate(arguments.output, arguments.sample_size, arguments.seed)
    elif arguments.command == 'estimate':
        estimate(arguments.annotations, arguments.design_dir, arguments.output, arguments.tree_canopy)
    else:
        print(prepare_review(arguments.design_dir))
