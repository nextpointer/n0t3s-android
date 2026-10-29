#!/usr/bin/env python3
"""Regenerate legacy launcher icons (ic_launcher(_round).png) for the Android
platform from assets/icon.png composited over the dark brand background.

@capacitor/assets flattens transparent sources onto white for the legacy
(pre-Android-8) launcher icons; the app's launcher artwork is dark, so fix
those bitmaps here. Run after `bunx capacitor-assets generate --android`.

Requires Pillow: `bunx --bun python3` won't do — use system python3 with
`pip install pillow` (or `uv pip install pillow`).
"""
from PIL import Image, ImageDraw

BACKGROUND = (14, 14, 18, 255)  # #0E0E12 — matches generated adaptive bg
SIZES = {  # mipmap density -> launcher size in px
    "mipmap-ldpi": 36,
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

src = Image.open("assets/icon.png").convert("RGBA")

for folder, size in SIZES.items():
    icon = Image.open(f"android/app/src/main/res/{folder}/ic_launcher.png")
    s = icon.size[0]
    flat = Image.new("RGBA", icon.size, BACKGROUND)
    glyph = src.resize((s, s), Image.LANCZOS)
    flat.alpha_composite(glyph)
    flat.convert("RGB").save(f"android/app/src/main/res/{folder}/ic_launcher.png")

    # Round variant keeps circular alpha outside the icon
    rnd = Image.new("RGBA", icon.size, (0, 0, 0, 0))
    rnd.alpha_composite(glyph)
    mask = Image.new("L", icon.size, 0)
    ImageDraw.Draw(mask).ellipse((0, 0, s - 1, s - 1), fill=255)
    rnd.putalpha(mask)
    rnd.save(f"android/app/src/main/res/{folder}/ic_launcher_round.png")

print("legacy icons rebuilt:", ", ".join(f"{k}={v}px" for k, v in SIZES.items()))
