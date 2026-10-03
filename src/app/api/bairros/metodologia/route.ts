import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const methodology = await readFile(path.join(process.cwd(), "docs/methodology/meriti-neighborhoods-research.md"), "utf8");
  return new Response(methodology, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Content-Disposition": 'attachment; filename="metodologia-bairros-meriti.md"' } });
}
