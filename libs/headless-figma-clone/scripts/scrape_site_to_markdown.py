#!/usr/bin/env python3
"""
Recursively crawl pages on the same host as the seed URL (same netloc as the root,
after redirects), up to a maximum depth of 5 from the root, convert main content to
Markdown with markdownify, and write one file per URL under docs/<subdir>/.

Uses Playwright (Chromium) so client-rendered content is captured. Logs progress to stderr.

Dependencies: playwright, beautifulsoup4, markdownify (optional: lxml). After pip install:
  playwright install chromium
"""

from __future__ import annotations

import argparse
import logging
import os
import re
import sys
import time
from collections import deque
from pathlib import Path
from urllib.parse import urldefrag, urljoin, urlparse, urlunparse

from bs4 import BeautifulSoup
from markdownify import markdownify as html_to_md
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

DEFAULT_MAX_DEPTH = 5
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def normalize_url(url: str) -> str:
    """Lowercase host, drop default ports, strip fragment, normalize trailing slash on path."""
    p = urlparse(url)
    netloc = p.netloc.lower()
    if netloc.endswith(":80") and p.scheme == "http":
        netloc = netloc[:-3]
    elif netloc.endswith(":443") and p.scheme == "https":
        netloc = netloc[:-4]
    path = p.path or "/"
    if path != "/" and path.endswith("/"):
        path = path.rstrip("/")
    return urlunparse((p.scheme, netloc, path, p.params, p.query, ""))


def make_soup(html: str) -> BeautifulSoup:
    try:
        return BeautifulSoup(html, "lxml")
    except Exception:
        return BeautifulSoup(html, "html.parser")


def strip_scripts_and_meta_noise(soup: BeautifulSoup) -> None:
    for tag in soup(["script", "style", "noscript", "template", "iframe"]):
        tag.decompose()


def strip_chrome(soup: BeautifulSoup) -> None:
    """Remove common chrome: header, footer, global nav, asides outside main/article."""
    for sel in ("header", "footer"):
        for t in soup.find_all(sel):
            t.decompose()
    for nav in soup.find_all("nav"):
        if nav.find_parent(["main", "article"]):
            continue
        nav.decompose()
    for aside in soup.find_all("aside"):
        if aside.find_parent(["main", "article"]):
            continue
        aside.decompose()


def pick_main_fragment(soup: BeautifulSoup) -> BeautifulSoup:
    """
    Prefer semantic main; fall back to article, common ids/classes, then body
    (with chrome already stripped from the full tree).
    """
    node = soup.find("main") or soup.find(attrs={"role": "main"})
    if node:
        return BeautifulSoup(str(node), "html.parser")

    node = soup.find("article")
    if node:
        return BeautifulSoup(str(node), "html.parser")

    for sel in (
        "#content",
        "#main",
        "#main-content",
        ".content",
        ".main-content",
        ".markdown-body",
        "[role='article']",
    ):
        node = soup.select_one(sel)
        if node:
            return BeautifulSoup(str(node), "html.parser")

    body = soup.find("body")
    if body:
        return BeautifulSoup(str(body), "html.parser")

    return soup


def url_to_doc_path(url: str) -> Path:
    """Map URL path (+ query when present) to a relative filesystem path ending in .md."""
    p = urlparse(url)
    path = p.path or "/"
    parts = [x for x in path.split("/") if x]
    safe_parts: list[str] = []
    for seg in parts:
        safe = re.sub(r"[^\w\-.]+", "_", seg, flags=re.UNICODE).strip("._") or "segment"
        safe_parts.append(safe[:200])

    qslug = ""
    if p.query:
        qslug = re.sub(r"[^\w\-.]+", "_", p.query, flags=re.UNICODE)[:80]

    if not safe_parts:
        return Path(f"index__{qslug}.md" if qslug else "index.md")

    *dirs, last = safe_parts
    if last.lower().endswith((".html", ".htm")):
        last = last.rsplit(".", 1)[0]
    base = last[:-3] if last.lower().endswith(".md") else last
    fname = f"{base}__{qslug}.md" if qslug else f"{base}.md"
    return Path(*dirs, fname) if dirs else Path(fname)


def rewrite_internal_links(
    fragment: BeautifulSoup,
    page_url: str,
    root_netloc: str,
    known_urls: set[str],
    url_to_rel_path: dict[str, Path],
) -> None:
    """Rewrite same-host links to relative paths between saved Markdown files."""
    page_key = normalize_url(urldefrag(page_url)[0])
    page_file = url_to_rel_path.get(page_key)
    if page_file is None:
        return
    cur_parent = page_file.parent

    for a in fragment.find_all("a", href=True):
        raw = a["href"].strip()
        if not raw or raw.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        abs_url = urljoin(page_url, raw)
        base, frag = urldefrag(abs_url)
        norm = normalize_url(base)
        if urlparse(norm).netloc.lower() != root_netloc:
            continue
        if norm not in known_urls:
            continue
        target_file = url_to_rel_path.get(norm)
        if target_file is None:
            continue
        rel_path = os.path.relpath(str(target_file), str(cur_parent)).replace("\\", "/")
        if frag:
            rel_path = f"{rel_path}#{frag}"
        a["href"] = rel_path


