import type { WizardStep } from '../api/taskBuilder';
import type { CheckCatalog } from './types';

export const WIZARD_STEPS: { id: WizardStep; label: string; hint: string }[] = [
  { id: 'name', label: 'Name', hint: 'Task slug and folder name' },
  { id: 'instruction', label: 'Instruction', hint: 'What the agent should do' },
  { id: 'export', label: 'Export', hint: 'Baseline design snapshot' },
  { id: 'gates', label: 'Gates', hint: 'Hard pass/fail prerequisites' },
  { id: 'checks', label: 'Checks', hint: 'Deterministic tree rules' },
  { id: 'design_system', label: 'Design system', hint: 'Token and style adherence' },
  { id: 'visual', label: 'Visual', hint: 'LLM screenshot judges' },
  { id: 'weights', label: 'Weights', hint: 'Score category balance' },
  { id: 'review', label: 'Review', hint: 'Finalize to Harbor' },
];

export function stepMeta(step: WizardStep) {
  return WIZARD_STEPS.find((s) => s.id === step) ?? { id: step, label: step, hint: '' };
}

const FIELD_LABELS: Record<string, string> = {
  contains: 'Text to find',
  scope: 'Search scope',
  node_id: 'Node',
  case_sensitive: 'Case sensitive',
  required: 'Required for pass',
  image_hash: 'Image hash (optional)',
  parent_id: 'Parent node',
  min: 'Minimum count',
  scope_id: 'Scope root',
  component_id: 'Component',
  min_instances: 'Minimum instances',
  property: 'Property name',
  equals: 'Expected value (JSON)',
  surrounding_context_node_id: 'Context node',
  consistency_criteria: 'Consistency criteria',
  fit_criteria: 'Fit criteria',
  focus: 'Which changes to judge',
  evaluation_instructions: 'Judge instructions',
  reference_asset: 'Reference image file',
  preserve_ids: 'Preserve these node IDs',
  allowed_change_inside_ids: 'Only allow changes inside',
  require_change: 'Require change',
  additions_only: 'Additions only',
  allow_novelty: 'Allow new tokens/styles',
};

const ENUM_LABELS: Record<string, Record<string, string>> = {
  scope: {
    node_id: 'Specific node',
    new_frames: 'New frames only',
  },
  focus: {
    largest_added: 'Largest added frame',
    added: 'All added frames',
    all: 'All changes',
  },
};

export function humanFieldLabel(key: string, catalog?: CheckCatalog, section?: 'checks' | 'visual', type?: string): string {
  if (section && type && catalog) {
    const fields = catalog[section].types[type]?.fields;
    if (fields?.[key]) {
      const firstLine = fields[key].split('.')[0]?.trim();
      if (firstLine) return firstLine;
    }
  }
  const gate = catalog?.gates.fields[key];
  if (gate?.label) return gate.label;
  const ds = catalog?.design_system.fields[key];
  if (ds?.label) return ds.label;
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humanFieldDescription(
  key: string,
  catalog?: CheckCatalog,
  section?: 'checks' | 'visual',
  type?: string
): string | undefined {
  if (section && type && catalog) {
    return catalog[section].types[type]?.fields?.[key];
  }
  const gate = catalog?.gates.fields[key];
  if (gate?.description) return gate.description;
  const ds = catalog?.design_system.fields[key];
  if (ds?.description) return ds.description;
  return undefined;
}

export function humanEnumValue(field: string, value: string): string {
  return ENUM_LABELS[field]?.[value] ?? value.replace(/_/g, ' ');
}

export function humanCheckType(type: string, catalog?: CheckCatalog): { label: string; description: string } {
  const meta = catalog?.checks.types[type];
  return {
    label: meta?.label ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: meta?.description ?? '',
  };
}

export function humanVisualType(type: string, catalog?: CheckCatalog): { label: string; description: string } {
  const meta = catalog?.visual.types[type];
  return {
    label: meta?.label ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: meta?.description ?? '',
  };
}

export function truncateId(id: string, max = 12): string {
  if (id.length <= max) return id;
  return `${id.slice(0, max)}…`;
}
