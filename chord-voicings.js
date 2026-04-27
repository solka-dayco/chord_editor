// ═══════════════════════════════════════════════════════════════
// chord-voicings.js  — 코드 라이브러리 보이싱 원본 데이터
// ═══════════════════════════════════════════════════════════════
//
// 줄 순서: 6번줄(저음 E) → 1번줄(고음 e)  [공백 구분 문자열]
//
// frets  : x=뮤트(×)  |  0=개방(○)  |  숫자=프렛
//          (패턴 한정)  r=근음프렛  |  r+N / r-N=상대프렛
// fingers: x=없음  |  1~4=손가락번호  |  T=엄지(Thumb)
//
// ── CHORD_STATIC ─────────────────────────────────────────────
//   형식: [ frets문자열, names배열, fingers문자열, quality문자열, fretNumber? ]
//   names 요소가 복수이면 → 동일 보이싱을 공유하는 독립 엔트리 각각 생성
//   quality: 정렬 기준 태그
//   fretNumber: (선택) 캔버스에 표시할 프렛 번호 — 생략 시 자동 계산
//     'M' | 'm' | 'M7' | '7' | 'm7' | 'sus4' | '7sus4' | 'add9' |
//     'sus2' | 'aug' | 'dim' | 'aug7' | 'dim7' | 'm7(b5)' | '6' | 'm6' |
//     'slash' | 'hybrid'
//
// ── CHORD_PATTERN ────────────────────────────────────────────
//   형식: { pattern, rootStr, fingers, barre, quality, fretNumber? }
//   rootStr    : 근음 현 번호 (6=6번줄, 5=5번줄, 4=4번줄)
//   barre      : true → r 프렛에 바레 자동 생성
//   quality    : 정렬 기준 + 코드명 자동 생성 접미사
//               (코드명 = rootStr 현의 r프렛 음이름 + quality접미사)
//               단, 'M'은 접미사 없음 (단순 메이저)
//   fretNumber : (선택) 캔버스에 표시할 프렛 번호 — 생략 시 Math.max(2, r) 자동 계산
//   name       : (r, flat) => string  ← 복잡한 이름이 필요할 때 직접 지정

// ════════════════════════════════════════════════════════════════
// 1. 정적 보이싱
// ════════════════════════════════════════════════════════════════
window.CHORD_STATIC = [

  // ── A 계열 ────────────────────────────────────────────────
  //          frets           names     fingers         quality  fret
  ['x 0 2 2 2 0',  ['A'],    'x x 1 2 3 x',  'M',  2],
  ['x 0 2 2 1 0',  ['Am'],   'x x 2 3 1 x',  'm',  2],
  ['x 0 2 2 3 0',  ['Asus4'],   'x x 2 3 4 x',  'sus4',  2],
  ['x 0 2 2 0 0',  ['Asus2'],   'x x 2 3 x x',  'sus2',  2],
  ['x 0 2 4 2 0',  ['Aadd9'],   'x x 1 3 1 x',  'add9',  2],
  ['x 0 2 0 1 0',  ['Am7'],  'x x 2 x 1 x',  'm7', 2],
  ['x 0 2 0 2 0',  ['A7'],   'x x 2 x 3 x',  '7',  2],
  
  
  // ── G 계열 ────────────────────────────────────────────────
  ['3 2 0 0 0 3',  ['G'],    '2 1 x x x 3',  'M',  2],
  ['3 2 0 0 0 3',  ['G'],    '3 2 x x x 4',  'M',  2],
  ['3 2 0 0 0 1',  ['G7'],   '3 2 x x x 1',  '7',  2],
  // ── minor 오픈 ────────────────────────────────────────────────
  ['0 2 2 0 0 0',  ['Em'],   'x 1 2 x x x',  'm',  2],
  ['x x 0 2 3 1',  ['Dm'],   'x x x 2 3 1',  'm',  2],
  // ── Major 7 오픈 ─────────────────────────────────────────────
  ['x 3 2 0 0 0',  ['CM7'],  'x 3 2 x x x',  'M7', 2],
  ['x x 0 2 2 2',  ['DM7'],  'x x x 2 3 4',  'M7', 2],
  ['0 2 1 1 0 0',  ['EM7'],  'x 3 2 1 x x',  'M7', 2],

  // ── Dominant 7 오픈 ──────────────────────────────────────────
  ['3 2 0 0 0 1',  ['G7'],   '3 2 x x x 1',  '7',  2],
  ['x 3 2 3 1 0',  ['C7'],   'x 3 2 4 1 x',  '7',  2],
  ['x x 0 2 1 2',  ['D7'],   'x x x 2 1 3',  '7',  2],
  ['0 2 0 1 0 0',  ['E7'],   'x 2 x 1 x x',  '7',  2],
  

  // ── minor 7 오픈 ─────────────────────────────────────────────
  ['0 2 0 0 0 0',  ['Em7'],  'x 2 x x x x',  'm7', 2],
  ['0 2 2 0 3 0',  ['Em7'],  'x 1 2 x 3 x',  'm7', 2],
  
  ['x x 0 2 1 1',  ['Dm7'],  'x x x 2 1 1',  'm7', 2],
  ['x 3 2 0 1 0',  ['C'],    'x 3 2 x 1 x',  'M',  2],
  ['x x 0 2 3 2',  ['D'],    'x x x 1 3 2',  'M',  2],
  ['0 2 2 1 0 0',  ['E'],    'x 2 3 1 x x',  'M',  2],
  // 여기에 추가 ↓

];

