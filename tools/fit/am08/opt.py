import numpy as np, cv2, json, itertools
from hull import PROFILE, ring, interp
from sfm import unpack, names
from cam import OBS
p=np.array(json.load(open('sfm.json'))['p'])
cams=unpack(p)[0]
TR=json.load(open('dev.json'))
NS=[(0.62, 0.16), (0.80, 0.08), (1.10, 0.03), (1.50, 0.0), (2.05, 0.0), (2.30, 0.12), (2.50, 0.32), (2.80, 0.64),
    (3.10, 0.98), (3.35, 1.30), (3.55, 1.60), (3.72, 1.90), (3.86, 2.18), (3.98, 2.45), (4.07, 2.66), (4.12, 2.80), (4.15, 2.90)]
def hull(NL, NS, lo, hi, z0, z1, K=40):
    rg=ring(); y=rg[:,0]; z=rg[:,1]
    t=np.clip((z-z0)/(z1-z0),0,1); t=t*t*(3-2*t); n=lo+(hi-lo)*t
    lf=NL-interp(NS,z); xbf=-NL; rows=[np.stack([np.full_like(y,x),y,z],1) for x in np.linspace(xbf-10,xbf,6)]
    for k in range(1,K+1):
        u=np.sin(np.pi/2*k/K); rows.append(np.stack([xbf+lf*u, y*np.clip(1-u**n,0,1)**(1/n), z],1))
    R=np.array(rows); q=[]
    for i in range(len(R)-1):
        for j in range(R.shape[1]): jj=(j+1)%R.shape[1]; q.append([R[i,j],R[i,jj],R[i+1,jj],R[i+1,j]])
    return np.array(q)
def score(Q, verbose=False):
    out=[]
    for i,nm in enumerate(names):
        c=cams[i]; W,H=OBS[nm]['size']; f=c[6]; K=np.array([[f,0,W/2],[0,f,H/2],[0,0,1]])
        pr,_=cv2.projectPoints(Q.reshape(-1,3),c[:3],c[3:6],K,None); pr=pr.reshape(-1,4,2)
        m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.round(a*4).astype(np.int32) for a in pr],255,shift=2)
        cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); C=np.vstack([x.reshape(-1,2) for x in cs]).astype(float)
        d=[np.sqrt(((C-np.array(q))**2).sum(1)).min() for q in TR[nm]['traced']]; out+=d
        if verbose: print(nm, 'mean %.1f max %.1f'%(np.mean(d),np.max(d)), np.round(d,1))
    return np.mean(out)
base=json.load(open('best.json'))
def build(P):
    NS2=[(z,s*(P['sc'] if z>2.3 else 1.0)) for z,s in NS]; return hull(P['NL']*1+0*P['sc'],NS2,P['lo'],P['hi'],P['z0'],P['z1'])
print('current'); score(build(base),True)
best=(score(build(base)),dict(base))
for it in range(3):
  for k,vals in (('hi',[3.0,3.4,3.8,4.2,4.8]),('sc',[0.8,0.85,0.9,0.95]),('z0',[1.8,2.0,2.2,2.5,2.8]),('z1',[3.6,3.9,4.1,4.3]),('lo',[3.0,3.5,4.0,4.5])):
    for v in vals:
        P=dict(best[1]); P[k]=v
        if P['z1']<=P['z0']+0.3: continue
        P['NL']=max(P['NL'], max(s*P['sc'] for z,s in NS if z>2.3))
        s=score(build(P))
        if s<best[0]: best=(s,P)
  print(it,best)
print('best'); score(build(best[1]),True)
json.dump(best[1],open('best.json','w'))
