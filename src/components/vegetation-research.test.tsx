import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import appData from "../../data/processed/meriti/phase3-app-data.json";
import type { VegetationResearch as ResearchData } from "@/types/phase3";
import { VegetationResearch } from "./vegetation-research";

describe("independent field evidence", () => {
  it.each(["330510905000121", "330510905000415", "330510905000435"])("preserves unknown observations for sector %s", (territoryId) => {
    render(<VegetationResearch data={appData.vegetationResearch as unknown as ResearchData} territoryId={territoryId} />);
    const heading = screen.getByRole("heading", { name: /Árvores observadas em campo/ });
    const section = heading.parentElement!;
    expect(within(section).getAllByText("sem dados")).toHaveLength(2);
    expect(section).not.toHaveTextContent("0,00%");
    expect(screen.getByText("Revisão visual concluída")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Como chegamos aos resultados" })).toHaveAttribute("href", "/metodologia");
    expect(screen.queryByText(/calculadas depois da conferência/)).not.toBeInTheDocument();
  });
});
