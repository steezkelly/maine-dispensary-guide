#!/usr/bin/env python3
"""Build a single 2x4 grid comparison image: rows = variants, cols = light/dark."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

VARIANTS = [
    ("099-baseline", "BASELINE — current site"),
    ("001-editorial-heritage", "Variant A — Editorial Heritage"),
    ("002-warm-premium", "Variant B — Warm Premium"),
    ("003-modern-botanical", "Variant C — Modern Botanical"),
]
SCREENSHOTS = Path(__file__).parent / "screenshots"
OUT = Path(__file__).parent / "comparison.png"

# Source: 1280x1600 pages
SRC_W, SRC_H = 1280, 1600
THUMB_W = 600
THUMB_H = int(SRC_H * THUMB_W / SRC_W)
COL_GAP = 24
ROW_GAP = 56
LABEL_H = 40
PAD = 32
TOTAL_W = PAD * 2 + THUMB_W * 2 + COL_GAP
TOTAL_H = PAD * 2 + (THUMB_H + LABEL_H + ROW_GAP) * len(VARIANTS) - ROW_GAP

img = Image.new("RGB", (TOTAL_W, TOTAL_H), (28, 32, 30))
draw = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
except Exception:
    font = ImageFont.load_default()

y = PAD
for slug, label in VARIANTS:
    draw.text((PAD, y + 10), label, fill=(220, 220, 210), font=font)
    y += LABEL_H
    for col, theme in enumerate(("light", "dark")):
        src = Image.open(SCREENSHOTS / f"{slug}_{theme}.png")
        thumb = src.resize((THUMB_W, THUMB_H), Image.LANCZOS)
        x = PAD + col * (THUMB_W + COL_GAP)
        img.paste(thumb, (x, y))
        # theme label
        draw.rectangle((x + 8, y + 8, x + 8 + 60, y + 8 + 24), fill=(0, 0, 0))
        draw.text((x + 16, y + 11), theme.upper(), fill=(240, 240, 230), font=font)
    y += THUMB_H + ROW_GAP

img.save(OUT, optimize=True)
print(f"wrote {OUT}  {img.size}")
