#!/usr/bin/env python3
"""Screenshot all MDG sketch variants in light + dark mode for comparison."""
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

VARIANTS = [
    ("099-baseline", "Baseline (current)"),
    ("001-editorial-heritage", "Variant A — Editorial Heritage"),
    ("002-warm-premium", "Variant B — Warm Premium"),
    ("003-modern-botanical", "Variant C — Modern Botanical"),
]
OUT = Path(__file__).parent / "screenshots"
OUT.mkdir(exist_ok=True)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        for variant, label in VARIANTS:
            for theme in ("light", "dark"):
                page = await browser.new_page(viewport={"width": 1280, "height": 1600})
                await page.goto(f"http://localhost:8742/{variant}/", wait_until="networkidle")
                # Flip theme via localStorage isn't needed — page reads data-theme attr.
                # Use evaluate to set theme + reload to apply.
                await page.evaluate(f"document.documentElement.dataset.theme = '{theme}'")
                await page.wait_for_timeout(400)  # let any transitions settle
                path = OUT / f"{variant}_{theme}.png"
                await page.screenshot(path=str(path), full_page=True)
                await page.close()
                print(f"  {path.name}")
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
