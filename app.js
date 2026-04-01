// ── 캔버스 설정 ──
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

// ── 고정 논리 크기 (PNG 저장 기준) ──
const BASE_W = 680;
const TABLE_RATIO    = 404 / 604;
const BASE_TABLE_H   = Math.round(BASE_W * TABLE_RATIO);
const BASE_Y_OFFSET  = 160;
const BASE_MARGIN_X  = 80;
const BASE_MARGIN_Y  = 90;
const BASE_CANVAS_H  = BASE_Y_OFFSET + BASE_TABLE_H + 60;

// ── 런타임 스케일 계산 ──
// canvas-inner 너비를 기준으로 BASE_W 대비 비율을 구해 모든 좌표에 적용
let RATIO = 1;

function calcRatio() {
  const inner = canvas.parentElement; // .canvas-inner
  const availW = inner.clientWidth || BASE_W;
  RATIO = Math.min(1, availW / BASE_W);
}

// 런타임 실제 크기 (RATIO 적용)
function W()        { return Math.round(BASE_W       * RATIO); }
function CANVAS_H() { return Math.round(BASE_CANVAS_H * RATIO); }
function TABLE_H()  { return Math.round(BASE_TABLE_H  * RATIO); }
function Y_OFFSET() { return Math.round(BASE_Y_OFFSET * RATIO); }
function MARGIN_X() { return Math.round(BASE_MARGIN_X * RATIO); }
function MARGIN_Y() { return Math.round(BASE_MARGIN_Y * RATIO); }

function TABLE_LEFT()  { return MARGIN_X(); }
function TABLE_RIGHT() { return W() - MARGIN_X(); }
function TABLE_TOP()   { return Y_OFFSET() + MARGIN_Y(); }
function TABLE_BOT()   { return Y_OFFSET() + TABLE_H() - MARGIN_Y(); }
function FW()          { return (TABLE_RIGHT() - TABLE_LEFT()) / FRETS; }
function SH()          { return (TABLE_BOT() - TABLE_TOP()) / (STRINGS - 1); }
function DOT_SIZE()    { return Math.round(SH() * 0.85); }
function SCALE()       { return W() / 604; }

const STRINGS = 6;
const FRETS   = 4;

function resizeCanvas() {
  calcRatio();
  canvas.width  = W();
  canvas.height = CANVAS_H();
  draw();
}

// ── 이미지 로드 ──
const IMAGES = {};
const IMAGE_LIST = [
  'root_t', 'root1', 'root2', 'root3', 'root4',
  'common_t', 'common1', 'common2', 'common3', 'common4',
  'barre_two', 'barre_three', 'barre_four', 'barre_five', 'barre_six',
  'open', 'open_root', 'mute'
];
const BARRE_KEYS = {
  2: 'barre_two', 3: 'barre_three', 4: 'barre_four',
  5: 'barre_five', 6: 'barre_six'
};

let loadedCount = 0;
IMAGE_LIST.forEach(key => {
  const img = new Image();
  img.src = `image/${key}.png`;
  img.onload = () => { if (++loadedCount === IMAGE_LIST.length) resizeCanvas(); };
  IMAGES[key] = img;
});

// ── 코드명 빌더 상태 ──
const ROOTS_SHARP = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const ROOTS_FLAT  = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];

let accidental       = 'sharp';
let selectedRoot     = 'A';
let selectedTriad    = '';
let selectedSeventh  = '';
let selectedFunc     = '';
let selectedTensions = [];
let selectedBass     = '';

function renderRootBtns() {
  const roots = accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  const group = document.getElementById('root-group');
  group.innerHTML = '';
  if (!roots.includes(selectedRoot)) selectedRoot = roots[0];
  roots.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (r === selectedRoot ? ' active' : '');
    btn.textContent = r;
    btn.onclick = () => { selectedRoot = r; renderRootBtns(); updateChordDisplay(); };
    group.appendChild(btn);
  });
}

