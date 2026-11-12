import cv2, numpy as np, json
R='C:/Users/tibog/Downloads/uccle-city/data/raw/refs/trains/'
TR={'stjob':('am08_stjob_2025.jpg',(1190,620),[(1070,425),(1145,428),(1201,444),(1232,462),(1261,487),(1282,519),(1298,556),(1311,587),(1320,612),(1326,637),(1331,675)]),
    'cal25':('am08_calevoet_2025.jpg',(1320,700),[(1236,535),(1299,529),(1361,532),(1392,547),(1417,572),(1436,604),(1449,647),(1461,697),(1471,722)])}
def snap(g,p,c):
    d=np.array(p,float)-c; d/=np.linalg.norm(d); best=None
    for t in np.arange(-8,8.5,0.5):
        q=np.array(p)+d*t; a=q+d*1.5; b=q-d*1.5
        v=abs(float(g[int(a[1]),int(a[0])])-float(g[int(b[1]),int(b[0])]))
        if best is None or v>best[0]: best=(v,q)
    return best[1]
res={}
for n,(f,c,pts) in TR.items():
    g=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(R+f),cv2.COLOR_BGR2GRAY),(3,3),0)
    sp=[np.array(p,float) for p in pts]; res[n]={"traced":[list(map(float,q)) for q in sp]}; res[n]={'traced':[list(map(float,q)) for q in sp]}
    for v in ('before','after'):
        a=cv2.imread(f'r_{v}_{n}.png',cv2.IMREAD_UNCHANGED)[...,3]>127
        cs,_=cv2.findContours(a.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); C=np.vstack([x.reshape(-1,2) for x in cs]).astype(float)
        d=[np.sqrt(((C-q)**2).sum(1)).min() for q in sp]
        res[n][v]=dict(mean=float(np.mean(d)),max=float(np.max(d)),each=[round(x,1) for x in d])
        print(n,v,'mean %.1f px  max %.1f px'%(np.mean(d),np.max(d)), [round(x,1) for x in d])
json.dump(res,open('dev.json','w'),indent=1)
