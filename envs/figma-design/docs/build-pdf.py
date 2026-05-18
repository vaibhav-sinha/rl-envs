"""Convert technical-report.md into technical-report.pdf using markdown-it + Playwright."""

from __future__ import annotations

import sys
from pathlib import Path

from markdown_it import MarkdownIt
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
MD = HERE / "technical-report.md"
PDF = HERE / "technical-report.pdf"

CSS = """
@page { size: Letter; margin: 0.75in; }
* { box-sizing: border-box; }
html, body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter",
    Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.55;
  color: #1f2328;
  margin: 0;
  padding: 0;
}
h1 {
  font-size: 22pt;
  font-weight: 700;
  margin: 0 0 0.2em 0;
  letter-spacing: -0.01em;
  color: #0b1220;
  border-bottom: 2px solid #0b1220;
  padding-bottom: 0.25em;
}
h2 {
  font-size: 15pt;
  font-weight: 700;
  color: #0b1220;
  margin: 1.6em 0 0.4em 0;
  padding-bottom: 0.15em;
  border-bottom: 1px solid #d0d7de;
  page-break-after: avoid;
}
h3 {
  font-size: 12pt;
  font-weight: 700;
  color: #0b1220;
  margin: 1.1em 0 0.3em 0;
  page-break-after: avoid;
}
h4 {
  font-size: 11pt;
  font-weight: 700;
  color: #0b1220;
  margin: 0.9em 0 0.25em 0;
}
p { margin: 0.45em 0; }
ul, ol { margin: 0.4em 0 0.6em 1.4em; padding: 0; }
li { margin: 0.2em 0; }
a { color: #0969da; text-decoration: none; word-break: break-word; }
a:hover { text-decoration: underline; }
code {
  font-family: "JetBrains Mono", "SFMono-Regular", Consolas,
    "Liberation Mono", Menlo, monospace;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 0.05em 0.35em;
  font-size: 0.88em;
}
pre {
  background: #0b1220;
  color: #e6edf3;
  border-radius: 6px;
  padding: 0.8em 1em;
  font-size: 9pt;
  line-height: 1.45;
  overflow: auto;
  page-break-inside: avoid;
}
pre code {
  background: transparent;
  border: none;
  padding: 0;
  color: inherit;
  font-size: inherit;
}
blockquote {
  border-left: 3px solid #d0d7de;
  margin: 0.6em 0;
  padding: 0.1em 0.9em;
  color: #4b5563;
  font-style: italic;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.7em 0 1em 0;
  font-size: 9.5pt;
  page-break-inside: avoid;
}
th, td {
  border: 1px solid #d0d7de;
  padding: 0.4em 0.6em;
  text-align: left;
  vertical-align: top;
}
th {
  background: #f3f4f6;
  font-weight: 700;
}
hr {
  border: none;
  border-top: 1px solid #d0d7de;
  margin: 1.4em 0;
}
strong { color: #0b1220; }
.cover {
  text-align: left;
  margin-bottom: 1.2em;
}
.cover .subtitle {
  font-size: 13pt;
  color: #4b5563;
  margin-top: 0.1em;
}
.cover .meta {
  font-size: 10pt;
  color: #6b7280;
  margin-top: 0.4em;
}
"""


def render_html(markdown_text: str) -> str:
    md = MarkdownIt("commonmark", {"html": False, "linkify": True, "typographer": True})
    md.enable(["table", "strikethrough"])
    body = md.render(markdown_text)
    return f"""<!doctype html>
<html lang=\"en\">
<head>
<meta charset=\"utf-8\">
<title>Figma Design RL Environment — Technical Report</title>
<style>{CSS}</style>
</head>
<body>
{body}
</body>
</html>
"""


def main() -> int:
    if not MD.exists():
        print(f"missing {MD}", file=sys.stderr)
        return 1
    html = render_html(MD.read_text(encoding="utf-8"))

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.set_content(html, wait_until="networkidle")
        page.pdf(
            path=str(PDF),
            format="Letter",
            print_background=True,
            margin={"top": "0.75in", "bottom": "0.75in", "left": "0.75in", "right": "0.75in"},
        )
        browser.close()

    print(f"wrote {PDF}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
