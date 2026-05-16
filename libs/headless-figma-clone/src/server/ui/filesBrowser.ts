export type FilesBrowserEntry = {
  filePath: string;
  fileKey: string;
  fileName: string;
  active: boolean;
  viewUrl: string;
};

export type FilesBrowserParams = {
  workspaceDir: string;
  files: FilesBrowserEntry[];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SHARED_STYLES = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;height:100%;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0f1117;color:#e8eaef}
body{display:flex;flex-direction:column;min-height:100vh}
.header{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding:.75rem 1.25rem;border-bottom:1px solid #2a2f3a;background:#161922}
.header h1{margin:0;font-size:1.125rem;font-weight:600}
.subtitle{margin:.25rem 0 0;font-size:.8125rem;color:#8b93a7;font-family:ui-monospace,Consolas,monospace}
main{flex:1;padding:1.25rem;overflow:auto}
.empty{color:#8b93a7;font-size:.9375rem}
.file-table{width:100%;border-collapse:collapse;font-size:.875rem}
.file-table th{text-align:left;padding:.5rem .75rem;font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#8b93a7;background:#12151c;border-bottom:1px solid #2a2f3a}
.file-table td{padding:.625rem .75rem;border-bottom:1px solid #2a2f3a;vertical-align:middle}
.file-table tr:hover td{background:#161922}
.file-name{font-weight:500}
.file-path{display:block;margin-top:.125rem;font-size:.75rem;color:#8b93a7;font-family:ui-monospace,Consolas,monospace;word-break:break-all}
.badge{display:inline-block;padding:.125rem .5rem;font-size:.6875rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;border-radius:4px;background:#1f2430;border:1px solid #3a4150;color:#8b93a7}
.badge-active{background:#1a2a3d;border-color:#5b8def;color:#8bb4f0}
.btn{display:inline-block;padding:.375rem .75rem;font-size:.8125rem;font-weight:500;color:#e8eaef;background:#1f2430;border:1px solid #3a4150;border-radius:4px;text-decoration:none;cursor:pointer}
.btn:hover{background:#2a3142;border-color:#4a5568}
`;

export function renderFilesBrowserHtml(params: FilesBrowserParams): string {
  const rows =
    params.files.length === 0
      ? '<p class="empty">No .hfc.json files in the workspace yet.</p>'
      : `<table class="file-table">
<thead><tr><th>File</th><th>Status</th><th></th></tr></thead>
<tbody>
${params.files
  .map(
    (f) => `<tr>
<td class="file-name">${escapeHtml(f.fileName)}<span class="file-path">${escapeHtml(f.filePath)}</span></td>
<td>${f.active ? '<span class="badge badge-active">Active</span>' : '<span class="badge">—</span>'}</td>
<td><a class="btn" href="${escapeHtml(f.viewUrl)}" target="_blank" rel="noopener">View</a></td>
</tr>`
  )
  .join('\n')}
</tbody>
</table>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>headless-figma-clone — Files</title>
<style>${SHARED_STYLES}</style>
</head>
<body>
<header class="header">
<div>
<h1>Workspace files</h1>
<p class="subtitle">${escapeHtml(params.workspaceDir)}</p>
</div>
</header>
<main>
${rows}
</main>
</body>
</html>`;
}
