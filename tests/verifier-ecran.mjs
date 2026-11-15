// Vérification de l'adaptation à l'écran de LightPhysics (Chrome headless, tactile émulé).
// Pour chaque taille (téléphone droit et couché, tablette, ordinateur, cadre d'un cours) : le canvas remplit
// la fenêtre, le menu tient dans la fenêtre, le plateau est centré dans la zone laissée libre par le menu et
// n'est pas sous les boutons, toucher un objet ouvre sa fiche, la barre d'échelle a la longueur du segment
// de la flèche. Puis rotation de l'écran sans rechargement. Les captures vont dans le dossier donné.
//
// Usage (depuis la racine du dépôt) :
//   python3 -m http.server 8791 &
//   node --experimental-websocket tests/verifier-ecran.mjs /tmp/lp-captures
// Le script s'arrête avec le code 1 si un contrôle échoue. Ce dossier n'est pas publié sur le site.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
const out=process.argv[2]||'.', url=process.argv[3]||'http://127.0.0.1:8791/index.html';
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const p=spawn(chrome,['--headless=new','--remote-debugging-port=9334','--hide-scrollbars','--user-data-dir='+out+'/profil','about:blank'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,2000));
const list=await (await fetch('http://127.0.0.1:9334/json')).json();
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pending=new Map();const erreurs=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result||m.error);pending.delete(m.id);}
  if(m.method==='Runtime.exceptionThrown')erreurs.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')erreurs.push(m.params.args.map(a=>a.value).join(' '));};
const send=(method,params={})=>new Promise(r=>{pending.set(++id,r);ws.send(JSON.stringify({id,method,params}));});
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});return r.result?.value??r;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await send('Page.enable');await send('Runtime.enable');
const mesure=`(()=>{const c=document.querySelector('canvas').getBoundingClientRect(),e=Ecran.etat(),z=Pesanteur.zoneLibre(),s=e.monde.s,pl=boxes[0],
 col=document.querySelector('.pz-colonne').getBoundingClientRect(),btn=[...document.querySelectorAll('#pesanteur button')].map(b=>b.getBoundingClientRect()),
 controles=[...document.querySelectorAll('#pesanteur button, #pesanteur .pz-g')].map(b=>b.getBoundingClientRect()),
 P={x0:(pl.body.position.x-pl.w/2)*s,x1:(pl.body.position.x+pl.w/2)*s,y0:(pl.body.position.y-10)*s,y1:(pl.body.position.y+10)*s};
 const libreCss={x0:z.x0*s,x1:z.x1*s};
 return {fenetre:[innerWidth,innerHeight],canvas:[Math.round(c.left),Math.round(c.top),Math.round(c.width),Math.round(c.height)],monde:[e.monde.w,e.monde.h,+s.toFixed(3)],pd:+e.pixelDensity.toFixed(2),
  enHaut:Pesanteur.menuEnHaut(),zone:[Math.round(z.x0),Math.round(z.y0)],
  plateauCss:[Math.round(P.x0),Math.round(P.x1),Math.round(P.y0)],
  centrePlateau:Math.round((P.x0+P.x1)/2),centreZoneLibre:Math.round((libreCss.x0+libreCss.x1)/2),centreFenetre:Math.round(innerWidth/2),
  plateauSousMenu:controles.some(r=>r.right>P.x0&&r.left<P.x1&&r.bottom>P.y0&&r.top<P.y1),
  boutonMin:[Math.round(Math.min(...btn.map(b=>b.width))),Math.round(Math.min(...btn.map(b=>b.height)))],
  menuDansFenetre:col.left>=0&&col.right<=innerWidth+0.5&&btn.every(b=>b.bottom<=innerHeight+0.5&&b.right<=innerWidth+0.5),
  debordement:document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight,
  objets:boxes.length-1+balls.length,lampes:lights.map(l=>[Math.round(l.pos.x),Math.round(l.pos.y)])[0]};})()`;
