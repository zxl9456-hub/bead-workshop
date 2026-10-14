import * as THREE from './vendor/three.module.js';
import { SIZE, COLORS, PATTERNS, usedColors, progress } from './patterns.js';
import { LoopMusic } from './bgm.js';

const $ = id => document.getElementById(id);
const STORAGE_KEY = 'little-bead-atelier-v1';
const icons = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  book:'<path d="M4 4h6q2 0 2 2v15q-2-2-8-2zM20 4h-6q-2 0-2 2v15q2-2 8-2z"/>',
  sound:'<path d="m4 9 4 0 5-4v14l-5-4H4z"/><path d="M17 8q5 4 0 8M20 5q7 7 0 14"/>',
  mute:'<path d="m4 9 4 0 5-4v14l-5-4H4z"/><path d="m17 9 5 6m0-6-5 6"/>',
  music:'<path d="M10 18V5l10-2v13M10 8l10-2"/><ellipse cx="7" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/>',
  settings:'<path d="m9 3-.6 2.3-2 .9-2.3-.5-2.1 3.6 1.7 1.6v2.3L2 14.9l2.1 3.6 2.3-.5 2 .9L9 21h4l.6-2.1 2-.9 2.3.5 2.1-3.6-1.7-1.7v-2.3L20 9.3l-2.1-3.6-2.3.5-2-.9L13 3z"/><circle cx="11" cy="12" r="3"/>',
  draw:'<circle cx="8" cy="7" r="4"/><circle cx="17" cy="16" r="4"/><circle cx="6" cy="18" r="4"/><circle cx="8" cy="7" r="1"/><circle cx="17" cy="16" r="1"/><circle cx="6" cy="18" r="1"/>',
  eraser:'<path d="m4 14 10-10q1-1 2 0l5 5q1 1 0 2L11 21H8l-4-4q-1-1 0-3z"/><path d="m9 9 8 8M11 21h10"/>',
  undo:'<path d="m8 5-5 5 5 5M3 10h9q8 0 8 8"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  hint:'<path d="M8 16q-1-2-2-4a6 6 0 1 1 12 0q-1 2-2 4M9 17h6M9 20h6M12 1V0M3 4 1 2M21 4l2-2"/>',
  restart:'<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/>'
};
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.grid}</svg>`;}
$('work-tab-icon').innerHTML=icon('grid');$('collection-tab-icon').innerHTML=icon('book');$('settings-btn').innerHTML=icon('settings');
$('draw-icon').innerHTML=icon('draw');$('erase-icon').innerHTML=icon('eraser');$('undo-icon').innerHTML=icon('undo');
$('hint-btn').innerHTML=icon('hint')+'找一颗小空位';$('restart-btn').innerHTML=icon('restart')+'重新开始';

function loadStore(){
  let raw; try{raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{}
  if(!raw||raw.version!==1)return {version:1,active:'cat',coins:1280,projects:{},collection:[],sound:false,guide:true,musicEnabled:true,musicVolume:.3};
  const projects={};
  for(const p of PATTERNS){const arr=raw.projects?.[p.id];if(Array.isArray(arr)&&arr.length===SIZE*SIZE&&arr.every(v=>Number.isInteger(v)&&v>=0&&v<COLORS.length))projects[p.id]=arr;}
  const collection=Array.isArray(raw.collection)?raw.collection.filter(p=>p&&typeof p.id==='string'&&PATTERNS.some(v=>v.id===p.id)&&Array.isArray(p.cells)&&p.cells.length===SIZE*SIZE&&p.cells.every(v=>Number.isInteger(v)&&v>=0&&v<COLORS.length)).slice(-80):[];
  return {version:1,active:PATTERNS.some(p=>p.id===raw.active)?raw.active:'cat',coins:Number.isSafeInteger(raw.coins)&&raw.coins>=0?raw.coins:1280,projects,collection,sound:raw.sound===true,guide:raw.guide!==false,musicEnabled:raw.musicEnabled!==false,musicVolume:typeof raw.musicVolume==='number'&&Number.isFinite(raw.musicVolume)?Math.max(0,Math.min(1,raw.musicVolume)):.3};
}
const saved=loadStore();
if(!saved.projects.cat){saved.projects.cat=PATTERNS[0].data.map((v,i)=>v&&((i%SIZE)<14||((i%SIZE)===14&&Math.floor(i/SIZE)%3===0))?v:0);}
let pattern=PATTERNS.find(p=>p.id===saved.active),cells=(saved.projects[pattern.id]||Array(SIZE*SIZE).fill(0)).slice();
let selected=usedColors(pattern)[0]||1,tool='single',history=[],stroke=null,hoverIndex=-1,toastTimer,storageTimer;
let guide=saved.guide,sound=saved.sound,keyboardIndex=SIZE*10+10,completionTimer=null,completedEntry=null;
let renderer,scene,camera,beads,pegs,labelsPlane,hoverFrame,ghostBead,warningRings,hitPlane;
let zoom=1,panX=0,panZ=0,yaw=0,pitch=1.06,needsRender=true,canvasFallback=false;
const animation=new Map(),matrix=new THREE.Matrix4(),dummy=new THREE.Object3D(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
let audioCtx;
function getAudioContext(){audioCtx??=new(window.AudioContext||window.webkitAudioContext)();return audioCtx;}
function playNote(erase=false){if(!sound)return;try{getAudioContext();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.setValueAtTime(erase?340:880+selected*24,audioCtx.currentTime);o.frequency.exponentialRampToValueAtTime(erase?200:500,audioCtx.currentTime+.07);g.gain.setValueAtTime(.035,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+.09);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+.1);}catch{}}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2600);}
function persist(immediate=false){
  saved.active=pattern.id;saved.projects[pattern.id]=cells.slice();saved.sound=sound;saved.guide=guide;
  clearTimeout(storageTimer);const write=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));$('save-text').textContent='进度已自动保存';}catch{$('save-text').textContent='当前浏览器无法保存进度';}};
  if(immediate)write();else storageTimer=setTimeout(write,160);
}
window.addEventListener('pagehide',()=>persist(true));

const music=new LoopMusic({url:'./assets/cat-paw-groove.mp3',getContext:getAudioContext,volume:saved.musicVolume,onState:renderMusic});
let resumeMusicOnVisible=false;
function renderMusic(state=music.state){
  const active=state==='playing'||state==='loading';
  $('music-btn').innerHTML=icon('music')+'<span class="music-title">猫爪小调</span><span class="music-bars" aria-hidden="true"><i></i><i></i><i></i></span>';
  $('music-btn').classList.toggle('playing',state==='playing');
  $('music-btn').setAttribute('aria-pressed',String(active));
  $('music-btn').setAttribute('aria-label',active?'暂停背景音乐':'播放背景音乐');
  $('music-btn').title=active?'猫爪小调 · 点击暂停':'猫爪小调 · 点击播放';
  $('music-toggle').checked=saved.musicEnabled;
  $('music-volume').value=Math.round(saved.musicVolume*100);
  $('music-volume-value').value=Math.round(saved.musicVolume*100)+'%';
  $('music-status').textContent=state==='playing'?'正在播放 · 猫爪小调':state==='loading'?'正在准备猫爪小调…':state==='error'?'点右上角的音符，再试一次':saved.musicEnabled?'开始操作后，小调会轻轻响起':'音乐已暂停，随时可以继续';
}
function setMusicEnabled(enabled,reportError=true){
  saved.musicEnabled=enabled;persist();
  if(!enabled){resumeMusicOnVisible=false;music.pause();return;}
  music.play().catch(()=>{if(reportError)toast('小调暂时没有响起，请点右上角的音符再试一次');});
}
$('music-btn').addEventListener('click',()=>setMusicEnabled(music.state!=='playing'&&music.state!=='loading'));
$('music-toggle').addEventListener('change',e=>setMusicEnabled(e.target.checked));
$('music-volume').addEventListener('input',e=>{saved.musicVolume=Number(e.target.value)/100;music.setVolume(saved.musicVolume);$('music-volume-value').value=e.target.value+'%';persist();});
function startMusicOnInteraction(e){
  if(e.target.closest?.('#music-btn,#music-toggle,#music-volume'))return;
  if(saved.musicEnabled&&music.state!=='error'&&(!music.requested||music.state==='paused')&&document.visibilityState==='visible')setMusicEnabled(true,false);
}
document.addEventListener('pointerdown',startMusicOnInteraction,{passive:true});
document.addEventListener('keydown',startMusicOnInteraction);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){resumeMusicOnVisible=music.requested&&saved.musicEnabled;music.pause();}
  else if(resumeMusicOnVisible&&saved.musicEnabled){resumeMusicOnVisible=false;setMusicEnabled(true,false);}
});
window.addEventListener('pagehide',()=>music.pause());
window.addEventListener('pageshow',()=>{if(saved.musicEnabled&&audioCtx?.state==='running')setMusicEnabled(true,false);});

function shade(hex, amount){const c=new THREE.Color(hex);if(amount>0)c.lerp(new THREE.Color('#fff9e9'),amount);else c.multiplyScalar(1+amount);return '#'+c.getHexString();}
function drawArt(canvas, data, withBoard=false, transparent=true){
  const ctx=canvas.getContext('2d'),size=canvas.width;ctx.clearRect(0,0,size,size);
  if(!transparent){ctx.fillStyle='#fff6e8';ctx.fillRect(0,0,size,size);}
  const pad=withBoard?size*.045:size*.03,step=(size-pad*2)/SIZE,r=step*.43;
  if(withBoard){ctx.save();ctx.shadowColor='#846c4c25';ctx.shadowBlur=5;ctx.shadowOffsetY=3;ctx.fillStyle='#fff7ea';ctx.beginPath();ctx.roundRect(pad*.3,pad*.3,size-pad*.6,size-pad*.6,size*.035);ctx.fill();ctx.restore();}
  data.forEach((v,i)=>{
    const x=pad+(i%SIZE+.5)*step,y=pad+(Math.floor(i/SIZE)+.5)*step;
    if(!v){if(withBoard){ctx.fillStyle='#d9cbb3';ctx.beginPath();ctx.arc(x+.6,y+.9,step*.145,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fffdf5';ctx.beginPath();ctx.arc(x,y,step*.14,0,Math.PI*2);ctx.fill();}return;}
    const color=COLORS[v].hex;
    ctx.fillStyle='#86613e35';ctx.beginPath();ctx.arc(x+.6,y+1,r,0,Math.PI*2);ctx.fill();
    const g=ctx.createRadialGradient(x-r*.3,y-r*.35,r*.05,x,y,r);g.addColorStop(0,shade(color,.23));g.addColorStop(.65,color);g.addColorStop(1,shade(color,-.2));
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=shade(color,.4);ctx.lineWidth=Math.max(.6,step*.045);ctx.beginPath();ctx.arc(x,y-r*.03,r*.86,Math.PI,Math.PI*1.8);ctx.stroke();
    ctx.fillStyle=shade(color,-.35);ctx.beginPath();ctx.arc(x,y-r*.035,r*.34,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=shade(color,-.13);ctx.beginPath();ctx.arc(x,y+r*.03,r*.25,0,Math.PI*2);ctx.fill();
  });
}
function decorate(){
  const positions=[[12,4],[4,11],[24,10],[14,18],[31,22],[2,24],[22,32],[7,33],[33,7],[29,37],[11,26]];
  document.querySelectorAll('.side-tray').forEach((el,t)=>{const c=[COLORS[1].hex,COLORS[2].hex,COLORS[6].hex][t];for(let i=0;i<29;i++){const bead=document.createElement('i');bead.style.cssText=`--b:${c};left:${8+(i*17)%68}px;top:${9+Math.floor(i/4)*14+(i%3)*4}px;transform:rotate(${i*37}deg)`;el.append(bead);}});
  return positions;
}
const bowlPositions=decorate();
function renderPalette(){
  const list=pattern.id==='free'?COLORS.map((_,i)=>i).slice(1):usedColors(pattern);
  $('palette').innerHTML=list.map(c=>`<button class="color-choice ${selected===c?'active':''}" data-color="${c}" style="--bead:${COLORS[c].hex}" aria-pressed="${selected===c}" title="${c} 号 · ${COLORS[c].name}"><span class="bead-bowl" aria-hidden="true">${bowlPositions.map(([x,y],i)=>`<i style="left:${x*.76}px;top:${y*.76}px;transform:rotate(${i*31}deg)"></i>`).join('')}</span><span class="color-choice-info"><span class="color-number">${c}</span><span class="color-remaining" id="remaining-${c}">剩 <b>0</b></span></span></button>`).join('');
  $('palette').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>selectColor(Number(b.dataset.color))));
}
function selectColor(c){
  if(!COLORS[c])return;selected=c;
  $('palette').querySelectorAll('button').forEach(b=>{const active=Number(b.dataset.color)===c;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('selected-color-name').textContent=COLORS[c].name;$('palette-mini-bead').style.borderColor=COLORS[c].hex;
  if(tool==='erase')setTool('single');if(ghostBead)ghostBead.material.color.set(COLORS[c].hex);updateLabels();updateHover(hoverIndex);
}
function updateUI(){
  const p=progress(pattern,cells),free=pattern.id==='free';
  $('pattern-name').textContent=pattern.name;$('pattern-subtitle').textContent=pattern.subtitle;$('difficulty').textContent=pattern.difficulty;
  $('progress-percent').innerHTML=free?`${p.placed}<span>颗</span>`:`${p.percent}<span>%</span>`;
  $('progress-fill').style.width=free?(p.placed?Math.max(4,p.placed/(SIZE*SIZE)*100):0)+'%':(p.correct/p.total*100)+'%';
  document.querySelector('.progress-track').setAttribute('aria-valuenow',free?Math.round(p.placed/(SIZE*SIZE)*100):p.percent);
  $('progress-detail').textContent=free?'24 × 24 自由拼板':`${p.correct} / ${p.total} 颗`;
  $('progress-encouragement').textContent=p.wrong&&!free?`${p.wrong} 颗需要调整`:free?'随心拼，随时收藏':p.correct===p.total?'可以熨烫收藏啦':p.percent>=80?'快完成啦，再加一点点':p.percent>=50?'可爱已经慢慢出现':'一颗一颗，慢慢来';
  $('finish-text').textContent=free?'熨烫 · 收藏作品':p.correct===p.total&&!p.wrong?'熨烫 · 完成作品':'继续拼豆';
  $('coins').textContent=saved.coins.toLocaleString('en-US');$('collection-count').textContent=saved.collection.length;
  $('undo-btn').disabled=history.length===0;
  $('palette').querySelectorAll('button').forEach(b=>{
    const c=Number(b.dataset.color),remaining=pattern.data.reduce((n,v,i)=>n+(v===c&&cells[i]!==c?1:0),0);
    b.setAttribute('aria-label',`${c}号 ${COLORS[c].name}${free?'':`，还需 ${remaining} 颗`}`);
    b.querySelector('.color-remaining').innerHTML=free?'随心':`剩 <b>${remaining}</b>`;
  });
  $('selected-color-name').textContent=COLORS[selected].name;
  $('palette-help').textContent=tool==='erase'?'点击或拖动，轻轻擦掉豆粒':tool==='draw'?'按住拖动，连起来填一笔':free?'任意放置，让灵感慢慢出现':'选色后，点击对应编号的小空位';
  $('scene').setAttribute('aria-label',`立体拼豆板，${pattern.name}，${free?'已放置'+p.placed+'颗':'完成'+p.percent+'%'}。方向键移动，空格放置，数字键选色。`);
  document.querySelectorAll('.pattern-card').forEach(b=>{b.classList.toggle('active',b.dataset.pattern===pattern.id);b.setAttribute('aria-pressed',String(b.dataset.pattern===pattern.id));});
}
function renderShelf(){
  $('pattern-strip').innerHTML=PATTERNS.slice(0,6).map(p=>`<button class="pattern-card" data-pattern="${p.id}" aria-label="选择图案 ${p.name}" aria-pressed="${p.id===pattern.id}"><canvas width="144" height="144" aria-hidden="true"></canvas><div class="pattern-info"><h4>${p.name}</h4><p>${p.difficulty} · ${p.data.filter(Boolean).length} 颗</p><span class="card-badge">${p.tag}</span></div><span class="card-check">${p.id===pattern.id?'✓':''}</span></button>`).join('');
  $('pattern-strip').querySelectorAll('button').forEach(b=>{const p=PATTERNS.find(p=>p.id===b.dataset.pattern);drawArt(b.querySelector('canvas'),p.data);b.addEventListener('click',()=>switchPattern(p.id));});
}
function switchPattern(id){
  endStroke();persist(true);pattern=PATTERNS.find(p=>p.id===id);cells=(saved.projects[id]||Array(SIZE*SIZE).fill(0)).slice();history=[];animation.clear();selected=usedColors(pattern)[0]||1;hoverIndex=-1;keyboardIndex=SIZE*10+10;setTool('single');resetView();
  renderPalette();updateUI();drawArt($('pattern-preview'),pattern.data,true);renderShelf();rebuildBeads();updateLabels();updateHover(-1);persist(true);$('catalog-dialog').close();
  toast(`已拿出「${pattern.name}」的拼板，慢慢来 ✿`);
}
function setTool(value){endStroke();tool=value;document.querySelectorAll('[data-tool]').forEach(b=>{const active=b.dataset.tool===tool;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});updateUI();updateHover(hoverIndex);}
document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
function beginStroke(){if(!stroke)stroke=new Map();}
function paint(index,erase=tool==='erase'){
  if(index<0||index>=cells.length)return;const value=erase?0:selected;if(cells[index]===value)return;
  beginStroke();if(!stroke.has(index))stroke.set(index,cells[index]);cells[index]=value;
  if(value)animation.set(index,performance.now());else animation.delete(index);
  setBead(index);updateLabels();updateWarnings();updateUI();persist();playNote(erase);needsRender=true;
}
function endStroke(){if(stroke?.size){history.push([...stroke.entries()]);if(history.length>150)history.shift();}stroke=null;if($('undo-btn'))$('undo-btn').disabled=history.length===0;}
function undo(){endStroke();const action=history.pop();if(!action)return;action.forEach(([i,previous])=>{cells[i]=previous;animation.delete(i);setBead(i);});updateLabels();updateWarnings();updateUI();persist();playNote(true);needsRender=true;toast('已撤回上一笔');}
$('undo-btn').addEventListener('click',undo);

const cols=28,offset=2;
function positionFor(index){return {x:(index%SIZE)-(SIZE-1)/2,z:Math.floor(index/SIZE)-(SIZE-1)/2};}
function roundedShape(w,h,r){const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);return s;}
function makePlate(w,h,r,depth,color,y){const g=new THREE.ExtrudeGeometry(roundedShape(w,h,r),{depth,bevelEnabled:true,bevelThickness:.14,bevelSize:.16,bevelSegments:3,curveSegments:8,steps:1});g.rotateX(-Math.PI/2);const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.18,roughness:.48,metalness:0}));mesh.position.y=y;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;}
function makeBeadGeometry(){
  const pts=[[.18,0],[.33,0],[.39,.055],[.405,.10],[.405,.43],[.39,.50],[.34,.535],[.215,.535],[.17,.49],[.155,.43],[.155,.10],[.165,.035],[.18,0]];
  return new THREE.LatheGeometry(pts.map(([r,h])=>new THREE.Vector2(r,h)),28);
}
function init3D(){
  try{
    renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setClearColor(0x000000,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.86;
    $('scene').append(renderer.domElement);scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-20,20,14,-14,.1,150);
    const ambient=new THREE.HemisphereLight('#fff8ed','#b29576',1.15);scene.add(ambient);
    const key=new THREE.DirectionalLight('#fff9ef',2.45);key.position.set(-15,36,-13);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:80});key.shadow.bias=-.0002;key.shadow.normalBias=.035;key.shadow.radius=3;scene.add(key);
    const fill=new THREE.DirectionalLight('#eef3e9',.70);fill.position.set(12,12,18);scene.add(fill);
    const shadow=new THREE.Mesh(new THREE.PlaneGeometry(90,90),new THREE.ShadowMaterial({opacity:.14}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.52;shadow.receiveShadow=true;scene.add(shadow);
    makePlate(cols+2.1,SIZE+2.1,1.1,.50,'#e5cbb0',-.32);
    makePlate(cols+1.85,SIZE+1.85,1.05,.30,'#fff3df',.08);
    makePlate(cols+.4,SIZE+.4,.64,.15,'#f6ebd9',.34);
    const ringG=makeBeadGeometry(),mat=new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.32,metalness:0,clearcoat:.38,clearcoatRoughness:.26});
    beads=new THREE.InstancedMesh(ringG,mat,SIZE*SIZE);beads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);beads.castShadow=true;beads.receiveShadow=true;beads.frustumCulled=false;scene.add(beads);
    const pegG=new THREE.CapsuleGeometry(.11,.17,3,8);pegs=new THREE.InstancedMesh(pegG,new THREE.MeshStandardMaterial({color:'#fff9ec',roughness:.62}),cols*SIZE);pegs.castShadow=true;pegs.receiveShadow=true;
    for(let r=0;r<SIZE;r++)for(let c=0;c<cols;c++){dummy.position.set(c-(cols-1)/2,.67,r-(SIZE-1)/2);dummy.scale.setScalar(1);dummy.updateMatrix();pegs.setMatrixAt(r*cols+c,dummy.matrix);}scene.add(pegs);
    const labelCanvas=document.createElement('canvas');labelCanvas.width=SIZE*64;labelCanvas.height=SIZE*64;const labelTex=new THREE.CanvasTexture(labelCanvas);labelTex.colorSpace=THREE.SRGBColorSpace;labelTex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);
    labelsPlane=new THREE.Mesh(new THREE.PlaneGeometry(SIZE,SIZE),new THREE.MeshBasicMaterial({map:labelTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));labelsPlane.rotation.x=-Math.PI/2;labelsPlane.position.y=.865;labelsPlane.renderOrder=2;scene.add(labelsPlane);
    const frameShape=roundedShape(.91,.91,.15),framePts=frameShape.getPoints(40).map(p=>new THREE.Vector3(p.x,1.10,-p.y));hoverFrame=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(framePts),new THREE.LineBasicMaterial({color:'#65baa0',transparent:true,opacity:.9}));hoverFrame.visible=false;scene.add(hoverFrame);
    ghostBead=new THREE.Mesh(ringG,new THREE.MeshPhysicalMaterial({color:COLORS[selected].hex,transparent:true,opacity:.42,roughness:.4,depthWrite:false}));ghostBead.visible=false;scene.add(ghostBead);
    warningRings=new THREE.InstancedMesh(new THREE.TorusGeometry(.43,.026,6,24),new THREE.MeshBasicMaterial({color:'#d47465',transparent:true,opacity:.75}),SIZE*SIZE);warningRings.frustumCulled=false;scene.add(warningRings);
    hitPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-.83);
    rebuildBeads();updateLabels();resizeScene();new ResizeObserver(resizeScene).observe($('scene'));requestAnimationFrame(tick);
  }catch(error){console.warn('3D renderer unavailable:',error.message);canvasFallback=true;renderer=null;$('scene').replaceChildren();const canvas=document.createElement('canvas');canvas.width=900;canvas.height=900;$('scene').append(canvas);new ResizeObserver(renderFallback).observe($('scene'));renderFallback();toast('当前设备已切换为轻量拼板，仍可正常拼豆');}
}
function setBead(index,animValue=null){
  if(!beads){if(canvasFallback)renderFallback();return;}
  const p=positionFor(index);dummy.position.set(p.x,.51+(animValue===null?0:(1-animValue)**2*1.5),p.z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(cells[index]?1:0);dummy.updateMatrix();beads.setMatrixAt(index,dummy.matrix);beads.setColorAt(index,new THREE.Color(COLORS[cells[index]||1].hex));beads.instanceMatrix.needsUpdate=true;if(beads.instanceColor)beads.instanceColor.needsUpdate=true;needsRender=true;
}
function rebuildBeads(){for(let i=0;i<cells.length;i++)setBead(i);updateWarnings();needsRender=true;}
function updateWarnings(){
  if(!warningRings)return;
  for(let i=0;i<cells.length;i++){const p=positionFor(i);dummy.position.set(p.x,1.065,p.z);dummy.rotation.set(Math.PI/2,0,0);dummy.scale.setScalar(pattern.id!=='free'&&cells[i]&&cells[i]!==pattern.data[i]?1:0);dummy.updateMatrix();warningRings.setMatrixAt(i,dummy.matrix);}warningRings.instanceMatrix.needsUpdate=true;dummy.rotation.set(0,0,0);needsRender=true;
}
function updateLabels(){
  if(canvasFallback){renderFallback();return;}if(!labelsPlane)return;
  const canvas=labelsPlane.material.map.image,ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);labelsPlane.visible=guide;
  if(guide){ctx.font='600 23px Nunito, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';for(let i=0;i<cells.length;i++){const c=pattern.data[i];if(!c||cells[i])continue;const x=(i%SIZE+.5)*64,y=(Math.floor(i/SIZE)+.5)*64;
    ctx.fillStyle=shade(COLORS[c].hex,.53)+(c===selected?'d9':'98');ctx.beginPath();ctx.arc(x,y,25,0,Math.PI*2);ctx.fill();ctx.fillStyle=c===selected?'#896444c9':'#9b897894';ctx.fillText(String(c),x,y+1);
  }}labelsPlane.material.map.needsUpdate=true;needsRender=true;
}
function resizeScene(){if(!renderer)return;const r=$('scene').getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);const h=SIZE+3;camera.left=-h*r.width/r.height/2;camera.right=-camera.left;camera.top=h/2;camera.bottom=-h/2;camera.updateProjectionMatrix();updateCamera();}
function updateCamera(){if(!camera)return;const radius=44;camera.position.set(panX+Math.sin(yaw)*Math.cos(pitch)*radius,Math.sin(pitch)*radius,panZ+Math.cos(yaw)*Math.cos(pitch)*radius);camera.lookAt(panX,0,panZ);camera.zoom=zoom;camera.updateProjectionMatrix();camera.updateMatrixWorld();needsRender=true;$('zoom-label').textContent=Math.round(zoom*100)+'%';}
function setZoom(v){zoom=Math.max(.85,Math.min(1.7,v));updateCamera();if(canvasFallback)renderFallback();}
function resetView(){zoom=1;panX=0;panZ=0;yaw=0;pitch=1.06;updateCamera();if(canvasFallback)renderFallback();}
$('zoom-in').addEventListener('click',()=>setZoom(zoom+.15));$('zoom-out').addEventListener('click',()=>setZoom(zoom-.15));$('reset-view').addEventListener('click',resetView);
function tick(now){
  if(renderer){for(const [i,start] of animation){const t=Math.min(1,(now-start)/190);setBead(i,t);if(t===1)animation.delete(i);}if(needsRender){renderer.render(scene,camera);needsRender=false;}}
  requestAnimationFrame(tick);
}
function updateHover(index){
  hoverIndex=index;
  if(!hoverFrame){if(canvasFallback)renderFallback();return;}
  hoverFrame.visible=index>=0;ghostBead.visible=index>=0&&!cells[index]&&tool!=='erase';
  if(index>=0){const p=positionFor(index);hoverFrame.position.set(p.x,0,p.z);hoverFrame.material.color.set(tool==='erase'?'#d18e7b':'#65baa0');ghostBead.position.set(p.x,.56,p.z);ghostBead.material.color.set(COLORS[selected].hex);}needsRender=true;
}
function hitIndex(clientX,clientY){
  const rect=$('scene').getBoundingClientRect();
  if(canvasFallback){const canvas=$('scene').querySelector('canvas'),r=canvas.getBoundingClientRect(),pad=r.width*.045,step=(r.width-pad*2)/SIZE,c=Math.floor((clientX-r.left-pad)/step),row=Math.floor((clientY-r.top-pad)/step);return c>=0&&c<SIZE&&row>=0&&row<SIZE?row*SIZE+c:-1;}
  if(!camera)return-1;pointer.set((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const p=new THREE.Vector3();if(!raycaster.ray.intersectPlane(hitPlane,p))return-1;const c=Math.round(p.x+(SIZE-1)/2),r=Math.round(p.z+(SIZE-1)/2);return c>=0&&c<SIZE&&r>=0&&r<SIZE?r*SIZE+c:-1;
}
let dragging=false,pointerId=null,lastIndex=-1,lastClient=null,viewDragging=false,panDragging=false;
function drawLine(a,b){if(a<0||b<0){if(b>=0)paint(b);return;}let x0=a%SIZE,y0=Math.floor(a/SIZE),x1=b%SIZE,y1=Math.floor(b/SIZE),dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1,err=dx+dy;
  while(true){paint(y0*SIZE+x0);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>=dy){err+=dy;x0+=sx;}if(e2<=dx){err+=dx;y0+=sy;}}
}
$('scene').addEventListener('pointerdown',e=>{
  if(pointerId!==null)return;e.preventDefault();$('scene').focus({preventScroll:true});pointerId=e.pointerId;try{$('scene').setPointerCapture(e.pointerId);}catch{}
  if(e.button===2||e.shiftKey){viewDragging=true;panDragging=e.shiftKey;lastClient={x:e.clientX,y:e.clientY};return;}
  if(e.button!==0&&e.pointerType==='mouse'){pointerId=null;return;}dragging=true;lastIndex=hitIndex(e.clientX,e.clientY);updateHover(lastIndex);beginStroke();if(lastIndex>=0){keyboardIndex=lastIndex;paint(lastIndex);}if(tool==='single')endStroke();
});
$('scene').addEventListener('pointermove',e=>{
  if(viewDragging&&pointerId===e.pointerId){const dx=e.clientX-lastClient.x,dy=e.clientY-lastClient.y;if(panDragging){panX-=dx*.036/zoom;panZ-=dy*.043/zoom;}else{yaw=Math.max(-.42,Math.min(.42,yaw-dx*.006));pitch=Math.max(.85,Math.min(1.40,pitch+dy*.004));}lastClient={x:e.clientX,y:e.clientY};updateCamera();return;}
  const idx=hitIndex(e.clientX,e.clientY);updateHover(idx);if(dragging&&pointerId===e.pointerId&&tool!=='single'&&idx!==lastIndex){drawLine(lastIndex,idx);lastIndex=idx;if(idx>=0)keyboardIndex=idx;}
});
function endPointer(e){if(e&&pointerId!==e.pointerId)return;dragging=false;viewDragging=false;lastIndex=-1;if(pointerId!==null){try{$('scene').releasePointerCapture(pointerId);}catch{}}pointerId=null;endStroke();}
$('scene').addEventListener('pointerup',endPointer);$('scene').addEventListener('pointercancel',endPointer);$('scene').addEventListener('lostpointercapture',()=>{dragging=false;viewDragging=false;pointerId=null;endStroke();});$('scene').addEventListener('pointerleave',()=>{if(!dragging&&!viewDragging)updateHover(-1);});$('scene').addEventListener('contextmenu',e=>e.preventDefault());
$('scene').addEventListener('wheel',e=>{e.preventDefault();setZoom(zoom-e.deltaY*.001);},{passive:false});
function renderFallback(){
  const canvas=$('scene').querySelector('canvas');if(!canvas)return;const r=$('scene').getBoundingClientRect(),s=Math.min(r.height,r.width);canvas.style.width=s+'px';canvas.style.height=s+'px';canvas.style.margin='0 auto';canvas.width=900;canvas.height=900;drawArt(canvas,cells,true);const ctx=canvas.getContext('2d'),pad=900*.045,step=(900-pad*2)/SIZE;
  if(guide)for(let i=0;i<cells.length;i++)if(pattern.data[i]&&!cells[i]){const x=pad+(i%SIZE+.5)*step,y=pad+(Math.floor(i/SIZE)+.5)*step;ctx.fillStyle=shade(COLORS[pattern.data[i]].hex,.5);ctx.beginPath();ctx.arc(x,y,step*.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8d7157';ctx.font='600 19px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pattern.data[i],x,y);}
  if(hoverIndex>=0){const x=pad+(hoverIndex%SIZE)*step,y=pad+Math.floor(hoverIndex/SIZE)*step;ctx.strokeStyle='#69b497';ctx.lineWidth=4;ctx.strokeRect(x,y,step,step);}
}
function toggleGuide(value=!guide){guide=value;$('guide-btn').innerHTML=icon('eye')+(guide?'编号提示':'编号已隐藏');$('guide-btn').classList.toggle('active',guide);$('guide-btn').setAttribute('aria-pressed',String(guide));$('guide-toggle').checked=guide;updateLabels();persist();}
function toggleSound(value=!sound){sound=value;$('sound-btn').innerHTML=icon(sound?'sound':'mute');$('sound-btn').setAttribute('aria-label',sound?'关闭音效':'开启音效');$('sound-btn').title=sound?'关闭音效':'开启音效';$('sound-toggle').checked=sound;persist();if(sound)playNote();}
$('guide-btn').addEventListener('click',()=>toggleGuide());$('guide-toggle').addEventListener('change',e=>toggleGuide(e.target.checked));$('sound-btn').addEventListener('click',()=>toggleSound());$('sound-toggle').addEventListener('change',e=>toggleSound(e.target.checked));
$('scene').addEventListener('keydown',e=>{
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Enter'].includes(e.key)){
    e.preventDefault();const c=keyboardIndex%SIZE,r=Math.floor(keyboardIndex/SIZE);
    if(e.key==='ArrowUp')keyboardIndex=Math.max(0,r-1)*SIZE+c;if(e.key==='ArrowDown')keyboardIndex=Math.min(SIZE-1,r+1)*SIZE+c;
    if(e.key==='ArrowLeft')keyboardIndex=r*SIZE+Math.max(0,c-1);if(e.key==='ArrowRight')keyboardIndex=r*SIZE+Math.min(SIZE-1,c+1);
    if(e.key===' '||e.key==='Enter'){beginStroke();paint(keyboardIndex);endStroke();}updateHover(keyboardIndex);
  }
});
document.addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]')||['INPUT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();return;}
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(/^[1-9]$/.test(e.key)){const c=Number(e.key);if(pattern.id==='free'||usedColors(pattern).includes(c))selectColor(c);}
  if(e.key.toLowerCase()==='q')setTool('single');if(e.key.toLowerCase()==='w')setTool('draw');if(e.key.toLowerCase()==='e')setTool('erase');
});

function showDialog(id){endPointer();$(id).showModal();}
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('settings-btn').addEventListener('click',()=>showDialog('settings-dialog'));$('restart-btn').addEventListener('click',()=>showDialog('confirm-dialog'));
$('confirm-restart').addEventListener('click',()=>{
  endStroke();const previous=cells.map((c,i)=>[i,c]).filter(([,c])=>c);if(previous.length)history.push(previous);cells.fill(0);animation.clear();rebuildBeads();updateLabels();updateUI();persist(true);$('confirm-dialog').close();toast('空白拼板准备好了，重新开始一段小美好');
});
function findNext(){
  if(pattern.id==='free'){toast('自由创作没有图纸，随心放豆就好 ✿');return;}
  let index=pattern.data.findIndex((c,i)=>c===selected&&c!==cells[i]);
  if(index<0)index=pattern.data.findIndex((c,i)=>c&&c!==cells[i]);
  if(index<0)index=cells.findIndex((c,i)=>c&&c!==pattern.data[i]);
  if(index<0){toast('每一颗都拼对啦，现在可以熨烫收藏！');return;}
  if(pattern.data[index]){selectColor(pattern.data[index]);if(tool==='erase')setTool('single');}else setTool('erase');
  keyboardIndex=index;const p=positionFor(index);if(zoom>1.1){panX=p.x*.55;panZ=p.z*.55;updateCamera();}updateHover(index);$('scene').focus({preventScroll:true});
  toast(pattern.data[index]?`这颗小空位需要 ${pattern.data[index]} 号 · ${COLORS[pattern.data[index]].name}`:'这颗豆粒在图案外，用橡皮轻轻擦掉吧');
}
$('hint-btn').addEventListener('click',findNext);
let catalogFilter='全部';
function renderCatalog(){
  const filters=['全部','小动物','小食物','小植物','小风景','小心意','自由创作'];
  $('catalog-filters').innerHTML=filters.map(f=>`<button class="${f===catalogFilter?'active':''}" aria-pressed="${f===catalogFilter}">${f}</button>`).join('');
  $('catalog-filters').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{catalogFilter=b.textContent;renderCatalog();}));
  $('catalog-grid').innerHTML=PATTERNS.filter(p=>catalogFilter==='全部'||p.category===catalogFilter).map(p=>`<button class="catalog-item ${p.id===pattern.id?'active':''}" data-pattern="${p.id}" aria-label="选择图案 ${p.name}" aria-pressed="${p.id===pattern.id}"><span class="catalog-tag">${p.tag}</span>${p.id==='free'?'<div class="free-canvas" aria-hidden="true">+</div>':'<canvas width="240" height="240" aria-hidden="true"></canvas>'}<h3>${p.name}</h3><p>${p.id==='free'?'12 种颜色 · 随心创作':`${p.difficulty} · ${p.data.filter(Boolean).length} 颗 · ${usedColors(p).length} 色`}</p></button>`).join('');
  $('catalog-grid').querySelectorAll('button').forEach(b=>{const p=PATTERNS.find(p=>p.id===b.dataset.pattern);if(p.id!=='free')drawArt(b.querySelector('canvas'),p.data);b.addEventListener('click',()=>switchPattern(p.id));});
}
function openCatalog(){catalogFilter='全部';renderCatalog();showDialog('catalog-dialog');}
$('change-pattern').addEventListener('click',openCatalog);$('all-patterns').addEventListener('click',openCatalog);
function openCollection(){
  const list=saved.collection.slice().reverse();
  $('collection-grid').innerHTML=list.length?list.map((p,i)=>`<article class="collection-item"><canvas width="240" height="240" aria-label="${PATTERNS.find(v=>v.id===p.id).name}作品"></canvas><h3>${PATTERNS.find(v=>v.id===p.id).name}</h3><p>${new Date(p.date).toLocaleDateString('zh-CN',{month:'long',day:'numeric'})} · ${p.cells.filter(Boolean).length} 颗</p><button data-download="${i}">保存图片 ↓</button></article>`).join(''):'<div class="empty-collection"><div class="empty-flower">✿</div><h3>可爱，正在慢慢发生</h3><p>完成一张图案，再轻轻熨烫一下，<br/>你的第一件作品就会被收藏在这里。</p><button class="primary-button" id="back-to-work">回去拼一颗</button></div>';
  $('collection-grid').querySelectorAll('article').forEach((el,i)=>{drawArt(el.querySelector('canvas'),list[i].cells);el.querySelector('button').addEventListener('click',()=>downloadArtwork(list[i]));});
  $('back-to-work')?.addEventListener('click',()=>$('collection-dialog').close());showDialog('collection-dialog');
}
$('collection-tab').addEventListener('click',openCollection);$('work-tab').addEventListener('click',()=>{$('collection-dialog').close();$('scene').focus({preventScroll:true});});
function finish(){
  const p=progress(pattern,cells);if(pattern.id==='free'&&!p.placed){toast('先拼一颗豆，把灵感放在拼板上吧');$('scene').focus({preventScroll:true});return;}
  if(pattern.id!=='free'&&(p.correct!==p.total||p.wrong)){findNext();return;}
  if(completionTimer)return;
  const entry={id:pattern.id,cells:cells.slice(),date:new Date().toISOString()},isNew=!saved.collection.some(p=>p.id===entry.id&&p.cells.every((v,i)=>v===entry.cells[i]));
  $('pressing').hidden=false;$('completion-result').hidden=true;$('confetti').replaceChildren();showDialog('complete-dialog');
  completionTimer=setTimeout(()=>{
    completionTimer=null;if(isNew){saved.collection.push(entry);saved.coins+=pattern.reward;persist(true);}completedEntry=entry;
    drawArt($('completed-preview'),entry.cells);$('completed-name').textContent=pattern.name;$('completion-reward').textContent=isNew?`已收藏到作品集 · 获得 ${pattern.reward} 枚小金币 ✦`:'这件可爱已在作品集里，可以再次保存图片';
    $('pressing').hidden=true;$('completion-result').hidden=false;updateUI();
    if($('complete-dialog').open)for(let i=0;i<26;i++){const el=document.createElement('i');el.style.cssText=`left:${(i*41)%100}%;--c:${COLORS[i%8+1].hex};--delay:${i%7*.09}s`; $('confetti').append(el);}playNote();
  },2100);
}
$('finish-btn').addEventListener('click',finish);
$('complete-dialog').addEventListener('close',()=>{if(completionTimer){clearTimeout(completionTimer);completionTimer=null;}});
function downloadArtwork(entry){
  if(!entry)return;const p=PATTERNS.find(p=>p.id===entry.id),canvas=document.createElement('canvas');canvas.width=1000;canvas.height=1140;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff6e8';ctx.fillRect(0,0,1000,1140);
  const art=document.createElement('canvas');art.width=880;art.height=880;drawArt(art,entry.cells);ctx.drawImage(art,60,45);
  ctx.textAlign='center';ctx.fillStyle='#785944';ctx.font='700 38px "Noto Sans SC",sans-serif';ctx.fillText(p.name,500,988);ctx.fillStyle='#a68e72';ctx.font='22px sans-serif';ctx.fillText('拼豆小工坊 · 一颗一颗，拼好的可爱',500,1042);ctx.font='14px sans-serif';ctx.fillText('LITTLE BEAD ATELIER',500,1090);
  canvas.toBlob(blob=>{if(!blob){toast('图片生成失败，请重试');return;}const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=`拼豆小工坊-${p.name}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('作品图片已保存，带走这份小可爱 ✿');},'image/png');
}
$('download-btn').addEventListener('click',()=>downloadArtwork(completedEntry));$('next-pattern-btn').addEventListener('click',()=>{$('complete-dialog').close();openCatalog();});

renderPalette();renderShelf();updateUI();drawArt($('pattern-preview'),pattern.data,true);init3D();toggleGuide(guide);toggleSound(sound);renderMusic();persist(true);
