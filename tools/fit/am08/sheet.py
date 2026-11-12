import cv2, numpy as np, json, sys
from PIL import Image, ImageDraw
R,OUT=sys.argv[1],sys.argv[2]
d=json.load(open('dev.json'))
F={'stjob':('am08_stjob_2025.jpg',(860,360,1420,900),'AM08 at Saint-Job (photo AM 08579, Stratoswift, CC BY-SA 4.0): front 3/4, solved camera'),
   'cal25':('am08_calevoet_2025.jpg',(1080,480,1540,980),'AM08 at Uccle-Calevoet (photo AM 08049, Stratoswift, CC BY-SA 4.0): near front, solved camera')}
for n,(f,(x0,y0,x1,y1),title) in F.items():
    ph=cv2.imread(R+f); tiles=[('photo',ph)]
    for v,lab in (('before','before: round 3 (1.62 m nose, 33 deg)'),('after','after: round 4 (outline-fitted)')):
        r=cv2.imread(f'r_{v}_{n}.png',cv2.IMREAD_UNCHANGED); a=r[...,3:4]/255.0
        bg=np.full_like(ph,40); tiles.append((lab+' - outline dev. %.1f px mean'%d[n][v]['mean'],(bg*(1-a)+r[...,:3]*a).astype(np.uint8)))
    r=cv2.imread(f'r_after_{n}.png',cv2.IMREAD_UNCHANGED); a=r[...,3:4]/255.0
    ov=(ph*(1-0.5*a)+r[...,:3]*0.5*a).astype(np.uint8)
    for v,col in (('before',(0,140,255)),('after',(255,0,255))):
        m=(cv2.imread(f'r_{v}_{n}.png',cv2.IMREAD_UNCHANGED)[...,3]>127).astype(np.uint8)
        cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(ov,cs,-1,col,1)
    for q in d[n]['traced']: cv2.circle(ov,(int(q[0]),int(q[1])),3,(0,255,0),-1)
    tiles.append(('overlay 50 %: after (magenta), before (orange), traced outline (green)',ov))
    H=520; ims=[]
    for lab,t in tiles:
        c=Image.fromarray(cv2.cvtColor(t[y0:y1,x0:x1],cv2.COLOR_BGR2RGB)); c=c.resize((int(c.width*H/c.height),H),Image.LANCZOS); ims.append((lab,c))
    Wt=sum(c.width for _,c in ims)+8*3; out=Image.new('RGB',(Wt,H+56),(24,26,30)); dr=ImageDraw.Draw(out); dr.text((8,6),title,fill=(230,232,236)); xo=0
    for lab,c in ims: out.paste(c,(xo,24)); dr.text((xo+6,H+32),lab,fill=(230,232,236)); xo+=c.width+8
    out.save(f'{OUT}/am08_fit_{n}.jpg',quality=88); print(out.size)
