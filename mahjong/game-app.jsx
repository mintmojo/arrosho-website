/* Drives the RM engine: human at seat 0, bots elsewhere. */
function useForce(){const [,s]=React.useState(0);return React.useCallback(()=>s(x=>x+1),[])}
const DELAY={draw:280,discard:520,call:420};

function newMatch(){return {hand:1,honba:0,sticks:0,dealer:0,scores:[25000,25000,25000,25000],seed:(Math.random()*1e9)|0,finished:false}}

function App(){
  const force=useForce();
  const g=React.useRef(null);
  const timer=React.useRef(null);
  const [match,setMatch]=React.useState(()=>load()||newMatch());
  const [sel,setSel]=React.useState(null);
  const [botSay,setBotSay]=React.useState(null);
  const [tipsOn,setTipsOn]=React.useState(true);
  const [hintsOn,setHintsOn]=React.useState(()=>localStorage.getItem('rm_hints')!=='off');
  const [menu,setMenu]=React.useState(false);
  const [pendingHuman,setPendingHuman]=React.useState(null);

  if(!g.current&&!match.finished)g.current=RM.newGame({
    seed:match.seed+match.hand*7919,dealer:match.dealer,honba:match.honba,
    riichiSticks:match.sticks,scores:match.scores,botSeats:[1,2,3]});

  const st=g.current;
  const schedule=(ms)=>{clearTimeout(timer.current);timer.current=setTimeout(advance,ms)};

  function advance(){
    const st=g.current;if(!st||st.phase==='end')return force();
    if(st.phase==='draw'){
      if(RM.wallLeft(st)===0){RM.endExhaustive(st);return force()}
      RM.apply(st,{type:'draw'});
      force();
      if(st.turn!==ME)schedule(DELAY.discard);
      return;
    }
    if(st.phase==='act'){
      if(st.turn===ME){setBotSay(null);return force()}
      const a=RM.botAct(st,st.turn);
      if(a.reason)setBotSay({seat:st.turn,name:NAMES[st.turn],wind:wname(st.players[st.turn].wind),tile:a.tile,text:a.reason});
      RM.apply(st,a);
      force();
      if(st.phase!=='end')schedule(st.phase==='call'?DELAY.call:DELAY.draw);
      return;
    }
    if(st.phase==='call'){
      const mine=st.pendingCalls.options.find(o=>o.seat===ME);
      if(mine){setPendingHuman(mine.options);return force()}
      const dec=st.pendingCalls.options.map(o=>RM.botCall(st,o.seat,o.options));
      RM.resolveCalls(st,dec);
      force();
      if(st.phase!=='end')schedule(DELAY.draw);
      return;
    }
  }
  React.useEffect(()=>{if(st&&st.phase==='draw')schedule(DELAY.draw);return ()=>clearTimeout(timer.current)},[]);
  React.useEffect(()=>{if(st&&st.phase==='end'){
    setMatch(m=>{const n={...m,scores:st.players.map(p=>p.score),sticks:st.riichiSticks};save(n);return n})}},[st&&st.phase]);

  if(match.finished||!st)return <div className="phone"><FinalOverlay match={match} onRestart={()=>{
    const n=newMatch();g.current=null;setMatch(n);save(n);setTimeout(()=>{advance()},60)}}/></div>;

  const me=st.players[ME];
  const acts=st.phase==='act'&&st.turn===ME?RM.actActions(st):[];
  const riichiAct=acts.find(a=>a.type==='riichi');
  const canTsumo=acts.some(a=>a.type==='tsumo');
  const kanActs=acts.filter(a=>a.type==='ankan'||a.type==='kakan');
  const myTurn=st.phase==='act'&&st.turn===ME;
  const drawn=me.drawnTile;
  const concealed=me.hand.filter(t=>!drawn||t.id!==drawn.id);

  /* analysis for the tip card */
  const info=React.useMemo(()=>{
    if(st.phase==='end')return null;
    const a=RM.analyze(st,ME);
    const th=a.threats;
    const safeVs=th.length?RM.pretty(st.players[th[0]].wind).split(' ')[0]:null;
    const safe=th.length?a.tiles.filter(t=>t.risk===0).map(t=>t.tile):null;
    if(sel!=null){
      const row=a.tiles.find(t=>t.tile===sel);
      if(row){
        const parts=[];
        if(row.shanten<0)parts.push('That is a winning hand.');
        else if(row.shanten===0)parts.push('Cutting it keeps you tenpai, waiting on '+row.accepts.map(x=>short(x.tile)).join(' / ')+'.');
        else if(row.shanten===1)parts.push('Cutting it leaves you one away, with '+row.ukeire+' tiles that reach tenpai.');
        else parts.push('Cutting it leaves you '+row.shanten+' away — '+RM.explainCut(st,ME,sel,a.vis)+'.');
        if(row.safety&&row.safety.length){
          const s=row.safety[0];
          parts.push(s.level==='safe'?'Safe — '+s.why+'.':'Risky — '+s.why+'.');
        }
        return {head:'Cutting '+short(sel),body:parts.join(' '),safe,safeVs};
      }
    }
    const best=a.tiles[0];
    const head=a.base<0?'Winning hand':(a.base===0?'You are tenpai':a.base+' away from tenpai');
    let body;
    if(a.base<=0){
      const w=RM.waits(me);
      body='Waiting on '+w.map(t=>short(t)).join(' / ')+'.'+(me.furiten?' You are furiten — you cannot win by ron.':'');
    }else if(a.base===1)body='Tap a tile to see what cutting it does. Best right now is '+short(best.tile)+', leaving '+best.ukeire+' tiles that reach tenpai.';
    else body='Tap a tile to see what cutting it does. Best right now is '+short(best.tile)+' — '+RM.explainCut(st,ME,best.tile,a.vis)+'.';
    return {head,body,safe,safeVs};
  },[st.phase,st.turn,sel,me.hand.length,me.discards.length,botSay]);

  function discard(tile,riichi){
    setSel(null);setBotSay(null);
    RM.apply(st,{type:'discard',seat:ME,tile,riichi:!!riichi});
    force();schedule(st.phase==='call'?DELAY.call:DELAY.draw);
  }
  function humanCall(choice){
    setPendingHuman(null);
    const dec=st.pendingCalls.options.map(o=>o.seat===ME?choice:RM.botCall(st,o.seat,o.options));
    RM.resolveCalls(st,dec);
    force();
    if(st.phase!=='end')schedule(st.phase==='act'&&st.turn===ME?0:DELAY.draw);
  }
  function nextHand(){
    const r=st.result;
    const repeat=r.dealerRepeat;
    if(match.hand>=4&&!repeat){const n={...match,finished:true,scores:st.players.map(p=>p.score)};setMatch(n);save(n);return}
    const n={hand:repeat?match.hand:match.hand+1,honba:repeat||r.type==='draw'?match.honba+1:0,
      sticks:st.riichiSticks,dealer:repeat?match.dealer:(match.dealer+1)%4,
      scores:st.players.map(p=>p.score),seed:match.seed,finished:false};
    g.current=null;setMatch(n);save(n);setSel(null);setBotSay(null);
    setTimeout(()=>{g.current=RM.newGame({seed:n.seed+n.hand*7919+n.honba*131,dealer:n.dealer,honba:n.honba,
      riichiSticks:n.sticks,scores:n.scores,botSeats:[1,2,3]});force();schedule(DELAY.draw)},40);
  }

  const dora=st.doraIndicators.slice(0,st.doraRevealed);
  return <div className="phone">
    <div className="topbar">
      <span className="eb" style={{color:'var(--arr-teal)'}}>East {match.hand}</span>
      {match.honba>0&&<span className="eb" style={{fontSize:8.5,color:'var(--arr-grey)'}}>{match.honba} honba</span>}
      {st.dealer===ME&&<span className="eb" style={{fontSize:8.5,color:'var(--arr-grey)',opacity:0.75}}>You deal</span>}
      <div style={{flex:1}}/>
      <div className="chip" style={{padding:'3px 7px 3px 4px',gap:4}}>
        {dora.map((d,i)=><Tile key={i} t={d} w={15}/>)}
        <span className="eb" style={{fontSize:8,color:'var(--arr-grey)'}}>dora</span></div>
      <div className="chip"><span className="num" style={{fontSize:11.5}}>{RM.wallLeft(st)}</span></div>
      <button className="chip iconbtn" onClick={()=>setMenu(m=>!m)} aria-label="Settings"><Icon name="bars" size={15}/></button>
    </div>
    {menu&&<div className="menubackdrop" onClick={()=>setMenu(false)}/>}
    {menu&&<div className="menu">
      <label className="menurow"><span style={{fontSize:12.5}}>Bot reasoning</span>
        <input type="checkbox" checked={tipsOn} onChange={e=>setTipsOn(e.target.checked)}/></label>
      <label className="menurow"><span style={{fontSize:12.5}}>Hand tips</span>
        <input type="checkbox" checked={hintsOn} onChange={e=>{setHintsOn(e.target.checked);localStorage.setItem('rm_hints',e.target.checked?'on':'off')}}/></label>
      <button className="menurow menubtn" onClick={()=>{localStorage.removeItem(STORE);location.reload()}}>Restart match</button>
    </div>}
    <div className="oppgrid">
      <OppCard st={st} seat={3}/><OppCard st={st} seat={2}/><OppCard st={st} seat={1}/>
    </div>
    <TipCard info={info} botSay={myTurn||pendingHuman?null:botSay} tipsOn={tipsOn} hintsOn={hintsOn}/>
    <div className="pond">
      <div/><Pond st={st} dir="across" seat={2}/><div/>
      <Pond st={st} dir="left" seat={3}/>
      <div className="pondinfo">
        <span className="wind-big">{wname(me.wind)}</span>
        <span className="eb" style={{fontSize:8,color:'var(--arr-grey)'}}>
          {st.dealer===ME?'Your seat · dealer':'Your seat'}</span>
        {st.riichiSticks>0&&<span className="eb" style={{fontSize:8,color:'var(--arr-flag)'}}>{st.riichiSticks} stick{st.riichiSticks>1?'s':''}</span>}
      </div>
      <Pond st={st} dir="right" seat={1}/>
      <div/><Pond st={st} dir="self" seat={ME}/><div/>
    </div>
    <div className="selfrow">
      <span style={{fontFamily:'var(--font-display)',fontSize:14,color:SEATC[wname(me.wind)]}}>{wname(me.wind)}</span>
      <span className="num" style={{fontSize:13.5}}>{me.score.toLocaleString()}</span>
      {me.riichi&&<span className="riichi-tag">Riichi</span>}
      {me.furiten&&<span className="furiten-tag">Furiten</span>}
      <div style={{flex:1}}/>
      {me.melds.length>0&&<div style={{display:'flex',gap:1}}>
        {me.melds.map((m,i)=>meldTiles(m).map((t,j)=><Tile key={i+'-'+j} t={t} w={15}/>))}</div>}
      {myTurn&&<span className="eb" style={{fontSize:8.5,color:'var(--arr-teal)'}}>Your turn</span>}
    </div>
    <div className="hand">
      <div className="hrow">{concealed.slice(0,7).map((t,i)=>
        <Tile key={t.id} t={t.t} red={t.red} w={47} sel={sel===t.t&&myTurn}
          onClick={myTurn?()=>setSel(sel===t.t?null:t.t):undefined}/>)}</div>
      <div className="hrow">{concealed.slice(7).map((t,i)=>
        <Tile key={t.id} t={t.t} red={t.red} w={47} sel={sel===t.t&&myTurn}
          onClick={myTurn?()=>setSel(sel===t.t?null:t.t):undefined}/>)}
        {drawn&&<><div style={{width:9}}/>
          <Tile t={drawn.t} red={drawn.red} w={47} sel={sel===drawn.t&&myTurn}
            onClick={myTurn?()=>setSel(sel===drawn.t?null:drawn.t):undefined}/></>}
      </div>
    </div>
    <div className="actions">
      {pendingHuman?<>
        {pendingHuman.map((o,i)=><button key={i} className="btn btn-primary"
          onClick={()=>humanCall({...o,seat:ME})}>{o.type==='ron'?'Ron':o.type==='chi'?'Chi '+o.with.map(short).join(''):o.type==='pon'?'Pon':'Kan'}</button>)}
        <button className="btn btn-ghost" onClick={()=>humanCall({type:'pass',seat:ME})}>Pass</button>
      </>:myTurn?<>
        {canTsumo&&<button className="btn btn-primary span2" onClick={()=>{
          RM.apply(st,{type:'tsumo',seat:ME});force()}}>Tsumo</button>}
        {kanActs.map((k,i)=><button key={i} className="btn btn-ghost" onClick={()=>{
          RM.apply(st,{...k,seat:ME});setSel(null);force();schedule(st.phase==='call'?DELAY.call:0)}}>Kan {short(k.tile)}</button>)}
        {!canTsumo&&<>
          <button className="btn btn-ghost" disabled={sel==null} onClick={()=>discard(sel)}>
            {sel==null?'Pick a tile':'Discard '+short(sel)}</button>
          <button className="btn btn-primary" disabled={!riichiAct||sel==null||riichiAct.tiles.indexOf(sel)<0}
            onClick={()=>discard(sel,true)}>{me.riichi?'—':'Riichi'}</button>
        </>}
      </>:<div className="waiting eb">{st.phase==='end'?'Hand over':NAMES[st.turn]+' is thinking'}</div>}
    </div>
    {st.phase==='end'&&<EndOverlay st={st} match={match} onNext={nextHand}/>}
  </div>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
