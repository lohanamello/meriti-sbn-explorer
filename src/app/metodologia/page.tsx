import type { Metadata } from "next";
import { getPhase3ExplorerData } from "@/lib/phase3-app-data";
import { MethodologyReport } from "@/components/methodology-report";

export const metadata: Metadata = { title: "Metodologia e resultados | Atlas ambiental de Meriti" };

export default async function MethodologyPage() {
  return <MethodologyReport data={await getPhase3ExplorerData()} />;
}
