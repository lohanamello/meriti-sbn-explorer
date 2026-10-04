import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { COMPARISON_REVIEW_SOURCE } from "@/lib/cell-reviews";
import { CellReviewForm } from "./cell-review-form";

describe("human review", () => {
  it("does not save without a choice", () => {
    const onSave = vi.fn();
    render(<CellReviewForm sampleId="MERITI-V1-0001" onSave={onSave} onNext={() => undefined} hasNext />);
    fireEvent.click(screen.getByRole("button", { name: "Salvar avaliação" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Escolha uma das três opções");
  });
  it.each([["Confere", "present"], ["Não confere", "absent"], ["Não consigo classificar", "unsure"]])("saves %s as an unvalidated presence observation", (label, vegetation) => {
    const onSave = vi.fn();
    const onNext = vi.fn();
    render(<CellReviewForm sampleId="MERITI-V1-0001" onSave={onSave} onNext={onNext} hasNext />);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    fireEvent.click(screen.getByLabelText(label));
    fireEvent.click(screen.getByRole("button", { name: "Salvar e próxima" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ vegetation, status: "draft", source: COMPARISON_REVIEW_SOURCE, imageDate: null }));
    expect(onSave.mock.calls[0][0]).not.toHaveProperty("vegetationPercent");
    expect(onNext).toHaveBeenCalledOnce();
  });
});
