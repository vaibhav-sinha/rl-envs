import type { MetadataPageIndexEntry } from '../../mcp/metadata.js';

export type PreviewShellParams = {
  fileName: string;
  pages: MetadataPageIndexEntry[];
  currentPageId: string | null;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const TOOLBAR_STYLES = `
#hfc-preview-toolbar{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:100000;display:flex;align-items:center;gap:.75rem;padding:.5rem 1rem;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:.8125rem;background:#161922;border:1px solid #2a2f3a;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,.4);color:#e8eaef}
#hfc-preview-toolbar label{color:#8b93a7;font-weight:500}
#hfc-preview-toolbar select{padding:.25rem .5rem;font-size:.8125rem;color:#e8eaef;background:#1f2430;border:1px solid #3a4150;border-radius:4px;min-width:10rem}
#hfc-preview-toolbar select:focus{outline:none;border-color:#5b8def}
#hfc-preview-toolbar .file-name{color:#b4bac8;font-family:ui-monospace,Consolas,monospace}
`;

function buildToolbarHtml(params: PreviewShellParams): string {
  const pageOptions =
    params.pages.length === 0
      ? '<option value="">No pages</option>'
      : params.pages
          .map(
            (p) =>
              `<option value="${escapeHtml(p.id)}"${p.id === params.currentPageId ? ' selected' : ''}>${escapeHtml(p.name)}</option>`
          )
          .join('');

  return `<div id="hfc-preview-toolbar">
<style>${TOOLBAR_STYLES}</style>
<span class="file-name">${escapeHtml(params.fileName)}</span>
<label for="hfc-page-select">Page</label>
<select id="hfc-page-select" aria-label="Select page">${pageOptions}</select>
<script>
(function(){
  var sel=document.getElementById('hfc-page-select');
  if(!sel)return;
  sel.addEventListener('change',function(){
    var id=sel.value;
    if(!id)return;
    location.assign('/preview?pageId='+encodeURIComponent(id));
  });
})();
</script>
</div>`;
}

/** Wrap compiled design HTML with a floating page selector toolbar. */
export function wrapPreviewWithToolbar(compiledHtml: string, params: PreviewShellParams): string {
  const toolbar = buildToolbarHtml(params);
  const idx = compiledHtml.lastIndexOf('</body>');
  if (idx >= 0) {
    return compiledHtml.slice(0, idx) + toolbar + compiledHtml.slice(idx);
  }
  return compiledHtml + toolbar;
}

/** Minimal HTML shell for empty/error preview states. */
export function previewEmptyShell(innerBodyHtml: string, params: PreviewShellParams): string {
  const toolbar = buildToolbarHtml(params);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(params.fileName)} — preview</title>
</head>
<body style="margin:24px;font-family:system-ui,-apple-system,sans-serif;background:#0f1117;color:#e8eaef">
${toolbar}
${innerBodyHtml}
</body>
</html>`;
}
