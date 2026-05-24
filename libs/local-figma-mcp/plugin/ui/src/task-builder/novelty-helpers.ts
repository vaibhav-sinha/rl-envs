import type { AllowNoveltyConfig, CheckCatalog, NoveltyCategoryMeta } from './types';

function categories(catalog: CheckCatalog): NoveltyCategoryMeta[] {
  return catalog.design_system.novelty_categories ?? [];
}

export function buildNoveltyConfig(
  catalog: CheckCatalog,
  enabled: boolean
): AllowNoveltyConfig {
  const config = {} as AllowNoveltyConfig;
  for (const cat of categories(catalog)) {
    const section: Record<string, boolean> = {};
    for (const prop of cat.properties) {
      section[prop.key] = enabled;
    }
    config[cat.id] = section as AllowNoveltyConfig['text'] & AllowNoveltyConfig['frames'];
  }
  return config;
}

export function isNoveltyMasterOn(config: AllowNoveltyConfig | undefined): boolean {
  if (!config) return false;
  for (const catId of ['text', 'frames'] as const) {
    const section = config[catId];
    if (!section) continue;
    for (const val of Object.values(section)) {
      if (val) return true;
    }
  }
  return false;
}

export function setNoveltyProperty(
  config: AllowNoveltyConfig,
  category: 'text' | 'frames',
  key: string,
  enabled: boolean
): AllowNoveltyConfig {
  return {
    ...config,
    [category]: { ...config[category], [key]: enabled },
  };
}

export function enabledNoveltyLabels(
  config: AllowNoveltyConfig | undefined,
  catalog: CheckCatalog | null
): string[] {
  if (!config || !catalog) return [];
  const labels: string[] = [];
  for (const cat of categories(catalog)) {
    const section = config[cat.id];
    if (!section) continue;
    for (const prop of cat.properties) {
      if (section[prop.key as keyof typeof section]) {
        labels.push(prop.label);
      }
    }
  }
  return labels;
}
