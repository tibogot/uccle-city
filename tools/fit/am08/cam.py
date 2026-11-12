import cv2, numpy as np, json, sys
HW=1.43
def door_pts(s):
    P=[]
    for a,b in ((6.95,8.35),(21.0,22.4)):
        P += [(-a,s*HW,2.95),(-a,s*HW,1.0),(-b,s*HW,2.95),(-b,s*HW,1.0)]
    return np.array(P,float)
OBS={
 'stjob': dict(size=(1920,1280), img=[(831,552),(830,731),(799,555),(800,723),(673,573),(673,681),(662,574),(662,679)]),
 'cal25': dict(size=(1920,1280), img=[(1044,657),(1047,855),(1021,660),(1023,850),(906,675),(906,818),(893,677),(894,815)]),
}
def solve(name):
    o=OBS[name]; W,H=o['size']; img=np.array(o['img'],float); best=None
    for s in (1,-1):
        P=door_pts(s)
        for f in np.linspace(600,6000,271):
            K=np.array([[f,0,W/2],[0,f,H/2],[0,0,1]])
            ok,r,t=cv2.solvePnP(P,img,K,None,flags=cv2.SOLVEPNP_IPPE)
            if not ok: continue
            ok,r,t=cv2.solvePnP(P,img,K,None,r,t,True,cv2.SOLVEPNP_ITERATIVE)
            pr,_=cv2.projectPoints(P,r,t,K,None); e=np.sqrt(((pr[:,0]-img)**2).sum(1).mean())
            R,_=cv2.Rodrigues(r); C=-R.T@t
            if C[2,0]<0.3 or C[2,0]>4: continue   # camera height on a platform
            if best is None or e<best[0]: best=(e,s,f,r,t,C.ravel())
    return best
if __name__=='__main__':
    out={}
    for n in OBS:
        e,s,f,r,t,C=solve(n); print(n,'rms px',round(e,2),'side',s,'f',round(f),'cam',C.round(2), 'fov_v', round(2*np.degrees(np.arctan(OBS[n]['size'][1]/2/f)),1))
        out[n]=dict(rms=e,side=s,f=f,r=r.ravel().tolist(),t=t.ravel().tolist(),C=C.tolist(),size=OBS[n]['size'])
    json.dump(out,open('cams.json','w'),indent=1)
