import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("Meriti: bairros, busca, escalas e referências", async ({ page }, testInfo) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle(/Meriti/);
  await expect(page.getByRole("status")).toContainText("16 bairros IBGE + 6 referências locais · 809 setores censitários");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.locator(".map-panel__meta")).not.toContainText("carregando");
  const territories = page.getByLabel("Unidades territoriais", { exact: true });
  await expect(territories.getByRole("button")).toHaveCount(22);
  await expect(territories.getByRole("button").filter({ hasNotText: "Atlas ·" })).toHaveCount(16);
  await expect(territories.getByRole("button").filter({ hasText: "Atlas · contorno aproximado" })).toHaveCount(5);
  await expect(territories.getByRole("button").filter({ hasText: "Atlas · ponto sem divisa" })).toHaveCount(1);
  await page.getByLabel("Buscar território").fill("eden");
  await expect(territories.getByRole("button")).toHaveCount(1);
  await territories.getByRole("button", { name: /^Éden/ }).click();
  await expect(page.getByRole("heading", { name: "Éden", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Lente técnica" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Leitura técnica");
  await page.getByRole("button", { name: "Distritos", exact: true }).click();
  await expect(territories.getByRole("button")).toHaveCount(3);
  await page.getByRole("button", { name: "Informações sobre Escala do saneamento", exact: true }).click();
  await expect(page.getByRole("tooltip")).toContainText("Os indicadores de saneamento estão disponíveis");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Setores", exact: true }).click();
  await expect(territories.getByRole("button")).toHaveCount(809);
  await page.getByRole("button", { name: "Município", exact: true }).click();
  await expect(page.locator(".card-metrics")).toContainText("440.962");
  await expect(page.locator(".signal-list")).toContainText("54,16%");
  await page.getByRole("checkbox", { name: /Hidrografia colaborativa OSM/ }).check();
  await expect(page.locator(".maplibregl-ctrl-attrib-inner")).toContainText("OpenStreetMap contributors, ODbL");
  await expect(page.getByRole("checkbox", { name: /Bairros e localidades do atlas/ })).toBeChecked();
  const legend = page.getByLabel("Legenda", { exact: true });
  await expect(legend).not.toHaveAttribute("open", "");
  await legend.getByText("Legenda · 5 camadas", { exact: true }).click();
  await expect(legend.getByText("NDVI de 0,5 ou mais", { exact: true })).toBeVisible();
  await legend.getByText("Legenda · 5 camadas", { exact: true }).click();
  const legendBounds = await legend.boundingBox();
  const creditsBounds = await page.locator(".maplibregl-ctrl-attrib").boundingBox();
  expect(legendBounds!.y + legendBounds!.height).toBeLessThan(creditsBounds!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator(".map-panel").screenshot({ path: testInfo.outputPath("meriti-map.png") });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath("meriti-viewport.png") });
  await page.screenshot({ path: testInfo.outputPath("meriti-page.png"), fullPage: true });
  expect(pageErrors).toEqual([]);
  await page.getByRole("link", { name: "Catálogo", exact: true }).click();
  await page.getByLabel("Filtro por promoção").selectOption("deferred");
  await expect(page.getByRole("table")).toContainText("Diferido");
  expect(pageErrors).toEqual([]);
});

test("comparação temporal e exportação sem pontuação", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Município", exact: true }).click();
  await page.getByLabel("Ano da cobertura vegetal").selectOption("2019");
  await expect(page.locator(".card-metrics")).toContainText("0,21%");
  await expect(page.locator(".map-legend")).toContainText("Cobertura vegetal mapeada · 2019");
  await expect(page.locator(".signal-list")).toContainText("SGB 2015");
  await expect(page.locator(".signal-list")).toContainText("urbana · 2022");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar indicadores" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("meriti-3305109-indicadores.json");
  const exportPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(exportPath);
  const payload = JSON.parse(await readFile(exportPath, "utf8"));
  expect(payload.territory.population2022).toBe(440962);
  expect(payload.landCoverYear).toBe(2019);
  expect(Object.keys(payload.landCoverSeries)).toEqual(["2019", "2020", "2021", "2022", "2023"]);
  expect(payload.sources.length).toBeGreaterThan(0);
  expect(payload.recentVegetation.sceneCount).toBe(6);
  expect(payload.recentVegetation.endDate).toBe("2026-10-01");
  expect(payload.protectedAreas).toHaveLength(6);
  expect(payload.vegetationResearch.canopy.imageryDates).toEqual(["2019-09-16"]);
  expect(payload.vegetationResearch.seasonality.sceneCount).toBe(12);
  expect(payload.vegetationResearch.validation.estimandDate).toBe("2026-10-01");
  expect(payload.vegetationResearch.validation.referenceLabelsCompleted).toBe(0);
  const sourceIds = new Set(payload.sources.map((source: { id: string; url: string }) => {
    expect(source.url).toMatch(/^https?:\/\//);
    return source.id;
  }));
  for (const layer of payload.evidence) {
    for (const id of layer.sourceDatasetIds) expect(sourceIds.has(id)).toBe(true);
  }
  expect(JSON.stringify(payload)).not.toMatch(/"(?:score|rank|ranking|priorityScore)"\s*:/i);
  await page.getByLabel("Ano da cobertura vegetal").selectOption("2023");
  await expect(page.locator(".card-metrics")).toContainText("0,18%");
});

