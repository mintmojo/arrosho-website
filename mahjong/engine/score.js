(function(RM){
const {isTOH,isDragon,isWind,num}=RM;
function setTiles(s){return RM.setTiles(s)}
/* fu for one parsing given a wait interpretation */
function calcFu(p,ctx,waitFu,winSetIdx){
  if(RM.isChiitoi(ctx.concealed))return 25;
  let fu=20;
  const closed=RM.isClosedHand(ctx.melds);
  if(ctx.ron&&closed)fu+=10;
  if(ctx.tsumo)fu+=2;
  p.sets.forEach((s,i)=>{
    if(s.type==='run')return;
    const toh=isTOH(s.tile);
    let concealed=s.concealed;
    /* a ron completing a concealed triplet scores it as open */
    if(ctx.ron&&i===winSetIdx&&!s.kan)concealed=false;
    if(s.kan)fu+=concealed?(toh?32:16):(toh?16:8);
    else fu+=concealed?(toh?8:4):(toh?4:2);
  });
  if(isDragon(p.pair))fu+=2;
  if(p.pair===ctx.seatWind)fu+=2;
  if(p.pair===ctx.roundWind&&isWind(p.pair))fu+=2;
  fu+=waitFu;
  /* pinfu tsumo = 20 flat; pinfu ron = 30 */
  const pinfu=fu===20+(ctx.tsumo?2:0)+(ctx.ron&&closed?10:0)&&waitFu===0;
  return Math.ceil(fu/10)*10;
}
/* All (parsing, wait) combos: returns list of {parsing, waitFu, winSetIdx} */
function waitOptions(p,ctx){
  const out=[];const w=ctx.winTile;
  if(p.pair===w)out.push({waitFu:2,winSetIdx:-1});
  p.sets.forEach((s,i)=>{
    if(s.called)return;
    if(s.type==='run'){
      const t=s.tile;
      if(w===t+1)out.push({waitFu:2,winSetIdx:i});
      else if(w===t&&num(t+2)===9)out.push({waitFu:2,winSetIdx:i});
      else if(w===t+2&&num(t)===1)out.push({waitFu:2,winSetIdx:i});
      else if(w===t||w===t+2)out.push({waitFu:0,winSetIdx:i});
    }else if(s.tile===w&&!s.kan){out.push({waitFu:0,winSetIdx:i})}
  });
  if(!out.length)out.push({waitFu:0,winSetIdx:-1});
  return out;
}
function doraCount(ctx){
  const c=ctx.concealed.slice();
  for(const m of ctx.melds||[]){
    if(m.type==='chi'){c[m.tile]++;c[m.tile+1]++;c[m.tile+2]++}
    else{const n=(m.type==='kan'||m.type==='ankan')?4:3;c[m.tile]+=n}
  }
  let d=0;
  for(const ind of ctx.doraIndicators||[]){const t=RM.doraNext(ind);d+=c[t]}
  for(const ind of ctx.uraIndicators||[]){const t=RM.doraNext(ind);d+=c[t]}
  return d+(ctx.aka||0);
}
const LIMIT=[[13,8000,'Yakuman'],[11,6000,'Sanbaiman'],[8,4000,'Baiman'],[6,3000,'Haneman'],[5,2000,'Mangan']];
function basePoints(han,fu){
  for(const [h,b,n] of LIMIT)if(han>=h)return {base:b,limit:n};
  const b=fu*Math.pow(2,2+han);
  if(b>2000)return {base:2000,limit:'Mangan'};
  return {base:b,limit:null};
}
function payments(base,isDealer,tsumo){
  const r=v=>Math.ceil(v/100)*100;
  if(tsumo){
    if(isDealer)return {each:r(base*2),total:r(base*2)*3};
    return {dealer:r(base*2),other:r(base),total:r(base*2)+r(base)*2};
  }
  const t=r(base*(isDealer?6:4));
  return {ron:t,total:t};
}
/* Main entry. ctx: see docs in tests. */
function score(ctx){
  ctx=Object.assign({melds:[],doraIndicators:[],aka:0,honba:0},ctx);
  ctx.ron=!ctx.tsumo;
  if(!RM.isComplete(ctx.concealed,ctx.melds))return {error:'not a winning hand'};
  const special=RM.evalSpecial(ctx);
  let best=null;
  const consider=(yaku,fu)=>{
    let ymul=0,han=0;
    for(const v of yaku){if(v.yakuman)ymul+=v.yakuman;else han+=v.han}
    if(ymul>0){
      const base=8000*ymul;
      const pay=payments(base,ctx.isDealer,ctx.tsumo);
      const r={yaku,han:13*ymul,fu:0,base,limit:ymul>1?ymul+'x Yakuman':'Yakuman',pay,yakuman:ymul};
      if(!best||r.pay.total>best.pay.total)best=r;
      return;
    }
    if(han===0)return;
    const dora=doraCount(ctx);
    const total=han+dora;
    const {base,limit}=basePoints(total,fu);
    const pay=payments(base,ctx.isDealer,ctx.tsumo);
    const r={yaku,han:total,hanFromYaku:han,dora,fu,base,limit,pay};
    if(!best||r.pay.total>best.pay.total)best=r;
  };
  if(special){
    const fu=RM.isChiitoi(ctx.concealed)?25:20;
    consider(special,fu);
  }
  for(const p of RM.parsings(ctx.concealed,ctx.melds)){
    const yaku=RM.evalParsing(p,ctx);
    for(const w of waitOptions(p,ctx)){
      let y=yaku;
      /* pinfu requires a 0-fu wait on this interpretation */
      if(w.waitFu!==0)y=yaku.filter(v=>v.name!=='Pinfu');
      const fu=calcFu(p,ctx,w.waitFu,w.winSetIdx);
      const isPinfu=y.some(v=>v.name==='Pinfu');
      consider(y,isPinfu?(ctx.tsumo?20:30):fu);
    }
  }
  if(!best)return {error:'no yaku'};
  best.honba=ctx.honba;
  return best;
}
Object.assign(RM,{score,calcFu,waitOptions,doraCount,basePoints,payments});
})(window.RM);
