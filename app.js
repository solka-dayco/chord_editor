// ═══════════════════════════════════════════════════════════════
// 캔버스 설정
// ═══════════════════════════════════════════════════════════════
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');

const BASE_W     = 400;
const BASE_H     = 300;
const BASE_Y_OFF = 55;
const BASE_MX    = 45;
const BASE_MY    = 18;
const BASE_TABLE_H = BASE_H - BASE_Y_OFF - 40;
const STRINGS    = 6;
const FRETS      = 4;

let RATIO = 1;

const r  = () => RATIO;
const W  = () => Math.round(BASE_W       * r());
const CH = () => Math.round(BASE_H       * r());
const TH = () => Math.round(BASE_TABLE_H * r());
const YO = () => Math.round(BASE_Y_OFF   * r());
const MX = () => Math.round(BASE_MX      * r());
const MY = () => Math.round(BASE_MY      * r());
const TL = () => MX();
const TR = () => W() - MX();
const TT = () => YO() + MY();
const TB = () => YO() + TH() - MY();
const FW = () => (TR() - TL()) / FRETS;
const SH = () => (TB() - TT()) / (STRINGS - 1);
const DS = () => Math.round(SH() * 0.85);

function resizeCanvas() {
  const availW = canvas.parentElement.clientWidth || BASE_W;
  RATIO = availW / BASE_W;
  canvas.width  = W();
  canvas.height = CH();
  draw();
}

// ═══════════════════════════════════════════════════════════════
// 이미지 로드
// ═══════════════════════════════════════════════════════════════
const IMAGES = {};
const IMAGE_LIST = [
  'root_t','root1','root2','root3','root4',
  'common_t','common1','common2','common3','common4',
  'barre_two','barre_three','barre_four','barre_five','barre_six',
  'open','open_root','mute'
];
const BARRE_KEYS = { 2:'barre_two', 3:'barre_three', 4:'barre_four', 5:'barre_five', 6:'barre_six' };

let loadedCount = 0;
IMAGE_LIST.forEach(key => {
  const img = new Image();
  img.src = `image/${key}.png`;
  img.onload = () => { if (++loadedCount === IMAGE_LIST.length) { resizeCanvas(); renderSidebar(); } };
  IMAGES[key] = img;
});

// ═══════════════════════════════════════════════════════════════
// 코드명 상태
// ═══════════════════════════════════════════════════════════════
const ROOTS_SHARP = ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#'];
const ROOTS_FLAT  = ['A','Bb','B','C','Db','D','Eb','E','F','Gb','G','Ab'];

let accidental      = 'sharp';
let selectedRoot    = 'A';
let selectedTriad   = '';
let selectedSeventh = '';
let selectedFunc    = '';
let selectedTensions = [];
let selectedBass    = '';

// 네비게이션 전역 상태 (초기화 코드보다 먼저 선언 필요)
let contextProjectId = null;
let currentProjectId = null;
let isEditMode = true;


function renderBtnGroup(groupId, items, getCurrent, onSelect, noneLabel) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.innerHTML = '';
  if (noneLabel !== undefined) {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (getCurrent() === '' ? ' active' : '');
    btn.textContent = noneLabel;
    btn.onclick = () => { onSelect(''); updateChordDisplay(); };
    group.appendChild(btn);
  }
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (item === getCurrent() ? ' active' : '');
    btn.textContent = item;
    btn.onclick = () => { onSelect(item); updateChordDisplay(); };
    group.appendChild(btn);
  });
}

function renderRootBtns() {
  const roots = accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  if (!roots.includes(selectedRoot)) selectedRoot = roots[0];
  renderBtnGroup('root-group', roots, () => selectedRoot, v => { selectedRoot = v; renderRootBtns(); });
}

function renderBassBtns() {
  const roots = accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  renderBtnGroup('bass-group', roots, () => selectedBass, v => { selectedBass = v; renderBassBtns(); }, '없음');
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
  document.querySelectorAll('#triad-group .sel-btn').forEach(b =>
    b.classList.toggle('active', b.textContent === (val === '' ? 'M' : val)));
  updateChordDisplay();
}

function selectSeventh(val) {
  selectedSeventh = val;
  document.querySelectorAll('#seventh-group .sel-btn').forEach(b =>
    b.classList.toggle('active', b.textContent === (val === '' ? '없음' : val)));
  updateChordDisplay();
}

function selectFunc(val) {
  selectedFunc = val;
  document.querySelectorAll('#func-group .sel-btn').forEach(b =>
    b.classList.toggle('active', b.textContent === (val === '' ? '없음' : val === 'b5' ? '(b5)' : val)));
  updateChordDisplay();
}

function toggleTension(val) {
  const idx = selectedTensions.indexOf(val);
  idx !== -1 ? selectedTensions.splice(idx, 1) : selectedTensions.push(val);
  document.querySelectorAll('#tension-group .sel-btn').forEach(b =>
    b.classList.toggle('active', selectedTensions.includes(b.textContent)));
  updateChordDisplay();
}

function selectBass(val) {
  selectedBass = val;
  renderBassBtns();
  updateChordDisplay();
}

function buildChordName(data) {
  const root    = data ? data.root    : selectedRoot;
  const triad   = data ? data.triad   : selectedTriad;
  const seventh = data ? data.seventh : selectedSeventh;
  const func    = data ? data.func    : selectedFunc;
  const tensions= data ? data.tensions: selectedTensions;
  const bass    = data ? data.bass    : selectedBass;
  let n = root + triad + seventh + func;
  if (tensions && tensions.length) n += '(' + tensions.join(',') + ')';
  if (bass) n += '/' + bass;
  return n;
}

function buildChordHTML() {
  let n = selectedRoot + selectedTriad + selectedSeventh;
  if (selectedFunc === 'b5') n += '<sup>(b5)</sup>';
  else if (selectedFunc) n += selectedFunc;
  if (selectedTensions.length) n += '<sup>(' + selectedTensions.join(',') + ')</sup>';
  if (selectedBass) n += '/' + selectedBass;
  return n;
}

function updateChordDisplay() {
  const el = document.getElementById('chord-display');
  if (el) el.innerHTML = buildChordHTML();
  draw();
}

// ═══════════════════════════════════════════════════════════════
// 편집 상태
// ═══════════════════════════════════════════════════════════════
let selectedFinger  = 1;
let fingerNumMode   = false;
let dots        = [{s:1,f:2,n:1},{s:2,f:2,n:2},{s:3,f:2,n:3}];
let barreActive = {};
let openMute    = ['open','open','open','open','open','mute'];
let rootMode    = false;
let rootIndex   = -1;

function toggleFingerNum() {
  fingerNumMode = !fingerNumMode;
  document.getElementById('btn-finger-num').classList.toggle('active', fingerNumMode);
  document.getElementById('finger-group').style.opacity = fingerNumMode ? '1' : '0.35';
  draw();
}

function calcRootIndex() {
  const dotMaxS  = dots.length ? Math.max(...dots.map(d => d.s)) : -1;
  const openMaxS = openMute.reduce((max, v, i) => v === 'open' ? Math.max(max, i) : max, -1);
  return Math.max(dotMaxS, openMaxS);
}

function toggleRootMode() {
  rootMode = !rootMode;
  document.getElementById('btn-root').classList.toggle('active', rootMode);
  rootIndex = rootMode ? calcRootIndex() : -1;
  draw();
}

function selectFinger(n) {
  selectedFinger = n;
  document.querySelectorAll('.finger-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('f' + n).classList.add('selected');
}

function resetAll() {
  // 프로젝트 선택값 보존
  const projectSelect = document.getElementById('add-project-select');
  const savedProject  = projectSelect?.value ?? '';

  dots        = [{s:1,f:2,n:1},{s:2,f:2,n:2},{s:3,f:2,n:3}];
  barreActive = {};
  openMute    = ['open','open','open','open','open','mute'];
  rootMode    = false;
  rootIndex   = -1;
  document.getElementById('btn-root')?.classList.remove('active');
  // 코드명 초기화
  selectedRoot    = 'A';
  selectedTriad   = '';
  selectedSeventh = '';
  selectedFunc    = '';
  selectedTensions = [];
  selectedBass    = '';
  renderRootBtns();
  renderBassBtns();
  selectTriad('');
  selectSeventh('');
  selectFunc('');
  // 프렛 번호 초기화
  currentFretNumber = 2;
  const fretDisplay = document.getElementById('fret-number-display');
  if (fretDisplay) fretDisplay.textContent = '2';
  updateChordDisplay();
  draw();

  // 프로젝트 선택값 복원
  if (savedProject) userSelectedProjectId = savedProject;
  if (projectSelect && savedProject) projectSelect.value = savedProject;
}

function getBarreFrets() {
  const count = {};
  dots.forEach(d => { count[d.f] = (count[d.f] || 0) + 1; });
  return Object.keys(count).filter(f => count[f] >= 2).map(Number);
}

function getDotImgKey(n, isRoot) {
  if (!fingerNumMode) return isRoot ? 'open_root' : 'open';
  return (isRoot ? 'root' : 'common') + (n === 0 ? '_t' : String(n));
}

// ═══════════════════════════════════════════════════════════════
// 렌더링: drawCanvas (data 파라미터 지원)
// ═══════════════════════════════════════════════════════════════
function drawCanvas(c, ratio, data = null) {
  const _root     = data ? data.root     : selectedRoot;
  const _triad    = data ? data.triad    : selectedTriad;
  const _seventh  = data ? data.seventh  : selectedSeventh;
  const _func     = data ? data.func     : selectedFunc;
  const _tensions = data ? data.tensions : selectedTensions;
  const _bass     = data ? data.bass     : selectedBass;
  const _dots     = data ? data.dots     : dots;
  const _barre    = data ? data.barre    : barreActive;
  const _openMute = data ? data.openMute : openMute;
  const _fingerNumMode = data ? data.fingerNumMode : fingerNumMode;
  const _rootMode = data ? false         : rootMode;
  const _rootIndex= data ? -1            : rootIndex;
  const _fretNum  = data
    ? (data.fretNumber >= 2 ? String(data.fretNumber) : '')
    : (currentFretNumber >= 2 ? String(currentFretNumber) : '');

  const w   = Math.round(BASE_W       * ratio);
  const ch  = Math.round(BASE_H       * ratio);
  const th  = Math.round(BASE_TABLE_H * ratio);
  const yo  = Math.round(BASE_Y_OFF   * ratio);
  const mx  = Math.round(BASE_MX      * ratio);
  const my  = Math.round(BASE_MY      * ratio);
  const tl  = mx;
  const tr  = w - mx;
  const tt  = yo + my;
  const tb  = yo + th - my;
  const fw  = (tr - tl) / FRETS;
  const sh  = (tb - tt) / (STRINGS - 1);
  const ds  = Math.round(sh * 0.85);
  const sc  = w / BASE_W;

  c.clearRect(0, 0, w, ch);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, w, ch);

  // 너트
  c.strokeStyle = '#000000';
  c.lineWidth = Math.max(1, 3 * sc);
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(tl, tt); c.lineTo(tl, tb); c.stroke();

  // 프렛선
  c.strokeStyle = '#2a2a2a';
  c.lineWidth = Math.max(0.5, sc);
  c.lineCap = 'butt';
  for (let f = 0; f <= FRETS; f++) {
    const x = tl + f * fw;
    c.beginPath(); c.moveTo(x, tt); c.lineTo(x, tb); c.stroke();
  }

  // 줄선
  for (let s = 0; s < STRINGS; s++) {
    const y = tt + s * sh;
    c.beginPath(); c.moveTo(tl, y); c.lineTo(tr, y); c.stroke();
  }

  // 바레 커버 범위 미리 계산
  const _barreCount = {};
  _dots.forEach(d => { _barreCount[d.f] = (_barreCount[d.f] || 0) + 1; });
  const coveredByBarre = new Set();
  Object.keys(_barreCount).filter(f => _barreCount[Number(f)] >= 2 && _barre[Number(f)]).forEach(f => {
    const same = _dots.filter(d => d.f === Number(f));
    const minS = Math.min(...same.map(d => d.s));
    const maxS = Math.max(...same.map(d => d.s));
    for (let s = minS; s <= maxS; s++) coveredByBarre.add(s);
  });

  // 오픈/뮤트
  _openMute.forEach((v, s) => {
    if (_dots.some(d => d.s === s)) return;
    if (v !== 'mute' && coveredByBarre.has(s)) return;
    const y   = tt + s * sh;
    const x   = tl - 24 * sc;
    const key = v === 'mute' ? 'mute' : (_rootMode && s === _rootIndex) ? 'open_root' : 'open';
    if (IMAGES[key]) c.drawImage(IMAGES[key], x - ds/2, y - ds/2, ds, ds);
  });

  // barre
  const barreFrets = [];
  Object.keys(_barreCount).filter(f => _barreCount[f] >= 2).map(Number).forEach(f => {
    if (!_barre[f]) return;
    const same  = _dots.filter(d => d.f === f);
    const minS  = Math.min(...same.map(d => d.s));
    const maxS  = Math.max(...same.map(d => d.s));
    const key   = BARRE_KEYS[maxS - minS + 1];
    if (!key || !IMAGES[key]) return;
    barreFrets.push(f);
    const x = tl + (f - 0.5) * fw;
    const y = tt + minS * sh;
    c.drawImage(IMAGES[key], x - ds/2, y - ds/2, ds, sh * (maxS - minS) + ds);
  });

  // dot
  _dots.forEach(d => {
    if (_barre[d.f] && barreFrets.includes(d.f)) return;
    const key = _fingerNumMode
      ? (_rootMode && d.s === _rootIndex ? 'root' : 'common') + (d.n === 0 ? '_t' : String(d.n))
      : (_rootMode && d.s === _rootIndex ? 'open_root' : 'open');
    if (!IMAGES[key]) return;
    c.drawImage(IMAGES[key], tl + (d.f - 0.5)*fw - ds/2, tt + d.s*sh - ds/2, ds, ds);
  });

  // 코드명
  c.save();
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, w, tt - ds/2);
  c.fillStyle = '#1a1714';
  c.textBaseline = 'alphabetic';

  const bSize = Math.round(36 * sc);
  const sSize = Math.round(20 * sc);
  const bY    = yo - Math.round(4 * sc);
  const sY    = bY - Math.round(14 * sc);

  let cx = tl;
  const base = _root + _triad + _seventh + (_func === 'b5' ? '' : _func);
  c.font = `400 ${bSize}px "Times New Roman", serif`;
  c.fillText(base, cx, bY);
  cx += c.measureText(base).width;

  if (_func === 'b5') {
    c.font = `400 ${sSize}px "Times New Roman", serif`;
    c.fillText('(b5)', cx, sY);
    cx += c.measureText('(b5)').width;
  }

  if (_tensions && _tensions.length) {
    const ts = '(' + _tensions.join(',') + ')';
    c.font = `400 ${sSize}px "Times New Roman", serif`;
    c.fillText(ts, cx, sY);
    cx += c.measureText(ts).width;
  }

  if (_bass) {
    c.font = `400 ${bSize}px "Times New Roman", serif`;
    c.fillText('/' + _bass, cx, bY);
  }

  // 프렛 번호
  if (_fretNum) {
    c.font = `400 ${Math.round(28 * sc)}px "Times New Roman", serif`;
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillText(_fretNum, tl + 1.5 * fw, tb + Math.round(28 * sc));
  }

  c.restore();
}

