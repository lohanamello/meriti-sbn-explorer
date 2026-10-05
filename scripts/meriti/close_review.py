"""Close the user-authorized visual review; preserve spectral and human evidence separately."""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from datetime import datetime
from pathlib import Path

from collect import ROOT, digest_file, now, write_json
from income import write_preserving_newlines

OUTPUT = ROOT / 'data/processed/meriti'
CRITERION = 'visible-vegetation-v1'
LIMITATIONS = [
    'A interpretação humana registra presença identificável de plantas, mesmo em pequena proporção; não mede fração de cobertura vegetal.',
    'As 30 células finais foram selecionadas por dúvida e divergência. Este subconjunto dirigido não permite estimar acurácia municipal ou intervalo de confiança.',
    'Os registros antigos de Não confere sem revisão do critério permanecem históricos: podem expressar predominância de construções, não ausência de plantas.',
    'As demais células mantêm apenas análise espectral ou registros históricos. A conclusão da rodada não transforma essas células em referências humanas.',
    'As imagens Esri têm datas variáveis; a referência CBERS de 02/07/2026 antecede a data-alvo de 01/10/2026 em 91 dias. Há diferenças de resolução, alinhamento e época.',
    'O mapa publica indicadores espectrais e modelos com suas definições originais. Não há fração vegetal municipal corrigida pela revisão, intervalo de confiança observado ou precisão validada.',
]


def records(file):
    if file.get('schema') != 'meriti.cell-reviews.v1':
        raise ValueError('Unsupported human review schema')
    result = {r['sampleId']: r for r in file['records']}
    if len(result) != len(file['records']):
        raise ValueError('Duplicate review IDs')
    for r in result.values():
        if r.get('vegetation') not in ('present', 'absent', 'unsure') or r.get('criterion') not in (None, CRITERION):
            raise ValueError('Invalid vegetation or criterion')
    return result


def reconcile(analysis, baseline, final):
    old, new = records(baseline), records(final)
    ids = {r['sampleId'] for r in analysis['records']}
    priorities = set(analysis['priorityIds'])
    if len(ids) != 400 or len(analysis['priorityIds']) != len(priorities) or len(priorities) != 30 or set(new) != priorities or not set(old) <= ids:
        raise ValueError('Expected exactly the registered 30 priorities from the 400-cell sample')
    for ident, r in new.items():
        if r.get('criterion') != CRITERION:
            raise ValueError('Final reviews must use the presence criterion')
        timestamp = datetime.fromisoformat(r['updatedAt'].replace('Z', '+00:00'))
        previous = analysis['priorityBaseline'][ident]
        if previous and timestamp <= datetime.fromisoformat(previous.replace('Z', '+00:00')):
            raise ValueError('Final review must postdate its registered baseline')
    merged = {**old, **new}
    rows = []
    for row in analysis['records']:
        ident = row['sampleId']
        human = merged.get(ident)
        has_criterion = bool(human) and human.get('criterion') == CRITERION
        origin = ('final_priority' if ident in new else 'previous_presence' if has_criterion
                  else 'historical_criterion' if human else 'automatic_only')
        rows.append(dict(sampleId=ident, signalClass=row['signalClass'], features=row['features'],
            originalPriorityRank=row['priorityRank'], reviewOrigin=origin,
            humanPresence=human['vegetation'] if has_criterion else None,
            humanRecord=human, previousHumanRecord=old.get(ident) if ident in new else None,
            vegetationFraction=None, confidenceProbability=None))
    reviewed = [r for r in rows if r['reviewOrigin'] in ('final_priority', 'previous_presence')]
    human_counts = Counter(r['humanPresence'] for r in reviewed)
    final_counts = Counter(r['vegetation'] for r in new.values())
    summary = dict(analyzedCells=len(rows), priorityCells=len(new), priorityCompleted=len(new),
        priorityPresent=final_counts['present'], priorityAbsent=final_counts['absent'], priorityUnsure=final_counts['unsure'],
        humanRecordsSaved=len(merged), humanPresenceReviewed=len(reviewed),
        humanPresent=human_counts['present'], humanAbsent=human_counts['absent'], humanUnsure=human_counts['unsure'],
        historicalCriterionRecords=sum(r['reviewOrigin'] == 'historical_criterion' for r in rows),
        automaticOnly=sum(r['reviewOrigin'] == 'automatic_only' for r in rows),
        withoutHumanPresenceReview=len(rows)-len(reviewed), signalCounts=analysis['summary']['signalCounts'],
        acceptedVegetationFractions=0, municipalVegetationFraction=None, confidenceInterval=None)
    return rows, summary, [merged[ident] for ident in sorted(merged)]


