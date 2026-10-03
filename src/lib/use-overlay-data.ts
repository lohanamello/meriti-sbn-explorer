"use client";
import { useEffect, useState } from "react";
import type { FeatureCollection, Geometry } from "geojson";
import type { EvidenceLayer } from "@/types/phase3";
import { evidenceAssetUrl } from "./evidence-asset";

export function useOverlayData(layers: EvidenceLayer[], year: number) {
  const requests = layers.filter((layer) => !layer.image).map((layer) => ({
    id: layer.id, label: layer.label,
    url: evidenceAssetUrl(layer, year)
  }));
  const requestKey = JSON.stringify(requests);
  const [result, setResult] = useState<{
    key: string; collections: Record<string, FeatureCollection<Geometry>>; errors: string[]
  }>({ key: "", collections: {}, errors: [] });

  useEffect(() => {
    const controller = new AbortController();
    const requested = JSON.parse(requestKey) as typeof requests;
    Promise.allSettled(requested.map(async ({ id, label, url }) => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Falha ao carregar ${label}.`);
      const data = await response.json() as FeatureCollection<Geometry>;
      if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) throw new Error(`Formato inválido em ${label}.`);
      return [id, data] as const;
    })).then((results) => {
      if (controller.signal.aborted) return;
      const collections: Record<string, FeatureCollection<Geometry>> = {};
      const errors: string[] = [];
      results.forEach((entry) => {
        if (entry.status === "fulfilled") collections[entry.value[0]] = entry.value[1];
        else errors.push(entry.reason instanceof Error ? entry.reason.message : "Falha ao carregar camada.");
      });
      setResult({ key: requestKey, collections, errors });
    });
    return () => controller.abort();
  }, [requestKey]);

  const current = result.key === requestKey;
  return {
    collections: current ? result.collections : {},
    errors: current ? result.errors : [],
    loading: !current && requests.length > 0
  };
}
