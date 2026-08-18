(function(RM){
const {T,counts,shanten,isComplete}=RM;
const SEATS=[0,1,2,3];
const WINDS=[T('E'),T('S'),T('W'),T('N')];
function handCounts(p){const c=counts(p.hand);for(const m of p.melds){if(m.type==='chi'){c[m.tile]++;c[m.tile+1]++;c[m.tile+2]++}}return counts(p.hand)}
function concealedCounts(p){return counts(p.hand)}
/* winning tiles for a 13-tile hand (memoised — called on every discard for furiten) */
const waitCache=new Map();
function waits(p){
  const c=counts(p.hand);
  const key=c.join(',')+'|'+p.melds.length;
  const hit=waitCache.get(key);
  if(hit)return hit;
  const out=[];
  for(let i=0;i<34;i++){
    if(c[i]>=4)continue;
    c[i]++;
    if(isComplete(c,p.melds))out.push(i);
    c[i]--;
  }
  if(waitCache.size>100000)waitCache.clear();
  waitCache.set(key,out);
  return out;
}
function newGame(opts){
  opts=opts||{};
  const seed=opts.seed||((Math.random()*1e9)|0);
  const wall=RM.buildWall(seed);
  const dead=wall.splice(0,14);
  /* 4 kan replacement tiles, then 5 dora indicators, then 5 ura indicators */
  const replacements=dead.slice(0,4);
  const reserve=dead.slice(4);
  const doraPool=reserve.slice(0,5).map(t=>t.t);
  const uraPool=reserve.slice(5).map(t=>t.t);
  const st={
    seed,roundWind:T('E'),roundNumber:opts.roundNumber||1,dealer:opts.dealer||0,
    honba:opts.honba||0,riichiSticks:opts.riichiSticks||0,
    eastOnly:opts.eastOnly!==false,
    wall,replacements,deadReserve:reserve,deadSpare:[],doraPool,uraPool,
    doraIndicators:[doraPool[0]],uraIndicators:[uraPool[0]],doraRevealed:1,
    players:SEATS.map(s=>({
      seat:s,wind:WINDS[(s-(opts.dealer||0)+4)%4],hand:[],melds:[],discards:[],
      riichi:false,doubleRiichiEligible:true,riichiTurn:-1,ippatsu:false,
      furiten:false,tempFuriten:false,score:opts.scores?opts.scores[s]:25000,
      isBot:opts.botSeats?opts.botSeats.indexOf(s)>=0:s!==0,
      drawnTile:null,riichiDiscardIndex:-1
    })),
    turn:opts.dealer||0,phase:'draw',lastDiscard:null,pendingCalls:null,
    firstGoAround:true,rinshan:false,kanCount:0,chankan:false,chankanSeat:-1,log:[],result:null
  };
  for(let r=0;r<13;r++)for(const s of SEATS)st.players[s].hand.push(st.wall.pop());
  st.players.forEach(sortHand);
  return st;
}
function sortHand(p){p.hand.sort((a,b)=>a.t-b.t||a.id-b.id)}
function wallLeft(st){return st.wall.length}
function draw(st,fromDead){
  const p=st.players[st.turn];
  let tile;
  if(fromDead){
    tile=st.replacements.shift();
    /* the dead wall is refilled from the tail of the live wall, so each kan
       costs the table one draw — otherwise kan hands run a turn long */
    if(st.wall.length)st.deadSpare.push(st.wall.shift());
  }else tile=st.wall.pop();
  p.drawnTile=tile;p.hand.push(tile);
  st.rinshan=!!fromDead;
  st.phase='act';
  return tile;
}
/* --- legal actions for the player whose turn it is --- */
function actActions(st){
  const p=st.players[st.turn];const out=[];
  const c=counts(p.hand);
  /* tsumo */
  if(isComplete(c,p.melds)){
    const r=scoreFor(st,st.turn,p.drawnTile?p.drawnTile.t:null,true);
    if(!r.error)out.push({type:'tsumo'});
  }
  /* riichi */
  if(!p.riichi&&p.score>=1000&&wallLeft(st)>=4&&!p.melds.some(m=>m.type!=='ankan')){
    const options=[];
    const seen={};
    for(const t of p.hand){
      if(seen[t.t])continue;seen[t.t]=1;
      c[t.t]--;
      if(shanten(c,p.melds)===0)options.push(t.t);
      c[t.t]++;
    }
    if(options.length)out.push({type:'riichi',tiles:options});
  }
  /* ankan / shouminkan */
  if(wallLeft(st)>0&&st.kanCount<4){
    const seen={};
    for(const t of p.hand){
      if(seen[t.t])continue;seen[t.t]=1;
      if(c[t.t]===4&&(!p.riichi||shantenAfterKan(p,t.t)))out.push({type:'ankan',tile:t.t});
      else if(!p.riichi&&p.melds.some(m=>m.type==='pon'&&m.tile===t.t))out.push({type:'kakan',tile:t.t});
    }
  }
  /* discards */
  const discardable=p.riichi?(p.drawnTile?[p.drawnTile.t]:[]):Array.from(new Set(p.hand.map(t=>t.t)));
  out.push({type:'discard',tiles:discardable});
  return out;
}
function shantenAfterKan(p,t){
  const c=counts(p.hand);const before=shanten(c,p.melds);
  c[t]-=4;const after=shanten(c,p.melds.concat([{type:'ankan',tile:t}]));
  return after<=before;
}
/* --- calls on a discard --- */
function callOptions(st){
  const d=st.lastDiscard;if(!d)return [];
  const out=[];
  for(const s of SEATS){
    if(s===d.from)continue;
    const p=st.players[s];const opts=[];
    const c=counts(p.hand);
    /* ron */
    c[d.tile]++;
    if(isComplete(c,p.melds)&&!p.furiten&&!p.tempFuriten){
      const r=scoreFor(st,s,d.tile,false);
      if(!r.error)opts.push({type:'ron'});
    }
    c[d.tile]--;
    if(!p.riichi&&wallLeft(st)>0){
      if(c[d.tile]>=2)opts.push({type:'pon',tile:d.tile});
      if(c[d.tile]>=3&&st.kanCount<4)opts.push({type:'daiminkan',tile:d.tile});
      if(s===(d.from+1)%4&&d.tile<27){
        const n=d.tile%9;
        const combos=[];
        if(n>=2&&c[d.tile-2]&&c[d.tile-1])combos.push([d.tile-2,d.tile-1]);
        if(n>=1&&n<=7&&c[d.tile-1]&&c[d.tile+1])combos.push([d.tile-1,d.tile+1]);
        if(n<=6&&c[d.tile+1]&&c[d.tile+2])combos.push([d.tile+1,d.tile+2]);
        for(const k of combos)opts.push({type:'chi',tile:d.tile,with:k});
      }
    }
    if(opts.length)out.push({seat:s,options:opts});
  }
  return out;
}
function take(p,tileIdx,n){
  const got=[];
  for(let i=p.hand.length-1;i>=0&&got.length<n;i--)if(p.hand[i].t===tileIdx)got.push(p.hand.splice(i,1)[0]);
  return got;
}
function scoreFor(st,seat,winTile,tsumo){
  const p=st.players[seat];
  const c=counts(p.hand);
  if(!tsumo)c[winTile]++;
  const aka=p.hand.filter(t=>t.red).length+p.melds.reduce((a,m)=>a+(m.reds||0),0);
  return RM.score({
    concealed:c,melds:p.melds,winTile:winTile,tsumo:tsumo,
    seatWind:p.wind,roundWind:st.roundWind,isDealer:seat===st.dealer,
    riichi:p.riichi,doubleRiichi:p.doubleRiichi,ippatsu:p.ippatsu,
    rinshan:tsumo&&st.rinshan,haitei:tsumo&&wallLeft(st)===0&&!st.rinshan,
    houtei:!tsumo&&wallLeft(st)===0&&!st.chankan,chankan:!tsumo&&st.chankan,
    doraIndicators:st.doraIndicators.slice(0,st.doraRevealed),
    uraIndicators:p.riichi?st.uraIndicators.slice(0,st.doraRevealed):[],
    aka,honba:st.honba
  });
}
function updateFuriten(st,seat){
  const p=st.players[seat];const w=waits(p);
  p.furiten=p.discards.some(d=>w.indexOf(d.tile)>=0);
}
function nextTurn(st,seat){
  st.turn=(seat+1)%4;
  if(st.turn===st.dealer)st.firstGoAround=false;
  st.phase='draw';
}
/* --- main dispatcher --- */
function apply(st,action){
  const ev=[];
  const p=st.players[action.seat!==undefined?action.seat:st.turn];
  switch(action.type){
    case 'draw':{
      if(wallLeft(st)===0){return endExhaustive(st)}
      const t=draw(st);ev.push({e:'draw',seat:st.turn,tile:t.t});break;
    }
    case 'discard':{
      const idx=action.tile;
      let tile=null;
      for(let i=p.hand.length-1;i>=0;i--)if(p.hand[i].t===idx){tile=p.hand.splice(i,1)[0];break}
      if(!tile)throw new Error('cannot discard '+RM.name(idx));
      p.discards.push({tile:idx,red:tile.red,tsumogiri:p.drawnTile&&tile.id===p.drawnTile.id,riichi:action.riichi||false});
      p.drawnTile=null;p.ippatsu=false;p.tempFuriten=false;
      sortHand(p);
      if(action.riichi){p.riichi=true;p.riichiTurn=p.discards.length-1;p.ippatsu=true;p.score-=1000;st.riichiSticks++;
        if(st.firstGoAround&&p.discards.length===1)p.doubleRiichi=true;
        ev.push({e:'riichi',seat:p.seat})}
      updateFuriten(st,p.seat);
      st.lastDiscard={tile:idx,from:p.seat};
      st.rinshan=false;
      ev.push({e:'discard',seat:p.seat,tile:idx});
      const calls=callOptions(st);
      if(calls.length){st.phase='call';st.pendingCalls={options:calls,responses:{}}}
      else nextTurn(st,p.seat);
      break;
    }
    case 'tsumo':{
      const r=scoreFor(st,p.seat,p.drawnTile.t,true);
      return endWin(st,p.seat,null,r,p.drawnTile.t);
    }
    case 'ron':{
      const d=st.lastDiscard;
      const r=scoreFor(st,action.seat,d.tile,false);
      /* a robbed kan never completes — the meld stays a pon */
      if(st.chankan){
        const victim=st.players[st.chankanSeat];
        const m=victim.melds.find(x=>x.type==='kan'&&x.tile===d.tile);
        /* the robbed tile returns to the victim's hand only so the census stays 136
           for the scoring snapshot; id:-1 marks it synthetic. Safe only because
           endWin fires immediately — never let a hand continue past this point. */
        if(m){m.type='pon';victim.hand.push({id:-1,t:d.tile,red:false})}
        st.kanCount--;
      }
      return endWin(st,action.seat,d.from,r,d.tile);
    }
    case 'pon':case 'daiminkan':{
      const d=st.lastDiscard;const n=action.type==='pon'?2:3;
      const got=take(p,d.tile,n);
      const reds=got.filter(t=>t.red).length;
      p.melds.push({type:action.type==='pon'?'pon':'kan',tile:d.tile,from:d.from,reds});
      st.players[d.from].discards.pop();
      st.players.forEach(q=>{q.ippatsu=false});
      st.firstGoAround=false;
      st.turn=p.seat;
      if(action.type==='daiminkan'){st.kanCount++;revealDora(st);draw(st,true);ev.push({e:'kan',seat:p.seat,tile:d.tile})}
      else{st.phase='act';ev.push({e:'pon',seat:p.seat,tile:d.tile})}
      st.pendingCalls=null;st.lastDiscard=null;
      break;
    }
    case 'chi':{
      const d=st.lastDiscard;
      const got=[].concat(take(p,action.with[0],1),take(p,action.with[1],1));
      const base=Math.min(d.tile,action.with[0],action.with[1]);
      p.melds.push({type:'chi',tile:base,from:d.from,reds:got.filter(t=>t.red).length});
      st.players[d.from].discards.pop();
      st.players.forEach(q=>{q.ippatsu=false});
      st.firstGoAround=false;
      st.turn=p.seat;st.phase='act';st.pendingCalls=null;st.lastDiscard=null;
      ev.push({e:'chi',seat:p.seat,tile:d.tile});
      break;
    }
    case 'ankan':{
      take(p,action.tile,4);
      p.melds.push({type:'ankan',tile:action.tile,reds:0});
      st.kanCount++;st.players.forEach(q=>{q.ippatsu=false});
      revealDora(st);draw(st,true);
      ev.push({e:'ankan',seat:p.seat,tile:action.tile});
      break;
    }
    case 'kakan':{
      take(p,action.tile,1);
      const m=p.melds.find(x=>x.type==='pon'&&x.tile===action.tile);
      m.type='kan';
      st.kanCount++;st.players.forEach(q=>{q.ippatsu=false});
      ev.push({e:'kakan',seat:p.seat,tile:action.tile});
      /* an added tile can be robbed — offer ron before the kan completes */
      st.lastDiscard={tile:action.tile,from:p.seat};
      st.chankan=true;st.chankanSeat=p.seat;
      const robs=callOptions(st).map(o=>({seat:o.seat,options:o.options.filter(x=>x.type==='ron')})).filter(o=>o.options.length);
      if(robs.length){st.phase='call';st.pendingCalls={options:robs,responses:{},chankan:true}}
      else finishKan(st);
      break;
    }
    case 'pass':{
      const pc=st.pendingCalls;
      pc.responses[action.seat]='pass';
      /* passing on a ron sets temporary furiten */
      const mine=pc.options.find(o=>o.seat===action.seat);
      if(mine&&mine.options.some(o=>o.type==='ron'))st.players[action.seat].tempFuriten=true;
      if(Object.keys(pc.responses).length===pc.options.length){
        const from=st.lastDiscard.from;
        st.pendingCalls=null;nextTurn(st,from);
      }
      break;
    }
    default: throw new Error('unknown action '+action.type);
  }
  st.log.push.apply(st.log,ev);
  return {state:st,events:ev};
}
function revealDora(st){
  if(st.doraRevealed<5){
    st.doraIndicators.push(st.doraPool[st.doraRevealed]);
    st.uraIndicators.push(st.uraPool[st.doraRevealed]);
    st.doraRevealed++;
  }
}
function endWin(st,winner,loser,r,winTile){
  const deltas=[0,0,0,0];
  const honbaBonus=st.honba*300;
  if(loser===null){
    if(r.pay.each!==undefined){for(const s of SEATS)if(s!==winner)deltas[s]-=r.pay.each+st.honba*100}
    else{for(const s of SEATS){if(s===winner)continue;deltas[s]-=(s===st.dealer?r.pay.dealer:r.pay.other)+st.honba*100}}
    deltas[winner]=-deltas.reduce((a,b)=>a+b,0);
  }else{
    deltas[loser]=-(r.pay.ron+honbaBonus);
    deltas[winner]=r.pay.ron+honbaBonus;
  }
  deltas[winner]+=st.riichiSticks*1000;
  for(const s of SEATS)st.players[s].score+=deltas[s];
  st.riichiSticks=0;
  st.phase='end';
  st.result={type:'win',winner,loser,score:r,winTile,deltas,
    dealerRepeat:winner===st.dealer};
  return {state:st,events:[{e:'win',seat:winner,from:loser,result:r}]};
}
function endExhaustive(st){
  const tenpai=SEATS.filter(s=>shanten(counts(st.players[s].hand),st.players[s].melds)<=0);
  const deltas=[0,0,0,0];
  if(tenpai.length>0&&tenpai.length<4){
    const gain=3000/tenpai.length, loss=3000/(4-tenpai.length);
    for(const s of SEATS)deltas[s]=tenpai.indexOf(s)>=0?gain:-loss;
  }
  for(const s of SEATS)st.players[s].score+=deltas[s];
  st.phase='end';
  st.result={type:'draw',tenpai,deltas,dealerRepeat:tenpai.indexOf(st.dealer)>=0};
  return {state:st,events:[{e:'exhaustive',tenpai}]};
}
/* Nobody robbed the added kan: reveal the new dora and take the replacement tile. */
function finishKan(st){
  st.chankan=false;st.chankanSeat=-1;st.lastDiscard=null;st.pendingCalls=null;
  revealDora(st);draw(st,true);
}
/* Resolve every eligible seat's response to a discard, respecting priority:
   ron > kan/pon > chi. Ties on ron go to the seat closest clockwise from the discarder. */
function resolveCalls(st,decisions){
  const from=st.lastDiscard.from;
  const dist=s=>(s-from+4)%4;
  const acted=decisions.filter(d=>d.type!=='pass');
  const rons=acted.filter(d=>d.type==='ron').sort((a,b)=>dist(a.seat)-dist(b.seat));
  if(rons.length)return apply(st,rons[0]);
  const pons=acted.filter(d=>d.type==='pon'||d.type==='daiminkan');
  if(pons.length)return apply(st,pons[0]);
  const chis=acted.filter(d=>d.type==='chi');
  if(chis.length)return apply(st,chis[0]);
  /* everyone passed */
  const pc=st.pendingCalls;
  for(const o of pc.options){
    if(o.options.some(x=>x.type==='ron'))st.players[o.seat].tempFuriten=true;
  }
  if(pc.chankan){st.turn=st.chankanSeat;finishKan(st);return {state:st,events:[{e:'kanPassed'}]}}
  st.pendingCalls=null;
  nextTurn(st,from);
  return {state:st,events:[{e:'pass'}]};
}
/* Total tiles in play — invariant check for tests. */
function tileCensus(st){
  let n=st.wall.length+st.replacements.length+st.deadReserve.length+st.deadSpare.length;
  for(const p of st.players){
    n+=p.hand.length;
    n+=p.discards.length;
    for(const m of p.melds)n+=(m.type==='kan'||m.type==='ankan')?4:3;
  }
  return n;
}
Object.assign(RM,{newGame,apply,actActions,callOptions,resolveCalls,finishKan,waits,scoreFor,wallLeft,concealedCounts,endExhaustive,sortHand,tileCensus,SEATS,WINDS});
})(window.RM);
