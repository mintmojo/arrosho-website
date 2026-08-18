(function(RM){
const {isHonor,isDragon,isTerminal,isTOH,isSimple,num,suit,GREEN,T}=RM;
function isClosed(melds){return !(melds||[]).some(m=>m.type!=='ankan')}
function setTiles(s){return s.type==='run'?[s.tile,s.tile+1,s.tile+2]:[s.tile,s.tile,s.tile]}
function allTiles(p){const a=[];for(const s of p.sets)a.push.apply(a,setTiles(s));a.push(p.pair,p.pair);return a}
/* Returns [{name, han, yakuman}] for one parsing. */
function evalParsing(p,ctx){
  const y=[];const closed=isClosed(ctx.melds);
  const sets=p.sets, runs=sets.filter(s=>s.type==='run'), trips=sets.filter(s=>s.type!=='run');
  const tiles=allTiles(p);
  const uniq=Array.from(new Set(tiles));
  const suits=new Set(tiles.filter(t=>t<27).map(suit));
  const hasHonor=tiles.some(isHonor);
  const push=(name,han)=>y.push({name,han});
  const yk=(name)=>y.push({name,han:0,yakuman:1});
  const dyk=(name)=>y.push({name,han:0,yakuman:2});

  /* --- yakuman --- */
  let isYakuman=false;
  const dragonTrips=trips.filter(s=>isDragon(s.tile)).length;
  const windTrips=trips.filter(s=>RM.isWind(s.tile)).length;
  const concealedTrips=trips.filter(s=>s.concealed&&!(ctx.ron&&s.tile===ctx.winTile&&!s.kan)).length;
  if(ctx.tenhou){yk('Tenhou');isYakuman=true}
  if(ctx.chiihou){yk('Chiihou');isYakuman=true}
  if(dragonTrips===3){yk('Daisangen');isYakuman=true}
  if(windTrips===4){dyk('Daisuushi');isYakuman=true}
  else if(windTrips===3&&RM.isWind(p.pair)){yk('Shousuushi');isYakuman=true}
  if(concealedTrips===4){if(p.pair===ctx.winTile)dyk('Suuankou tanki');else yk('Suuankou');isYakuman=true}
  if(tiles.every(isHonor)){yk('Tsuuiisou');isYakuman=true}
  if(tiles.every(isTerminal)){yk('Chinroutou');isYakuman=true}
  if(tiles.every(t=>GREEN.has(t))){yk('Ryuuiisou');isYakuman=true}
  const kans=sets.filter(s=>s.kan).length;
  if(kans===4){yk('Suukantsu');isYakuman=true}
  if(isYakuman)return y;

  /* --- riichi & situational --- */
  if(ctx.doubleRiichi)push('Double riichi',2);else if(ctx.riichi)push('Riichi',1);
  if(ctx.ippatsu)push('Ippatsu',1);
  if(ctx.tsumo&&closed)push('Menzen tsumo',1);
  if(ctx.haitei)push('Haitei raoyue',1);
  if(ctx.houtei)push('Houtei raoyui',1);
  if(ctx.rinshan)push('Rinshan kaihou',1);
  if(ctx.chankan)push('Chankan',1);

  /* --- yakuhai --- */
  for(const s of trips){
    if(isDragon(s.tile))push('Yakuhai: '+RM.pretty(s.tile),1);
    else if(s.tile===ctx.seatWind)push('Yakuhai: seat wind',1);
    if(s.tile===ctx.roundWind&&RM.isWind(s.tile))push('Yakuhai: round wind',1);
  }
  if(dragonTrips===2&&isDragon(p.pair))push('Shousangen',2);

  /* --- shape --- */
  if(closed&&runs.length===4&&trips.length===0){
    const pw=p.pair;
    const pairYakuhai=isDragon(pw)||pw===ctx.seatWind||pw===ctx.roundWind;
    if(!pairYakuhai){
      const ryanmen=runs.some(s=>{
        const t=s.tile;
        if(ctx.winTile===t&&num(t+2)!==9)return true;
        if(ctx.winTile===t+2&&num(t)!==1)return true;
        return false;
      });
      if(ryanmen)push('Pinfu',1);
    }
  }
  if(tiles.every(isSimple))push('Tanyao',1);
  if(trips.length===4)push('Toitoitsu',2);
  if(concealedTrips===3)push('Sanankou',2);
  if(kans===3)push('Sankantsu',2);
  /* sanshoku doujun */
  for(let n=0;n<=6;n++){
    if([0,9,18].every(b=>runs.some(s=>s.tile===b+n))){push('Sanshoku doujun',closed?2:1);break}
  }
  /* sanshoku doukou */
  for(let n=0;n<9;n++){
    if([0,9,18].every(b=>trips.some(s=>s.tile===b+n))){push('Sanshoku doukou',2);break}
  }
  /* ittsu */
  for(const b of [0,9,18]){
    if([0,3,6].every(o=>runs.some(s=>s.tile===b+o))){push('Ikkitsuukan',closed?2:1);break}
  }
  /* chanta / junchan */
  const everySetTOH=sets.every(s=>setTiles(s).some(isTOH))&&isTOH(p.pair);
  if(everySetTOH){
    if(tiles.every(isTOH)){push('Honroutou',2);push('Chanta',closed?2:1)}
    else if(!hasHonor)push('Junchan',closed?3:2);
    else push('Chanta',closed?2:1);
  }
  /* iipeiko / ryanpeikou */
  if(closed){
    const cnt={};runs.forEach(s=>{cnt[s.tile]=(cnt[s.tile]||0)+1});
    const pairsOfRuns=Object.values(cnt).reduce((a,v)=>a+((v/2)|0),0);
    if(pairsOfRuns===2)push('Ryanpeikou',3);
    else if(pairsOfRuns===1)push('Iipeiko',1);
  }
  /* flush */
  if(suits.size===1){
    if(!hasHonor)push('Chinitsu',closed?6:5);
    else push('Honitsu',closed?3:2);
  }
  return y;
}
function evalSpecial(ctx){
  const c=ctx.concealed;
  if(RM.isKokushi(c)){
    const thirteen=c[ctx.winTile]===2;
    return [{name:thirteen?'Kokushi musou 13-wait':'Kokushi musou',han:0,yakuman:thirteen?2:1}];
  }
  if(RM.isChiitoi(c)){
    const y=[];
    if(ctx.doubleRiichi)y.push({name:'Double riichi',han:2});else if(ctx.riichi)y.push({name:'Riichi',han:1});
    if(ctx.ippatsu)y.push({name:'Ippatsu',han:1});
    if(ctx.tsumo)y.push({name:'Menzen tsumo',han:1});
    if(ctx.haitei)y.push({name:'Haitei raoyue',han:1});
    if(ctx.houtei)y.push({name:'Houtei raoyui',han:1});
    y.push({name:'Chiitoitsu',han:2});
    const tiles=RM.fromCounts(c);
    if(tiles.every(isSimple))y.push({name:'Tanyao',han:1});
    if(tiles.every(isHonor))return [{name:'Tsuuiisou',han:0,yakuman:1}];
    const suits=new Set(tiles.filter(t=>t<27).map(suit));
    if(suits.size===1){if(!tiles.some(isHonor))y.push({name:'Chinitsu',han:6});else y.push({name:'Honitsu',han:3})}
    if(tiles.every(isTOH))y.push({name:'Honroutou',han:2});
    return y;
  }
  /* chuuren poutou */
  const closed=isClosed(ctx.melds);
  if(closed)for(const b of [0,9,18]){
    let ok=true;
    for(let i=0;i<34;i++){const inSuit=i>=b&&i<b+9;const need=inSuit?(i===b||i===b+8?3:1):0;if(c[i]<need){ok=false;break}if(!inSuit&&c[i]>0){ok=false;break}}
    if(ok){
      let total=0;for(let i=b;i<b+9;i++)total+=c[i];
      if(total===14){
        const pure=(c[ctx.winTile]===(ctx.winTile===b||ctx.winTile===b+8?4:2));
        return [{name:pure?'Junsei chuuren poutou':'Chuuren poutou',han:0,yakuman:pure?2:1}];
      }
    }
  }
  return null;
}
Object.assign(RM,{evalParsing,evalSpecial,isClosedHand:isClosed,setTiles});
})(window.RM);
