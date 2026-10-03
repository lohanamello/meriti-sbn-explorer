import { NextResponse } from "next/server";
import { getPhase3ExplorerData } from "@/lib/phase3-app-data";

export async function GET(request: Request, context: { params: Promise<{ layerId: string }> }) {
  const { layerId } = await context.params;
  const data = await getPhase3ExplorerData();
  const layer = data.evidenceLayers.find((candidate) => candidate.id === layerId && candidate.status === "available");
  if (!layer?.layerFile) return NextResponse.json({ error: "Camada desconhecida." }, { status: 404 });
  const requestedYear = new URL(request.url).searchParams.get("year");
  if (requestedYear !== null && (!layer.yearFiles || !Object.hasOwn(layer.yearFiles, requestedYear))) {
    return NextResponse.json({ error: "Ano indisponível para esta camada." }, { status: 400 });
  }
  const layerFile = layer.yearFiles
    ? layer.yearFiles[requestedYear ?? String(data.temporalEvidence.defaultYear)]
    : layer.layerFile;
  if (!layerFile) return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
  if (!/^(layers|rasters)\/[a-zA-Z0-9._-]+\.(png|geojson)$/.test(layerFile)) {
    return NextResponse.json({ error: "Arquivo de camada inválido." }, { status: 500 });
  }
  return NextResponse.redirect(new URL(`/meriti/evidence/${layerFile}`, request.url), 307);
}
