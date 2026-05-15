import { z } from 'zod';

/** Figma node id: "123:456" or "123-456" */
export const nodeIdPattern = /^$|^(?:-?\d+[:-]-?\d+)$/;

export const nodeIdSchema = z
  .string()
  .regex(nodeIdPattern, 'Invalid node id (expected e.g. "123:456")');

/** Descriptions from tools-and-prompts.md */
export const TOOL_DESCRIPTIONS = {
  get_metadata:
    'Returns a sparse XML representation of your selection containing just basic properties such as the layer IDs, names, types, position and sizes. This is an outline that your Agent can then break down and call get_design_context on to retrieve only the styling information of the design it needs. Useful for very large designs where get_design_context produces output with a large context size. It also works with multiple selections or the whole page if you don\'t select anything.',

  get_screenshot:
    'Allows the agent to take a screenshot of your selection. This helps preserve layout fidelity in the generated code. Recommended to keep on (only turn off if you\'re concerned about token limits).',

  get_variable_defs:
    'Returns the variables and styles used in your Figma selection (such as colors, spacing, typography).',

  search_design_system:
    'Searches across all connected design libraries to find components, variables, and styles matching a text query. Returns matching assets so the agent can reuse existing design system elements rather than creating new ones from scratch.',

  use_figma:
    'The general-purpose tool for writing to Figma files. Use it to create, edit, delete, or inspect objects in Figma Design files and FigJam boards. In Figma Design files, use_figma can be used to work with pages, frames, components, variants, variables, styles, text, images, and more. In FigJam, it can be used to work with boards and objects like stickies, sections, connectors, shapes, tables, and code blocks. When relevant, the agent will first check your design system or existing file content before creating anything from scratch.',
} as const;

export const getMetadataInputSchema = {
  fileKey: z.string().min(1),
  nodeId: nodeIdSchema.optional(),
  clientLanguages: z.string().optional(),
  clientFrameworks: z.string().optional(),
};

export const getScreenshotInputSchema = {
  fileKey: z.string().min(1),
  nodeId: nodeIdSchema,
  contentsOnly: z.boolean().optional(),
  enableBase64Response: z.boolean().optional().default(false),
  maxDimension: z.number().int().positive().max(65536).optional().default(1024),
};

export const getVariableDefsInputSchema = {
  fileKey: z.string().min(1),
  nodeId: nodeIdSchema,
  clientLanguages: z.string().optional(),
  clientFrameworks: z.string().optional(),
};

export const searchDesignSystemInputSchema = {
  query: z.string(),
  fileKey: z.string().min(1),
  disableCodeConnect: z.boolean().optional(),
  includeComponents: z.boolean().optional().default(true),
  includeVariables: z.boolean().optional().default(true),
  includeStyles: z.boolean().optional().default(true),
  includeLibraryKeys: z.array(z.string()).optional(),
};

export const useFigmaInputSchema = {
  fileKey: z.string().min(1),
  code: z.string().min(1).max(50_000),
  description: z.string().min(1).max(2000),
  skillNames: z.string().optional(),
};