// ════════════════════════════════════════════════════════════════
// 2. 패턴 보이싱
// ════════════════════════════════════════════════════════════════
window.CHORD_PATTERN = [

  // ── name 함수 작성 가이드 (분수코드 등 코드명이 복잡할 때) ───────
  //   chordNoteName(si, fret, flat) → 음이름  |  r값의 위치는 코드 프레임의 첫번쨰 프랫
  //   
  //   예) E형 분수코드  근음=6번줄 r프렛 / 베이스=3번줄 r+1프렛
  //   name: (r, flat) => chordNoteName(0, r, flat) + '/' + chordNoteName(3, r + 1, flat)
  //   quailty 값 : 'M' | 'm' | 'M7' | '7' | 'm7' | 'sus4' | '7sus4' | 'add9' | 'sus2' | 'aug' | 'dim' | 'aug7' | 'dim7' | 'm7(b5)' | '6' | 'm6' | 'slash' | 'hybrid'
  // ── Triad 코드 ─────────────────────────────────────
  // Major 코드
  { pattern: 'r r+2 r+2 r+1 r r', rootStr: 6, fingers: '1 3 4 2 1 1', barre: true, quality: 'M', name: (r, flat) => chordNoteName(0, r, flat)},
  { pattern: 'x r r+2 r+2 r+2 r', rootStr: 5, fingers: 'x 1 2 3 4 1', barre: true, quality: 'M', name: (r, flat) => chordNoteName(1, r, flat)},
  { pattern: 'x x r r+2 r+3 r+2', rootStr: 4, fingers: 'x x 1 2 4 3', barre: true, quality: 'M', name: (r, flat) => chordNoteName(2, r, flat)},

  // minor 코드
  { pattern: 'r r+2 r+2 r r r', rootStr: 6, fingers: '1 3 4 1 1 1', barre: true, quality: 'm', name: (r, flat) => chordNoteName(0, r, flat) + 'm'},
  { pattern: 'x r r+2 r+2 r+1 r', rootStr: 5, fingers: 'x 1 2 4 3 1', barre: true, quality: 'm', name: (r, flat) => chordNoteName(1, r, flat) + 'm'},
  { pattern: 'x x r r+2 r+3 r+1', rootStr: 4, fingers: 'x x 1 3 4 2', barre: true, quality: 'm', name: (r, flat) => chordNoteName(2, r, flat) + 'm'},

  // sus4 코드
  { pattern: 'r r+2 r+2 r+2 r r', rootStr: 6, fingers: '1 2 3 4 1 1', barre: true, quality: 'sus4', name: (r, flat) => chordNoteName(0, r, flat) + 'sus4'},
  { pattern: 'x r r+2 r+2 r+3 r', rootStr: 5, fingers: 'x 1 2 3 4 1', barre: true, quality: 'sus4', name: (r, flat) => chordNoteName(1, r, flat) + 'sus4'},
  { pattern: 'x x r r+2 r+3 r+3', rootStr: 4, fingers: 'x x 1 2 3 4', barre: true, quality: 'sus4', name: (r, flat) => chordNoteName(2, r, flat) + 'sus4'},

  // sus2 코드
  { pattern: 'x r r+2 r+2 r r', rootStr: 5, fingers: 'x 1 3 4 1 1', barre: true, quality: 'sus2', name: (r, flat) => chordNoteName(1, r, flat) + 'sus2'},
  { pattern: 'x x r r+2 r+3 r', rootStr: 4, fingers: 'x x 1 3 4 1', barre: true, quality: 'sus2', name: (r, flat) => chordNoteName(2, r, flat) + 'sus2'},

  // ── 7th 코드 ─────────────────────────────────────
  // M7 코드 (CAGED 시스템)
  { pattern: 'r r+2 r+1 r+1 r r', rootStr: 6, fingers: '1 4 2 3 1 1', barre: true, quality: 'M7', name: (r, flat) => chordNoteName(0, r, flat) + 'M7'},
  { pattern: 'x r r+2 r+1 r+2 r', rootStr: 5, fingers: 'x 1 3 2 4 1', barre: true, quality: 'M7', name: (r, flat) => chordNoteName(1, r, flat) + 'M7'},
  { pattern: 'x x r r+2 r+2 r+2', rootStr: 4, fingers: 'x x 1 2 3 4', barre: true, quality: 'M7', name: (r, flat) => chordNoteName(2, r, flat) + 'M7'},
  // 쉘 보이싱
  { pattern: 'r x r+1 r+1 r x', rootStr: 6, fingers: '1 x 2 3 1 x', barre: true, quality: 'M7', name: (r, flat) => chordNoteName(0, r, flat) + 'M7'},
  { pattern: 'r x r+1 r+1 r x', rootStr: 6, fingers: 'T x 2 3 1 x', barre: false, quality: 'M7', name: (r, flat) => chordNoteName(0, r, flat) + 'M7'},
  { pattern: 'x r r+2 r+1 r+2 x', rootStr: 5, fingers: 'x 1 2 3 4 x', barre: true, quality: 'M7', name: (r, flat) => chordNoteName(1, r, flat) + 'M7'},

  // dom.7 코드 (CAGED 시스템)
  { pattern: 'r r+2 r r+1 r r', rootStr: 6, fingers: '1 3 1 2 1 1', barre: true, quality: '7', name: (r, flat) => chordNoteName(0, r, flat) + '7'},
  { pattern: 'x r r+2 r r+2 r', rootStr: 5, fingers: 'x 1 3 1 4 1', barre: true, quality: '7', name: (r, flat) => chordNoteName(1, r, flat) + '7'},
  { pattern: 'x x r r+2 r+1 r+2', rootStr: 4, fingers: 'x x 1 3 2 4', barre: true, quality: '7', name: (r, flat) => chordNoteName(2, r, flat) + '7'},
  // 쉘 보이싱
  { pattern: 'r x r r+1 r x', rootStr: 6, fingers: '1 x 1 2 1 x', barre: true, quality: '7', name: (r, flat) => chordNoteName(0, r, flat) + '7'},
  { pattern: 'r x r r+1 r x', rootStr: 6, fingers: 'T x 2 3 1 x', barre: false, quality: '7', name: (r, flat) => chordNoteName(0, r, flat) + '7'},
  { pattern: 'x r+2 r+1 r+2 r x', rootStr: 5, fingers: 'x 3 2 4 1 x', barre: true, quality: '7', name: (r, flat) => chordNoteName(1, r+2, flat) + '7'},

  // 6 코드
  { pattern: 'r+1 x r r+2 r+1 x', rootStr: 6, fingers: '2 x 1 4 3 x', barre: false, quality: '6', name: (r, flat) => chordNoteName(0, r+1, flat) + '6'},
  { pattern: 'x r+2 r+1 r+1 r x', rootStr: 5, fingers: 'x 4 2 3 1 x', barre: false, quality: '6', name: (r, flat) => chordNoteName(1, r+2, flat) + '6'},
  { pattern: 'x r x r+2 r+2 r+2', rootStr: 5, fingers: 'x 1 x 2 3 4', barre: false, quality: '6', name: (r, flat) => chordNoteName(1, r, flat) + '6'},
  { pattern: 'x x r r+2 r r+2', rootStr: 4, fingers: 'x x 1 3 1 4', barre: true, quality: '6', name: (r, flat) => chordNoteName(2, r, flat) + '6'},

  // 7sus4 코드 (CAGED 시스템)
  { pattern: 'r r+2 r r+2 r r', rootStr: 6, fingers: '1 3 1 4 1 1', barre: true, quality: '7sus4', name: (r, flat) => chordNoteName(0, r, flat) + '7sus4'},
  { pattern: 'x r r+2 r r+3 r', rootStr: 5, fingers: 'x 1 3 1 4 1', barre: true, quality: '7sus4', name: (r, flat) => chordNoteName(1, r, flat) + '7sus4'},
  { pattern: 'x x r r+2 r+1 r+3', rootStr: 4, fingers: 'x x 1 3 2 4', barre: true, quality: '7sus4', name: (r, flat) => chordNoteName(2, r, flat) + '7sus4'},


  // mM7 코드 (CAGED 시스템)
  { pattern: 'r r+2 r+1 r r r', rootStr: 6, fingers: '1 3 2 1 1 1', barre: true, quality: 'mM7', name: (r, flat) => chordNoteName(0, r, flat) + 'mM7'},
  { pattern: 'r+1 x r+2 r+1 r+1 x', rootStr: 6, fingers: 'T x 3 2 1 x', barre: false, quality: 'mM7', name: (r, flat) => chordNoteName(0, r+1, flat) + 'mM7'},
  { pattern: 'x r r+2 r+1 r+1 r', rootStr: 5, fingers: 'x 1 4 2 3 1', barre: true, quality: 'mM7', name: (r, flat) => chordNoteName(1, r, flat) + 'mM7'},
  { pattern: 'x x r r+2 r+2 r+1', rootStr: 4, fingers: 'x x 1 3 4 2', barre: false, quality: 'mM7', name: (r, flat) => chordNoteName(2, r, flat) + 'mM7'},

  // m7 코드 (CAGED 시스템)
  { pattern: 'r r+2 r r r r', rootStr: 6, fingers: '1 3 1 1 1 1', barre: true, quality: 'm7', name: (r, flat) => chordNoteName(0, r, flat) + 'm7'},
  { pattern: 'r r+2 r+2 r r+3 r', rootStr: 6, fingers: '1 2 3 1 4 1', barre: true, quality: 'm7', name: (r, flat) => chordNoteName(0, r, flat) + 'm7'},
  { pattern: 'x r r+2 r r+1 r', rootStr: 5, fingers: 'x 1 3 1 2 1', barre: true, quality: 'm7', name: (r, flat) => chordNoteName(1, r, flat) + 'm7'},
  { pattern: 'x x r r+2 r+1 r+1', rootStr: 4, fingers: 'x x 1 4 2 3', barre: true, quality: 'm7', name: (r, flat) => chordNoteName(2, r, flat) + 'm7'},
  // 쉘 보이싱
  { pattern: 'r+1 x r+1 r+1 r+1 x', rootStr: 6, fingers: '1 x 2 3 4 x', barre: false, quality: 'm7', name: (r, flat) => chordNoteName(0, r+1, flat) + 'm7'},
  { pattern: 'r+1 x r+1 r+1 r+1 x', rootStr: 6, fingers: 'T x 2 3 4 x', barre: false, quality: 'm7', name: (r, flat) => chordNoteName(0, r+1, flat) + 'm7'},
  { pattern: 'x r+1 x r+1 r+2 x', rootStr: 5, fingers: 'x 1 x 2 3 x', barre: false, quality: 'm7', name: (r, flat) => chordNoteName(1, r+1, flat) + 'm7'},

  // m6 코드
  { pattern: 'r+1 x r r+1 r+1 x', rootStr: 6, fingers: '2 x 1 3 4 x', barre: false, quality: 'm6', name: (r, flat) => chordNoteName(0, r+1, flat) + 'm6'},
  { pattern: 'x r+1 x r r+2 r+1', rootStr: 5, fingers: 'x 2 x 1 4 3', barre: false, quality: 'm6', name: (r, flat) => chordNoteName(1, r+1, flat) + 'm6'},
  { pattern: 'x x r r+2 r r+1', rootStr: 4, fingers: 'x x 1 3 1 2', barre: true, quality: 'm6', name: (r, flat) => chordNoteName(2, r, flat) + 'm6'},

  // m7(b5) 코드 쉘 보이싱
  { pattern: 'r+1 x r+1 r+1 r x', rootStr: 6, fingers: '2 x 3 4 1 x', barre: true, quality: 'm7(b5)', name: (r, flat) => chordNoteName(0, r+1, flat) + 'm7(b5)'},
  { pattern: 'x r+1 r+2 r+1 r+2 x', rootStr: 5, fingers: 'x 1 3 2 4 x', barre: true, quality: 'm7(b5)', name: (r, flat) => chordNoteName(1, r+1, flat) + 'm7(b5)'},
  { pattern: 'x x r+1 r+2 r+2 r+2', rootStr: 4, fingers: 'x x 1 2 3 4', barre: true, quality: 'm7(b5)', name: (r, flat) => chordNoteName(2, r+1, flat) + 'm7(b5)'},

  // dim7 코드 쉘 보이싱
  { pattern: 'r+2 x r+1 r+2 r+1 x', rootStr: 6, fingers: '2 x 1 3 1 x', barre: true, quality: 'dim7', name: (r, flat) => chordNoteName(0, r+2, flat) + 'dim7'}, // -> 바레 적용 안되고 있음.
  { pattern: 'x r+1 r+2 r r+2 x', rootStr: 5, fingers: 'x 2 3 1 4 x', barre: true, quality: 'dim7', name: (r, flat) => chordNoteName(1, r+1, flat) + 'dim7'},
  { pattern: 'x x r+1 r+2 r+1 r+2', rootStr: 4, fingers: 'x x 1 3 2 4', barre: true, quality: 'dim7', name: (r, flat) => chordNoteName(2, r+1, flat) + 'dim7'},

  // ── 전위 코드 ─────────────────────────────────────


  // 여기에 추가 ↓
 
];
