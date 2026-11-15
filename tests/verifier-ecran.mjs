// Vérification de l'adaptation à l'écran de LightPhysics (Chrome headless, tactile émulé).
// Pour chaque taille (téléphone droit et couché, tablette, ordinateur, cadre d'un cours) : le canvas remplit
// la fenêtre, le menu tient dans la fenêtre, le plateau est centré dans la zone laissée libre par le menu et
// n'est pas sous les boutons, toucher un objet ouvre sa fiche, la barre d'échelle a la longueur du segment
// de la flèche. Puis rotation de l'écran sans rechargement. Les captures vont dans le dossier donné.
// Protocole (masse et poids) : au lancement, la carte est ouverte, tient dans la fenêtre (sans défiler, sauf
// sur un téléphone couché, où l'indice « suite ↓ » est alors visible jusqu'au bas de la carte) et le bouton
// s'appelle « Protocole » (capture lp-<taille>-protocole.png) ; aucune phrase affirmative de l'interface
// (protocole, fiche, boutons, ligne de g, libellés accessibles) ne donne la conclusion. On suit ensuite le
// protocole au doigt ou à la souris : Pause, toucher un objet (sur un grand écran où les deux cartes tiennent,
// le protocole reste ouvert et la fiche s'affiche dessous ; sinon le protocole se replie et la fiche prend sa
// place), Lune, Mars, Terre (le même objet reste choisi, la fiche donne P = m × g de l'astre), le bouton
// Protocole replie et déplie la carte, puis « Lâcher ensemble » sur la scène encombrée par les objets tombés.
// « Lâcher ensemble » (étapes 3 et 4) : scène vidée, caisse et ballon entièrement au-dessus du plateau, à 20
// unités au moins l'un de l'autre, le bas à la même hauteur ; premier contact de chacun (relevé par un écouteur
// collisionStart propre au test) avec le plateau, au même instant à un pas de simulation près ; pas
// d'apparition pendant l'expérience, reprise ensuite. À toutes les tailles sur Terre ; puis, sur une scène
// encore plus encombrée (objets ajoutés), à 360×640 et 1366×768, sur la Terre et sur la Lune, après une pause
// (que le bouton enlève) et, une fois, en rappuyant pendant la chute ; sur la Lune, la caisse est touchée
// pendant sa chute (elle est choisie, sa fiche s'affiche, elle n'est pas saisie) ; sur le téléphone tenu droit,
// la carte du protocole se replie à l'appui (elle reste ouverte dans la colonne) ; capture
// lp-<taille>-lacher-<astre>.png prise au pas du contact, physique arrêtée, avant le rebond du ballon.
// Puis : doigt resté posé sur le trajet de la caisse pendant toute la chute (rien n'est saisi) ; rotation et
// agrandissement du cadre pendant la chute, appui 0 ms et 40 ms après une rotation (l'expérience est relancée
// sur le nouveau plateau, arrivée simultanée sur ce plateau).
// Le toucher d'un objet pour lire sa fiche est déterministe : pause vérifiée, objet entièrement visible et seul
// sous son centre (sinon posé par le test), sélection vérifiée, un seul nouvel essai journalisé (« TOUCHER RATÉ »).
//
// Usage (depuis la racine du dépôt) :
//   python3 -m http.server 8791 &
//   node --experimental-websocket tests/verifier-ecran.mjs /tmp/lp-captures
// Le script s'arrête avec le code 1 si un contrôle échoue. Ce dossier n'est pas publié sur le site.
import {spawn} from 'node:child_process';
import fs from 'node:fs';
const out=process.argv[2]||'.', url=process.argv[3]||'http://127.0.0.1:8791/index.html';
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// Garde-fou : un test bloqué (Chrome qui ne répond plus) échoue au bout de 12 minutes au lieu d'attendre sans fin.
let p=null;setTimeout(()=>{console.log('ÉCHEC : délai de 12 minutes dépassé');p?.kill();process.exit(1);},12*60*1000);
p=spawn(chrome,['--headless=new','--remote-debugging-port=9334','--hide-scrollbars','--user-data-dir='+out+'/profil','about:blank'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,2000));
const list=await (await fetch('http://127.0.0.1:9334/json')).json();
const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const pending=new Map();const erreurs=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m.result||m.error);pending.delete(m.id);}
  if(m.method==='Runtime.exceptionThrown')erreurs.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')erreurs.push(m.params.args.map(a=>a.value).join(' '));};
const send=(method,params={})=>new Promise(r=>{pending.set(++id,r);ws.send(JSON.stringify({id,method,params}));});
// Valeur de l'expression évaluée dans la page. Attention : une valeur null doit rester null (autrefois
// « r.result?.value ?? r » rendait alors la réponse brute, un objet toujours vrai : « aucun objet visible à
// toucher » passait pour une cible, le test touchait un point indéfini et ne choisissait rien, au hasard des
// objets présents à 360×640 ; c'était la cause de l'échec intermittent « sel: null »).
const ev=async e=>{const r=await send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)return {erreurEval:r.exceptionDetails.exception?.description||r.exceptionDetails.text};
  return r.result?r.result.value:r;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Network.setCacheDisabled',{cacheDisabled:true});