def extract_markdown(
    html: str,
    page_url: str,
    root_netloc: str,
    known_urls: set[str],
    url_to_rel_path: dict[str, Path],
) -> str:
    soup = make_soup(html)
    strip_scripts_and_meta_noise(soup)
    strip_chrome(soup)
    main_soup = pick_main_fragment(soup)
    strip_scripts_and_meta_noise(main_soup)
    rewrite_internal_links(main_soup, page_url, root_netloc, known_urls, url_to_rel_path)
    body = main_soup.find(["main", "article", "body"]) or main_soup
    return html_to_md(
        str(body),
        heading_style="ATX",
        bullets="-",
    ).strip() + "\n"


def discover_same_host_hrefs(html: str, page_url: str, root_netloc: str) -> list[str]:
    soup = make_soup(html)
    out: list[str] = []
    for a in soup.find_all("a", href=True):
        raw = a["href"].strip()
        if not raw or raw.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        abs_url = urljoin(page_url, raw)
        base, _ = urldefrag(abs_url)
        norm = normalize_url(base)
        if urlparse(norm).scheme not in ("http", "https"):
            continue
        if urlparse(norm).netloc.lower() != root_netloc:
            continue
        out.append(norm)
    return out


def _looks_like_html(body: str, content_type: str | None) -> bool:
    if content_type:
        ct = content_type.split(";")[0].strip().lower()
        if ct and "html" not in ct:
            return False
    sample = body.lstrip()[:500].lower()
    return sample.startswith("<!doctype html") or sample.startswith("<html")


def navigate_fetch(
    page,
    url: str,
    wait_until: str,
    nav_timeout_ms: int,
    log: logging.Logger,
) -> tuple[str | None, str | None]:
    """
    Navigate with Playwright; return (normalized final URL, HTML) or (None, None).
    """
    try:
        log.debug("goto %s wait_until=%s timeout_ms=%s", url, wait_until, nav_timeout_ms)
        resp = page.goto(url, wait_until=wait_until, timeout=nav_timeout_ms)
        final = normalize_url(page.url)
        if resp is not None and resp.status >= 400:
            log.warning("HTTP %s for %s", resp.status, url)
            return final, None
        html = page.content()
        ctype = resp.headers.get("content-type") if resp else None
        if not _looks_like_html(html, ctype):
            log.warning("Skipping non-HTML response: %s (ctype=%r)", final, ctype)
            return final, None
        return final, html
    except PlaywrightTimeoutError:
        log.warning("Navigation timeout: %s", url)
        return None, None
    except PlaywrightError as e:
        log.warning("Playwright error for %s: %s", url, e)
        return None, None


def write_page_markdown(
    out_root: Path,
    url: str,
    html: str | None,
    root_netloc: str,
    known_urls: set[str],
    url_to_rel_path: dict[str, Path],
    log: logging.Logger,
) -> None:
    rel_path = url_to_rel_path[url]
    dest = out_root / rel_path
    dest.parent.mkdir(parents=True, exist_ok=True)
    if html is None:
        dest.write_text(f"<!-- fetch failed for {url} -->\n", encoding="utf-8")
        log.info("Wrote placeholder (no HTML): %s", dest.relative_to(out_root))
        return
    md = extract_markdown(html, url, root_netloc, known_urls, url_to_rel_path)
    header = f"<!-- source: {url} -->\n\n"
    dest.write_text(header + md, encoding="utf-8")
    log.info("Wrote %s", dest.relative_to(out_root))


