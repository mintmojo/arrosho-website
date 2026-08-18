const TILE_DIR='Regular/';
const HONOR={E:'Ton',S:'Nan',W:'Shaa',N:'Pei',haku:'Haku',hatsu:'Hatsu',chun:'Chun'};
function tileFace(t){
  if(HONOR[t])return TILE_DIR+HONOR[t]+'.svg';
  const m=/^(r?)([1-9])([mps])$/.exec(t);
  if(!m)return TILE_DIR+'Blank.svg';
  return TILE_DIR+{m:'Man',p:'Pin',s:'Sou'}[m[3]]+m[2]+(m[1]?'-Dora':'')+'.svg';
}
const TLABEL={E:'East wind',S:'South wind',W:'West wind',N:'North wind',haku:'White dragon',hatsu:'Green dragon',chun:'Red dragon'};
function tileLabel(t){if(TLABEL[t])return TLABEL[t];const m=/^(r?)([1-9])([mps])\$/.exec(t);if(!m)return t;return (m[1]?'red ':'')+m[2]+' '+{m:'characters',p:'circles',s:'bamboo'}[m[3]]}
function Tile({t,w=42,rot=0,style,onClick,dim}){
  const h=Math.round(w*4/3);
  const box={width:w,height:h,flex:'0 0 auto',position:'relative',backgroundSize:'100% 100%',opacity:dim?0.55:1,...style};
  if(rot){box.transform=(style&&style.transform?style.transform+' ':'')+'rotate('+rot+'deg)'}
  if(t==='back'){box.backgroundImage='url('+TILE_DIR+'Back.svg)';return React.createElement('div',{style:box,onClick,'aria-label':'face-down tile'})}
  box.backgroundImage='url('+TILE_DIR+'Front.svg)';
  const kids=[React.createElement('img',{key:'f',src:tileFace(t),alt:'',draggable:false,style:{position:'absolute',inset:0,width:'100%',height:'100%'}})];
  /* the CC0 set draws the white dragon blank — a thin frame makes it read as a tile */
  if(t==='haku')kids.push(React.createElement('div',{key:'hk',style:{position:'absolute',left:'17%',right:'17%',top:'15%',bottom:'15%',border:Math.max(1,Math.round(w/22))+'px solid var(--arr-slate)',borderRadius:2}}));
  return React.createElement('div',{style:box,onClick,role:'img','aria-label':tileLabel(t)},kids);
}
/* East 1, player is dealer. Tenpai waiting 3s/6s with no yaku. West (Mori) has declared riichi. */
const GAME={
  round:'East 1',honba:0,wall:47,dora:'4p',
  hand:['2m','3m','4m','5p','6p','7p','4s','5s','7s','8s','9s','S','S'],
  drawn:'1m',
  seats:{
    self:{wind:'E',name:'You',score:26500,dealer:true},
    right:{wind:'S',name:'Kaede',score:24000},
    across:{wind:'W',name:'Mori',score:25000,riichi:true},
    left:{wind:'N',name:'Sato',score:24500}
  },
  discards:{
    self:['E','9m','1p','chun'],
    right:['1m','N','2s','3p'],
    across:['9p','1s','8m','haku','2p'],
    left:['hatsu','7m','3s']
  },
  acrossRiichiAt:4,
  order:[['self','E'],['right','1m'],['across','9p'],['left','hatsu'],['self','9m'],['right','N'],['across','1s'],['left','7m'],['self','1p'],['right','2s'],['across','8m'],['left','3s'],['self','chun'],['right','3p'],['across','haku'],['across','2p']]
};
Object.assign(window,{Tile,tileFace,tileLabel,GAME});
