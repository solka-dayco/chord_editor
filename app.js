// ═══════════════════════════════════════════════════════════════
// 캔버스 설정
// ═══════════════════════════════════════════════════════════════
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');

const BASE_W     = 400;
const BASE_H     = 300;
const MAIN_DISPLAY_SCALE = 0.8; // 메인 에디터 캔버스 표시 크기 배율
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
  let availW;
  if (isMobileOrTablet()) {
    // 모바일/태블릿: 가용 너비에 맞게 반응형
    // canvas와 canvas-inner의 고정 너비를 모두 해제해야
    // clientWidth가 캔버스 자신의 크기가 아닌 실제 컨테이너 너비를 반환함
    canvas.style.width = '';
    canvas.parentElement.style.width = '';
    availW = canvas.parentElement.clientWidth || BASE_W;
  } else {
    // 데스크탑 웹브라우저: 캔버스 크기 고정 (BASE_W 기준)
    availW = BASE_W;
  }
  const displayW = Math.round(availW * MAIN_DISPLAY_SCALE);
  canvas.style.width  = displayW + 'px';
  canvas.style.height = 'auto';
  // canvas-inner를 캔버스 표시 크기에 맞춤 (바레 버튼 기준점, 중앙정렬용)
  canvas.parentElement.style.width = displayW + 'px';
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

// ── 코드명 추천 엔진 ──
class GuitarChordSuggester {
  static OPEN_PCS  = [4, 9, 2, 7, 11, 4];
  static OPEN_MIDI = [40, 45, 50, 55, 59, 64];
  static NAMES_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  static NAMES_FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  static NAMES_AUTO  = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

  constructor(opts = {}) {
    this.options = { maxResults:4, searchThreshold:38, spellingMode:'auto',
      preferDominantFlat7SlashShorthand:true, ...opts };
    this.voicingLibrary = new Map();
  }

  addVoicing(input, names) {
    const key = this._key(this._parse(input));
    this.voicingLibrary.set(key, Array.isArray(names) ? names : [names]);
  }

  suggest(input, opts = {}) {
    const maxR = opts.maxResults ?? this.options.maxResults;
    const anal = this._analyze(input);
    if (!anal.sounding.length) return ['검색 안됨'];

    const exact = this.voicingLibrary.get(anal.voicingKey);
    if (exact?.length) return [exact[0]];

    const candidates = [];
    for (let root = 0; root < 12; root++) {
      for (const quality of ['major','minor','aug','dim']) {
        for (const seventh of this._allowedSevenths(quality)) {
          for (const func of [null,'sus4','add9','b5']) {
            if (!this._validBase(quality, seventh, func)) continue;
            const base = this._eval(anal, root, quality, seventh, func, null, null);
            if (base) candidates.push(base);
            for (const tension of ['b9','9','#9','11','#11','b13','13']) {
              if (!this._canTension(quality, seventh, func, tension)) continue;
              const c = this._eval(anal, root, quality, seventh, func, tension, null);
              if (c) candidates.push(c);
            }
          }
        }
      }
    }

    const withSlash = [...candidates];
    for (const c of candidates) {
      const sv = this._slashVariant(c, anal);
      if (sv) withSlash.push(sv);
    }

    const best = new Map();
    for (const c of withSlash) {
      const prev = best.get(c.name);
      if (!prev || c.score > prev.score) best.set(c.name, c);
    }

    const sorted = [...best.values()].sort((a, b) =>
      b.score !== a.score ? b.score - a.score : a.isSlash !== b.isSlash ? (a.isSlash ? 1 : -1) : a.name.localeCompare(b.name)
    ).filter(c => c.score >= this.options.searchThreshold);

    return sorted.length ? sorted.slice(0, maxR).map(c => c.name) : ['검색 안됨'];
  }

  _parse(input) {
    const tokens = Array.isArray(input) ? input
      : typeof input === 'string' ? (/\s/.test(input.trim()) ? input.trim().split(/\s+/) : input.trim().split(''))
      : (() => { throw new TypeError('입력은 문자열 또는 배열이어야 합니다.'); })();
    if (tokens.length !== 6) throw new Error(`입력 길이는 6이어야 합니다. 받은: ${tokens.length}`);
    return tokens.map(t => {
      if (t === null || t === undefined) return null;
      if (typeof t === 'number') return t;
      const s = String(t).trim();
      if (/^[xX]$/.test(s)) return null;
      return parseInt(s, 10);
    });
  }

  _key(frets) { return frets.map(f => f === null ? 'x' : String(f)).join('|'); }

  _analyze(input) {
    const frets = this._parse(input);
    const raw = frets.map((fret, idx) =>
      fret === null ? null : {
        string: 6 - idx, fret,
        pc: (GuitarChordSuggester.OPEN_PCS[idx] + fret) % 12,
        midi: GuitarChordSuggester.OPEN_MIDI[idx] + fret,
      }
    );
    const sounding = raw.filter(Boolean);
    const pcsOrdered = [];
    for (const n of sounding) if (!pcsOrdered.includes(n.pc)) pcsOrdered.push(n.pc);
    return { frets, raw, sounding, pcsOrdered,
      lowestPc: sounding[0]?.pc ?? null, voicingKey: this._key(frets) };
  }

  _allowedSevenths(q) {
    if (q === 'aug') return [null, '7'];
    if (q === 'dim') return [null, '7', 'dim7'];
    return [null, 'M7', '7', '6'];
  }

  _validBase(q, s, f) {
    if (q === 'minor' && (f === 'add9' || f === 'sus4')) return false;
    if (f === 'sus4' && q !== 'major') return false;
    if (f === 'add9' && q !== 'major') return false;
    if (f === 'add9' && s !== null) return false;
    if (f === 'sus4' && f === 'b5') return false;
    if (q === 'dim' && f === 'b5') return false;
    if (s === 'M7' && f === 'b5') return false;
    if (s === '6' && f === 'b5') return false;
    if (s === 'M7' && f === 'sus4') return false;
    if (q === 'aug' && (s === 'M7' || s === '6' )) return false;
    if (q === 'aug' && f === 'b5') return false;
    if (q === 'dim' && s === '6') return false;
    if (s === '6' && f === 'sus4') return false; // 6코드는 완성된 장3화음 기반, sus4와 공존 불가
    return true;
  }

  _canTension(q, s, f, t) {
    if (!t) return true;
    if (!s || s === 'dim7' || s === '6') return false;
    if (f === 'add9' && ['b9','9','#9'].includes(t)) return false;
    if (s === '6' && t === 'b13') return false;
    if (q === 'major' && s === '7' && f === 'add9') return false;
    if (f === 'sus4' && t) return false;
    if (f === 'b5' && t) return false;
    if (q === 'dim' && s === '7') return false;
    return this._allowedTensions(q, s, f).includes(t);
  }

  _allowedTensions(q, s, f) {
    if (q === 'major' && s === '7') return ['b9','9','#9','11','#11','b13','13'];
    if (q === 'major' && s === 'M7') return ['9','#11','13'];
    if (q === 'minor' && s === '7') return ['9','11'];
    if (q === 'dim'   && s === '7') return ['11','b13'];
    return [];
  }

  _itvMap() { return { b9:1, '9':2, '#9':3, '11':5, '#11':6, b13:8, '13':9 }; }

  _observed(pcsOrdered, root) {
    const seen = new Set(), out = [];
    for (const pc of pcsOrdered) {
      const iv = (pc - root + 12) % 12;
      if (!seen.has(iv)) { seen.add(iv); out.push(iv); }
    }
    return out.sort((a, b) => a - b);
  }

  _buildSpec(q, s, f, t) {
    const allowed = new Set([0]), required = new Set();
    let opt5 = false;

    if (q === 'major') { allowed.add(4); required.add(4); allowed.add(7); opt5 = true; }
    if (q === 'minor') { allowed.add(3); required.add(3); allowed.add(7); opt5 = true; }
    if (q === 'aug')   { allowed.add(4); required.add(4); allowed.add(8); required.add(8); }
    if (q === 'dim')   { allowed.add(3); required.add(3); allowed.add(6); required.add(6); }

    if (f === 'sus4') {
      allowed.delete(4); required.delete(4);
      allowed.add(5); required.add(5); allowed.add(4);
    }
    if (f === 'add9') { allowed.add(2); required.add(2); }
    if (f === 'b5')   { allowed.delete(7); required.delete(7); allowed.add(6); required.add(6); opt5 = false; }

    if (s === 'M7')   { allowed.add(11); required.add(11); }
    if (s === '7')    { allowed.add(10); required.add(10); }
    if (s === '6')    { allowed.add(9);  required.add(9);  }
    if (s === 'dim7') { allowed.add(9);  required.add(9);  }

    if (t) { const iv = this._itvMap()[t]; allowed.add(iv); required.add(iv); }

    return { allowed, required, opt5 };
  }

