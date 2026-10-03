import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOverlayData } from "./use-overlay-data";
import type { EvidenceLayer } from "@/types/phase3";

const collection = { type: "FeatureCollection", features: [] };
const layer = (id: string, temporal = false): EvidenceLayer => ({
  id, label: id, family: "Test", status: "available", resolution: "Bairro", temporalCoverage: "2022",
  sourceDatasetIds: [], legend: [], timelineReady: temporal, layerFile: `layers/${id}.geojson`,
  yearFiles: temporal ? { "2019": `layers/${id}-2019.geojson`, "2023": `layers/${id}-2023.geojson` } : undefined
});
afterEach(() => vi.unstubAllGlobals());

describe("overlay loading", () => {
  it("does not repeat requests for equivalent descriptors or a year change on a fixed layer", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => collection });
    vi.stubGlobal("fetch", fetchMock);
    const { result, rerender } = renderHook(({ year }) => useOverlayData([layer("fixed")], year), { initialProps: { year: 2022 } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    rerender({ year: 2023 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("retains successful layers and reports a failed layer independently", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => Promise.resolve({
      ok: !url.endsWith("broken.geojson"), json: async () => collection
    })));
    const { result } = renderHook(() => useOverlayData([layer("good"), layer("broken")], 2022));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(Object.keys(result.current.collections)).toEqual(["good"]);
    expect(result.current.errors).toEqual(["Falha ao carregar broken."]);
  });
  it("clears old-year geometry while loading and ignores an obsolete response", async () => {
    const resolveRequests: Array<(value: unknown) => void> = [];
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => new Promise((resolve) => resolveRequests.push(resolve))));
    const { result, rerender } = renderHook(({ year }) => useOverlayData([layer("vegetation", true)], year), { initialProps: { year: 2019 } });
    rerender({ year: 2023 });
    await act(async () => resolveRequests[1]({ ok: true, json: async () => ({ ...collection, year: 2023 }) }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => resolveRequests[0]({ ok: true, json: async () => ({ ...collection, year: 2019 }) }));
    expect(result.current.collections.vegetation).toMatchObject({ year: 2023 });
  });
});
