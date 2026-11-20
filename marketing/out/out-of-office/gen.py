import json,subprocess
def d(f): return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
T={};t=0.4
for f in ['b1','b3','b4']: T[f]=round(t,2); t+=d(f'c_{f}.wav')+0.3
T['m1']=round(t+0.1,2); t=T['m1']+d('c_m1.wav')+0.3
T['f1']=round(t,2); t+=d('c_f1.wav')
T['junk']=round(t+0.15,2); T['card']=round(t+1.4,2); T['n1']=round(T['card']+0.3,2); T['total']=round(T['card']+4,2)
json.dump(T,open('timeline.json','w'),indent=1); print(T)
paras=[('b1','Thank you for your email. I am out of office until my face stops being warm.'),
('b3','Any new products sent during this time will be <b>deleted</b>. If it&rsquo;s important, please resend once you&rsquo;ve read the ingredients.'),
('b4','For urgent matters, please contact <b>Moisturizer</b>.<br><span class=sig>Skin Barrier</span> &middot; <span class=sent>Sent from my face</span>')]
body=''.join(f'<p style="animation:in .3s ease-out forwards {T[k]}s">{h}</p>' for k,h in paras)
def mini(k,av,col,name,subj,txt,extra=''):
    return f'''<div class="mini {k}" style="animation:up .4s cubic-bezier(.2,1.2,.4,1) forwards {T[k]}s{extra}"><div class=mh><div class=av style="background:{col}">{av}</div><div><b>{name}</b><span>{subj}</span></div><em>now</em></div><div class=mt>{txt}</div>
{'<div class=junk style="animation:in .25s ease-out forwards %ss">Moved to Junk &middot; Fragrance is on your avoid list</div>'%T['junk'] if k=='f1' else ''}</div>'''
minis=mini('m1','M','oklch(0.62 0.07 230)','Moisturizer','Automatic reply: Re: urgent','I&rsquo;m also out of office. I&rsquo;m with Skin Barrier. It&rsquo;s bad.',f", lift .35s ease-out forwards {T['f1']-0.05}s")
minis+=mini('f1','F','oklch(0.62 0.17 350)','Fragrance &#x1F6A9;','Re: urgent','Hiii &#x1F618; I&rsquo;m always available.',f", junkit .5s ease-in forwards {T['junk']+0.7}s")
html=f'''<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Geist:wght@400;500;600;700&display=block" rel="stylesheet">
<style>
:root{{--bg:oklch(0.955 0.01 92);--ink:oklch(0.22 0.02 250);--muted:oklch(0.5 0.015 250);--teal:oklch(0.46 0.085 188);--line:oklch(0.88 0.01 90)}}
*{{margin:0;box-sizing:border-box}}
html,body{{width:1080px;height:1920px;overflow:hidden;font-family:Geist,sans-serif;color:var(--ink);background:var(--bg)}}
.hook{{position:absolute;top:120px;left:80px;right:80px;font-family:Fraunces,serif;font-weight:600;font-size:80px;line-height:1.05;letter-spacing:-1.5px}}
.hook em{{font-style:normal;color:var(--teal)}}
.app{{position:absolute;top:400px;left:50px;right:50px;bottom:110px;background:white;border-radius:48px;box-shadow:0 30px 90px rgba(20,40,40,.16),0 0 0 3px var(--line);overflow:hidden}}
.bar{{display:flex;gap:16px;padding:30px 40px;border-bottom:3px solid var(--line);align-items:center}}
.bar i{{width:22px;height:22px;border-radius:50%;background:var(--line)}}
.bar span{{margin-left:auto;font-size:28px;color:var(--muted)}}
.head{{padding:32px 48px 26px;border-bottom:3px solid var(--line)}}
.subj{{font-size:42px;font-weight:700;line-height:1.2}}
.from{{display:flex;gap:24px;align-items:center;margin-top:22px}}
.av{{flex:none;width:80px;height:80px;border-radius:50%;background:oklch(0.72 0.08 30);color:white;font-weight:700;font-size:36px;display:grid;place-items:center}}
.from b,.mh b{{font-size:34px;display:block}}.from span,.mh span{{font-size:27px;color:var(--muted)}}
.body{{padding:34px 48px}}
.body p{{font-size:40px;line-height:1.34;margin-bottom:26px;opacity:0;transform:translateY(16px)}}
.sig{{font-weight:700}}.sent{{color:var(--muted);font-style:italic}}
.mini{{position:absolute;left:70px;right:70px;background:white;border-radius:36px;padding:30px 36px;box-shadow:0 24px 70px rgba(20,30,40,.28),0 0 0 3px var(--line);opacity:0;transform:translateY(300px)}}
.mini.m1{{bottom:150px}}.mini.f1{{bottom:130px}}
@keyframes lift{{from{{opacity:1;transform:none}}to{{opacity:1;transform:translateY(-290px)}}}}
.mh{{display:flex;gap:22px;align-items:center}}.mh em{{margin-left:auto;font-style:normal;font-size:26px;color:var(--muted)}}
.mt{{font-size:40px;line-height:1.3;margin-top:18px}}
.junk{{margin-top:20px;font-size:30px;font-weight:700;color:white;background:oklch(0.55 0.19 25);border-radius:14px;padding:14px 20px;opacity:0}}
@keyframes in{{to{{opacity:1;transform:none}}}}
@keyframes up{{to{{opacity:1;transform:none}}}}
@keyframes junkit{{to{{opacity:.0;transform:translateX(900px) rotate(8deg)}}}}
</style></head><body>
<div class="hook">My skin barrier set an <em>out&#8209;of&#8209;office</em>.</div>
<div class="app"><div class="bar"><i></i><i></i><i></i><span>Inbox</span></div>
<div class="head"><div class="subj">Automatic reply: Re: Re: Re: is this toner ok??</div>
<div class="from"><div class="av">SB</div><div><b>Skin Barrier</b><span>to me &middot; 9:41 AM</span></div></div></div>
<div class="body">{body}</div></div>{minis}</body></html>'''
open('chat.html','w').write(html)
