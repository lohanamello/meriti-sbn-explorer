import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ValidationCell } from "@/lib/validation-cells";
import { cellBounds } from "@/lib/validation-cells";
import { ValidationGallery } from "./validation-gallery";
import { REVIEW_STORAGE_KEY, COMPARISON_REVIEW_SOURCE, PRESENCE_CRITERION, parseReviewFile, serializeReviews, type CellReview } from "@/lib/cell-reviews";

vi.mock("next/dynamic", () => ({ default: () => function MockMap({ cell }: { cell: ValidationCell }) {
  return <div data-testid="cell-map">{cell.properties.sample_id}</div>;
} }));
const cells: ValidationCell[] = [
  { type: "Feature", properties: { sample_id: "MERITI-V1-0001", clipped_cell_area_m2: 100 }, geometry: { type: "Polygon", coordinates: [[[-43.3, -22.8], [-43.2, -22.8], [-43.2, -22.7], [-43.3, -22.8]]] } },
  { type: "Feature", properties: { sample_id: "MERITI-V1-0002", clipped_cell_area_m2: 24 }, geometry: { type: "MultiPolygon", coordinates: [ [[[-43.4, -22.9], [-43.3, -22.9], [-43.3, -22.8], [-43.4, -22.9]]] ] } }
];

describe("cell comparison", () => {
  beforeEach(() => localStorage.clear());
  it.each([
    ["present", "Conferes", "absent", "Não confere"],
    ["absent", "Não confere", "present", "Confere"]
  ] as const)("reviews old %s answers without skipping corrections and resumes only pending work", (kind, label, correction, correctionLabel) => {
    const third = { ...cells[1], properties: { ...cells[1].properties, sample_id: "MERITI-V1-0003" } };
    const fourth = { ...cells[1], properties: { ...cells[1].properties, sample_id: "MERITI-V1-0004" } };
    const allCells = [...cells, third, fourth];
    const rows = Object.fromEntries(allCells.map((cell, i) => [cell.properties.sample_id, {
      sampleId: cell.properties.sample_id, vegetation: i === 1 ? correction : kind, criterion: i === 3 ? PRESENCE_CRITERION : undefined, source: COMPARISON_REVIEW_SOURCE,
      imageDate: null, status: "draft", updatedAt: "2026-10-01T10:00:00Z"
    } satisfies CellReview]));
    localStorage.setItem(REVIEW_STORAGE_KEY, serializeReviews(rows));
    const view = render(<ValidationGallery cells={allCells} references={{}} />);
    fireEvent.click(screen.getByRole("button", { name: `Revisar meus ${label} (2 pendentes)` }));
    expect(screen.getAllByRole("option")).toHaveLength(2);
    fireEvent.click(screen.getByLabelText(correctionLabel));
    fireEvent.click(screen.getByRole("button", { name: "Salvar e próxima" }));
    expect(screen.getByTestId("cell-map")).toHaveTextContent("MERITI-V1-0003");
    expect(screen.getByText(`Revisão dos seus ${label} · 1 de 2 revistos`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Anterior", exact: true }));
    expect(screen.getByLabelText(correctionLabel)).toBeChecked();
    view.unmount();
    render(<ValidationGallery cells={allCells} references={{}} />);
    fireEvent.click(screen.getByRole("button", { name: `Revisar meus ${label} (1 pendentes)` }));
    expect(screen.getByTestId("cell-map")).toHaveTextContent("MERITI-V1-0003");
    fireEvent.click(screen.getByRole("button", { name: "Salvar avaliação", exact: true }));
    expect(screen.getByText(/Revisão desta rodada concluída/)).toBeInTheDocument();
    const saved = parseReviewFile(localStorage.getItem(REVIEW_STORAGE_KEY)!, new Set(allCells.map(c => c.properties.sample_id)));
    expect(saved[rows["MERITI-V1-0001"].sampleId].beforePresenceReview?.vegetation).toBe(kind);
    expect(saved["MERITI-V1-0001"].vegetation).toBe(correction);
    expect(saved["MERITI-V1-0004"]).toEqual(rows["MERITI-V1-0004"]);
    expect(saved["MERITI-V1-0002"]).toEqual(rows["MERITI-V1-0002"]);
    expect(saved["MERITI-V1-0003"].criterion).toBe(PRESENCE_CRITERION);
  });
  it("preserves a saved answer from another tab when saving the current cell", () => {
    const view = render(<ValidationGallery cells={cells} references={{}} />);
    const external: CellReview = { sampleId: "MERITI-V1-0002", vegetation: "absent", source: COMPARISON_REVIEW_SOURCE, imageDate: null, status: "draft", updatedAt: "2026-10-01T10:00:00Z" };
    localStorage.setItem(REVIEW_STORAGE_KEY, serializeReviews({ [external.sampleId]: external }));
    fireEvent.click(screen.getByLabelText("Confere"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar avaliação", exact: true }));
    expect(screen.getByText("2 de 2 células com avaliação salva")).toBeInTheDocument();
    const saved = parseReviewFile(localStorage.getItem(REVIEW_STORAGE_KEY)!, new Set(cells.map(c => c.properties.sample_id)));
    expect(saved[external.sampleId]).toEqual(external);
    view.unmount();
  });
  it("opens Google at the selected cell alongside the default Esri view without saving a review", () => {
    render(<ValidationGallery cells={cells} references={{}} />);
    fireEvent.click(screen.getByText("Ver esta célula no Google Maps", { exact: true }));
    const link = screen.getByRole("link", { name: /Abrir no Google/ });
    const first = link.getAttribute("href");
    fireEvent.click(screen.getByRole("button", { name: "Próxima", exact: true }));
    expect(link.getAttribute("href")).not.toBe(first);
    expect(new URL(link.getAttribute("href")!).searchParams.get("center")).toBe("-22.8500000,-43.3500000");
    expect(screen.getByTestId("cell-map")).toBeInTheDocument();
    expect(screen.getByText(/ficha usa a comparação Esri/)).toBeInTheDocument();
    expect(screen.getByText("0 de 2 células com avaliação salva")).toBeInTheDocument();
  });
  it("keeps the selected cell, CBERS panel and historical metadata together without marking it validated", () => {
    render(<ValidationGallery cells={cells} references={{
      "MERITI-V1-0001": { dates: [20250616], resolutions: [.34] },
      "MERITI-V1-0002": { dates: [20250616, 20251224], resolutions: [.34, .5] }
    }} />);
    expect(screen.getByTestId("cell-map")).toBeInTheDocument();
    expect(screen.getByTestId("cell-map")).toHaveTextContent("MERITI-V1-0001");
    fireEvent.click(screen.getByText("Datas e limites da comparação", { exact: true }));
    expect(screen.getByText(/16\/06\/2025; resolução/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(screen.getByTestId("cell-map")).toHaveTextContent("MERITI-V1-0002");
    expect(screen.getByRole("img")).toHaveAttribute("src", "/meriti/validation/MERITI-V1-0002.png");
    expect(screen.getByText(/A célula cruza duas áreas/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
    expect(screen.getByText(/Não há extração automática/)).toBeInTheDocument();
    expect(screen.getByText(/Os quadrados incluem áreas com e sem sinal vegetal/)).toBeInTheDocument();
  });
  it("restores saved progress after leaving the page, with the Esri image visible by default", () => {
    const view = render(<ValidationGallery cells={cells} references={{}} />);
    fireEvent.click(screen.getByLabelText("Não consigo classificar"));
    fireEvent.click(screen.getByRole("button", { name: "Salvar e próxima" }));
    expect(screen.getByText("1 de 2 células com avaliação salva")).toBeInTheDocument();
    expect(screen.getByTestId("cell-map")).toHaveTextContent("MERITI-V1-0002");
    expect(screen.getByRole("img")).toHaveAttribute("src", "/meriti/validation/MERITI-V1-0002.png");
    expect(screen.getByRole("region", { name: "Avaliar MERITI-V1-0002" })).toBeInTheDocument();
    view.unmount();
    render(<ValidationGallery cells={cells} references={{}} />);
    expect(screen.getByLabelText("Não consigo classificar")).toBeChecked();
    expect(screen.getByText("1 de 2 células com avaliação salva")).toBeInTheDocument();
    expect(screen.getByTestId("cell-map")).toBeInTheDocument();
  });
  it("uses complete polygon bounds, including clipped multipart cells", () => {
    expect(cellBounds(cells[0])).toEqual([[-43.3, -22.8], [-43.2, -22.7]]);
    expect(cellBounds(cells[1])).toEqual([[-43.4, -22.9], [-43.3, -22.8]]);
  });
});
