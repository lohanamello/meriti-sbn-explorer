from __future__ import annotations

import json
import geopandas as gpd
import pandas as pd

from collect import ROOT, write_json
from curate import LAYERS, OUTPUT, save_layer

UC_ID = 'inea__ucs_municipais__2024_icms2025'
RIVER_ID = 'inea__hidrografia_bc25__consulta2026'
CANAL_ID = 'inea__canal_bc25__consulta2026'
WATER_ID = 'inea__massa_dagua_bc25__consulta2026'
CONTEXT_METERS = 500


def read_source(ident):
    return gpd.read_file(ROOT/'data/raw/meriti'/ident/'features.geojson').to_crs(31983)


def source_url(ident):
    return json.loads((ROOT/'data/raw/meriti'/ident/'provenance.json').read_text(encoding='utf-8'))['source_url']


def prepare():
    city = gpd.read_file(LAYERS/'municipality.geojson').to_crs(31983).geometry.iloc[0]
    context = city.buffer(CONTEXT_METERS)
    units = read_source(UC_ID)
    units = units[units.municipio=='SAO JOAO DE MERITI'].copy()
    assert len(units)==6 and units.is_valid.all()
    units['id'] = units.objectid.map(lambda value:f'inea-uc-{value}')
    units['name'] = units.nomeoficia
    units['category'] = units.categoria.map(lambda value:'Parque natural municipal' if value=='PARQUE' else 'Área de proteção ambiental')
    units['legalAct'] = units.ato
    units['registeredAreaHa'] = units.area_ha
    units['sourceUrl'] = source_url(UC_ID)
    units['sourceDate'] = 'Cadastro 2024, ICMS Ecológico 2025'
    units['geometryMethod'] = 'Polígono publicado pelo INEA. Marcador calculado como ponto interno do polígono.'
    units['overlayColor'] = units.categoria.map(lambda value:'#dfb845' if value=='PARQUE' else '#2f9966')
    columns = ['id','name','category','legalAct','registeredAreaHa','sourceUrl','sourceDate','geometryMethod','overlayColor','geometry']
    areas = units[columns].copy()
    points = areas.copy()
    points.geometry = points.geometry.representative_point()
    points['markerNumber'] = list(range(1,len(points)+1))
    save_layer('protected-areas',gpd.GeoDataFrame(pd.concat([areas,points],ignore_index=True),crs=31983))
    listings = [dict(id=row.id,name=row.name,category=row.category,legalAct=row.legalAct,registeredAreaHa=row.registeredAreaHa,
                     sourceUrl=row.sourceUrl,coordinates=list(geom.coords)[0]) for row,geom in zip(points.itertuples(),points.to_crs(4326).geometry)]
    frame = gpd.clip(read_source(RIVER_ID),context,keep_geom_type=True)
    canals = gpd.clip(read_source(CANAL_ID),context,keep_geom_type=True)
    canal_union = canals.geometry.union_all()
    assert frame.is_valid.all() and canals.is_valid.all()
    assert canal_union.difference(frame.geometry.union_all().buffer(0.01)).length < 0.1
    frame['id'] = frame.objectid.map(lambda value:f'{RIVER_ID}-{value}')
    frame['category'] = frame.geometry.map(lambda geometry:'Canal' if geometry.intersection(canal_union).length/geometry.length >= 0.99 else 'Curso de água')
    frame['name'] = [str(value).strip() if pd.notna(value) and str(value).strip() else f'{category} sem nome na fonte' for value,category in zip(frame.nome,frame.category)]
    frame['sourceDate'] = 'BC25, edição 2018'
    frame['sourceUrl'] = source_url(RIVER_ID)
    frame['geometryMethod'] = 'Traçado oficial BC25. Entorno de 500 m. Canais já contidos na rede foram usados somente para classificar trechos com sobreposição de 99% ou mais, sem duplicar linhas.'
    frame['overlayColor'] = frame.category.map({'Curso de água':'#3ab6ef','Canal':'#36d6cf'})
    source_counts = frame.category.value_counts().to_dict()
    source_length = float(frame.length.sum())
    records = []
    for (name,category), group in frame.groupby(['name','category'],sort=True):
        row=group.iloc[0]
        records.append(dict(id=f"bc25-{min(group.objectid)}",name=name,category=category,sourceDate=row.sourceDate,sourceUrl=row.sourceUrl,
            geometryMethod=row.geometryMethod+' Sobreposições da própria rede foram dissolvidas por nome e categoria.',
            sourceFeatureIds=','.join(map(str,sorted(group.objectid))),overlayColor=row.overlayColor,geometry=group.geometry.union_all()))
    rivers=gpd.GeoDataFrame(records,crs=31983)
    counts = rivers.category.value_counts().to_dict()
    save_layer('rivers-official',rivers)
    water = gpd.clip(read_source(WATER_ID),context,keep_geom_type=True)
    water['id'] = water.objectid.map(lambda value:f'inea-water-{value}')
    water['name'] = water.nome.map(lambda value:str(value).strip() if pd.notna(value) and str(value).strip() else 'Massa de água sem nome na fonte')
    water['category'] = water.tipomassad
    water['sourceDate'] = 'BC25, edição 2018'
    water['sourceUrl'] = source_url(WATER_ID)
    water['overlayColor'] = '#217ab2'
    save_layer('water-bodies',water[['id','name','category','sourceDate','sourceUrl','overlayColor','geometry']])
    report = dict(protectedAreas=listings,protectedAreaCount=len(areas),registeredAreaHa=float(areas.registeredAreaHa.sum()),
                  geometryAreaHa=float(areas.area.sum()/10000),contextBufferMeters=CONTEXT_METERS,
                  watercourseCounts=counts,sourceWatercourseCounts=source_counts,sourceLinearFeatureCount=len(frame),waterbodyCount=len(water),linearFeatureCount=len(rivers),
                  removedDuplicateLengthMeters=source_length-float(rivers.length.sum()),
                  canalSourceRole='Classification only. All canal geometry already contained in the drainage network.',
                  linearLengthMeters=float(rivers.length.sum()),
                  officialRiverNames=sorted({name for name in rivers.name if 'sem nome' not in name}),
                  excludedDuplicateSource='inea__canal_vala_bc25__consulta2026')
    write_json(OUTPUT/'metadata/environment-report.json',report)
    print(json.dumps({key:value for key,value in report.items() if key!='protectedAreas'},ensure_ascii=False))
    return report


if __name__=='__main__':
    prepare()
