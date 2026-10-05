import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const FILES: Record<string, { read: () => Promise<Buffer>; type: string; name: string }> = {
  resultados: { read: () => readFile(path.join(process.cwd(), "data/processed/meriti/validation/review-closure.csv")), type: "text/csv; charset=utf-8", name: "meriti-resultados-finais-400-celulas.csv" },
  "resultados-metodo": { read: () => readFile(path.join(process.cwd(), "data/processed/meriti/validation/review-closure.json")), type: "application/json; charset=utf-8", name: "meriti-resultados-metodologia-final.json" },
  "avaliacoes-finais": { read: () => readFile(path.join(process.cwd(), "data/processed/meriti/validation/human-reviews-final.json")), type: "application/json; charset=utf-8", name: "meriti-avaliacoes-humanas-consolidadas.json" },
  relatorio: { read: () => readFile(path.join(process.cwd(), "docs/methodology/meriti-review-final.md")), type: "text/markdown; charset=utf-8", name: "meriti-metodologia-revisao-concluida.md" },
  triagem: { read: () => readFile(path.join(process.cwd(), "data/processed/meriti/validation/assisted-review.csv")), type: "text/csv; charset=utf-8", name: "meriti-triagem-400-celulas.csv" },
  "triagem-metodo": { read: () => readFile(path.join(process.cwd(), "data/processed/meriti/validation/assisted-review.json")), type: "application/json; charset=utf-8", name: "meriti-triagem-metodo.json" },
  auditoria: { read: () => readFile(path.join(process.cwd(), "docs/methodology/meriti-validation-reference-audit.md")), type: "text/markdown; charset=utf-8", name: "meriti-auditoria-referencias.md" },
  campo: { read: () => readFile(path.join(process.cwd(), "docs/methodology/meriti-vegetation-field-evidence.md")), type: "text/markdown; charset=utf-8", name: "meriti-arborizacao-ibge.md" },
  ficha: { read: () => readFile(path.join(process.cwd(), "data/processed/meriti/validation/review-blinded-v3.csv")), type: "text/csv; charset=utf-8", name: "meriti-ficha-interpretacao.csv" },
  celulas: { read: () => readFile(path.join(process.cwd(), "data/processed/meriti/validation/sample-cells-blinded.geojson")), type: "application/geo+json; charset=utf-8", name: "meriti-celulas-conferencia.geojson" },
  protocolo: { read: () => readFile(path.join(process.cwd(), "docs/methodology/meriti-vegetation-validation-plan.md")), type: "text/markdown; charset=utf-8", name: "meriti-protocolo-validacao.md" }
};

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!Object.hasOwn(FILES, file)) return NextResponse.json({ error: "Arquivo desconhecido." }, { status: 404 });
  const entry = FILES[file];
  const content = await entry.read();
  return new Response(new Uint8Array(content), { headers: { "Content-Type": entry.type, "Content-Disposition": `attachment; filename="${entry.name}"`, "Cache-Control": "no-cache" } });
}
