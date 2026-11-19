#!/usr/bin/env python3
"""Turns art/home.svg into the interactive room: warm recolour, clickable object groups,
monitor screens, window sky, lamp glow and the wall clock. Run: python3 scripts/build-cabin.py"""
import re, colorsys

import os, json
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = open(os.path.join(ROOT,'art','home.svg')).read()

# ---------- 1. warm recolour ----------
def hx(c):
    c = c.lstrip('#'); return [int(c[i:i+2], 16) / 255 for i in (0, 2, 4)]
def tohex(r, g, b):
    return '#%02X%02X%02X' % tuple(max(0, min(255, round(v * 255))) for v in (r, g, b))

def warm(col):
    r, g, b = hx(col)
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    H = h * 360
    if l > 0.9:                                   # near-whites -> warm cream
        nh, ns, nl = 38 / 360, 0.85, 0.93 + (l - 0.9) * 0.5
    elif s < 0.16:                                # greys -> warm wood/cocoa greys, more colour
        nh, ns, nl = 27 / 360, 0.28, l * 0.97
    elif 60 <= H < 115:                           # plant greens -> fresh olive
        nh, ns, nl = 84 / 360, min(1, s * 0.9), l
    elif 115 <= H < 200:                          # teals -> bright honey / mustard (sofa, lamps)
        nh, ns, nl = (38 if l > 0.7 else 33) / 360, 0.85 if l > 0.7 else max(s, 0.72), (0.76 if l > 0.7 else l * 1.02)
    elif 200 <= H < 270:                          # blues -> brick red
        nh, ns, nl = 8 / 360, 0.6, l
    elif 270 <= H < 330:                          # magentas -> butter yellow
        nh, ns, nl = 44 / 360, 0.85, max(l, 0.6)
    elif H >= 330 or H < 12:                      # pinks -> vivid terracotta / burnt orange
        nh, ns, nl = 16 / 360, min(1, s * 1.15 + 0.08), l * 1.02
    else:                                         # oranges / yellows / browns: keep, a bit richer
        nh, ns, nl = H / 360, min(1, s * 1.08), l
    return tohex(*colorsys.hls_to_rgb(nh, nl, ns))

svg = re.sub(r'#[0-9A-Fa-f]{6}\b', lambda m: warm(m.group(0)), SRC)
svg = svg.replace('fill="white"', 'fill="#FBF1E1"').replace('stop-color="white"', 'stop-color="#FBF1E1"')
# masks must stay white
svg = svg.replace('<mask id="stroke0_3835_13514" fill="#FBF1E1">', '<mask id="stroke0_3835_13514" fill="white">')
svg = re.sub(r'(<mask id="stroke\d_3835_13514") fill="#FBF1E1"', r'\1 fill="white"', svg)

# ---------- 2. split into parts ----------
parts = re.split(r'(<path[^>]*?/>|<path[^>]*?>.*?</path>)', svg, flags=re.S)
pos = [j for j, p in enumerate(parts) if p.startswith('<path')]   # part index of path i
pre = {}; post = {}
def wrap(a, b, open_tag):
    pre.setdefault(pos[a], []).append(open_tag)
    post.setdefault(pos[b], []).insert(0, '</g>')

# remove white background rect
parts[0] = re.sub(r'<rect width="500" height="500" fill="[^"]+"/>', '', parts[0])

# window: glass -> sky, blind raised
parts[pos[74]] = '<path id="winGlass" d="M222.397 88.0859V145.72L153.5 185.49V127.869L222.397 88.0859Z" fill="url(#skyWin)"/>'
parts[pos[75]] = parts[pos[75]].replace('M222.397 88.0859V115.17L153.5 154.94V127.869L222.397 88.0859Z',
                                        'M222.397 88.0859V99.5L153.5 139.27V127.869L222.397 88.0859Z')
parts[pos[76]] = ''
parts[pos[77]] = '<path d="M153.5 139.27L222.397 99.5V101.6L153.5 141.37Z" fill="#8A3E28" opacity=".55"/>'
post.setdefault(pos[77], []).append('<g id="winSky" clip-path="url(#winClip)" pointer-events="none"></g>')

HOT = [
    # room-id, label, sub, ranges
    ('deen-salah',   'Salah tracker',   'Deen',              [(718, 723)]),
    ('deen-quran',   'Quran',           'Deen',              [(742, 751)]),
    ('deen-library', 'Islamic library', 'Deen',              [(79, 84), (94, 155)]),
    ('journal',      'Journal',         'Write a little',    [(177, 216)]),
    ('hobbies',      'Hobbies & creative', 'Your idea boxes', [(522, 548), (566, 568), (578, 637)]),
    ('planner',      'Planner',         'Today & this week', [(752, 778)]),
    ('surprise',     'Surprise me',     'Open the gift',     [(779, 786)]),
]
for rid, label, sub, ranges in HOT:
    for a, b in ranges:
        wrap(a, b, f'<g class="hot" data-room="{rid}">')
wrap(638, 678, '<g class="sway">')

