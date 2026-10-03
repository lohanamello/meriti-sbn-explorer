import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { Phase3ExplorerData } from "@/types/phase3";

export const MERITI_DATA_DIRECTORY = path.join(process.cwd(), "data", "processed", "meriti");

export const getPhase3ExplorerData = cache(async (): Promise<Phase3ExplorerData> => {
  const text = await readFile(path.join(MERITI_DATA_DIRECTORY, "phase3-app-data.json"), "utf8");
  const data = JSON.parse(text) as Phase3ExplorerData;
  if (data.schemaVersion !== "meriti.app-data.v1" || data.studyArea.code !== "3305109") {
    throw new Error("Pacote territorial incompatível com São João de Meriti.");
  }
  return data;
});
