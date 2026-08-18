window.RM=window.RM||{};
(function(RM){
const SUITS=['m','p','s'];
const HONORS=['E','S','W','N','haku','hatsu','chun'];
const NAMES=[];
for(const s of SUITS)for(let n=1;n<=9;n++)NAMES.push(n+s);
for(const h of HONORS)NAMES.push(h);
const INDEX={};NAMES.forEach((n,i)=>{INDEX[n]=i});
HONORS.forEach((h,i)=>{INDEX[(i+1)+'z']=27+i});
function T(n){const i=INDEX[n];if(i===undefined)throw new Error('bad tile: '+n);return i}
const name=i=>NAMES[i];
const PRETTY={E:'East',S:'South',W:'West',N:'North',haku:'White Dragon',hatsu:'Green Dragon',chun:'Red Dragon'};
function pretty(i){const n=NAMES[i];if(PRETTY[n])return PRETTY[n];const s={m:'Characters',p:'Circles',s:'Bamboo'}[n[1]];return n[0]+' '+s}
const isHonor=i=>i>=27, isWind=i=>i>=27&&i<=30, isDragon=i=>i>=31;
const num=i=>i<27?(i%9)+1:0;
const suit=i=>i<27?SUITS[(i/9)|0]:'z';
const isTerminal=i=>i<27&&(i%9===0||i%9===8);
const isTOH=i=>isHonor(i)||isTerminal(i);
const isSimple=i=>!isTOH(i);
const GREEN=new Set([T('2s'),T('3s'),T('4s'),T('6s'),T('8s'),T('hatsu')]);
const RED_BASE=[T('5m'),T('5p'),T('5s')];
function counts(tiles){const c=new Array(34).fill(0);for(const t of tiles)c[typeof t==='number'?t:t.t]++;return c}
function fromCounts(c){const a=[];for(let i=0;i<34;i++)for(let k=0;k<c[i];k++)a.push(i);return a}
/* "234m 456p 11s E" or "123m456p" or "11z" */
function parse(str){
  const out=[];
  for(const tok of String(str).trim().split(/\s+/)){
    if(!tok)continue;
    const m=/^([0-9]+)([mpsz])$/.exec(tok);
    if(m){for(const d of m[1])out.push(m[2]==='z'?T(d+'z'):T(d+m[2]))}
    else if(/^[ESWN]+$/.test(tok)){for(const ch of tok)out.push(T(ch))}
    else out.push(T(tok));
  }
  return out;
}
function fmt(tiles){return tiles.map(t=>NAMES[typeof t==='number'?t:t.t]).join(' ')}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function shuffle(arr,rnd){for(let i=arr.length-1;i>0;i--){const j=(rnd()*(i+1))|0;const x=arr[i];arr[i]=arr[j];arr[j]=x}return arr}
/* 136 tiles, one red five per numbered suit */
function buildWall(seed){
  const rnd=mulberry32((seed>>>0)||1);const tiles=[];let id=0;
  for(let t=0;t<34;t++)for(let k=0;k<4;k++)tiles.push({id:id++,t,red:k===0&&RED_BASE.indexOf(t)>=0});
  return shuffle(tiles,rnd);
}
function doraNext(i){
  if(i<27){const b=((i/9)|0)*9;return b+((i-b+1)%9)}
  if(i<31)return 27+((i-27+1)%4);
  return 31+((i-31+1)%3);
}
Object.assign(RM,{SUITS,HONORS,NAMES,T,name,pretty,isHonor,isWind,isDragon,num,suit,isTerminal,isTOH,isSimple,GREEN,RED_BASE,counts,fromCounts,parse,fmt,mulberry32,shuffle,buildWall,doraNext});
})(window.RM);
