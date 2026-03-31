// ── 캔버스 설정 ──
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const TABLE_RATIO = 404 / 604;
const W = 680;
const TABLE_H = Math.round(W * TABLE_RATIO);
const TABLE_Y_OFFSET = 160;
const TABLE_PADDING = 30;
const CANVAS_H = TABLE_Y_OFFSET + TABLE_H + 60;

canvas.width  = W;
canvas.height = CANVAS_H;

const SCALE = W / 604;
const MARGIN_X = 80;  // 좌우 여백
const MARGIN_Y = 90;
const TABLE_LEFT  = MARGIN_X;
const TABLE_RIGHT = W - MARGIN_X;
const TABLE_TOP   = TABLE_Y_OFFSET + MARGIN_Y;
const TABLE_BOT   = TABLE_Y_OFFSET + TABLE_H - MARGIN_Y;

const STRINGS = 6;
const FRETS   = 4;
const FW = (TABLE_RIGHT - TABLE_LEFT) / FRETS;
const SH = (TABLE_BOT   - TABLE_TOP)  / (STRINGS - 1);
const DOT_SIZE = Math.round(SH * 0.85);

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
  img.onload = () => { if (++loadedCount === IMAGE_LIST.length) draw(); };
  IMAGES[key] = img;
});

// ── 코드명 빌더 상태 ──
const ROOTS_SHARP = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const ROOTS_FLAT  = ['A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab'];

let accidental  = 'sharp';
let selectedRoot    = 'A';
let selectedTriad   = '';
let selectedSeventh = '';
let selectedFunc    = '';
let selectedTensions = [];
let selectedBass    = '';

// ── 근음 버튼 렌더링 ──
function renderRootBtns() {
  const roots = accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  const group = document.getElementById('root-group');
  group.innerHTML = '';

  // 현재 선택된 근음이 새 목록에 없으면 첫 번째로 초기화
  if (!roots.includes(selectedRoot)) selectedRoot = roots[0];

  roots.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (r === selectedRoot ? ' active' : '');
    btn.textContent = r;
    btn.onclick = () => { selectedRoot = r; renderRootBtns(); updateChordDisplay(); };
    group.appendChild(btn);
  });
}

// ── 분수코드 근음 버튼 렌더링 ──
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

// ── #/b 모드 전환 ──
function setAccidental(mode) {
  accidental = mode;
  document.getElementById('acc-sharp').classList.toggle('active', mode === 'sharp');
  document.getElementById('acc-flat').classList.toggle('active', mode === 'flat');
  renderRootBtns();
  renderBassBtns();
  updateChordDisplay();
}

// ── 3화음 선택 ──
function selectTriad(val) {
  selectedTriad = val;
  document.querySelectorAll('#triad-group .sel-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === (val === '' ? 'M' : val));
  });
  updateChordDisplay();
}

// ── 7음 선택 ──
function selectSeventh(val) {
  selectedSeventh = val;
  document.querySelectorAll('#seventh-group .sel-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === (val === '' ? '없음' : val));
  });
  updateChordDisplay();
}

// ── 기능 선택 ──
function selectFunc(val) {
  selectedFunc = val;
  document.querySelectorAll('#func-group .sel-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === (val === '' ? '없음' : val));
  });
  updateChordDisplay();
}

// ── 텐션 토글 (다중선택) ──
function toggleTension(val) {
  const idx = selectedTensions.indexOf(val);
  if (idx !== -1) {
    selectedTensions.splice(idx, 1);
  } else {
    selectedTensions.push(val);
  }
  document.querySelectorAll('#tension-group .sel-btn').forEach(b => {
    const key = b.textContent
      .replace('♭', 'b')
      .replace('#', '#');
    b.classList.toggle('active', selectedTensions.includes(key));
  });
  updateChordDisplay();
}

// ── 코드명 조합 ──
function buildChordName() {
  let name = selectedRoot;
  if (selectedTriad) name += selectedTriad;
  if (selectedSeventh) name += selectedSeventh;
  if (selectedFunc) name += selectedFunc;
  if (selectedTensions.length > 0) {
    name += '(' + selectedTensions.join(',') + ')';
  }
  if (selectedBass) name += '/' + selectedBass;
  return name;
}

