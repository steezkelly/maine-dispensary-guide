"""
Re-measure text-to-HTML ratio for a list of URLs.

Usage:
  python3 scripts/seo/measure-text-ratio.py                    # measure all 27 flagged URLs
  python3 scripts/seo/measure-text-ratio.py --url <URL>         # measure one URL
  python3 scripts/seo/measure-text-ratio.py --simulate          # also estimate impact of fix options

Semrush "Low text to HTML ratio" threshold is typically 10% (or 15% on older crawls).
Pages below ~10% get flagged.

Method:
  1. Fetch the live HTML via GET.
  2. Strip <script>, <style>, and HTML comments.
  3. Walk the remaining DOM with a no-script/style HTMLParser to extract visible text.
  4. ratio = utf8(text_bytes) / utf8(html_bytes)
"""

import argparse
import re
import sys
import urllib.request
from html.parser import HTMLParser

DEFAULT_URLS = [
    "https://mainedispensaryguide.com/about",
    "https://mainedispensaryguide.com/all-guides",
    "https://mainedispensaryguide.com/blog",
    "https://mainedispensaryguide.com/download-checklist",
    "https://mainedispensaryguide.com/download/founders-bible",
    "https://mainedispensaryguide.com/founders",
    "https://mainedispensaryguide.com/guides/baldwin-dispensary-guide",
    "https://mainedispensaryguide.com/guides/brownfield-dispensary-guide",
    "https://mainedispensaryguide.com/guides/buxton-dispensary-guide",
    "https://mainedispensaryguide.com/guides/cornish-dispensary-guide",
    "https://mainedispensaryguide.com/guides/freedom-dispensary-guide",
    "https://mainedispensaryguide.com/guides/hiram-dispensary-guide",
    "https://mainedispensaryguide.com/guides/kennebunk-dispensary-guide",
    "https://mainedispensaryguide.com/guides/limington-dispensary-guide",
    "https://mainedispensaryguide.com/guides/naples-dispensary-guide",
    "https://mainedispensaryguide.com/guides/ogunquit-dispensary-guide",
    "https://mainedispensaryguide.com/guides/parsonsfield-dispensary-guide",
    "https://mainedispensaryguide.com/guides/porter-dispensary-guide",
    "https://mainedispensaryguide.com/guides/saco-dispensary-guide",
    "https://mainedispensaryguide.com/guides/york-dispensary-guide",
    "https://mainedispensaryguide.com/launch-checklist",
    "https://mainedispensaryguide.com/newsletter",
    "https://mainedispensaryguide.com/privacy",
    "https://mainedispensaryguide.com/resources",
    "https://mainedispensaryguide.com/resources/maine-cannabis-education",
    "https://mainedispensaryguide.com/resources/maine-cannabis-official-resources",
    "https://mainedispensaryguide.com/start-here",
]


class TextExtractor(HTMLParser):
    SKIP = {"script", "style", "noscript"}

    def __init__(self):
        super().__init__()
        self.depth_skip = 0
        self.text_parts = []

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.depth_skip += 1

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.depth_skip:
            self.depth_skip -= 1

    def handle_data(self, data):
        if self.depth_skip == 0:
            self.text_parts.append(data)

    def get_text(self):
        return " ".join(self.text_parts)


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "MDG-RatioAudit/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", errors="replace")


def visible_text_bytes(html):
    """Approximate Semrush's text extraction: drop scripts/styles/comments, then DOM-walk."""
    html = re.sub(r"<script\b[^>]*>.*?</script>", " ", html, flags=re.S | re.I)
    html = re.sub(r"<style\b[^>]*>.*?</style>", " ", html, flags=re.S | re.I)
    html = re.sub(r"<!--.*?-->", " ", html, flags=re.S)
    p = TextExtractor()
    p.feed(html)
    t = re.sub(r"\s+", " ", p.get_text()).strip()
    return len(t.encode("utf-8"))


def html_bytes(html):
    return len(html.encode("utf-8"))


def simulate(html, remove_search_dup=False, remove_layout_style=False, remove_mega_menu=False):
    """Estimate impact of various fixes by stripping bytes from the live HTML."""
    h = html
    if remove_search_dup:
        # The Search component is rendered twice (desktop + mobile) and each instance
        # inlines its searchIndex via <script define:vars>. Drop one of the two scripts
        # that contains "searchIndex = [".
        parts = re.split(r"(<script[^>]*>.*?</script>)", h, flags=re.S | re.I)
        kept, dup_seen = [], 0
        for part in parts:
            if part.startswith("<script") and "searchIndex = [" in part:
                dup_seen += 1
                if dup_seen == 2:
                    continue
            kept.append(part)
        h = "".join(kept)
    if remove_layout_style:
        # Strip the Layout.astro <style> block (one large block at the top of <body>).
        h = re.sub(r"<style>.*?</style>", "", h, count=1, flags=re.S | re.I)
    if remove_mega_menu:
        # Strip the "Browse by Topic" mega-menu dropdown-content (60+ nav links).
        h = re.sub(
            r'<div class="dropdown-content multi-column">.*?</div>\s*</div>\s*<div class="nav-dropdown">',
            "",
            h,
            count=1,
            flags=re.S,
        )
    return h


def measure_one(url, simulate_opts=False):
    raw = fetch(url)
    o, t = html_bytes(raw), visible_text_bytes(raw)
    out = {
        "url": url,
        "html_kb": o / 1024,
        "text_kb": t / 1024,
        "ratio_pct": t / o * 100,
    }
    if simulate_opts:
        for opt in ("search_dup", "layout_style", "mega_menu", "all_three"):
            kwargs = {
                "search_dup": {"remove_search_dup": True},
                "layout_style": {"remove_layout_style": True},
                "mega_menu": {"remove_mega_menu": True},
                "all_three": {
                    "remove_search_dup": True,
                    "remove_layout_style": True,
                    "remove_mega_menu": True,
                },
            }[opt]
            sim = simulate(raw, **kwargs)
            so, st = html_bytes(sim), visible_text_bytes(sim)
            out[f"sim_{opt}_pct"] = st / so * 100
            out[f"sim_{opt}_delta_pct"] = out[f"sim_{opt}_pct"] - out["ratio_pct"]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", help="Measure one URL (overrides default list)")
    ap.add_argument("--simulate", action="store_true", help="Also estimate impact of trim options")
    args = ap.parse_args()
    urls = [args.url] if args.url else DEFAULT_URLS
    rows = [measure_one(u, simulate_opts=args.simulate) for u in urls]
    # Pretty print
    cols = ["url", "html_kb", "text_kb", "ratio_pct"]
    if args.simulate:
        cols += [f"sim_{k}_pct" for k in ("search_dup", "layout_style", "mega_menu", "all_three")]
    widths = {c: max(len(c), max(len(f"{r[c]:.2f}") if isinstance(r[c], float) else len(str(r[c])) for r in rows)) for c in cols}
    print("  ".join(c.ljust(widths[c]) for c in cols))
    for r in rows:
        cells = []
        for c in cols:
            v = r[c]
            if isinstance(v, float):
                cells.append(f"{v:.2f}".ljust(widths[c]))
            else:
                cells.append(str(v).ljust(widths[c]))
        print("  ".join(cells))


if __name__ == "__main__":
    main()
