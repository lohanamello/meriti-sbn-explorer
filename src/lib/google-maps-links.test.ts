import { describe, expect, it } from "vitest";
import { googleSatelliteUrl, googleStreetViewUrl } from "./google-maps-links";

describe("official Google Maps URLs", () => {
  const view = { longitude: -43.3472292, latitude: -22.7907572, zoom: 20 };
  it("uses latitude first and compensates the 512/256 world scale", () => {
    const url = new URL(googleSatelliteUrl({ ...view, zoom: 16 }));
    expect(url.origin).toBe("https://www.google.com");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("center")).toBe("-22.7907572,-43.3472292");
    expect(url.searchParams.get("zoom")).toBe("17");
    expect(url.searchParams.get("basemap")).toBe("satellite");
  });
  it("respects the supported maximum Google URL zoom", () => {
    expect(new URL(googleSatelliteUrl({ ...view, zoom: 22 })).searchParams.get("zoom")).toBe("21");
  });
  it("requests a nearby panorama without inventing a panorama ID", () => {
    const url = new URL(googleStreetViewUrl(view));
    expect(url.searchParams.get("map_action")).toBe("pano");
    expect(url.searchParams.get("viewpoint")).toBe("-22.7907572,-43.3472292");
    expect(url.searchParams.has("pano")).toBe(false);
  });
});