// ── 코드명 HTML 렌더링 (텐션 위첨자) ──
function buildChordHTML() {
  let name = selectedRoot;
  if (selectedTriad) name += selectedTriad;
  if (selectedSeventh) name += selectedSeventh;
  if (selectedFunc) name += selectedFunc;
  if (selectedTensions.length > 0) {
    const tensionStr = selectedTensions
      .map(t => t.replace('b', '♭'))
      .join(',');
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
let openMute    = new Array(STRINGS).fill(null);
let rootMode  = false;
let rootIndex = -1; // 근음으로 표시할 줄 인덱스 (-1 = 없음)

function calcRootIndex() {
  // dots와 open 중 가장 아래(높은 인덱스) 줄을 근음으로
  const dotMaxS  = dots.length > 0
    ? Math.max(...dots.map(d => d.s))
    : -1;
  const openMaxS = openMute.reduce(
    (max, v, i) => (v === 'open' ? Math.max(max, i) : max), -1
  );
  return Math.max(dotMaxS, openMaxS);
}

function toggleRootMode() {
  rootMode = !rootMode;
  document.getElementById('btn-root').classList.toggle('active', rootMode);
  rootIndex = rootMode ? calcRootIndex() : -1;
  draw();
}

// ── 편집 컨트롤 ──
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
  openMute    = new Array(STRINGS).fill(null);
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

// ── 렌더링 ──
function drawCanvas(c, exportMode = false) {
  c.clearRect(0, 0, W, CANVAS_H);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, W, CANVAS_H);

  // 격자
  c.fillStyle = '#ffffff';
  c.fillRect(0, TABLE_Y_OFFSET, W, TABLE_H);

  // 너트
  c.strokeStyle = '#000000';
  c.lineWidth = 6 * SCALE;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(TABLE_LEFT, TABLE_TOP);
  c.lineTo(TABLE_LEFT, TABLE_BOT);
  c.stroke();

  // 프렛선
  c.strokeStyle = '#2a2a2a';
  c.lineWidth = 1;
  c.lineCap = 'butt';
  for (let f = 0; f <= FRETS; f++) {
    const x = TABLE_LEFT + f * FW;
    c.beginPath(); c.moveTo(x, TABLE_TOP); c.lineTo(x, TABLE_BOT); c.stroke();
  }

  // 줄선
  for (let s = 0; s < STRINGS; s++) {
    const y = TABLE_TOP + s * SH;
    c.beginPath(); c.moveTo(TABLE_LEFT, y); c.lineTo(TABLE_RIGHT, y); c.stroke();
  }

  // 오픈/뮤트
  openMute.forEach((v, s) => {
    if (!v) return;
    const y = TABLE_TOP + s * SH;
    const x = TABLE_LEFT - 40;
    let key;
    if (v === 'mute') {
      key = 'mute';
    } else {
      key = (rootMode && s === rootIndex) ? 'open_root' : 'open';
    }
    if (!IMAGES[key]) return;
    c.drawImage(IMAGES[key], x - DOT_SIZE / 2, y - DOT_SIZE / 2, DOT_SIZE, DOT_SIZE);
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
    const x = TABLE_LEFT + (f - 0.5) * FW;
    const y = TABLE_TOP + minS * SH;
    const barreH = SH * (count - 1) + DOT_SIZE;
    c.drawImage(IMAGES[key], x - DOT_SIZE / 2, y - DOT_SIZE / 2, DOT_SIZE, barreH);
  });

  // dot
  dots.forEach(d => {
    if (barreActive[d.f] && barreFrets.includes(d.f)) return;
    const isRoot = rootMode && d.s === rootIndex;
    const key = getDotImgKey(d.n, isRoot);
    if (!IMAGES[key]) return;
    const x = TABLE_LEFT + (d.f - 0.5) * FW;
    const y = TABLE_TOP + d.s * SH;
    c.drawImage(IMAGES[key], x - DOT_SIZE / 2, y - DOT_SIZE / 2, DOT_SIZE, DOT_SIZE);
  });

  // 코드명 (최상단) - 파트별 분리 렌더링
  c.save();
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, W, TABLE_TOP - DOT_SIZE / 2);
  c.fillStyle = '#1a1714';
  c.textBaseline = 'alphabetic';

  const BASE_SIZE = 80;
  const SUP_SIZE  = 44;
  const BASE_Y    = TABLE_Y_OFFSET - 10;
  const SUP_Y     = BASE_Y - 32;

  let cx = TABLE_LEFT;

  // 근음 + 3화음 + 7음 + 기능
  const basePart = selectedRoot
    + selectedTriad
    + selectedSeventh
    + selectedFunc;
  c.font = `400 ${BASE_SIZE}px "Times New Roman", serif`;
  c.fillText(basePart, cx, BASE_Y);
  cx += c.measureText(basePart).width;

  // 텐션 위첨자
  if (selectedTensions.length > 0) {
    const tensionStr = '(' + selectedTensions.map(t => t.replace('b', '♭')).join(',') + ')';
    c.font = `400 ${SUP_SIZE}px "Times New Roman", serif`;
    c.fillText(tensionStr, cx, SUP_Y);
    cx += c.measureText(tensionStr).width;
  }

  // 분수코드
  if (selectedBass) {
    c.font = `400 ${BASE_SIZE}px "Times New Roman", serif`;
    c.fillText('/' + selectedBass, cx, BASE_Y);
  }

  // 프렛 번호 (2번째 프렛 칸 중앙, TABLE_BOT 아래)
  const fretNumEl = document.getElementById('fret-number');
  const fretNum = fretNumEl ? fretNumEl.value.trim() : '';
  if (fretNum) {
    c.font = '400 28px "Times New Roman", serif';
    c.fillStyle = '#1a1714';
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillText(fretNum, TABLE_LEFT + 1.5 * FW, TABLE_BOT + 16);
  }

  c.restore();
}

