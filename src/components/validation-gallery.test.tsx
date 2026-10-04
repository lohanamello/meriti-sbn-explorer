import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ValidationCell } from "@/lib/validation-cells";
import { cellBounds } from "@/lib/validation-cells";
import { ValidationGallery } from "./validation-gallery";

vi.mock("next/dynamic", () => ({ default: () => function MockMap({ cell }: { cell: ValidationCell }) {
  return <div data-testid="cell-map">{cell.properties.sample_id}</div>;
} }));
const cells: ValidationCell[] = [
  { type: "Feature", properties: { sample_id: "MERITI-V1-0001", clipped_cell_area_m2: 100 }, geometry: { type: "Polygon", coordinates: [[[-43.3, -22.8], [-43.2, -22.8], [-43.2, -22.7], [-43.3, -22.8]]] } },
  { type: "Feature", properties: { sample_id: "MERITI-V1-0002", clipped_cell_area_m2: 24 }, geometry: { type: "MultiPolygon", coordinates: [ [[[-43.4, -22.9], [-43.3, -22.9], [-43.3, -22.8], [-43.4, -22.9]]] ] } }
];

describe("cell comparison", () => {
  beforeEach(() => localStorage.clear());
  it("opens Google at the selected cell without loading Esri or changing the review source", () => {
    render(<ValidationGallery cells={cells} references={{}} />);
    fireEvent.click(screen.getByText("Ver esta célula no Google Maps", { exact: true }));
    const link = screen.getByRole("link", { name: /Abrir no Google/ });
    const first = link.getAttribute("href");
    fireEvent.click(screen.getByRole("button", { name: "Próxima", exact: true }));
    expect(link.getAttribute("href")).not.toBe(first);
    expect(new URL(link.getAttribute("href")!).searchParams.get("center")).toBe("-22.8500000,-43.3500000");
    expect(screen.queryByTestId("cell-map")).not.toBeInTheDocument();
    expect(screen.getByText(/ficha acima continua vinculada ao CBERS/)).toBeInTheDocument();
    expect(screen.getByText("0 de 2 células com avaliação salva")).toBeInTheDocument();
  });
  it("keeps the selected cell, CBERS panel and historical metadata together without marking it validated", () => {
    render(<ValidationGallery cells={cells} references={{
      "MERITI-V1-0001": { dates: [20250616], resolutions: [.34] },
      "MERITI-V1-0002": { dates: [20250616, 20251224], resolutions: [.34, .5] }
    }} />);
    expect(screen.queryByTestId("cell-map")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Consulta opcional: localizar a célula na foto Esri"));
    fireEvent.click(screen.getByRole("button", { name: "Abrir foto detalhada da célula" }));
    expect(screen.getByTestId("cell-map")).toHaveTextContent("MERITI-V1-0001");
    expect(screen.getByText(/16\/06\/2025; resolução/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(screen.getByTestId("cell-map")).toHaveTextContent("MERITI-V1-0002");
    expect(screen.getByRole("img")).toHaveAttribute("src", "/meriti/validation/MERITI-V1-0002.png");
    expect(screen.getByText(/A célula cruza duas áreas/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
    expect(screen.getByText(/Não há extração automática/)).toBeInTheDocument();
    expect(screen.getByText(/Os quadrados incluem áreas com e sem sinal vegetal/)).toBeInTheDocument();
  });
  it("restores saved progress after leaving the page, without starting an Esri map", () => {
    const view = render(<ValidationGallery cells={cells} references={{}} />);
    fireEvent.click(screen.getByLabelText("Não consigo classificar"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar e próxima" }));
    expect(screen.getByText("1 de 2 células com avaliação salva")).toBeInTheDocument();
    view.unmount();
    render(<ValidationGallery cells={cells} references={{}} />);
    expect(screen.getByLabelText("Não consigo classificar")).toBeChecked();
    expect(screen.getByText("1 de 2 células com avaliação salva")).toBeInTheDocument();
    expect(screen.queryByTestId("cell-map")).not.toBeInTheDocument();
  });
  it("uses complete polygon bounds, including clipped multipart cells", () => {
    expect(cellBounds(cells[0])).toEqual([[-43.3, -22.8], [-43.2, -22.7]]);
    expect(cellBounds(cells[1])).toEqual([[-43.4, -22.9], [-43.3, -22.8]]);
  });
});
