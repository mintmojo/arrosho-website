/* Tile renderer over the CC0 FluffyStuff set. Face art sits on top of Front.svg. */
const TILE_DIR='Regular/';
const HONOR_FILE={E:'Ton',S:'Nan',W:'Shaa',N:'Pei',haku:'Haku',hatsu:'Hatsu',chun:'Chun'};
function tileFile(name){
  if(HONOR_FILE[name])return TILE_DIR+HONOR_FILE[name]+'.svg';
  const m=/^([1-9])([mps])$/.exec(name);
  if(!m)return TILE_DIR+'Blank.svg';
  return TILE_DIR+{m:'Man',p:'Pin',s:'Sou'}[m[2]]+m[1]+'.svg';
}
const SPOKEN={E:'East',S:'South',W:'West',N:'North',haku:'White Dragon',hatsu:'Green Dragon',chun:'Red Dragon'};
function spoken(name){
  if(SPOKEN[name])return SPOKEN[name];
  const m=/^([1-9])([mps])$/.exec(name);
  if(!m)return name;
  return m[1]+' '+{m:'Characters',p:'Circles',s:'Bamboo'}[m[2]];
}
function Tile({t,red,w=44,rot=0,dim,sel,ghost,onClick,style}){
  const h=Math.round(w*4/3);
  const box={width:w,height:h,flex:'0 0 auto',position:'relative',backgroundSize:'100% 100%',
    borderRadius:Math.max(2,Math.round(w/14)),opacity:ghost?0.28:(dim?0.5:1),...style};
  if(rot)box.transform=(style&&style.transform?style.transform+' ':'')+'rotate('+rot+'deg)';
  if(onClick)box.cursor='pointer';
  if(sel){box.outline='2px solid var(--arr-teal)';box.outlineOffset=2}
  if(t==null||t==='back'){
    box.backgroundImage='url('+TILE_DIR+'Back.svg)';
    return React.createElement('div',{style:box,onClick,'aria-label':'face-down tile'});
  }
  const nm=typeof t==='number'?RM.name(t):t;
  box.backgroundImage='url('+TILE_DIR+'Front.svg)';
  const kids=[React.createElement('img',{key:'f',src:tileFile(nm),alt:'',draggable:false,
    style:{position:'absolute',inset:0,width:'100%',height:'100%'}})];
  /* the CC0 set draws the white dragon as a blank face — a thin rule makes it read as a tile */
  if(nm==='haku')kids.push(React.createElement('div',{key:'k',style:{position:'absolute',
    left:'17%',right:'17%',top:'15%',bottom:'15%',
    border:Math.max(1,Math.round(w/22))+'px solid var(--arr-slate)',borderRadius:2}}));
  if(red)kids.push(React.createElement('div',{key:'r',style:{position:'absolute',inset:0,
    background:'radial-gradient(circle at 50% 50%, rgba(210,85,63,0.34), transparent 66%)',
    borderRadius:'inherit',pointerEvents:'none'}}));
  return React.createElement('div',{style:box,onClick,role:'img','aria-label':spoken(nm)},kids);
}
Object.assign(window,{Tile,tileFile,spoken});
