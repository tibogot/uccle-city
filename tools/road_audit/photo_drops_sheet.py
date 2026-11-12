import json, os
from PIL import Image, ImageDraw
man=json.load(open('data/tiles/manifest.json'))
tiles={t['name']:t for t in man['tiles']}
drops=[];seen=set()
for t in man['tiles']:
    p=f"data/tiles/{t['name']}/markings.json"
    if not os.path.exists(p): continue
    m=json.load(open(p)); x0,x1=t['bounds']['x']; z0,z1=t['bounds']['z']
    for c in m['crossings']:
        if not (x0<=c['c'][0]<x1 and z0<=c['c'][1]<z1) or c['id'] in seen or not c.get('poly'): continue
        seen.add(c['id']); ph=c.get('photo')
        if ph and max(ph.get('f',ph['s']), ph.get('wm') or 0)<0.4 and ph['veg']<0.15 and (ph.get('d') or 0)<0.55 and (ph.get('lum') or 1)>0.3: drops.append((t['name'],c,max(ph.get('f',ph['s']), ph.get('wm') or 0)))
drops.sort(key=lambda d:d[2])
S=24; R=9; cell=2*R*S//2
sheet=Image.new('RGB',(6*cell,6*(cell+14)),(20,20,20)); d=ImageDraw.Draw(sheet)
ims={}
for k,(T,c,sc) in enumerate(drops[:36]):
    if T not in ims: ims[T]=Image.open(f'data/raw/ortho/{T}.jpg').convert('RGB')
    b=tiles[T]['bounds']; tx0,tz0=b['x'][0],b['z'][0]; cx,cz=c['c']
    cr=ims[T].crop((int((cx-R-tx0)*4),int((cz-R-tz0)*4),int((cx+R-tx0)*4),int((cz+R-tz0)*4))).resize((cell,cell))
    dd=ImageDraw.Draw(cr); sc2=cell/(2*R)
    dd.polygon([((p[0]-cx+R)*sc2,(p[1]-cz+R)*sc2) for p in c['poly']],outline=(0,229,255))
    x,y=(k%6)*cell,(k//6)*(cell+14); sheet.paste(cr,(x,y+14)); d.text((x+3,y+1),f"{k} {c['id']} {sc:.2f}",fill=(230,230,230))
sheet.save('C:/Users/tibog/AppData/Local/Temp/claude/77ba21dda301091c/5d20f1ca-354b-43c4-835e-6fe8d0a61175/scratchpad/drops.jpg',quality=85)
print(len(drops))
