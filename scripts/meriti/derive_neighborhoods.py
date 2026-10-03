from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from pypdf import PdfReader
from pyproj import Transformer
from rasterio.features import shapes
from shapely.geometry import LineString, Point, Polygon, mapping, shape
from shapely.ops import nearest_points, transform


ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data/raw/meriti/municipal_neighborhoods__2026"
OUT = ROOT / "data/interim/meriti/municipal-neighborhoods"
PDF_URL = "https://www.dageop.com.br/_files/ugd/bb64e6_32f7cc184ff4443da2efda13778d1b06.pdf"
PAGE_URL = "https://www.dageop.com.br/sao-joao-de-meriti"
SOURCE = "Atlas escolar de São João de Meriti, DAGEOP/UERJ-FFP"
X_TICKS = [(1125.5, -43.4), (2584.5, -43.36666666666667), (4043.5, -43.33333333333333)]
Y_TICKS = [(665.5, -22.766666666666666), (2124.5, -22.8)]
SEEDS = [
    ("atlas-parque-alian", "Parque Alian", (1830, 850)),
    ("atlas-vila-norma", "Vila Norma", (950, 1620)),
    ("atlas-parque-tiete", "Parque Tietê", (4090, 1280)),
    ("atlas-parque-novo-rio", "Parque Novo Rio", (3900, 1800)),
    ("atlas-parque-analandia", "Parque Analândia", (4070, 2140)),
]


