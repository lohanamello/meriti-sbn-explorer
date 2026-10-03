import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = new URL(process.argv[2]);
assert.equal(baseUrl.protocol, "https:");
const root = process.cwd();
const directory = path.join(root, "data/processed/meriti");
const data = JSON.parse(await readFile(path.join(directory, "phase3-app-data.json"), "utf8"));
const checked = [];
const sha256 = (content) => createHash("sha256").update(content).digest("hex");
async function compare(route, file) {
  const response = await fetch(new URL(route, baseUrl));
  assert.equal(response.status, 200, `${route}: HTTP ${response.status}`);
  assert.equal(new URL(response.url).origin, baseUrl.origin, `${route}: redirecionamento externo`);
  const content = Buffer.from(await response.arrayBuffer());
  const expected = await readFile(file);
  const normalize = (bytes) => file.endsWith(".md") ? Buffer.from(bytes.toString("utf8").replaceAll("\r\n", "\n")) : bytes;
  assert.equal(sha256(normalize(content)), sha256(normalize(expected)), `${route}: bytes diferentes`);
  checked.push({ route, bytes: content.length, sha256: sha256(content) });
}
for (const layer of data.evidenceLayers) {
  await compare(`/api/phase3/layers/${layer.id}`, path.join(directory, layer.yearFiles?.[String(data.temporalEvidence.defaultYear)] ?? layer.layerFile));
  for (const [year, file] of Object.entries(layer.yearFiles ?? {})) await compare(`/api/phase3/layers/${layer.id}?year=${year}`, path.join(directory, file));
}
for (const [name, file] of Object.entries({
  ficha: "data/processed/meriti/validation/review-blinded-v3.csv",
  celulas: "data/processed/meriti/validation/sample-cells-blinded.geojson",
  protocolo: "docs/methodology/meriti-vegetation-validation-plan.md",
  auditoria: "docs/methodology/meriti-validation-reference-audit.md",
  campo: "docs/methodology/meriti-vegetation-field-evidence.md"
})) await compare(`/api/validacao/${name}`, path.join(root, file));
await compare("/api/metodologia", path.join(root, "docs/methodology/meriti.md"));
await compare("/api/bairros/metodologia", path.join(root, "docs/methodology/meriti-neighborhoods-research.md"));
const chipDirectory = path.join(root, "data/interim/meriti/independent-reference-audit/CBERS_4A_WPM_20260702_198_142_L4");
const chips = JSON.parse(await readFile(path.join(chipDirectory, "chips.json"), "utf8")).chips;
for (let offset = 0; offset < chips.length; offset += 6) {
  await Promise.all(chips.slice(offset, offset + 6).map((chip) => compare(`/meriti/validation/${chip.sampleId}.png`, path.join(chipDirectory, `${chip.sampleId}.png`))));
}
for (const [route, status] of [["/api/phase3/layers/unknown", 404], ["/api/phase3/layers/vegetation?year=2024", 400], ["/api/validacao/sample-master.csv", 404]]) {
  assert.equal((await fetch(new URL(route, baseUrl))).status, status);
}
for (const [route, expected] of [["/", "São João de Meriti"], ["/validacao", "O que já foi conferido"], ["/catalogo", "arborização"], ["/bairros", "Parque Novo Rio"]]) {
  const response = await fetch(new URL(route, baseUrl));
  assert.equal(response.status, 200);
  assert((await response.text()).includes(expected), `Conteúdo ausente: ${route}`);
}
const result = { baseUrl: baseUrl.href, checkedAt: new Date().toISOString(), authentication: "none", files: checked, status: "passed" };
const receipt = path.join(root, "test-results", `deployment-${Date.now()}.json`);
await mkdir(path.dirname(receipt), { recursive: true });
await writeFile(receipt, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.status, filesVerified: checked.length, receipt }));
