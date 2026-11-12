import cv2, numpy as np, json
from cam import OBS, solve
FEAT={ # name: (stjob px, cal25 px)
 'B':((1228,640),(1354,741)), 'HLn':((1148,686),(1271,790)), 'HLf':((1300,686),(1430,784)),
 'WF':((1228,604),(1325,710)), 'YB':((1228,689),(1357,804)), 'DSP':((1153,493),(1300,602)), 'WT':((1180,506),(1321,618))}
LINES={'stjob':[(1320,650),(1321,690)], 'cal25':[(1470,702),(1476,793)]}
names=['stjob','cal25']
def unpack(p):
    cams=[p[0:7],p[7:14]]; q=p[14:]
    pts={'B':(0,0,q[0]),'HLn':(q[1],-q[2],q[3]),'HLf':(q[1],q[2],q[3]),'WF':(q[4],0,q[5]),'YB':(q[6],0,q[7]),'DSP':(q[8],0,q[9]),'WT':(q[10],0,q[11])}
    s1,z0,z1,xl=q[12],q[13],q[14],q[15]
    return cams,pts,s1,z0,z1,xl
def proj(c,X,W,H):
    f=c[6]; K=np.array([[f,0,W/2],[0,f,H/2],[0,0,1]]); q,_=cv2.projectPoints(np.array(X,float).reshape(-1,3),c[:3],c[3:6],K,None); return q.reshape(-1,2)
def resid(p,wh=5.0):
    cams,pts,s1,z0,z1,xl=unpack(p); res=[]
    for i,n in enumerate(names):
        W,H=OBS[n]['size']; c=cams[i]
        for k,v in FEAT.items(): res+=list(proj(c,pts[k],W,H)[0]-np.array(v[i]))
        D=[]
        for a,b in ((s1,s1+1.40),(s1+14.05,s1+15.45)):
            D+=[(-a,-1.43,z1),(-a,-1.43,z0),(-b,-1.43,z1),(-b,-1.43,z0)]
        res+=list((proj(c,D,W,H)-np.array(OBS[n]['img'])).ravel())
        a,b=proj(c,[(xl,1.43,1.2),(xl,1.43,2.2)],W,H); d=(b-a)/np.linalg.norm(b-a); nr=np.array([-d[1],d[0]])
        for q in LINES[n]: res.append(np.dot(np.array(q)-a,nr))
        R,_=cv2.Rodrigues(c[:3]); C=-R.T@c[3:6]; res.append(wh*(C[2]-2.3))
    res.append(10*(z1-z0-1.95))   # door leaf height 1.95 (estimate) - weak metric
    return np.array(res)
def gn(p):
    lam=1e-3
    for it in range(300):
        r0=resid(p); J=np.zeros((len(r0),len(p)))
        for k in range(len(p)):
            q=p.copy(); h=1e-6 if k%7<6 or k>=14 else 1e-2; q[k]+=h; J[:,k]=(resid(q)-r0)/h
        A=J.T@J; g=J.T@r0
        dp=np.linalg.solve(A+lam*np.diag(np.diag(A)+1e-9),-g)
        if (resid(p+dp)**2).sum()<(r0**2).sum(): p=p+dp; lam*=0.5
        else: lam*=4
        if np.abs(dp).max()<1e-8: break
    return p
init=[]
for n in names:
    e,s,f,r,t,C=solve(n); init+=list(r.ravel())+list(t.ravel())+[f]
q0=[1.0, -0.3,0.95,1.7, -0.6,2.5, 0.0,1.6, -1.5,3.6, -1.2,3.4, 8.0,1.0,2.95,-1.0]
p=gn(np.array(init+q0,float))
r=resid(p); cams,pts,s1,z0,z1,xl=unpack(p)
print('total rms px', np.sqrt((r[:-1]**2).mean()).round(2))
for i,n in enumerate(names):
    R,_=cv2.Rodrigues(cams[i][:3]); C=-R.T@cams[i][3:6]; print(n,'f',cams[i][6].round(),'C',C.round(2))
for k,v in pts.items(): print(k,np.round(v,2))
print('door1 from B',round(s1,2),'door z',round(z0,2),round(z1,2),'xl',round(xl,2))
json.dump(dict(p=p.tolist()),open('sfm.json','w'))
