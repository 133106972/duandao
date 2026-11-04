#!/usr/bin/env python3
"""Rebuild forge/fonts/mashan-subset.css: the brush font (Ma Shan Zheng) limited to the characters the game uses, base64-embedded.
Only the single-file build uses it. Run after adding new Chinese text: python3 tools/font-subset.py"""
import re, urllib.parse, subprocess, base64, os
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'forge')
s = open(f'{root}/game.js', encoding='utf-8').read() + open(f'{root}/index.html', encoding='utf-8').read()
chars = [chr(c) for c in range(0x20, 0x7f)] + sorted(set(re.findall(r'[㐀-鿿　-〿＀-￯]', s)))
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
faces = []
for i in range(0, len(chars), 160):
    chunk = ''.join(chars[i:i + 160])
    css = subprocess.run(['curl', '-sS', '-A', UA, 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap&text=' + urllib.parse.quote(chunk)], capture_output=True, text=True).stdout
    url = re.search(r'url\((https://[^)]+)\)', css).group(1)
    data = subprocess.run(['curl', '-sS', '-A', UA, url], capture_output=True).stdout
    faces.append("@font-face{font-family:'Ma Shan Zheng';font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2');unicode-range:%s}" % (base64.b64encode(data).decode(), ','.join('U+%X' % ord(c) for c in chunk)))
open(f'{root}/fonts/mashan-subset.css', 'w').write('\n'.join(faces))
print(len(chars), 'chars,', len(faces), 'faces')
