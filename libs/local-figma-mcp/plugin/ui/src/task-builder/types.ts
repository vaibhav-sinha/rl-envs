export interface CatalogFieldMeta {
  label?: string;
  description: string;
}

export interface CatalogCheckType {
  label: string;
  description: string;
  fields?: Record<string, string>;
}

export interface NoveltyPropertyMeta {
  key: string;
  label: string;
  description: string;
}

export interface NoveltyCategoryMeta {
  id: 'text' | 'frames';
  label: string;
  description: string;
  properties: NoveltyPropertyMeta[];
}

export type AllowNoveltyText = Record<string, boolean>;
export type AllowNoveltyFrames = Record<string, boolean>;

export interface AllowNoveltyConfig {
  text: AllowNoveltyText;
  frames: AllowNoveltyFrames;
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
    novelty_categories?: NoveltyCategoryMeta[];
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
  category_importance: {
    title: string;
    description: string;
    defaults: Record<string, number>;
  };
  heuristics: {
    title: string;
    description: string;
  };
  screenshot: {
    title: string;
    description: string;
    fields: Record<string, CatalogFieldMeta & { label: string }>;
    strategies: Record<string, string>;
  };
}
