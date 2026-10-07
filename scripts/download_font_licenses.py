from pathlib import Path
import urllib.request

fonts = Path(__file__).resolve().parents[1] / 'public' / 'fonts'
for family in ['barlowcondensed', 'manrope']:
    url = 'https://raw.githubusercontent.com/google/fonts/main/ofl/' + family + '/OFL.txt'
    with urllib.request.urlopen(url, timeout=30) as response:
        (fonts / (family + '-OFL.txt')).write_bytes(response.read())
    print('Saved ' + family + ' license')
