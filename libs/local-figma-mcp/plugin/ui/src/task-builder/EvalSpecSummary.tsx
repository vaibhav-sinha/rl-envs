import { useState } from 'react';
import type { EvalSpec } from '../api/taskBuilder';
import {
  humanCheckType,
  humanEnumValue,
  humanMetadataType,
  humanVisualType,
  truncateId,
} from './catalog-helpers';
import type { CheckCatalog } from './types';

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[10px] leading-snug">
      <span className="text-muted shrink-0 w-[88px]">{label}</span>
      <span className="text-foreground break-all">{value}</span>
    </div>
  );
}

function formatCheckDetails(c: Record<string, unknown>, catalog: CheckCatalog | null): string[] {
  const type = String(c.type);
  const lines: string[] = [];
  if (type === 'must_contain_text') {
    if (c.contains) lines.push(`Text: “${String(c.contains)}”`);
    if (c.scope) lines.push(`Scope: ${humanEnumValue('scope', String(c.scope))}`);
    if (c.scope === 'node_id' && c.node_id) lines.push(`Node: ${truncateId(String(c.node_id), 20)}`);
  }
  if (type === 'must_contain_image') {
    if (c.scope) lines.push(`Scope: ${humanEnumValue('scope', String(c.scope))}`);
    if (c.node_id) lines.push(`Node: ${truncateId(String(c.node_id), 20)}`);
    if (c.image_hash) lines.push(`Image hash: ${String(c.image_hash)}`);
  }
  if (type === 'min_added_under' || type === 'min_modified_under') {
    if (c.parent_id) lines.push(`Under: ${truncateId(String(c.parent_id), 20)}`);
    if (c.min != null) lines.push(`Minimum: ${String(c.min)}`);
  }
  if (type === 'component_instances_under') {
    if (c.scope_id) lines.push(`Scope: ${truncateId(String(c.scope_id), 20)}`);
    if (c.component_id) lines.push(`Component: ${truncateId(String(c.component_id), 20)}`);
    if (c.min_instances != null) lines.push(`Min instances: ${String(c.min_instances)}`);
  }
  if (type === 'metadata_only_under' && c.parent_id) {
    lines.push(`Subtree: ${truncateId(String(c.parent_id), 20)}`);
  }
  if (type === 'property_on_node') {
    if (c.node_id) lines.push(`Node: ${truncateId(String(c.node_id), 20)}`);
    if (c.property) lines.push(`Property: ${String(c.property)}`);
    if (c.equals !== undefined) lines.push(`Equals: ${JSON.stringify(c.equals)}`);
  }
  if (c.required === false) lines.push('Optional (failure allowed)');
  else lines.push('Required');
  return lines;
}

function formatVisualDetails(
  v: Record<string, unknown>,
  catalog: CheckCatalog | null,
  taskInstruction?: string
): string[] {
  const type = String(v.type);
  const lines: string[] = [];
  if (type === 'task_completeness') {
    lines.push(taskInstruction?.trim() ? 'Uses saved agent instruction' : '⚠ No agent instruction yet');
    const extra = String(v.evaluation_instructions ?? '').trim();
    if (extra) lines.push(`Extra judge notes: ${extra.slice(0, 120)}${extra.length > 120 ? '…' : ''}`);
    else lines.push('No extra judge instructions');
    if (v.node_id) lines.push(`Focus node: ${truncateId(String(v.node_id), 20)}`);
  }
  if (type === 'good_design') {
    lines.push('Built-in design quality rubric (largest change region)');
  }
  if (type === 'design_consistency') {
    if (v.reference_asset) lines.push(`Reference: ${String(v.reference_asset)}`);
    const criteria = v.criteria as string[] | undefined;
    if (criteria?.length) lines.push(`${criteria.length} criterion(s)`);
  }
  if (type === 'design_fit') {
    if (v.node_id) lines.push(`Node: ${truncateId(String(v.node_id), 20)}`);
    if (v.evaluation_prompt) lines.push('Custom evaluation prompt');
  }
  if (type === 'design_preference' && v.reference_asset) {
    lines.push(`Reference: ${String(v.reference_asset)}`);
  }
  return lines;
}