# ---------- 3. screens ----------
def screen(rid, tl, w, h, inner):
    a, b = w[0] / 100, w[1] / 100
    c, d = h[0] / 60, h[1] / 60
    m = f'matrix({a:.5f} {b:.5f} {c:.5f} {d:.5f} {tl[0]} {tl[1]})'
    return (f'<g class="hot screen" data-room="{rid}"><g transform="{m}">'
            f'<rect class="scr-bg" width="100" height="60" fill="#2A1C14"/>'
            f'<g class="scr-ui">{inner}</g>'
            f'<rect class="scr-glare" width="100" height="60" fill="url(#glare)"/></g></g>')

design_ui = '''
<rect width="100" height="60" fill="#F6E7CF"/>
<rect width="100" height="8" fill="#E9CFA9"/>
<circle cx="5" cy="4" r="1.6" fill="#D2692A"/><circle cx="10" cy="4" r="1.6" fill="#E9A23B"/><circle cx="15" cy="4" r="1.6" fill="#B9A06A"/>
<rect x="0" y="8" width="13" height="52" fill="#EEDABC"/>
<rect x="3" y="13" width="7" height="5" rx="1" fill="#D2692A"/><rect x="3" y="21" width="7" height="5" rx="1" fill="#C9A37B"/><rect x="3" y="29" width="7" height="5" rx="1" fill="#C9A37B"/>
<rect x="20" y="13" width="58" height="40" rx="2" fill="#FFF9EE" stroke="#E2C59C"/>
<path d="M27 45 C 38 18, 55 52, 71 22" stroke="#D2692A" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<circle cx="27" cy="45" r="2" fill="#fff" stroke="#3A2316"/><circle cx="71" cy="22" r="2" fill="#fff" stroke="#3A2316"/>
<line x1="38" y1="18" x2="27" y2="45" stroke="#3A2316" stroke-width=".6" stroke-dasharray="1.5 1"/>
<circle cx="38" cy="18" r="1.4" fill="#3A2316"/>
<rect x="83" y="13" width="14" height="5" rx="1" fill="#E9A23B"/><rect x="83" y="21" width="14" height="5" rx="1" fill="#D2692A"/><rect x="83" y="29" width="14" height="5" rx="1" fill="#F2D27A"/><rect x="83" y="37" width="14" height="5" rx="1" fill="#5C3A22"/>
'''
linkedin_ui = '''
<rect width="100" height="60" fill="#F3E3C3"/>
<rect width="100" height="9" fill="#5C3A22"/>
<rect x="4" y="2.6" width="20" height="3.8" rx="1.9" fill="#E9A23B"/>
<rect x="10" y="13" width="80" height="44" rx="3" fill="#FFF9EE"/>
<circle cx="19" cy="22" r="5" fill="#D2692A"/>
<rect x="27" y="18.5" width="28" height="3" rx="1.5" fill="#3A2316"/><rect x="27" y="23.5" width="18" height="2.4" rx="1.2" fill="#C9A37B"/>
<rect x="15" y="31" width="68" height="2.6" rx="1.3" fill="#8A6A52"/><rect x="15" y="36" width="60" height="2.6" rx="1.3" fill="#8A6A52"/><rect x="15" y="41" width="40" height="2.6" rx="1.3" fill="#8A6A52"/>
<path d="M19 51.5 c-1.6-1.8 -4 -.4 -3 1.4 l3 2.6 3-2.6 c1-1.8 -1.4-3.2 -3-1.4z" fill="#D2692A"/>
<rect x="27" y="50" width="10" height="4" rx="2" fill="#E9CFA9"/><rect x="40" y="50" width="10" height="4" rx="2" fill="#E9CFA9"/>
'''
status_ui = '''
<rect width="100" height="60" fill="#3A2316"/>
<path d="M60 12 a12 12 0 1 0 10 19 a9.5 9.5 0 1 1 -10 -19z" fill="#F2D27A"/>
<g id="scrDots"></g>
<rect x="16" y="46" width="68" height="4" rx="2" fill="#5C3A22"/><rect id="scrBar" x="16" y="46" width="40" height="4" rx="2" fill="#E9A23B"/>
'''
# right (249) drawn first, then middle (254), then left (257)
post.setdefault(pos[249], []).append(screen('today', (341.062, 194.395), (20.921, 24.228), (0, 21.534), status_ui))
post.setdefault(pos[254], []).append(screen('linkedin', (305.178, 174.051), (33.155, 19.14), (0, 21.534), linkedin_ui))
post.setdefault(pos[257], []).append(screen('design', (256.955, 165.094), (45.287, 7.004), (0, 21.534), design_ui))


