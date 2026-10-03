import maplibregl from "maplibre-gl";

export function featurePopup(properties: Record<string, unknown>, coordinates: [number, number]) {
  const content = document.createElement("article");
  content.className = "map-feature-popup";
  const heading = document.createElement("h3");
  heading.textContent = String(properties.name ?? "Feição cartográfica");
  content.appendChild(heading);
  for (const key of ["category", "sourceDate", "legalAct", "geometryMethod"]) {
    if (properties[key]) {
      const paragraph = document.createElement("p");
      paragraph.textContent = String(properties[key]);
      content.appendChild(paragraph);
    }
  }
  if (typeof properties.registeredAreaHa === "number") {
    const area = document.createElement("p");
    area.textContent = `Área cadastrada: ${properties.registeredAreaHa.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ha`;
    content.appendChild(area);
  }
  if (typeof properties.sourceUrl === "string" && /^https:\/\//.test(properties.sourceUrl)) {
    const link = document.createElement("a");
    link.href = properties.sourceUrl;
    link.textContent = "Consultar fonte original";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    content.appendChild(link);
  }
  return new maplibregl.Popup({ anchor: "bottom", offset: 18, maxWidth: "310px" }).setLngLat(coordinates).setDOMContent(content);
}

export function showFeaturePopup(map: maplibregl.Map, popup: maplibregl.Popup) {
  const viewport = map.getContainer().getBoundingClientRect();
  popup.setMaxWidth(`${Math.min(310, viewport.width - 32)}px`).addTo(map);
  const content = popup.getElement().querySelector<HTMLElement>(".maplibregl-popup-content");
  if (content) {
    content.style.maxHeight = `${Math.min(300, viewport.height - 120)}px`;
    content.style.overflowY = "auto";
  }
  popup.setLngLat(popup.getLngLat());
  const bounds = popup.getElement().getBoundingClientRect();
  const dx = bounds.left < viewport.left + 16 ? bounds.left - viewport.left - 16
    : bounds.right > viewport.right - 16 ? bounds.right - viewport.right + 16 : 0;
  const dy = bounds.top < viewport.top + 16 ? bounds.top - viewport.top - 16
    : bounds.bottom > viewport.bottom - 90 ? bounds.bottom - viewport.bottom + 90 : 0;
  if (dx || dy) map.panBy([dx, dy], { duration: 200 });
}
