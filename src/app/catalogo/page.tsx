import Link from "next/link";
import { ArrowLeft, Database } from "lucide-react";

import { CatalogView } from "@/components/catalog-view";
import { getCatalogStats, readCatalogDatasets } from "@/lib/catalog";

export default async function CatalogoPage() {
  const datasets = await readCatalogDatasets();
  const stats = getCatalogStats(datasets);

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <Link className="icon-link" href="/" aria-label="Voltar ao mapa">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Mapa</span>
        </Link>
        <div>
          <p className="eyebrow">Transparência metodológica</p>
          <h1>Catálogo de Dados</h1>
        </div>
        <div className="catalog-header__badge">
          <Database size={18} aria-hidden="true" />
          <span>{stats.total} fontes</span>
        </div>
      </header>
      <CatalogView datasets={datasets} stats={stats} />
    </main>
  );
}
