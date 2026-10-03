import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDirectory = path.join(root, "data/processed/meriti");
const bundle = JSON.parse(await readFile(path.join(sourceDirectory, "phase3-app-data.json"), "utf8"));
const files = new Set(bundle.evidenceLayers.flatMap((layer) => layer.status === "available"
  ? [layer.layerFile, ...Object.values(layer.yearFiles ?? {})].filter(Boolean)
  : []));

for (const file of files) {
  if (!/^(layers|rasters)\/[a-zA-Z0-9._-]+\.(png|geojson)$/.test(file)) {
    throw new Error(`Arquivo de evidência inválido: ${file}`);
  }
  const destination = path.join(root, "public/meriti/evidence", file);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(sourceDirectory, file), destination);
}
console.log(`${files.size} arquivos de evidência preparados para entrega estática.`);

const referenceDirectory = path.join(root, "data/interim/meriti/independent-reference-audit/CBERS_4A_WPM_20260702_198_142_L4");
const chipManifest = JSON.parse(await readFile(path.join(referenceDirectory, "chips.json"), "utf8"));
await mkdir(path.join(root, "public/meriti/validation"), { recursive: true });
for (const chip of chipManifest.chips) {
  if (!/^MERITI-V1-\d{4}$/.test(chip.sampleId)) throw new Error("Identificador de célula inválido.");
  await copyFile(path.join(referenceDirectory, `${chip.sampleId}.png`), path.join(root, "public/meriti/validation", `${chip.sampleId}.png`));
}
await copyFile(path.join(referenceDirectory, "blind-pilot-sheet.png"), path.join(root, "public/meriti/validation/pilot.png"));
console.log(`${chipManifest.chips.length} painéis cegos de referência preparados.`);
