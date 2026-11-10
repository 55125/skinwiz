// Renders a notes-app timeline (beats of kind "notes", "comment", "note", "end") to PNG frames, like render.js does for chats.
const {chromium}=require('playwright');const fs=require('fs');
const [tlPath,outDir]=process.argv.slice(2);const tl=JSON.parse(fs.readFileSync(tlPath));
const SUB='Save your avoid list once, then check any product against it.';
(async()=>{const p=process.env.HTTPS_PROXY;const b=await chromium.launch({proxy:p?{server:p}:undefined,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--ignore-certificate-errors']});
const pg=await b.newPage({viewport:{width:1080,height:1920}});await pg.goto('file://'+__dirname+'/notes.html');await pg.evaluate(()=>document.fonts.ready);
const end=await b.newPage({viewport:{width:1080,height:1920}});await end.goto('file://'+__dirname+`/end.html?sub=${encodeURIComponent(SUB)}&d=0`);await end.evaluate(()=>document.fonts.ready);await end.waitForTimeout(400);
await end.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));
let f=0,prevKey=null,prevFile=null,lines=[],comment=null;
for(const bt of tl.beats){
 if(bt.kind==='notes')lines=lines.concat([bt.text]);
 for(let i=0;i<bt.frames;i++,f++){const local=i/tl.fps;const file=`${outDir}/${String(f).padStart(5,'0')}.png`;let st,key;
  if(bt.kind==='end'){const t=Math.min(local,2.5)*1000;key='end'+t;
   if(key===prevKey){fs.copyFileSync(prevFile,file);continue}
   await end.evaluate(t=>document.getAnimations().forEach(a=>a.currentTime=t),t);await end.screenshot({path:file});prevKey=key;prevFile=file;continue}
  if(bt.kind==='notes'){const typeFor=bt.type_seconds||0.6;const n=bt.text.length;const typing=local>=typeFor?null:Math.ceil(n*local/typeFor);
   const blink=Math.floor(local*2)%2===0;st={title:tl.note_title,lines,typing,cursor:typing!=null||blink,local};key=typing==null?JSON.stringify({l:lines.length,blink}):null}
  else if(bt.kind==='comment'){comment={user:bt.user,text:bt.text,local};st={title:tl.note_title,lines,typing:null,cursor:false,comment,local};key=local>0.8?'comment'+lines.length:null}
  else if(bt.kind==='note'){st={title:tl.note_title,lines,typing:null,cursor:false,comment:comment&&{...comment,local:9},note:bt.lines,local:local>2.0?3:local};key=local>2.0?'note'+bt.beat:null}
  if(key&&key===prevKey){fs.copyFileSync(prevFile,file);continue}
  await pg.evaluate(s=>render(s),st);await pg.screenshot({path:file});prevKey=key;prevFile=file}}
console.log('frames',f);await b.close()})();