# ---------- clock (focus timer) on the right wall ----------
CK = open(os.path.join(ROOT,'art','clock.svg')).read()
ckp = re.findall(r'<(?:path|ellipse|circle)[^>]*/>', CK)
CMAP={'#B1375C':'#9C4426','#C69A7B':'#E3A452','#F9F4E5':'#FFF8EA','#A58067':'#C2803A'}
ckp = [re.sub(r'#[0-9A-Fa-f]{6}\b', lambda m: CMAP.get(m.group(0).upper(), m.group(0)), p) for p in ckp]
body, bellR, bellL, face, dot, h1, h2, rim, tail, shade = ckp
FACE_T = 'rotate(10.4915 13.4478 16.1028) translate(13.4478 16.1028) scale(1 1.2854)'
clock_svg = (
  '<g class="hot clock" data-room="focus"><g transform="translate(413.5 134) matrix(1.12 .6467 0 1.12 0 0)">'
  + body + bellR + bellL + face +
  f'<g transform="{FACE_T}"><path id="ckWedge" d="" fill="#E07A35" opacity=".85"/></g>'
  + rim + tail + shade +
  f'<g transform="{FACE_T}" stroke-linecap="round">'
  '<g fill="#8A5A3A">' + ''.join(f'<circle cx="{6.1*__import__("math").sin(i*__import__("math").pi/6):.2f}" cy="{-6.1*__import__("math").cos(i*__import__("math").pi/6):.2f}" r="{0.42 if i%3==0 else 0.22}"/>' for i in range(12)) + '</g>'
  '<line id="ckHour" x1="0" y1="0" x2="0" y2="-3.4" stroke="#3A2316" stroke-width=".85"/>'
  '<line id="ckMin" x1="0" y1="0" x2="0" y2="-5.1" stroke="#3A2316" stroke-width=".6"/>'
  '<line id="ckSec" x1="0" y1="1.2" x2="0" y2="-5.4" stroke="#D2692A" stroke-width=".3"/>'
  '<circle r=".7" fill="#3A2316"/></g>'
  '</g></g>')
post.setdefault(pos[92], []).append(clock_svg)

# ---------- 4. assemble ----------
out = []
for j, p in enumerate(parts):
    out.extend(pre.get(j, [])); out.append(p); out.extend(post.get(j, []))
svg = ''.join(out)

ROOM = 'M26.65 153.7L250.15 24.66L473.65 153.7V336.6L250.15 465.65L26.65 336.6Z'
extra_defs = f'''
<linearGradient id="skyWin" x1="0" y1="0" x2="0" y2="1">
  <stop id="swTop" offset="0" stop-color="#9fc9e0"/><stop id="swBot" offset="1" stop-color="#f6ead2"/></linearGradient>
<clipPath id="winClip"><path d="M222.397 88.0859V145.72L153.5 185.49V127.869L222.397 88.0859Z"/></clipPath>
<clipPath id="roomClip"><path d="{ROOM}"/></clipPath>
<linearGradient id="glare" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="lampGlow"><stop offset="0" stop-color="#FFC877" stop-opacity=".95"/><stop offset=".45" stop-color="#FF9F45" stop-opacity=".35"/><stop offset="1" stop-color="#FF9F45" stop-opacity="0"/></radialGradient>
<radialGradient id="screenGlow"><stop offset="0" stop-color="#FFD9A0" stop-opacity=".8"/><stop offset="1" stop-color="#FFD9A0" stop-opacity="0"/></radialGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/>
  <feColorMatrix values="0 0 0 0 .35  0 0 0 0 .22  0 0 0 0 .12  0 0 0 .55 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
'''
overlays = f'''
<g id="lightLayer" pointer-events="none">
  <path d="{ROOM}" fill="#000" filter="url(#grain)" style="opacity:.07;mix-blend-mode:multiply"/>
  <path id="tint" d="{ROOM}" fill="#2A1D3A" style="mix-blend-mode:multiply" opacity="0"/>
  <g id="lamps" style="mix-blend-mode:screen" opacity="0" clip-path="url(#roomClip)">
    <ellipse cx="58" cy="252" rx="46" ry="40" fill="url(#lampGlow)"/>
    <ellipse cx="58" cy="330" rx="60" ry="26" fill="url(#lampGlow)" opacity=".6"/>
    <ellipse cx="395" cy="222" rx="42" ry="38" fill="url(#lampGlow)"/>
    <ellipse cx="398" cy="300" rx="55" ry="24" fill="url(#lampGlow)" opacity=".55"/>
    <ellipse cx="310" cy="200" rx="60" ry="36" fill="url(#screenGlow)" opacity=".7"/>
    <ellipse cx="190" cy="150" rx="45" ry="40" fill="url(#lampGlow)" opacity="0" id="winGlow"/>
  </g>
</g>
<g id="sparkles" pointer-events="none"></g>
'''
svg = svg.replace('<defs>', '<defs>' + extra_defs, 1)
svg = svg.replace('</svg>', overlays + '</svg>')
svg = svg.replace('<svg width="500" height="500" viewBox="0 0 500 500"',
                  '<svg id="room" viewBox="22 20 456 450" role="img" aria-label="Afra\'s cozy room"')

out=os.path.join(ROOT,'src','data','cabinSvg.ts')
open(out,'w').write('// Generated by scripts/build-cabin.py from art/home.svg. Do not edit by hand.\nexport const CABIN_SVG = '+json.dumps(svg,ensure_ascii=False)+';\n')
print('wrote', out, len(svg))