function renderBassBtns() {
  const roots = accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  const group = document.getElementById('bass-group');
  group.innerHTML = '';
  const noneBtn = document.createElement('button');
  noneBtn.className = 'sel-btn' + (selectedBass === '' ? ' active' : '');
  noneBtn.textContent = '없음';
  noneBtn.onclick = () => { selectedBass = ''; renderBassBtns(); updateChordDisplay(); };
  group.appendChild(noneBtn);
  roots.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (r === selectedBass ? ' active' : '');
    btn.textContent = r;
    btn.onclick = () => { selectedBass = r; renderBassBtns(); updateChordDisplay(); };
    group.appendChild(btn);
  });
}

function setAccidental(mode) {
  accidental = mode;
  document.getElementById('acc-sharp').classList.toggle('active', mode === 'sharp');
  document.getElementById('acc-flat').classList.toggle('active', mode === 'flat');
  renderRootBtns();
  renderBassBtns();
  updateChordDisplay();
}

function selectTriad(val) {
  selectedTriad = val;
  document.querySelectorAll('#triad-group .sel-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === (val === '' ? 'M' : val));
  });
  updateChordDisplay();
}

function selectSeventh(val) {
  selectedSeventh = val;
  document.querySelectorAll('#seventh-group .sel-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === (val === '' ? '없음' : val));
  });
  updateChordDisplay();
}

function selectFunc(val) {
  selectedFunc = val;
  document.querySelectorAll('#func-group .sel-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === (val === '' ? '없음' : val));
  });
  updateChordDisplay();
}

function toggleTension(val) {
  const idx = selectedTensions.indexOf(val);
  if (idx !== -1) selectedTensions.splice(idx, 1);
  else selectedTensions.push(val);
  document.querySelectorAll('#tension-group .sel-btn').forEach(b => {
    b.classList.toggle('active', selectedTensions.includes(b.textContent));
  });
  updateChordDisplay();
}

function buildChordName() {
  let name = selectedRoot.replace('♭', 'b') + selectedTriad + selectedSeventh + selectedFunc;
  if (selectedTensions.length > 0) name += '(' + selectedTensions.map(t => t.replace('b', 'b')).join(',') + ')';
  if (selectedBass) name += '/' + selectedBass.replace('♭', 'b');
  return name;
}

function buildChordHTML() {
  let name = selectedRoot + selectedTriad + selectedSeventh + selectedFunc;
  if (selectedTensions.length > 0) {
    const tensionStr = selectedTensions.join(',');
    name += '<sup>(' + tensionStr + ')</sup>';
  }
  if (selectedBass) name += '/' + selectedBass;
  return name;
}

function updateChordDisplay() {
  document.getElementById('chord-display').innerHTML = buildChordHTML();
  draw();
}

// ── 편집 상태 ──
let currentMode    = 'finger';
let selectedFinger = 1;
let dots        = [];
let barreActive = {};
let openMute    = new Array(STRINGS).fill('open');
let rootMode    = false;
let rootIndex   = -1;

function calcRootIndex() {
  const dotMaxS  = dots.length > 0 ? Math.max(...dots.map(d => d.s)) : -1;
  const openMaxS = openMute.reduce((max, v, i) => (v === 'open' ? Math.max(max, i) : max), -1);
  return Math.max(dotMaxS, openMaxS);
}

function toggleRootMode() {
  rootMode = !rootMode;
  document.getElementById('btn-root').classList.toggle('active', rootMode);
  rootIndex = rootMode ? calcRootIndex() : -1;
  draw();
}

function setMode(m) {
  currentMode = m;
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('mode-' + m).classList.add('active');
  document.querySelectorAll('.finger-btn').forEach(b => {
    b.style.opacity = m === 'finger' ? '1' : '0.35';
  });
}

