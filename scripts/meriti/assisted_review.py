"""Reproducible spectral triage; never creates independent reference labels.

The priority budget is a workload limit, not a confidence or acceptance threshold.
Legacy negatives were judged by predominance and cannot train an absence classifier.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import rasterio

ROOT = Path(__file__).resolve().parents[2]
CRITERION = 'visible-vegetation-v1'
VERSION = 'spectral-triage-v1'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def signal_class(ndvi):
    if ndvi is None:
        return 'insufficient_data'
    if ndvi >= .5:
        return 'strong_signal'
    if ndvi >= .3:
        return 'intermediate_signal'
    return 'weak_signal'


def assess(features, human=None):
    human = human or {}
    ndvi = features['ndvi2026']
    legacy = bool(human) and human.get('criterion') != CRITERION
    reviewed = human.get('criterion') == CRITERION and human.get('vegetation') in ('present', 'absent')
    reasons = []
    tier = 0
    if human.get('vegetation') == 'unsure':
        tier = 6
        reasons.append('Dúvida registrada pelo usuário')
    if legacy and human.get('vegetation') == 'absent' and ndvi is not None and ndvi >= .3:
        tier = max(tier, 5)
        reasons.append('Não confere antigo com sinal espectral de vegetação')
    if ndvi is None:
        tier = max(tier, 4)
        reasons.append('Sem composto recente válido nesta célula')
    if features['cellAreaM2'] < 50 or features['cbersMultispectralHasPixelCenter'] is False:
        tier = max(tier, 3)
        reasons.append('Célula pequena ou sem centro de pixel multiespectral na referência')
    low, high = features['neighborMin'], features['neighborMax']
    if low is not None and low < .3 and high >= .5:
        tier = max(tier, 2)
        reasons.append('Vizinhança com mistura de sinais; sensível ao alinhamento')
    old = features['ndvi2025']
    if ndvi is not None and old is not None and abs(ndvi - old) >= .2:
        tier = max(tier, 2)
        reasons.append('Diferença espectral entre 2025 e 2026; não prova mudança real')
    if ndvi is not None and .15 <= ndvi < .5:
        tier = max(tier, 2)
        reasons.append('Sinal intermediário ou baixo compatível com mistura de superfícies')
    if legacy and human.get('vegetation') == 'absent':
        tier = max(tier, 1)
        reasons.append('Resposta antiga ainda sem revisão pelo critério de presença')
    if ndvi is not None and ndvi < .3:
        reasons.append('Sinal baixo não exclui plantas pequenas')
    if not reasons:
        reasons.append('Sinal espectral forte; resultado automático ainda não validado')
    # Deterministic ordering within a tier. This number is not a probability.
    ambiguity = 0 if ndvi is None else max(0, 1 - abs(ndvi - .325) / .325)
    spread = 0 if low is None else min(1, high - low)
    score = round(tier * 100 + ambiguity * 20 + spread * 10, 6)
    return dict(signalClass=signal_class(ndvi), priorityScore=score, reasons=reasons,
                humanPresenceReviewed=reviewed, humanAnswer=human.get('vegetation'),
                humanCriterion=human.get('criterion'), needsReferenceReview=not reviewed,
                status='human_presence_draft' if reviewed else 'automatic_provisional',
                confidenceProbability=None, vegetationFraction=None)


def select_priorities(rows, budget):
    eligible = [r for r in rows if r['needsReferenceReview']]
    return [r['sampleId'] for r in sorted(eligible, key=lambda r: (-r['priorityScore'], r['sampleId']))[:budget]]


def build(backup, output, budget=30):
    file = json.loads(backup.read_text())
    if file.get('schema') != 'meriti.cell-reviews.v1':
        raise ValueError('Unsupported review backup')
    master_path = ROOT / 'data/processed/meriti/validation/sample-master.csv'
    master = list(csv.DictReader(master_path.open(encoding='utf-8-sig')))
    ids = {r['sample_id'] for r in master}
    human = {r['sampleId']: r for r in file['records']}
    if len(human) != len(file['records']) or not set(human).issubset(ids):
        raise ValueError('Duplicate or unknown human sample IDs')
    for row in human.values():
        if row.get('vegetation') not in ('present', 'absent', 'unsure') or row.get('criterion') not in (None, CRITERION):
            raise ValueError('Invalid human answer or criterion')
    paths = {name: ROOT / 'data/interim/meriti' / filename for name, filename in {
        'ndvi2026': 'sentinel2-ndvi-2026.tif', 'observations2026': 'sentinel2-observations-2026.tif',
        'ndvi2025': 'sentinel2-monthly-ndvi-2025.tif', 'recurrence2025': 'sentinel2-monthly-recurrence-2025.tif'
    }.items()}
    arrays = {}
    grid = None
    for key, path in paths.items():
        with rasterio.open(path) as source:
            signature = (source.crs, source.transform, source.shape)
            if grid is not None and signature != grid:
                raise ValueError('Source grids must be identical')
            grid = signature
            arrays[key] = source.read(1, masked=True).astype(float).filled(np.nan)
    chips_path = ROOT / 'data/interim/meriti/independent-reference-audit/CBERS_4A_WPM_20260702_198_142_L4/chips.json'
    chips = {r['sampleId']: r for r in json.loads(chips_path.read_text())['chips']}
    rows = []
    for row in master:
        r, c = int(row['grid_row']), int(row['grid_column'])
        def value(key):
            v = arrays[key][r, c]
            return float(v) if np.isfinite(v) else None
        ndvi = value('ndvi2026')
        expected = float(row['ndvi_median']) if row['ndvi_median'] else None
        if (ndvi is None) != (expected is None) or (ndvi is not None and abs(ndvi - expected) > 1e-6):
            raise ValueError('Master sample and raster disagree')
        patch = arrays['ndvi2026'][max(0, r-1):r+2, max(0, c-1):c+2]
        valid = patch[np.isfinite(patch)]
        band_presence = chips[row['sample_id']]['dataPresenceByBand'].get('BAND4')
        features = dict(ndvi2026=ndvi, observations2026=value('observations2026'), ndvi2025=value('ndvi2025'),
                        recurrence2025=value('recurrence2025'), cellAreaM2=float(row['clipped_cell_area_m2']),
                        neighborMin=float(valid.min()) if len(valid) else None,
                        neighborMax=float(valid.max()) if len(valid) else None,
                        cbersMultispectralHasPixelCenter=band_presence is not None)
        rows.append(dict(sampleId=row['sample_id'], features=features, **assess(features, human.get(row['sample_id']))))
    priority_ids = select_priorities(rows, budget)
    for row in rows:
        row['priorityRank'] = priority_ids.index(row['sampleId']) + 1 if row['sampleId'] in priority_ids else None
    positives = [r for r in rows if r['humanPresenceReviewed'] and r['humanAnswer'] == 'present']
    signal_counts = dict(Counter(r['signalClass'] for r in rows))
    summary = dict(analyzedCells=len(rows), humanSaved=len(human), humanPresenceReviewed=sum(r['humanPresenceReviewed'] for r in rows),
        humanConfirmedPresent=len(positives), humanConfirmedAbsent=sum(r['humanPresenceReviewed'] and r['humanAnswer'] == 'absent' for r in rows),
        legacyAbsent=sum(r.get('vegetation') == 'absent' and r.get('criterion') != CRITERION for r in human.values()),
        humanUnsure=sum(r.get('vegetation') == 'unsure' for r in human.values()),
        automaticProvisional=sum(r['status'] == 'automatic_provisional' for r in rows), priorityCells=len(priority_ids),
        signalCounts=signal_counts, legacyNegativesWithSignal=sum(r['humanAnswer'] == 'absent' and not r['humanPresenceReviewed'] and r['features']['ndvi2026'] is not None and r['features']['ndvi2026'] >= .3 for r in rows),
        reviewedPositivesBelow03=sum(r['features']['ndvi2026'] is not None and r['features']['ndvi2026'] < .3 for r in positives),
        unreviewedOutsidePriority=sum(r['needsReferenceReview'] and r['priorityRank'] is None for r in rows),
        confidenceInterval=None, acceptedVegetationFractions=0)
    limitations = [
        'Triagem automática de sinal espectral, não identificação de todas as plantas nem estimativa de fração vegetal.',
        'As 30 prioridades limitam o trabalho manual desta rodada; outras células continuam incertas.',
        'Os Não confere antigos misturam ausência e predominância de construções; não foram usados como negativos de treinamento.',
        'Só há exemplos positivos revistos: não há conjunto independente suficiente para calibrar probabilidades ou medir precisão.',
        'A seleção por dúvida é dirigida e não pode ser tratada como amostra aleatória para calcular área ou intervalo de confiança.',
        'As classes automáticas não substituem respostas humanas, não aprovam frações e não alteram a camada cartográfica.',
        'A comparação 2025–2026 sinaliza divergência entre compostos, não mudança comprovada. Esri não foi processada.',
    ]
    result = dict(schema='meriti.assisted-review.v1', version=VERSION, generatedAt=datetime.now(timezone.utc).isoformat(),
        summary=summary, priorityIds=priority_ids,
        priorityBaseline={sample_id: human.get(sample_id, {}).get('updatedAt') for sample_id in priority_ids},
        limitations=limitations, records=rows,
        method=dict(thresholds=[.3, .5], priorityBudget=budget, priorityOrder=['human_unsure', 'legacy_negative_with_signal', 'missing_data', 'small_cell', 'mixed_or_temporally_different', 'legacy_negative'],
                    scoreIsProbability=False, trainedClassifier=False, humanLabelsOverwritten=False,
                    recentCompositeDates=['2026-08-05','2026-10-01'], referenceDate='2026-07-02'),
        provenance=[dict(name=p.name, sha256=digest(p)) for p in [backup, master_path, chips_path, *paths.values()]])
    output.mkdir(parents=True, exist_ok=True)
    (output / 'assisted-review.json').write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False)+'\n')
    flat = [dict(sample_id=r['sampleId'], status=r['status'], spectral_signal=r['signalClass'], human_answer=r['humanAnswer'],
        human_criterion=r['humanCriterion'], priority_rank=r['priorityRank'], priority_score_not_probability=r['priorityScore'],
        **r['features'], reasons='; '.join(r['reasons']), vegetation_fraction='', confidence_probability='') for r in rows]
    with (output / 'assisted-review.csv').open('w', encoding='utf-8-sig', newline='') as f:
        writer=csv.DictWriter(f, fieldnames=list(flat[0])); writer.writeheader(); writer.writerows(flat)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return result


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--reviews', type=Path, required=True)
    parser.add_argument('--output', type=Path, default=ROOT / 'data/processed/meriti/validation')
    parser.add_argument('--budget', type=int, default=30)
    args=parser.parse_args()
    if not 1 <= args.budget <= 30:
        parser.error('Use a review budget from 1 to 30')
    build(args.reviews, args.output, args.budget)
