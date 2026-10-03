import { expect, test } from "@playwright/test";

test("interface principal: comparações por fonte, limpeza e leitura da validação", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Atlas ambiental de Meriti" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Bairros", exact: true })).toHaveAttribute("href", "/bairros");
  await expect(page.locator(".map-panel__meta")).not.toContainText("carregando");
  const toolbar = page.getByRole("navigation", { name: "Visualizações rápidas" });
  for (const [button, layer] of [
    ["Imagem CBERS", "rasters/cbers4a-rgb-20260426.png"],
    ["Copas em 2019", "rasters/chmv2-canopy-height-preview.png"],
    ["Vegetação em 2025", "rasters/sentinel2-recurrence-2025.png"],
    ["Rios e inundação", "layers/flood-susceptibility.geojson"],
    ["Densidade", "layers/population.geojson"],
  ]) {
    const response = page.waitForResponse(response => response.url().includes(`/meriti/evidence/${layer}`) && response.ok());
    await toolbar.getByRole("button", { name: button, exact: true }).click();
    await response;
    await expect(page.locator(".map-panel__meta")).not.toContainText("carregando");
    await expect(toolbar.getByRole("button", { name: button, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".map-error")).toHaveCount(0);
  }
  await toolbar.getByRole("button", { name: "Limpar", exact: true }).click();
  await expect(page.locator(".exploration-toolbar__count")).toHaveText("0 camadas ativas");
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(0);
  await toolbar.getByRole("button", { name: "Imagem CBERS", exact: true }).click();
  await expect(page.locator(".map-panel__meta")).not.toContainText("carregando");
  await page.locator(".map-panel").scrollIntoViewIfNeeded();
  await page.locator(".map-panel").screenshot({ path: testInfo.outputPath("review-cbers-map.png") });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("review-viewport.png") });
  await page.getByRole("button", { name: "Município", exact: true }).click();
  const research = page.getByRole("region", { name: "Investigação e validação da vegetação" });
  await research.scrollIntoViewIfNeeded();
  await expect(research).toContainText("0 de 400 frações de referência aceitas");
  await expect(research).toContainText("01/10/2026");
  await expect(research).toContainText("12,30%");
  await expect(research).toContainText("14,78%");
  await research.getByText("Material para conferência independente", { exact: true }).click();
  await expect(research.getByRole("link", { name: "Ficha de interpretação, CSV" })).toBeVisible();
  await research.screenshot({ path: testInfo.outputPath("review-research.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
