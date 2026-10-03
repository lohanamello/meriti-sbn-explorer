from __future__ import annotations

import csv
import json
import unicodedata
from shapely.geometry import shape, mapping

from collect import ROOT, CATALOG, save_inventory, write_json
from curate import INTERIM, OUTPUT

SOURCE_ID = "dageop__meriti_bairros_localidades__2024"
RAW_PATH = "data/raw/meriti/municipal_neighborhoods__2026"
MUNICIPAL_URL = "https://meriti.rj.gov.br/inicio/a-cidade/"
MUNICIPAL_NAMES = [
    "Vilar dos Teles", "Centro", "Coelho da Rocha", "Éden", "Jardim Meriti",
    "Agostinho Porto", "Engenheiro Belford", "Jardim Metrópole", "Jardim Sumaré",
    "Parque Alian", "Parque Analândia", "Parque Araruama", "Parque Novo Rio",
    "Parque Tietê", "São Mateus", "Tomazinho", "Venda Velha", "Vila Norma",
    "Vila Rosali", "Vila São João", "Vila Tiradentes",
]
LIMITATION = (
    "Cinco contornos aproximados digitalizados do atlas escolar DAGEOP/UERJ e um ponto na posição do rótulo Vila São João. "
    "PDF criado em 05/11/2024; data e exatidão dos limites não informadas. "
    "Coordenadas impressas usadas para georreferenciar o desenho, sem validação independente de posição. "
    "Trechos encobertos pela Linha Vermelha foram interpolados no sul de Parque Novo Rio e Parque Analândia. "
    "Não são limites cadastrais atuais nem base para redistribuir indicadores."
)


def normalize(name):
    return "".join(char for char in unicodedata.normalize("NFD", name.lower()) if not unicodedata.combining(char)).replace("sao matheus", "sao mateus")


def register_source():
    metadata = json.loads((INTERIM / "municipal-neighborhoods/metadata.json").read_text(encoding="utf-8"))
    with CATALOG.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    fields = list(rows[0])
    row = next((item for item in rows if item["id"] == SOURCE_ID), None)
    if row is None:
        row = dict.fromkeys(fields, "")
        rows.append(row)
    provenance = json.loads((ROOT / RAW_PATH / "provenance.json").read_text(encoding="utf-8"))
    row.update(id=SOURCE_ID, source_name="Bairros e localidades do atlas escolar de Meriti",
               source_institution="DAGEOP / UERJ-FFP; atlas em parceria com a Prefeitura",
               source_url=metadata["sourceUrl"], acquisition_route="public_pdf_georeferenced_digitization",
               access_status="public", license="Consulta pública; licença aberta não identificada; autoria preservada",
               spatial_coverage="Cinco contornos e uma localidade em São João de Meriti",
               spatial_resolution="Mapa educacional raster; exatidão geográfica desconhecida",
               temporal_coverage="PDF criado em novembro de 2024; data dos limites desconhecida",
               format="PDF / GeoJSON derivado", crs="Fonte SIRGAS 2000 geográfico; saída GeoJSON EPSG:4326",
               evidence_family="Referência de bairros e localidades", potential_use="Localizar nomes adicionais sem redistribuir indicadores IBGE",
               known_limitations=LIMITATION, raw_storage_path=RAW_PATH, collection_status="downloaded", promotion_status="promoted",
               collected_at=next(item["retrievedAt"] for item in provenance if item["file"] == "uerj-bairros-localidades.pdf"))
    save_inventory(fields, rows)


def publish(units):
    metadata = json.loads((INTERIM / "municipal-neighborhoods/metadata.json").read_text(encoding="utf-8"))
    collection = json.loads((INTERIM / "municipal-neighborhoods/atlas-neighborhoods.geojson").read_text(encoding="utf-8"))
    municipal_geometry = shape(next(unit["geometry"]["geometry"] for unit in units if unit["unitType"] == "municipality"))
    localities = []
    for feature in collection["features"]:
        properties = feature["properties"]
        if feature["geometry"]["type"] == "Polygon":
            feature["geometry"] = mapping(shape(feature["geometry"]).intersection(municipal_geometry))
            properties["displayClippedToIbgeMunicipality"] = True
        method = " ".join(text for text in [properties["quality"], properties.get("restorationNote")] if text)
        properties.update(localityId=properties["id"], overlayColor="#dfb3ff", geometryMethod=method,
                          sourceDate="PDF criado em 05/11/2024; data dos limites não informada.")
        localities.append(dict(id=properties["id"], name=properties["name"], geometry=feature,
                               geometryStatus="label_point" if feature["geometry"]["type"] == "Point" else "approximate_boundary",
                               method=method, ibgeOverlaps=[dict(id=item["id"], name=item["name"], intersectionPct=item.get("shareOfDerivedAreaPct")) for item in properties["ibgeIntersections"]]))
    localities.sort(key=lambda item: normalize(item["name"]))
    neighborhoods = {normalize(unit["name"]): unit for unit in units if unit["unitType"] == "neighborhood"}
    additional = {normalize(item["name"]): item for item in localities}
    comparison = []
    for name in sorted(MUNICIPAL_NAMES, key=normalize):
        unit = neighborhoods.get(normalize(name))
        locality = additional.get(normalize(name))
        if unit is None and locality is None:
            raise ValueError(f"Nome municipal sem referência: {name}")
        comparison.append(dict(name=name, ibgeId=unit["id"] if unit else None, ibgeName=unit["name"] if unit else None, localityId=locality["id"] if locality else None))
    reference = dict(sourceId=SOURCE_ID, sourceTitle=metadata["source"], sourceUrl=metadata["sourceUrl"], sourceDate=None,
                     municipalListUrl=MUNICIPAL_URL, limitation=LIMITATION, localities=localities, comparison=comparison)
    write_json(OUTPUT / "layers/local-neighborhoods.geojson", collection)
    write_json(OUTPUT / "metadata/neighborhood-reference.json", reference)
    write_json(OUTPUT / "metadata/neighborhood-georeferencing.json", metadata)
    layer = dict(id="local-neighborhoods", label="Bairros e localidades do atlas", family="Referência territorial",
                 status="available", layerFile="layers/local-neighborhoods.geojson", sourceDatasetIds=[SOURCE_ID],
                 temporalCoverage="PDF de 2024; limites sem data", resolution="5 contornos aproximados e 1 ponto",
                 legend=[dict(label="Tracejado: contorno aproximado", color="#dfb3ff"), dict(label="Ponto: Vila São João, sem divisa", color="#dfb3ff")],
                 limitation=LIMITATION, defaultVisible=True, attribution="DAGEOP / UERJ-FFP, atlas escolar de Meriti; digitalização aproximada",
                 rendering=dict(fillOpacity=0.035, lineDasharray=[3, 2]))
    return reference, layer