function draw() {
  drawCanvas(ctx, RATIO);
  updateBarreBtns();
}

// ═══════════════════════════════════════════════════════════════
// 바레 버튼
// ═══════════════════════════════════════════════════════════════
function updateBarreBtns() {
  const container = document.getElementById('barre-btns');
  if (!container) return;
  container.innerHTML = '';
  let needsRedraw = false;
  getBarreFrets().forEach(f => {
    if (barreActive[f] === undefined) {
      // 자동 활성화: 최대 2개 제한 확인
      const activeCount = Object.values(barreActive).filter(Boolean).length;
      if (activeCount < 2) {
        barreActive[f] = true;
        // 커버되는 줄에 한해 낮은 프렛 dot 제거
        removeDotsUnderBarre(f);
        needsRedraw = true;
      } else {
        barreActive[f] = false;
      }
    }
    const btn = document.createElement('button');
    btn.textContent = 'B';
    const left = TL() + (f - 0.5) * FW() - 12;
    const top  = TT() - DS() - 16;
    btn.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:24px;height:24px;
      border-radius:50%;border:1.5px solid #888;
      background:${barreActive[f] ? '#1a1714' : '#fff'};
      color:${barreActive[f] ? '#fff' : '#888'};
      font-size:11px;font-family:'Pretendard',sans-serif;
      cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;`;
    btn.onclick = () => {
      if (!barreActive[f]) {
        // 활성화 시도: 최대 2개 제한 확인
        const activeCount = Object.values(barreActive).filter(Boolean).length;
        if (activeCount >= 2) return;
        barreActive[f] = true;
        removeDotsUnderBarre(f);
      } else {
        barreActive[f] = false;
      }
      draw();
    };
    container.appendChild(btn);
  });
  if (needsRedraw) drawCanvas(ctx, RATIO);
}

// ═══════════════════════════════════════════════════════════════
// 클릭 처리
// ═══════════════════════════════════════════════════════════════
canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (W() / rect.width);
  const my = (e.clientY - rect.top)  * (CH() / rect.height);
  const si = Math.round((my - TT()) / SH());
  if (si < 0 || si > STRINGS - 1) return;

  if (mx >= TL() - 50 && mx < TL()) {
    const hasDot = dots.some(d => d.s === si);
    if (hasDot) {
      dots = dots.filter(d => d.s !== si);
      openMute[si] = 'open';
    } else {
      openMute[si] = openMute[si] === 'mute' ? 'open' : 'mute';
    }
    if (rootMode) rootIndex = calcRootIndex();
    draw(); return;
  }

  if (mx < TL() || mx > TR() + 5) return;

  const fi = Math.floor((mx - TL()) / FW()) + 1;
  if (fi < 1 || fi > FRETS) return;

  // 바레로 커버된 줄은 해당 바레 프렛보다 낮은 곳에 dot 불가
  const barreMapCheck = buildBarreMap(dots, barreActive);
  if (barreMapCheck[si] !== undefined && fi < barreMapCheck[si]) return;

  const idx = dots.findIndex(d => d.s === si && d.f === fi);
  if (idx !== -1) {
    dots.splice(idx, 1);
    openMute[si] = 'open';
  } else {
    dots = dots.filter(d => d.s !== si);
    openMute[si] = 'open';
    dots.push({ s: si, f: fi, n: selectedFinger });
  }
  if (rootMode) rootIndex = calcRootIndex();
  draw();
});

// ═══════════════════════════════════════════════════════════════
// PNG 저장
// ═══════════════════════════════════════════════════════════════
async function savePNG() {
  const select = document.getElementById('export-scale');
  const scale  = parseFloat(select.value);

  const exp = document.createElement('canvas');
  exp.width  = Math.round(BASE_W * scale);
  exp.height = Math.round(BASE_H * scale);
  const ec = exp.getContext('2d');
  ec.scale(scale, scale);
  drawCanvas(ec, 1);

  const base64  = exp.toDataURL('image/png').split(',')[1];
  const fileName = buildChordName() + '_chord.png';

  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Media } = window.Capacitor.Plugins;
      const tempResult = await Filesystem.writeFile({
        path: fileName, data: base64, directory: 'CACHE', recursive: true,
      });
      const permStatus = await Media.checkPermissions();
      const isGranted = permStatus.photos === 'granted' ||
                        permStatus.publicStorage === 'granted' ||
                        permStatus.publicStorage13Plus === 'granted';
      if (!isGranted) {
        const reqStatus = await Media.requestPermissions();
        const isReqGranted = reqStatus.photos === 'granted' ||
                             reqStatus.publicStorage === 'granted' ||
                             reqStatus.publicStorage13Plus === 'granted';
        if (!isReqGranted) { alert('갤러리 접근 권한이 필요합니다.'); return; }
      }
      let albumId = null;
      try {
        const { albums } = await Media.getAlbums();
        const existing = albums.find(a => a.name === 'Chorditor');
        if (existing) { albumId = existing.identifier; }
        else {
          await Media.createAlbum({ name: 'Chorditor' });
          const { albums: newAlbums } = await Media.getAlbums();
          const created = newAlbums.find(a => a.name === 'Chorditor');
          if (created) albumId = created.identifier;
        }
      } catch(e) { /* 앨범 처리 실패 시 앨범 없이 저장 */ }
      const saveOpts = { path: tempResult.uri };
      if (albumId) saveOpts.albumIdentifier = albumId;
      await Media.savePhoto(saveOpts);
      await Filesystem.deleteFile({ path: fileName, directory: 'CACHE' });
      alert('갤러리에 저장되었습니다.');
    } catch (e) {
      console.error('저장 실패:', e);
      alert('저장 실패: ' + JSON.stringify(e));
    }
  } else {
    const link = document.createElement('a');
    link.download = fileName;
    link.href = exp.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// ═══════════════════════════════════════════════════════════════
// 리사이즈
// ═══════════════════════════════════════════════════════════════
window.addEventListener('resize', resizeCanvas);

// ═══════════════════════════════════════════════════════════════
// fret 입력
// ═══════════════════════════════════════════════════════════════
let currentFretNumber = 2;

function adjustFretNumber(delta) {
  const next = currentFretNumber + delta;
  if (next < 2 || next > 18) return;
  currentFretNumber = next;
  const el = document.getElementById('fret-number-display');
  if (el) el.textContent = currentFretNumber;
  draw();
}

// ═══════════════════════════════════════════════════════════════
// Audio Engine (Karplus-Strong)
// ═══════════════════════════════════════════════════════════════
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
const renderedCache = {};
let activeSources = [];

const OPEN_MIDI = [64, 59, 55, 50, 45, 40];
const midiToFreq = midi => 440 * Math.pow(2, (midi - 69) / 12);

async function playChord(chord) {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  activeSources.forEach(s => { try { s.stop(); } catch(e) {} });
  activeSources = [];
  const notes = [];
  const fretBase = chord.fretNumber >= 2 ? chord.fretNumber - 2 : 0;
  const capoOffset = getProject(currentProjectId)?.capo ?? 0;
  const barreMap = buildBarreMap(chord.dots, chord.barre || {});
  for (let s = 0; s < STRINGS; s++) {
    if (chord.openMute[s] === 'mute') continue;
    const dot = chord.dots.find(d => d.s === s);
    const barreFret = barreMap[s];
    let fret = 0;
    // 가장 우측(높은 프렛) dot만 소리남
    if (dot !== undefined && barreFret !== undefined) {
      fret = fretBase + Math.max(dot.f, barreFret);
    } else if (dot !== undefined) {
      fret = fretBase + dot.f;
    } else if (barreFret !== undefined) {
      fret = fretBase + barreFret;
    }
    notes.push({ s, midi: OPEN_MIDI[s] + fret + capoOffset });
  }
  const sorted = notes.sort((a, b) => b.s - a.s);
  if (!sorted.length) return;
  const DURATION = 2.5, INTERVAL = 0.075;
  const now = audioCtx.currentTime + 0.05;
  const buffers = await Promise.all(sorted.map(n => getBuffer(midiToFreq(n.midi), DURATION)));
  buffers.forEach((buf, i) => {
    const src = audioCtx.createBufferSource();
    src.buffer = buf; src.connect(audioCtx.destination);
    src.start(now + i * INTERVAL);
    activeSources.push(src);
  });
}

async function renderKarplusStrong(freq, duration) {
  const sr = 44100;
  const total = Math.round(sr * duration);
  const offline = new OfflineAudioContext(1, total, sr);
  const N = Math.round(sr / freq);
  const d = new Float32Array(total);
  const delay = new Float32Array(N);
  const decay = 1 - (0.5 / (N * 2));
  for (let i = 0; i < N; i++) delay[i] = (Math.random() * 2 - 1) * 0.5;
  for (let i = 0; i < total; i++) {
    const idx  = i % N;
    const next = (i + 1) % N;
    d[i] = delay[idx];
    delay[idx] = decay * 0.5 * (delay[idx] + delay[next]);
  }
  const buf = offline.createBuffer(1, total, sr);
  buf.getChannelData(0).set(d);
  const gain = offline.createGain();
  gain.gain.setValueAtTime(0.5, 0);
  gain.gain.exponentialRampToValueAtTime(0.001, duration);
  const src = offline.createBufferSource();
  src.buffer = buf;
  src.connect(gain);
  gain.connect(offline.destination);
  src.start(0);
  return await offline.startRendering();
}

async function getBuffer(freq, duration) {
  const key = freq.toFixed(2);
  if (!renderedCache[key]) renderedCache[key] = await renderKarplusStrong(freq, duration);
  return renderedCache[key];
}

function calcActualFret(f) {
  return (currentFretNumber - 2) + f;
}

// 바레 활성화 시 커버되는 줄(minS~maxS)에서 해당 프렛보다 낮은 dot만 제거 (전역 dots 대상)
function removeDotsUnderBarre(f) {
  const same = dots.filter(d => d.f === f);
  if (same.length < 2) return;
  const minS = Math.min(...same.map(d => d.s));
  const maxS = Math.max(...same.map(d => d.s));
  dots = dots.filter(d => !(d.f < f && d.s >= minS && d.s <= maxS));
}

// 모달 에디터용
function meRemoveDotsUnderBarre(f) {
  const same = me_dots.filter(d => d.f === f);
  if (same.length < 2) return;
  const minS = Math.min(...same.map(d => d.s));
  const maxS = Math.max(...same.map(d => d.s));
  me_dots = me_dots.filter(d => !(d.f < f && d.s >= minS && d.s <= maxS));
}

// 활성 바레가 커버하는 줄→바레프렛 맵 생성
function buildBarreMap(dotList, barre) {
  const count = {};
  dotList.forEach(d => { count[d.f] = (count[d.f] || 0) + 1; });
  const map = {};
  Object.keys(count).filter(f => count[f] >= 2 && barre[Number(f)]).forEach(f => {
    const fNum = Number(f);
    const same = dotList.filter(d => d.f === fNum);
    const minS = Math.min(...same.map(d => d.s));
    const maxS = Math.max(...same.map(d => d.s));
    for (let s = minS; s <= maxS; s++) map[s] = fNum;
  });
  return map;
}

function calcStringNotes() {
  const notes = [];
  const barreMap = buildBarreMap(dots, barreActive);
  for (let s = 0; s < STRINGS; s++) {
    if (openMute[s] === 'mute') continue;
    const dot = dots.find(d => d.s === s);
    const barreFret = barreMap[s];
    let fret = 0;
    // 가장 우측(높은 프렛) dot만 소리남
    if (dot !== undefined && barreFret !== undefined) {
      fret = calcActualFret(Math.max(dot.f, barreFret));
    } else if (dot !== undefined) {
      fret = calcActualFret(dot.f);
    } else if (barreFret !== undefined) {
      fret = calcActualFret(barreFret);
    }
    notes.push({ s, midi: OPEN_MIDI[s] + fret });
  }
  return notes;
}

async function strumChord() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  activeSources.forEach(s => { try { s.stop(); } catch(e) {} });
  activeSources = [];
  const notes = calcStringNotes().sort((a, b) => b.s - a.s);
  if (!notes.length) return;
  const DURATION = 2.5;
  const INTERVAL = 0.075;
  const now = audioCtx.currentTime + 0.05;
  const buffers = await Promise.all(notes.map(n => getBuffer(midiToFreq(n.midi), DURATION)));
  buffers.forEach((buf, i) => {
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.connect(audioCtx.destination);
    src.start(now + i * INTERVAL);
    activeSources.push(src);
  });
}

// ═══════════════════════════════════════════════════════════════
// 초기화
// ═══════════════════════════════════════════════════════════════
renderRootBtns();
renderBassBtns();
updateChordDisplay();
document.getElementById('finger-group').style.opacity = fingerNumMode ? '1' : '0.35';
const _fd = document.getElementById('fret-number-display');
if (_fd) _fd.textContent = String(currentFretNumber);
setupOrientationListener();

// ═══════════════════════════════════════════════════════════════
// localStorage 유틸리티
// ═══════════════════════════════════════════════════════════════
function safeSave(key, value) {
  try {
    localStorage.setItem(key, value);
    hideStorageWarning();
  } catch(e) {
    if (e.name === 'QuotaExceededError') {
      showStorageWarning();
    }
  }
}

function showStorageWarning() {
  document.getElementById('storage-warning').classList.remove('hidden');
}

function hideStorageWarning() {
  document.getElementById('storage-warning').classList.add('hidden');
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ═══════════════════════════════════════════════════════════════
// 프로젝트 스토리지
// ═══════════════════════════════════════════════════════════════
function loadProjects() {
  try {
    return JSON.parse(localStorage.getItem('chorditor_projects') || '[]');
  } catch(e) { return []; }
}

function saveProjects(projects) {
  safeSave('chorditor_projects', JSON.stringify(projects));
}

function getPlan() {
  return localStorage.getItem('chorditor_plan') || 'free';
}

function getProject(id) {
  return loadProjects().find(p => p.id === id) || null;
}

function updateProject(updated) {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === updated.id);
  if (idx !== -1) {
    projects[idx] = updated;
  } else {
    projects.push(updated);
  }
  saveProjects(projects);
}

// ═══════════════════════════════════════════════════════════════
// 네비게이션
// ═══════════════════════════════════════════════════════════════
// contextProjectId는 초기화 시점 이전에도 참조되므로 파일 상단에 선언
// (let 선언은 TDZ로 인해 선언 전 접근 시 ReferenceError 발생)

function navigateTo(view, projectId) {
  stopPlayAll();
  stopMetronome();
  // 프로젝트 뷰를 떠나기 전 즉시 저장
  if (currentProjectId) {
    const currentLinesEl = document.getElementById('project-lines-' + currentProjectId);
    if (currentLinesEl) saveAllLines(currentProjectId, currentLinesEl);
  }

  document.getElementById('view-editor').classList.toggle('hidden', view !== 'editor');
  document.getElementById('view-project').classList.toggle('hidden', view !== 'project');

  if (view === 'editor') {
    contextProjectId = projectId || null;
    populateProjectSelect();
    closeSidebar();
    resizeCanvas();
    if (isMobileOrTablet() && screen.orientation?.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  } else if (view === 'project' && projectId) {
    contextProjectId = null;
    isEditMode = true;
    renderProjectView(projectId);
    closeSidebar();
    if (screen.orientation?.unlock) {
      try { screen.orientation.unlock(); } catch(e) {}
    }
  }
  renderSidebar();
}

// ═══════════════════════════════════════════════════════════════
// 사이드바
// ═══════════════════════════════════════════════════════════════
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  const isOpen = sidebar.classList.contains('open');
  if (isOpen) {
    closeSidebar();
  } else {
    sidebar.classList.add('open');
    backdrop.classList.remove('hidden');
    backdrop.classList.add('visible');
  }
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  sidebar.classList.remove('open');
  backdrop.classList.remove('visible');
  backdrop.classList.add('hidden');
}

function renderSidebar() {
  const projects = loadProjects();
  const pinned = projects.filter(p => p.pinned).sort((a, b) => a.pinnedOrder - b.pinnedOrder);
  const recent = projects.filter(p => !p.pinned).sort((a, b) => {
    if (a.id === currentProjectId) return -1;
    if (b.id === currentProjectId) return 1;
    return b.updatedAt - a.updatedAt;
  });

  renderSidebarList('sidebar-pinned', pinned, true);
  renderSidebarList('sidebar-recent', recent, false);

  lucide.createIcons();
}

function renderSidebarList(containerId, projects, isPinned) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  projects.forEach(project => {
    const item = document.createElement('div');
    item.className = 'sidebar-item';
    item.dataset.id = project.id;

    const name = document.createElement('span');
    name.className = 'sidebar-item-name';
    name.textContent = project.name;

    const actions = document.createElement('div');
    actions.className = 'sidebar-item-actions';

    const renameBtn = document.createElement('button');
    renameBtn.innerHTML = '<i data-lucide="pencil"></i>';
    renameBtn.title = '이름 변경';
    renameBtn.onclick = (e) => { e.stopPropagation(); renameProject(project.id); };

    const pinBtn = document.createElement('button');
    pinBtn.innerHTML = '<i data-lucide="pin"></i>';
    pinBtn.title = project.pinned ? '고정 해제' : '고정';
    if (project.pinned) pinBtn.classList.add('pinned');
    pinBtn.onclick = (e) => { e.stopPropagation(); togglePin(project.id); };

    actions.appendChild(renameBtn);
    actions.appendChild(pinBtn);

    item.appendChild(name);
    item.appendChild(actions);

    // 클릭: 프로젝트 열기
    item.addEventListener('click', () => navigateTo('project', project.id));

    // 500ms 홀드: 액션 표시
    let holdTimer = null;
    item.addEventListener('pointerdown', () => {
      holdTimer = setTimeout(() => {
        item.classList.toggle('show-actions');
      }, 500);
    });
    item.addEventListener('pointerup', () => clearTimeout(holdTimer));
    item.addEventListener('pointerleave', () => clearTimeout(holdTimer));

    // 고정 항목: 드래그 가능
    if (isPinned) {
      item.draggable = true;
      item.addEventListener('dragstart', e => {
        e.dataTransfer.setData('sidebar-project-id', project.id);
        item.style.opacity = '0.4';
      });
      item.addEventListener('dragend', () => { item.style.opacity = ''; });
      item.addEventListener('dragover', e => { e.preventDefault(); });
      item.addEventListener('drop', e => {
        e.preventDefault();
        const dragId = e.dataTransfer.getData('sidebar-project-id');
        if (dragId && dragId !== project.id) {
          reorderPinned(dragId, project.id);
        }
      });
    }

    container.appendChild(item);
  });
}

function togglePin(projectId) {
  const projects = loadProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p) return;
  p.pinned = !p.pinned;
  if (p.pinned) {
    const maxOrder = Math.max(0, ...projects.filter(x => x.pinned).map(x => x.pinnedOrder || 0));
    p.pinnedOrder = maxOrder + 1;
  } else {
    p.pinnedOrder = 0;
  }
  saveProjects(projects);
  renderSidebar();
}

function renameProject(projectId) {
  const projects = loadProjects();
  const p = projects.find(x => x.id === projectId);
  if (!p) return;
  const newName = prompt('프로젝트 이름을 입력하세요:', p.name);
  if (newName && newName.trim()) {
    p.name = newName.trim();
    saveProjects(projects);
    renderSidebar();
    // 현재 프로젝트 뷰에 있으면 제목 업데이트
    const nameInput = document.querySelector('.project-name-input');
    if (nameInput && nameInput.dataset.projectId === projectId) {
      nameInput.value = p.name;
    }
  }
}

function reorderPinned(dragId, targetId) {
  const projects = loadProjects();
  const dragP = projects.find(p => p.id === dragId);
  const targetP = projects.find(p => p.id === targetId);
  if (!dragP || !targetP) return;
  const dragOrder = dragP.pinnedOrder;
  dragP.pinnedOrder = targetP.pinnedOrder;
  targetP.pinnedOrder = dragOrder;
  saveProjects(projects);
  renderSidebar();
}

// ═══════════════════════════════════════════════════════════════
// 프로젝트 생성
// ═══════════════════════════════════════════════════════════════
function promptCreateProject() {
  const plan = getPlan();
  const projects = loadProjects();
  if (plan === 'free' && projects.length >= 2) {
    alert('무료 플랜은 최대 2개의 프로젝트를 만들 수 있습니다.\nPro로 업그레이드하면 무제한으로 사용 가능합니다.');
    return;
  }
  const name = prompt('새 프로젝트 이름:');
  if (!name || !name.trim()) return;

  const newProject = {
    id: genId(),
    name: name.trim(),
    pinned: false,
    pinnedOrder: 0,
    capo: 0,
    bpm: 120,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    chords: [],
    arrangement: []
  };
  projects.push(newProject);
  saveProjects(projects);
  renderSidebar();
  populateProjectSelect();
  navigateTo('project', newProject.id);
}

// ═══════════════════════════════════════════════════════════════
// 에디터 → 프로젝트에 추가
// ═══════════════════════════════════════════════════════════════
let userSelectedProjectId = null;

function populateProjectSelect() {
  const select = document.getElementById('add-project-select');
  if (!select) return;
  if (!select._changeTracked) {
    select.addEventListener('change', () => { userSelectedProjectId = select.value || null; });
    select._changeTracked = true;
  }
  const projects = loadProjects();
  select.innerHTML = '<option value="">프로젝트 선택</option>';
  projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    select.appendChild(opt);
  });
  const restoreId = contextProjectId || userSelectedProjectId;
  if (restoreId) select.value = restoreId;
}

function getCurrentChordState() {
  return {
    id: genId(),
    name: buildChordName(),
    root: selectedRoot,
    triad: selectedTriad,
    seventh: selectedSeventh,
    func: selectedFunc,
    tensions: [...selectedTensions],
    bass: selectedBass,
    dots: JSON.parse(JSON.stringify(dots)),
    openMute: [...openMute],
    barre: JSON.parse(JSON.stringify(barreActive)),
    fretNumber: currentFretNumber,
    fingerNumMode: fingerNumMode,
    accidental: accidental
  };
}

function addCurrentChordToProject() {
  const select = document.getElementById('add-project-select');
  const projectId = select ? select.value : (contextProjectId || '');
  if (!projectId) { alert('프로젝트를 선택하세요.'); return; }

  const projects = loadProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) { alert('프로젝트를 찾을 수 없습니다.'); return; }

  const chordData = getCurrentChordState();
  project.chords.push(chordData);
  project.updatedAt = Date.now();
  saveProjects(projects);

  if (contextProjectId) {
    navigateTo('project', contextProjectId);
  } else {
    alert(`"${chordData.name}" 코드가 "${project.name}" 프로젝트에 추가되었습니다.`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 프로젝트 뷰 렌더링
// ═══════════════════════════════════════════════════════════════
let currentColCount  = 4;
let playbackActive = false;
let currentPlayTimeout = null;
let metronomeActive = false;
let metronomeSchedulerTimeout = null;
let metronomeNextBeatTime = 0;
let metronomeBeatCount = 0;
let playbackStartAudioTime = 0;

function metronomeClick(time, isDownbeat) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  filter.Q.value = 0.3;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = 'sine';
  osc.frequency.value = isDownbeat ? 740 : 520;

  const vol = isDownbeat ? 0.38 : 0.22;
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.055);

  osc.start(time);
  osc.stop(time + 0.06);
}

function scheduleMetronome() {
  if (!metronomeActive || !audioCtx) return;
  const bpm = getProject(currentProjectId)?.bpm ?? 120;
  const beatDuration = 60 / bpm;
  const now = audioCtx.currentTime;

  while (metronomeNextBeatTime < now + 0.12) {
    metronomeClick(metronomeNextBeatTime, metronomeBeatCount % 4 === 0);
    metronomeNextBeatTime += beatDuration;
    metronomeBeatCount++;
  }
  metronomeSchedulerTimeout = setTimeout(scheduleMetronome, 50);
}

function syncMetronomeToPlayback() {
  // 재생 중이면 playbackStartAudioTime 기준으로 다음 박자 경계에 맞춤
  if (playbackActive && playbackStartAudioTime > 0) {
    const bpm = getProject(currentProjectId)?.bpm ?? 120;
    const beatDuration = 60 / bpm;
    const now = audioCtx.currentTime;
    const elapsed = now - playbackStartAudioTime;
    const beatsPassed = Math.max(0, Math.floor(elapsed / beatDuration));
    metronomeBeatCount = beatsPassed + 1;
    metronomeNextBeatTime = playbackStartAudioTime + metronomeBeatCount * beatDuration;
  } else {
    metronomeBeatCount = 0;
    metronomeNextBeatTime = audioCtx.currentTime + 0.05;
  }
}

async function startMetronome(synced = false) {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  if (metronomeSchedulerTimeout) { clearTimeout(metronomeSchedulerTimeout); metronomeSchedulerTimeout = null; }
  if (synced) {
    syncMetronomeToPlayback();
  } else {
    metronomeBeatCount = 0;
    metronomeNextBeatTime = audioCtx.currentTime + 0.05;
  }
  scheduleMetronome();
}

function stopMetronome() {
  metronomeActive = false;
  if (metronomeSchedulerTimeout) { clearTimeout(metronomeSchedulerTimeout); metronomeSchedulerTimeout = null; }
  const btn = document.getElementById('metronome-btn');
  if (btn) btn.classList.remove('active');
}

async function toggleMetronome() {
  metronomeActive = !metronomeActive;
  const btn = document.getElementById('metronome-btn');
  if (metronomeActive) {
    if (btn) btn.classList.add('active');
    await startMetronome(true); // 재생 중이면 동기화, 아니면 자유 시작
  } else {
    stopMetronome();
  }
}

function stopPlayAll() {
  playbackActive = false;
  if (currentPlayTimeout) { clearTimeout(currentPlayTimeout); currentPlayTimeout = null; }
  activeSources.forEach(s => { try { s.stop(); } catch(e) {} });
  activeSources = [];
  document.querySelectorAll('.chord-slot--playing').forEach(el => el.classList.remove('chord-slot--playing'));
  const btn = document.getElementById('play-all-btn');
  if (btn) { btn.innerHTML = '<i data-lucide="play"></i>'; lucide.createIcons(); }
}

async function playAll(projectId, startIndex = 0) {
  stopPlayAll();

  const project = getProject(projectId);
  if (!project) return;

  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') await audioCtx.resume();

  const bpm = project.bpm ?? 120;
  const beatMs = 60000 / bpm;
  const slotMs = currentColCount === 4 ? beatMs * 4 : beatMs * 2;
  // startIndex 슬롯의 박자 오프셋만큼 역산해서 기준 시각 계산
  const beatsPerSlot = currentColCount === 4 ? 4 : 2;
  playbackStartAudioTime = audioCtx.currentTime + 0.05 - startIndex * beatsPerSlot * (60 / bpm);

  const playDataIndices = currentColCount === 4 ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7];
  const orderedSlots = project.arrangement.flatMap(row =>
    playDataIndices.map(dataIdx => ({ chordId: row.slots[dataIdx] ?? null, lineId: row.id, slotIdx: dataIdx }))
  );
  if (!orderedSlots.length) return;

  playbackActive = true;
  const btn = document.getElementById('play-all-btn');
  if (btn) { btn.innerHTML = '<i data-lucide="square"></i>'; lucide.createIcons(); }

  // 메트로놈이 켜져 있으면 재생 기준으로 재동기화
  if (metronomeActive) await startMetronome(true);

  // 드리프트 방지: startIndex 슬롯이 재생됐어야 할 절대 기준 시각
  const refWallTime = performance.now() - startIndex * slotMs;
  let i = startIndex;
  async function next() {
    if (!playbackActive || i >= orderedSlots.length) { stopPlayAll(); return; }
    const item = orderedSlots[i++];

    // 이전 강조 제거 후 현재 슬롯 강조
    document.querySelectorAll('.chord-slot--playing').forEach(el => el.classList.remove('chord-slot--playing'));
    const slotEl = document.querySelector(`[data-line-id="${item.lineId}"][data-slot-idx="${item.slotIdx}"]`);
    if (slotEl) {
      slotEl.classList.add('chord-slot--playing');
      const lineEl = slotEl.closest('.project-line');
      if (lineEl) {
        const scrollEl = document.getElementById('project-lines-' + projectId);
        if (scrollEl) {
          const firstLine = scrollEl.querySelector('.project-line');
          const anchorTop = firstLine ? firstLine.offsetTop : 0;
          scrollEl.scrollTo({ top: lineEl.offsetTop - anchorTop, behavior: 'smooth' });
        }
      }
    }

    if (item.chordId) {
      const p = getProject(projectId);
      const chord = p?.chords.find(c => c.id === item.chordId);
      if (chord) await playChord(chord);
    }
    // playChord 소요 시간을 빼고 정확한 다음 슬롯 시각까지만 대기
    const nextExpected = refWallTime + i * slotMs;
    const delay = Math.max(0, nextExpected - performance.now());
    currentPlayTimeout = setTimeout(next, delay);
  }
  next();
}

function getGlobalSlotIndex(project, lineId, dataIdx) {
  let globalIdx = 0;
  for (const row of project.arrangement) {
    if (row.id === lineId) {
      const visualIdx = currentColCount === 4 ? dataIdx / 2 : dataIdx;
      return globalIdx + visualIdx;
    }
    globalIdx += currentColCount;
  }
  return 0;
}

function renderProjectView(projectId) {
  currentProjectId = projectId;
  const project = getProject(projectId);
  if (!project) return;

  // 슬롯 배열 8칸 고정 마이그레이션 (기존 4-슬롯 rows 변환)
  let migrated = false;
  project.arrangement.forEach(row => {
    if (!row.slots) { row.slots = new Array(8).fill(null); migrated = true; }
    else if (row.slots.length < 8) {
      const ns = new Array(8).fill(null);
      row.slots.forEach((id, i) => { if (id) ns[i * 2] = id; });
      row.slots = ns; migrated = true;
    }
  });
  if (migrated) updateProject(project);

  currentColCount = project.colCount || 4;

  const viewEl = document.getElementById('view-project');
  viewEl.innerHTML = '';
  viewEl.classList.toggle('view-mode', !isEditMode);

  const maxW = currentColCount === 8 ? '1600px' : '850px';

  // ── 헤더 (<header> 로 분리) ──
  const header = document.createElement('div');
  header.className = 'project-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'back-btn';
  backBtn.innerHTML = '<i data-lucide="arrow-left"></i> 뒤로';
  backBtn.onclick = () => navigateTo('editor');

  const nameInput = document.createElement('input');
  nameInput.className = 'project-name-input';
  nameInput.type = 'text';
  nameInput.value = project.name;
  nameInput.dataset.projectId = projectId;
  nameInput.placeholder = '프로젝트 이름';
  nameInput.readOnly = !isEditMode;
  if (!isEditMode) nameInput.style.pointerEvents = 'none';
  let nameDebounce = null;
  nameInput.addEventListener('input', () => {
    clearTimeout(nameDebounce);
    nameDebounce = setTimeout(() => {
      const p = getProject(projectId);
      if (p) { p.name = nameInput.value.trim() || p.name; p.updatedAt = Date.now(); updateProject(p); renderSidebar(); }
    }, 500);
  });

  // 편집/완료 토글 버튼
  const modeBtn = document.createElement('button');
  modeBtn.className = (isEditMode ? 'btn btn-secondary' : 'btn btn-primary') + ' project-header-btn';
  modeBtn.textContent = isEditMode ? '완료' : '편집';
  modeBtn.onclick = () => {
    isEditMode = !isEditMode;
    renderProjectView(projectId);
  };

  // 4칸/8칸 토글
  const colToggle = document.createElement('div');
  colToggle.className = 'col-toggle';
  [4, 8].forEach(n => {
    const btn = document.createElement('button');
    btn.className = 'col-toggle-btn' + (currentColCount === n ? ' active' : '');
    btn.textContent = n + '칸';
    btn.onclick = () => {
      currentColCount = n;
      const p = getProject(projectId);
      if (p) { p.colCount = n; updateProject(p); }
      renderProjectView(projectId);
    };
    colToggle.appendChild(btn);
  });

  // ── 1행: 뒤로 | 제목 | 4칸/8칸 | 완료/편집 | [삭제] ──
  const headerRow1 = document.createElement('div');
  headerRow1.className = 'project-header-row1';
  headerRow1.appendChild(backBtn);
  headerRow1.appendChild(nameInput);
  headerRow1.appendChild(colToggle);
  headerRow1.appendChild(modeBtn);
  if (isEditMode) {
    const deleteProjectBtn = document.createElement('button');
    deleteProjectBtn.className = 'btn btn-danger project-header-btn';
    deleteProjectBtn.textContent = '삭제';
    deleteProjectBtn.onclick = () => deleteProject(projectId);
    headerRow1.appendChild(deleteProjectBtn);
  }
  header.appendChild(headerRow1);

  // ── 2행: [Capo BPM 메트로놈 재생 오른쪽] ──
  const headerRow2 = document.createElement('div');
  headerRow2.className = 'project-header-row2';

  // 오른쪽 컨트롤 그룹
  const row2Controls = document.createElement('div');
  row2Controls.className = 'project-header-row2-controls';

  // 카포 컨트롤
  const capoWrap = document.createElement('div');
  capoWrap.className = 'capo-control';
  const capoLabel = document.createElement('span');
  capoLabel.className = 'capo-label';
  capoLabel.textContent = 'Capo';
  const capoDown = document.createElement('button');
  capoDown.className = 'capo-btn';
  capoDown.textContent = '−';
  const capoVal = document.createElement('span');
  capoVal.className = 'capo-value';
  capoVal.textContent = project.capo ?? 0;
  const capoUp = document.createElement('button');
  capoUp.className = 'capo-btn';
  capoUp.textContent = '+';
  capoDown.onclick = () => {
    const p = getProject(projectId);
    if (p && (p.capo ?? 0) > 0) { p.capo = (p.capo ?? 0) - 1; updateProject(p); capoVal.textContent = p.capo; }
  };
  capoUp.onclick = () => {
    const p = getProject(projectId);
    if (p && (p.capo ?? 0) < 12) { p.capo = (p.capo ?? 0) + 1; updateProject(p); capoVal.textContent = p.capo; }
  };
  capoWrap.append(capoLabel, capoDown, capoVal, capoUp);
  row2Controls.appendChild(capoWrap);

  // BPM 컨트롤
  const bpmWrap = document.createElement('div');
  bpmWrap.className = 'bpm-control';
  const bpmLabel = document.createElement('span');
  bpmLabel.className = 'bpm-label';
  bpmLabel.textContent = 'BPM';
  const bpmInput = document.createElement('input');
  bpmInput.className = 'bpm-input';
  bpmInput.type = 'number';
  bpmInput.min = 40; bpmInput.max = 240;
  bpmInput.value = project.bpm ?? 120;
  bpmInput.addEventListener('change', () => {
    const val = Math.min(240, Math.max(40, parseInt(bpmInput.value) || 120));
    bpmInput.value = val;
    const p = getProject(projectId);
    if (p) { p.bpm = val; updateProject(p); }
  });
  bpmWrap.append(bpmLabel, bpmInput);
  row2Controls.appendChild(bpmWrap);

  // 메트로놈 버튼
  const metronomeBtn = document.createElement('button');
  metronomeBtn.id = 'metronome-btn';
  metronomeBtn.className = 'btn metronome-btn' + (metronomeActive ? ' active' : '');
  metronomeBtn.innerHTML = '<i data-lucide="timer"></i>';
  metronomeBtn.title = '메트로놈';
  metronomeBtn.onclick = () => toggleMetronome();
  row2Controls.appendChild(metronomeBtn);

  // 전체재생 버튼
  const playAllBtn = document.createElement('button');
  playAllBtn.id = 'play-all-btn';
  playAllBtn.className = 'btn play-all-btn';
  playAllBtn.innerHTML = playbackActive ? '<i data-lucide="square"></i>' : '<i data-lucide="play"></i>';
  playAllBtn.onclick = () => { if (playbackActive) stopPlayAll(); else playAll(projectId); };
  row2Controls.appendChild(playAllBtn);

  headerRow2.appendChild(row2Controls);
  header.appendChild(headerRow2);

  // ── 고정 헤더 영역 ──
  const thumbList = buildThumbList(project, isEditMode);
  const stickyBar = document.createElement('header');
  stickyBar.className = 'project-sticky-bar';
  stickyBar.style.maxWidth = maxW;
  stickyBar.appendChild(header);
  stickyBar.appendChild(thumbList);

  // ── 스크롤 콘텐츠 영역 ──
  const linesEl = buildLinesSection(project, isEditMode);
  const wrapper = document.createElement('div');
  wrapper.className = 'project-view-wrapper';
  wrapper.style.maxWidth = maxW;
  wrapper.appendChild(linesEl);

  viewEl.appendChild(stickyBar);
  viewEl.appendChild(wrapper);

  lucide.createIcons();

  linesEl.scrollTop = 0;
  linesEl.focus();
}

function getLineText(lineDiv) {
  let text = '';
  for (const node of lineDiv.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent;
  }
  return text;
}

// preRange.toString() 대신 TEXT_NODE 기준으로 커서 이전 오프셋 계산
// (chord-area 내 ✕ 버튼 텍스트를 포함하지 않음)
function getCursorOffsetInLine(lineDiv, range) {
  const textNode = Array.from(lineDiv.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
  if (!textNode) return 0;
  if (range.startContainer === textNode) return range.startOffset;
  if (range.startContainer === lineDiv) {
    const idx = Array.from(lineDiv.childNodes).indexOf(textNode);
    return idx < range.startOffset ? textNode.textContent.length : 0;
  }
  return 0;
}

function setLineText(lineDiv, text) {
  // 기존 <br> placeholder 제거
  lineDiv.querySelectorAll('br').forEach(br => br.remove());
  for (const node of lineDiv.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) { node.textContent = text; if (!text) lineDiv.appendChild(document.createElement('br')); return; }
  }
  if (text) {
    lineDiv.appendChild(document.createTextNode(text));
  } else {
    lineDiv.appendChild(document.createElement('br'));
  }
}

function buildChordArea(line, project, editMode = true) {
  const area = document.createElement('div');
  area.className = `chord-area cols-${currentColCount}`;
  area.contentEditable = 'false';
  const base = line.slots || [];
  const dataIndices = currentColCount === 4 ? [0, 2, 4, 6] : [0, 1, 2, 3, 4, 5, 6, 7];
  dataIndices.forEach(dataIdx => {
    const chordId = base[dataIdx] ?? null;
    const slot = document.createElement('div');
    slot.dataset.slotIdx = dataIdx;
    slot.dataset.lineId = line.id;

    if (chordId && project.chords) {
      const chord = project.chords.find(c => c.id === chordId);
      if (chord) {
        slot.className = 'chord-slot';
        const cv = document.createElement('canvas');
        cv.width = 400; cv.height = 300;
        drawCanvas(cv.getContext('2d'), 1, chord);
        const img = document.createElement('img');
        img.src = cv.toDataURL('image/png');
        img.className = 'chord-slot-img';
        img.addEventListener('click', () => {
          if (playbackActive) {
            const p = getProject(project.id);
            if (p) playAll(project.id, getGlobalSlotIndex(p, line.id, dataIdx));
          } else {
            playChord(chord);
          }
        });

        slot.appendChild(img);

        if (editMode) {
          img.addEventListener('contextmenu', e => {
            e.preventDefault();
            // 데스크탑(마우스)에서만 우클릭 삭제 — 모바일 길게 누르기(~600ms contextmenu)는 무시
            if (window.matchMedia('(pointer: fine)').matches) {
              placeChordInSlot(project.id, line.id, dataIdx, null);
            }
          });

          // 삭제 버튼
          const slotDel = document.createElement('button');
          slotDel.className = 'chord-slot-delete';
          slotDel.textContent = '✕';
          slotDel.onclick = e => { e.stopPropagation(); placeChordInSlot(project.id, line.id, dataIdx, null); };
          slot.appendChild(slotDel);


          slot.draggable = true;
          slot.addEventListener('dragstart', e => {
            e.stopPropagation();
            e.dataTransfer.setData('drag-slot-id', chordId);
            e.dataTransfer.setData('drag-slot-line-id', line.id);
            e.dataTransfer.setData('drag-slot-idx', String(dataIdx));
            slot.classList.add('dragging');
          });
          slot.addEventListener('dragend', () => slot.classList.remove('dragging'));
        }
      } else {
        slot.className = editMode ? 'chord-slot' : 'chord-slot slot-empty';
      }
    } else {
      // 빈 슬롯
      slot.className = editMode ? 'chord-slot' : 'chord-slot slot-empty';
    }

    if (editMode) {
      slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('drag-over'); });
      slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
      slot.addEventListener('drop', e => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        if (e.dataTransfer.types.includes('drag-slot-id')) {
          const srcLineId = e.dataTransfer.getData('drag-slot-line-id');
          const srcIdx = parseInt(e.dataTransfer.getData('drag-slot-idx'));
          swapChordSlots(project.id, srcLineId, srcIdx, line.id, dataIdx);
          return;
        }
        const dropped = e.dataTransfer.getData('chord-thumb-id');
        const fromProject = e.dataTransfer.getData('chord-thumb-project');
        if (dropped && fromProject === project.id) placeChordInSlot(project.id, line.id, dataIdx, dropped);
      });
    }
    area.appendChild(slot);
  });
  return area;
}

function buildLinesSection(project, editMode = true) {
  if (!project.arrangement || project.arrangement.length === 0) {
    project.arrangement = [{ id: genId(), text: '', slots: new Array(8).fill(null) }];
    updateProject(project);
  }
  const linesEl = document.createElement('div');
  linesEl.className = 'project-lines';
  linesEl.id = 'project-lines-' + project.id;
  linesEl.contentEditable = editMode ? 'true' : 'false';

  project.arrangement.forEach(line => {
    if (!line.slots) line.slots = new Array(8).fill(null);
    const div = document.createElement('div');
    div.className = 'project-line';
    div.dataset.lineId = line.id;
    div.appendChild(buildChordArea(line, project, editMode));
    if (line.text) {
      div.appendChild(document.createTextNode(line.text));
    } else {
      div.appendChild(document.createElement('br'));
    }
    linesEl.appendChild(div);
  });

  if (editMode) {
    let saveDebounce = null;
    linesEl.addEventListener('input', () => {
      // 텍스트가 있는 줄의 <br> placeholder 제거
      linesEl.querySelectorAll('.project-line').forEach(lineDiv => {
        if (getLineText(lineDiv)) {
          lineDiv.querySelectorAll('br').forEach(br => br.remove());
        }
      });
      clearTimeout(saveDebounce);
      saveDebounce = setTimeout(() => saveAllLines(project.id, linesEl), 300);
    });

    // 텍스트 영역에 드래그 드롭으로 이미지 삽입 차단
    linesEl.addEventListener('dragover', e => {
      if (e.target.closest('.chord-slot')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'none';
    });
    linesEl.addEventListener('drop', e => {
      if (e.target.closest('.chord-slot')) return;
      e.preventDefault();
    });

    linesEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        insertNewLineAtCursor(linesEl, project.id);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace(linesEl, project.id);
      }
    });

    // 포커스가 linesEl 외부로 완전히 이동할 때만 저장
    linesEl.addEventListener('focusout', e => {
      if (!e.relatedTarget || !linesEl.contains(e.relatedTarget)) {
        clearTimeout(saveDebounce);
        saveAllLines(project.id, linesEl);
      }
    });
  }

  // 마지막 포커스된 라인 추적 (모바일 selection 복원용)
  let lastFocusedLine = null;
  linesEl.addEventListener('focusin', e => {
    let t = e.target;
    while (t && t !== linesEl) {
      if (t.classList?.contains('project-line')) { lastFocusedLine = t; break; }
      t = t.parentElement;
    }
  });

  // 모바일: 길게 누르기로 컨텍스트 메뉴가 뜨면 focusin이 유실될 수 있어 touchstart로 보강
  linesEl.addEventListener('touchstart', e => {
    let t = e.target;
    while (t && t !== linesEl) {
      if (t.classList?.contains('project-line')) { lastFocusedLine = t; break; }
      t = t.parentElement;
    }
  }, { passive: true });

  function applyPastedText(pasted, anchorLine) {
    // 줄바꿈 정규화: \r\n, \r, \n 및 Unicode 줄/문단 구분자 처리
    const segments = pasted
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\u2028/g, '\n')
      .replace(/\u2029/g, '\n')
      .split('\n');
    const sel = window.getSelection();
    let currentLine = null;
    let cursorOff = 0;
    let before = '', after = '';

    if (sel && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      let node = range.startContainer;
      while (node && node !== linesEl) {
        if (node.classList?.contains('project-line')) { currentLine = node; break; }
        node = node.parentElement;
      }
      if (currentLine) {
        cursorOff = getCursorOffsetInLine(currentLine, range);
        const fullText = getLineText(currentLine);
        before = fullText.substring(0, cursorOff);
        after = fullText.substring(cursorOff);
      }
    }

    // selection이 없으면 마지막 포커스 라인 끝에 붙여넣기
    if (!currentLine) {
      currentLine = anchorLine || lastFocusedLine;
      if (!currentLine) {
        // document.activeElement 탐색 (모바일 컨텍스트 메뉴 후 포커스 유실 시)
        let el = document.activeElement;
        while (el && el !== linesEl) {
          if (el.classList?.contains('project-line')) { currentLine = el; break; }
          el = el.parentElement;
        }
      }
      if (!currentLine) {
        // 최후 폴백: DOM의 마지막 라인
        const allLines = linesEl.querySelectorAll('.project-line');
        currentLine = allLines[allLines.length - 1] || null;
      }
      if (!currentLine) return;
      before = getLineText(currentLine);
      after = '';
    }

    const p = getProject(project.id);
    setLineText(currentLine, before + segments[0]);
    let lastLine = currentLine;
    for (let i = 1; i < segments.length; i++) {
      const text = i === segments.length - 1 ? segments[i] + after : segments[i];
      const newLineId = genId();
      const newLine = { id: newLineId, text, slots: new Array(8).fill(null) };
      const newDiv = document.createElement('div');
      newDiv.className = 'project-line';
      newDiv.dataset.lineId = newLineId;
      newDiv.appendChild(buildChordArea(newLine, p || project));
      newDiv.appendChild(document.createTextNode(text));
      lastLine.insertAdjacentElement('afterend', newDiv);
      lastLine = newDiv;
    }
    if (segments.length === 1) setLineText(currentLine, before + segments[0] + after);

    const endRange = document.createRange();
    endRange.selectNodeContents(lastLine);
    endRange.collapse(false);
    if (sel) { sel.removeAllRanges(); sel.addRange(endRange); }
    saveAllLines(project.id, linesEl);
  }

  // HTML 클립보드에서 줄바꿈 보존하여 텍스트 추출
  function htmlClipboardToText(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const lines = [];
    let cur = '';
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        cur += node.textContent;
      } else if (node.nodeName === 'BR') {
        lines.push(cur); cur = '';
      } else if (['P', 'DIV', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(node.nodeName)) {
        if (cur || lines.length > 0) { lines.push(cur); cur = ''; }
        for (const c of node.childNodes) walk(c);
        if (cur || lines.length > 0) { lines.push(cur); cur = ''; }
      } else {
        for (const c of node.childNodes) walk(c);
      }
    };
    for (const c of tmp.childNodes) walk(c);
    if (cur) lines.push(cur);
    return lines.filter((l, i, a) => !(i === 0 && l === '') && !(i === a.length - 1 && l === '')).join('\n');
  }

  linesEl.addEventListener('paste', async e => {
    e.preventDefault(); // 항상 브라우저 기본 붙여넣기 차단

    // 비동기 전에 삽입 대상 라인을 동기적으로 캡처
    const sel = window.getSelection();
    let targetLine = null;
    if (sel?.rangeCount) {
      let node = sel.getRangeAt(0).startContainer;
      while (node && node !== linesEl) {
        if (node.classList?.contains('project-line')) { targetLine = node; break; }
        node = node.parentElement;
      }
    }
    if (!targetLine) targetLine = lastFocusedLine;

    const cd = e.clipboardData || window.clipboardData;
    let pasted = cd?.getData('text/plain') || cd?.getData('text') || '';

    // text/plain에 줄바꿈이 없으면 text/html에서 구조 추출
    if (pasted && !/[\n\r\u2028\u2029]/.test(pasted)) {
      const html = cd?.getData('text/html') || '';
      if (html) {
        const fromHtml = htmlClipboardToText(html);
        if (/\n/.test(fromHtml)) pasted = fromHtml;
      }
    }

    if (pasted) {
      applyPastedText(pasted, targetLine || lastFocusedLine);
      return;
    }

    // async Clipboard API (iOS Safari — clipboardData가 완전히 비어있는 경우)
    if (navigator.clipboard?.readText) {
      try {
        pasted = await navigator.clipboard.readText();
        if (pasted) applyPastedText(pasted, targetLine || lastFocusedLine);
      } catch {}
    }
  });

  // 브라우저가 DOM에 직접 삽입한 경우 처리 (Android/iOS 폴백)
  linesEl.addEventListener('input', e => {
    if (e.inputType !== 'insertFromPaste' && e.inputType !== 'insertFromPasteAsQuotation') return;
    let line = lastFocusedLine;
    if (!line || !linesEl.contains(line)) {
      // 스테일 참조 또는 null — <br>/<div>가 삽입된 라인 탐색
      line = null;
      for (const l of linesEl.querySelectorAll('.project-line')) {
        if (l.querySelector('br') || l.querySelector('div:not(.chord-area):not(.chord-slot)')) {
          line = l; break;
        }
      }
    }
    if (!line) return;

    // <br> 태그나 중첩 <div>로 삽입된 줄바꿈 감지 (textContent에는 안 보임)
    const hasBr = !!line.querySelector('br');
    const hasNestedDiv = !!line.querySelector('div:not(.chord-area):not(.chord-slot)');
    const hasTextBreak = /[\r\n]/.test(line.textContent || '');
    if (!hasBr && !hasNestedDiv && !hasTextBreak) return;

    // HTML 구조에서 <br>/<div>를 줄바꿈으로 취급해 세그먼트 추출
    const chordArea = line.querySelector('.chord-area');
    const segments = [];
    let current = '';

    const walk = (node) => {
      if (node === chordArea) return;
      if (node.nodeType === Node.TEXT_NODE) {
        current += node.textContent.replace(/[\r\n]/g, '');
      } else if (node.nodeName === 'BR') {
        segments.push(current); current = '';
      } else if (node.nodeName === 'DIV' && !node.classList.contains('chord-area') && !node.classList.contains('chord-slot')) {
        if (current || segments.length > 0) { segments.push(current); current = ''; }
        for (const c of node.childNodes) walk(c);
      } else {
        for (const c of node.childNodes) walk(c);
      }
    };

    for (const c of line.childNodes) walk(c);
    segments.push(current);

    if (segments.length <= 1) return;

    setLineText(line, segments[0]);
    let lastLine = line;
    const p = getProject(project.id);
    for (let i = 1; i < segments.length; i++) {
      const newLineId = genId();
      const newLineData = { id: newLineId, text: segments[i], slots: new Array(8).fill(null) };
      const newDiv = document.createElement('div');
      newDiv.className = 'project-line';
      newDiv.dataset.lineId = newLineId;
      newDiv.appendChild(buildChordArea(newLineData, p || project));
      newDiv.appendChild(document.createTextNode(segments[i]));
      lastLine.insertAdjacentElement('afterend', newDiv);
      lastLine = newDiv;
    }

    const sel = window.getSelection();
    const endRange = document.createRange();
    endRange.selectNodeContents(lastLine);
    endRange.collapse(false);
    if (sel) { sel.removeAllRanges(); sel.addRange(endRange); }
    saveAllLines(project.id, linesEl);
  });

  return linesEl;
}

function saveAllLines(projectId, linesEl) {
  const p = getProject(projectId);
  if (!p) return;
  const lineDivs = linesEl.querySelectorAll('.project-line');
  p.arrangement = Array.from(lineDivs).map(div => {
    if (!div.dataset.lineId) div.dataset.lineId = genId();
    const existing = p.arrangement.find(l => l.id === div.dataset.lineId);
    return {
      id: div.dataset.lineId,
      text: getLineText(div),
      slots: existing?.slots || new Array(8).fill(null)
    };
  });
  p.updatedAt = Date.now();
  updateProject(p);
}

function insertNewLineAtCursor(linesEl, projectId) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  let currentLine = range.startContainer;
  while (currentLine && currentLine !== linesEl) {
    if (currentLine.classList?.contains('project-line')) break;
    currentLine = currentLine.parentElement;
  }
  if (!currentLine || currentLine === linesEl) return;
  const cursorOff = getCursorOffsetInLine(currentLine, range);
  const fullText = getLineText(currentLine);
  const before = fullText.substring(0, cursorOff);
  const after = fullText.substring(cursorOff);
  setLineText(currentLine, before);
  const newLineId = genId();
  const p = getProject(projectId);
  const newLine = { id: newLineId, text: after, slots: new Array(8).fill(null) };
  const newDiv = document.createElement('div');
  newDiv.className = 'project-line';
  newDiv.dataset.lineId = newLineId;
  newDiv.appendChild(buildChordArea(newLine, p || { id: projectId, chords: [] }));
  if (after) {
    newDiv.appendChild(document.createTextNode(after));
  } else {
    newDiv.appendChild(document.createElement('br'));
  }
  currentLine.insertAdjacentElement('afterend', newDiv);
  const newRange = document.createRange();
  if (after) {
    newRange.setStart(newDiv.lastChild, 0);
  } else {
    newRange.setStartBefore(newDiv.lastChild);
  }
  newRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(newRange);
  saveAllLines(projectId, linesEl);
}

function handleBackspace(linesEl, projectId) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return;
  const range = sel.getRangeAt(0);

  // 현재 커서가 속한 project-line 찾기
  let currentLine = range.startContainer;
  while (currentLine && currentLine !== linesEl) {
    if (currentLine.classList?.contains('project-line')) break;
    currentLine = currentLine.parentElement;
  }
  if (!currentLine || currentLine === linesEl) return;

  const lines = Array.from(linesEl.querySelectorAll('.project-line'));
  const lineText = getLineText(currentLine);
  const cursorOffset = getCursorOffsetInLine(currentLine, range);

  if (lines.length === 1 && !lineText) {
    // 마지막 줄이고 빈 줄 → 삭제 차단
    return;
  }

  if (cursorOffset === 0 && !lineText) {
    // 빈 줄에서 줄 시작: 이 줄 삭제하고 이전 줄 끝으로 커서 이동
    const prevLine = currentLine.previousElementSibling;
    currentLine.remove();
    if (prevLine) {
      const textNode = Array.from(prevLine.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      const newRange = document.createRange();
      if (textNode && textNode.textContent.length > 0) {
        newRange.setStart(textNode, textNode.textContent.length);
      } else {
        // 빈 이전 줄: <br> 앞에 커서
        const br = prevLine.querySelector('br');
        if (br) newRange.setStartBefore(br);
        else newRange.selectNodeContents(prevLine);
        newRange.collapse(false);
      }
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    }
    saveAllLines(projectId, linesEl);

  } else if (cursorOffset === 0 && lineText) {
    // 텍스트 있는 줄의 맨 앞: 이전 줄에 텍스트 병합하고 현재 줄 삭제
    const prevLine = currentLine.previousElementSibling;
    if (!prevLine) return; // 첫 줄이면 아무것도 안 함
    const prevText = getLineText(prevLine);
    setLineText(prevLine, prevText + lineText);
    // 이전 줄 끝(병합 경계)에 커서
    const textNode = Array.from(prevLine.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
    const newRange = document.createRange();
    newRange.setStart(textNode, prevText.length);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    currentLine.remove();
    saveAllLines(projectId, linesEl);

  } else {
    // 줄 중간: 커서 앞 글자 하나 삭제
    const textNode = Array.from(currentLine.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
    if (!textNode || cursorOffset === 0) return;
    const text = textNode.textContent;
    textNode.textContent = text.slice(0, cursorOffset - 1) + text.slice(cursorOffset);
    const newRange = document.createRange();
    newRange.setStart(textNode, cursorOffset - 1);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }
}

function buildThumbList(project, editMode = true) {
  const thumbList = document.createElement('div');
  thumbList.className = 'chord-thumb-list';
  thumbList.id = 'thumb-list-' + project.id;

  project.chords.forEach((chord, idx) => {
    const thumb = createThumbEl(chord, idx, project.id, editMode);
    thumbList.appendChild(thumb);
  });

  if (editMode) {
    // 추가 버튼
    const addBtn = document.createElement('div');
    addBtn.className = 'chord-thumb-add';
    addBtn.title = '코드 추가';
    addBtn.innerHTML = '+';
    addBtn.onclick = () => {
      contextProjectId = project.id;
      navigateTo('editor', project.id);
    };
    thumbList.appendChild(addBtn);
  }

  // 데스크톱: 마우스 휠로 좌우 스크롤
  thumbList.addEventListener('wheel', e => {
    if (e.deltaY !== 0) {
      e.preventDefault();
      thumbList.scrollLeft += e.deltaY;
    }
  }, { passive: false });

  return thumbList;
}

function createThumbEl(chord, idx, projectId, editMode = true) {
  const thumb = document.createElement('div');
  thumb.className = 'chord-thumb';
  thumb.dataset.chordId = chord.id;
  thumb.dataset.idx = idx;

  const cv = document.createElement('canvas');
  cv.width = 160; cv.height = 120;
  drawCanvas(cv.getContext('2d'), 160 / BASE_W, chord);
  const thumbImg = document.createElement('img');
  thumbImg.src = cv.toDataURL('image/png');

  thumb.appendChild(thumbImg);

  if (editMode) {
    const delBtn = document.createElement('button');
    delBtn.className = 'chord-thumb-delete';
    delBtn.textContent = '✕';
    delBtn.onclick = e => { e.stopPropagation(); deleteChordFromProject(projectId, chord.id); };
    thumb.appendChild(delBtn);

    // HTML5 드래그: 슬롯으로 이동 + 썸네일 순서 변경
    thumb.draggable = true;
    thumb.addEventListener('dragstart', e => {
      e.dataTransfer.setData('chord-thumb-id', chord.id);
      e.dataTransfer.setData('chord-thumb-project', projectId);
      thumb.classList.add('dragging');
    });
    thumb.addEventListener('dragend', () => thumb.classList.remove('dragging'));
    thumb.addEventListener('dragover', e => {
      e.preventDefault();
      thumb.classList.add('reorder-over');
    });
    thumb.addEventListener('dragleave', () => thumb.classList.remove('reorder-over'));
    thumb.addEventListener('drop', e => {
      e.preventDefault();
      thumb.classList.remove('reorder-over');
      const sourceId = e.dataTransfer.getData('chord-thumb-id');
      const fromProject = e.dataTransfer.getData('chord-thumb-project');
      if (sourceId && sourceId !== chord.id && fromProject === projectId) {
        reorderChords(projectId, sourceId, chord.id);
      }
    });

    // ── 모바일 (터치) ──
    setupThumbTouchDrag(thumb, chord, projectId);
  }

  // ── 데스크톱 클릭: 모달 ──
  let mouseDragged = false;
  thumb.addEventListener('mousedown', () => { mouseDragged = false; });
  thumb.addEventListener('mousemove', () => { mouseDragged = true; });
  thumb.addEventListener('click', e => {
    if (mouseDragged) return;
    openViewModal(chord, projectId);
  });

  return thumb;
}

function setupThumbTouchDrag(thumb, chord, projectId) {
  const MOVE_THRESHOLD = 8;

  thumb.addEventListener('contextmenu', e => e.preventDefault());

  let ghost = null;
  let startX = 0, startY = 0;
  let mode = null; // null | 'drag'

  function cleanup() {
    if (ghost) { ghost.remove(); ghost = null; }
    thumb.classList.remove('dragging');
    document.querySelectorAll('.chord-slot').forEach(s => s.classList.remove('drag-over'));
    mode = null;
  }

  function startGhost(cx, cy) {
    const ghostCv = document.createElement('canvas');
    ghostCv.width = 160; ghostCv.height = 120;
    drawCanvas(ghostCv.getContext('2d'), 160 / BASE_W, chord);
    ghost = document.createElement('img');
    ghost.src = ghostCv.toDataURL('image/png');
    ghost.className = 'drag-ghost';
    ghost.style.width = '80px'; ghost.style.height = '60px';
    ghost.style.left = (cx - 40) + 'px';
    ghost.style.top  = (cy - 30) + 'px';
    document.body.appendChild(ghost);
    thumb.classList.add('dragging');
  }

  thumb.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    mode = null;
  }, { passive: true });

  thumb.addEventListener('touchmove', e => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;

    if (mode === null && Math.sqrt(dx * dx + dy * dy) > MOVE_THRESHOLD) {
      mode = 'drag';
      startGhost(t.clientX, t.clientY);
    }

    if (mode === 'drag') {
      e.preventDefault();
      ghost.style.left = (t.clientX - 40) + 'px';
      ghost.style.top  = (t.clientY - 30) + 'px';
      document.querySelectorAll('.chord-slot').forEach(s => s.classList.remove('drag-over'));
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const slot = el ? el.closest('.chord-slot') : null;
      if (slot) slot.classList.add('drag-over');
    }
  }, { passive: false });

  thumb.addEventListener('touchend', e => {
    const prevMode = mode;
    const t = e.changedTouches[0];

    if (prevMode === 'drag') {
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const slot = el ? el.closest('.chord-slot') : null;
      if (slot && slot.dataset.lineId) {
        placeChordInSlot(projectId, slot.dataset.lineId, parseInt(slot.dataset.slotIdx), chord.id);
      }
      cleanup();
      e.preventDefault();
    } else {
      // 삭제 버튼 탭이면 모달 열지 않음 (onclick이 별도로 처리)
      if (e.target.closest('.chord-thumb-delete')) { cleanup(); return; }
      cleanup();
      openViewModal(chord, projectId);
    }
  });

  thumb.addEventListener('click', e => {
    if (mode === 'drag') e.stopPropagation();
  });

  thumb.addEventListener('touchcancel', cleanup);
}

function placeChordInSlot(projectId, rowId, slotIdx, chordId) {
  const p = getProject(projectId);
  if (!p) return;
  const row = p.arrangement.find(r => r.id === rowId);
  if (!row) return;
  if (!row.slots) row.slots = new Array(8).fill(null);
  row.slots[slotIdx] = chordId;
  p.updatedAt = Date.now();
  updateProject(p);
  reRenderChordArea(rowId, row, p);
}

function reRenderChordArea(lineId, line, project) {
  const lineDiv = document.querySelector(`.project-line[data-line-id="${lineId}"]`);
  if (!lineDiv) return;
  const oldArea = lineDiv.querySelector('.chord-area');
  if (!oldArea) return;
  oldArea.replaceWith(buildChordArea(line, project));
}

function swapChordSlots(projectId, srcLineId, srcIdx, tgtLineId, tgtIdx) {
  const p = getProject(projectId);
  if (!p) return;
  const srcLine = p.arrangement.find(l => l.id === srcLineId);
  const tgtLine = p.arrangement.find(l => l.id === tgtLineId);
  if (!srcLine || !tgtLine) return;
  if (!srcLine.slots) srcLine.slots = new Array(8).fill(null);
  if (!tgtLine.slots) tgtLine.slots = new Array(8).fill(null);
  if (srcLineId === tgtLineId && srcIdx === tgtIdx) return;
  const tmp = srcLine.slots[srcIdx];
  srcLine.slots[srcIdx] = tgtLine.slots[tgtIdx];
  tgtLine.slots[tgtIdx] = tmp;
  p.updatedAt = Date.now();
  updateProject(p);
  reRenderChordArea(srcLineId, srcLine, p);
  if (srcLineId !== tgtLineId) reRenderChordArea(tgtLineId, tgtLine, p);
}

function reorderChords(projectId, sourceId, targetId) {
  const p = getProject(projectId);
  if (!p) return;
  const srcIdx = p.chords.findIndex(c => c.id === sourceId);
  if (srcIdx === -1) return;
  const [chord] = p.chords.splice(srcIdx, 1);
  const tgtIdx = p.chords.findIndex(c => c.id === targetId);
  p.chords.splice(tgtIdx, 0, chord);
  p.updatedAt = Date.now();
  updateProject(p);
  reRenderThumbList(projectId);
}

function reRenderThumbList(projectId) {
  const p = getProject(projectId);
  if (!p) return;
  const old = document.getElementById('thumb-list-' + projectId);
  if (!old) return;
  old.replaceWith(buildThumbList(p, isEditMode));
  lucide.createIcons();
}

function deleteChordFromProject(projectId, chordId) {
  if (!confirm('이 코드를 삭제하시겠습니까?')) return;
  const p = getProject(projectId);
  if (!p) return;
  p.chords = p.chords.filter(c => c.id !== chordId);
  // 배열에서도 제거
  p.arrangement.forEach(row => {
    row.slots = row.slots.map(s => s === chordId ? null : s);
  });
  p.updatedAt = Date.now();
  updateProject(p);
  renderProjectView(projectId);
}

function deleteProject(projectId) {
  if (!confirm('프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
  let projects = loadProjects();
  projects = projects.filter(p => p.id !== projectId);
  saveProjects(projects);
  renderSidebar();
  populateProjectSelect();
  navigateTo('editor');
}

// ═══════════════════════════════════════════════════════════════
// Orientation 감지
// ═══════════════════════════════════════════════════════════════
function isMobileOrTablet() {
  return window.innerWidth <= 1400;
}

function setupOrientationListener() {
  const mq = window.matchMedia('(orientation: portrait)');
  const handler = () => {
    if (!isMobileOrTablet()) return;
    if (currentProjectId && !document.getElementById('view-project').classList.contains('hidden')) {
      renderProjectView(currentProjectId);
    }
  };
  try { mq.addEventListener('change', handler); } catch(e) { mq.addListener(handler); }
}

// ═══════════════════════════════════════════════════════════════
// 모달: 뷰
// ═══════════════════════════════════════════════════════════════
let viewModalChord    = null;
let viewModalProjectId = null;

function openViewModal(chord, projectId) {
  viewModalChord = chord;
  viewModalProjectId = projectId;

  document.getElementById('modal-view-title').textContent = buildChordName(chord);

  const cv = document.getElementById('modal-view-canvas');
  cv.width  = 480; cv.height = 360;
  drawCanvas(cv.getContext('2d'), 480 / BASE_W, chord);

  // 재생
  document.getElementById('modal-view-play').onclick = () => playChord(chord);

  document.getElementById('modal-view').classList.remove('hidden');
  lucide.createIcons();
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════════
// 모달: 편집
// ═══════════════════════════════════════════════════════════════
let me_root = 'A', me_triad = '', me_seventh = '', me_func = '';
let me_tensions = [], me_bass = '';
let me_dots = [], me_barre = {}, me_openMute = new Array(STRINGS).fill('open');
let me_fingerNumMode = false, me_selectedFinger = 1, me_accidental = 'sharp';
let me_fretNumber = 2;
let me_editingChord = null;

function switchToEditModal() {
  if (!viewModalChord) return;
  closeModal('modal-view');
  openEditModal(viewModalChord, viewModalProjectId);
}

function openEditModal(chord, projectId) {
  me_editingChord = chord;
  viewModalProjectId = projectId;

  // 상태 복원
  me_root        = chord.root;
  me_triad       = chord.triad;
  me_seventh     = chord.seventh;
  me_func        = chord.func;
  me_tensions    = [...chord.tensions];
  me_bass        = chord.bass;
  me_dots        = JSON.parse(JSON.stringify(chord.dots));
  me_barre       = JSON.parse(JSON.stringify(chord.barre));
  me_openMute    = [...chord.openMute];
  me_fingerNumMode = chord.fingerNumMode;
  me_fretNumber  = chord.fretNumber || 2;
  me_accidental  = chord.accidental || 'sharp';
  me_selectedFinger = 1;

  buildEditModalUI();
  document.getElementById('modal-edit').classList.remove('hidden');
  lucide.createIcons();

  document.getElementById('modal-edit-play').onclick = () =>
    playChord({ dots: me_dots, openMute: me_openMute, fretNumber: me_fretNumber });

  // 캔버스 렌더
  setTimeout(() => meResizeCanvas(), 50);
}

function buildEditModalUI() {
  const content = document.getElementById('modal-edit-content');
  content.innerHTML = '';

  const editor = document.createElement('div');
  editor.className = 'me-editor';

  // 코드명 빌더
  const builder = document.createElement('div');
  builder.className = 'chord-builder';

  // 행 1: accidental + root
  builder.appendChild(createMeRow([
    createMeAccToggle(),
    createDividerEl(),
    createMeGroup('me-root-group')
  ]));

  // 행 2: triad
  builder.appendChild(createMeRow([
    createLabelEl('3화음'),
    createMeGroup('me-triad-group')
  ]));

  // 행 3: seventh
  builder.appendChild(createMeRow([
    createLabelEl('7음'),
    createMeGroup('me-seventh-group')
  ]));

  // 행 4: func
  builder.appendChild(createMeRow([
    createLabelEl('기능'),
    createMeGroup('me-func-group')
  ]));

  // 행 5: tension
  builder.appendChild(createMeRow([
    createLabelEl('텐션'),
    createMeGroup('me-tension-group')
  ]));

  // 행 6: bass
  builder.appendChild(createMeRow([
    createLabelEl('분수'),
    createMeGroup('me-bass-group')
  ]));

  // 미리보기
  const preview = document.createElement('div');
  preview.className = 'chord-preview';
  const prevLabel = document.createElement('span');
  prevLabel.className = 'preview-label';
  prevLabel.textContent = '코드명';
  const chordDisp = document.createElement('span');
  chordDisp.id = 'me-chord-display';
  chordDisp.className = 'chord-display';
  preview.appendChild(prevLabel);
  preview.appendChild(chordDisp);
  builder.appendChild(preview);

  // 툴바
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar';

  const toolGroup = document.createElement('div');
  toolGroup.className = 'tool-group';

  const fingerModeBtn = document.createElement('button');
  fingerModeBtn.className = 'mode-btn active';
  fingerModeBtn.id = 'me-mode-finger';
  fingerModeBtn.textContent = '손가락';

  const rootModeBtn = document.createElement('button');
  rootModeBtn.className = 'mode-btn';
  rootModeBtn.id = 'me-btn-root';
  rootModeBtn.textContent = '근음';
  rootModeBtn.onclick = meToggleRootMode;

  toolGroup.appendChild(fingerModeBtn);
  toolGroup.appendChild(rootModeBtn);

  const divEl = createDividerEl();

  const fretLabel = document.createElement('span');
  fretLabel.className = 'label';
  fretLabel.textContent = '프렛';

  const fretInput = document.createElement('input');
  fretInput.id = 'me-fret-number';
  fretInput.type = 'number';
  fretInput.min = 2; fretInput.max = 18;
  fretInput.value = me_fretNumber;
  fretInput.style.cssText = 'width:52px;font-family:"DM Mono",monospace;font-size:13px;padding:4px 8px;border:1px solid var(--border);border-radius:var(--radius);background:transparent;color:var(--text-primary);outline:none;';
  fretInput.onchange = (e) => {
    const v = parseInt(e.target.value);
    if (!isNaN(v) && v >= 2 && v <= 18) { me_fretNumber = v; meDraw(); }
    else e.target.value = me_fretNumber;
  };

  const divEl2 = createDividerEl();

  const fingerNumBtn = document.createElement('button');
  fingerNumBtn.className = 'mode-btn';
  fingerNumBtn.id = 'me-btn-finger-num';
  fingerNumBtn.textContent = '번호';
  fingerNumBtn.onclick = meToggleFingerNum;

  const fingerGroup = document.createElement('div');
  fingerGroup.className = 'finger-group';
  fingerGroup.id = 'me-finger-group';
  fingerGroup.style.opacity = '0.35';

  [1,2,3,4,0].forEach(n => {
    const fb = document.createElement('button');
    fb.className = 'finger-btn' + (n === 1 ? ' selected' : '');
    fb.id = 'me-f' + n;
    fb.textContent = n === 0 ? 'T' : String(n);
    fb.onclick = () => meSelectFinger(n);
    fingerGroup.appendChild(fb);
  });

  toolbar.appendChild(toolGroup);
  toolbar.appendChild(divEl);
  toolbar.appendChild(fretLabel);
  toolbar.appendChild(fretInput);
  toolbar.appendChild(divEl2);
  toolbar.appendChild(fingerNumBtn);
  toolbar.appendChild(fingerGroup);

  // 캔버스
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'me-canvas-wrap';

  const canvasInner = document.createElement('div');
  canvasInner.className = 'me-canvas-inner';
  canvasInner.id = 'me-canvas-inner';

  const meCanvas = document.createElement('canvas');
  meCanvas.id = 'me-canvas';
  canvasInner.appendChild(meCanvas);

  const meBarreBtns = document.createElement('div');
  meBarreBtns.id = 'me-barre-btns';
  canvasInner.appendChild(meBarreBtns);

  canvasWrap.appendChild(canvasInner);

  // 초기화 버튼
  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-ghost';
  resetBtn.textContent = '초기화';
  resetBtn.onclick = meResetAll;

  editor.appendChild(builder);
  editor.appendChild(toolbar);
  editor.appendChild(canvasWrap);
  editor.appendChild(resetBtn);

  content.appendChild(editor);

  // 버튼 그룹 렌더
  meRenderAllBtns();
  meUpdateChordDisplay();
  meDraw();

  // 캔버스 클릭
  meCanvas.addEventListener('click', meCanvasClick);
}

function createMeRow(children) {
  const row = document.createElement('div');
  row.className = 'builder-row';
  children.forEach(c => row.appendChild(c));
  return row;
}

function createMeGroup(id) {
  const div = document.createElement('div');
  div.className = 'builder-group';
  div.id = id;
  return div;
}

function createLabelEl(text) {
  const span = document.createElement('span');
  span.className = 'builder-label';
  span.textContent = text;
  return span;
}

function createDividerEl() {
  const d = document.createElement('div');
  d.className = 'divider';
  return d;
}

function createMeAccToggle() {
  const wrap = document.createElement('div');
  wrap.className = 'accidental-toggle';

  const sharp = document.createElement('button');
  sharp.className = 'acc-btn' + (me_accidental === 'sharp' ? ' active' : '');
  sharp.id = 'me-acc-sharp';
  sharp.textContent = '#';
  sharp.onclick = () => meSetAccidental('sharp');

  const flat = document.createElement('button');
  flat.className = 'acc-btn' + (me_accidental === 'flat' ? ' active' : '');
  flat.id = 'me-acc-flat';
  flat.textContent = 'b';
  flat.onclick = () => meSetAccidental('flat');

  wrap.appendChild(sharp);
  wrap.appendChild(flat);
  return wrap;
}

// ── me_* 상태 관리 함수 ──
function meSetAccidental(mode) {
  me_accidental = mode;
  const sharp = document.getElementById('me-acc-sharp');
  const flat  = document.getElementById('me-acc-flat');
  if (sharp) sharp.classList.toggle('active', mode === 'sharp');
  if (flat)  flat.classList.toggle('active', mode === 'flat');
  meRenderRootBtns();
  meRenderBassBtns();
  meUpdateChordDisplay();
}

function meRenderAllBtns() {
  meRenderRootBtns();
  meRenderTriadBtns();
  meRenderSeventhBtns();
  meRenderFuncBtns();
  meRenderTensionBtns();
  meRenderBassBtns();
}

function meRenderRootBtns() {
  const roots = me_accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  if (!roots.includes(me_root)) me_root = roots[0];
  const group = document.getElementById('me-root-group');
  if (!group) return;
  group.innerHTML = '';
  roots.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (r === me_root ? ' active' : '');
    btn.textContent = r;
    btn.onclick = () => { me_root = r; meRenderRootBtns(); meUpdateChordDisplay(); };
    group.appendChild(btn);
  });
}

function meRenderTriadBtns() {
  const group = document.getElementById('me-triad-group');
  if (!group) return;
  group.innerHTML = '';
  [['','M'], ['m','m'], ['aug','aug'], ['dim','dim']].forEach(([val, label]) => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (me_triad === val ? ' active' : '');
    btn.textContent = label;
    btn.onclick = () => { me_triad = val; meRenderTriadBtns(); meUpdateChordDisplay(); };
    group.appendChild(btn);
  });
}

function meRenderSeventhBtns() {
  const group = document.getElementById('me-seventh-group');
  if (!group) return;
  group.innerHTML = '';
  [['','없음'], ['M7','M7'], ['7','7'], ['6','6']].forEach(([val, label]) => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (me_seventh === val ? ' active' : '');
    btn.textContent = label;
    btn.onclick = () => { me_seventh = val; meRenderSeventhBtns(); meUpdateChordDisplay(); };
    group.appendChild(btn);
  });
}

function meRenderFuncBtns() {
  const group = document.getElementById('me-func-group');
  if (!group) return;
  group.innerHTML = '';
  [['','없음'], ['sus4','sus4'], ['add9','add9'], ['b5','(b5)']].forEach(([val, label]) => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (me_func === val ? ' active' : '');
    btn.textContent = label;
    btn.onclick = () => { me_func = val; meRenderFuncBtns(); meUpdateChordDisplay(); };
    group.appendChild(btn);
  });
}

function meRenderTensionBtns() {
  const group = document.getElementById('me-tension-group');
  if (!group) return;
  group.innerHTML = '';
  ['b9','9','#9','11','#11','b13','13'].forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn toggle' + (me_tensions.includes(t) ? ' active' : '');
    btn.textContent = t;
    btn.onclick = () => {
      const idx = me_tensions.indexOf(t);
      idx !== -1 ? me_tensions.splice(idx, 1) : me_tensions.push(t);
      meRenderTensionBtns();
      meUpdateChordDisplay();
    };
    group.appendChild(btn);
  });
}

function meRenderBassBtns() {
  const roots = me_accidental === 'sharp' ? ROOTS_SHARP : ROOTS_FLAT;
  const group = document.getElementById('me-bass-group');
  if (!group) return;
  group.innerHTML = '';

  const noneBtn = document.createElement('button');
  noneBtn.className = 'sel-btn' + (me_bass === '' ? ' active' : '');
  noneBtn.textContent = '없음';
  noneBtn.onclick = () => { me_bass = ''; meRenderBassBtns(); meUpdateChordDisplay(); };
  group.appendChild(noneBtn);

  roots.forEach(r => {
    const btn = document.createElement('button');
    btn.className = 'sel-btn' + (me_bass === r ? ' active' : '');
    btn.textContent = r;
    btn.onclick = () => { me_bass = r; meRenderBassBtns(); meUpdateChordDisplay(); };
    group.appendChild(btn);
  });
}

function meUpdateChordDisplay() {
  const el = document.getElementById('me-chord-display');
  if (!el) return;
  let n = me_root + me_triad + me_seventh;
  if (me_func === 'b5') n += '<sup>(b5)</sup>';
  else if (me_func) n += me_func;
  if (me_tensions.length) n += '<sup>(' + me_tensions.join(',') + ')</sup>';
  if (me_bass) n += '/' + me_bass;
  el.innerHTML = n;
  meDraw();
}

let me_rootMode  = false;
let me_rootIndex = -1;

function meToggleRootMode() {
  me_rootMode = !me_rootMode;
  const btn = document.getElementById('me-btn-root');
  if (btn) btn.classList.toggle('active', me_rootMode);
  me_rootIndex = me_rootMode ? meCalcRootIndex() : -1;
  meDraw();
}

function meCalcRootIndex() {
  const dotMaxS  = me_dots.length ? Math.max(...me_dots.map(d => d.s)) : -1;
  const openMaxS = me_openMute.reduce((max, v, i) => v === 'open' ? Math.max(max, i) : max, -1);
  return Math.max(dotMaxS, openMaxS);
}

function meToggleFingerNum() {
  me_fingerNumMode = !me_fingerNumMode;
  const btn = document.getElementById('me-btn-finger-num');
  const grp = document.getElementById('me-finger-group');
  if (btn) btn.classList.toggle('active', me_fingerNumMode);
  if (grp) grp.style.opacity = me_fingerNumMode ? '1' : '0.35';
  meDraw();
}

function meSelectFinger(n) {
  me_selectedFinger = n;
  document.querySelectorAll('#me-finger-group .finger-btn').forEach(b => b.classList.remove('selected'));
  const fb = document.getElementById('me-f' + n);
  if (fb) fb.classList.add('selected');
}

function meResetAll() {
  me_dots = []; me_barre = {}; me_openMute = new Array(STRINGS).fill('open');
  meDraw();
}

function meGetBarreFrets() {
  const count = {};
  me_dots.forEach(d => { count[d.f] = (count[d.f] || 0) + 1; });
  return Object.keys(count).filter(f => count[f] >= 2).map(Number);
}

let me_RATIO = 1;

function meResizeCanvas() {
  const inner = document.getElementById('me-canvas-inner');
  const cv = document.getElementById('me-canvas');
  if (!inner || !cv) return;
  const availW = inner.clientWidth || BASE_W;
  me_RATIO = availW / BASE_W;
  cv.width  = Math.round(BASE_W * me_RATIO);
  cv.height = Math.round(BASE_H * me_RATIO);
  meDraw();
}

function meDraw() {
  const cv = document.getElementById('me-canvas');
  if (!cv) return;
  const c = cv.getContext('2d');
  const data = {
    root: me_root, triad: me_triad, seventh: me_seventh, func: me_func,
    tensions: me_tensions, bass: me_bass, dots: me_dots, barre: me_barre,
    openMute: me_openMute, fingerNumMode: me_fingerNumMode,
    fretNumber: me_fretNumber
  };
  drawCanvas(c, me_RATIO, data);
  meUpdateBarreBtns();
}

function meUpdateBarreBtns() {
  const container = document.getElementById('me-barre-btns');
  if (!container) return;
  container.innerHTML = '';

  const meTL = Math.round(BASE_MX * me_RATIO);
  const meTT = Math.round((BASE_Y_OFF + BASE_MY) * me_RATIO);
  const meTB = Math.round((BASE_Y_OFF + BASE_TABLE_H - BASE_MY) * me_RATIO);
  const meTR = Math.round((BASE_W - BASE_MX) * me_RATIO);
  const meFW = (meTR - meTL) / FRETS;
  const meSH = (meTB - meTT) / (STRINGS - 1);
  const meDS = Math.round(meSH * 0.85);

  meGetBarreFrets().forEach(f => {
    if (me_barre[f] === undefined) {
      const activeCount = Object.values(me_barre).filter(Boolean).length;
      me_barre[f] = activeCount < 2;
      if (me_barre[f]) meRemoveDotsUnderBarre(f);
    }
    const btn = document.createElement('button');
    btn.textContent = 'B';
    const left = meTL + (f - 0.5) * meFW - 12;
    const top  = meTT - meDS - 16;
    btn.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:24px;height:24px;
      border-radius:50%;border:1.5px solid #888;
      background:${me_barre[f] ? '#1a1714' : '#fff'};
      color:${me_barre[f] ? '#fff' : '#888'};
      font-size:11px;font-family:'Pretendard',sans-serif;
      cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;`;
    btn.onclick = () => {
      if (!me_barre[f]) {
        const activeCount = Object.values(me_barre).filter(Boolean).length;
        if (activeCount >= 2) return;
        me_barre[f] = true;
        meRemoveDotsUnderBarre(f);
      } else {
        me_barre[f] = false;
      }
      meDraw();
    };
    container.appendChild(btn);
  });
}