  _eval(anal, root, q, s, f, t, slash) {
    if (!this._validBase(q, s, f)) return null;
    if (!this._canTension(q, s, f, t)) return null;
    if ((q === 'dim' || s === 'dim7') && slash !== null) return null;

    const obs = this._observed(anal.pcsOrdered, root);
    const obsSet = new Set(obs);
    const spec = this._buildSpec(q, s, f, t);

    for (const r of spec.required) if (!obsSet.has(r)) return null;

    const rootPresent = anal.sounding.some(n => n.pc === root);
    let score = rootPresent ? 12 : -7;
    if (anal.lowestPc === root) score += 14;
    score += spec.required.size * 11;
    if (spec.opt5 && obsSet.has(7)) score += 6;

    const unexplained = obs.filter(iv => !spec.allowed.has(iv));
    score -= unexplained.length * 22;
    if (unexplained.length >= 2) return null;

    if (q === 'major' && obsSet.has(3)) score -= 18;
    if (q === 'minor' && obsSet.has(4)) score -= 18;
    if (f === 'sus4' && (obsSet.has(3) || obsSet.has(4))) score -= 10;
    if (q === 'major' && s === '7' && f === 'b5' && !obsSet.has(7) && obsSet.has(6)) score -= 12;
    if (q === 'dim' && s === '7' && t) score -= 18;
    if (anal.lowestPc === root && !obsSet.has(3) && !obsSet.has(4)) score += 6;
    if (q === 'minor' && s === '6' && !slash) score += 5;
    if (f === 'sus4' && t) score -= 6; // sus4 + tension 과해석 억제
    //if (!t) score += 3;                // tension 없는 단순 구조 우대

    if (slash !== null) {
      if (anal.lowestPc !== slash) return null;
      if (!obsSet.has((slash - root + 12) % 12)) return null;
      score += 11; score -= 2;
      const slashInterval = (slash - root + 12) % 12;
      if (slashInterval === 4 || slashInterval === 3) score += 2;
      if (slashInterval === 7) score += 1;
      if (slashInterval === 10 || slashInterval === 11) score += 1;
    }

    return { name: this._fmt(root, q, s, f, t, slash), score, root, quality:q,
      seventh:s, func:f, tension:t, slash, isSlash: slash !== null };
  }

  _slashVariant(c, anal) {
    const lo = anal.lowestPc;
    if (lo === null || c.slash !== null || lo === c.root) return null;
    if (c.quality === 'dim' || c.seventh === 'dim7') return null;
    return this._eval(anal, c.root, c.quality, c.seventh, c.func, c.tension, lo);
  }

  _fmt(root, q, s, f, t, slash) {
    const rn = this._spell(root);
    if (q === 'dim' && s === 'dim7') return rn + 'dim7';
    if (q === 'dim' && s === '7') {
      const items = ['b5']; if (t) items.push(t);
      const base = `${rn}m7(${items.join(',')})`;
      return slash !== null && slash !== root ? `${base}/${this._spell(slash)}` : base;
    }
    let base = rn;
    if (q === 'minor') base += 'm';
    if (q === 'aug')   base += 'aug';
    if (q === 'dim' && !s) base += 'dim';
    if (q === 'major') { if (s==='M7') base+='M7'; else if (s==='7') base+='7'; else if (s==='6') base+='6'; }
    if (q === 'minor') { if (s==='M7') base+='M7'; else if (s==='7') base+='7'; else if (s==='6') base+='6'; }
    if (q === 'aug' && s === '7') base += '7';
    if (f === 'sus4') base += 'sus4';
    if (f === 'add9') base += 'add9';
    const parens = [];
    if (f === 'b5') parens.push('b5');
    if (t) parens.push(t);
    if (parens.length) base += `(${parens.join(',')})`;
    if (slash !== null && slash !== root) {
      const sn = this._spell(slash);
      if (this.options.preferDominantFlat7SlashShorthand &&
          q==='major' && s==='7' && !f && !t && (slash-root+12)%12===10)
        return `${rn}/${sn}`;
      return `${base}/${sn}`;
    }
    return base;
  }

  _spell(pc) {
    const m = this.options.spellingMode;
    if (m === 'sharp') return GuitarChordSuggester.NAMES_SHARP[pc];
    if (m === 'flat')  return GuitarChordSuggester.NAMES_FLAT[pc];
    return GuitarChordSuggester.NAMES_AUTO[pc];
  }
}

const chordSuggester = new GuitarChordSuggester({ searchThreshold: 38 });

// 보이싱 라이브러리는 voicing-library.js 에서 관리

// 현재 편집 상태 → 새 클래스 입력 형식 변환
// 새 클래스: index 0 = 6번줄(저음 E, s=5), index 5 = 1번줄(고음 e, s=0)
function getChordFretArray() {
  const barreMap = buildBarreMap(dots, barreActive);
  const arr = [];
  for (let s = 5; s >= 0; s--) {
    if (openMute[s] === 'mute') { arr.push(null); continue; }
    const sd = dots.filter(d => d.s === s);
    const dot = sd.length > 0 ? sd.reduce((a, b) => a.f >= b.f ? a : b) : undefined;
    const bf  = barreMap[s];
    if (dot !== undefined && bf !== undefined) arr.push(calcActualFret(Math.max(dot.f, bf)));
    else if (dot !== undefined)  arr.push(calcActualFret(dot.f));
    else if (bf  !== undefined)  arr.push(calcActualFret(bf));
    else arr.push(0);
  }
  return arr;
}

function suggestChordNames() {
  chordSuggester.options.spellingMode = accidental;
  return chordSuggester.suggest(getChordFretArray());
}

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