function selectFinger(n) {
  selectedFinger = n;
  document.querySelectorAll('.finger-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('f' + n).classList.add('selected');
}

function resetAll() {
  dots        = [];
  barreActive = {};
  openMute    = new Array(STRINGS).fill('open');
  draw();
}

function getBarreFrets() {
  const fretCount = {};
  dots.forEach(d => { fretCount[d.f] = (fretCount[d.f] || 0) + 1; });
  return Object.keys(fretCount).filter(f => fretCount[f] >= 2).map(Number);
}

function getDotImgKey(n, isRoot) {
  const prefix = isRoot ? 'root' : 'common';
  return n === 0 ? prefix + '_t' : prefix + String(n);
}

// ── 렌더링 (논리 좌표 r로 스케일된 캔버스에 그림) ──
function drawCanvas(c, r) {
  const w        = Math.round(BASE_W        * r);
  const canvasH  = Math.round(BASE_CANVAS_H * r);
  const tableH   = Math.round(BASE_TABLE_H  * r);
  const yOffset  = Math.round(BASE_Y_OFFSET * r);
  const marginX  = Math.round(BASE_MARGIN_X * r);
  const marginY  = Math.round(BASE_MARGIN_Y * r);
  const tLeft    = marginX;
  const tRight   = w - marginX;
  const tTop     = yOffset + marginY;
  const tBot     = yOffset + tableH - marginY;
  const fw       = (tRight - tLeft) / FRETS;
  const sh       = (tBot - tTop) / (STRINGS - 1);
  const dotSize  = Math.round(sh * 0.85);
  const scale    = w / 604;

  c.clearRect(0, 0, w, canvasH);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, w, canvasH);
  c.fillRect(tRight, 0, w - tRight, canvasH);
  c.fillRect(0, tBot + Math.round(60 * r), w, canvasH);

  // 격자 배경
  c.fillStyle = '#ffffff';
  c.fillRect(0, yOffset, w, tableH);

  // 너트
  c.strokeStyle = '#000000';
  c.lineWidth = 6 * scale;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(tLeft, tTop);
  c.lineTo(tLeft, tBot);
  c.stroke();

  // 프렛선
  c.strokeStyle = '#2a2a2a';
  c.lineWidth = 1;
  c.lineCap = 'butt';
  for (let f = 0; f <= FRETS; f++) {
    const x = tLeft + f * fw;
    c.beginPath(); c.moveTo(x, tTop); c.lineTo(x, tBot); c.stroke();
  }

  // 줄선
  for (let s = 0; s < STRINGS; s++) {
    const y = tTop + s * sh;
    c.beginPath(); c.moveTo(tLeft, y); c.lineTo(tRight, y); c.stroke();
  }

  // 오픈/뮤트
  openMute.forEach((v, s) => {
    if (!v) return;
    const y = tTop + s * sh;
    const x = tLeft - 40 * r;
    let key;
    if (v === 'mute') key = 'mute';
    else key = (rootMode && s === rootIndex) ? 'open_root' : 'open';
    if (!IMAGES[key]) return;
    c.drawImage(IMAGES[key], x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
  });

  // barre
  const barreFrets = getBarreFrets();
  barreFrets.forEach(f => {
    if (!barreActive[f]) return;
    const sameFret = dots.filter(d => d.f === f);
    const minS = Math.min(...sameFret.map(d => d.s));
    const maxS = Math.max(...sameFret.map(d => d.s));
    const count = maxS - minS + 1;
    const key = BARRE_KEYS[count];
    if (!key || !IMAGES[key]) return;
    const x = tLeft + (f - 0.5) * fw;
    const y = tTop + minS * sh;
    const barreH = sh * (count - 1) + dotSize;
    c.drawImage(IMAGES[key], x - dotSize / 2, y - dotSize / 2, dotSize, barreH);
  });

  // dot
  dots.forEach(d => {
    if (barreActive[d.f] && barreFrets.includes(d.f)) return;
    const isRoot = rootMode && d.s === rootIndex;
    const key = getDotImgKey(d.n, isRoot);
    if (!IMAGES[key]) return;
    const x = tLeft + (d.f - 0.5) * fw;
    const y = tTop + d.s * sh;
    c.drawImage(IMAGES[key], x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
  });

  // 코드명 (최상단)
  c.save();
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, w, tTop - dotSize / 2);
  c.fillStyle = '#1a1714';
  c.textBaseline = 'alphabetic';

  const BASE_SIZE = Math.round(80 * r);
  const SUP_SIZE  = Math.round(44 * r);
  const BASE_Y    = yOffset - Math.round(10 * r);
  const SUP_Y     = BASE_Y - Math.round(32 * r);

  let cx = tLeft;
  const basePart = selectedRoot + selectedTriad + selectedSeventh + selectedFunc;
  c.font = `400 ${BASE_SIZE}px "Times New Roman", serif`;
  c.fillText(basePart, cx, BASE_Y);
  cx += c.measureText(basePart).width;

  if (selectedTensions.length > 0) {
    const tensionStr = '(' + selectedTensions.join(',') + ')';
    c.font = `400 ${SUP_SIZE}px "Times New Roman", serif`;
    c.fillText(tensionStr, cx, SUP_Y);
    cx += c.measureText(tensionStr).width;
  }

  if (selectedBass) {
    c.font = `400 ${BASE_SIZE}px "Times New Roman", serif`;
    c.fillText('/' + selectedBass, cx, BASE_Y);
  }

  // 프렛 번호
  const fretNumEl = document.getElementById('fret-number');
  const fretNum = fretNumEl ? fretNumEl.value.trim() : '';
  if (fretNum) {
    c.font = `400 ${Math.round(28 * r)}px "Times New Roman", serif`;
    c.fillStyle = '#1a1714';
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillText(fretNum, tLeft + 1.5 * fw, tBot + Math.round(16 * r));
  }

  c.restore();
}

function draw() {
  drawCanvas(ctx, RATIO);
  updateBarreBtns();
}

// ── 바레 버튼 ──
function updateBarreBtns() {
  const container = document.getElementById('barre-btns');
  container.innerHTML = '';

  const barreFrets = getBarreFrets();
  const tLeft   = MARGIN_X();
  const tTop    = TABLE_TOP();
  const fw      = FW();
  const dotSize = DOT_SIZE();

  barreFrets.forEach(f => {
    const cx   = tLeft + (f - 0.5) * fw;
    const cy   = tTop - dotSize - 4;
    const left = cx - 12;
    const top  = cy - 12;

    const btn = document.createElement('button');
    btn.textContent = 'B';
    btn.style.cssText = `
      position: absolute;
      left: ${left}px;
      top: ${top}px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 1.5px solid #888;
      background: ${barreActive[f] ? '#1a1714' : '#fff'};
      color: ${barreActive[f] ? '#fff' : '#888'};
      font-size: 11px;
      font-family: 'Pretendard', sans-serif;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    `;
    btn.onclick = () => { barreActive[f] = !barreActive[f]; draw(); };
    container.appendChild(btn);
  });
}

// ── 클릭 처리 ──
canvas.addEventListener('click', function(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = W() / rect.width;
  const scaleY = CANVAS_H() / rect.height;
  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top)  * scaleY;

  const si = Math.round((my - TABLE_TOP()) / SH());
  if (si < 0 || si > STRINGS - 1) return;

  if (mx >= TABLE_LEFT() - 50 && mx < TABLE_LEFT()) {
    const cur = openMute[si];
    openMute[si] = cur === 'mute' ? 'open' : 'mute';
    if (openMute[si] !== null) dots = dots.filter(d => d.s !== si);
    if (rootMode) rootIndex = calcRootIndex();
    draw(); return;
  }

  if (mx < TABLE_LEFT() || mx > TABLE_RIGHT() + 5) return;

  const fi = Math.floor((mx - TABLE_LEFT()) / FW()) + 1;
  if (fi < 1 || fi > FRETS) return;

  if (currentMode === 'finger') {
    const idx = dots.findIndex(d => d.s === si && d.f === fi);
    if (idx !== -1) {
      // 같은 위치 클릭 시 제거 → 개방현(open)으로 복귀
      dots.splice(idx, 1);
      openMute[si] = 'open';
    } else {
      // 같은 줄의 기존 dot 제거 + openMute 초기화
      dots = dots.filter(d => d.s !== si);
      openMute[si] = null;
      dots.push({ s: si, f: fi, n: selectedFinger });
    }
    if (rootMode) rootIndex = calcRootIndex();
    draw();
  }
});

