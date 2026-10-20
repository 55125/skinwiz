const {chromium}=require('playwright');const fs=require('fs');
const [tlPath,outDir]=process.argv.slice(2);const tl=JSON.parse(fs.readFileSync(tlPath));
const SUB={1:'Fragrance can go by many names on a label.',2:'Save your avoid list once, then check any product against it.',3:'Save your avoid list once, then check any product against it.'};
const lighten=h=>{const n=parseInt(h.slice(1),16);const f=c=>Math.round(c+(255-c)*.35);return `rgb(${f(n>>16)},${f((n>>8)&255)},${f(n&255)})`};
(async()=>{const p=process.env.HTTPS_PROXY;const b=await chromium.launch({proxy:p?{server:p}:undefined,args:['--ignore-certificate-errors']});
const chat=await b.newPage({viewport:{width:1080,height:1920}});await chat.goto('file://'+__dirname+'/chat.html');await chat.evaluate(()=>document.fonts.ready);
const endBeat=tl.beats.find(x=>x.kind==='end');const d=endBeat&&endBeat.spoken.startsWith('Fragrance')?3.0:0;
const end=await b.newPage({viewport:{width:1080,height:1920}});await end.goto('file://'+__dirname+`/end.html?sub=${encodeURIComponent(SUB[tl.part])}&d=${d}`);await end.evaluate(()=>document.fonts.ready);await end.waitForTimeout(400);
await end.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));
let f=0;let prevKey=null;let prevFile=null;
for(const bt of tl.beats){for(let i=0;i<bt.frames;i++,f++){const local=i/tl.fps;const file=`${outDir}/${String(f).padStart(5,'0')}.png`;
 if(bt.kind==='end'){const t=Math.min(local,d+2.5)*1000;const key='end'+t;
  if(key===prevKey){fs.copyFileSync(prevFile,file);continue}
  await end.evaluate(t=>document.getAnimations().forEach(a=>a.currentTime=t),t);await end.screenshot({path:file});prevKey=key;prevFile=file;continue}
 const c=bt.contact||{};const msgs=(bt.messages||[]).map(m=>[m.from,m.text]);
 let newIndex=-1;if(bt.new_message){newIndex=msgs.length-1}
 const st={series:tl.series,part:tl.part,title:tl.title,kind:bt.kind==='scan'?'scan':'chat',result:bt.result,flagged:(bt.flagged||[]).join(', '),
  contact:{name:c.name,sub:c.subtitle,initials:c.initials,color:c.colour,color2:c.colour?lighten(c.colour):''},msgs,newIndex,toast:bt.toast,local};
 const settled=bt.kind==='scan'&&!bt.result?false:local>0.7;const key=settled?JSON.stringify({...st,local:1}):null;
 if(key&&key===prevKey){fs.copyFileSync(prevFile,file);continue}
 if(settled)st.local=1;await chat.evaluate(s=>render(s),st);await chat.screenshot({path:file});prevKey=key;prevFile=file;}}
console.log('frames',f);await b.close()})();