export function EvalSpecSummary({
  spec,
  catalog,
  taskInstruction,
  defaultExpanded = false,
}: {
  spec: EvalSpec | null;
  catalog: CheckCatalog | null;
  taskInstruction?: string;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  if (!spec) return null;

  const gates = spec.gates ?? {};
  const checks = spec.checks ?? [];
  const visual = spec.visual ?? [];
  const metadataChecks = spec.metadata_checks ?? [];
  const importance =
    spec.category_importance ??
    (spec.weights
      ? Object.fromEntries(
          Object.entries(spec.weights).filter(([k]) => k !== 'gates')
        )
      : {});
  const gateEntries = Object.entries(gates).filter(([, v]) => {
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  });

  const summaryParts: string[] = [];
  if (gateEntries.length) summaryParts.push(`${gateEntries.length} gate(s)`);
  if (checks.length) summaryParts.push(`${checks.length} check(s)`);
  if (visual.length) summaryParts.push(`${visual.length} visual(s)`);
  if (metadataChecks.length) summaryParts.push(`${metadataChecks.length} metadata`);

  return (
    <div className="rounded-md border border-[#3a3a3a] bg-[#1e1e1e] overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left hover:bg-[#252525] transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="text-[11px] font-semibold text-foreground">Eval overview</span>
        <span className="text-[10px] text-muted">
          {summaryParts.length ? summaryParts.join(' · ') : 'Empty'}
          <span className="ml-1.5 opacity-70">{expanded ? '▾' : '▸'}</span>
        </span>
      </button>

      {expanded ? (
        <div className="px-2.5 pb-2.5 space-y-3 border-t border-[#333]">
          <section>
            <p className="text-[10px] font-semibold text-foreground m-0 mb-1">
              {catalog?.gates.title ?? 'Gates'}
            </p>
            {gateEntries.length === 0 ? (
              <p className="text-[10px] text-muted m-0">No gates configured.</p>
            ) : (
              <ul className="m-0 pl-3 space-y-1 list-disc text-[10px] text-foreground">
                {gates.require_change ? (
                  <li>
                    {catalog?.gates.fields.require_change?.label ?? 'Require change'} — document must differ
                    from baseline
                  </li>
                ) : null}
                {Array.isArray(gates.preserve_ids) && gates.preserve_ids.length > 0 ? (
                  <li>
                    Preserve {gates.preserve_ids.length} node ID(s):{' '}
                    {(gates.preserve_ids as string[]).map((id) => truncateId(id)).join(', ')}
                  </li>
                ) : null}
                {Array.isArray(gates.allowed_change_inside_ids) &&
                gates.allowed_change_inside_ids.length > 0 ? (
                  <li>
                    Changes only inside {(gates.allowed_change_inside_ids as string[]).length} subtree(s)
                  </li>
                ) : null}
                {gates.no_detached_nodes ? (
                  <li>
                    {catalog?.gates.fields.no_detached_nodes?.label ?? 'No detached nodes'}
                  </li>
                ) : null}
                {gates.additions_only ? (
                  <li>{catalog?.gates.fields.additions_only?.label ?? 'Additions only'}</li>
                ) : null}
              </ul>
            )}
          </section>

          <section>
            <p className="text-[10px] font-semibold text-foreground m-0 mb-1">
              {catalog?.checks.title ?? 'Checks'} ({checks.length})
            </p>
            {checks.length === 0 ? (
              <p className="text-[10px] text-muted m-0">No deterministic checks yet.</p>
            ) : (
              <div className="space-y-2">
                {checks.map((c, i) => {
                  const { label } = humanCheckType(String(c.type), catalog ?? undefined);
                  const details = formatCheckDetails(c, catalog);
                  return (
                    <div
                      key={String(c.id)}
                      className="rounded border border-[#333] bg-[#252525] px-2 py-1.5"
                    >
                      <p className="text-[10px] font-medium m-0 text-foreground">
                        {i + 1}. {label}
                      </p>
                      {details.map((d) => (
                        <p key={d} className="text-[10px] text-muted m-0 mt-0.5">
                          {d}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <p className="text-[10px] font-semibold text-foreground m-0 mb-1">
              {catalog?.visual.title ?? 'Visual'} ({visual.length})
            </p>
            {visual.length === 0 ? (
              <p className="text-[10px] text-muted m-0">No LLM visual checks yet.</p>
            ) : (
              <div className="space-y-2">
                {visual.map((v, i) => {
                  const { label } = humanVisualType(String(v.type), catalog ?? undefined);
                  const details = formatVisualDetails(v, catalog, taskInstruction);
                  return (
                    <div
                      key={String(v.id)}
                      className="rounded border border-[#333] bg-[#252525] px-2 py-1.5"
                    >
                      <p className="text-[10px] font-medium m-0 text-foreground">
                        {i + 1}. {label}
                      </p>
                      {details.map((d) => (
                        <p key={d} className="text-[10px] text-muted m-0 mt-0.5">
                          {d}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <p className="text-[10px] font-semibold text-foreground m-0 mb-1">
              {catalog?.metadata_checks?.title ?? 'Metadata'} ({metadataChecks.length})
            </p>
            {metadataChecks.length === 0 ? (
              <p className="text-[10px] text-muted m-0">No metadata LLM checks.</p>
            ) : (
              <div className="space-y-2">
                {metadataChecks.map((m, i) => {
                  const { label } = humanMetadataType(String(m.type), catalog ?? undefined);
                  return (
                    <div
                      key={String(m.id)}
                      className="rounded border border-[#333] bg-[#252525] px-2 py-1.5"
                    >
                      <p className="text-[10px] font-medium m-0 text-foreground">
                        {i + 1}. {label}
                      </p>
                      {String(m.type) === 'diff' ? (
                        <p className="text-[10px] text-muted m-0 mt-0.5">Textual diff only</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {spec.design_system ? (
            <section>
              <DetailRow
                label="Design system"
                value={
                  spec.design_system.allow_novelty
                    ? 'New tokens/styles allowed'
                    : 'Strict token adherence'
                }
              />
            </section>
          ) : null}

          {spec.screenshot ? (
            <section>
              <p className="text-[10px] font-semibold text-foreground m-0 mb-1">
                {catalog?.screenshot?.title ?? 'Screenshot'}
              </p>
              <DetailRow
                label="Strategy"
                value={humanEnumValue('strategy', spec.screenshot.strategy ?? 'auto')}
              />
              {spec.screenshot.under ? (
                <DetailRow label="Under" value={truncateId(spec.screenshot.under, 24)} />
              ) : null}
              {spec.screenshot.composite ? (
                <DetailRow label="Composite" value="Enabled for auto step 5" />
              ) : null}
              {spec.screenshot.node_ids?.length ? (
                <DetailRow
                  label="Nodes"
                  value={spec.screenshot.node_ids.map((id) => truncateId(id)).join(', ')}
                />
              ) : null}
            </section>
          ) : null}

          {Object.keys(importance).length > 0 ? (
            <section>
              <p className="text-[10px] font-semibold text-foreground m-0 mb-1">Category importance</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(importance).map(([k, v]) => (
                  <span
                    key={k}
                    className="text-[9px] rounded bg-[#333] px-1.5 py-0.5 text-muted capitalize"
                  >
                    {k.replace(/_/g, ' ')}: {Math.round(Number(v) * 100)}%
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
