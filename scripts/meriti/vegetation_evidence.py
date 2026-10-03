from __future__ import annotations

import json
import shutil

from collect import ROOT, write_json
from curate import INTERIM, OUTPUT, LAYERS
from vegetation_palette import CANOPY_CLASSES

CHM_ID='meta_wri__canopy_height_v2__2026'
CBERS_ID='inpe__cbers4a_wpm_rgb__20260426'
SEASONAL_ID='copernicus__sentinel2_meriti_mensal__2025'
SOURCE_IDS={CHM_ID,CBERS_ID,SEASONAL_ID}
FIELD_ID='ibge__entorno_arborizacao__2022'


def publish_field_evidence():
    field=report('field-evidence/ibge-arborizacao-statistics.json')
    collection=report('field-evidence/ibge-arborizacao-setores.geojson')
    layer=report('field-evidence/layer-text.json')
    colors=[entry['color'] for entry in layer['legend']]
    for feature in collection['features']:
        props=feature['properties']
        value=props['residentsWithTreesPct']
        props['overlayColor']=colors[4] if value is None else colors[sum(value>=edge for edge in [25,50,75])]
        props['sourceDate']='Censo 2022; coleta de 20/06/2022 a 28/05/2023'
        props['category']='Moradores em faces com árvores: sem dado publicado' if value is None else f'Moradores em faces com árvores: {value:.2f}%'.replace('.',',')
        props['geometryMethod']='Percentual do universo do entorno, incluindo quesito saltado. Não é porcentagem de área vegetal.'
    write_json(LAYERS/'street-trees-census.geojson',collection)
    layer.update(status='available',layerFile='layers/street-trees-census.geojson',resolution='Moradores em faces com árvores, por setor')
    return layer,{key:field[key] for key in ['sourceId','sourceUrl','publicationUrl','referencePeriod','publicationDate','scope','denominator','validationUse','summary','observations']}


def report(name):
    return json.loads((INTERIM/name).read_text(encoding='utf-8'))


def image_layer(ident,label,data,period,resolution,colors,limitation,attribution,role='evidence'):
    image=data['image']
    source=ROOT/image['file'] if image['file'].startswith('data/') else OUTPUT/image['file']
    destination=OUTPUT/'rasters'/source.name
    if source.resolve()!=destination.resolve():
        shutil.copyfile(source,destination)
    return dict(id=ident,label=label,family='Investigação da vegetação',status='available',layerFile=destination.relative_to(OUTPUT).as_posix(),
        image=dict(role=role,**{key:image[key] for key in ['coordinates','width','height']}),temporalCoverage=period,resolution=resolution,
        sourceDatasetIds=[data['sourceId']],legend=[dict(label=label,color=color) for label,color in colors],limitation=limitation,attribution=attribution)


def publish():
    canopy=report('chmv2-statistics.json')
    season=report('sentinel2-seasonality-2025.json')
    cbers=report('cbers4a-statistics.json')
    design=json.loads((OUTPUT/'validation/sampling-design.json').read_text(encoding='utf-8'))
    layers=[
        image_layer('canopy-height','Altura modelada de copas · 2019',canopy,'Imagem de 16/09/2019; modelo publicado em 2026',
            'Grade próxima de 1,1 m no terreno; prévia reduzida',
            [(label,color) for _,_,label,color in CANOPY_CLASSES]+[('Menos de 2 m, não destacado','transparent')],
            'CHMv2 Meta/WRI é um modelo, sem validação local. Pode confundir edifícios e sombras com árvores. Altura zero não representa ausência de vegetação rasteira. A imagem local é de 16/09/2019. Não mede cobertura atual nem equivale ao NDVI.',
            'Meta / WRI, CHMv2, CC BY 4.0; imagem 2019'),
        image_layer('vegetation-recurrence','Recorrência do sinal vegetal · 2025',season,'2025, uma cena selecionada por mês','Sentinel-2, 10 m; 12 meses',
            [('NDVI ≥ 0,4 em pelo menos 80% das datas','#186b45'),('NDVI ≥ 0,4 em 20% a menos de 80% das datas','#cb9d35'),('Menos de 20%, não destacado','transparent'),('Observações insuficientes','#7d8791')],
            'Frequência entre aquisições selecionadas, não fração vegetal ou probabilidade. Exige seis observações válidas e presença nos quatro trimestres. Gramíneas, poda, sombra e estações alteram o sinal. Percentuais não são uma avaliação de acurácia.',
            'Copernicus Sentinel-2, 2025 / Element 84'),
        image_layer('cbers-reference','Imagem CBERS de maior detalhe · 2026',cbers,'26/04/2026','PAN 2 m + multiespectral 8 m; RGB fusionado',
            [('Imagem em cores naturais','#bbb49b')],
            'INPE/CBERS-4A WPM, fusão PCA. Detalhe pancromático de 2 m com informação multiespectral de 8 m. Prévia reprojetada a 3 m em Web Mercator. Triagem visual de nuvens, sem máscara quantitativa. A data de abril antecede o NDVI de agosto a outubro; confirmar mudanças e alinhamento antes de usar como referência de validação. Não calcular NDVI deste RGB.',
            'INPE / CBERS-4A, 26/04/2026, CC BY 4.0','reference')
    ]
    sample=json.loads((OUTPUT/'validation/sample-points-blinded.geojson').read_text(encoding='utf-8'))
    for feature in sample['features']:
        props=feature['properties']
        props.update(id=props['sample_id'],name=props['sample_id'],category='Amostra sorteada, aguardando interpretação independente',
            geometryMethod='Interpretar a célula recortada inteira. O marcador representa apenas sua localização.',sourceUrl='/api/metodologia',overlayColor='#b65372')
    write_json(LAYERS/'validation-sample.geojson',sample)
    layers.append(dict(id='validation-sample',label='Amostra de conferência · 400 células',family='Conferência dos dados',status='available',
        layerFile='layers/validation-sample.geojson',sourceDatasetIds=['copernicus__sentinel2_meriti__2026','ibge__setores_censitarios_agregados_rj__2022','inea__ucs_municipais__2024_icms2025','mapbiomas__cobertura_uso_solo_10m_tif__2023'],
        temporalCoverage='Data-alvo: 01/10/2026',resolution='Amostra probabilística de células de 10 m',
        legend=[dict(label='Local sorteado, interpretação pendente',color='#b65372')],
        limitation='400 células sorteadas, incluindo negativos, ausências e áreas protegidas. Nenhum rótulo de referência foi preenchido. Esta camada não contém 400 confirmações de vegetação.',attribution='Amostragem do projeto; insumos IBGE, INEA, Copernicus e MapBiomas'))
    research=dict(
        canopy={key:canopy[key] for key in ['sourceId','imageryDates','publicationYear','thresholdsMeters','observations','protectedAreaObservations']},
        seasonality={key:season[key] for key in ['sourceId','year','sceneCount','scenes','observations']},
        visualReference={key:cbers[key] for key in ['sourceId','date','resolutionMeters','dataPresencePct','cloudFreePct']},
        validation={key:design[key] for key in ['designId','status','sampleCells','referenceLabelsCompleted','estimandDate','stratificationImagePeriod','planningNormal95HalfWidthPctUpperBound']})
    return layers,research
