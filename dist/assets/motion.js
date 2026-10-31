/* The House of Élan: CSS 3D architecture and one native-scroll camera timeline. */
(()=>{
const camera=document.querySelector('#world-camera'),world=document.querySelector('#elan-world');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,ease=t=>t*t*(3-2*t);
function element(cls,parent,html=''){const el=document.createElement('div');el.className=cls;el.innerHTML=html;parent.append(el);return el;}
function box(parent,x,y,z,w,h,d,color,letter=''){
 const block=element('solid',parent);block.style.transform=`translate3d(${x}px,${y}px,${z}px)`;
 const faces=[['front',w,h,`translate3d(${-w/2}px,${-h/2}px,${d/2}px)`,1],['back',w,h,`translate3d(${-w/2}px,${-h/2}px,${-d/2}px) rotateY(180deg)`,.6],['right',d,h,`translate3d(${w/2-d/2}px,${-h/2}px,0) rotateY(90deg)`,.68],['left',d,h,`translate3d(${-w/2-d/2}px,${-h/2}px,0) rotateY(-90deg)`,.84],['top',w,d,`translate3d(${-w/2}px,${-d/2-h/2}px,0) rotateX(90deg)`,1.15],['bottom',w,d,`translate3d(${-w/2}px,${h/2-d/2}px,0) rotateX(-90deg)`,.5]];
 for(const [name,fw,fh,tr,brightness]of faces){const face=document.createElement('i');face.style.cssText=`width:${fw}px;height:${fh}px;transform:${tr};background:${color};filter:brightness(${brightness})`;if(name==='front'&&letter)face.innerHTML=`<span class="block-letter">${letter}</span>`;block.append(face)}return block;
}
const entrance=element('set entrance-set',camera);element('floor-plane',camera);
for(let i=7;i>=0;i--){const layer=element('portal-layer'+(!i?' front':''),entrance);layer.style.transform=`translateZ(${-i*15}px)`;}
const left=element('door left',entrance),right=element('door right',entrance);const word=element('portal-word',entrance,'Élan<small>ENTER POSSIBILITY</small>');
for(let i=0;i<4;i++)box(entrance,0,365+i*22,90+i*65,720+i*130,28,150,'#d8c0aa');
const council=element('set council-set',camera);element('room-wall',council,'<span class="room-number">Ⅰ</span>');element('room-sign',council,'CRISIS COMMAND / THE DECISION ROOM');
box(council,0,200,20,650,30,340,'#b99a7b').classList.add('council-table');for(const x of [-260,260])for(const z of [-100,140])box(council,x,280,z,35,160,35,'#13273f');
for(const x of [-240,-80,80,240]){box(council,x,280,-190,95,40,95,'#790005');box(council,x,215,-225,95,150,20,'#4e0000');box(council,x,280,255,95,40,95,'#790005');box(council,x,215,290,95,150,20,'#4e0000');}
for(const x of [-180,0,180]){const paper=element('table-paper',council,'É / BRIEF');paper.style.left=(x-45)+'px';paper.style.top='125px';paper.style.transform='rotateX(90deg)';}
const enterprise=element('set enterprise-set',camera);element('room-wall enterprise-wall',enterprise,'<span class="room-number">Ⅱ</span>');element('room-sign',enterprise,'CRISIS COMMAND / STRATEGY');
box(enterprise,-220,245,80,170,220,170,'#d8c0aa');box(enterprise,0,180,-30,180,350,180,'#d8c0aa');box(enterprise,230,280,140,160,160,160,'#d8c0aa');
const ideaA=box(enterprise,-220,65,80,155,155,155,'#13273f','?'),ideaB=box(enterprise,0,-80,-30,170,170,170,'#790005','!'),ideaC=box(enterprise,230,130,140,145,145,145,'#13273f','+');
const stage=element('set stage-set',camera);element('room-wall',stage);element('arch-line',stage);const curtainL=element('curtain left',stage),curtainR=element('curtain right',stage);element('stage-type',stage,'Élan.');element('room-sign',stage,'THE STAGE / FIND YOUR PEOPLE');
for(let i=0;i<3;i++)box(stage,0,310+i*28,40+i*90,1000+i*100,30,190,'#bca38b');
[entrance,council,enterprise,stage].forEach(set=>element('contact-shadow',set));
const sets=[entrance,council,enterprise,stage],zs=[0,-1700,-3400,-5100];sets.forEach((el,i)=>el.style.transform=`translateZ(${zs[i]}px)`);
const acts=[...document.querySelectorAll('.journey-act')],all=[...acts,document.querySelector('#next')],dots=[...document.querySelectorAll('.dock-chapters a')],dock=document.querySelector('.experience-dock'),motion=document.querySelector('.motion-toggle');
dots.forEach(link=>link.title=link.getAttribute('aria-label'));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches,queued=false,px=0,py=0;
function update(){queued=false;const mobile=innerWidth<=700;let active=0;all.forEach((el,i)=>{if(el.getBoundingClientRect().top<innerHeight*.5)active=i});
let index=0,local=0;for(let i=0;i<acts.length;i++){const r=acts[i].getBoundingClientRect();if(r.top<=1){index=i;local=clamp(-r.top/r.height)}}
const scale=mobile?.62:1.12;
const travelling=ease(clamp((local-.25)/.75));const next=Math.min(3,index+1);
let cameraZ=lerp(-zs[index]*scale-650,-zs[next]*scale-650,travelling);
if(paused)cameraZ=-zs[Math.min(active,3)]*scale-650;
const yaw=paused||mobile?0:lerp(index%2?8:-8,next%2?8:-8,travelling);
camera.style.transform=`rotateX(${paused?0:-7+py*.1}deg) rotateY(${yaw}deg) translate3d(${paused?0:px}px,${mobile?90:30}px,${cameraZ}px) scale(${scale})`;
sets.forEach((el,i)=>{const distance=zs[i]*scale+cameraZ;el.style.visibility=distance>850||i>index+1||i<index?'hidden':'visible';const incoming=i===index+1?clamp((local-.20)/.25):1;el.style.opacity=String((distance>200?clamp((850-distance)/650):1)*incoming)});
const door=paused?0:ease(clamp(local*3.7));left.style.transform=`rotateY(${-105*door}deg)`;right.style.transform=`rotateY(${105*door}deg)`;word.style.opacity=String(1-clamp(door*2));
const spin=paused?0:(index===2?local*75:0);ideaB.style.transform=`translate3d(0,-80px,-30px) rotateY(${spin-15}deg)`;ideaA.style.transform=`translate3d(-220px,65px,80px) rotateY(${-18-spin*.2}deg)`;ideaC.style.transform=`translate3d(230px,130px,140px) rotateY(${22+spin*.3}deg)`;
const curtain=paused?.65:(index===3?ease(clamp(local*3)):.1);curtainL.style.transform=`translateX(${-200*curtain}px)`;curtainR.style.transform=`translateX(${200*curtain}px)`;
acts.forEach((el,i)=>{const r=el.getBoundingClientRect();const p=clamp(-r.top/Math.max(1,r.height-innerHeight));const opacity=1;el.style.setProperty('--copy-opacity',String(opacity));el.style.setProperty('--copy-shift',paused?'0px':(-p*20)+'px');});
dots.forEach((el,i)=>i===active?el.setAttribute('aria-current','step'):el.removeAttribute('aria-current'));document.querySelector('.dock-label').textContent=all[active].dataset.label||'The next chapter';dock.style.setProperty('--journey-progress',String(clamp(scrollY/(document.querySelector('#next').offsetTop+innerHeight))));dock.classList.toggle('dock-hidden',document.querySelector('.ed-footer').getBoundingClientRect().top<innerHeight*.7||(document.querySelector('#first-chapter')?.getBoundingClientRect().top<innerHeight*.5&&document.querySelector('#next').getBoundingClientRect().top>innerHeight*.5));world.style.opacity=active>3?'0':'1';}
function schedule(){if(!queued){queued=true;requestAnimationFrame(update)}}
function apply(){document.body.classList.toggle('motion-paused',paused);motion.setAttribute('aria-pressed',String(paused));motion.innerHTML=paused?'Motion off <span>▷</span>':'Motion on <span>Ⅱ</span>';schedule()}
motion.addEventListener('click',()=>{paused=!paused;apply()});reduced.addEventListener('change',()=>{paused=reduced.matches;apply()});window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);window.addEventListener('pointermove',e=>{if(paused||e.pointerType==='touch')return;px=(e.clientX/innerWidth-.5)*14;py=(e.clientY/innerHeight-.5)*14;schedule()},{passive:true});window.addEventListener('load',schedule);apply();
const dialog=document.querySelector('#chapter-dialog');document.querySelector('.chapters-open').addEventListener('click',()=>{dialog.showModal();document.body.classList.add('chapter-menu-open')});const close=()=>{dialog.close();document.body.classList.remove('chapter-menu-open')};document.querySelector('.chapters-close').addEventListener('click',close);dialog.addEventListener('close',()=>document.body.classList.remove('chapter-menu-open'));dialog.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
})();