test("camadas publicadas e anos inválidos", async ({ request }) => {
  for (const id of ["flood-susceptibility", "sanitation", "urban-cover", "population", "waterways", "facilities", "green-spaces", "protected-areas", "rivers-official", "water-bodies"]) {
    const response = await request.get(`/api/phase3/layers/${id}`);
    expect(response.ok()).toBe(true);
    const geojson = await response.json();
    expect(geojson.type).toBe("FeatureCollection");
    expect(geojson.features.length).toBeGreaterThan(0);
    if (id === "population") {
      expect(geojson.features).toHaveLength(809);
      expect(geojson.features.reduce((sum: number, feature: { properties: { populationTotal: number } }) => sum + feature.properties.populationTotal, 0)).toBe(440962);
    }
    if (id === "protected-areas") {
      expect(geojson.features).toHaveLength(12);
      expect(geojson.features.filter((feature: { geometry: { type: string } }) => feature.geometry.type === "Point")).toHaveLength(6);
    }
    if (id === "rivers-official") expect(JSON.stringify(geojson)).toContain("Rio Pavuna");
  }
  for (const id of ["vegetation-recent", "satellite-recent", "canopy-height", "vegetation-recurrence", "cbers-reference"]) {
    const response = await request.get(`/api/phase3/layers/${id}`);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toBe("image/png");
    expect((await response.body()).subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  }
  for (const year of [2019, 2020, 2021, 2022, 2023]) {
    const response = await request.get(`/api/phase3/layers/vegetation?year=${year}`);
    expect(response.ok()).toBe(true);
    expect((await response.json()).features.length).toBeGreaterThan(0);
  }
  for (const year of ["2024", "__proto__", "constructor"]) {
    expect((await request.get(`/api/phase3/layers/vegetation?year=${year}`)).status()).toBe(400);
  }
  expect((await request.get("/api/phase3/layers/unknown")).status()).toBe(404);
  const sample = await request.get("/api/phase3/layers/validation-sample");
  expect((await sample.json()).features).toHaveLength(400);
  const form = await request.get("/api/validacao/ficha");
  expect(form.ok()).toBe(true);
  const rows = (await form.text()).trim().split(/\r?\n/);
  expect(rows).toHaveLength(401);
  expect(rows[0]).toContain("reference_target_date");
  expect(rows[0]).not.toMatch(/stratum|ndvi|weight|class/);
  const columns = rows[0].split(",");
  const fraction = columns.indexOf("live_vegetation_fraction");
  expect(fraction).toBeGreaterThan(0);
  for (const row of rows.slice(1)) expect(row.split(",")[fraction]).toBe("");
  expect((await (await request.get("/api/validacao/celulas")).json()).features).toHaveLength(400);
  expect((await (await request.get("/api/validacao/protocolo")).text())).toContain("01/10/2026");
  for (const file of ["unknown", "__proto__", "sample-master.csv"]) expect((await request.get(`/api/validacao/${file}`)).status()).toBe(404);
});

test("imagens recentes, áreas protegidas e informações acessíveis", async ({ page, isMobile }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const imageResponse = page.waitForResponse((response) => response.url().includes("/meriti/evidence/rasters/sentinel2-ndvi-2026.png") && response.ok());
  await page.goto("/");
  await imageResponse;
  await expect(page.locator(".protected-marker")).toHaveCount(6);
  await page.getByRole("button", { name: "Município", exact: true }).click();
  await expect(page.locator(".recent-measurement")).toContainText("17,89%");
  await expect(page.locator(".recent-measurement")).toContainText("99,95%");
  const layerCheckbox = page.getByRole("checkbox", { name: /APAs e Parque Jardim Jurema/ });
  const info = page.getByRole("button", { name: "Informações sobre APAs e Parque Jardim Jurema", exact: true });
  if (isMobile) await info.tap(); else await info.hover();
  await expect(page.getByRole("tooltip")).toContainText("Cinco APAs e um parque");
  await expect(layerCheckbox).toBeChecked();
  if (isMobile) await page.getByRole("heading", { name: /Camadas de evidência/ }).tap(); else await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await layerCheckbox.focus();
  await info.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  const rgbResponse = page.waitForResponse((response) => response.url().includes("/meriti/evidence/rasters/sentinel2-rgb-2026.png") && response.ok());
  await page.getByRole("checkbox", { name: /Imagem Sentinel-2 datada/ }).check();
  await rgbResponse;
  await page.getByRole("button", { name: /Ver.*Jardim Jurema/i }).click();
  const popup = page.locator(".maplibregl-popup-content");
  await expect(popup).toContainText(/Jardim Jurema/i);
  await expect(popup).toContainText("4.220");
  await expect(popup.getByRole("link")).toHaveAttribute("href", /geoportal\.inea\.rj\.gov\.br/);
  await expect.poll(async () => {
    const panel = await page.locator(".map-canvas").boundingBox();
    const bounds = await popup.boundingBox();
    return Boolean(panel && bounds && bounds.x >= panel.x && bounds.y >= panel.y && bounds.x + bounds.width <= panel.x + panel.width && bounds.y + bounds.height <= panel.y + panel.height);
  }).toBe(true);
  expect(await popup.getByRole("heading").evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2));
  })).toBe(true);
  await page.locator(".map-panel").screenshot({ path: testInfo.outputPath("meriti-recent-imagery-and-areas.png") });
  await layerCheckbox.uncheck();
  await expect(page.locator(".protected-marker")).toHaveCount(0);
  await expect(popup).toHaveCount(0);
  await expect(page.locator(".map-error")).toHaveCount(0);
  const methodologyDownload = page.waitForEvent("download");
  await page.getByRole("link", { name: "Baixar metodologia detalhada" }).click();
  const download = await methodologyDownload;
  const output = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(output);
  const methodology = await readFile(output, "utf8");
  expect(methodology).toContain("NDVI = (B08 − B04) / (B08 + B04)");
  expect(methodology).toContain("14.405,50 m");
  expect(errors).toEqual([]);
});