def enrich(bundle):
    closure_path = OUTPUT / 'validation/review-closure.json'
    if not closure_path.exists():
        return bundle
    closure = json.loads(closure_path.read_text())
    research = bundle['vegetationResearch']
    research['finalReview'] = {key: closure[key] for key in ('closedOn', 'status', 'summary', 'limitations')}
    research['validation']['status'] = 'presence_review_closed_no_area_estimate'
    for layer in bundle['evidenceLayers']:
        if layer['id'] == 'validation-sample':
            layer['label'] = 'Amostra metodológica · 400 células'
            layer['limitation'] = 'Amostra probabilística preservada. A rodada visual foi encerrada em 05/10/2026; os resultados e limites estão na metodologia. As respostas de presença não medem fração vegetal.'
    report = 'docs/methodology/meriti-review-final.md'
    if report not in bundle['methodologyFiles']:
        bundle['methodologyFiles'].append(report)
    return bundle


def close(baseline_path, final_path):
    analysis_path = OUTPUT / 'validation/assisted-review.json'
    analysis = json.loads(analysis_path.read_text())
    baseline_hashes = [p['sha256'] for p in analysis['provenance'] if p['name'] == baseline_path.name]
    if baseline_hashes != [digest_file(baseline_path)]:
        raise ValueError('Baseline backup must match the provenance registered for priority selection')
    rows, summary, merged = reconcile(analysis, json.loads(baseline_path.read_text()), json.loads(final_path.read_text()))
    result = dict(schema='meriti.review-closure.v1', status='closed', closedOn='2026-10-05', generatedAt=now(),
        summary=summary, limitations=LIMITATIONS, records=rows,
        method=dict(criterion=CRITERION, criterionDescription='Presença identificável de vegetação viva dentro da célula recortada, mesmo sem predominância.',
            excludedSurfaces=['solo exposto sem plantas', 'lastro ferroviário sem plantas', 'água sem plantas', 'telhados', 'asfalto'],
            trainedClassifier=False, areaEstimateCalculated=False, observedConfidenceIntervalCalculated=False,
            humanLabelsOverwrittenByAutomation=False, spectralMapRecalculated=False,
            recentCompositeDates=analysis['method']['recentCompositeDates'], referenceDate='2026-07-02',
            originalSampling='400 células estratificadas; grade de 10 m; semente 33051092026; pesos desiguais por estrato.',
            finalPrioritySelection='4 dúvidas humanas, 15 negativos antigos com NDVI ≥ 0,3, 11 sem composto recente válido.'),
        provenance=[dict(name=p.name, sha256=digest_file(p)) for p in (baseline_path, final_path, analysis_path)])
    target = OUTPUT / 'validation'
    write_json(target/'review-closure.json', result)
    write_json(target/'human-reviews-final.json', dict(schema='meriti.cell-reviews.v1', records=merged))
    flat = [dict(sample_id=r['sampleId'], spectral_signal=r['signalClass'], ndvi_2026=r['features']['ndvi2026'],
        review_origin=r['reviewOrigin'], human_presence=r['humanPresence'],
        historical_answer=r['humanRecord']['vegetation'] if r['reviewOrigin']=='historical_criterion' else None,
        original_priority_rank=r['originalPriorityRank'], vegetation_fraction='', confidence_probability='') for r in rows]
    with (target/'review-closure.csv').open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(flat[0])); writer.writeheader(); writer.writerows(flat)
    app_path = OUTPUT/'phase3-app-data.json'
    app = enrich(json.loads(app_path.read_text()))
    app['generatedAt'] = now()
    write_preserving_newlines(app_path, app)
    write_preserving_newlines(OUTPUT/'metadata/output-manifest.json', dict(generatedAt=now(), files=[dict(path=p.relative_to(ROOT).as_posix(), bytes=p.stat().st_size, sha256=digest_file(p)) for p in sorted(OUTPUT.rglob('*')) if p.is_file() and p.name!='output-manifest.json']))
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--final', type=Path, required=True)
    args = parser.parse_args()
    close(args.baseline, args.final)
