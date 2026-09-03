from pathlib import Path
import subprocess

p=Path('index.html')
s=p.read_text()
old="closing=closureFps>18?` ↓ ${Math.round(closureFps)} FT/S`:closureFps<-18?` ↑ ${Math.round(-closureFps)} FT/S`:'';targetUI.dataset.range=`${ft} FT${closing}`"
new="closing=ons?(closureFps>18?` ↓ ${Math.round(closureFps)} FT/S`:closureFps<-18?` ↑ ${Math.round(-closureFps)} FT/S`:''):'';targetUI.dataset.range=`${ft} FT${closing}`"
if s.count(old)!=1:
    raise SystemExit(f'guidance match count {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s)
html=s[s.index('<script type="module">')+len('<script type="module">'):s.index('</script>')]
html=html.replace("import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';",'const THREE={};')
Path('/tmp/emberwing-check.mjs').write_text(html)
subprocess.run(['node','--check','/tmp/emberwing-check.mjs'],check=True)
