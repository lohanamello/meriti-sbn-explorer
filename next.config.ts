import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/validacao": ["./data/processed/meriti/validation/sample-cells-blinded.geojson", "./data/interim/meriti/independent-reference-audit/esri-cell-metadata.json"],
    "/api/validacao/*": ["./data/processed/meriti/validation/review-blinded-v3.csv", "./data/processed/meriti/validation/sample-cells-blinded.geojson", "./docs/methodology/meriti-vegetation-validation-plan.md", "./docs/methodology/meriti-validation-reference-audit.md", "./docs/methodology/meriti-vegetation-field-evidence.md"],
    "/api/bairros/metodologia": ["./docs/methodology/meriti-neighborhoods-research.md"],
    "/api/metodologia": ["./docs/methodology/meriti.md"]
  }
};

export default nextConfig;