// ── PNG 저장 (항상 BASE_W 고정 해상도) ──
function savePNG() {
  const scale = 3;
  const expCanvas = document.createElement('canvas');
  expCanvas.width  = BASE_W        * scale;
  expCanvas.height = BASE_CANVAS_H * scale;
  const ec = expCanvas.getContext('2d');
  ec.scale(scale, scale);
  drawCanvas(ec, 1); // r=1 → BASE_W 기준 원본 크기로 그림

  const link = document.createElement('a');
  link.download = buildChordName() + '_chord.png';
  link.href = expCanvas.toDataURL('image/png');
  link.click();
}

// ── 리사이즈 대응 ──
window.addEventListener('resize', resizeCanvas);

// ── 초기화 ──
renderRootBtns();
renderBassBtns();
updateChordDisplay();

// ── Audio Engine (Karplus-Strong, BufferSourceNode 방식) ──
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

const OPEN_MIDI = [64, 59, 55, 50, 45, 40]; // s=0(1번줄 E4) ~ s=5(6번줄 E2)

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Karplus-Strong을 OfflineAudioContext로 미리 렌더링 후 BufferSourceNode로 재생
async function renderKarplusStrong(freq, duration, isMute) {
  const sampleRate = 44100;
  const totalSamples = Math.round(sampleRate * duration);
  const offline = new OfflineAudioContext(1, totalSamples, sampleRate);

  if (isMute) {
    // 뮤트: 짧은 노이즈
    const buf = offline.createBuffer(1, totalSamples, sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < Math.min(2000, totalSamples); i++) {
      d[i] = (Math.random() * 2 - 1) * (1 - i / 2000) * 0.3;
    }
    const src = offline.createBufferSource();
    src.buffer = buf;
    src.connect(offline.destination);
    src.start(0);
  } else {
    // Karplus-Strong
    const N = Math.round(sampleRate / freq);
    const buf = offline.createBuffer(1, totalSamples, sampleRate);
    const d = buf.getChannelData(0);

    // 딜레이 라인 초기화 (노이즈)
    const delay = new Float32Array(N);
    for (let i = 0; i < N; i++) delay[i] = Math.random() * 2 - 1;

    // 전체 샘플 계산
    for (let i = 0; i < totalSamples; i++) {
      const idx = i % N;
      const next = (i + 1) % N;
      d[i] = delay[idx];
      delay[idx] = 0.996 * 0.5 * (delay[idx] + delay[next]);
    }

    const src = offline.createBuffer(1, totalSamples, sampleRate);
    src.getChannelData(0).set(d);

    // 게인 엔벨로프
    const gainNode = offline.createGain();
    gainNode.gain.setValueAtTime(0.7, 0);
    gainNode.gain.exponentialRampToValueAtTime(0.001, duration);

    const source = offline.createBufferSource();
    source.buffer = src;
    source.connect(gainNode);
    gainNode.connect(offline.destination);
    source.start(0);
  }

  return await offline.startRendering();
}

