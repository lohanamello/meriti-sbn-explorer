import { ExplorerShell } from "@/components/explorer-shell";
import { getCatalogStats, readCatalogDatasets } from "@/lib/catalog";
import { getPhase3ExplorerData } from "@/lib/phase3-app-data";

export default async function Home() {
  const [datasets, phase3Data] = await Promise.all([
    readCatalogDatasets(),
    getPhase3ExplorerData()
  ]);
  const catalogStats = getCatalogStats(datasets);

  return <ExplorerShell catalogStats={catalogStats} phase3Data={phase3Data} />;
}
