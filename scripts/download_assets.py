"""Download authorized Higgsfield outputs and self-host the storefront's fonts."""
import json
import re
import urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public' / 'assets'
FONTS = ROOT / 'public' / 'fonts'
TEMP = ROOT / 'tmp' / 'generated'
for folder in [ASSETS, FONTS, TEMP]:
    folder.mkdir(parents=True, exist_ok=True)

def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read()

for asset in json.loads((ROOT / 'scripts' / 'asset-sources.json').read_text(encoding='utf-8')):
    original = TEMP / (asset['filename'] + '.png')
    if not original.exists():
        original.write_bytes(fetch(asset['result_url']))
    with Image.open(original) as source:
        source = source.convert('RGB')
        source.thumbnail((2200, 1800))
        provenance = Image.Exif()
        provenance[270] = 'Generated with Higgsfield GPT Image 2.5. Prompt: ' + asset['prompt']
        source.save(ASSETS / (asset['filename'] + '.webp'), 'WEBP', quality=88, method=6, exif=provenance)
    print('Saved ' + asset['filename'] + '.webp')

with Image.open(ROOT / 'references' / '491725a9c667de8e0fa55a256c1bb4f0.jpg') as source:
    provenance = Image.Exif()
    provenance[270] = 'User supplied mood reference: references/491725a9c667de8e0fa55a256c1bb4f0.jpg'
    source.convert('RGB').save(ASSETS / 'mindset.webp', 'WEBP', quality=88, method=6, exif=provenance)

for weight in [600, 700, 800]:
    css = fetch('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@' + str(weight) + '&display=swap').decode()
    font_url = re.findall(r'url\((https://[^)]+)\)', css)[-1]
    (FONTS / ('barlow-condensed-' + str(weight) + '.ttf')).write_bytes(fetch(font_url))
css = fetch('https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&display=swap').decode()
font_url = re.findall(r'url\((https://[^)]+)\)', css)[-1]
(FONTS / 'manrope.ttf').write_bytes(fetch(font_url))
(FONTS / 'SOURCES.md').write_text('Self-hosted Barlow Condensed and Manrope from Google Fonts. Both are licensed under the SIL Open Font License. Sources: https://fonts.google.com/specimen/Barlow+Condensed and https://fonts.google.com/specimen/Manrope\n', encoding='utf-8')
print('Saved self-hosted fonts and source record.')
