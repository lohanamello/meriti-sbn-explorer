import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import appData from "../../data/processed/meriti/phase3-app-data.json";
import type { Phase3ExplorerData } from "@/types/phase3";
import { ExplorerShell } from "./explorer-shell";

const mapRender = vi.hoisted(() => vi.fn());
vi.mock("./map-workspace", () => ({
  MapWorkspace: (props: { onSelectUnit: (id: string) => void }) => { mapRender(props); return <section aria-label="Mapa de exploração geográfica" />; }
}));
const data = appData as unknown as Phase3ExplorerData;
const stats = { total: 24, downloaded: 23, candidates: 0, deferred: 12, promoted: 10, temporalPromoted: 5 };
const mount = () => render(<ExplorerShell catalogStats={stats} phase3Data={data} />);

describe("Meriti explorer", () => {
  beforeEach(() => mapRender.mockClear());
  it("starts at the municipal extent, with all 16 official neighborhoods and no score", () => {
    mount();
    expect(mapRender.mock.lastCall?.[0]).toMatchObject({
      viewportUnit: { id: "3305109", unitType: "municipality" }
    });
    expect(mapRender.mock.lastCall?.[0].units).toHaveLength(16);
    expect(screen.queryByText("Pontuação", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("Posição", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "AP3" })).not.toBeInTheDocument();
  });
  it("opens a clean photo without changing territory or evidence values, then restores an analytical view", () => {
    mount();
    const initial = mapRender.mock.lastCall?.[0];
    fireEvent.click(screen.getByRole("button", { name: "Foto detalhada" }));
    expect(mapRender.mock.lastCall?.[0].activeLayers).toEqual([]);
    expect(mapRender.mock.lastCall?.[0].viewportUnit).toBe(initial.viewportUnit);
    expect(screen.getByRole("button", { name: "Foto detalhada" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Censo 2022")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Vegetação geral · 2026", exact: true }));
    expect(mapRender.mock.lastCall?.[0].activeLayers.map((layer: { id: string }) => layer.id)).toEqual(["vegetation-recent", "protected-areas", "rivers-official"]);
    expect(screen.getByRole("button", { name: "Foto detalhada" })).toHaveAttribute("aria-pressed", "false");
  });
  it("preserves the overlay reference when switching lenses or territory selection", () => {
    mount();
    const layers = mapRender.mock.lastCall?.[0].activeLayers;
    fireEvent.click(screen.getByRole("tab", { name: /Lente técnica/ }));
    expect(mapRender.mock.lastCall?.[0].activeLayers).toBe(layers);
    fireEvent.click(within(screen.getByLabelText("Unidades territoriais")).getByRole("button", { name: /^Centro/ }));
    expect(screen.getByRole("heading", { name: "Centro" })).toBeInTheDocument();
    expect(mapRender.mock.lastCall?.[0].activeLayers).toBe(layers);
  });
  it("exposes district and sector geometry without inventing neighborhood parentage", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Distritos" }));
    expect(mapRender.mock.lastCall?.[0].units).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Setores" }));
    expect(mapRender.mock.lastCall?.[0].units).toHaveLength(809);
    expect(mapRender.mock.lastCall?.[0].onSelectLocality).toBeUndefined();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "330510905000001" } });
    expect(screen.getByRole("searchbox")).toHaveValue("330510905000001");
    fireEvent.click(screen.getByRole("button", { name: "Informações sobre Escala do saneamento" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent(/saneamento estão disponíveis na escala dos bairros/);
  });
  it("changes only the vegetation year and enables its overlay", () => {
    mount();
    fireEvent.change(screen.getByLabelText("Ano da cobertura vegetal"), { target: { value: "2019" } });
    expect(mapRender.mock.lastCall?.[0].year).toBe(2019);
    expect(mapRender.mock.lastCall?.[0].activeLayers.map((layer: { id: string }) => layer.id)).toEqual(["vegetation", "vegetation-recent", "protected-areas", "rivers-official", "local-neighborhoods"]);
    expect(screen.getByText("Área com classe média ou alta · SGB 2015")).toBeInTheDocument();
    expect(screen.getByText("Censo 2022")).toBeInTheDocument();
  });
  it("returns the viewport to the municipality without changing the active indicator or selected card", () => {
    mount();
    fireEvent.click(within(screen.getByLabelText("Unidades territoriais")).getByRole("button", { name: /^Centro/ }));
    fireEvent.click(screen.getByRole("button", { name: "Ver município inteiro" }));
    expect(mapRender.mock.lastCall?.[0].viewportUnit.id).toBe("3305109");
    expect(screen.getByRole("heading", { name: "Centro" })).toBeInTheDocument();
  });
  it("finds Parque Novo Rio without assigning the parent neighborhood's indicators", () => {
    mount();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "parque novo rio" } });
    fireEvent.click(within(screen.getByLabelText("Unidades territoriais")).getByRole("button", { name: /Parque Novo Rio/ }));
    expect(screen.getByRole("heading", { name: "Parque Novo Rio" })).toBeInTheDocument();
    expect(screen.queryByRole("complementary", { name: "Cartão de oportunidade territorial" })).not.toBeInTheDocument();
    expect(screen.queryByText("População", { exact: true })).not.toBeInTheDocument();
    expect(mapRender.mock.lastCall?.[0]).toMatchObject({ selectedUnitId: "", focusedLocality: { id: "atlas-parque-novo-rio", geometryStatus: "approximate_boundary" } });
    fireEvent.click(screen.getByRole("button", { name: "Ver indicadores de Parque Araruama · IBGE" }));
    expect(screen.getByRole("heading", { name: "Parque Araruama" })).toBeInTheDocument();
    expect(mapRender.mock.lastCall?.[0].focusedLocality).toBeUndefined();
  });
  it("distinguishes a locality label from a boundary and clears it on scale change", () => {
    mount();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "vila sao joao" } });
    fireEvent.click(within(screen.getByLabelText("Unidades territoriais")).getByRole("button", { name: /Vila São João/ }));
    expect(screen.getByText("Ponto aproximado, sem limite publicado")).toBeInTheDocument();
    expect(mapRender.mock.lastCall?.[0].focusedLocality.geometry.geometry.type).toBe("Point");
    fireEvent.click(screen.getByRole("button", { name: "Setores" }));
    expect(mapRender.mock.lastCall?.[0].focusedLocality).toBeUndefined();
    expect(mapRender.mock.lastCall?.[0].units).toHaveLength(809);
    expect(mapRender.mock.lastCall?.[0].onSelectLocality).toBeUndefined();
  });
  it("matches the municipal spelling São Mateus to the IBGE spelling São Matheus", () => {
    mount();
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "São Mateus" } });
    expect(within(screen.getByLabelText("Unidades territoriais")).getByRole("button", { name: /São Matheus/ })).toBeInTheDocument();
  });

});
