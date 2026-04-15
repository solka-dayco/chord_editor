/**
 * 보이싱 라이브러리
 * ─────────────────────────────────────────────
 * 줄 순서: 6번줄(저음 E) → 1번줄(고음 e)
 * x = 뮤트, 숫자 = 프렛
 *
 * [헬퍼] fn(줄인덱스, 프렛, flat?)
 *   줄인덱스: 0=6번(E) 1=5번(A) 2=4번(D) 3=3번(G) 4=2번(B) 5=1번(e)
 *   예) fn(1, 4) → 'C#'   (5번줄 4프렛 = C#)
 *       fn(3, 2) → 'A'    (3번줄 2프렛 = A)
 */
(function () {
  const _PCS = [4, 9, 2, 7, 11, 4];
  const _S   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const _F   = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  function fn(si, fret, flat = false) {
    return (flat ? _F : _S)[(_PCS[si] + fret) % 12];
  }
  
  // ════════════════════════════════════════════
  // 1. 직접 입력
  // 형식: ['보이싱(6번→1번)', ['코드명1', '코드명2']]
  // ════════════════════════════════════════════
  const DIRECT = [
    // ── 개방 코드 ────────────────────────────
    // Major 코드
    ['x32010', ['C']],
    ['032010', ['C/E', 'C']],
    ['332010', ['C/G', 'C']],
    ['xx0232', ['D']],
    ['2x0232', ['D/F#']],
    ['x00232', ['D/A']],
    ['022100', ['E']],
    ['4x2400', ['E/G#']],
    ['x22100', ['E/B']],
    ['xx3211', ['F']],
    ['x03211', ['F/A']],
    ['x33211', ['F/C']],
    ['320003', ['G']],
    ['320033', ['G']],
    ['x20003', ['G/B']],
    ['x20033', ['G/B']],
    ['xx0003', ['G/D']],
    ['xx0033', ['G/D']],
    ['x02220', ['A']],
    ['x42220', ['A/C#']],
    ['002220', ['A/E']],
    // minor 코드
    ['xx0231', ['Dm']],
    ['x30231', ['Dm/C']],
    ['022000', ['Em']],
    ['322000', ['Em/G']],
    ['x02210', ['Am']],
    ['x32210', ['Am/C']],
    ['3x2210', ['Am/G']],
    // 여기에 추가 ↓

  ];

  // ════════════════════════════════════════════
  // 2. 폼(패턴) 기반 입력
  // pattern : 'x' | 숫자 | 'r' | 'r+N' | 'r-N'  (6번줄→1번줄)
  // rRange  : [최소r, 최대r]
  // name(r) : 코드명 반환 함수  ← fn() 사용 가능
  // ════════════════════════════════════════════
  const FORMULA = [

    // ── E형 코드 (6번줄 루트) ─────────────────
    { //Major
      pattern: ['r', 'r+2', 'r+2', 'r+1', 'r', 'r'],
      rRange: [0, 20],
      name: r => fn(0, r),
    },
    { //minor
      pattern: ['r', 'r+2', 'r+2', 'r', 'r', 'r'],
      rRange: [0, 20],
      name: r => fn(0, r) + 'm',
    },
    { //minor7
      pattern: ['r', 'r+2', 'r+2', 'r', 'r+3', 'r'],
      rRange: [0, 20],
      name: r => fn(0, r) + 'm7',
    },
    { //sus4
      pattern: ['r', 'r+2', 'r+2', 'r+2', 'r', 'r'],
      rRange: [0, 20],
      name: r => fn(0, r) + 'sus4',
    },
    { //7sus4
      pattern: ['r', 'r+2', 'r', 'r+2', 'r', 'r'],
      rRange: [0, 20],
      name: r => fn(0, r) + '7' + 'sus4',
    },


    // ── A형 코드 (5번줄 루트) ─────────────────
    {
      pattern: ['x', 'r', 'r+2', 'r+2', 'r+2', 'r'],
      rRange: [0, 20],
      name: r => fn(1, r),
    },
    {
      pattern: ['x', 'r', 'r+2', 'r+2', 'r+1', 'r'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'm',
    },
    {
      pattern: ['x', 'r', 'r+2', 'r+3', 'r+2', 'r'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'aug',
    },
    {
      pattern: ['x', 'r', 'r+2', 'r+2', 'r+3', 'r'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'sus4',
    },
    {
      pattern: ['x', 'r', 'r+2', 'r', 'r+3', 'r'],
      rRange: [0, 20],
      name: r => fn(1, r) + '7' + 'sus4',
    },
    {
      pattern: ['x', 'r', 'r+2', 'r+2', 'r', 'r'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'add9',
    },
    {
      pattern: ['x', 'r', 'r+2', 'r+1', 'r', 'r'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'M7' + '(9)',
    },

    //분수 코드 & 하이브리드 코드
    { //도미넌트 텐션 7sus4(9) 6번줄 루트
      pattern: ['r', 'x', 'r', 'r-1', 'r-2', 'x'],
      rRange: [0, 20],
      name: r => fn(2, r) + '/' + fn(0, r) ,
    },
    { //도미넌트 텐션 7sus4(9) 5번줄 루트
      pattern: ['x', 'r', 'r', 'r', 'r', 'x'],
      rRange: [0, 20],
      name: r => fn(3, r) + '/' + fn(1, r) ,
    },
    { //도미넌트 텐션 7sus4(9) 4번줄 루트
      pattern: ['x', 'x', 'r', 'r+2', 'r+1', 'r'],
      rRange: [0, 20],
      name: r => fn(4, r+1) + '/' + fn(2, r) ,
    },

    // Drop2 보이싱
    // M7
    {
      pattern: ['x', 'r', 'r+2', 'r+1', 'r+2', 'x'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'M7',
    },
    {
      pattern: ['x', 'r', 'r+2', 'r+1', 'r+2', 'r'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'M7',
    },
    // 1전위
    {
      pattern: ['x', 'r', 'r+2', 'r-2', 'r+1', 'x'],
      rRange: [0, 20],
      name: r => fn(3, r-2) + 'M7/' + fn(1, r),
    },
    // 2전위
    {
      pattern: ['x', 'r', 'r', 'r-1', 'r+2', 'x'],
      rRange: [0, 20],
      name: r => fn(2, r) + 'M7/' + fn(1, r),
    },
    // 3전위
    {
      pattern: ['x', 'r', 'r', 'r-2', 'r-1', 'x'],
      rRange: [0, 20],
      name: r => fn(4, r-1) + 'M7/' + fn(1, r),
    },
    // Dom.7
    {
      pattern: ['x', 'r', 'r+2', 'r', 'r+2', 'x'],
      rRange: [0, 20],
      name: r => fn(1, r) + '7',
    },
    {
      pattern: ['x', 'r', 'r+2', 'r', 'r+2', 'r'],
      rRange: [0, 20],
      name: r => fn(1, r) + '7',
    },
    // 1전위
    {
      pattern: ['x', 'r', 'r+1', 'r-2', 'r+1', 'x'],
      rRange: [0, 20],
      name: r => fn(3, r-2) + '7/' + fn(1, r),
    },
    // 2전위
    {
      pattern: ['x', 'r', 'r', 'r-1', 'r+1', 'x'],
      rRange: [0, 20],
      name: r => fn(2, r) + '7/' + fn(1, r),
    },
    // 3전위
    {
      pattern: ['x', 'r', 'r+1', 'r-1', 'r', 'x'],
      rRange: [0, 20],
      name: r => fn(4, r) + '7/' + fn(1, r),
    },
    // minor 7
    {
      pattern: ['x', 'r', 'r+2', 'r', 'r+1', 'x'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'm7',
    },
    {
      pattern: ['x', 'r', 'r+2', 'r', 'r+1', 'r'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'm7',
    },
    // 1전위
    {
      pattern: ['x', 'r', 'r+2', 'r-1', 'r+2', 'x'],
      rRange: [0, 20],
      name: r => fn(3, r-1) + 'm7/' + fn(1, r),
    },
    // 2전위
    {
      pattern: ['x', 'r', 'r', 'r-2', 'r+1', 'x'],
      rRange: [0, 20],
      name: r => fn(2, r) + 'm7/' + fn(1, r),
    },
    // 3전위
    {
      pattern: ['x', 'r', 'r', 'r-1', 'r', 'x'],
      rRange: [0, 20],
      name: r => fn(4, r) + 'm7/' + fn(1, r),
    },
    // half-diminished
    {
      pattern: ['x', 'r', 'r+1', 'r', 'r+1', 'x'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'm7(b5)',
    },
    // 1전위
    {
      pattern: ['x', 'r', 'r+2', 'r-1', 'r+1', 'x'],
      rRange: [0, 20],
      name: r => fn(3, r-1) + 'm7(b5)/' + fn(1, r),
    },
    // 2전위
    {
      pattern: ['x', 'r', 'r+1', 'r-1', 'r+2', 'x'],
      rRange: [0, 20],
      name: r => fn(2, r+1) + 'm7(b5)/' + fn(1, r),
    },
    // 3전위
    {
      pattern: ['x', 'r', 'r', 'r-2', 'r', 'x'],
      rRange: [0, 20],
      name: r => fn(4, r) + 'm7(b5)/' + fn(1, r),
    },

    // ── D형 코드 (4번줄 루트) ─────────────────
    // M7
    {
      pattern: ['x', 'x', 'r', 'r+2', 'r+2', 'r+2'],
      rRange: [0, 20],
      name: r => fn(2, r) + 'M7',
    },
    // 1전위
    {
      pattern: ['x', 'x', 'r', 'r+2', 'r-1', 'r+1'],
      rRange: [0, 20],
      name: r => fn(4, r-1) + 'M7/' + fn(2, r),
    },
    // 2전위
    {
      pattern: ['x', 'x', 'r', 'r', 'r', 'r+2'],
      rRange: [0, 20],
      name: r => fn(3, r) + 'M7/' + fn(2, r),
    },
    // 3전위
    {
      pattern: ['x', 'x', 'r', 'r', 'r-1', 'r-1'],
      rRange: [0, 20],
      name: r => fn(5, r-1) + 'M7/' + fn(2, r),
    },
    // Dom.7
    {
      pattern: ['x', 'x', 'r', 'r+2', 'r+1', 'r+2'],
      rRange: [0, 20],
      name: r => fn(2, r) + '7',
    },
    // 1전위
    {
      pattern: ['x', 'x', 'r', 'r+1', 'r-1', 'r+1'],
      rRange: [0, 20],
      name: r => fn(4, r-1) + '7/' + fn(2, r),
    },
    // 2전위
    {
      pattern: ['x', 'x', 'r', 'r', 'r', 'r+1'],
      rRange: [0, 20],
      name: r => fn(3, r) + '7/' + fn(2, r),
    },
    // 3전위
    {
      pattern: ['x', 'x', 'r', 'r+1', 'r', 'r'],
      rRange: [0, 20],
      name: r => fn(5, r) + '7/' + fn(2, r),
    },
    // minor 7
    {
      pattern: ['x', 'x', 'r', 'r+2', 'r+1', 'r+1'],
      rRange: [0, 20],
      name: r => fn(2, r) + 'm7',
    },
    // 1전위
    {
      pattern: ['x', 'x', 'r', 'r+2', 'r', 'r+2'],
      rRange: [0, 20],
      name: r => fn(4, r) + 'm7/' + fn(2, r),
    },
    // 2전위
    {
      pattern: ['x', 'x', 'r', 'r', 'r-1', 'r+1'],
      rRange: [0, 20],
      name: r => fn(3, r) + 'm7/' + fn(2, r),
    },
    // 3전위
    {
      pattern: ['x', 'x', 'r', 'r', 'r', 'r'],
      rRange: [0, 20],
      name: r => fn(5, r) + 'm7/' + fn(2, r),
    },
    // half-diminished
    {
      pattern: ['x', 'x', 'r', 'r+1', 'r+1', 'r+1'],
      rRange: [0, 20],
      name: r => fn(2, r) + 'm7(b5)',
    },
    // 1전위
    {
      pattern: ['x', 'x', 'r', 'r+2', 'r', 'r+1'],
      rRange: [0, 20],
      name: r => fn(4, r) + 'm7(b5)/' + fn(2, r),
    },
    // 2전위
    {
      pattern: ['x', 'x', 'r', 'r+1', 'r', 'r+2'],
      rRange: [0, 20],
      name: r => fn(3, r+1) + 'm7(b5)/' + fn(2, r),
    },
    // 3전위
    {
      pattern: ['x', 'x', 'r', 'r', 'r-1', 'r'],
      rRange: [0, 20],
      name: r => fn(5, r) + 'm7(b5)/' + fn(2, r),
    },


    // Drop3 보이싱 E형 코드
    // M7
    {
      pattern: ['r', 'x', 'r+1', 'r+1', 'r', 'x'],
      rRange: [0, 20],
      name: r => fn(0, r) + 'M7',
    },
    {
      pattern: ['r', 'r+2', 'r+1', 'r+1', 'r', 'x'],
      rRange: [0, 20],
      name: r => fn(0, r) + 'M7',
    },
    {
      pattern: ['r', 'r+2', 'r+1', 'r+1', 'r', 'r'],
      rRange: [0, 20],
      name: r => fn(0, r) + 'M7',
    },
    // 1전위
    {
      pattern: ['r', 'x', 'r-2', 'r', 'r', 'x'],
      rRange: [0, 20],
      name: r => fn(2, r-2) + 'M7/' + fn(0, r),
    },
    // 2전위
    {
      pattern: ['r', 'x', 'r-1', 'r+1', 'r-2', 'x'],
      rRange: [0, 20],
      name: r => fn(4, r-2) + 'M7/' + fn(0, r),
    },
    // 3전위
    {
      pattern: ['r', 'x', 'r-2', 'r-2', 'r-2', 'x'],
      rRange: [0, 20],
      name: r => fn(3, r-2) + 'M7/' + fn(0, r),
    },
    // dom.7
    {
      pattern: ['r', 'x', 'r', 'r+1', 'r', 'x'],
      rRange: [0, 20],
      name: r => fn(0, r) + '7',
    },
    {
      pattern: ['r', 'r+2', 'r', 'r+1', 'r', 'x'],
      rRange: [0, 20],
      name: r => fn(0, r) + '7',
    },
    {
      pattern: ['r', 'r+2', 'r', 'r+1', 'r', 'r'],
      rRange: [0, 20],
      name: r => fn(0, r) + '7',
    },
    // 1전위
    {
      pattern: ['r', 'x', 'r-2', 'r', 'r-1', 'x'],
      rRange: [0, 20],
      name: r => fn(2, r-2) + '7/' + fn(0, r),
    },
    // 2전위
    {
      pattern: ['r', 'x', 'r-1', 'r', 'r-2', 'x'],
      rRange: [0, 20],
      name: r => fn(4, r-2) + '7/' + fn(0, r),
    },
    // 3전위
    {
      pattern: ['r', 'x', 'r-1', 'r-1', 'r-1', 'x'],
      rRange: [0, 20],
      name: r => fn(3, r-1) + '7/' + fn(0, r),
    },
    // minor7
    {
      pattern: ['r', 'x', 'r', 'r', 'r', 'x'],
      rRange: [0, 20],
      name: r => fn(0, r) + 'm7',
    },
    {
      pattern: ['r', 'r+2', 'r', 'r', 'r', 'x'],
      rRange: [0, 20],
      name: r => fn(0, r) + 'm7',
    },
    {
      pattern: ['r', 'r+2', 'r', 'r', 'r', 'r'],
      rRange: [0, 20],
      name: r => fn(0, r) + 'm7',
    },
    // 1전위
    {
      pattern: ['r', 'x', 'r-1', 'r+1', 'r', 'x'],
      rRange: [0, 20],
      name: r => fn(2, r-1) + 'm7/' + fn(0, r),
    },
    // 2전위
    {
      pattern: ['r', 'x', 'r-2', 'r', 'r-2', 'x'],
      rRange: [0, 20],
      name: r => fn(4, r-2) + 'm7/' + fn(0, r),
    },
    // 3전위
    {
      pattern: ['r', 'x', 'r-1', 'r-1', 'r-2', 'x'],
      rRange: [0, 20],
      name: r => fn(3, r-1) + 'm7/' + fn(0, r),
    },
    // half-diminished
    {
      pattern: ['r', 'x', 'r', 'r', 'r-1', 'x'],
      rRange: [0, 20],
      name: r => fn(0, r) + 'm7(b5)',
    },
    // 1전위
    {
      pattern: ['r', 'x', 'r-1', 'r', 'r', 'x'],
      rRange: [0, 20],
      name: r => fn(2, r-1) + 'm7(b5)/' + fn(0, r),
    },
    // 2전위
    {
      pattern: ['r', 'x', 'r-1', 'r+1', 'r-1', 'x'],
      rRange: [0, 20],
      name: r => fn(4, r-1) + 'm7(b5)/' + fn(0, r),
    },
    // 3전위
    {
      pattern: ['r', 'x', 'r-2', 'r-1', 'r-2', 'x'],
      rRange: [0, 20],
      name: r => fn(3, r-1) + 'm7(b5)/' + fn(0, r),
    },
    // Drop3 보이싱 A형 코드
    // M7
    {
      pattern: ['x', 'r', 'x', 'r+1', 'r+2', 'r'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'M7',
    },
    // 1전위
    {
      pattern: ['x', 'r', 'x', 'r-2', 'r+1', 'r'],
      rRange: [0, 20],
      name: r => fn(3, r-2) + 'M7/' + fn(1, r),
    },
    // 2전위
    {
      pattern: ['x', 'r', 'x', 'r-1', 'r+2', 'r-2'],
      rRange: [0, 20],
      name: r => fn(5, r-2) + 'M7/' + fn(1, r),
    },
    // 3전위
    {
      pattern: ['x', 'r', 'x', 'r-2', 'r-1', 'r-2'],
      rRange: [0, 20],
      name: r => fn(4, r-1) + 'M7/' + fn(1, r),
    },
    // Dom.7
    {
      pattern: ['x', 'r', 'x', 'r', 'r+2', 'r'],
      rRange: [0, 20],
      name: r => fn(1, r) + '7',
    },
    // 1전위
    {
      pattern: ['x', 'r', 'x', 'r-2', 'r+1', 'r-1'],
      rRange: [0, 20],
      name: r => fn(3, r-2) + '7/' + fn(1, r),
    },
    // 2전위
    {
      pattern: ['x', 'r', 'x', 'r-1', 'r+1', 'r-2'],
      rRange: [0, 20],
      name: r => fn(2, r) + '7/' + fn(1, r),
    },
    // 3전위
    {
      pattern: ['x', 'r', 'x', 'r-1', 'r', 'r-1'],
      rRange: [0, 20],
      name: r => fn(4, r) + '7/' + fn(1, r),
    },
    // minor 7
    {
      pattern: ['x', 'r', 'x', 'r', 'r+1', 'r'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'm7',
    },
    // 1전위
    {
      pattern: ['x', 'r', 'x', 'r-1', 'r+2', 'r'],
      rRange: [0, 20],
      name: r => fn(3, r-1) + 'm7/' + fn(1, r),
    },
    // 2전위
    {
      pattern: ['x', 'r', 'x', 'r-2', 'r+1', 'r-2'],
      rRange: [0, 20],
      name: r => fn(5, r-2) + 'm7/' + fn(1, r),
    },
    // 3전위
    {
      pattern: ['x', 'r', 'x', 'r-1', 'r', 'r-2'],
      rRange: [0, 20],
      name: r => fn(4, r) + 'm7/' + fn(1, r),
    },
    // half-diminished
    {
      pattern: ['x', 'r', 'x', 'r', 'r+1', 'r-1'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'm7(b5)',
    },
    // 1전위
    {
      pattern: ['x', 'r', 'x', 'r-1', 'r+1', 'r'],
      rRange: [0, 20],
      name: r => fn(3, r-1) + 'm7(b5)/' + fn(1, r),
    },
    // 2전위
    {
      pattern: ['x', 'r', 'x', 'r-1', 'r+2', 'r-1'],
      rRange: [0, 20],
      name: r => fn(5, r-1) + 'm7(b5)/' + fn(1, r),
    },
    // 3전위
    {
      pattern: ['x', 'r', 'x', 'r-2', 'r', 'r-2'],
      rRange: [0, 20],
      name: r => fn(4, r) + 'm7(b5)/' + fn(1, r),
    },


    // Drop2,4 보이싱 E형 코드
    // M7
    {
      pattern: ['r', 'r+2', 'x', 'r+1', 'r+4', 'x'],
      rRange: [0, 20],
      name: r => fn(0, r) + 'M7',
    },
    // 1전위
    {
      pattern: ['r', 'r+2', 'x', 'r', 'r+1', 'x'],
      rRange: [0, 20],
      name: r => fn(4, r+1) + 'M7/' + fn(0, r),
    },
    // 2전위
    {
      pattern: ['r', 'r', 'x', 'r+1', 'r+2', 'x'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'M7/' + fn(0, r),
    },
    // 3전위
    {
      pattern: ['r', 'r', 'x', 'r-2', 'r+1', 'x'],
      rRange: [0, 20],
      name: r => fn(3, r-2) + 'M7/' + fn(0, r),
    },
    // Dom.7
    {
      pattern: ['r', 'r+2', 'x', 'r+1', 'r+3', 'x'],
      rRange: [0, 20],
      name: r => fn(0, r) + '7',
    },
    // 1전위
    {
      pattern: ['r', 'r+1', 'x', 'r', 'r+1', 'x'],
      rRange: [0, 20],
      name: r => fn(4, r+1) + '7/' + fn(0, r),
    },
    // 2전위
    {
      pattern: ['r', 'r', 'x', 'r', 'r+2', 'x'],
      rRange: [0, 20],
      name: r => fn(1, r) + '7/' + fn(0, r),
    },
    // 3전위
    {
      pattern: ['r', 'r+1', 'x', 'r-1', 'r+2', 'x'],
      rRange: [0, 20],
      name: r => fn(3, r-1) + '7/' + fn(0, r),
    },
    // minor 7
    {
      pattern: ['r', 'r+2', 'x', 'r', 'r+3', 'x'],
      rRange: [0, 20],
      name: r => fn(0, r, accidental === 'flat') + 'm7',
    },
    // 1전위
    {
      pattern: ['r', 'r+2', 'x', 'r+1', 'r+2', 'x'],
      rRange: [0, 20],
      name: r => fn(4, r+2) + 'm7/' + fn(0, r),
    },
    // 2전위
    {
      pattern: ['r', 'r', 'x', 'r', 'r+1', 'x'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'm7/' + fn(0, r),
    },
    // 3전위
    {
      pattern: ['r', 'r', 'x', 'r-1', 'r+2', 'x'],
      rRange: [0, 20],
      name: r => fn(3, r-1) + 'm7/' + fn(0, r),
    },
    // Half-diminished
    {
      pattern: ['r', 'r+1', 'x', 'r', 'r+3', 'x'],
      rRange: [0, 20],
      name: r => fn(0, r) + 'm7(b5)',
    },
    // 1전위
    {
      pattern: ['r', 'r+2', 'x', 'r', 'r+2', 'x'],
      rRange: [0, 20],
      name: r => fn(4, r+2) + 'm7(b5)/' + fn(0, r),
    },
    // 2전위
    {
      pattern: ['r', 'r+1', 'x', 'r+1', 'r+2', 'x'],
      rRange: [0, 20],
      name: r => fn(1, r+1) + 'm7(b5)/' + fn(0, r),
    },
    // 3전위
    {
      pattern: ['r', 'r', 'x', 'r-1', 'r+1', 'x'],
      rRange: [0, 20],
      name: r => fn(3, r-1) + 'm7(b5)/' + fn(0, r),
    },
    //5번줄 A형코드
    // M7
    {
      pattern: ['x', 'r', 'r+2', 'x', 'r+2', 'r+4'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'M7',
    },
    // 1전위
    {
      pattern: ['x', 'r', 'r+2', 'x', 'r+1', 'r+1'],
      rRange: [0, 20],
      name: r => fn(5, r+1) + 'M7/' + fn(1, r),
    },
    // 2전위
    {
      pattern: ['x', 'r', 'r', 'x', 'r+2', 'r+2'],
      rRange: [0, 20],
      name: r => fn(2, r) + 'M7/' + fn(1, r),
    },
    // 3전위
    {
      pattern: ['x', 'r', 'r', 'x', 'r-1', 'r+1'],
      rRange: [0, 20],
      name: r => fn(4, r-1) + 'M7/' + fn(1, r),
    },
    // Dom.7
    {
      pattern: ['x', 'r', 'r+2', 'x', 'r+2', 'r+3'],
      rRange: [0, 20],
      name: r => fn(1, r) + '7',
    },
    // 1전위
    {
      pattern: ['x', 'r', 'r+1', 'x', 'r+1', 'r+1'],
      rRange: [0, 20],
      name: r => fn(5, r+1) + '7/' + fn(1, r),
    },
    // 2전위
    {
      pattern: ['x', 'r', 'r', 'x', 'r+1', 'r+2'],
      rRange: [0, 20],
      name: r => fn(2, r) + '7/' + fn(1, r),
    },
    // 3전위
    {
      pattern: ['x', 'r', 'r+1', 'x', 'r', 'r+2'],
      rRange: [0, 20],
      name: r => fn(4, r) + '7/' + fn(1, r),
    },
    // minor7
    {
      pattern: ['x', 'r', 'r+2', 'x', 'r+1', 'r+3'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'm7',
    },
    // 1전위
    {
      pattern: ['x', 'r', 'r+2', 'x', 'r+2', 'r+2'],
      rRange: [0, 20],
      name: r => fn(5, r+2) + 'm7/' + fn(1, r),
    },
    // 2전위
    {
      pattern: ['x', 'r', 'r', 'x', 'r+1', 'r+1'],
      rRange: [0, 20],
      name: r => fn(2, r) + 'm7/' + fn(1, r),
    },
    // 3전위
    {
      pattern: ['x', 'r', 'r', 'x', 'r', 'r+2'],
      rRange: [0, 20],
      name: r => fn(4, r) + 'm7/' + fn(1, r),
    },
    // Half-diminished
    {
      pattern: ['x', 'r', 'r+1', 'x', 'r+1', 'r+3'],
      rRange: [0, 20],
      name: r => fn(1, r) + 'm7(b5)',
    },
    // 1전위
    {
      pattern: ['x', 'r', 'r+2', 'x', 'r+1', 'r+2'],
      rRange: [0, 20],
      name: r => fn(5, r+2) + 'm7(b5)/' + fn(1, r),
    },
    // 2전위
    {
      pattern: ['x', 'r', 'r+1', 'x', 'r+2', 'r+2'],
      rRange: [0, 20],
      name: r => fn(2, r+1) + 'm7(b5)/' + fn(1, r),
    },
    // 3전위
    {
      pattern: ['x', 'r', 'r', 'x', 'r', 'r+1'],
      rRange: [0, 20],
      name: r => fn(4, r) + 'm7(b5)/' + fn(1, r),
    },


    // ── A형 1전위 (5번줄 루트, 6번줄 3도 베이스) ─
    // x r (r-2) (r-2) (r-2) x
    // r=4 → A/C#,  r=6 → B/D#,  r=7 → C/E ...
    {
      pattern: ['x', 'r', 'r-2', 'r-2', 'r-2', 'x'],
      rRange: [2, 12],
      name: r => `${fn(3, r - 2)}/${fn(1, r)}`,
    },

    // ── E형 코드 (6번줄 루트) ─────────────────
    // r (r+2) (r+2) (r+1) r r
    // r=0 → E, r=2 → F#, r=5 → A, r=7 → B ...
    {
      pattern: ['r', 'r+2', 'r+2', 'r+1', 'r', 'r'],
      rRange: [0, 12],
      name: r => fn(0, r),
    },

    // 여기에 추가 ↓

  ];

  // ─── 자동 처리 (직접 수정 불필요) ────────────

  function evalPat(pattern, r) {
    return pattern.map(p => {
      if (p === 'x') return null;
      if (typeof p === 'number') return p;
      if (p === 'r') return r;
      const m = String(p).match(/^r([+-]\d+)$/);
      if (m) return r + parseInt(m[1], 10);
      return parseInt(p, 10);
    });
  }

  DIRECT.forEach(([v, names]) => chordSuggester.addVoicing(v, names));

  FORMULA.forEach(({ pattern, rRange, name }) => {
    for (let r = rRange[0]; r <= rRange[1]; r++) {
      const frets = evalPat(pattern, r);
      if (frets.some(f => f !== null && f < 0)) continue;
      chordSuggester.addVoicing(frets, [name(r)]);
    }
  });

})();