def crawl(
    root_url: str,
    out_root: Path,
    max_depth: int,
    delay_s: float,
    wait_until: str,
    nav_timeout_ms: int,
    skip_final_pass: bool,
    log: logging.Logger,
) -> None:
    root_norm = normalize_url(root_url)
    if urlparse(root_norm).scheme not in ("http", "https"):
        raise SystemExit("Root URL must be http(s).")

    log.info("Root URL (normalized): %s", root_norm)
    log.info("Output directory: %s", out_root)
    log.info(
        "max_depth=%s delay_s=%s wait_until=%s nav_timeout_ms=%s",
        max_depth,
        delay_s,
        wait_until,
        nav_timeout_ms,
    )

    url_to_rel_path: dict[str, Path] = {}
    html_cache: dict[str, str | None] = {}
    processed: set[str] = set()
    queued: set[str] = set()

    with sync_playwright() as p:
        log.info("Starting Chromium (headless)...")
        browser = p.chromium.launch(headless=True)
        try:
            ctx = browser.new_context(user_agent=USER_AGENT)
            page = ctx.new_page()

            log.info("Loading root page (follows redirects)...")
            crawl_root, root_html = navigate_fetch(page, root_norm, wait_until, nav_timeout_ms, log)
            time.sleep(delay_s)
            if crawl_root is None or root_html is None:
                raise SystemExit(
                    f"Could not load root URL (timeout, error, or non-HTML): {root_norm}"
                )

            root_netloc = urlparse(crawl_root).netloc.lower()
            if crawl_root != root_norm:
                log.info("Root resolved after redirect to: %s", crawl_root)

            url_to_rel_path[crawl_root] = url_to_doc_path(crawl_root)
            html_cache[crawl_root] = root_html
            queue: deque[tuple[str, int]] = deque([(crawl_root, 0)])
            queued.add(crawl_root)

            while queue:
                url, depth = queue.popleft()
                if url in processed:
                    continue
                processed.add(url)
                if url not in url_to_rel_path:
                    url_to_rel_path[url] = url_to_doc_path(url)

                log.info(
                    "Page depth=%d queue_size=%d processed=%d url=%s",
                    depth,
                    len(queue),
                    len(processed),
                    url,
                )

                html = html_cache.get(url)
                if html is None:
                    log.info("Navigating (not cached)...")
                    _, html = navigate_fetch(page, url, wait_until, nav_timeout_ms, log)
                    html_cache[url] = html

                known_now = set(url_to_rel_path.keys())
                write_page_markdown(
                    out_root,
                    url,
                    html,
                    root_netloc,
                    known_now,
                    url_to_rel_path,
                    log,
                )

                if html is not None and depth < max_depth:
                    found = discover_same_host_hrefs(html, url, root_netloc)
                    log.info("Same-host links on page: %d", len(found))
                    new_urls = 0
                    for nxt in found:
                        if nxt not in url_to_rel_path:
                            url_to_rel_path[nxt] = url_to_doc_path(nxt)
                        if nxt not in queued:
                            queued.add(nxt)
                            queue.append((nxt, depth + 1))
                            new_urls += 1
                    if new_urls:
                        log.info("Enqueued %d new URL(s) (next depth %d).", new_urls, depth + 1)

                time.sleep(delay_s)

            full_keys = set(url_to_rel_path.keys())
            if skip_final_pass:
                log.info("Skipping final link pass (--no-final-pass).")
                log.info("Done. Pages processed: %d", len(processed))
                return

            log.info(
                "Final pass: rewriting internal links using full map (%d URLs)...",
                len(full_keys),
            )
            for url in sorted(processed):
                html = html_cache.get(url)
                rel_path = url_to_rel_path.get(url)
                if rel_path is None or html is None:
                    continue
                md = extract_markdown(html, url, root_netloc, full_keys, url_to_rel_path)
                dest = out_root / rel_path
                dest.write_text(f"<!-- source: {url} -->\n\n" + md, encoding="utf-8")
                log.debug("Refreshed links: %s", dest.relative_to(out_root))

            log.info("Done. Pages processed: %d", len(processed))

        finally:
            browser.close()
            log.info("Browser closed.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Crawl same-host pages with Playwright; save Markdown under docs/<subdir>."
    )
    parser.add_argument(
        "url",
        help="Root URL to crawl (allowed host is taken from the final URL after redirects).",
    )
    parser.add_argument(
        "subdir",
        help="Subdirectory name under docs/ where Markdown files are written.",
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=DEFAULT_MAX_DEPTH,
        help=f"Maximum link depth from root (default {DEFAULT_MAX_DEPTH}). Root is depth 0.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.25,
        help="Seconds to sleep after each page (default 0.25).",
    )
    parser.add_argument(
        "--wait-until",
        choices=("domcontentloaded", "load", "networkidle"),
        default="load",
        help="Playwright page.goto wait_until (default: load). networkidle can hang on some sites.",
    )
    parser.add_argument(
        "--nav-timeout-ms",
        type=int,
        default=90_000,
        help="Navigation timeout in ms (default 90000).",
    )
    parser.add_argument(
        "--no-final-pass",
        action="store_true",
        help="Skip the final pass that rewrites internal links using the full URL map.",
    )
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="DEBUG logging.",
    )
    args = parser.parse_args()

    log = logging.getLogger("scrape_site_to_markdown")
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stderr,
    )

    repo_root = Path(__file__).resolve().parents[1]
    docs = repo_root / "docs"
    out_root = (docs / args.subdir).resolve()
    try:
        out_root.relative_to(docs.resolve())
    except ValueError:
        print("subdir must stay under docs/", file=sys.stderr)
        raise SystemExit(2)
    out_root.mkdir(parents=True, exist_ok=True)

    try:
        crawl(
            root_url=args.url,
            out_root=out_root,
            max_depth=max(0, args.max_depth),
            delay_s=max(0.0, args.delay),
            wait_until=args.wait_until,
            nav_timeout_ms=max(5_000, args.nav_timeout_ms),
            skip_final_pass=args.no_final_pass,
            log=log,
        )
    except KeyboardInterrupt:
        log.error("Interrupted by user.")
        raise SystemExit(130)


if __name__ == "__main__":
    main()
