/* ---------------- Graph utilities ---------------- */
function cleanList(list, len){
  return Array.from(new Set(list.map(w=>w.toUpperCase()).filter(w=>w.length===len)));
}
function oneLetterDiff(a,b){
  if(a.length!==b.length) return false;
  let diff=0;
  for(let i=0;i<a.length;i++){ if(a[i]!==b[i]){ diff++; if(diff>1) return false; } }
  return diff===1;
}
function buildGraph(list){
  const graph = new Map();
  for(const w of list) graph.set(w, new Set());
  for(let i=0;i<list.length;i++){
    for(let j=i+1;j<list.length;j++){
      if(oneLetterDiff(list[i], list[j])){
        graph.get(list[i]).add(list[j]);
        graph.get(list[j]).add(list[i]);
      }
    }
  }
  return graph;
}
function bfs(graph, start){
  const dist = new Map([[start,0]]);
  const prev = new Map();
  const queue = [start];
  let head = 0;
  while(head < queue.length){
    const cur = queue[head++];
    for(const nb of graph.get(cur)){
      if(!dist.has(nb)){
        dist.set(nb, dist.get(cur)+1);
        prev.set(nb, cur);
        queue.push(nb);
      }
    }
  }
  return {dist, prev};
}
function reconstructPath(prev, start, target){
  const path=[target];
  let cur=target;
  while(cur!==start){
    cur = prev.get(cur);
    path.push(cur);
  }
  return path.reverse();
}

/* ---------------- Seeded RNG (mulberry32) ---------------- */
function mulberry32(seed){
  return function(){
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
function pick(rng, arr){ return arr[Math.floor(rng()*arr.length)]; }
function dateSeedInt(dateStr){
  let h = 0;
  for(let i=0;i<dateStr.length;i++){ h = (h*31 + dateStr.charCodeAt(i)) | 0; }
  return h;
}

/* ---------------- Prepared word data ---------------- */
const list3 = cleanList(WORDS3, 3);
const list4 = cleanList(WORDS4, 4);
const graph3 = buildGraph(list3);
const graph4 = buildGraph(list4);

function generatePuzzle(rng, {minPar, maxPar}){
  const attemptsFor = (list, graph, lo, hi) => {
    const candidates = list.filter(w=>graph.get(w).size>0);
    for(let attempt=0; attempt<250; attempt++){
      const start = pick(rng, candidates);
      const {dist, prev} = bfs(graph, start);
      const targets = [];
      dist.forEach((d,w)=>{ if(w!==start && d>=lo && d<=hi) targets.push(w); });
      if(targets.length){
        const target = pick(rng, targets);
        const par = dist.get(target);
        const path = reconstructPath(prev, start, target);
        return {start, target, par, path, graph};
      }
    }
    return null;
  };
  return attemptsFor(list4, graph4, minPar, maxPar)
      || attemptsFor(list4, graph4, 3, 10)
      || attemptsFor(list3, graph3, minPar, maxPar)
      || attemptsFor(list3, graph3, 2, 10);
}
