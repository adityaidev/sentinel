"""Generate a clean, minimal 1200x630 OG image for Sentinel.
Editorial composition: huge letter-spaced wordmark, thin rule, subtitle,
tagline, radar mark accent, footer meta. No AI-image flourishes.
"""
from PIL import Image, ImageDraw, ImageFont
import math
from pathlib import Path

W, H = 1200, 630
BG = (0, 0, 0)             # pitch black
TEXT = (237, 237, 237)     # #ededed
MUTED = (161, 161, 170)    # #a1a1aa
ACCENT = (59, 130, 246)    # #3b82f6

FONT_BLACK = "C:/Windows/Fonts/seguibl.ttf"
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_MONO = "C:/Windows/Fonts/consolab.ttf"

img = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(img, "RGBA")

# Faint dot grid
for y in range(0, H, 40):
    for x in range(0, W, 40):
        d.point((x, y), fill=(26, 26, 26))

# Radar pentagon mark — upper right
cx, cy, r = W - 100, 100, 38
pts_outer = []
pts_inner = []
for i in range(5):
    a = math.radians(-90 + i * 72)
    pts_outer.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    # Inner "data shape" — uneven to hint at radar
    rr = r * (0.45 + (i % 3) * 0.15)
    pts_inner.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
# Outer web
d.polygon(pts_outer, outline=(40, 40, 40), width=1)
# Cross lines
for p in pts_outer:
    d.line([(cx, cy), p], fill=(40, 40, 40), width=1)
# Data shape
d.polygon(pts_inner, outline=ACCENT, fill=(59, 130, 246, 40), width=2)

# Top-left section label
label_font = ImageFont.truetype(FONT_MONO, 14)
d.text((82, 84), "COMPETITIVE INTELLIGENCE", font=label_font, fill=MUTED)

# Big letter-spaced wordmark S E N T I N E L
title_font = ImageFont.truetype(FONT_BLACK, 150)
title = "SENTINEL"
letter_spacing = 28  # wider for editorial wordmark feel
letters = list(title)
bboxes = [title_font.getbbox(c) for c in letters]
widths = [b[2] - b[0] for b in bboxes]
total_w = sum(widths) + letter_spacing * (len(letters) - 1)
x = (W - total_w) // 2
baseline_y = 255
for i, c in enumerate(letters):
    d.text((x, baseline_y), c, font=title_font, fill=TEXT)
    x += widths[i] + letter_spacing

# Thin blue rule
rule_w = 200
rule_x = (W - rule_w) // 2
d.rectangle((rule_x, 430, rule_x + rule_w, 433), fill=ACCENT)

# Subtitle
sub_font = ImageFont.truetype(FONT_BOLD, 30)
sub = "Autonomous Competitive Intelligence"
sbox = d.textbbox((0, 0), sub, font=sub_font)
d.text(((W - (sbox[2] - sbox[0])) // 2, 455), sub, font=sub_font, fill=MUTED)

# Tagline — italic feeling via monospace
tag_font = ImageFont.truetype(FONT_MONO, 20)
tag = "Stop Googling.   Start Strategizing."
tbox = d.textbbox((0, 0), tag, font=tag_font)
d.text(((W - (tbox[2] - tbox[0])) // 2, 498), tag, font=tag_font, fill=ACCENT)

# Footer meta row
meta_font = ImageFont.truetype(FONT_MONO, 16)
left = "sentinel.adityaai.dev"
right = "GEMINI PRO · SUPABASE · VERCEL"
d.text((80, H - 56), left, font=meta_font, fill=TEXT)
d.text((W - 80, H - 56), right, font=meta_font, fill=MUTED, anchor="rm")

# Top + bottom thin accent lines
d.rectangle((0, 0, W, 2), fill=ACCENT)
d.rectangle((0, H - 2, W, H), fill=(38, 38, 38))

out = Path(__file__).resolve().parent.parent / "public" / "og-image.png"
out.parent.mkdir(parents=True, exist_ok=True)
img.save(out, "PNG", optimize=True)
print(f"Wrote {out}")
