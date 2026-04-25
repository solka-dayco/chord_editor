// ═══════════════════════════════════════════════════════════════
// chords-library.js  — 코드 라이브러리 데이터
// ═══════════════════════════════════════════════════════════════
(function () {
  'use strict';

  // ── 헬퍼 (voicing-library.js와 동일) ─────────────────────────
  const _PCS = [4, 9, 2, 7, 11, 4];
  const _S   = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const _F   = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

  function fn(si, fret, flat = false) {
    return (flat ? _F : _S)[(_PCS[si] + fret) % 12];
  }

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

  // ── 품질 정렬 순서 ────────────────────────────────────────────
  const QUALITY_ORDER = [
    'M', 'm', 'M7', '7', 'm7', 'sus4', '7sus4', 'add9',
    'aug', 'dim', 'aug7', 'dim7', 'm7(b5)', '6', 'm6'
  ];

  // ── 패턴 기반 보이싱 (바레 코드) ─────────────────────────────
  //   pattern  : 6번 줄→1번 줄 순 (index 0 = 6번줄)
  //   rRange   : [min, max] root fret 범위
  //   name     : (r, flat) => 코드명 문자열
  //   fingering: 줄별 손가락 번호 (null = 오픈/뮤트)
  //   hasBarre : true 이면 r번 프렛에 바레 자동 생성
  const LIB_PATTERNS = [

    // ── Major ─────────────────────────────────────────────────
    {
      quality: 'M', label: 'E형 바레',
      pattern: ['r', 'r+2', 'r+2', 'r+1', 'r', 'r'],
      rRange: [0, 11],
      fingering: [1, 3, 4, 2, 1, 1],
      hasBarre: true,
      name: (r, flat) => fn(0, r, flat),
    },
    {
      quality: 'M', label: 'A형 바레',
      pattern: ['x', 'r', 'r+2', 'r+2', 'r+2', 'r'],
      rRange: [0, 11],
      fingering: [null, 1, 3, 3, 3, 1],
      hasBarre: true,
      name: (r, flat) => fn(1, r, flat),
    },

    // ── minor ─────────────────────────────────────────────────
    {
      quality: 'm', label: 'Em형 바레',
      pattern: ['r', 'r+2', 'r+2', 'r', 'r', 'r'],
      rRange: [0, 11],
      fingering: [1, 3, 4, 1, 1, 1],
      hasBarre: true,
      name: (r, flat) => fn(0, r, flat) + 'm',
    },
    {
      quality: 'm', label: 'Am형 바레',
      pattern: ['x', 'r', 'r+2', 'r+2', 'r+1', 'r'],
      rRange: [0, 11],
      fingering: [null, 1, 3, 4, 2, 1],
      hasBarre: true,
      name: (r, flat) => fn(1, r, flat) + 'm',
    },

    // ── Major 7 ───────────────────────────────────────────────
    {
      quality: 'M7', label: 'E형 M7 바레',
      pattern: ['r', 'r+2', 'r+1', 'r+1', 'r', 'r'],
      rRange: [0, 11],
      fingering: [1, 3, 2, 2, 1, 1],
      hasBarre: true,
      name: (r, flat) => fn(0, r, flat) + 'M7',
    },
    {
      quality: 'M7', label: 'A형 M7 바레',
      pattern: ['x', 'r', 'r+2', 'r+1', 'r+2', 'r'],
      rRange: [0, 11],
      fingering: [null, 1, 3, 2, 4, 1],
      hasBarre: true,
      name: (r, flat) => fn(1, r, flat) + 'M7',
    },

    // ── Dominant 7 ────────────────────────────────────────────
    {
      quality: '7', label: 'E형 7 바레',
      pattern: ['r', 'r+2', 'r', 'r+1', 'r', 'r'],
      rRange: [0, 11],
      fingering: [1, 3, 1, 2, 1, 1],
      hasBarre: true,
      name: (r, flat) => fn(0, r, flat) + '7',
    },
    {
      quality: '7', label: 'A형 7 바레',
      pattern: ['x', 'r', 'r+2', 'r', 'r+2', 'r'],
      rRange: [0, 11],
      fingering: [null, 1, 3, 1, 4, 1],
      hasBarre: true,
      name: (r, flat) => fn(1, r, flat) + '7',
    },

    // ── minor 7 ───────────────────────────────────────────────
    {
      quality: 'm7', label: 'Em형 m7 바레',
      pattern: ['r', 'r+2', 'r', 'r', 'r', 'r'],
      rRange: [0, 11],
      fingering: [1, 3, 1, 1, 1, 1],
      hasBarre: true,
      name: (r, flat) => fn(0, r, flat) + 'm7',
    },
    {
      quality: 'm7', label: 'Am형 m7 바레',
      pattern: ['x', 'r', 'r+2', 'r', 'r+1', 'r'],
      rRange: [0, 11],
      fingering: [null, 1, 3, 1, 2, 1],
      hasBarre: true,
      name: (r, flat) => fn(1, r, flat) + 'm7',
    },

    // ── sus4 ──────────────────────────────────────────────────
    {
      quality: 'sus4', label: 'E형 sus4',
      pattern: ['r', 'r+2', 'r+2', 'r+2', 'r', 'r'],
      rRange: [0, 11],
      fingering: [1, 3, 3, 3, 1, 1],
      hasBarre: true,
      name: (r, flat) => fn(0, r, flat) + 'sus4',
    },
    {
      quality: 'sus4', label: 'A형 sus4',
      pattern: ['x', 'r', 'r+2', 'r+2', 'r+3', 'r'],
      rRange: [0, 11],
      fingering: [null, 1, 2, 3, 4, 1],
      hasBarre: true,
      name: (r, flat) => fn(1, r, flat) + 'sus4',
    },

    // ── 7sus4 ─────────────────────────────────────────────────
    {
      quality: '7sus4', label: 'A형 7sus4',
      pattern: ['x', 'r', 'r', 'r', 'r+3', 'r'],
      rRange: [0, 11],
      fingering: [null, 1, 1, 1, 4, 1],
      hasBarre: true,
      name: (r, flat) => fn(1, r, flat) + '7sus4',
    },
  ];

  // ── 정적 오픈 보이싱 ─────────────────────────────────────────
  //   frets   : [6번줄, 5번줄, 4번줄, 3번줄, 2번줄, 1번줄]
  //             null = 연주 안 함, 0 = 개방현
  //   openMute: 'mute'=×, 'open'=○, null=점(dot)으로 표시
  const LIB_STATIC = [

    // ── Major 오픈 ────────────────────────────────────────────
    {
      quality: 'M', label: 'Open', root: 'C',
      frets:    [null, 3, 2, 0, 1, 0],
      fingering:[null, 3, 2, null, 1, null],
      openMute: ['mute', null, null, 'open', null, 'open'],
    },
    {
      quality: 'M', label: 'Open', root: 'D',
      frets:    [null, null, 0, 2, 3, 2],
      fingering:[null, null, null, 1, 3, 2],
      openMute: ['mute', 'mute', 'open', null, null, null],
    },
    {
      quality: 'M', label: 'Open', root: 'E',
      frets:    [0, 2, 2, 1, 0, 0],
      fingering:[null, 2, 3, 1, null, null],
      openMute: ['open', null, null, null, 'open', 'open'],
    },
    {
      quality: 'M', label: 'Open', root: 'G',
      frets:    [3, 2, 0, 0, 0, 3],
      fingering:[2, 1, null, null, null, 3],
      openMute: [null, null, 'open', 'open', 'open', null],
    },
    {
      quality: 'M', label: 'Open', root: 'A',
      frets:    [null, 0, 2, 2, 2, 0],
      fingering:[null, null, 1, 2, 3, null],
      openMute: ['mute', 'open', null, null, null, 'open'],
    },

    // ── minor 오픈 ────────────────────────────────────────────
    {
      quality: 'm', label: 'Open', root: 'Em',
      frets:    [0, 2, 2, 0, 0, 0],
      fingering:[null, 2, 3, null, null, null],
      openMute: ['open', null, null, 'open', 'open', 'open'],
    },
    {
      quality: 'm', label: 'Open', root: 'Am',
      frets:    [null, 0, 2, 2, 1, 0],
      fingering:[null, null, 2, 3, 1, null],
      openMute: ['mute', 'open', null, null, null, 'open'],
    },
    {
      quality: 'm', label: 'Open', root: 'Dm',
      frets:    [null, null, 0, 2, 3, 1],
      fingering:[null, null, null, 2, 3, 1],
      openMute: ['mute', 'mute', 'open', null, null, null],
    },

    // ── Major 7 오픈 ──────────────────────────────────────────
    {
      quality: 'M7', label: 'Open', root: 'CM7',
      frets:    [null, 3, 2, 0, 0, 0],
      fingering:[null, 3, 2, null, null, null],
      openMute: ['mute', null, null, 'open', 'open', 'open'],
    },
    {
      quality: 'M7', label: 'Open', root: 'DM7',
      frets:    [null, null, 0, 2, 2, 2],
      fingering:[null, null, null, 1, 2, 3],
      openMute: ['mute', 'mute', 'open', null, null, null],
    },
    {
      quality: 'M7', label: 'Open', root: 'EM7',
      frets:    [0, 2, 1, 1, 0, 0],
      fingering:[null, 3, 2, 1, null, null],
      openMute: ['open', null, null, null, 'open', 'open'],
    },

    // ── Dominant 7 오픈 ───────────────────────────────────────
    {
      quality: '7', label: 'Open', root: 'G7',
      frets:    [3, 2, 0, 0, 0, 1],
      fingering:[3, 2, null, null, null, 1],
      openMute: [null, null, 'open', 'open', 'open', null],
    },
    {
      quality: '7', label: 'Open', root: 'C7',
      frets:    [null, 3, 2, 3, 1, 0],
      fingering:[null, 3, 2, 4, 1, null],
      openMute: ['mute', null, null, null, null, 'open'],
    },
    {
      quality: '7', label: 'Open', root: 'D7',
      frets:    [null, null, 0, 2, 1, 2],
      fingering:[null, null, null, 2, 1, 3],
      openMute: ['mute', 'mute', 'open', null, null, null],
    },
    {
      quality: '7', label: 'Open', root: 'E7',
      frets:    [0, 2, 0, 1, 0, 0],
      fingering:[null, 2, null, 1, null, null],
      openMute: ['open', null, 'open', null, 'open', 'open'],
    },
    {
      quality: '7', label: 'Open', root: 'A7',
      frets:    [null, 0, 2, 0, 2, 0],
      fingering:[null, null, 2, null, 3, null],
      openMute: ['mute', 'open', null, 'open', null, 'open'],
    },

    // ── minor 7 오픈 ──────────────────────────────────────────
    {
      quality: 'm7', label: 'Open', root: 'Em7',
      frets:    [0, 2, 0, 0, 0, 0],
      fingering:[null, 2, null, null, null, null],
      openMute: ['open', null, 'open', 'open', 'open', 'open'],
    },
    {
      quality: 'm7', label: 'Open', root: 'Am7',
      frets:    [null, 0, 2, 0, 1, 0],
      fingering:[null, null, 2, null, 1, null],
      openMute: ['mute', 'open', null, 'open', null, 'open'],
    },
    {
      quality: 'm7', label: 'Open', root: 'Dm7',
      frets:    [null, null, 0, 2, 1, 1],
      fingering:[null, null, null, 2, 1, 1],
      openMute: ['mute', 'mute', 'open', null, null, null],
    },
  ];

  // ── 라이브러리 빌드 ──────────────────────────────────────────
  function buildLibrary() {
    const lib = {};
    const ALL_ROOTS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

    // 1) 패턴 기반 보이싱
    LIB_PATTERNS.forEach(pat => {
      for (let r = pat.rRange[0]; r <= pat.rRange[1]; r++) {
        const frets = evalPat(pat.pattern, r);
        if (frets.some(f => f !== null && f < 0)) continue;

        const sharpName = pat.name(r, false);
        const flatName  = pat.name(r, true);

        // 근음 (# 기준으로 라이브러리 키 분류)
        const rootNote = sharpName.match(/^([A-G]#?)/)?.[1] ?? sharpName[0];
        if (!lib[rootNote]) lib[rootNote] = [];

        // 바레 객체
        const barreObj = pat.hasBarre ? { [r]: true } : {};

        // openMute: null=점(dot), 'mute'=×
        const om = frets.map(f => f === null ? 'mute' : null);

        // 최소 프렛 번호 (2 이상일 때만 drawCanvas에서 표시)
        const positives = frets.filter(f => f !== null && f > 0);
        const minFret   = positives.length ? Math.min(...positives) : 0;

        lib[rootNote].push({
          quality:      pat.quality,
          voicingLabel: pat.label,
          frets,
          fingering:    pat.fingering,
          barre:        barreObj,
          openMute:     om,
          fretNumber:   minFret,
          name:         sharpName,
          flatName,
        });
      }
    });

    // 2) 정적 오픈 보이싱
    LIB_STATIC.forEach(entry => {
      const rootMatch = entry.root.match(/^([A-G][#b]?)/);
      const rootNote  = rootMatch ? rootMatch[1] : entry.root[0];
      if (!lib[rootNote]) lib[rootNote] = [];
      lib[rootNote].push({
        quality:      entry.quality,
        voicingLabel: entry.label,
        frets:        entry.frets,
        fingering:    entry.fingering,
        barre:        {},
        openMute:     entry.openMute,
        fretNumber:   0,
        name:         entry.root,
        flatName:     entry.root,   // 오픈 코드는 임시로 동일 (추후 개선)
      });
    });

    // 3) 각 근음별 정렬: 품질 우선순위 → Open 먼저
    ALL_ROOTS.forEach(root => {
      if (!lib[root]) return;
      lib[root].sort((a, b) => {
        const ai = QUALITY_ORDER.indexOf(a.quality);
        const bi = QUALITY_ORDER.indexOf(b.quality);
        const av = ai === -1 ? 999 : ai;
        const bv = bi === -1 ? 999 : bi;
        if (av !== bv) return av - bv;
        if (a.voicingLabel === 'Open' && b.voicingLabel !== 'Open') return -1;
        if (b.voicingLabel === 'Open' && a.voicingLabel !== 'Open') return 1;
        return a.name.localeCompare(b.name);
      });
    });

    return lib;
  }

  // ── 품질 → 에디터 코드 구성요소 매핑 ─────────────────────────
  window.qualityToComponents = function(quality) {
    const map = {
      'M':      { triad: '',     seventh: '',    func: '',      tensions: [] },
      'm':      { triad: 'm',    seventh: '',    func: '',      tensions: [] },
      'M7':     { triad: '',     seventh: 'M7',  func: '',      tensions: [] },
      '7':      { triad: '',     seventh: '7',   func: '',      tensions: [] },
      'm7':     { triad: 'm',    seventh: '7',   func: '',      tensions: [] },
      'sus4':   { triad: 'sus4', seventh: '',    func: '',      tensions: [] },
      '7sus4':  { triad: '',     seventh: '7',   func: 'sus4',  tensions: [] },
      'add9':   { triad: '',     seventh: '',    func: '',      tensions: ['9'] },
      'aug':    { triad: 'aug',  seventh: '',    func: '',      tensions: [] },
      'dim':    { triad: 'dim',  seventh: '',    func: '',      tensions: [] },
      'aug7':   { triad: 'aug',  seventh: '7',   func: '',      tensions: [] },
      'dim7':   { triad: '',     seventh: '',    func: 'dim7',  tensions: [] },
      'm7(b5)': { triad: 'm',    seventh: '7',   func: 'b5',    tensions: [] },
      '6':      { triad: '',     seventh: '',    func: '',      tensions: ['6'] },
      'm6':     { triad: 'm',    seventh: '',    func: '',      tensions: ['6'] },
    };
    return map[quality] || { triad: '', seventh: '', func: '', tensions: [] };
  };

  window.chordsLibrary = buildLibrary();

})();
