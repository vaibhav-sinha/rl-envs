export interface CatalogFieldMeta {
  label?: string;
  description: string;
}

export interface CatalogCheckType {
  label: string;
  description: string;
  fields?: Record<string, string>;
}

export interface CheckCatalog {
  gates: {
    title: string;
    description: string;
    fields: Record<string, CatalogFieldMeta & { label: string }>;
  };
  checks: {
    title: string;
    description: string;
    types: Record<string, CatalogCheckType>;
  };
  design_system: {
    title: string;
    description: string;
    fields: Record<string, CatalogFieldMeta & { label: string }>;
  };
  visual: {
    title: string;
    description: string;
    types: Record<string, CatalogCheckType>;
  };
  metadata_checks: {
    title: string;
    description: string;
    types: Record<string, CatalogCheckType>;
  };
  weights: {
    title: string;
    description: string;
    defaults: Record<string, number>;
  };
  heuristics: {
    title: string;
    description: string;
  };
}
