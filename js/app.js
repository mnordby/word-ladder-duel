/* ---------------- Game state ---------------- */
let state = {
  mode: 'daily',
  start: '', target: '', par: 0, graph: null,
  path: [],           // entered words including start
  hintsUsed: 0,
  startTime: null,
  timerHandle: null,
  won: false,
};

const el = {
  ladder: document.getElementById('ladder'),
  guess: document.getElementById('guess'),
  message: document.getElementById('message'),
  movesStat: document.getElementById('movesStat'),
  parStat: document.getElementById('parStat'),
  timerStat: document.getElementById('timerStat'),
  submitBtn: document.getElementById('submitBtn'),
  hintBtn: document.getElementById('hintBtn'),
  restartBtn: document.getElementById('restartBtn'),
  newBtn: document.getElementById('newBtn'),
  tabs: document.querySelectorAll('.tab'),
  winOverlay: document.getElementById('winOverlay'),
  winStars: document.getElementById('winStars'),
  winMoves: document.getElementById('winMoves'),
  winPar: document.getElementById('winPar'),
  winTime: document.getElementById('winTime'),
  shareBtn: document.getElementById('shareBtn'),
  playAgainBtn: document.getElementById('playAgainBtn'),
};

function todayStr(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function startPuzzle(mode){
  state.mode = mode;
  el.newBtn.style.display = mode === 'practice' ? 'block' : 'none';

  let rng;
  if(mode === 'daily'){
    rng = mulberry32(dateSeedInt(todayStr()));
  } else {
    rng = mulberry32((Math.random()*1e9)|0);
  }
  const puzzle = generatePuzzle(rng, {minPar:4, maxPar:7});
  state.start = puzzle.start;
  state.target = puzzle.target;
  state.par = puzzle.par;
  state.graph = puzzle.graph;
  state.path = [puzzle.start];
  state.hintsUsed = 0;
  state.won = false;
  state.startTime = Date.now();

  clearInterval(state.timerHandle);
  state.timerHandle = setInterval(updateTimer, 1000);

  el.guess.value = '';
  el.guess.maxLength = state.target.length;
  el.guess.disabled = false;
  setMessage('');
  render();
  el.guess.focus();
}

function updateTimer(){
  if(state.won) return;
  const secs = Math.floor((Date.now() - state.startTime)/1000);
  const m = Math.floor(secs/60);
  const s = secs%60;
  el.timerStat.textContent = `${m}:${String(s).padStart(2,'0')}`;
}

function setMessage(text, ok){
  el.message.textContent = text || ' ';
  el.message.className = 'message' + (ok ? ' ok' : '');
}

function render(){
  el.ladder.innerHTML = '';
  state.path.forEach((word, idx) => {
    const row = document.createElement('div');
    row.className = 'word-row';
    const prevWord = idx>0 ? state.path[idx-1] : null;
    for(let i=0;i<word.length;i++){
      const tile = document.createElement('div');
      let cls = 'tile step';
      if(idx===0) cls = 'tile start';
      tile.className = cls;
      if(prevWord && prevWord[i] !== word[i]) tile.classList.add('changed');
      tile.textContent = word[i];
      row.appendChild(tile);
    }
    el.ladder.appendChild(row);
  });
  // arrow + target row
  if(!state.won){
    const arrow = document.createElement('div');
    arrow.className = 'arrow-down';
    arrow.textContent = '⋯ target ⋯';
    el.ladder.appendChild(arrow);
    const trow = document.createElement('div');
    trow.className = 'word-row';
    for(const ch of state.target){
      const tile = document.createElement('div');
      tile.className = 'tile target';
      tile.textContent = ch;
      trow.appendChild(tile);
    }
    el.ladder.appendChild(trow);
  }
  el.ladder.scrollTop = el.ladder.scrollHeight;
  el.movesStat.textContent = state.path.length - 1;
  el.parStat.textContent = state.par;
}

function submitGuess(){
  if(state.won) return;
  const guess = el.guess.value.trim().toUpperCase();
  const current = state.path[state.path.length-1];

  if(!guess){ return; }
  if(guess.length !== state.target.length){
    fail(`Must be a ${state.target.length}-letter word.`);
    return;
  }
  if(state.path.includes(guess)){
    fail(`You already used "${guess}".`);
    return;
  }
  if(!state.graph.get(current) || !state.graph.get(current).has(guess)){
    fail(`"${guess}" isn't a valid word one letter away from "${current}".`);
    return;
  }

  state.path.push(guess);
  el.guess.value = '';
  setMessage('Nice!', true);
  render();

  if(guess === state.target){
    win();
  }
}

function fail(msg){
  setMessage(msg);
  el.guess.classList.remove('shake');
  void el.guess.offsetWidth;
  el.guess.classList.add('shake');
}

function giveHint(){
  if(state.won) return;
  const current = state.path[state.path.length-1];
  const {dist, prev} = bfs(state.graph, current);
  if(!dist.has(state.target)){
    setMessage("No path left from here — try Restart.");
    return;
  }
  const path = reconstructPath(prev, current, state.target);
  const next = path[1];
  state.hintsUsed++;
  el.guess.value = next;
  setMessage(`Hint: try "${next}"`, true);
}

function win(){
  state.won = true;
  clearInterval(state.timerHandle);
  el.guess.disabled = true;
  render();

  const moves = state.path.length - 1;
  const secs = Math.floor((Date.now() - state.startTime)/1000);
  const m = Math.floor(secs/60), s = secs%60;
  const timeStr = `${m}:${String(s).padStart(2,'0')}`;

  let stars = 3;
  if(moves > state.par) stars = 2;
  if(moves > state.par + 2) stars = 1;
  if(state.hintsUsed > 0) stars = Math.max(1, stars - 1);

  el.winMoves.textContent = moves;
  el.winPar.textContent = state.par;
  el.winTime.textContent = timeStr;
  el.winStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(3-stars);
  el.winOverlay.classList.remove('hidden');

  state._shareText = `Word Ladder Duel${state.mode==='daily' ? ' — ' + todayStr() : ''}\n${state.start} → ${state.target}\n🪜 ${moves}/${state.par} moves · ${timeStr}${state.hintsUsed?` · ${state.hintsUsed} hint${state.hintsUsed>1?'s':''}`:''}\n${'⭐'.repeat(stars)}${'☆'.repeat(3-stars)}`;
}

/* ---------------- Events ---------------- */
el.submitBtn.addEventListener('click', submitGuess);
el.guess.addEventListener('keydown', e => {
  if(e.key === 'Enter') submitGuess();
});
el.guess.addEventListener('input', () => {
  el.guess.value = el.guess.value.toUpperCase().replace(/[^A-Z]/g,'');
});
el.hintBtn.addEventListener('click', giveHint);
el.restartBtn.addEventListener('click', () => {
  state.path = [state.start];
  state.hintsUsed = 0;
  state.won = false;
  state.startTime = Date.now();
  el.guess.disabled = false;
  clearInterval(state.timerHandle);
  state.timerHandle = setInterval(updateTimer, 1000);
  setMessage('');
  render();
  el.guess.focus();
});
el.newBtn.addEventListener('click', () => startPuzzle('practice'));
el.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    el.tabs.forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    el.winOverlay.classList.add('hidden');
    startPuzzle(tab.dataset.mode);
  });
});
el.shareBtn.addEventListener('click', () => {
  navigator.clipboard?.writeText(state._shareText).then(()=>{
    el.shareBtn.textContent = '✅ Copied!';
    setTimeout(()=> el.shareBtn.textContent = '📋 Copy Result', 1500);
  }).catch(()=>{
    alert(state._shareText);
  });
});
el.playAgainBtn.addEventListener('click', () => {
  el.winOverlay.classList.add('hidden');
  startPuzzle(state.mode);
});

/* ---------------- Boot ---------------- */
startPuzzle('daily');