function meCanvasClick(e) {
  const cv = document.getElementById('me-canvas');
  if (!cv) return;
  const meW  = Math.round(BASE_W * me_RATIO);
  const meCH = Math.round(BASE_H * me_RATIO);
  const meTL = Math.round(BASE_MX * me_RATIO);
  const meTT = Math.round((BASE_Y_OFF + BASE_MY) * me_RATIO);
  const meTB = Math.round((BASE_Y_OFF + BASE_TABLE_H - BASE_MY) * me_RATIO);
  const meTR = Math.round((BASE_W - BASE_MX) * me_RATIO);
  const meFW = (meTR - meTL) / FRETS;
  const meSH = (meTB - meTT) / (STRINGS - 1);

  const rect = cv.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (meW / rect.width);
  const my = (e.clientY - rect.top)  * (meCH / rect.height);
  const si = Math.round((my - meTT) / meSH);
  if (si < 0 || si > STRINGS - 1) return;

  if (mx >= meTL - 50 && mx < meTL) {
    const hasDot = me_dots.some(d => d.s === si);
    if (hasDot) {
      me_dots = me_dots.filter(d => d.s !== si);
      me_openMute[si] = 'open';
    } else {
      me_openMute[si] = me_openMute[si] === 'mute' ? 'open' : 'mute';
    }
    if (me_rootMode) me_rootIndex = meCalcRootIndex();
    meDraw(); return;
  }

  if (mx < meTL || mx > meTR + 5) return;
  const fi = Math.floor((mx - meTL) / meFW) + 1;
  if (fi < 1 || fi > FRETS) return;

  // 바레로 커버된 줄은 해당 바레 프렛보다 낮은 곳에 dot 불가
  const meBarreMapCheck = buildBarreMap(me_dots, me_barre);
  if (meBarreMapCheck[si] !== undefined && fi < meBarreMapCheck[si]) return;

  const idx = me_dots.findIndex(d => d.s === si && d.f === fi);
  if (idx !== -1) {
    me_dots.splice(idx, 1);
    me_openMute[si] = 'open';
  } else {
    me_dots = me_dots.filter(d => d.s !== si);
    me_openMute[si] = 'open';
    me_dots.push({ s: si, f: fi, n: me_selectedFinger });
  }
  if (me_rootMode) me_rootIndex = meCalcRootIndex();
  meDraw();
}

