const {Icon,Button}=window.ArroshoDesignSystem_6655bd;
const ME=0;
/* Thin wrapper over the design system Button: same font stack, semantic action
   tokens and hover lift — only the padding is tightened for a 390px action bar. */
function Act({variant='primary',span2,style,children,...rest}){
  return <Button variant={variant} full {...rest}
    style={{fontSize:14,padding:'15px 10px',minHeight:48,justifyContent:'center',
      gridColumn:span2?'1/-1':undefined,...style}}>{children}</Button>;
}
const NAMES=['You','Kaede','Mori','Sato'];
const SEATC={E:'var(--arr-teal)',S:'var(--arr-steel)',W:'var(--arr-flag)',N:'var(--arr-sage)'};
const POS={1:'right',2:'across',3:'left'};
const ROT={self:0,right:-90,across:180,left:90};
const STORE='riichi.match.v1';
const wname=w=>RM.name(w);
const short=t=>RM.name(t);

/* ---------- persistence ---------- */
function save(m){try{localStorage.setItem(STORE,JSON.stringify(m))}catch(e){}}
function load(){try{const r=localStorage.getItem(STORE);return r?JSON.parse(r):null}catch(e){return null}}

/* ---------- small pieces ---------- */
function OppCard({st,seat,say}){
  const p=st.players[seat];const w=wname(p.wind);
  return <div className={'oppcard'+(p.riichi?' danger':'')+(st.turn===seat&&st.phase!=='end'?' active':'')}>
    <div style={{display:'flex',alignItems:'center',gap:5}}>
      <span style={{fontFamily:'var(--font-display)',fontSize:14,color:SEATC[w]}}>{w}</span>
      <span style={{fontSize:11,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{NAMES[seat]}</span>
    </div>
    <div className="num" style={{fontSize:13.5}}>{p.score.toLocaleString()}</div>
    {p.riichi?<span className="riichi-tag">Riichi</span>
      :<span className="eb" style={{fontSize:8,color:'var(--arr-grey)',opacity:0.7}}>{p.melds.length?p.melds.length+' called':p.discards.length+' cut'}</span>}
    {p.melds.length>0&&<div style={{display:'flex',gap:1,flexWrap:'wrap'}}>
      {p.melds.map((m,i)=>meldTiles(m).map((t,j)=><Tile key={i+'-'+j} t={t} w={11}/>))}
    </div>}
  </div>;
}
function meldTiles(m){
  if(m.type==='chi')return [m.tile,m.tile+1,m.tile+2];
  if(m.type==='kan')return [m.tile,m.tile,m.tile,m.tile];
  if(m.type==='ankan')return ['back',m.tile,m.tile,'back'];
  return [m.tile,m.tile,m.tile];
}
function Pond({st,dir,seat}){
  const p=st.players[seat];
  const rows=[];
  for(let i=0;i<p.discards.length;i+=6)rows.push(p.discards.slice(i,i+6));
  return <div style={{transform:'rotate('+ROT[dir]+'deg)'}}>
    <div style={{display:'flex',flexDirection:'column',gap:2}}>
      {rows.map((r,ri)=><div key={ri} style={{display:'grid',gridTemplateColumns:'repeat(6,24px)',gap:2}}>
        {r.map((d,i)=><div key={i} style={{width:24,height:32,display:'grid',placeItems:'center'}}>
          <Tile t={d.tile} red={d.red} w={24} rot={d.riichi?90:0}/></div>)}
      </div>)}
    </div></div>;
}
function TipCard({info,botSay,tipsOn,hintsOn}){
  if(botSay&&tipsOn)return <div className="tipcard" style={{borderLeftColor:SEATC[botSay.wind]}}>
    <span className="eb" style={{fontSize:9,color:SEATC[botSay.wind]}}>{botSay.name} cut {short(botSay.tile)}</span>
    <span style={{fontSize:12.5,lineHeight:1.45,opacity:0.88}}>{botSay.text}</span>
  </div>;
  if(!hintsOn)return <div className="tipcard"><span style={{fontSize:12.5,opacity:0.7}}>{'\u2014'}</span></div>;
  if(!info)return <div className="tipcard"><span style={{fontSize:12.5,opacity:0.7}}>{'\u2014'}</span></div>;
  return <div className="tipcard">
    <span className="eb" style={{fontSize:9,color:'var(--arr-steel)'}}>{info.head}</span>
    <span style={{fontSize:12.5,lineHeight:1.45,opacity:0.9}}>{info.body}</span>
    {info.safe&&info.safe.length>0&&<div style={{display:'flex',alignItems:'center',gap:6}}>
      <span className="eb" style={{fontSize:8,color:'var(--arr-grey)'}}>Safe vs {info.safeVs}</span>
      <div style={{display:'flex',gap:3}}>{info.safe.slice(0,7).map((t,i)=><Tile key={i} t={t} w={16}/>)}</div>
    </div>}
  </div>;
}
function EndOverlay({st,onNext,match}){
  const r=st.result;if(!r)return null;
  const done=match.hand>=4&&!r.dealerRepeat;
  return <div className="overlay">
    <div className="sheet">
      {r.type==='win'?<>
        <span className="eb" style={{color:'var(--arr-teal)'}}>{r.loser===null?'Tsumo':'Ron'}</span>
        <div style={{fontFamily:'var(--font-display)',fontSize:26,lineHeight:1.05}}>{NAMES[r.winner]} wins</div>
        <div className="num" style={{fontSize:15,color:'var(--arr-steel)'}}>
          {r.score.yakuman?r.score.limit:r.score.han+' han '+r.score.fu+' fu'+(r.score.limit?' · '+r.score.limit:'')}
        </div>
        <div style={{display:'flex',gap:3,margin:'2px 0 2px'}}>{[r.winTile].map((t,i)=><Tile key={i} t={t} w={30}/>)}</div>
        <div style={{display:'flex',flexDirection:'column',gap:3}}>
          {r.score.yaku.map((y,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12.5}}>
            <span style={{opacity:0.88}}>{y.name}</span>
            <span className="num" style={{color:'var(--arr-grey)'}}>{y.yakuman?'yakuman':y.han+' han'}</span></div>)}
          {r.score.dora>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:12.5}}>
            <span style={{opacity:0.88}}>Dora</span><span className="num" style={{color:'var(--arr-grey)'}}>{r.score.dora}</span></div>}
        </div>
      </>:<>
        <span className="eb" style={{color:'var(--arr-grey)'}}>Exhaustive draw</span>
        <div style={{fontFamily:'var(--font-display)',fontSize:24,lineHeight:1.05}}>Wall ran out</div>
        <span style={{fontSize:12.5,opacity:0.85}}>{r.tenpai.length?'Tenpai: '+r.tenpai.map(s=>NAMES[s]).join(', '):'Nobody was tenpai.'}</span>
      </>}
      <div style={{height:1,background:'var(--border-hairline-dark)',margin:'4px 0'}}/>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {st.players.map((p,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:12.5}}>
          <span style={{opacity:i===ME?1:0.78}}>{NAMES[i]}</span>
          <span><span className="num">{p.score.toLocaleString()}</span>
            {r.deltas[i]!==0&&<span className="num" style={{marginLeft:8,color:r.deltas[i]>0?'var(--arr-teal)':'var(--arr-flag)'}}>
              {r.deltas[i]>0?'+':''}{r.deltas[i]}</span>}</span>
        </div>)}
      </div>
      <Act onClick={onNext} style={{marginTop:4}}>
        {done?'See final standings':(r.dealerRepeat?'Next hand — dealer repeats':'Next hand')}</Act>
    </div>
  </div>;
}
function FinalOverlay({match,onRestart}){
  const order=match.scores.map((s,i)=>({i,s})).sort((a,b)=>b.s-a.s);
  return <div className="overlay"><div className="sheet">
    <span className="eb" style={{color:'var(--arr-teal)'}}>East only · complete</span>
    <div style={{fontFamily:'var(--font-display)',fontSize:26,lineHeight:1.05}}>Final standings</div>
    <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:4}}>
      {order.map((o,rank)=><div key={o.i} style={{display:'flex',alignItems:'center',gap:10,fontSize:14}}>
        <span className="num" style={{color:'var(--arr-grey)',width:14}}>{rank+1}</span>
        <span style={{flex:1,fontWeight:o.i===ME?700:400}}>{NAMES[o.i]}</span>
        <span className="num">{o.s.toLocaleString()}</span></div>)}
    </div>
    <Act onClick={onRestart} style={{marginTop:8}}>Play again</Act>
  </div></div>;
}
Object.assign(window,{Act,OppCard,Pond,TipCard,EndOverlay,FinalOverlay,meldTiles,NAMES,SEATC,POS,ROT,ME,save,load,short,wname});
