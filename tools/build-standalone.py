#!/usr/bin/env python3
"""Build one self-contained HTML file of the game (no server, no network needed).
Usage: build-standalone.py <forge dir> <font css or ''> <out.html>
Inlines i18n.js and game.js, and an embedded subset of the brush font if given."""
import sys, re
src, font_css, out = sys.argv[1], sys.argv[2], sys.argv[3]
html = open(f'{src}/index.html', encoding='utf-8').read()
def inline(name):
    js = open(f'{src}/{name}', encoding='utf-8').read().replace('</script', '<\\/script')
    return '<script>\n' + js + '\n</script>'
for name in ['i18n.js', 'game.js']:
    tag = f'<script src="{name}"></script>'
    assert tag in html, tag
    html = html.replace(tag, inline(name))
if font_css:
    css = open(font_css, encoding='utf-8').read()
    html = html.replace('</head>', '<style>' + css + '</style>\n</head>', 1)
open(out, 'w', encoding='utf-8').write(html)
print(out, len(html.encode()) // 1024, 'KB')
