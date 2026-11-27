import numpy as np, wave, sys
sr=48000; dur=float(sys.argv[2]); cut=float(sys.argv[3]); n=int(sr*dur); 
bpm=112; beat=60/bpm; bar=4*beat
def hz(m): return 440*2**((m-69)/12)
chords=[[57,60,64,67],[53,57,60,64],[48,52,55,60],[55,59,62,67]]  # Am7 Fmaj7 C G
L=np.zeros(n); R=np.zeros(n); rng=np.random.default_rng(3)
def add(s,w,g,pan=0.5):
    if s>=n: return
    e=min(n,s+len(w)); w=w[:e-s]; L[s:e]+=g*w*(1-pan); R[s:e]+=g*w*pan
nb=int(np.ceil(dur/bar))+1
for b in range(nb):
    ch=chords[b%4]; s=int(b*bar*sr); ln=int((bar+0.3)*sr); tt=np.arange(ln)/sr
    env=np.minimum(1,tt/0.05)*np.exp(-tt*0.6)
    for m in ch:
        f=hz(m); w=np.sign(np.sin(2*np.pi*f*tt))*0.25+np.sin(2*np.pi*f*tt)
        add(s,w*env,0.035,0.3); add(s,w*env,0.035,0.7)
    for k in range(8):
        ps=s+int(k*beat/2*sr); pt=np.arange(int(0.25*sr))/sr; f=hz(ch[0]-12)
        add(ps,np.sin(2*np.pi*f*pt)*np.exp(-pt*9),0.16)
    for k in range(4):
        ks=s+int(k*beat*sr); kt=np.arange(int(0.3*sr))/sr
        kick=np.sin(2*np.pi*(50+90*np.exp(-kt*30))*kt)*np.exp(-kt*12); add(ks,kick,0.5)
        if k%2==1:
            st=np.arange(int(0.2*sr))/sr; sn=rng.standard_normal(len(st))*np.exp(-st*20); add(ks,sn,0.12,0.45)
    for k in range(8):
        hs=s+int((k*beat/2+beat/4)*sr); ht=np.arange(int(0.05*sr))/sr
        h=rng.standard_normal(len(ht)); h=np.diff(np.concatenate([[0],h]))*np.exp(-ht*80); add(hs,h,0.06,0.6)
# riser into cut + impact
rs=int((cut-1.0)*sr); rt=np.arange(int(1.0*sr))/sr; ri=rng.standard_normal(len(rt))*(rt/1.0)**2; add(rs,np.diff(np.concatenate([[0],ri])),0.12)
it=np.arange(int(0.8*sr))/sr; add(int(cut*sr),np.sin(2*np.pi*(40+60*np.exp(-it*10))*it)*np.exp(-it*4),0.6)
fade=np.ones(n); fo=int(0.8*sr); fade[-fo:]=np.linspace(1,0,fo); fade[:int(0.05*sr)]=np.linspace(0,1,int(0.05*sr))
x=np.stack([L,R],1)*fade[:,None]; x/=np.abs(x).max()*1.1
w=wave.open(sys.argv[1],'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x*32767).astype('<i2').tobytes()); w.close()
