import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import appData from "../../data/processed/meriti/phase3-app-data.json";
import type { Phase3ExplorerData } from "@/types/phase3";

import { MapWorkspace } from "./map-workspace";

const mapConstructorOptions = vi.hoisted(() => vi.fn());
const layerInsertions = vi.hoisted(() => vi.fn());
const clickHandler = vi.hoisted(() => ({ current: undefined as undefined | ((event: unknown) => void) }));
const clickedEvidence = vi.hoisted(() => ({ features: [] as Array<{ properties: Record<string, string> }> }));

vi.mock("maplibre-gl", () => {
  class MockMap {
    constructor(options: unknown) {
      mapConstructorOptions(options);
    }

    addControl() {}
    hasControl() { return true; }
    addLayer(layer: { id: string }, before?: string) { layerInsertions(layer.id, before); }
    addSource() {}
    easeTo() {}
    fitBounds() {}
    queryRenderedFeatures(_point: unknown, options: { layers: string[] }) {
      return options.layers.includes("territorial-units-fill") ? [{ properties: { id: "330510905000001" } }] : clickedEvidence.features;
    }
    getCanvas() {
      return { style: {} };
    }
    getLayer() {
      return true;
    }
    getSource() {
      return { setData() {} };
    }
    getStyle() {
      return { layers: [], sources: {} };
    }
    jumpTo() {}
    on(eventName: string, handlerOrLayer: unknown) {
      if (eventName === "click" && typeof handlerOrLayer === "function") clickHandler.current = handlerOrLayer as (event: unknown) => void;
      if (eventName === "load" && typeof handlerOrLayer === "function") {
        handlerOrLayer();
      }
    }
    remove() {}
    removeLayer() {}
    removeControl() {}
    removeSource() {}
    resize() {}
    setPaintProperty() {}
  }

  return {
    default: {
      AttributionControl: class MockAttributionControl {},
      Map: MockMap,
      NavigationControl: class MockNavigationControl {}
    }
  };
});

describe("MapWorkspace", () => {
  it("keeps the dated RGB below the boundary and analytical evidence even when selected last", async () => {
    layerInsertions.mockClear();
    const data = appData as unknown as Phase3ExplorerData;
    render(<MapWorkspace activeLayers={data.evidenceLayers.filter((layer) => Boolean(layer.image))}
      studyArea={data.studyArea} year={2022} selectedUnitId="" selectionRevision={0} units={[]} onSelectUnit={() => undefined} />);
    await act(async () => undefined);
    expect(layerInsertions).toHaveBeenCalledWith("phase3-overlay-satellite-recent-raster", "municipality-boundary-fill");
    expect(layerInsertions).toHaveBeenCalledWith("phase3-overlay-vegetation-recent-raster", "territorial-units-fill");
  });

  it("starts the map inside Meriti municipality without locking horizontal pan", async () => {
    render(
      <MapWorkspace
        activeLayers={[]}
        studyArea={(appData as unknown as Phase3ExplorerData).studyArea}
        year={2022}
        selectedUnitId=""
        selectionRevision={0}
        units={[]}
        onSelectUnit={() => undefined}
      />
    );

    await act(async () => undefined);

    const options = mapConstructorOptions.mock.calls[0]?.[0] as {
      center: [number, number];
      maxBounds?: [[number, number], [number, number]];
    };

    expect(options.center[0]).toBeGreaterThan(-43.411);
    expect(options.center[0]).toBeLessThan(-43.329);
    expect(options.center[1]).toBeGreaterThan(-22.815);
    expect(options.center[1]).toBeLessThan(-22.755);
    expect(options.maxBounds).toBeUndefined();
  });
  it("keeps sector selection reachable underneath atlas references", async () => {
    const onSelectUnit = vi.fn();
    clickedEvidence.features = [{ properties: { localityId: "atlas-parque-novo-rio", sourceUrl: "https://www.dageop.com.br" } }];
    render(<MapWorkspace activeLayers={[]} studyArea={(appData as unknown as Phase3ExplorerData).studyArea}
      year={2022} selectedUnitId="" selectionRevision={0} units={[]} onSelectUnit={onSelectUnit} />);
    await act(async () => undefined);
    act(() => clickHandler.current?.({ point: {}, lngLat: { lng: -43.34, lat: -22.795 } }));
    expect(onSelectUnit).toHaveBeenCalledWith("330510905000001");
    clickedEvidence.features = [];
  });

});
