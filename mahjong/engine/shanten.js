(function(RM){
/* --- per-suit block profiles, memoised ---
   For one suit (or the honour group) we enumerate every achievable
   (sets, partials, hasPair) triple, then combine the four groups by DP.
   Without this the bots run thousands of full recursions per discard. */
const profileCache=new Map();
function profiles(c,start,end){
  let key=start+':';
  for(let i=start;i<end;i++)key+=c[i];
  const hit=profileCache.get(key);
  if(hit)return hit;
  const res=new Set();
  function rec(i,sets,partials,pair){
    while(i<end&&c[i]===0)i++;
    if(i>=end){res.add(sets*100+partials*10+(pair?1:0));return}
    if(sets+partials<=5){
      if(c[i]>=3){c[i]-=3;rec(i,sets+1,partials,pair);c[i]+=3}
      if(i<27&&i%9<=6&&c[i+1]>0&&c[i+2]>0){c[i]--;c[i+1]--;c[i+2]--;rec(i,sets+1,partials,pair);c[i]++;c[i+1]++;c[i+2]++}
      if(c[i]>=2){c[i]-=2;rec(i,sets,partials+1,true);c[i]+=2}
      if(i<27&&i%9<=7&&c[i+1]>0){c[i]--;c[i+1]--;rec(i,sets,partials+1,pair);c[i]++;c[i+1]++}
      if(i<27&&i%9<=6&&c[i+2]>0){c[i]--;c[i+2]--;rec(i,sets,partials+1,pair);c[i]++;c[i+2]++}
    }
    c[i]--;rec(i,sets,partials,pair);c[i]++;
  }
  const copy=c.slice(start,end);
  rec(start,0,0,false);
  /* keep only the Pareto frontier: for each (sets, hasPair) the most partials */
  const bestOf=new Map();
  for(const v of res){
    const sets=(v/100)|0,partials=((v/10)|0)%10,pair=v%10;
    const k=sets*2+pair;
    if(!bestOf.has(k)||bestOf.get(k)<partials)bestOf.set(k,partials);
  }
  const out=[];
  for(const [k,partials] of bestOf)out.push([(k/2)|0,partials,k%2]);
  profileCache.set(key,out);
  return out;
}
const GROUPS=[[0,9],[9,18],[18,27],[27,34]];
function standard(counts,openMelds){
  const c=counts.slice();const om=openMelds||0;
  let states=[[0,0,0]];
  for(const [s,e] of GROUPS){
    let any=false;
    for(let i=s;i<e;i++)if(c[i]){any=true;break}
    if(!any)continue;
    const ps=profiles(c,s,e);
    const next=new Map();
    for(const [sets,partials,pair] of states){
      for(const [gs,gp,gpair] of ps){
        const ns=sets+gs, np=Math.min(partials+gp,6), npair=pair|gpair;
        if(ns+om>4)continue;
        const k=ns*100+np*10+npair;
        if(!next.has(k))next.set(k,[ns,np,npair]);
      }
    }
    states=Array.from(next.values());
    if(!states.length)states=[[0,0,0]];
  }
  let best=8;
  for(const [sets,partials,pair] of states){
    const total=sets+om;
    let p=partials;
    if(total+p>5)p=5-total;
    if(p<0)p=0;
    let sh=8-2*total-p;
    if(total+p===5&&!pair)sh+=1;
    if(sh<best)best=sh;
  }
  return best;
}
function chiitoi(counts){
  let pairs=0,kinds=0;
  for(let i=0;i<34;i++){if(counts[i]>0)kinds++;if(counts[i]>=2)pairs++}
  let sh=6-pairs;
  if(kinds<7)sh+=7-kinds;
  return sh;
}
function kokushi(counts){
  let kinds=0,hasPair=false;
  for(let i=0;i<34;i++){if(!RM.isTOH(i))continue;if(counts[i]>0)kinds++;if(counts[i]>=2)hasPair=true}
  return 13-kinds-(hasPair?1:0);
}
const shantenCache=new Map();
function shanten(counts,melds){
  const n=typeof melds==='number'?melds:(melds?melds.length:0);
  const key=counts.join(',')+'|'+n;
  const hit=shantenCache.get(key);
  if(hit!==undefined)return hit;
  let best=standard(counts,n);
  if(n===0)best=Math.min(best,chiitoi(counts),kokushi(counts));
  if(shantenCache.size>200000)shantenCache.clear();
  shantenCache.set(key,best);
  return best;
}
function ukeire(counts,melds,visible){
  const base=shanten(counts,melds);const tiles=[];let total=0;
  for(let i=0;i<34;i++){
    if(counts[i]>=4)continue;
    counts[i]++;
    const sh=shanten(counts,melds);
    counts[i]--;
    if(sh<base){
      const seen=visible?visible[i]:counts[i];
      tiles.push({tile:i,left:Math.max(0,4-seen)});
      total+=Math.max(0,4-seen);
    }
  }
  return {shanten:base,tiles,total};
}
Object.assign(RM,{standardShanten:standard,chiitoiShanten:chiitoi,kokushiShanten:kokushi,shanten,ukeire});
})(window.RM);
