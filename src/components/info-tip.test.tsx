import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InfoTip } from "./info-tip";

describe("InfoTip", () => {
  it("exposes the caveat on keyboard focus and dismisses with Escape", () => {
    render(<InfoTip label="Inundação">Ausência de classe não representa baixo risco.</InfoTip>);
    const button = screen.getByRole("button", { name: "Informações sobre Inundação" });
    fireEvent.focus(button);
    expect(screen.getByRole("tooltip")).toHaveTextContent("não representa baixo risco");
    expect(button).toHaveAttribute("aria-describedby", screen.getByRole("tooltip").id);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
  it("supports touch/click and dismissal outside the tooltip", () => {
    render(<InfoTip label="Vegetação">Não mede fração de copas.</InfoTip>);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Não mede fração de copas");
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
