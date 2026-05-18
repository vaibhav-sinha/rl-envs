/** SME-facing descriptions for eval spec fields (shown in the Task Builder UI). */

export const CHECK_CATALOG = {
  gates: {
    title: 'Gates',
    description:
      'Hard prerequisites evaluated before scoring. If any required gate fails, the final score is zero.',
    fields: {
      require_change: {
        label: 'Require change',
        description: 'Fail if the agent leaves the document identical to the baseline.',
      },
      preserve_ids: {
        label: 'Preserve node IDs',
        description: 'Listed nodes must still exist in the result with the same ID.',
      },
      allowed_change_inside_ids: {
        label: 'Allowed change inside',
        description: 'Only subtrees under these node IDs may change; changes elsewhere fail the gate.',
      },
      additions_only: {
        label: 'Additions only',
        description: 'No modifications or deletions — only new nodes may be added.',
      },
    },
  },
  checks: {
    title: 'Deterministic checks',
    description:
      'Structural checks on the design tree diff (before vs after). Each check produces a pass/fail subscore.',
    types: {
      must_contain_text: {
        label: 'Must contain text',
        description: 'Descendants in scope must include the given substring.',
        fields: {
          contains: 'Text substring to find.',
          scope: 'Search under a specific node_id or only in newly added frames.',
          node_id: 'Root node for scope node_id.',
          case_sensitive: 'Match case exactly when enabled.',
          required: 'When false, failure does not block completion gate.',
        },
      },
      must_contain_image: {
        label: 'Must contain image',
        description: 'Scope must include an image fill (optionally a specific image hash).',
        fields: {
          scope: 'node_id or new_frames.',
          node_id: 'Root for node_id scope.',
          image_hash: 'Optional specific image hash.',
          required: 'Required for completion gate when true.',
        },
      },
      min_added_under: {
        label: 'Min added under',
        description: 'At least N new nodes must appear under parent_id.',
        fields: {
          parent_id: 'Parent node ID.',
          min: 'Minimum count of added descendants.',
          required: 'Required for completion gate when true.',
        },
      },
      min_modified_under: {
        label: 'Min modified under',
        description: 'At least N modified nodes under parent_id.',
        fields: {
          parent_id: 'Parent node ID.',
          min: 'Minimum modified count.',
          required: 'Required for completion gate when true.',
        },
      },
      component_instances_under: {
        label: 'Component instances',
        description: 'Minimum instances of a component under scope_id.',
        fields: {
          scope_id: 'Subtree root.',
          component_id: 'Main component node ID.',
          min_instances: 'Minimum instance count.',
          required: 'Required for completion gate when true.',
        },
      },
      metadata_only_under: {
        label: 'Metadata only under',
        description: 'Changes under parent_id must be metadata-only (name, plugin data, etc.).',
        fields: {
          parent_id: 'Subtree root.',
          required: 'Required for completion gate when true.',
        },
      },
      property_on_node: {
        label: 'Property on node',
        description: 'A node property must equal an expected value (e.g. name rename).',
        fields: {
          node_id: 'Target node.',
          property: 'Property key (e.g. name).',
          equals: 'Expected JSON value.',
          required: 'Required for completion gate when true.',
        },
      },
    },
  },
  design_system: {
    title: 'Design system',
    description:
      'Token and style adherence on new/changed content. Always evaluated; configure allow_novelty only.',
    fields: {
      allow_novelty: {
        label: 'Allow novelty',
        description: 'When false, new colors/fonts outside baseline allowlists reduce the score.',
      },
    },
  },
  visual: {
    title: 'Visual (LLM) checks',
    description:
      'Screenshot-based checks using an LLM judge. Skipped when EVAL_SKIP_LLM=1 in the verifier container.',
    types: {
      design_consistency: {
        label: 'Design consistency',
        description: 'Judge whether added/changed UI fits surrounding context.',
        fields: {
          node_id: 'Focus node for screenshot.',
          surrounding_context_node_id: 'Wider context crop.',
          consistency_criteria: 'Custom consistency bullets.',
          fit_criteria: 'Custom fit bullets.',
          focus: 'Which added nodes to emphasize.',
        },
      },
      task_completeness: {
        label: 'Task completeness',
        description: 'Whether the design satisfies the task instruction.',
        fields: {
          node_id: 'Optional focus node.',
          evaluation_instructions: 'Extra judge instructions.',
        },
      },
      before_vs_after: {
        label: 'Before vs after',
        description: 'Compare baseline and result around a context node.',
        fields: {
          surrounding_context_node_id: 'Context region for both screenshots.',
        },
      },
      diff: {
        label: 'Diff summary',
        description: 'Textual diff summary sent to the LLM (no images).',
      },
      compare_with_reference: {
        label: 'Compare with reference',
        description: 'Compare result screenshot to a reference image in task assets.',
        fields: {
          reference_asset: 'Filename under environment/assets/.',
        },
      },
    },
  },
  weights: {
    title: 'Category weights',
    description: 'Relative weights for gates, checks, design_system, visual, and heuristics when aggregating.',
    defaults: {
      gates: 1.0,
      checks: 0.35,
      design_system: 0.2,
      visual: 0.35,
      heuristics: 0.1,
    },
  },
  heuristics: {
    title: 'Heuristics',
    description:
      'Always-on checks: contrast, font count, readable font size. Not configurable in eval-spec.',
  },
} as const;
