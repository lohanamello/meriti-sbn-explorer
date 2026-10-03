import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import polygonClipping from "polygon-clipping";
import proj4 from "proj4";

const projectRoot = process.cwd();
const sourcePath = path.join(
  projectRoot,
  "data",
  "raw",
  "data-rio",
  "data-rio__limites_ap__atual",
  "limites_ap.json"
);
const outputPath = path.join(
  projectRoot,
  "src",
  "data",
  "rio-city-boundary-poc.json"
);

proj4.defs(
  "EPSG:31983",
  "+proj=utm +zone=23 +south +ellps=GRS80 +units=m +no_defs +type=crs"
);

const arcgisJson = JSON.parse(await readFile(sourcePath, "utf8"));

if (arcgisJson?.spatialReference?.wkid !== 31983) {
  throw new Error(
    `Expected EPSG:31983 AP boundaries, got ${JSON.stringify(
      arcgisJson?.spatialReference
    )}`
  );
}

const projectedPolygons = arcgisJson.features.flatMap((feature) =>
  feature.geometry.rings.map((ring) => [
    ring.map(([x, y]) => {
      const [longitude, latitude] = proj4("EPSG:31983", "EPSG:4326", [x, y]);
      return [roundCoordinate(longitude), roundCoordinate(latitude)];
    })
  ])
);

const dissolved = polygonClipping.union(...projectedPolygons);

const boundary = {
  type: "FeatureCollection",
  name: "rio-city-boundary-poc",
  crs: {
    type: "name",
    properties: {
      name: "EPSG:4326"
    }
  },
  features: [
    {
      type: "Feature",
      properties: {
        id: "rio-municipio-contorno-poc",
        name: "Município do Rio de Janeiro - contorno POC",
        sourceDatasetId: "data-rio__limites_ap__atual",
        sourceName: "Limite Áreas de Planejamento (AP)",
        sourceInstitution: "Instituto Pereira Passos / Prefeitura do Rio de Janeiro",
        originalCrs: "EPSG:31983",
        outputCrs: "EPSG:4326",
        preparation: "Dissolve das 5 Áreas de Planejamento oficiais",
        analyticalUse: "reference_only_poc",
        warning: "Camada de referência territorial; não é evidência de pesquisa."
      },
      geometry: {
        type: "MultiPolygon",
        coordinates: dissolved
      }
    }
  ]
};

await writeFile(outputPath, `${JSON.stringify(boundary)}\n`, "utf8");

console.log(
  `Wrote ${path.relative(projectRoot, outputPath)} with ${dissolved.length} polygon part(s).`
);

function roundCoordinate(value) {
  return Number(value.toFixed(7));
}
