import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CatalogDataset, CatalogStats } from "@/types/phase3";

import { CatalogView } from "./catalog-view";

const datasets: CatalogDataset[] = [
  dataset({
    id: "data-rio__hidrografia",
    source_name: "Zeta Hidrografia municipal",
    source_institution: "Instituto Pereira Passos / Prefeitura do Rio de Janeiro",
    source_url: "https://example.com/prefeitura",
    evidence_family: "Flooding, inundation, and urban water risk",
    license: "Public municipal portal; verify reuse terms",
    spatial_coverage: "Municipio do Rio de Janeiro",
    temporal_coverage: "current portal snapshot",
    collection_status: "downloaded",
    promotion_status: "promoted"
  }),
  dataset({
    id: "ibge__censo2022",
    source_name: "Alpha Censo 2022",
    source_institution: "IBGE",
    source_url: "https://example.com/ibge",
    evidence_family: "Vulnerability, demographics, and social conditions",
    license: "IBGE public downloads",
    spatial_coverage: "Brasil with municipal products",
    temporal_coverage: "2022",
    collection_status: "downloaded",
    promotion_status: "candidate"
  }),
  dataset({
    id: "mapbiomas__cobertura",
    source_name: "MapBiomas cobertura",
    source_institution: "MapBiomas",
    source_url: "https://example.com/mapbiomas",
    evidence_family: "Impervious surface and land use",
    license: "Creative Commons CC-BY-SA per MapBiomas page",
    spatial_coverage: "Brasil and subnational",
    temporal_coverage: "annual series / verify selected years",
    collection_status: "downloaded",
    promotion_status: "deferred"
  })
];

const stats: CatalogStats = {
  total: 3,
  downloaded: 3,
  candidates: 1,
  deferred: 1,
  promoted: 1,
  temporalPromoted: 0
};

describe("CatalogView", () => {
  it("explains catalog status meanings", () => {
    render(<CatalogView datasets={datasets} stats={stats} />);

    expect(screen.getByRole("heading", { name: "O que significam os status" }))
      .toBeInTheDocument();
    expect(screen.getByText(/A fonte foi localizada, coletada e preservada/))
      .toBeInTheDocument();
    expect(screen.getByText(/A fonte foi adiada para uma etapa posterior/))
      .toBeInTheDocument();
  });

  it("filters by institutional source group and cites the current selection", () => {
    render(<CatalogView datasets={datasets} stats={stats} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "IBGE" }));

    expect(screen.getByText("Alpha Censo 2022")).toBeInTheDocument();
    expect(screen.queryByText("Zeta Hidrografia municipal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fontes" }));

    const dialog = screen.getByRole("dialog", {
      name: "Fontes documentadas"
    });
    expect(within(dialog).getByText(/1 fontes na seleção atual de 3/))
      .toBeInTheDocument();
    expect(within(dialog).getAllByText(/IBGE/).length).toBeGreaterThan(0);
    expect(within(dialog).queryByText(/Prefeitura do Rio de Janeiro/))
      .not.toBeInTheDocument();
  });

  it("sorts table rows when a column header is clicked", () => {
    render(<CatalogView datasets={datasets} stats={stats} />);

    expect(getFirstDataRow()).toHaveTextContent("Alpha Censo 2022");

    fireEvent.click(screen.getByRole("button", { name: "Fonte" }));

    expect(getFirstDataRow()).toHaveTextContent("Zeta Hidrografia municipal");
  });
});

function getFirstDataRow() {
  return screen.getAllByRole("row")[1];
}

function dataset(overrides: Partial<CatalogDataset>): CatalogDataset {
  return {
    id: "",
    source_name: "",
    source_institution: "",
    source_url: "",
    acquisition_route: "",
    access_status: "",
    license: "",
    spatial_coverage: "",
    spatial_resolution: "",
    temporal_coverage: "",
    format: "",
    crs: "",
    evidence_family: "",
    potential_use: "",
    known_limitations: "",
    raw_storage_path: "",
    collection_status: "downloaded",
    promotion_status: "candidate",
    collected_at: "",
    notes: "",
    ...overrides
  };
}