// 렌더링된 버퍼 캐시
const renderedCache = {};

async function getRenderedBuffer(freq, duration) {
  const key = freq.toFixed(2);
  if (!renderedCache[key]) {
    renderedCache[key] = await renderKarplusStrong(freq, duration, false);
  }
  return renderedCache[key];
}

function calcActualFret(f) {
  const fretNumEl = document.getElementById('fret-number');
  const inputFret = parseInt(fretNumEl.value) || 1;
  return f === 0 ? 0 : (inputFret - 2) + f;
}

function calcStringNotes() {
  const notes = [];
  for (let s = 0; s < STRINGS; s++) {
    const state = openMute[s];
    if (state === 'mute') continue;
    const dot = dots.find(d => d.s === s);
    if (dot) {
      const actualFret = calcActualFret(dot.f);
      notes.push({ s, midi: OPEN_MIDI[s] + actualFret, isMute: false });
    } else {
      // null이든 open이든 개방현으로 재생
      notes.push({ s, midi: OPEN_MIDI[s], isMute: false });
    }
  }
  return notes;
}

async function strumChord() {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') await ctx.resume();
  Object.keys(renderedCache).forEach(k => delete renderedCache[k]);

  const notes = calcStringNotes();
  if (notes.length === 0) return;

  notes.sort((a, b) => b.s - a.s); // 6번줄(낮은음) → 1번줄(높은음)

  const DURATION = 2.5;
  const STRUM_INTERVAL = 0.04; // 단위 : s ex)0.03 = 30ms
  const now = ctx.currentTime + 0.05;

  // 모든 버퍼 미리 렌더링
  const buffers = await Promise.all(notes.map(note => {
    return getRenderedBuffer(midiToFreq(note.midi), DURATION);
  }));

  // 스트럼 순서대로 재생
  buffers.forEach((buffer, i) => {
    const startTime = now + i * STRUM_INTERVAL;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start(startTime);
  });
}