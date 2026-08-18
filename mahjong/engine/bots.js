(function(RM){
const {counts,shanten,ukeire,waits,isTOH,isHonor,num,suit,name,pretty}=RM;
/* ---- what everyone can see ---- */
function visibleCounts(st,seat){
  const v=new Array(34).fill(0);
  for(const p of st.players){
    for(const d of p.discards)v[d.tile]++;
    for(const m of p.melds){
      if(m.type==='chi'){v[m.tile]++;v[m.tile+1]++;v[m.tile+2]++}
      else v[m.tile]+=(m.type==='kan'||m.type==='ankan')?4:3;
    }
  }
  for(const d of st.doraIndicators.slice(0,st.doraRevealed))v[d]++;
  for(const t of st.players[seat].hand)v[t.t]++;
  return v;
}
/* ---- safety against one riichi player ---- */
function safetyVs(st,threat,tile,vis){
  const p=st.players[threat];
  /* genbutsu: they discarded it themselves */
  if(p.discards.some(d=>d.tile===tile))return {level:'safe',why:'they discarded it themselves'};
  /* anyone's discard after their riichi is also safe */
  if(p.riichiTurn>=0){
    for(const q of st.players){
      if(q.seat===threat)continue;
      for(let i=0;i<q.discards.length;i++){
        if(q.discards[i].tile===tile&&i>=p.riichiTurn)return {level:'safe',why:'passed after the riichi'};
      }
    }
  }
  if(isHonor(tile)){
    const seen=vis?vis[tile]:0;
    if(seen>=3)return {level:'near',why:'three copies are already visible'};
    return {level:'live',why:'a live honour'};
  }
  const n=num(tile),s=suit(tile);
  const sujiOf=t=>p.discards.some(d=>suit(d.tile)===s&&num(d.tile)===t);
  if(n<=3&&sujiOf(n+3))return {level:'suji',why:'suji of their '+(n+3)+s};
  if(n>=7&&sujiOf(n-3))return {level:'suji',why:'suji of their '+(n-3)+s};
  if(n>=4&&n<=6&&sujiOf(n-3)&&sujiOf(n+3))return {level:'suji',why:'double suji'};
  if(n===1||n===9)return {level:'near',why:'a terminal — only one ryanmen reaches it'};
  return {level:'live',why:'live against their wait'};
}
const RISK={safe:0,suji:0.35,near:0.5,live:1};
function threats(st,seat){return st.players.filter(p=>p.seat!==seat&&p.riichi).map(p=>p.seat)}
/* ---- per-tile analysis: drives both bots and the player's tips ---- */
function analyze(st,seat){
  const p=st.players[seat];
  const c=counts(p.hand);
  const vis=visibleCounts(st,seat);
  const th=threats(st,seat);
  const base=shanten(c,p.melds);
  const seen={};const out=[];
  for(const tl of p.hand){
    if(seen[tl.t])continue;seen[tl.t]=1;
    c[tl.t]--;
    const u=ukeire(c,p.melds,vis);
    c[tl.t]++;
    let risk=0;const safety=[];
    for(const s of th){
      const sf=safetyVs(st,s,tl.t,vis);
      safety.push(Object.assign({seat:s},sf));
      risk=Math.max(risk,RISK[sf.level]);
    }
    out.push({tile:tl.t,shanten:u.shanten,ukeire:u.total,accepts:u.tiles,risk,safety});
  }
  out.sort((a,b)=>a.shanten-b.shanten||b.ukeire-a.ukeire);
  return {base,threats:th,tiles:out,vis};
}
/* ---- why this tile is expendable, in words ---- */
function explainCut(st,seat,tile,vis){
  const p=st.players[seat];const c=counts(p.hand);
  const s=suit(tile),n=num(tile);
  const has=t=>t>=0&&t<34&&c[t]>0;
  if(isHonor(tile)){
    if(c[tile]===1){
      const seen=vis[tile];
      return seen>=3?'a lone honour with every other copy gone — it can never become a set'
                   :'a lone honour with no shape behind it';
    }
    return 'a spare honour pair that is not worth the wait';
  }
  const same=suit=>true;
  const near=(o)=>has(tile+o)&&suit(tile+o)===s;
  const connected=near(-2)||near(-1)||near(1)||near(2);
  if(c[tile]===1&&!connected)return n===1||n===9?'an isolated terminal — the hardest tile to build around':'a floater with nothing next to it';
  if(near(-1)||near(1))return 'part of a run in progress, but the weakest of them';
  if(near(-2)||near(2))return 'half of a gapped shape, the least useful block here';
  return 'the least useful tile in the hand';
}
/* ---- bot discard choice ---- */
function chooseDiscard(st,seat){
  const a=analyze(st,seat);
  const p=st.players[seat];
  const th=a.threats;
  const best=a.tiles[0];
  /* no threat: pure efficiency */
  if(!th.length){
    const t=a.tiles[0];
    if(t.shanten<=0)return {tile:t.tile,reason:'Tenpai — waiting on '+t.accepts.map(x=>name(x.tile)).join(' / ')+'.'};
    if(t.shanten===1)return {tile:t.tile,reason:'One away. Cutting '+name(t.tile)+' — '+explainCut(st,seat,t.tile,a.vis)+' — leaves '+t.ukeire+' tiles that reach tenpai.'};
    return {tile:t.tile,reason:'Still '+t.shanten+' away, so shedding '+name(t.tile)+': '+explainCut(st,seat,t.tile,a.vis)+'.'};
  }
  const who=st.players[th[0]];
  const safeOpts=a.tiles.filter(t=>t.risk===0);
  /* far from tenpai against a riichi → fold */
  if(a.base>=2&&safeOpts.length){
    const t=safeOpts[0];
    return {tile:t.tile,reason:'Folding — the hand is '+a.base+' away, so this takes the safe tile against '+pretty(who.wind)+'.'};
  }
  /* tenpai or 1-away: weigh value against danger */
  let bestScore=-1e9,pick=a.tiles[0];
  for(const t of a.tiles){
    const value=(t.shanten<a.base?-40:0)+(t.shanten>a.base?-100:0)+t.ukeire*2;
    const score=value-t.risk*(a.base<=0?18:30);
    if(score>bestScore){bestScore=score;pick=t}
  }
  const sf=pick.safety[0];
  const wind=pretty(who.wind).split(' ')[0];
  const reason=pick.risk===0
    ? 'Safe against '+wind+' — '+sf.why+'.'
    : (pick.shanten<=0
        ? 'Pushing. Tenpai is worth the risk here, though '+name(pick.tile)+' is '+sf.why+'.'
        : 'Best balance of shape and danger — '+name(pick.tile)+' is '+sf.why+'.');
  return {tile:pick.tile,reason};
}
/* ---- full bot turn ---- */
function botAct(st,seat){
  const acts=RM.actActions(st);
  const p=st.players[seat];
  if(acts.some(a=>a.type==='tsumo'))return {type:'tsumo',seat};
  const kan=acts.find(a=>a.type==='ankan'||a.type==='kakan');
  const a=analyze(st,seat);
  if(kan&&!a.threats.length&&a.base<=1)return Object.assign({seat},kan);
  const riichi=acts.find(a2=>a2.type==='riichi');
  if(riichi){
    const opts=a.tiles.filter(t=>riichi.tiles.indexOf(t.tile)>=0&&t.shanten<=0);
    if(opts.length){
      const t=opts.sort((x,y)=>y.ukeire-x.ukeire)[0];
      return {type:'discard',seat,tile:t.tile,riichi:true,
        reason:'Declaring riichi — tenpai on '+t.accepts.map(x=>name(x.tile)).join('/')+'.'};
    }
  }
  const d=chooseDiscard(st,seat);
  return {type:'discard',seat,tile:d.tile,reason:d.reason};
}
/* ---- bot call decision ---- */
function botCall(st,seat,options){
  const p=st.players[seat];
  if(options.some(o=>o.type==='ron'))return {type:'ron',seat};
  const c=counts(p.hand);
  const before=shanten(c,p.melds);
  const vis=visibleCounts(st,seat);
  /* only call if it advances the hand and we aren't folding */
  if(threats(st,seat).length&&before>=2)return {type:'pass',seat};
  for(const o of options){
    if(o.type==='pon'||o.type==='daiminkan'){
      const c2=c.slice();c2[o.tile]-=(o.type==='pon'?2:3);
      const after=shanten(c2,p.melds.concat([{type:o.type==='pon'?'pon':'kan',tile:o.tile}]));
      const yakuhai=RM.isDragon(o.tile)||o.tile===p.wind||o.tile===st.roundWind;
      if(after<before&&(yakuhai||before<=1))return Object.assign({seat},o);
    }
  }
  for(const o of options){
    if(o.type==='chi'&&before<=1){
      const c2=c.slice();c2[o.with[0]]--;c2[o.with[1]]--;
      const after=shanten(c2,p.melds.concat([{type:'chi',tile:Math.min(o.tile,o.with[0])}]));
      if(after<before)return Object.assign({seat},o);
    }
  }
  return {type:'pass',seat};
}
Object.assign(RM,{analyze,chooseDiscard,botAct,botCall,visibleCounts,safetyVs,threats,explainCut});
})(window.RM);
