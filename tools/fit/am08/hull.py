import numpy as np, cv2, json
HW=1.43
PROFILE = [(0.0, 0.80), (0.70, 0.80), (1.18, 0.80), (1.32, 0.83), (1.385, 0.90), (1.41, 1.0), (1.418, 1.05), (1.425, 1.20),
           (1.428, 1.36), (1.43, 1.55), (1.43, 1.72), (1.43, 1.86), (1.43, 2.05), (1.429, 2.30), (1.425, 2.55), (1.418, 2.75),
           (1.41, 2.95), (1.40, 3.05), (1.385, 3.15), (1.373, 3.24), (1.36, 3.33), (1.338, 3.43), (1.31, 3.52), (1.26, 3.64),
           (1.20, 3.76), (1.10, 3.86), (1.02, 3.95), (0.92, 4.01), (0.78, 4.07), (0.62, 4.10), (0.45, 4.13), (0.24, 4.145), (0.0, 4.15)]
OLD=dict(NOSE_L=1.62, LF=[(0.62, 1.50), (0.80, 1.60), (1.10, 1.62), (1.50, 1.60), (1.95, 1.50), (2.55, 1.13), (3.10, 0.78), (3.45, 0.55),
      (3.76, 0.33), (3.95, 0.18), (4.07, 0.08), (4.15, 0.0)], SUP=[(1.7,3.4),(2.7,2.2)], smooth=True)
def interp(tab,z):
    zs=[a for a,_ in tab]; vs=[b for _,b in tab]; return np.interp(z,zs,vs)
def sup_old(z):
    t=np.clip((z-1.7)/1.0,0,1); t=t*t*(3-2*t); return 3.4+(2.2-3.4)*t
def ring():
    right=[(-y,z) for y,z in PROFILE]; left=[(y,z) for y,z in reversed(PROFILE[1:-1])]
    return np.array(right+left)
def hull(P, K=26, back=12.0):
    """quads (N,4,3) of the shell, x=0 coupler face. P: NOSE_L, LF table, sup(z) fn or table"""
    rg=ring(); y=rg[:,0]; z=rg[:,1]
    xbf=-P['NOSE_L']
    rows=[]
    for x in np.linspace(xbf-back, xbf, 10): rows.append(np.stack([np.full_like(y,x),y,z],1))
    lf=interp(P['LF'],z)
    n = sup_old(z) if P.get('smooth') else interp(P['SUP'],z)
    for k in range(1,K+1):
        th=np.pi/2*k/K; s,c=np.sin(th),np.cos(th)
        rows.append(np.stack([xbf+lf*max(s,0)**(2/n), y*max(c,0)**(2/n), z],1))
    R=np.array(rows); nr,nv,_=R.shape
    q=[]
    for i in range(nr-1):
        for j in range(nv):
            jj=(j+1)%nv; q.append([R[i,j],R[i,jj],R[i+1,jj],R[i+1,j]])
    return np.array(q)
def cam(c):
    W,H=c['size']; f=c['f']; K=np.array([[f,0,W/2],[0,f,H/2],[0,0,1]])
    return np.array(c['r']),np.array(c['t']),K,W,H
def mask(Q,c):
    r,t,K,W,H=cam(c)
    p,_=cv2.projectPoints(Q.reshape(-1,3),r,t,K,None); p=p.reshape(-1,4,2)
    m=np.zeros((H,W),np.uint8)
    cv2.fillPoly(m,[np.round(a*8).astype(np.int32) for a in p],255,shift=3)
    return m
def proj(X,c):
    r,t,K,W,H=cam(c); p,_=cv2.projectPoints(np.array(X,float).reshape(-1,3),r,t,K,None); return p.reshape(-1,2)