function updateChordSuggestions() {
  const el = document.getElementById('chord-suggestions');
  if (!el) return;
  const names = suggestChordNames();
  el.innerHTML = names.map(n => `<span class="chord-suggest-item">${n}</span>`).join('');
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
  c.lineWidth = Math.max(2, 6 * sc);
  c.lineCap = 'round';
  c.beginPath(); c.moveTo(tl, tt); c.lineTo(tl, tb); c.stroke();

  // 프렛선
  c.strokeStyle = '#2a2a2a';
  c.lineWidth = Math.max(1, 2 * sc);
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
  updateChordSuggestions();
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
      barreActive[f] = false; // 기본 비활성 — 사용자가 직접 활성화
    }
    const btn = document.createElement('button');
    btn.textContent = 'B';
    const ds = MAIN_DISPLAY_SCALE;
    const btnSize = Math.round(24 * ds);
    const left = Math.round((TL() + (f - 0.5) * FW()) * ds) - Math.round(btnSize / 2);
    const top  = Math.round((TT() - DS()) * ds) - Math.round(btnSize * 0.67);
    btn.style.cssText = `position:absolute;left:${left}px;top:${top}px;width:${btnSize}px;height:${btnSize}px;
      border-radius:50%;border:1.5px solid #888;
      background:${barreActive[f] ? '#1a1714' : '#fff'};
      color:${barreActive[f] ? '#fff' : '#888'};
      font-size:${Math.round(11 * ds)}px;font-family:'Pretendard',sans-serif;
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
    // 같은 위치 토글 오프: 해당 dot만 제거
    dots.splice(idx, 1);
    if (!dots.some(d => d.s === si)) openMute[si] = 'open';
  } else {
    // 바레가 이 줄을 커버하고 있고 클릭 프렛이 바레 우측이면 → 바레 dot 유지, 우측 dot만 교체
    const barreF = barreMapCheck[si];
    if (barreF !== undefined && fi > barreF) {
      dots = dots.filter(d => d.s !== si || d.f === barreF);
      dots.push({ s: si, f: fi, n: selectedFinger });
    } else {
      // 바레 없음 또는 바레 프렛 클릭: 한 줄 1개
      dots = dots.filter(d => d.s !== si);
      openMute[si] = 'open';
      dots.push({ s: si, f: fi, n: selectedFinger });
    }
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

  if (!canUseScale(scale)) {
    showUpgradeModal('scale_limit');
    return;
  }

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
      const SaveImage = window.Capacitor.Plugins.SaveImage;
      const safeName = fileName.replace(/[^\w.\-]/g, '_');
      // 네이티브 플러그인으로 MediaStore에 직접 저장 (권한 불필요, Android 10+)
      await SaveImage.saveToGallery({ base64, fileName: safeName });
      showSaveToast();
    } catch (e) {
      const msg = e?.message || e?.errorMessage || JSON.stringify(e);
      console.error('저장 실패:', e);
      alert('저장 실패: ' + msg);
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
    const sd = chord.dots.filter(d => d.s === s);
    const dot = sd.length > 0 ? sd.reduce((a, b) => a.f >= b.f ? a : b) : undefined;
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
    const sd = dots.filter(d => d.s === s);
    const dot = sd.length > 0 ? sd.reduce((a, b) => a.f >= b.f ? a : b) : undefined;
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

// ── 유료 플랜 제한 설정 ──────────────────────────────────────────
const PLAN_LIMITS = {
  free:     { maxProjects: 2,        maxScale: 1 },
  standard: { maxProjects: 10,       maxScale: 1 },
  pro:      { maxProjects: Infinity, maxScale: 3 },
};

function getPlanLimit(key) {
  return (PLAN_LIMITS[getPlan()] || PLAN_LIMITS.free)[key];
}
function canCreateProject() {
  return loadProjects().length < getPlanLimit('maxProjects');
}
function canUseScale(scale) {
  return scale <= getPlanLimit('maxScale');
}

function setPlan(plan) {
  localStorage.setItem('chorditor_plan', plan);
  updateExportScaleOptions();
  renderPlanBadge();
}

// ── Supabase Auth (웹 전용) ────────────────────────────────────
// Supabase 프로젝트 생성 후 아래 두 값을 교체하세요
// Settings → API → Project URL / anon public
const SUPABASE_URL  = 'https://jbvkygeksohlysyvaoab.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impidmt5Z2Vrc29obHlzeXZhb2FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTk5NjgsImV4cCI6MjA5MTk3NTk2OH0.6RSgChy0Yq0H2TJpZPSoMKQ2V-OYfR0XzE1aJBBZkXI';

let _supabase = null;

async function initSupabase() {
  if (!window.supabase) { console.warn('[Supabase] 라이브러리 로드 안됨'); renderAuthUI(null); return; }

  // Android/웹 공통으로 Supabase 초기화
  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  // Android: OAuth 콜백 딥링크 리스닝
  if (window.Capacitor?.isNativePlatform()) {
    const CapApp = window.Capacitor?.Plugins?.App;
    if (CapApp) {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        if (!url?.includes('auth-callback')) return;
        try {
          // PKCE(code) 또는 Implicit(access_token) 처리
          const fakeBase = 'https://x.com/';
          const urlObj   = new URL(url.replace('com.chorditor.app://', fakeBase));
          const code     = urlObj.searchParams.get('code');
          const hash     = new URLSearchParams((url.split('#')[1] || ''));
          const at       = hash.get('access_token');
          const rt       = hash.get('refresh_token');

          let session = null;
          if (code) {
            const { data } = await _supabase.auth.exchangeCodeForSession(code);
            session = data?.session;
          } else if (at && rt) {
            const { data } = await _supabase.auth.setSession({ access_token: at, refresh_token: rt });
            session = data?.session;
          }

          if (session?.user) {
            // RevenueCat과 Supabase user ID 연결
            if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
            await fetchWebPlan();
            renderAuthUI(session.user);
            // 인앱 브라우저 닫기
            const CapBrowser = window.Capacitor?.Plugins?.Browser;
            if (CapBrowser) await CapBrowser.close().catch(() => {});
          }
        } catch(e) {
          console.error('[Auth] 딥링크 처리 실패:', e);
        }
      });
    }
  }

  // 인증 상태 변화 감지
  _supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
      await fetchWebPlan();
      renderAuthUI(session.user);
    } else {
      setPlan('free');
      renderAuthUI(null);
    }
  });

  // 기존 세션 복원 (앱 재시작 / OAuth 리다이렉트 후)
  const { data: { session } } = await _supabase.auth.getSession();
  if (session?.user) {
    if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
    await fetchWebPlan();
    renderAuthUI(session.user);
  } else {
    renderAuthUI(null);
  }
}

// supabase-js가 Capacitor WebView에서 hang되므로 세션을 직접 관리
const SUPABASE_STORAGE_KEY = 'sb-jbvkygeksohlysyvaoab-auth-token';

function saveSessionToStorage(rawJson) {
  const session = {
    access_token:  rawJson.access_token,
    refresh_token: rawJson.refresh_token,
    token_type:    rawJson.token_type || 'bearer',
    expires_in:    rawJson.expires_in || 3600,
    expires_at:    rawJson.expires_at || Math.floor(Date.now() / 1000) + (rawJson.expires_in || 3600),
    user:          rawJson.user,
  };
  localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(session));
  return session;
}

async function fetchPlanWithToken(accessToken) {
  try {
    const resp = await fetch('https://jbvkygeksohlysyvaoab.supabase.co/rest/v1/rpc/get_my_plan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + accessToken,
      },
      body: '{}',
    });
    if (resp.ok) {
      const plan = await resp.json();
      if (plan) setPlan(plan);
    }
  } catch(e) {
    console.warn('[Auth] fetchPlanWithToken 실패:', e);
  }
}

async function signInWithGoogle() {
  if (!_supabase) { alert('Supabase가 초기화되지 않았습니다.'); return; }

  if (window.Capacitor?.isNativePlatform()) {
    try {
      const GoogleAuth = window.Capacitor?.Plugins?.GoogleAuth;
      if (!GoogleAuth) throw new Error('GoogleAuth 플러그인을 찾을 수 없습니다.');

      await GoogleAuth.initialize({
        clientId: '495859421223-rkjalna3ckhslfrk12gvbehn69o9j4qe.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });

      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser?.authentication?.idToken ?? googleUser?.idToken;
      if (!idToken) throw new Error('ID 토큰을 받지 못했습니다.');

      // supabase-js가 WebView에서 hang → 직접 fetch + localStorage 수동 세팅
      const rawResp = await fetch('https://jbvkygeksohlysyvaoab.supabase.co/auth/v1/token?grant_type=id_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ provider: 'google', id_token: idToken }),
      });
      const rawJson = await rawResp.json();
      if (!rawResp.ok) throw new Error(rawJson?.error_description || rawJson?.msg || 'Supabase 인증 실패');

      const session = saveSessionToStorage(rawJson);
      const user = session.user;

      if (user) {
        if (window._RC) await window._RC.logIn({ appUserID: user.id }).catch(() => {});
        await fetchPlanWithToken(session.access_token);
        renderAuthUI(user);
      }
    } catch(e) {
      const msg = e?.message || JSON.stringify(e) || '알 수 없는 오류';
      if (!msg.includes('canceled') && !msg.includes('cancel')) {
        console.error('[Auth] Google 로그인 실패:', e);
        alert('로그인 실패: ' + msg);
      }
    }
  } else {
    await _supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + location.pathname }
    });
  }
}

// Android 앱 시작 시 자동 로그인 시도
let _authReady = false; // 세션 복원 성공 여부
let _authResolve = null;
const _authPromise = new Promise(resolve => { _authResolve = resolve; });

async function tryAutoSignIn() {
  if (!window.Capacitor?.isNativePlatform()) { _authResolve(); _showOnboardingButtons(); return; }

  // 1) 저장된 세션이 유효하면 즉시 UI 확정 → 네트워크 동기화는 백그라운드
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      const now = Math.floor(Date.now() / 1000);
      if (session.user && session.expires_at > now) {
        // ✅ 세션 유효 확인 즉시 완료 신호 → 로딩 끝, 버튼 표시
        _authReady = true;
        renderAuthUI(session.user);
        _authResolve();
        _showOnboardingButtons();
        // 플랜/RevenueCat 동기화는 백그라운드에서
        if (window._RC) window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
        fetchPlanWithToken(session.access_token).catch(() => {});
        return;
      }
    }
  } catch(e) { /* 무시 */ }

  // 2) 저장된 세션 없음 → Google 무음 로그인 시도 (타임아웃 5초)
  try {
    const GoogleAuth = window.Capacitor?.Plugins?.GoogleAuth;
    if (!GoogleAuth) return;

    await GoogleAuth.initialize({
      clientId: '495859421223-rkjalna3ckhslfrk12gvbehn69o9j4qe.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });

    // refresh에 5초 타임아웃 적용
    const googleUser = await Promise.race([
      GoogleAuth.refresh(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    const idToken = googleUser?.authentication?.idToken ?? googleUser?.idToken;
    if (!idToken) return;

    const rawResp = await fetch('https://jbvkygeksohlysyvaoab.supabase.co/auth/v1/token?grant_type=id_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
      body: JSON.stringify({ provider: 'google', id_token: idToken }),
    });
    if (!rawResp.ok) return;
    const rawJson = await rawResp.json();

    const session = saveSessionToStorage(rawJson);
    if (session.user) {
      _authReady = true;
      renderAuthUI(session.user);
      // 플랜/RevenueCat 동기화는 백그라운드에서
      if (window._RC) window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
      fetchPlanWithToken(session.access_token).catch(() => {});
    }
  } catch(e) {
    console.log('[Auth] 자동 로그인 불가:', e?.message || e);
  } finally {
    _authResolve();
    _showOnboardingButtons();
  }
}

function _showOnboardingButtons() {
  document.getElementById('onboarding-loading')?.classList.add('hidden');
  if (_authReady) {
    document.getElementById('onboarding-start-btn')?.classList.remove('hidden');
    document.getElementById('onboarding-switch-btn')?.classList.remove('hidden');
  } else {
    document.getElementById('onboarding-google-btn')?.classList.remove('hidden');
  }
}

// 저장 완료 체크 애니메이션
let _toastTimer = null;
function showSaveToast() {
  const el = document.getElementById('save-toast');
  if (!el) return;
  if (_toastTimer) clearTimeout(_toastTimer);
  // 애니메이션 재시작을 위해 클래스 제거 후 reflow
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  _toastTimer = setTimeout(() => el.classList.remove('show'), 1500);
}

function showOnboarding() {
  const el = document.getElementById('onboarding-overlay');
  if (el) el.classList.remove('hidden');
}

function hideOnboarding() {
  const el = document.getElementById('onboarding-overlay');
  if (el) el.classList.add('hidden');
}

// 시작하기 버튼 핸들러 (로그인된 사용자만 도달)
function handleStart() {
  hideOnboarding();
  showTutorialIfNeeded();
}

async function onboardingSignIn() {
  try {
    const GoogleAuth = window.Capacitor?.Plugins?.GoogleAuth;
    if (!GoogleAuth) return;

    await GoogleAuth.initialize({
      clientId: '495859421223-rkjalna3ckhslfrk12gvbehn69o9j4qe.apps.googleusercontent.com',
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });

    const googleUser = await GoogleAuth.signIn();
    const idToken = googleUser?.authentication?.idToken ?? googleUser?.idToken;
    if (!idToken) throw new Error('ID 토큰을 받지 못했습니다.');

    const rawResp = await fetch('https://jbvkygeksohlysyvaoab.supabase.co/auth/v1/token?grant_type=id_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
      body: JSON.stringify({ provider: 'google', id_token: idToken }),
    });
    const rawJson = await rawResp.json();
    if (!rawResp.ok) throw new Error(rawJson?.error_description || 'Supabase 인증 실패');

    const session = saveSessionToStorage(rawJson);
    if (session.user) {
      if (window._RC) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
      await fetchPlanWithToken(session.access_token);
      renderAuthUI(session.user);
      hideOnboarding();
      showTutorialIfNeeded();
    }
  } catch(e) {
    const msg = e?.message || '';
    if (!msg.includes('cancel')) alert('로그인 실패: ' + msg);
  }
}

// ── 튜토리얼 모달 ──
const TUTORIAL_KEY = 'chorditor_tutorial_v1';

function showTutorialIfNeeded() {
  if (!localStorage.getItem(TUTORIAL_KEY)) {
    document.getElementById('modal-tutorial').classList.remove('hidden');
  }
}

function closeTutorial() {
  localStorage.setItem(TUTORIAL_KEY, '1');
  document.getElementById('modal-tutorial').classList.add('hidden');
}

async function signInWithApple() {
  if (!_supabase) { alert('Supabase가 초기화되지 않았습니다.'); return; }
  // Apple 로그인은 웹 전용 (Android 미지원)
  await _supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: location.origin + location.pathname }
  });
}

async function signOutWeb() {
  // Android: localStorage 세션 직접 삭제
  if (window.Capacitor?.isNativePlatform()) {
    try {
      const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
      if (stored) {
        const session = JSON.parse(stored);
        // Supabase 서버에 로그아웃 요청
        fetch('https://jbvkygeksohlysyvaoab.supabase.co/auth/v1/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON, 'Authorization': 'Bearer ' + session.access_token },
        }).catch(() => {});
      }
    } catch(e) {}
    localStorage.removeItem(SUPABASE_STORAGE_KEY);
    setPlan('free');
    renderAuthUI(null);
    return;
  }
  if (!_supabase) return;
  await _supabase.auth.signOut();
  setPlan('free');
  renderAuthUI(null);
}

async function fetchWebPlan() {
  // Android: localStorage 세션에서 토큰 꺼내 직접 fetch
  if (window.Capacitor?.isNativePlatform()) {
    try {
      const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
      if (!stored) return;
      const session = JSON.parse(stored);
      if (session.access_token) await fetchPlanWithToken(session.access_token);
    } catch(e) { console.warn('[Auth] fetchWebPlan(Android) 실패:', e); }
    return;
  }
  // 웹: supabase-js rpc 사용
  if (!_supabase) return;
  try {
    const { data, error } = await _supabase.rpc('get_my_plan');
    if (!error && data) setPlan(data);
  } catch(e) {
    console.warn('[Supabase] fetchWebPlan 실패:', e);
  }
}

function renderAuthUI(user) {
  // 로그인 UI는 노출하지 않음 — 자동 로그인으로만 처리
  // 플랜 배지만 갱신
  renderPlanBadge();
}

// ── Android 인앱 결제 (RevenueCat) ────────────────────────────
// RevenueCat 대시보드에서 발급한 Android 앱 키로 교체하세요.
const REVENUECAT_ANDROID_KEY = 'test_bPkuFIqjqlvFoEWDLktVfBcjlfO';

// Entitlement ID (RevenueCat 대시보드에서 설정한 값과 동일해야 함)
const ENTITLEMENT_STANDARD = 'standard_entitlement';
const ENTITLEMENT_PRO      = 'pro_entitlement';

// Google Play 구독 상품 식별자 (RevenueCat Offering 내 Package identifier)
const PRODUCT_STANDARD = 'standard_monthly';
const PRODUCT_PRO      = 'pro_monthly';

async function initBilling() {
  if (!window.Capacitor?.isNativePlatform()) return;
  try {
    // 번들러 없는 환경 → Capacitor 플러그인 브리지로 접근
    const Purchases = window.Capacitor?.Plugins?.Purchases;
    if (!Purchases) { console.warn('[Billing] Purchases 플러그인 없음'); return; }
    window._RC = Purchases;
    await Purchases.configure({ apiKey: REVENUECAT_ANDROID_KEY });
    await syncPlanFromBilling();
  } catch(e) {
    console.warn('[Billing] initBilling 실패:', e);
  }
}

async function syncPlanFromBilling() {
  if (!window._RC) return;
  try {
    const { customerInfo } = await window._RC.getCustomerInfo();
    const active = customerInfo?.entitlements?.active || {};
    if (active[ENTITLEMENT_PRO])           setPlan('pro');
    else if (active[ENTITLEMENT_STANDARD]) setPlan('standard');
    else                                   setPlan('free');
  } catch(e) {
    console.warn('[Billing] syncPlanFromBilling 실패:', e);
  }
}

async function purchasePlan(planId) {
  if (!window._RC) {
    alert('인앱 결제를 사용할 수 없는 환경입니다.');
    return;
  }

  // RevenueCat App User ID = 저장된 Supabase user UUID
  try {
    const stored = localStorage.getItem(SUPABASE_STORAGE_KEY);
    if (stored) {
      const session = JSON.parse(stored);
      if (session.user?.id) await window._RC.logIn({ appUserID: session.user.id }).catch(() => {});
    }
  } catch(e) {}

  const productId = planId === 'pro' ? PRODUCT_PRO : PRODUCT_STANDARD;
  try {
    const { offerings } = await window._RC.getOfferings();
    const current = offerings?.current;
    if (!current) throw new Error('Offering 없음');

    const pkg = current.availablePackages.find(p =>
      p.identifier === productId || p.product?.identifier?.includes(productId)
    );
    if (!pkg) throw new Error('상품을 찾을 수 없습니다: ' + productId);

    await window._RC.purchasePackage({ aPackage: pkg });
    await syncPlanFromBilling();
    await fetchWebPlan();
    closePlanModal();
    alert('구독이 완료되었습니다!');
  } catch(e) {
    if (e?.code !== 'PURCHASE_CANCELLED') {
      console.error('[Billing] purchasePlan 실패:', e);
      alert('구독 중 오류가 발생했습니다: ' + (e?.message || JSON.stringify(e)));
    }
  }
}

async function restorePurchases() {
  if (!window._RC) {
    alert('인앱 결제를 사용할 수 없는 환경입니다.');
    return;
  }
  try {
    await window._RC.restorePurchases();
    await syncPlanFromBilling();
    alert('구매 내역을 복원했습니다.');
  } catch(e) {
    console.error('[Billing] restorePurchases 실패:', e);
    alert('복원 실패: ' + (e?.message || JSON.stringify(e)));
  }
}

// ── 배율 옵션 잠금 제어 ─────────────────────────────────────────
function updateExportScaleOptions() {
  const max = getPlanLimit('maxScale');
  const select = document.getElementById('export-scale');
  if (!select) return;
  select.querySelectorAll('option').forEach(opt => {
    const v = parseFloat(opt.value);
    const locked = v > max;
    opt.textContent = opt.textContent.replace(' 🔒', '');
    opt.style.color = locked ? '#aaa' : '';
    // 현재 선택된 값이 잠기면 x1로 리셋
    if (locked && select.value === opt.value) select.value = '1';
  });
}

// ── 요금제 안내 모달 ───────────────────────────────────────────
function openPlanModal() {
  const plan = getPlan();
  const isNative = window.Capacitor?.isNativePlatform();

  ['standard', 'pro'].forEach(p => {
    const btn = document.getElementById('plan-btn-' + p);
    if (!btn) return;
    if (p === plan) {
      btn.textContent = '현재 플랜';
      btn.disabled = true;
      btn.onclick = null;
    } else {
      btn.disabled = false;
      if (isNative) {
        btn.textContent = '구독하기';
        btn.onclick = () => purchasePlan(p);
      } else {
        // 웹 환경: Play Store 안내
        btn.textContent = '앱에서 구독';
        btn.onclick = () => alert('구독은 Android 앱에서 가능합니다.\nGoogle Play에서 Chorditor를 다운로드하세요.');
      }
    }
  });

  // 구매 복원 버튼: Android에서만 표시
  const restoreBtn = document.getElementById('plan-restore-btn');
  if (restoreBtn) restoreBtn.style.display = isNative ? '' : 'none';

  document.getElementById('plan-modal-overlay').classList.remove('hidden');
  lucide.createIcons();
}

function closePlanModal() {
  document.getElementById('plan-modal-overlay').classList.add('hidden');
}

// ── 업그레이드 유도 모달 ───────────────────────────────────────
const UPGRADE_MESSAGES = {
  project_limit: {
    title: '프로젝트 한도에 도달했습니다',
    desc: {
      free:     '무료 플랜은 프로젝트를 2개까지 만들 수 있습니다. Standard 또는 Pro로 업그레이드하세요.',
      standard: 'Standard 플랜은 프로젝트를 10개까지 만들 수 있습니다. Pro로 업그레이드하면 무제한으로 사용할 수 있습니다.',
      pro:      '',
    },
  },
  scale_limit: {
    title: '이 배율은 Pro 플랜 전용입니다',
    desc: {
      free:     'x2, x3 고화질 저장은 Pro 플랜에서 사용할 수 있습니다.',
      standard: 'x2, x3 고화질 저장은 Pro 플랜에서 사용할 수 있습니다.',
      pro:      '',
    },
  },
};

function showUpgradeModal(reason) {
  const plan = getPlan();
  const msg = UPGRADE_MESSAGES[reason];
  if (!msg) return;
  document.getElementById('upgrade-modal-title').textContent = msg.title;
  document.getElementById('upgrade-modal-desc').textContent  = msg.desc[plan] || '';
  document.getElementById('upgrade-modal-overlay').classList.remove('hidden');
}

function closeUpgradeModal() {
  document.getElementById('upgrade-modal-overlay').classList.add('hidden');
}

// ── 사이드바 플랜 배지 ─────────────────────────────────────────
function renderPlanBadge() {
  const el = document.getElementById('sidebar-plan-badge');
  if (!el) return;
  const plan = getPlan();
  const labels = { free: 'FREE', standard: 'STANDARD', pro: 'PRO' };
  el.textContent = labels[plan] || 'FREE';
  el.dataset.plan = plan;
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
  if (!canCreateProject()) {
    showUpgradeModal('project_limit');
    return;
  }
  const input = document.getElementById('create-project-name-input');
  input.value = '';
  document.getElementById('modal-create-project').classList.remove('hidden');
  lucide.createIcons();
  requestAnimationFrame(() => input.focus());
}

function confirmCreateProject() {
  const input = document.getElementById('create-project-name-input');
  const name = input.value.trim();
  if (!name) { input.focus(); return; }

  closeModal('modal-create-project');

  const projects = loadProjects();
  const newProject = {
    id: genId(),
    name,
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
  const shareBtn = document.createElement('button');
  shareBtn.className = 'btn btn-primary project-header-btn';
  shareBtn.textContent = '공유하기';
  shareBtn.onclick = () => openShareModal(projectId);
  headerRow1.appendChild(shareBtn);
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
    slot.dataset.chordId = chordId || ''; // DOM fallback for saveAllLines

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

  // editMode: chord-area를 wrapper로 감싸고 3-dot 메뉴 버튼 추가
  if (editMode) {
    const wrapper = document.createElement('div');
    wrapper.className = 'chord-row-wrapper';
    wrapper.appendChild(area);
    const menuBtn = document.createElement('button');
    menuBtn.className = 'row-menu-btn';
    menuBtn.setAttribute('aria-label', '행 메뉴');
    menuBtn.innerHTML = '<i data-lucide="more-vertical"></i>';
    // 터치: touchstart에서 즉시 linesEl.contentEditable=false → 키보드 원천 차단
    // (touchstart.preventDefault()만으로는 Android WebView 상위 contenteditable 포커스 못 막음)
    let _btnTouchPending = false;
    menuBtn.addEventListener('touchstart', e => {
      e.preventDefault();
      e.stopPropagation();
      _btnTouchPending = true;
      // touchstart 시점에 contentEditable 비활성화 → 포커스/키보드 차단
      const linesEl = menuBtn.closest('.project-lines');
      if (linesEl) linesEl.contentEditable = 'false';
    }, { passive: false });
    menuBtn.addEventListener('touchend', e => {
      e.preventDefault();
      e.stopPropagation();
      if (_btnTouchPending) {
        _btnTouchPending = false;
        openRowMenu({ currentTarget: menuBtn }, line.id, project.id);
      }
    }, { passive: false });
    menuBtn.addEventListener('touchcancel', () => {
      _btnTouchPending = false;
      // 메뉴 열리지 않은 채 취소 → contentEditable 즉시 복원
      const linesEl = menuBtn.closest('.project-lines');
      if (linesEl) linesEl.contentEditable = 'true';
    });
    // 마우스: mousedown으로 포커스 방지, click에서 메뉴 호출
    menuBtn.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); });
    menuBtn.addEventListener('click', e => {
      e.stopPropagation();
      openRowMenu(e, line.id, project.id);
    });
    wrapper.appendChild(menuBtn);
    return wrapper;
  }
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

  // 클립보드 히스토리 경로 차단 (Android WebView: paste 이벤트를 우회하고 beforeinput → DOM 삽입)
  linesEl.addEventListener('beforeinput', e => {
    if (e.inputType !== 'insertFromPaste' && e.inputType !== 'insertFromPasteAsQuotation') return;

    // 비동기 처리 전에 대상 라인 캡처 (async 이후 포커스 유실 방지)
    const anchorLine = lastFocusedLine;

    const dt = e.dataTransfer;
    let pasted = dt?.getData('text/plain') || dt?.getData('text') || '';
    // text/plain이 없으면 text/html에서 plain text 추출 (웹 복사본 클립보드 히스토리)
    if (!pasted && dt) {
      const html = dt.getData('text/html') || '';
      if (html) pasted = htmlClipboardToText(html);
    }

    if (pasted) {
      // dataTransfer에서 텍스트 확보 — 동기 처리
      e.preventDefault();
      applyPastedText(pasted, anchorLine);
      return;
    }

    // dataTransfer가 완전히 null인 경우 (IME/클립보드 히스토리 경로):
    // 브라우저 삽입을 막고 async Clipboard API로 직접 읽어서 줄바꿈 보존
    e.preventDefault();
    navigator.clipboard?.readText().then(text => {
      if (text) applyPastedText(text, anchorLine);
    }).catch(() => {});
  });

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
      // 다음 기존 행이 있으면 새 행을 만들지 않고 텍스트만 덮어씌움 (코드 슬롯 보존)
      const nextExisting = lastLine.nextElementSibling;
      if (nextExisting && nextExisting.classList.contains('project-line')) {
        setLineText(nextExisting, text);
        lastLine = nextExisting;
      } else {
        // 기존 행 없음 → 새 행 생성
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

  // input 폴백: beforeinput이 처리 못 한 경우 (dataTransfer null) HTML 잔류 정리
  linesEl.addEventListener('input', e => {
    if (e.inputType !== 'insertFromPaste' && e.inputType !== 'insertFromPasteAsQuotation') return;

    // chord-area가 아닌 element child를 가진 라인 = HTML이 삽입된 라인
    const dirtyLines = Array.from(linesEl.querySelectorAll('.project-line')).filter(line =>
      Array.from(line.childNodes).some(n => n.nodeType === Node.ELEMENT_NODE && !n.classList.contains('chord-area'))
    );
    if (!dirtyLines.length) return;

    const p = getProject(project.id);
    let lastInsertedLine = null;

    for (const line of dirtyLines) {
      const chordArea = line.querySelector('.chord-area');
      const segments = [];
      let cur = '';

      const walk = (node) => {
        if (node === chordArea) return;
        if (node.nodeType === Node.TEXT_NODE) {
          cur += node.textContent;
        } else if (node.nodeName === 'BR') {
          segments.push(cur); cur = '';
        } else if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI'].includes(node.nodeName) &&
                   !node.classList.contains('chord-area') && !node.classList.contains('chord-slot')) {
          if (cur || segments.length > 0) { segments.push(cur); cur = ''; }
          for (const c of node.childNodes) walk(c);
          if (cur || segments.length > 0) { segments.push(cur); cur = ''; }
        } else {
          // span, b, i, a 등 인라인 요소: 재귀로 텍스트 추출
          for (const c of node.childNodes) walk(c);
        }
      };

      for (const c of line.childNodes) walk(c);
      if (cur || segments.length === 0) segments.push(cur);

      // 앞뒤 빈 세그먼트 정리
      while (segments.length > 1 && segments[0] === '') segments.shift();
      while (segments.length > 1 && segments[segments.length - 1] === '') segments.pop();

      setLineText(line, segments[0] || '');
      lastInsertedLine = line;

      for (let i = 1; i < segments.length; i++) {
        const newLineId = genId();
        const newLineData = { id: newLineId, text: segments[i], slots: new Array(8).fill(null) };
        const newDiv = document.createElement('div');
        newDiv.className = 'project-line';
        newDiv.dataset.lineId = newLineId;
        newDiv.appendChild(buildChordArea(newLineData, p || project));
        newDiv.appendChild(document.createTextNode(segments[i]));
        lastInsertedLine.insertAdjacentElement('afterend', newDiv);
        lastInsertedLine = newDiv;
      }
    }

    if (lastInsertedLine) {
      const sel = window.getSelection();
      const endRange = document.createRange();
      endRange.selectNodeContents(lastInsertedLine);
      endRange.collapse(false);
      if (sel) { sel.removeAllRanges(); sel.addRange(endRange); }
      saveAllLines(project.id, linesEl);
    }
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
    let slots;
    if (existing) {
      slots = existing.slots;
    } else {
      // DOM fallback: 붙여넣기 등으로 새 div가 생성된 경우 data-chord-id에서 복원
      slots = new Array(8).fill(null);
      div.querySelectorAll('[data-slot-idx]').forEach(slotEl => {
        const idx = parseInt(slotEl.dataset.slotIdx);
        const cid = slotEl.dataset.chordId || '';
        if (!isNaN(idx) && cid) slots[idx] = cid;
      });
    }
    return {
      id: div.dataset.lineId,
      text: getLineText(div),
      slots
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
  const p = getProject(projectId);

  // 다음 줄이 있으면 텍스트를 한 칸씩 아래로 민다 (새 DOM 행 추가 없이)
  const nextSibling = currentLine.nextElementSibling;
  if (nextSibling) {
    // 마지막 행까지 순회해 텍스트를 한 칸씩 밀고, 마지막 남은 텍스트를 새 행에 추가
    // 먼저 기존 행들의 텍스트를 수집
    const rows = [];
    let cur = nextSibling;
    while (cur) {
      rows.push(cur);
      cur = cur.nextElementSibling;
    }
    // 마지막으로 밀려난 텍스트를 담을 변수
    let displaced = after;
    for (const row of rows) {
      const rowText = getLineText(row);
      setLineText(row, displaced);
      displaced = rowText;
    }
    // displaced가 남아 있으면 새 행을 맨 끝에 추가
    const lastRow = rows[rows.length - 1];
    const newLineId = genId();
    const newLine = { id: newLineId, text: displaced, slots: new Array(8).fill(null) };
    const newDiv = document.createElement('div');
    newDiv.className = 'project-line';
    newDiv.dataset.lineId = newLineId;
    newDiv.appendChild(buildChordArea(newLine, p || { id: projectId, chords: [] }));
    if (displaced) {
      newDiv.appendChild(document.createTextNode(displaced));
    } else {
      newDiv.appendChild(document.createElement('br'));
    }
    lastRow.insertAdjacentElement('afterend', newDiv);
    // 커서를 nextSibling(밀린 후 첫 번째 기존 행)의 시작으로 이동
    const newRange = document.createRange();
    const firstTextNode = Array.from(nextSibling.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
    if (firstTextNode) {
      newRange.setStart(firstTextNode, 0);
    } else {
      const br = nextSibling.querySelector('br');
      if (br) newRange.setStartBefore(br);
      else { newRange.selectNodeContents(nextSibling); newRange.collapse(true); }
    }
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    requestAnimationFrame(() => nextSibling.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  } else {
    // 다음 줄 없음: 새 행을 바로 추가
    const newLineId = genId();
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
    requestAnimationFrame(() => newDiv.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }
  saveAllLines(projectId, linesEl);
}

// 코드 슬롯이 하나라도 채워져 있으면 true
function lineHasChords(lineDiv, projectId) {
  const p = getProject(projectId);
  const line = p?.arrangement.find(l => l.id === lineDiv.dataset.lineId);
  if (line?.slots?.some(s => s !== null)) return true;
  // DOM 폴백 (saveAllLines 전 상태)
  return Array.from(lineDiv.querySelectorAll('[data-slot-idx]')).some(el => el.dataset.chordId);
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
    // 빈 줄에서 줄 시작: 코드 슬롯이 있으면 행 보존
    if (lineHasChords(currentLine, projectId)) return;
    const prevLine = currentLine.previousElementSibling;
    currentLine.remove();
    if (prevLine) {
      const textNode = Array.from(prevLine.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
      const newRange = document.createRange();
      if (textNode && textNode.textContent.length > 0) {
        newRange.setStart(textNode, textNode.textContent.length);
      } else {
        const br = prevLine.querySelector('br');
        if (br) newRange.setStartBefore(br);
        else newRange.selectNodeContents(prevLine);
        newRange.collapse(false);
      }
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
      // 커서 위치로 스크롤 자동 추적
      requestAnimationFrame(() => prevLine?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    }
    saveAllLines(projectId, linesEl);

  } else if (cursorOffset === 0 && lineText) {
    // 텍스트 있는 줄의 맨 앞: 이전 줄에 텍스트 병합
    const prevLine = currentLine.previousElementSibling;
    if (!prevLine) return; // 첫 줄이면 아무것도 안 함
    const prevText = getLineText(prevLine);
    setLineText(prevLine, prevText + lineText);
    // 이전 줄 텍스트 끝(병합 경계)으로 커서 이동
    const textNode = Array.from(prevLine.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
    const newRange = document.createRange();
    if (textNode) {
      newRange.setStart(textNode, prevText.length);
    } else {
      newRange.selectNodeContents(prevLine); newRange.collapse(false);
    }
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
    // 커서 위치로 스크롤 자동 추적
    requestAnimationFrame(() => prevLine?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    if (lineHasChords(currentLine, projectId)) {
      // Q1-B: 코드 슬롯 있으면 행 보존 — 텍스트만 비움, 아래 텍스트 한 칸씩 위로
      setLineText(currentLine, '');
      // 아래 모든 행의 텍스트를 한 칸씩 위로 당기기
      let upper = currentLine;
      let lower = currentLine.nextElementSibling;
      while (lower) {
        const lowerText = getLineText(lower);
        setLineText(upper, lowerText);
        const nextLower = lower.nextElementSibling;
        if (!lowerText && !lineHasChords(lower, projectId)) {
          // 텍스트도 없고 코드 슬롯도 없는 마지막 행 → 제거
          lower.remove();
          break;
        } else if (!nextLower) {
          // 마지막 행이지만 코드 슬롯이 있으면 텍스트만 비움
          setLineText(lower, '');
        }
        upper = lower;
        lower = nextLower;
      }
    } else {
      // 코드 슬롯 없으면 행 삭제
      currentLine.remove();
    }
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

// ═══════════════════════════════════════════════════════════════
// 행 메뉴 (3-dot) — 코드 슬롯 행 독립 관리
// ═══════════════════════════════════════════════════════════════
let _rowMenuEl      = null;
let _backdropEl     = null;
let _rowMenuLineId  = null;
let _rowMenuProjId  = null;
let _rowMenuLinesEl = null;

function _ensureRowMenuEl() {
  if (_rowMenuEl) return;
  // 백드롭: 투명 전체화면 → 터치/클릭 시 메뉴 닫기
  _backdropEl = document.createElement('div');
  _backdropEl.className = 'row-menu-backdrop hidden';
  _backdropEl.addEventListener('click', _closeRowMenu);
  _backdropEl.addEventListener('touchstart', e => {
    e.preventDefault();
    _closeRowMenu();
  }, { passive: false });
  document.body.appendChild(_backdropEl);
  // 드롭다운
  const d = document.createElement('div');
  d.className = 'row-menu-dropdown hidden';
  d.innerHTML = `
    <button data-action="above">위에 줄 추가</button>
    <button data-action="below">아래에 줄 추가</button>
    <button data-action="clear">코드 슬롯 초기화</button>
    <hr />
    <button data-action="delete" class="danger">이 줄 삭제</button>`;
  d.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (btn) _rowMenuAction(btn.dataset.action);
  });
  document.body.appendChild(d);
  _rowMenuEl = d;
}

function openRowMenu(e, lineId, projectId) {
  _ensureRowMenuEl();
  _rowMenuLineId  = lineId;
  _rowMenuProjId  = projectId;
  const lineDiv   = e.currentTarget.closest('.project-line');
  _rowMenuLinesEl = lineDiv?.parentElement ?? null;

  // position: fixed → 뷰포트 기준 좌표 (내부 스크롤 무관)
  const rect   = e.currentTarget.getBoundingClientRect();
  const MENU_H = 176; // 드롭다운 예상 높이
  const viewH  = window.innerHeight;
  if (rect.bottom + MENU_H > viewH) {
    // 아래 공간 부족 → 버튼 위쪽으로 뒤집어 표시
    _rowMenuEl.style.top    = 'auto';
    _rowMenuEl.style.bottom = (viewH - rect.top + 4) + 'px';
  } else {
    _rowMenuEl.style.top    = (rect.bottom + 4) + 'px';
    _rowMenuEl.style.bottom = 'auto';
  }
  _rowMenuEl.style.right = (window.innerWidth - rect.right) + 'px';
  _rowMenuEl.style.left  = 'auto';

  _backdropEl.classList.remove('hidden');
  _rowMenuEl.classList.remove('hidden');

  // 내부 스크롤 발생 시 자동 닫기
  _rowMenuLinesEl?.addEventListener('scroll', _closeRowMenu, { once: true });

  // 마지막 줄이면 "이 줄 삭제" 비활성화
  const lines = _rowMenuLinesEl?.querySelectorAll('.project-line');
  _rowMenuEl.querySelector('[data-action="delete"]').disabled = (lines?.length ?? 0) <= 1;
}

function _closeRowMenu() {
  _rowMenuEl?.classList.add('hidden');
  _backdropEl?.classList.add('hidden');
  // 메뉴 닫힐 때 contentEditable 복원 (터치로 열었을 때 비활성화됐던 것)
  if (_rowMenuLinesEl) _rowMenuLinesEl.contentEditable = 'true';
}

function _rowMenuAction(action) {
  _closeRowMenu();
  const linesEl   = _rowMenuLinesEl;
  const projectId = _rowMenuProjId;
  const lineId    = _rowMenuLineId;
  if (!linesEl || !projectId || !lineId) return;

  const lineDiv = linesEl.querySelector(`.project-line[data-line-id="${lineId}"]`);
  const p       = getProject(projectId);
  if (!lineDiv || !p) return;

  if (action === 'above' || action === 'below') {
    const newId  = genId();
    const newObj = { id: newId, text: '', slots: new Array(8).fill(null) };
    const newDiv = document.createElement('div');
    newDiv.className      = 'project-line';
    newDiv.dataset.lineId = newId;
    newDiv.appendChild(buildChordArea(newObj, p, true));
    newDiv.appendChild(document.createElement('br'));
    lineDiv.insertAdjacentElement(action === 'above' ? 'beforebegin' : 'afterend', newDiv);
    saveAllLines(projectId, linesEl);
    lucide.createIcons();

  } else if (action === 'clear') {
    const line = p.arrangement.find(l => l.id === lineId);
    if (!line) return;
    line.slots    = new Array(8).fill(null);
    p.updatedAt   = Date.now();
    updateProject(p);
    // 코드 영역(wrapper) 재빌드
    const oldWrapper = lineDiv.querySelector('.chord-row-wrapper') ?? lineDiv.querySelector('.chord-area');
    if (oldWrapper) {
      const newWrapper = buildChordArea({ id: lineId, text: line.text, slots: line.slots }, p, true);
      oldWrapper.replaceWith(newWrapper);
      lucide.createIcons();
    }

  } else if (action === 'delete') {
    if (linesEl.querySelectorAll('.project-line').length <= 1) return;
    lineDiv.remove();
    saveAllLines(projectId, linesEl);
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
      // 텍스트 입력 포커스 해제 — 키보드 닫기 및 화면 이동 방지
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
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

  // 편집 모드: chord-row-wrapper(래퍼+3-dot)가 있으면 래퍼째 교체
  const oldWrapper = lineDiv.querySelector('.chord-row-wrapper');
  if (oldWrapper) {
    oldWrapper.replaceWith(buildChordArea(line, project, true));
    lucide.createIcons(); // 새 3-dot 아이콘 렌더링
    return;
  }

  // 뷰 모드: chord-area만 교체
  const oldArea = lineDiv.querySelector('.chord-area');
  if (!oldArea) return;
  oldArea.replaceWith(buildChordArea(line, project, false));
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
    // 같은 위치 토글 오프: 해당 dot만 제거
    me_dots.splice(idx, 1);
    if (!me_dots.some(d => d.s === si)) me_openMute[si] = 'open';
  } else {
    const meBarreF = meBarreMapCheck[si];
    if (meBarreF !== undefined && fi > meBarreF) {
      me_dots = me_dots.filter(d => d.s !== si || d.f === meBarreF);
      me_dots.push({ s: si, f: fi, n: me_selectedFinger });
    } else {
      me_dots = me_dots.filter(d => d.s !== si);
      me_openMute[si] = 'open';
      me_dots.push({ s: si, f: fi, n: me_selectedFinger });
    }
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
// 공유 기능
// ═══════════════════════════════════════════════════════════════

function encodeOpenMute(arr) {
  return arr.map(v => v === 'mute' ? 'm' : 'o').join('');
}
function decodeOpenMute(str) {
  return typeof str === 'string'
    ? str.split('').map(c => c === 'm' ? 'mute' : 'open')
    : str;
}
function toBase64url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function fromBase64url(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b64 + '=='.slice(0, (4 - b64.length % 4) % 4))));
}

// deflate-raw 압축 → base64url (CompressionStream 미지원 시 무압축 fallback)
async function toBase64urlZ(str) {
  try {
    const bytes = new TextEncoder().encode(str);
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    writer.write(bytes); writer.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    const binary = Array.from(new Uint8Array(buf), b => String.fromCharCode(b)).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch(e) {
    return toBase64url(str); // fallback
  }
}
// 압축 해제 (실패 시 무압축으로 재시도)
async function fromBase64urlZ(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '=='.slice(0, (4 - b64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  try {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(bytes); writer.close();
    const buf = await new Response(ds.readable).arrayBuffer();
    return new TextDecoder().decode(buf);
  } catch(e) {
    return fromBase64url(b64url); // fallback: 무압축 legacy
  }
}

function buildSharePayload(project) {
  const idToIdx = {};
  project.chords.forEach((c, i) => idToIdx[c.id] = i);
  const chords = project.chords.map((c, i) => ({
    i, name: c.name, root: c.root, triad: c.triad, seventh: c.seventh,
    func: c.func, tensions: c.tensions, bass: c.bass, accidental: c.accidental,
    dots: c.dots, openMute: encodeOpenMute(c.openMute),
    barre: c.barre, fretNumber: c.fretNumber, fingerNumMode: c.fingerNumMode
  }));
  const arr = project.arrangement.map(line =>
    (line.slots || new Array(8).fill(null))
      .map(id => id !== null && idToIdx[id] !== undefined ? idToIdx[id] : null)
  );
  return JSON.stringify({ v: 2, bpm: project.bpm ?? 120, capo: project.capo ?? 0,
                          col: project.colCount || 4, chords, arr });
}
async function generateShareCode(project) {
  return await toBase64urlZ(buildSharePayload(project));
}
async function generateShareUrl(project) {
  return 'https://solka-dayco.github.io/chord_editor/share/?share=' + await toBase64urlZ(buildSharePayload(project));
}

async function parseShareCode(raw) {
  let b64;
  // legacy prefix 지원 (이전에 생성된 공유 코드 호환)
  if (raw.startsWith('chorditor:v2:')) b64 = raw.slice(13).trim();
  else if (raw.startsWith('chorditor:v1:')) {
    // v1: 무압축 legacy
    try {
      const payload = JSON.parse(fromBase64url(raw.slice(13).trim()));
      return payload.v === 1 ? payload : null;
    } catch(e) { return null; }
  }
  else if (raw.includes('?share=')) b64 = new URL(raw).searchParams.get('share');
  else b64 = raw.trim();
  if (!b64) return null;
  try {
    const json = await fromBase64urlZ(b64);
    const payload = JSON.parse(json);
    return (payload.v === 1 || payload.v === 2) ? payload : null;
  } catch(e) { return null; }
}

async function openShareModal(projectId) {
  const project = getProject(projectId);
  if (!project) return;
  const code    = await generateShareCode(project);
  const fullUrl = await generateShareUrl(project);
  const codeEl     = document.getElementById('share-code-input');
  const urlEl      = document.getElementById('share-url-input');
  const urlCopyBtn = document.getElementById('share-url-copy-btn');
  // 공유 코드: 앞 20자 + … + 뒤 6자 (복사용 전체값은 data-full에 보관)
  const shorten = s => s.length > 30 ? s.slice(0, 20) + '…' + s.slice(-6) : s;
  codeEl.value        = shorten(code);
  codeEl.dataset.full = code;
  // URL 필드: 로딩 중 표시 후 is.gd 단축 URL로 교체
  urlEl.value         = '단축 링크 생성 중…';
  urlEl.dataset.full  = fullUrl;   // fallback용 미리 저장
  urlCopyBtn.disabled = true;
  document.getElementById('modal-share').classList.remove('hidden');
  lucide.createIcons();
  // is.gd API 호출
  try {
    const res  = await fetch('https://is.gd/create.php?format=simple&url=' + encodeURIComponent(fullUrl));
    const text = (await res.text()).trim();
    if (text.startsWith('ERROR') || !text.startsWith('http')) throw new Error(text);
    urlEl.value        = text;   // 예: https://is.gd/aBcDeF (~21자)
    urlEl.dataset.full = text;   // 단축 URL 자체를 복사 대상으로
  } catch (e) {
    // API 실패 시 전체 URL 단축 표시로 fallback
    urlEl.value        = shorten(fullUrl);
    urlEl.dataset.full = fullUrl;
  } finally {
    urlCopyBtn.disabled = false;
  }
}
function _fallbackCopy(text) {
  const ta = Object.assign(document.createElement('textarea'), { value: text });
  document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
}
function _flashBtn(id, msg) {
  const btn = document.getElementById(id), orig = btn.textContent;
  btn.textContent = msg; setTimeout(() => btn.textContent = orig, 1500);
}
async function copyShareCode() {
  const el = document.getElementById('share-code-input');
  const val = el.dataset.full || el.value;
  if (navigator.clipboard) await navigator.clipboard.writeText(val).catch(() => _fallbackCopy(val));
  else _fallbackCopy(val);
  _flashBtn('share-code-copy-btn', '복사됨!');
}
async function copyShareUrl() {
  const el = document.getElementById('share-url-input');
  const val = el.dataset.full || el.value;
  if (navigator.clipboard) await navigator.clipboard.writeText(val).catch(() => _fallbackCopy(val));
  else _fallbackCopy(val);
  _flashBtn('share-url-copy-btn', '복사됨!');
}

let _pendingImportPayload = null;

function openImportModal(payload) {
  _pendingImportPayload = payload;
  document.getElementById('import-meta').textContent =
    `BPM ${payload.bpm} · Capo ${payload.capo} · ${payload.col}칸 · 코드 ${payload.chords.length}개 · ${payload.arr.length}줄`;
  const sel = document.getElementById('import-project-select');
  sel.innerHTML = '<option value="">프로젝트 선택…</option>';
  loadProjects().forEach(p => {
    sel.appendChild(Object.assign(document.createElement('option'), { value: p.id, textContent: p.name }));
  });
  document.getElementById('import-new-name').value = '';
  document.getElementById('modal-import').classList.remove('hidden');
  lucide.createIcons();
}

function confirmImport(mode) {
  const payload = _pendingImportPayload; if (!payload) return;
  const opts = {
    applyBpm:  document.getElementById('import-apply-bpm').checked,
    applyCapo: document.getElementById('import-apply-capo').checked,
    applyCol:  document.getElementById('import-apply-col').checked,
  };
  let targetId;
  if (mode === 'new') {
    const name = document.getElementById('import-new-name').value.trim();
    if (!name) { alert('프로젝트 이름을 입력하세요.'); return; }
    const p = { id: genId(), name, pinned: false, pinnedOrder: 0, capo: 0, bpm: 120,
                colCount: 4, createdAt: Date.now(), updatedAt: Date.now(), chords: [], arrangement: [] };
    const list = loadProjects(); list.push(p); saveProjects(list); targetId = p.id;
  } else {
    targetId = document.getElementById('import-project-select').value;
    if (!targetId) { alert('프로젝트를 선택하세요.'); return; }
  }
  applyImportPayload(targetId, payload, opts);
  closeModal('modal-import'); _pendingImportPayload = null;
  renderSidebar(); populateProjectSelect();
  navigateTo('project', targetId);
}

function applyImportPayload(projectId, payload, opts) {
  const p = getProject(projectId); if (!p) return;
  if (opts.applyBpm)  p.bpm      = payload.bpm;
  if (opts.applyCapo) p.capo     = payload.capo;
  if (opts.applyCol)  p.colCount = payload.col;
  const indexToNewId = {};
  payload.chords.forEach(pc => {
    const newId = genId(); indexToNewId[pc.i] = newId;
    p.chords.push({ id: newId, name: pc.name, root: pc.root, triad: pc.triad,
      seventh: pc.seventh, func: pc.func, tensions: pc.tensions, bass: pc.bass,
      accidental: pc.accidental, dots: pc.dots, openMute: decodeOpenMute(pc.openMute),
      barre: pc.barre, fretNumber: pc.fretNumber, fingerNumMode: pc.fingerNumMode });
  });
  payload.arr.forEach((slotRow, rowIdx) => {
    const slots = (slotRow || []).map(idx =>
      idx !== null && indexToNewId[idx] !== undefined ? indexToNewId[idx] : null);
    while (slots.length < 8) slots.push(null);
    if (rowIdx < p.arrangement.length) {
      // 기존 라인이 있으면 텍스트는 보존하고 슬롯만 덮어쓰기
      p.arrangement[rowIdx].slots = slots.slice(0, 8);
    } else {
      // 기존 라인보다 많으면 새 빈 라인 추가
      p.arrangement.push({ id: genId(), text: '', slots: slots.slice(0, 8) });
    }
  });
  p.updatedAt = Date.now(); updateProject(p);
}

async function triggerManualImport() {
  const raw = document.getElementById('paste-share-input').value.trim();
  if (!raw) return;
  const payload = await parseShareCode(raw);
  if (!payload) { alert('유효하지 않은 공유 코드입니다.'); return; }
  document.getElementById('paste-share-input').value = '';
  openImportModal(payload);
}

// Android Activity → WebView 진입점
window._handleShareImport = async function(rawCode) {
  const payload = await parseShareCode(rawCode);
  if (payload) openImportModal(payload);
  else alert('공유 코드가 올바르지 않습니다.');
};

// ═══════════════════════════════════════════════════════════════
// 초기 렌더링
// ═══════════════════════════════════════════════════════════════
(function init() {
  renderSidebar();
  populateProjectSelect();
  lucide.createIcons();
  updateExportScaleOptions();
  renderPlanBadge();
  showOnboarding(); // 항상 시작 화면 표시
  initBilling();    // Android 인앱 결제 초기화 (비동기, 실패해도 앱 동작 유지)
  initSupabase().then(() => tryAutoSignIn()); // 백그라운드에서 세션 복원 시도

  // 새 프로젝트 모달 Enter 키 지원
  document.getElementById('create-project-name-input')
    .addEventListener('keydown', e => { if (e.key === 'Enter') confirmCreateProject(); });

  // export-scale 선택 시 플랜 체크 (disabled가 무시되는 환경 대비)
  const exportScaleEl = document.getElementById('export-scale');
  if (exportScaleEl) {
    exportScaleEl.addEventListener('change', () => {
      const scale = parseFloat(exportScaleEl.value);
      if (!canUseScale(scale)) {
        exportScaleEl.value = '1'; // 선택 되돌리기
        showUpgradeModal('scale_limit');
      }
    });
  }

  const shareParam = new URLSearchParams(location.search).get('share');
  if (shareParam) {
    history.replaceState(null, '', location.pathname);
    parseShareCode(shareParam).then(payload => {
      if (payload) openImportModal(payload);
      else alert('공유 코드가 올바르지 않습니다.');
    });
  }
})();