function saveEditModal() {
  if (!me_editingChord || !viewModalProjectId) return;
  const p = getProject(viewModalProjectId);
  if (!p) return;

  const idx = p.chords.findIndex(c => c.id === me_editingChord.id);
  if (idx === -1) return;

  const updated = {
    ...me_editingChord,
    name: buildChordName({ root: me_root, triad: me_triad, seventh: me_seventh, func: me_func, tensions: me_tensions, bass: me_bass }),
    root: me_root, triad: me_triad, seventh: me_seventh, func: me_func,
    tensions: [...me_tensions], bass: me_bass,
    dots: JSON.parse(JSON.stringify(me_dots)),
    barre: JSON.parse(JSON.stringify(me_barre)),
    openMute: [...me_openMute],
    fingerNumMode: me_fingerNumMode,
    fretNumber: me_fretNumber,
    accidental: me_accidental
  };

  p.chords[idx] = updated;
  p.updatedAt = Date.now();
  updateProject(p);

  closeModal('modal-edit');
  renderProjectView(viewModalProjectId);
}

// ═══════════════════════════════════════════════════════════════
// 초기 렌더링
// ═══════════════════════════════════════════════════════════════
(function init() {
  renderSidebar();
  populateProjectSelect();
  lucide.createIcons();
})();