const res=[];
for(const [w,h,tactile] of [[360,640,1],[640,360,1],[768,1024,1],[1024,768,1],[1366,768,0],[1920,1080,0],[900,620,0]]){
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:tactile?2:1,mobile:!!tactile});
  await send('Emulation.setTouchEmulationEnabled',{enabled:!!tactile});
  await send('Page.navigate',{url});await wait(4500);
  const m=await ev(mesure);
  // toucher un objet : on prend le premier objet mobile et on tape dessus
  const cible=await ev(`(()=>{const o=[...boxes.slice(1),...balls].find(o=>o.body.position.y>80&&o.body.position.y<height-20);if(!o)return null;const s=Ecran.monde().s;return {x:o.body.position.x*s,y:o.body.position.y*s};})()`);
  let fiche='(aucun objet à toucher)';
  if(cible){ if(tactile){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cible.x,y:cible.y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
    else{await send('Input.dispatchMouseEvent',{type:'mousePressed',x:cible.x,y:cible.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:cible.x,y:cible.y,button:'left',clickCount:1});}
    await wait(300);fiche=await ev(`(()=>{const e=Pesanteur.etat();const f=document.querySelector('.pz-fiche').getBoundingClientRect();return {sel:e.selection?e.selection.type+' '+e.selection.masseKg+' kg':null,ficheVisible:f.height>0,ficheDansFenetre:f.bottom<=innerHeight+0.5&&f.right<=innerWidth+0.5,barre:document.querySelector('.pz-barre')?Math.round(document.querySelector('.pz-barre').getBoundingClientRect().width*100)/100:null,attendu:Math.round(20*Ecran.monde().s*100)/100};})()`);}
  const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out+'/lp-'+w+'x'+h+'.png',Buffer.from(shot.data,'base64'));
  res.push({...m,fiche});console.log(JSON.stringify({...m,fiche}));
}
// rotation à chaud : 360×640 -> 640×360 sans recharger
await send('Emulation.setDeviceMetricsOverride',{width:360,height:640,deviceScaleFactor:2,mobile:true});await send('Page.navigate',{url});await wait(3500);
const avant=await ev(mesure);
await send('Emulation.setDeviceMetricsOverride',{width:640,height:360,deviceScaleFactor:2,mobile:true});await wait(1200);
const apres=await ev(mesure);
console.log('ROTATION',JSON.stringify({avant:[avant.monde,avant.plateauCss,avant.enHaut],apres:[apres.monde,apres.canvas,apres.plateauCss,apres.enHaut,apres.plateauSousMenu,apres.centrePlateau,apres.centreZoneLibre],plateaux:await ev('boxes.filter(b=>b.estPlateau).length+"/"+Matter.Composite.allBodies(world).filter(b=>b.isStatic).length')}));
console.log('ERREURS',JSON.stringify(erreurs));
const fautes=res.filter(m=>m.canvas[2]!==m.fenetre[0]||m.canvas[3]!==m.fenetre[1]||Math.abs(m.centrePlateau-m.centreZoneLibre)>1||m.plateauSousMenu||!m.menuDansFenetre||m.debordement||m.boutonMin[1]<44
  ||typeof m.fiche!=='object'||!m.fiche.sel||!m.fiche.ficheVisible||!m.fiche.ficheDansFenetre||Math.abs(m.fiche.barre-m.fiche.attendu)>0.5);
const rotationOk=apres.canvas[2]===640&&apres.canvas[3]===360&&!apres.enHaut&&!apres.plateauSousMenu&&Math.abs(apres.centrePlateau-apres.centreZoneLibre)<=1;
console.log(fautes.length||!rotationOk||erreurs.length?'ÉCHEC : '+JSON.stringify({fautes:fautes.map(m=>m.fenetre),rotationOk,erreurs}):'OK : '+res.length+' tailles et la rotation');
p.kill();process.exit(fautes.length||!rotationOk||erreurs.length?1:0);
