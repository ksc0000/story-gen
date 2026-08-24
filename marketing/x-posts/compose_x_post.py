#!/usr/bin/env python3
"""Ehoria X投稿画像の合成: 水彩ソース + 角丸コピーカード + ロゴ (既存v2フォーマット踏襲)"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont

SRC = "/Users/shunsuke/dev/github/ksc0000/story-gen/marketing/x-posts/natsu-omoide-source.png"
LOGO = "/Users/shunsuke/.codex/visualizations/2026/07/26/019f9ee0-92ef-7211-b0ce-6387ea5524d9/ehoria-logo-512.png"
OUT = "/Users/shunsuke/dev/github/ksc0000/story-gen/marketing/x-posts/ehoria_x_natsu-hanabi_v1.png"
FONT = "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc"

W, H = 1080, 1350  # X向け4:5

# --- ソースを4:5にカバークロップ ---
src = Image.open(SRC).convert("RGB")
sw, sh = src.size
scale = max(W / sw, H / sh)
nw, nh = round(sw * scale), round(sh * scale)
src = src.resize((nw, nh), Image.LANCZOS)
left = (nw - W) // 2
top = 0  # 上部(風鈴・空)を残す
canvas = src.crop((left, top, left + W, top + H))

# --- 角丸テキストカード (上部) ---
card_x0, card_y0, card_x1, card_y1 = 64, 64, W - 64, 420
overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
od.rounded_rectangle([card_x0, card_y0, card_x1, card_y1], radius=36, fill=(255, 255, 255, 216))
# カードに柔らかい影
shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.rounded_rectangle([card_x0 + 6, card_y0 + 10, card_x1 + 6, card_y1 + 10], radius=36, fill=(40, 20, 80, 70))
shadow = shadow.filter(ImageFilter.GaussianBlur(14))
canvas = canvas.convert("RGBA")
canvas.alpha_composite(shadow)
canvas.alpha_composite(overlay)

d = ImageDraw.Draw(canvas)
# アクセントバー (オレンジ→紫のグラデ)
bar_x, bar_y, bar_w, bar_h = card_x0 + 48, card_y0 + 44, 96, 12
for i in range(bar_w):
    t = i / bar_w
    r = round(244 * (1 - t) + 124 * t)
    g = round(162 * (1 - t) + 58 * t)
    b = round(89 * (1 - t) + 205 * t)
    d.rectangle([bar_x + i, bar_y, bar_x + i + 1, bar_y + bar_h], fill=(r, g, b, 255))

# --- コピー ---
PURPLE = (91, 45, 158, 255)
font = ImageFont.truetype(FONT, 58)
lines = ["「はなび、また みたい」", "夏のおもいでは、", "絵本にすれば 何度でも。"]
y = bar_y + bar_h + 40
for line in lines:
    d.text((bar_x, y), line, font=font, fill=PURPLE)
    y += 86

# --- ロゴ (右下・角丸マスク) ---
logo = Image.open(LOGO).convert("RGBA")
logo_w = 128
logo = logo.resize((logo_w, round(logo.height * logo_w / logo.width)), Image.LANCZOS)
mask = Image.new("L", logo.size, 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, logo.width, logo.height], radius=28, fill=255)
logo.putalpha(mask)
canvas.alpha_composite(logo, (W - logo_w - 40, H - logo.height - 40))

canvas.convert("RGB").save(OUT, "PNG")
print("saved:", OUT, canvas.size)