function draw() {
  drawCanvas(ctx);
  updateBarreBtns();
}

// ── 바레 버튼 ──
function updateBarreBtns() {
  const container = document.getElementById('barre-btns');
  container.innerHTML = '';

  const barreFrets = getBarreFrets();
  const canvasRect = canvas.getBoundingClientRect();
  const dispScaleX = canvasRect.width  / W;
  const dispScaleY = canvasRect.height / CANVAS_H;

  barreFrets.forEach(f => {
    const cx = TABLE_LEFT + (f - 0.5) * FW;
    const cy = TABLE_TOP - DOT_SIZE - 4;
    const left = cx * dispScaleX - 12;
    const top  = cy * dispScaleY;

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
      font-family: 'DM Mono', monospace;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    `;
    btn.onclick = () => {
      barreActive[f] = !barreActive[f];
      draw();
    };
    container.appendChild(btn);
  });
}

// ── 클릭 처리 ──
canvas.addEventListener('click', function(e) {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W / rect.width);
  const my = (e.clientY - rect.top)  * (CANVAS_H / rect.height);

  const si = Math.round((my - TABLE_TOP) / SH);
  if (si < 0 || si > STRINGS - 1) return;

  if (mx >= TABLE_LEFT - 50 && mx < TABLE_LEFT) {
    const cur = openMute[si];
    openMute[si] = cur === null ? 'open' : cur === 'open' ? 'mute' : null;
    if (rootMode) rootIndex = calcRootIndex();
    draw(); return;
  }

  if (mx < TABLE_LEFT || mx > TABLE_RIGHT + 5) return;

  const fi = Math.floor((mx - TABLE_LEFT) / FW) + 1;
  if (fi < 1 || fi > FRETS) return;

  if (currentMode === 'finger') {
    const idx = dots.findIndex(d => d.s === si && d.f === fi);
    if (idx !== -1) {
      dots.splice(idx, 1);
      if (rootMode) rootIndex = calcRootIndex();
    } else {
      dots.push({ s: si, f: fi, n: selectedFinger });
      if (rootMode) rootIndex = calcRootIndex();
    }
    draw();
  } else if (currentMode === 'open' || currentMode === 'mute') {
    openMute[si] = openMute[si] === currentMode ? null : currentMode;
    draw();
  }
});

// ── PNG 저장 ──
function savePNG() {
  const scale = 3;
  const expCanvas = document.createElement('canvas');
  expCanvas.width  = W * scale;
  expCanvas.height = CANVAS_H * scale;
  const ec = expCanvas.getContext('2d');
  ec.scale(scale, scale);
  drawCanvas(ec, true);

  const link = document.createElement('a');
  link.download = buildChordName() + '_chord.png';
  link.href = expCanvas.toDataURL('image/png');
  link.click();
}

// ── 초기화 ──
renderRootBtns();
renderBassBtns();
updateChordDisplay();