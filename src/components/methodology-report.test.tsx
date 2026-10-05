import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import appData from "../../data/processed/meriti/phase3-app-data.json";
import type { Phase3ExplorerData } from "@/types/phase3";
import { MethodologyReport } from "./methodology-report";

describe("completed methodology report", () => {
  it("publishes the consolidated human results without a classification interface or invented area confidence", () => {
    render(<MethodologyReport data={appData as unknown as Phase3ExplorerData} />);
    expect(screen.getByRole("heading", { name: "Metodologia e resultados" })).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Classificações humanas pelo critério de presença" });
    expect(within(table).getByRole("row", { name: "Últimas 30 células 12 18 0 30" })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: "Total com critério de presença 54 18 0 72" })).toBeInTheDocument();
    expect(screen.getByText(/130 registros humanos/)).toHaveTextContent(/58 respostas históricas/);
    expect(screen.getByText(/Não foi calculada uma porcentagem municipal/)).toHaveTextContent(/intervalo de confiança observado/);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Resultados das 400 células/ })).toHaveAttribute("href", "/api/validacao/resultados");
    expect(screen.getByRole("link", { name: /avaliações humanas preservadas/ })).toHaveAttribute("href", "/api/validacao/avaliacoes-finais");
  });
});
