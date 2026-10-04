import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import appData from "../../data/processed/meriti/phase3-app-data.json";
import type { Phase3ExplorerData } from "@/types/phase3";

import { MapWorkspace } from "./map-workspace";

const mapConstructorOptions = vi.hoisted(() => vi.fn());
const layerInsertions = vi.hoisted(() => vi.fn());
const clickHandler = vi.hoisted(() => ({ current: undefined as undefined | ((event: unknown) => void) }));
const clickedEvidence = vi.hoisted(() => ({ features: [] as Array<{ properties: Record<string, string> }> }));
const camera = vi.hoisted(() => ({ lng: -43.37, lat: -22.785, zoom: 12, onMove: undefined as undefined | (() => void) }));

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
    getCenter() { return { lng: camera.lng, lat: camera.lat }; }
    getZoom() { return camera.zoom; }
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
      if (eventName === "moveend" && typeof handlerOrLayer === "function") camera.onMove = handlerOrLayer as () => void;
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
      NavigationControl: class MockNavigationControl {},
      ScaleControl: class MockScaleControl {},
      FullscreenControl: class MockFullscreenControl {}
    }
  };
});

describe("MapWorkspace", () => {
  it("updates the external comparison destination after the map moves", async () => {
    render(<MapWorkspace activeLayers={[]} studyArea={(appData as unknown as Phase3ExplorerData).studyArea}
      year={2022} selectedUnitId="" selectionRevision={0} units={[]} onSelectUnit={() => undefined} />);
    await act(async () => undefined);
    fireEvent.click(screen.getByText("Comparar com Google Maps", { exact: true }));
    const link = screen.getByRole("link", { name: /Abrir no Google/ });
    const before = link.getAttribute("href");
    act(() => { camera.lng = -43.35; camera.lat = -22.79; camera.zoom = 19.4; camera.onMove?.(); });
    const url = new URL(link.getAttribute("href")!);
    expect(url.searchParams.get("center")).toBe("-22.7900000,-43.3500000");
    expect(url.searchParams.get("zoom")).toBe("20");
    expect(link.getAttribute("href")).not.toBe(before);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByText(/não acompanha o arrasto automaticamente/)).toBeInTheDocument();
    camera.lng = -43.37; camera.lat = -22.785; camera.zoom = 12;
  });
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
