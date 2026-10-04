# BeanMora brand assets

All packaged assets derive from `mark.png`, one transparent master. No launcher icon or favicon was generated separately.

## Provenance and fidelity

The master was produced with the built-in image generation editor from the user's supplied `image (4).png` brand board, specifically the emblem in the lower-left **1. PRIMARY LOGO** panel. The original returned file was `exec-5e5fe6de-f885-49bc-a799-e492722c33b8.png` (1254 × 1254 RGBA).

This is a reference-guided raster restoration, **not a pixel-exact extraction or original vector artwork**. It keeps the espresso bean, cream crease, copper crescent/steam, teal ribbon, and three dots. Curve geometry and shading vary subtly from the source; the pale cream steam remains more visible than in the board. The generated alpha is retained, including very faint edge pixels. No alternate geometry, hand-drawn replacement, or monochrome reinterpretation is included.

## Files and layout

| File | Dimensions | Use |
| --- | --- | --- |
| `mark.png` | 695 × 1188 | Transparent master, tightly cropped with approximately 16 px of padding around visible artwork |
| `icon.png` | 1024 × 1024 | Master fit within 880 × 880, centered on opaque `#F7F2E9`; square corners, no shadow |
| `adaptive-foreground.png` | 1024 × 1024 | Same master fit within 614 × 614 and centered on real transparency |
| `../../../../public/icons/icon-*.png` | 16–512 square | Downsizes of `icon.png` |
| `../../../../src/app/favicon.ico` | 16, 32, 48, 64, 128, 256 square | Multi-size ICO from `icon.png` |

Android adaptive background should be `#F7F2E9`. The foreground's visible pixels (alpha ≥16) fit within a radius of 306.44 px of the 1024 canvas center, inside the intended central 60% circle (radius 307.2 px). Use `mark.png` with contain/aspect-fit scaling in the app.

## Deterministic packaging

Only crop, aspect-preserving resize, padding, cream background compositing, and file encoding were applied after generation, using ImageMagick. No colors or drawing geometry were edited programmatically.

The master crop on the generated 1254-square image was `695x1188+275+33`. Derive every future size from this master or the packaged `icon.png` to keep the identity consistent.

## Wordmark recommendation

The board does not identify its font. A practical visual approximation for the editable `BeanMora` wordmark is **Quicksand Medium (500)**, with near-zero or slightly negative letter spacing. This is a visual recommendation, not an exact font identification. The reference uses rounded terminals, a light-to-medium stroke, and mixed case. At a 48 px emblem height, start with a 28–30 px wordmark; at a 76 px emblem height, start at 40–44 px. For the teal `Coffee Recipes & More` tagline, use approximately 30–34% of the wordmark size, with short thin teal rules on each side only where space permits.

Official font source: https://github.com/google/fonts/tree/main/ofl/quicksand

## Generation prompt

The exact built-in editor prompt is preserved in `generation-prompt.txt`.
