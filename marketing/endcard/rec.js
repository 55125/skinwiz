const {chromium}=require('playwright');
(async()=>{const p=process.env.HTTPS_PROXY;const b=await chromium.launch({proxy:p?{server:p}:undefined,args:['--ignore-certificate-errors']});
const pg=await b.newPage({viewport:{width:1080,height:1920}});await pg.goto('file://'+process.cwd()+'/card.html');await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(500);
const fps=30,dur=4;await pg.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));
for(let f=0;f<fps*dur;f++){const t=f*1000/fps;await pg.evaluate(t=>document.getAnimations().forEach(a=>a.currentTime=t),t);await pg.screenshot({path:`frames/${String(f).padStart(4,'0')}.png`});}
console.log(await pg.evaluate(()=>[...document.fonts].filter(f=>f.status=='loaded').map(f=>f.family).join(',')));await b.close();})();
