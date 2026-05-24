/** Granular allow-novelty categories (maps to TokenRole in verifier). */

export type NoveltyTextKey = 'color' | 'font_size' | 'font_family' | 'font_weight';

export type NoveltyFramesKey =
  | 'fill'
  | 'background'
  | 'stroke_color'
  | 'stroke_width'
  | 'corner_radius'
  | 'effects'
  | 'item_spacing'
  | 'counter_axis_spacing'
  | 'padding'
  | 'layout_grid';

export type AllowNoveltyText = Record<NoveltyTextKey, boolean>;
export type AllowNoveltyFrames = Record<NoveltyFramesKey, boolean>;

export interface AllowNoveltyConfig {
  text: AllowNoveltyText;
  frames: AllowNoveltyFrames;
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

export const NOVELTY_CATEGORIES: NoveltyCategoryMeta[] = [
  {
    id: 'text',
    label: 'Text',
    description: 'Typography tokens on text nodes.',
    properties: [
      { key: 'color', label: 'Color', description: 'Text fill / color.' },
      { key: 'font_size', label: 'Font size', description: 'Font size in px.' },
      { key: 'font_family', label: 'Font family', description: 'Typeface family and style.' },
      { key: 'font_weight', label: 'Font weight', description: 'Font weight.' },
    ],
  },
  {
    id: 'frames',
    label: 'Frames',
    description: 'Paint, stroke, layout, and effects on frames and shapes.',
    properties: [
      { key: 'fill', label: 'Fill', description: 'Node fill paints.' },
      { key: 'background', label: 'Background', description: 'Frame background paints.' },
      { key: 'stroke_color', label: 'Border color', description: 'Stroke paints.' },
      { key: 'stroke_width', label: 'Border width', description: 'Stroke weight.' },
      { key: 'corner_radius', label: 'Corner radius', description: 'Corner radius values.' },
      { key: 'effects', label: 'Effects', description: 'Drop shadow, blur, etc.' },
      { key: 'item_spacing', label: 'Item spacing', description: 'Auto-layout main-axis gap.' },
      {
        key: 'counter_axis_spacing',
        label: 'Counter-axis spacing',
        description: 'Auto-layout cross-axis gap.',
      },
      { key: 'padding', label: 'Padding', description: 'Auto-layout padding on all sides.' },
      { key: 'layout_grid', label: 'Layout grid', description: 'Layout grid definitions.' },
    ],
  },
];

const TEXT_KEYS = NOVELTY_CATEGORIES[0].properties.map((p) => p.key) as NoveltyTextKey[];
const FRAMES_KEYS = NOVELTY_CATEGORIES[1].properties.map((p) => p.key) as NoveltyFramesKey[];

function buildCategory<T extends string>(keys: T[], enabled: boolean): Record<T, boolean> {
  return Object.fromEntries(keys.map((k) => [k, enabled])) as Record<T, boolean>;
}

export function allNoveltyEnabled(): AllowNoveltyConfig {
  return {
    text: buildCategory(TEXT_KEYS, true),
    frames: buildCategory(FRAMES_KEYS, true),
  };
}

export function allNoveltyDisabled(): AllowNoveltyConfig {
  return {
    text: buildCategory(TEXT_KEYS, false),
    frames: buildCategory(FRAMES_KEYS, false),
  };
}

export function isNoveltyMasterOn(config: AllowNoveltyConfig | undefined): boolean {
  if (!config) return false;
  for (const cat of NOVELTY_CATEGORIES) {
    const section = config[cat.id];
    for (const prop of cat.properties) {
      if (section[prop.key as keyof typeof section]) return true;
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

/** Human-readable labels for enabled novelty properties. */
export function enabledNoveltyLabels(config: AllowNoveltyConfig | undefined): string[] {
  if (!config) return [];
  const labels: string[] = [];
  for (const cat of NOVELTY_CATEGORIES) {
    const section = config[cat.id];
    for (const prop of cat.properties) {
      if (section[prop.key as keyof typeof section]) {
        labels.push(prop.label);
      }
    }
  }
  return labels;
}
