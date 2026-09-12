import json, math
from pathlib import Path
from PIL import Image
ws=Path('.superpowers/sdd/2026-09-07-design-ux-remediation')
def lum(c):
    p=[v/255 for v in c[:3]];p=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in p];return sum(a*b for a,b in zip(p,[.2126,.7152,.0722]))
rows=[]
for state in json.loads((ws/'evidence/e6-hero-background.json').read_text()):
    im=Image.open(ws/f'evidence/e6-hero-textless-background-{state["width"]}.png').convert('RGB')
    for r in state['labels']:
        import re
        nums=list(map(float,re.findall(r'[\d.]+',r['color'])))
        if len(nums)>3 and nums[3]==0:continue
        box=r['rect'];pixels=set(im.crop((max(0,math.floor(box['left'])),max(0,math.floor(box['top'])),min(im.width,math.ceil(box['right'])),min(im.height,math.ceil(box['bottom'])))).getdata())
        if not pixels:continue
        alpha=nums[3] if len(nums)>3 else 1
        def contrast(bg):
            fg=[nums[i]*alpha+bg[i]*(1-alpha) for i in range(3)];a,b=lum(fg),lum(bg);return (max(a,b)+.05)/(min(a,b)+.05)
        bg=min(pixels,key=contrast);rows.append(dict(width=state['width'],text=r['text'],computedForeground=nums,worstActualBackground=list(bg),minimumContrast=contrast(bg)))
result={'method':'Real rendered backdrop screenshot with hero text color temporarily transparent; unchanged layout/photo/scrim/card. Compare computed original text color against every backdrop pixel in each visible text box. No antialiased glyph pixels used. Reduced-motion local browser.', 'rows':rows,'minimum':min(r['minimumContrast'] for r in rows)}
(ws/'evidence/e6-hero-contrast.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
