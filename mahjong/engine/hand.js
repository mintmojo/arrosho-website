(function(RM){
/* All parsings of a concealed set of tiles into sets + one pair. */
function decompose(counts){
  const res=[];const c=counts.slice();const sets=[];
  function rec(i,pair){
    while(i<=33&&c[i]===0)i++;
    if(i>33){if(pair!==null)res.push({sets:sets.slice(),pair});return}
    if(c[i]>=3){c[i]-=3;sets.push({type:'triplet',tile:i,concealed:true});rec(i,pair);sets.pop();c[i]+=3}
    if(i<27&&i%9<=6&&c[i+1]>0&&c[i+2]>0){c[i]--;c[i+1]--;c[i+2]--;sets.push({type:'run',tile:i,concealed:true});rec(i,pair);sets.pop();c[i]++;c[i+1]++;c[i+2]++}
    if(pair===null&&c[i]>=2){c[i]-=2;rec(i,i);c[i]+=2}
  }
  rec(0,null);
  return res;
}
function isChiitoi(counts){
  let pairs=0,tiles=0;
  for(let i=0;i<34;i++){tiles+=counts[i];if(counts[i]===2)pairs++;else if(counts[i]!==0)return false}
  return pairs===7&&tiles===14;
}
function isKokushi(counts){
  let kinds=0,pair=0,tiles=0;
  for(let i=0;i<34;i++){
    if(counts[i]===0)continue;
    if(!RM.isTOH(i))return false;
    tiles+=counts[i];kinds++;
    if(counts[i]===2)pair++;else if(counts[i]!==1)return false;
  }
  return kinds===13&&pair===1&&tiles===14;
}
/* Concealed counts + melds → winning hand? Routed through the memoised
   shanten calculator; full decomposition is reserved for scoring. */
function isComplete(counts,melds){
  return RM.shanten(counts,typeof melds==='number'?melds:(melds?melds.length:0))===-1;
}
/* Full parsings including called melds, for scoring. */
function parsings(counts,melds){
  const n=melds?melds.length:0;const out=[];
  for(const p of decompose(counts)){
    if(p.sets.length+n!==4)continue;
    out.push({sets:p.sets.concat((melds||[]).map(m=>({
      type:m.type==='chi'?'run':(m.type==='ankan'||m.type==='kan'?'kan':'triplet'),
      tile:m.tile,concealed:m.type==='ankan',kan:m.type==='kan'||m.type==='ankan',called:true
    }))),pair:p.pair});
  }
  return out;
}
Object.assign(RM,{decompose,isChiitoi,isKokushi,isComplete,parsings});
})(window.RM);