def replace_arc(polygon: Polygon, start, end, via, replacement) -> Polygon:
    coords = list(polygon.exterior.coords)[:-1]
    start_index = min(range(len(coords)), key=lambda i: Point(coords[i]).distance(Point(start)))
    coords = coords[start_index:] + coords[:start_index]
    end_index = min(range(1, len(coords)), key=lambda i: Point(coords[i]).distance(Point(end)))
    forward = coords[:end_index + 1]
    backward = coords[end_index:] + [coords[0]]
    if LineString(forward).distance(Point(via)) > LineString(backward).distance(Point(via)):
        raise ValueError("A sequência do contorno mudou; revisar a restauração da linha encoberta.")
    result = Polygon([coords[0], *replacement, coords[end_index], *coords[end_index + 1:]])
    if not result.is_valid:
        raise ValueError("Contorno restaurado inválido.")
    return result


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(RAW / "uerj-bairros-localidades.pdf")
    if len(reader.pages) != 1 or len(reader.pages[0].images) != 1:
        raise ValueError("A estrutura do PDF do atlas mudou.")
    image_file = reader.pages[0].images[0]
    image_path = OUT / "atlas-source.jpg"
    image_path.write_bytes(image_file.data)
    image = Image.open(image_path).convert("RGB")
    if image.size != (4958, 3509):
        raise ValueError("A resolução do mapa mudou; revisar pontos de controle.")
    rgb = np.asarray(image)
    yellow = (
        (rgb[:, :, 0] > 215)
        & (rgb[:, :, 1] > 210)
        & (rgb[:, :, 2] < 210)
        & (rgb[:, :, 1].astype("int16") - rgb[:, :, 2] > 25)
    ).astype("uint8")
    components = [
        shape(geometry)
        for geometry, value in shapes(yellow, mask=yellow.astype(bool))
        if value and shape(geometry).area > 15000
    ]
    lon_fit = np.polyfit(*np.asarray(X_TICKS).T, deg=1)
    lat_fit = np.polyfit(*np.asarray(Y_TICKS).T, deg=1)
    sirgas_to_wgs84 = Transformer.from_crs(4674, 4326, always_xy=True)

    def to_lonlat(x, y, z=None):
        return sirgas_to_wgs84.transform(lon_fit[0] * np.asarray(x) + lon_fit[1], lat_fit[0] * np.asarray(y) + lat_fit[1])

    utm = Transformer.from_crs(4326, 31983, always_xy=True).transform
    data = json.loads((ROOT / "data/processed/meriti/phase3-app-data.json").read_text(encoding="utf-8"))
    neighborhoods = [u for u in data["territorialUnits"] if u["unitType"] == "neighborhood"]
    neighborhood_geometries = [(u, shape(u["geometry"])) for u in neighborhoods]
    municipality = shape(data["studyArea"]["boundary"]["features"][0]["geometry"])
    features = []
    pixel_features = []
    drawer = ImageDraw.Draw(image)
    for feature_id, name, seed in SEEDS:
        matches = [p for p in components if p.contains(Point(seed))]
        if len(matches) != 1:
            raise ValueError(f"Semente de {name} encontrou {len(matches)} componentes.")
        pixel = Polygon(matches[0].exterior).buffer(2).buffer(-2).simplify(2)
        restoration = None
        if feature_id == "atlas-parque-novo-rio":
            pixel = replace_arc(pixel, (3418, 2284), (3872, 2167), (3650, 2237), [
                (3480, 2277), (3580, 2273), (3740, 2261), (3830, 2257), (3938, 2251),
            ])
            restoration = "O trecho sul, encoberto pela Linha Vermelha, foi continuado entre segmentos visíveis do limite e da borda municipal no próprio atlas."
        elif feature_id == "atlas-parque-analandia":
            pixel = replace_arc(pixel, (3872, 2167), (4154, 2196), (4050, 2220), [
                (3938, 2251), (4050, 2239), (4151, 2225),
            ])
            restoration = "O trecho sul, encoberto pela Linha Vermelha, foi continuado entre segmentos visíveis do limite e da borda municipal no próprio atlas."
        geometry = transform(to_lonlat, pixel)
        if not geometry.is_valid:
            raise ValueError(f"Geometria georreferenciada inválida: {name}")
        area = transform(utm, geometry).area
        parents = []
        for unit, parent in neighborhood_geometries:
            intersection = geometry.intersection(parent)
            if not intersection.is_empty:
                intersection_area = transform(utm, intersection).area
                if intersection_area > 1:
                    parents.append({"id": unit["id"], "name": unit["name"], "intersectionAreaM2": round(intersection_area, 2), "shareOfDerivedAreaPct": round(100 * intersection_area / area, 4)})
        parents.sort(key=lambda p: -p["intersectionAreaM2"])
        properties = {
            "id": feature_id, "name": name, "geometryType": "Polygon", "representation": "derived-boundary",
            "source": SOURCE, "sourceUrl": PDF_URL, "sourcePageUrl": PAGE_URL,
            "sourcePdfCreatedAt": "2024-11-05T15:27:43-03:00", "boundaryReferenceDate": None,
            "quality": "Contorno aproximado digitalizado de mapa educacional; não é cadastro legal.",
            "note": "Mantém os indicadores na divisão IBGE 2022. A fonte não informa a data nem a precisão dos limites. A resolução gráfica é de aproximadamente 2,5 m por pixel, sem validar a exatidão geográfica.",
            "restorationNote": restoration, "areaM2": round(area, 2), "ibgeIntersections": parents,
            "outsideIbgeMunicipalityPct": round(100 * transform(utm, geometry.difference(municipality)).area / area, 4),
        }
        features.append({"type": "Feature", "id": feature_id, "properties": properties, "geometry": mapping(geometry)})
        pixel_features.append({"type": "Feature", "properties": {"id": feature_id, "name": name}, "geometry": mapping(pixel)})
        drawer.line(list(pixel.exterior.coords), fill="#e000ba", width=8)

    point_pixel = Point(3087, 674)
    point = transform(to_lonlat, point_pixel)
    point_parents = [{"id": unit["id"], "name": unit["name"]} for unit, parent in neighborhood_geometries if parent.covers(point)]
    features.append({"type": "Feature", "id": "atlas-vila-sao-joao", "properties": {
        "id": "atlas-vila-sao-joao", "name": "Vila São João", "geometryType": "Point", "representation": "approximate-label-location",
        "source": SOURCE, "sourceUrl": PDF_URL, "sourcePageUrl": PAGE_URL,
        "sourcePdfCreatedAt": "2024-11-05T15:27:43-03:00", "boundaryReferenceDate": None,
        "quality": "Localização aproximada do texto no atlas, sem perímetro próprio.",
        "note": "O atlas identifica Vila São João por rótulo em itálico. O ponto marca a posição do rótulo, não um centro territorial, endereço ou limite. Nenhuma estatística é atribuída ao ponto.",
        "restorationNote": None, "areaM2": None, "ibgeIntersections": point_parents,
        "outsideIbgeMunicipalityPct": None,
    }, "geometry": mapping(point)})
    derived_polygons = [shape(f["geometry"]) for f in features if f["geometry"]["type"] == "Polygon"]
    overlaps = []
    for i, first in enumerate(derived_polygons):
        for j, second in enumerate(derived_polygons[i+1:], start=i+1):
            overlap = transform(utm, first.intersection(second)).area
            if overlap > 1:
                overlaps.append({"first": features[i]["id"], "second": features[j]["id"], "areaM2": round(overlap, 2)})
    if overlaps:
        raise ValueError(f"Contornos derivados se sobrepõem: {overlaps}")
    check_seed_points = {
        "atlas-parque-alian": [(2025, 621), (1780, 657), (1600, 818), (1500, 926)],
        "atlas-vila-norma": [(1020, 1365), (900, 1510), (795, 1650), (685, 1753)],
        "atlas-parque-tiete": [(4200, 1100), (4210, 1300)],
        "atlas-parque-analandia": [(4170, 2050), (4155, 2200)],
    }
    ibge_boundary = transform(utm, municipality).boundary
    pixel_boundaries = {f["properties"]["id"]: shape(f["geometry"]).boundary for f in pixel_features}
    checks = []
    for feature_id, seeds in check_seed_points.items():
        for seed in seeds:
            point_on_line = nearest_points(pixel_boundaries[feature_id], Point(seed))[0]
            world_point = transform(utm, transform(to_lonlat, point_on_line))
            checks.append({"featureId": feature_id, "searchPointPx": seed, "contourPointPx": list(point_on_line.coords[0]), "distanceToIbgeMunicipalBoundaryM": round(world_point.distance(ibge_boundary), 3)})
    distances = [c["distanceToIbgeMunicipalBoundaryM"] for c in checks]
    for filename, collection in [("atlas-neighborhoods.geojson", features), ("atlas-pixel-traces.geojson", pixel_features)]:
        (OUT / filename).write_text(json.dumps({"type": "FeatureCollection", "features": collection}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    metadata = {
        "source": SOURCE, "sourceUrl": PDF_URL, "sourcePageUrl": PAGE_URL,
        "sourcePdfSha256": hashlib.sha256((RAW / "uerj-bairros-localidades.pdf").read_bytes()).hexdigest(),
        "sourcePdfMetadata": dict(reader.metadata), "sourceMapSizePx": list(image.size),
        "sourceDateMeaning": "Data de criação do PDF, não data de vigência ou levantamento dos limites.",
        "sourceBoundaryDate": None, "sourceBoundaryAccuracyM": None,
        "xTicksPixelLongitude": X_TICKS, "yTicksPixelLatitude": Y_TICKS,
        "sourceGeographicCrs": "EPSG:4674", "outputCrs": "EPSG:4326", "metricCrs": "EPSG:31983",
        "longitudeTransformSlopeIntercept": lon_fit.tolist(), "latitudeTransformSlopeIntercept": lat_fit.tolist(),
        "controlFitMaxResidualPixels": float(max(abs(np.polyval(lon_fit, x)-lon) / abs(lon_fit[0]) for x, lon in X_TICKS)),
        "controlFitCaveat": "Resíduo nos próprios pontos de ajuste não é validação independente nem medida de exatidão geográfica.",
        "pixelSizeMApprox": {"eastWest": 2.35, "northSouth": 2.53},
        "digitization": {"yellowRgbThresholds": "R>215, G>210, B<210, G-B>25", "seedPointsPixel": [{"id": i, "name": n, "xy": xy} for i,n,xy in SEEDS], "contourSmoothingPixels": 2, "simplificationPixels": 2, "referenceAccuracy": "desconhecida"},
        "featureCount": len(features), "polygonCount": 5, "pointCount": 1, "mutualOverlapM2": 0,
        "registrationCheck": {"points": checks, "medianDistanceM": float(np.median(distances)), "maxDistanceM": max(distances), "meaning": "Compatibilidade com a divisa IBGE 2022 em 12 posições reconhecíveis, não usadas no ajuste dos ticks. Não mede exatidão absoluta, nem valida todos os limites internos. O atlas cita IBGE como base e, portanto, esta não é uma referência de campo independente."},
        "limitations": ["Mapa educacional, não malha administrativa legal.", "A fonte cita a base cartográfica do IBGE, mas não identifica a edição ou o arquivo dos limites granulares.", "Não foi localizada autorização expressa de licença aberta no atlas; a derivação registra fonte e autoria e não redistribui a figura como fundo do aplicativo.", "Não completar mosaico municipal nem calcular indicadores usando estes contornos.", "Vila São João é apenas localização de rótulo.", "Trechos ocultos por símbolos cartográficos foram reconstruídos entre linhas visíveis e estão identificados por feição."]
    }
    (OUT / "metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    image.resize((2479, 1754)).save(OUT / "atlas-digitization-review.png")
    print(json.dumps({"features": [{"name": f["properties"]["name"], "parents": f["properties"]["ibgeIntersections"]} for f in features], "outputs": str(OUT)}, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