// Appui au doigt (tactile) ou clic (souris) au milieu d'un élément du menu.
const appui=async(selecteur,tactile)=>{const c=await ev(`(()=>{const r=document.querySelector(${JSON.stringify(selecteur)}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
  if(tactile){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:c.x,y:c.y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await send('Input.dispatchMouseEvent',{type:'mousePressed',x:c.x,y:c.y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:c.x,y:c.y,button:'left',clickCount:1});}
  await wait(250);};
// Phrases qui donneraient la conclusion à l'élève. Le contrôle porte sur toutes les phrases, questions comprises
// (une question peut contenir la réponse) ; seules les questions neutres attendues du protocole en sont exemptées.
const CONCLUSIONS=/même sur tous|(reste|est|sont) (la |les )?mêmes?\b|ne change(nt)? pas|ne varie(nt)? pas|invariable|constant|\bvari(e|ent|able)\b|change(nt)? (selon|avec|d.un astre|d.astre)|dépend|ensemble (sur|au|en bas)|(tombent|arrivent|touchent|chutent) ensemble|(en|au) même (temps|moment|instant)|simultan|comme dans le vide|plus vite|moins vite|plus tôt|plus tard|en premier|le premier|la première/i;
const normaliser=x=>x.replace(/\s+/g,' ').replace(/[’']/g,'’').trim();
const QUESTIONS_NEUTRES=new Set(['Qu’est-ce qui change ?','Qu’est-ce qui ne change pas ?',
  'Prévois et écris : la caisse de 20 kg arrivera-t-elle sur le plateau avant le ballon de 0,32 kg, après lui, ou en même temps ?'].map(normaliser));
const phrasesQuiConcluent=textes=>textes.flatMap(t=>normaliser(t).split(/(?<=[.!?])\s+/)).map(x=>x.trim()).filter(x=>x&&!QUESTIONS_NEUTRES.has(x)&&CONCLUSIONS.test(x));
// Le contrôle lui-même : il doit refuser ces affirmations et ces questions orientées, et accepter les questions
// neutres du protocole et ces mentions neutres.
{const refusees=['m est constante.','La masse est invariable.','P varie selon l’astre.','Ils arrivent simultanément.','Ils touchent le plateau au même moment.','la même sur tous les astres','P change, m reste la même.','Ils tombent ensemble.','L’air est négligé, comme dans le vide.','La caisse arrive en premier.','Le poids dépend de l’astre.',
   'Pourquoi arrivent-ils en même temps ?','Vois-tu que la masse ne change pas ?','Pourquoi le poids dépend-il de l’astre ?'];
 const acceptees=['Qu’est-ce qui ne change pas ?','Qu’est-ce qui change ?','Prévois et écris : la caisse de 20 kg arrivera-t-elle sur le plateau avant le ballon de 0,32 kg, après lui, ou en même temps ?','Échelle de cet objet : = 50 N (elle change d’un objet à l’autre).','Lâcher ensemble','Dans cette simulation, on ne tient pas compte de l’air.','4. « Lâcher ensemble » : observe l’instant où chacun touche le plateau.'];
 const rates=refusees.filter(x=>!phrasesQuiConcluent([x]).length),fausses=acceptees.filter(x=>phrasesQuiConcluent([x]).length);
 if(rates.length||fausses.length){console.log('ÉCHEC du contrôle des conclusions : '+JSON.stringify({rates,fausses}));process.exit(1);}}
// Tous les textes que l'élève voit ou entend : paragraphes du protocole et de la fiche, boutons, ligne de g,
// libellés accessibles (section, groupe des astres, canvas).
const lireTextes=`(()=>{const t=e=>(e?.textContent||'').replace(/\\s+/g,' ').trim(),q=s=>[...document.querySelectorAll(s)];
  return [...q('#pz-protocole p, .pz-fiche h2, .pz-fiche p, #pesanteur button, .pz-g').map(t),...q('#pesanteur [aria-label], canvas[aria-label]').map(e=>e.getAttribute('aria-label'))].filter(Boolean);})()`;
// État de la carte du protocole et de la fiche.
const lireProtocole=`(()=>{const c=document.querySelector('#pz-protocole'),b=document.querySelector('.pz-bouton-protocole'),f=document.querySelector('.pz-fiche'),r=c.getBoundingClientRect(),e=Pesanteur.etat();
  return {bouton:b.textContent.trim(),expanded:b.getAttribute('aria-expanded'),controls:b.getAttribute('aria-controls'),carteVisible:r.height>0,ficheVisible:f.getBoundingClientRect().height>0,
   dansFenetre:r.top>=0&&r.left>=0&&r.bottom<=innerHeight+0.5&&r.right<=innerWidth+0.5,defile:c.scrollHeight>c.clientHeight+1,carte:[Math.round(r.top),Math.round(r.bottom),Math.round(r.height)],
   ouvert:e.protocoleOuvert,selection:e.selection?e.selection.id:null,deuxCartes:e.deuxCartes,
   ficheDefile:f.scrollHeight>f.clientHeight+1,ficheDansFenetre:f.getBoundingClientRect().bottom<=innerHeight+0.5,
   suite:(()=>{const x=c.querySelector('.pz-suite span'),q=x.getBoundingClientRect();return q.height>0&&q.bottom<=r.bottom+0.5&&q.top>=r.top;})()};})()`;
// Faire défiler la carte du protocole (en haut : 0, en bas : 1).
const defilerProtocole=async fin=>{await ev(`(()=>{const c=document.querySelector('#pz-protocole');c.scrollTop=${fin}?c.scrollHeight:0;})()`);await wait(150);};
// Toucher (doigt ou souris) un point de l'écran.
const toucherPoint=async(x,y,tactile)=>{
  if(tactile){await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  else{await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});}};
// Écouteurs propres au test (indépendants de pesanteur.js) : tous les contacts avec leur instant, les objets saisis
// par la contrainte de la souris (doigt), et, sur demande, l'arrêt de la physique au pas où les deux objets de
// « Lâcher ensemble » ont touché (capture prise avant le rebond du ballon).
const installerContacts=`(()=>{if(!window.__contacts){window.__contacts=[];window.__saisis=[];
  Matter.Events.on(engine,'collisionStart',e=>{for(const p of e.pairs)window.__contacts.push({a:p.bodyA.parent.id,b:p.bodyB.parent.id,t:engine.timing.timestamp});
    if(window.__figer){const l=Pesanteur.etat().lacher;if(l&&l.contacts.caisse&&l.contacts.ballon){runner.enabled=false;window.__figer=false;window.__fige=l.contacts;}}});
  Matter.Events.on(engine,'afterUpdate',()=>{if(mouseConstraint.body)window.__saisis.push({id:mouseConstraint.body.id,t:engine.timing.timestamp});});}return true;})()`;
const geometrieLacher=`(()=>{const e=Pesanteur.etat().lacher,pl=boxes.find(b=>b.estPlateau),c=boxes.find(b=>b.body.id===e.caisse),b=balls.find(o=>o.body.id===e.ballon);
  const C=c.body.bounds,B=b.body.bounds,P=pl.body.bounds;
  return {mobiles:boxes.length-1+balls.length,ecartEntre:+(B.min.x-C.max.x).toFixed(2),surPlateau:C.min.x>=P.min.x&&C.max.x<=P.max.x&&B.min.x>=P.min.x&&B.max.x<=P.max.x,
   basEgal:Math.abs(C.max.y-B.max.y)<1e-9,masses:[c.masseCentiemes/100,b.masseCentiemes/100],enPause:Pesanteur.enPause(),boutonPause:document.querySelector('.pz-bouton-pause').textContent,
   plateau:pl.body.id,caisse:e.caisse,ballon:e.ballon,enCours:e.enCours,saisissables:e.saisissables,protocoleOuvert:Pesanteur.etat().protocoleOuvert,menuEnHaut:Pesanteur.menuEnHaut()};})()`;
// Attend l'arrivée des deux objets de l'expérience EN COURS (relancée ou non) et vérifie, avec l'écouteur du test,
// leur premier contact : le plateau actuel, au même pas de simulation. capture : arrêt au pas du contact.
async function attendreArrivee({capture=null}={}){
  if(capture)await ev('window.__figer=true');
  let etat=null;
  for(let i=0;i<300;i++){etat=await ev('Pesanteur.etat().lacher');if(etat.contacts.caisse&&etat.contacts.ballon&&(!capture||await ev('!!window.__fige')))break;await wait(40);}
  if(capture){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out+'/'+capture,Buffer.from(shot.data,'base64'));
    await ev('(()=>{window.__fige=null;runner.enabled=!Pesanteur.enPause();return true;})()');}
  const arrivee=await ev(`(()=>{const l=Pesanteur.etat().lacher,pl=boxes.find(b=>b.estPlateau).body.id,k=window.__contacts,premier=id=>k.find(x=>x.a===id||x.b===id)||null,autre=(x,id)=>x?(x.a===id?x.b:x.a):null;
    const c=premier(l.caisse),b=premier(l.ballon),depart=Math.min(...[c,b].filter(Boolean).map(x=>x.t));
    return {caisse:c&&{avec:autre(c,l.caisse)===pl?'plateau':'objet '+autre(c,l.caisse),t:c.t},ballon:b&&{avec:autre(b,l.ballon)===pl?'plateau':'objet '+autre(b,l.ballon),t:b.t},
     plateauActuel:pl===l.plateau,relances:l.relances,saisisAvant:window.__saisis.filter(s=>(s.id===l.caisse||s.id===l.ballon)&&s.t<depart).length,
     pasMs:engine.timing.lastDelta,mobiles:boxes.length-1+balls.length,ids:[l.caisse,l.ballon],saisissables:l.saisissables};})()`);
  arrivee.ecartMs=arrivee.caisse&&arrivee.ballon?+(arrivee.caisse.t-arrivee.ballon.t).toFixed(3):null;
  arrivee.ok=!!arrivee.caisse&&!!arrivee.ballon&&arrivee.caisse.avec==='plateau'&&arrivee.ballon.avec==='plateau'&&Math.abs(arrivee.ecartMs)<=arrivee.pasMs+1e-6
    &&arrivee.plateauActuel&&arrivee.mobiles===2&&arrivee.saisisAvant===0&&!!etat&&!!etat.contacts.caisse&&etat.contacts.caisse.t===arrivee.caisse.t&&etat.contacts.ballon.t===arrivee.ballon.t
    &&arrivee.saisissables.every(Boolean);   // saisissables de nouveau après l'arrivée
  return arrivee;
}
// Étapes 3 et 4 : appui sur « Lâcher ensemble » puis suivi jusqu'à l'arrivée des deux objets et la reprise des apparitions.
// toucherEnChute : toucher la caisse pendant sa chute pour lire sa fiche (elle est choisie, pas saisie).
async function experienceLacher(tactile,{capture=null,rappui=false,reprise=false,toucherEnChute=false}={}){
  await ev(installerContacts);
  await appui('.pz-bouton-ensemble',tactile);
  let geo=await ev(geometrieLacher);const premier=[geo.caisse,geo.ballon];
  if(rappui){await wait(400);await appui('.pz-bouton-ensemble',tactile);geo=await ev(geometrieLacher);geo.rappui={avant:premier,apres:[geo.caisse,geo.ballon],nouveaux:geo.caisse!==premier[0]&&geo.ballon!==premier[1]};}
  if(toucherEnChute){await wait(500);
    const c=await ev(`(()=>{const o=boxes.find(b=>b.body.id===${geo.caisse}),s=Ecran.monde().s;return {x:o.body.position.x*s,y:o.body.position.y*s};})()`);
    await toucherPoint(c.x,c.y,tactile);await wait(100);
    geo.lecture=await ev(`(()=>{const e=Pesanteur.etat();return {choisie:e.selection&&e.selection.id===${geo.caisse},fiche:document.querySelector('.pz-fiche').getBoundingClientRect().height>0||e.protocoleOuvert,tenue:!!mouseConstraint.body};})()`);}
  const arrivee=await attendreArrivee({capture});
  const r={...geo,arrivee,ecartMs:arrivee.ecartMs};
  r.ok=geo.mobiles===2&&geo.ecartEntre>=20&&geo.surPlateau&&geo.basEgal&&!geo.enPause&&geo.boutonPause==='Pause'&&geo.saisissables.every(x=>!x)
    &&(!geo.menuEnHaut||!geo.protocoleOuvert)&&(!rappui||geo.rappui.nouveaux)&&(!toucherEnChute||geo.lecture.choisie&&!geo.lecture.tenue)
    &&arrivee.ok&&arrivee.ids[0]===geo.caisse&&arrivee.relances===0;
  if(reprise){await wait(1200);const pendant=await ev('boxes.length-1+balls.length');let apres=pendant;for(let i=0;i<60&&apres<=2;i++){await wait(100);apres=await ev('boxes.length-1+balls.length');}
    r.reprise={a1200ms:pendant,ensuite:apres};r.ok=r.ok&&pendant===2&&apres>2;}
  return r;
}
// Fiche après un changement d'astre : même objet, astre écrit, P = m × g exact (valeur de l'état et texte affiché).
const lireFiche=`(()=>{const e=Pesanteur.etat(),s=e.selection;if(!s)return {selection:null};const attendu=Math.round(s.masseKg*100)*Math.round(e.g*10)/1000;
  return {astre:e.astre,selection:s.id,poidsN:s.poidsN,attendu,texteP:e.fiche.includes('P = '+String(attendu).replace('.',',')+' N'),texteAstre:e.fiche.includes({terre:'sur Terre',lune:'sur la Lune',mars:'sur Mars'}[e.astre]),ficheVisible:document.querySelector('.pz-fiche').getBoundingClientRect().height>0};})()`;
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
// Premier chargement à froid (profil neuf, images, scripts) : on le fait une fois avant les mesures.
await send('Emulation.setDeviceMetricsOverride',{width:360,height:640,deviceScaleFactor:2,mobile:true});
await send('Emulation.setTouchEmulationEnabled',{enabled:true});
await send('Page.navigate',{url});await wait(2500);
const res=[];
for(const [w,h,tactile] of [[360,640,1],[640,360,1],[768,1024,1],[1024,768,1],[1366,768,0],[1920,1080,0],[900,620,0]]){
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:tactile?2:1,mobile:!!tactile});
  await send('Emulation.setTouchEmulationEnabled',{enabled:!!tactile});
  await send('Page.navigate',{url});await wait(4500);
  const m=await ev(mesure);
  // Protocole ouvert au lancement : capture, taille, libellés, aucun texte qui donne la conclusion.
  const protocole=await ev(lireProtocole);
  const shotProtocole=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out+'/lp-'+w+'x'+h+'-protocole.png',Buffer.from(shotProtocole.data,'base64'));
  const conclusions=phrasesQuiConcluent(await ev(lireTextes));
  // Carte trop haute (téléphone couché) : « suite ↓ » visible tant qu'on n'est pas en bas, caché en bas.
  if(protocole.defile){await defilerProtocole(1);protocole.suiteEnBas=(await ev(lireProtocole)).suite;await defilerProtocole(0);}
  protocole.ok=protocole.bouton==='Protocole'&&protocole.expanded==='true'&&protocole.controls==='pz-protocole'&&protocole.carteVisible&&!protocole.ficheVisible&&protocole.dansFenetre
    &&(h<=430||!protocole.defile)&&(protocole.defile?protocole.suite&&!protocole.suiteEnBas:!protocole.suite)&&!conclusions.length;
  // Le protocole commence par « Pause » : l'objet touché ne bouge plus pendant qu'on change d'astre.
  await appui('.pz-bouton-pause',tactile);
  protocole.pause=await ev('Pesanteur.enPause()');
  // Toucher un objet pour lire sa fiche, de façon déterministe. La simulation est en pause (vérifié) : rien ne bouge.
  // On choisit un objet entièrement visible (son centre et quatre points intérieurs sont sur le canvas, hors du
  // menu) et seul sous son centre ; s'il n'y en a aucun, le test en pose un sur le plateau. Si le toucher ne
  // choisit rien, on journalise l'état (position convertie par Matter.Mouse, objets sous ce point…) et on
  // réessaie une fois sur un objet posé par le test.
  if(!await ev('Pesanteur.enPause()')){console.log('PAUSE NON EFFECTIVE',w+'x'+h);await ev('Pesanteur.mettreEnPause(true)');}
  const chercher=`(()=>{const s=Ecran.monde().s,c=document.querySelector('canvas'),vu=(x,y)=>document.elementFromPoint(x*s,y*s)===c,tous=[...boxes,...balls].map(o=>o.body);
    const o=[...boxes.slice(1),...balls].find(o=>{const b=o.body.bounds,cx=o.body.position.x,cy=o.body.position.y,dx=(b.max.x-b.min.x)*0.3,dy=(b.max.y-b.min.y)*0.3;
      return cy>80&&cy<height-20&&[[0,0],[dx,0],[-dx,0],[0,dy],[0,-dy]].every(([u,v])=>vu(cx+u,cy+v))&&Matter.Query.point(tous,{x:cx,y:cy}).length===1;});
    return o?{id:o.body.id,x:o.body.position.x*s,y:o.body.position.y*s}:null;})()`;
  const poser=`(()=>{const pl=boxes.find(b=>b.estPlateau);generateBox(pl.body.position.x,pl.body.position.y-50,60,60,boxesImg);return true;})()`;
  let cible=await ev(chercher);
  if(!cible){await ev(poser);await wait(100);cible=await ev(chercher);}
  let fiche='(aucun objet à toucher)';
  if(cible){await toucherPoint(cible.x,cible.y,tactile);await wait(150);
    if(!await ev('!!Pesanteur.etat().selection')){
      console.log('TOUCHER RATÉ',w+'x'+h,JSON.stringify({cible,diag:await ev(`(()=>{const m=mouseConstraint.mouse;return {souris:{x:m.position.x,y:m.position.y,bouton:m.button,pixelRatio:m.pixelRatio},pd:pixelDensity(),
        sous:Matter.Query.point([...boxes,...balls].map(o=>o.body),m.position).map(b=>b.id),enPause:Pesanteur.enPause(),ecran:Ecran.etat()};})()`)}));
      await ev(poser);await wait(100);cible=await ev(chercher);if(cible){await toucherPoint(cible.x,cible.y,tactile);}}
    await wait(300);fiche=await ev(`(()=>{const e=Pesanteur.etat();const b=document.querySelector('.pz-bouton-protocole'),p=document.querySelector('#pz-protocole');const f=document.querySelector('.pz-fiche').getBoundingClientRect();return {sel:e.selection?e.selection.type+' '+e.selection.masseKg+' kg':null,idSel:e.selection?e.selection.id:null,ficheVisible:f.height>0,ficheDansFenetre:f.bottom<=innerHeight+0.5&&f.right<=innerWidth+0.5,barre:document.querySelector('.pz-barre')?Math.round(document.querySelector('.pz-barre').getBoundingClientRect().width*100)/100:null,attendu:Math.round(20*Ecran.monde().s*100)/100,deuxCartes:e.deuxCartes,
      // Grand écran : le protocole reste ouvert, entier, la fiche entière dessous. Sinon : protocole replié.
      cartesOk:e.deuxCartes?e.protocoleOuvert&&b.getAttribute('aria-expanded')==='true'&&p.getBoundingClientRect().bottom<=document.querySelector('.pz-fiche').getBoundingClientRect().top&&p.scrollHeight<=p.clientHeight+1&&document.querySelector('.pz-fiche').scrollHeight<=document.querySelector('.pz-fiche').clientHeight+1
        :!e.protocoleOuvert&&b.getAttribute('aria-expanded')==='false'&&p.getBoundingClientRect().height===0};})()`);}
  const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out+'/lp-'+w+'x'+h+'.png',Buffer.from(shot.data,'base64'));
  // Changement d'astre : le même objet reste choisi et sa fiche suit l'astre. Puis le bouton Protocole déplie et replie la carte.
  const astres=[];
  if(typeof fiche==='object'){
    for(const a of ['lune','mars','terre']){await appui(`[data-astre="${a}"]`,tactile);astres.push(await ev(lireFiche));}
    protocole.conclusionsFiche=phrasesQuiConcluent(await ev(lireTextes));
    await appui('.pz-bouton-protocole',tactile);protocole.appui1=await ev(lireProtocole);
    await appui('.pz-bouton-protocole',tactile);protocole.appui2=await ev(lireProtocole);
  }
  const astresOk=astres.length===3&&astres.every(a=>a.selection===fiche.idSel&&a.texteP&&a.texteAstre&&a.ficheVisible&&Math.abs(a.poidsN-a.attendu)<1e-9)&&astres.map(a=>a.astre).join()==='lune,mars,terre';
  // Protocole ouvert : la fiche est dessous si les deux tiennent, cachée sinon. Replié : la fiche seule.
  const ouvertOk=x=>x.ouvert&&x.expanded==='true'&&x.carteVisible&&x.ficheVisible===fiche.deuxCartes&&x.selection===fiche.idSel&&(!x.ficheVisible||!x.ficheDefile&&!x.defile&&x.ficheDansFenetre);
  const replieOk=x=>!x.ouvert&&x.expanded==='false'&&!x.carteVisible&&x.ficheVisible&&x.selection===fiche.idSel;
  const basculeOk=!!protocole.appui1&&(fiche.deuxCartes?replieOk(protocole.appui1)&&ouvertOk(protocole.appui2):ouvertOk(protocole.appui1)&&replieOk(protocole.appui2));
  // Étapes 3 et 4 sur la scène telle qu'elle est (objets tombés depuis le lancement), sur Terre.
  const lacher=typeof fiche==='object'?await experienceLacher(tactile):{ok:false};
  const suivi={protocole:{ok:protocole.ok,pause:protocole.pause,carte:protocole.carte,defile:protocole.defile,suite:protocole.suite,suiteEnBas:protocole.suiteEnBas,
    conclusions:[...conclusions,...(protocole.conclusionsFiche||[])],bascule:basculeOk},astres:{ok:astresOk,detail:astres.map(a=>a.astre+' '+a.poidsN+' N')},
    lacher:{ok:lacher.ok,mobilesAvant:m.objets,ecartEntre:lacher.ecartEntre,ecartMs:lacher.ecartMs,pasMs:lacher.arrivee&&+lacher.arrivee.pasMs.toFixed(3),avec:lacher.arrivee&&[lacher.arrivee.caisse?.avec,lacher.arrivee.ballon?.avec]}};
  res.push({...m,fiche,suivi});console.log(JSON.stringify({...m,fiche,suivi}));
}
// rotation à chaud : 360×640 -> 640×360 sans recharger
await send('Emulation.setDeviceMetricsOverride',{width:360,height:640,deviceScaleFactor:2,mobile:true});await send('Page.navigate',{url});await wait(3500);
const avant=await ev(mesure);
await send('Emulation.setDeviceMetricsOverride',{width:640,height:360,deviceScaleFactor:2,mobile:true});await wait(1200);
const apres=await ev(mesure);
console.log('ROTATION',JSON.stringify({avant:[avant.monde,avant.plateauCss,avant.enHaut],apres:[apres.monde,apres.canvas,apres.plateauCss,apres.enHaut,apres.plateauSousMenu,apres.centrePlateau,apres.centreZoneLibre],plateaux:await ev('boxes.filter(b=>b.estPlateau).length+"/"+Matter.Composite.allBodies(world).filter(b=>b.isStatic).length')}));
console.log('ERREURS',JSON.stringify(erreurs));
// Étapes 3 et 4 sur une scène encore plus encombrée : objets ajoutés au-dessus du plateau, Terre et Lune.
const lachers=[];
for(const [w,h,tactile] of [[360,640,1],[1366,768,0]]){
  await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:tactile?2:1,mobile:!!tactile});
  await send('Emulation.setTouchEmulationEnabled',{enabled:!!tactile});
  await send('Page.navigate',{url});await wait(4000);
  for(const astre of ['terre','lune']){
    await appui(`[data-astre="${astre}"]`,tactile);
    await ev(`(()=>{const pl=boxes.find(b=>b.estPlateau),g=pl.body.position.x-pl.w/2,d=pl.body.position.x+pl.w/2;
      for(let i=0;i<8;i++){const x=g+(d-g)*(i+0.5)/8,y=40+(i%4)*60;if(i%2)generateBall(x,y,12+i*3,{timeScale:1},ballsImg);else generateBox(x,y,40+i*8,40+i*6,boxesImg);}return true;})()`);
    await wait(astre==='lune'?2500:1200);
    const avant=await ev('boxes.length-1+balls.length');
    await appui('.pz-bouton-pause',tactile);   // étape 1 : l'élève a mis en pause ; « Lâcher ensemble » relance
    if(!await ev('Pesanteur.etat().protocoleOuvert'))await appui('.pz-bouton-protocole',tactile);   // l'élève lit l'étape 4
    // Capture au pas du contact (avant le rebond). Sur la Lune : toucher la caisse pendant sa chute pour lire sa fiche.
    const r=await experienceLacher(tactile,{capture:'lp-'+w+'x'+h+'-lacher-'+astre+'.png',rappui:astre==='lune'&&w===360,reprise:true,toucherEnChute:astre==='lune'});
    // Téléphone tenu droit : la carte du protocole s'est repliée pour laisser voir le départ ; colonne : elle reste ouverte.
    const protocoleOk=r.menuEnHaut?r.protocoleOuvert===false:r.protocoleOuvert===true;
    r.ok=r.ok&&protocoleOk;
    const ligne={taille:w+'x'+h,astre,mobilesAvant:avant,ok:r.ok,ecartEntre:r.ecartEntre,surPlateau:r.surPlateau,ecartMs:r.ecartMs,pasMs:r.arrivee&&+r.arrivee.pasMs.toFixed(3),
      avec:r.arrivee&&[r.arrivee.caisse?.avec,r.arrivee.ballon?.avec],t:r.arrivee&&[r.arrivee.caisse?.t,r.arrivee.ballon?.t].map(x=>x&&Math.round(x)),
      protocole:(r.menuEnHaut?'bandeau, carte repliée : ':'colonne, carte ouverte : ')+protocoleOk,lecture:r.lecture,rappui:r.rappui,reprise:r.reprise};
    lachers.push(ligne);console.log('LÂCHER',JSON.stringify(ligne));
  }
}
// (a) Doigt resté posé sur la simulation, sur le trajet de la caisse, pendant qu'on déclenche « Lâcher ensemble »
// (second doigt sur le bouton : clic en JavaScript, Chrome ne produisant pas de clic à deux doigts) ; le doigt
// bouge un peu pendant toute la chute (Matter.Mouse le compte alors de nouveau comme appuyé).
{
  await send('Emulation.setDeviceMetricsOverride',{width:360,height:640,deviceScaleFactor:2,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true});
  await send('Page.navigate',{url});await wait(3500);
  await ev(installerContacts);
  await appui('.pz-bouton-ensemble',1);
  const P=await ev(`(()=>{const e=Pesanteur.etat().lacher,c=boxes.find(b=>b.body.id===e.caisse),pl=boxes.find(b=>b.estPlateau),s=Ecran.monde().s;
    const y=(c.body.position.y+pl.body.position.y)/2;return {x:c.body.position.x*s,y:y*s,surCanvas:document.elementFromPoint(c.body.position.x*s,y*s)===document.querySelector('canvas')};})()`);
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:P.x,y:P.y}]});
  await ev(`document.querySelector('.pz-bouton-ensemble').click()`);
  const fin=Date.now()+8000;let i=0;
  while(Date.now()<fin){await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:P.x+(i++%2),y:P.y}]});const l=await ev('Pesanteur.etat().lacher');if(l.contacts.caisse&&l.contacts.ballon)break;await wait(30);}
  const arrivee=await attendreArrivee();
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const ligne={taille:'360x640',astre:'terre',cas:'doigt tenu sur le trajet de la caisse',ok:P.surCanvas&&arrivee.ok,ecartMs:arrivee.ecartMs,avec:[arrivee.caisse?.avec,arrivee.ballon?.avec],saisisAvant:arrivee.saisisAvant};
  lachers.push(ligne);console.log('LÂCHER',JSON.stringify(ligne));
}
// (b) Changement de taille : rotation pendant la chute (tablette), puis appui 0 ms et 40 ms après une rotation
// (le redimensionnement est différé de 80 ms) : l'expérience est relancée sur le nouveau plateau.
for(const [cas,avant,apres,delai,tactile] of [['rotation pendant la chute',[768,1024],[1024,768],300,1],['appui 0 ms après une rotation',[360,640],[640,360],0,1],
    ['appui 40 ms après une rotation',[640,360],[360,640],40,1],['cadre agrandi pendant la chute (barre d’adresse)',[900,620],[900,680],250,0]]){
  await send('Emulation.setDeviceMetricsOverride',{width:avant[0],height:avant[1],deviceScaleFactor:tactile?2:1,mobile:!!tactile});
  await send('Emulation.setTouchEmulationEnabled',{enabled:!!tactile});
  await send('Page.navigate',{url});await wait(3500);
  await ev(installerContacts);
  const avantSpawn=await ev('boxes.length-1+balls.length');
  if(delai===250||delai===300){await appui('.pz-bouton-ensemble',tactile);await wait(delai-250);
    await send('Emulation.setDeviceMetricsOverride',{width:apres[0],height:apres[1],deviceScaleFactor:tactile?2:1,mobile:!!tactile});}
  else{await send('Emulation.setDeviceMetricsOverride',{width:apres[0],height:apres[1],deviceScaleFactor:tactile?2:1,mobile:!!tactile});
    if(delai)await wait(delai);
    const c=await ev(`(()=>{const r=document.querySelector('.pz-bouton-ensemble').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};})()`);
    await toucherPoint(c.x,c.y,tactile);}
  await wait(300);
  const geo=await ev(geometrieLacher);
  const arrivee=await attendreArrivee();
  const ok=arrivee.ok&&(delai===40||arrivee.relances>=1)&&geo.surPlateau&&geo.basEgal&&geo.ecartEntre>=20&&(await ev('innerWidth'))===apres[0];
  const ligne={taille:avant.join('x')+' → '+apres.join('x'),astre:'terre',cas,mobilesAvant:avantSpawn,ok,relances:arrivee.relances,ecartMs:arrivee.ecartMs,avec:[arrivee.caisse?.avec,arrivee.ballon?.avec],surPlateau:geo.surPlateau,mobiles:arrivee.mobiles};
  lachers.push(ligne);console.log('LÂCHER',JSON.stringify(ligne));
}
const fautesLacher=lachers.filter(l=>!l.ok||(!l.cas&&l.mobilesAvant<4));
const fautes=res.filter(m=>m.canvas[2]!==m.fenetre[0]||m.canvas[3]!==m.fenetre[1]||Math.abs(m.centrePlateau-m.centreZoneLibre)>1||m.plateauSousMenu||!m.menuDansFenetre||m.debordement||m.boutonMin[1]<44
  ||typeof m.fiche!=='object'||!m.fiche.sel||!m.fiche.ficheVisible||!m.fiche.ficheDansFenetre||Math.abs(m.fiche.barre-m.fiche.attendu)>0.5
  ||!m.fiche.cartesOk||!m.suivi.protocole.ok||!m.suivi.protocole.pause||m.suivi.protocole.conclusions.length||!m.suivi.protocole.bascule||!m.suivi.astres.ok||!m.suivi.lacher.ok);
// Les deux cases du choix d'affichage sont couvertes : une carte à la fois sur un téléphone, les deux ensemble sur un grand écran.
const modes={telephone:res.find(m=>m.fenetre.join()==='360,640')?.fiche.deuxCartes,grandEcran:res.find(m=>m.fenetre.join()==='1920,1080')?.fiche.deuxCartes};
const modesOk=modes.telephone===false&&modes.grandEcran===true;
console.log('DEUX CARTES',JSON.stringify(res.map(m=>m.fenetre.join('x')+' '+(m.fiche.deuxCartes?'protocole + fiche':'une carte'))));
const rotationOk=apres.canvas[2]===640&&apres.canvas[3]===360&&!apres.enHaut&&!apres.plateauSousMenu&&Math.abs(apres.centrePlateau-apres.centreZoneLibre)<=1;
const echec=fautes.length||!rotationOk||erreurs.length||fautesLacher.length||!modesOk;
console.log(echec?'ÉCHEC : '+JSON.stringify({fautes:fautes.map(m=>m.fenetre),rotationOk,erreurs,fautesLacher:fautesLacher.map(l=>l.taille+' '+l.astre),modes})
  :'OK : '+res.length+' tailles et la rotation ; « Lâcher ensemble » : '+(res.length+lachers.length)+' essais, arrivée simultanée sur le plateau');
p.kill();process.exit(echec?1:0);
