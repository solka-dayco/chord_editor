# Chorditor — CLAUDE.md 초기에 참조할 정보

## 프로젝트 개요

기타 코드(Guitar Chord) 제작 및 관리 도구. 웹 + Android(Capacitor) 크로스플랫폼.

- **앱 ID:** `com.chorditor.app`
- **앱명:** Chorditor
- **기술 스택:** Vanilla JS (ES6+) · HTML5 Canvas · Web Audio API · Capacitor 8 · Gradle
- **외부 라이브러리:** Lucide(아이콘, CDN), Pretendard(폰트, CDN) — 프레임워크 없음

---

## 파일 구조

```
Chords_editor/
├── app.js            # 메인 로직 전체 (~2900줄)
├── index.html        # 단일 HTML 파일
├── style.css         # 전체 스타일 (~1360줄)
├── chord-voicings.js # 보이싱 데이터 원본 (개발자 직접 편집 — Claude 수정 금지)
├── chords-library.js # 보이싱 파서 + 라이브러리 빌더
├── image/            # 핑거링 이미지 (root, common, barre, open, mute)
├── www/              # 빌드 출력 (app.js / index.html / style.css 복사본)
├── android/          # Android Studio 프로젝트
│   ├── app/src/main/assets/public/   # ← 앱 배포 파일 위치
│   └── variables.gradle              # compileSdk / targetSdk 버전 관리
├── capacitor.config.json
└── package.json
```

---

## GitHub Pages 설정 (web 브랜치)

### 기본 설정
- **저장소:** `https://github.com/solka-dayco/chord_editor`
- **배포 URL:** `https://solka-dayco.github.io/chord_editor/`
- **배포 브랜치:** `web` (root)
- **설정 경로:** GitHub → Settings → Pages → Branch: `web` / `/ (root)`

### ⚠️ 필수 파일: `.nojekyll`
`web` 브랜치 루트에 `.nojekyll` 파일이 반드시 있어야 함.  
없으면 GitHub Pages가 Jekyll로 빌드 시도 → 실패.

### ⚠️ .claude/worktrees 서브모듈 오류
Claude Code가 생성하는 `.claude/worktrees/` 폴더가 git에 `160000 commit` (서브모듈)으로 잘못 등록될 수 있음.

**증상:** GitHub Actions 빌드 실패
```
No url found for submodule path '.claude/worktrees/focused-cori' in .gitmodules
```

**해결:**
```bash
git rm --cached .claude/worktrees/focused-cori
git rm --cached .claude/worktrees/goofy-jennings
# .gitignore에 .claude/worktrees/ 추가 후 커밋
```

**예방:** `.gitignore`에 `.claude/worktrees/` 등록되어 있음 (이미 적용됨)

### 배포 확인 방법
GitHub → Actions 탭 → "pages build and deployment" 워크플로우 상태 확인
- ✅ 초록: 배포 완료 → `Ctrl+Shift+R` 로 강제 새로고침
- ❌ 빨간: 빌드 오류 → 워크플로우 클릭 → Annotations에서 원인 확인

### Supabase Redirect URL 등록 필수
웹 Google 로그인이 동작하려면 Supabase에 도메인 등록 필요:
- **Supabase → Authentication → URL Configuration**
- Site URL: `https://solka-dayco.github.io/chord_editor/`
- Redirect URLs: `https://solka-dayco.github.io/chord_editor/` 추가

---

## 웹 버전 커밋 규칙 (필수)

**`git push origin main` 실행 전 반드시 아래 절차를 따를 것:**

1. 사용자에게 현재 모바일 버전(versionName)을 확인하도록 요청
2. 사용자가 버전을 직접 알려주면, `app.js`의 `initAppVersion()` 웹 분기 하드코딩 값을 해당 버전으로 업데이트
3. 그 후 동기화 → 커밋 → push 진행

```js
// app.js initAppVersion() 웹 분기
el.textContent = 'v1.0.1'; // ← 모바일 versionName과 항상 일치시킬 것
```

---

## 동기화 규칙 (필수)

app.js / index.html / style.css 수정 후 **항상** 세 곳에 동기화:

```bash
cp app.js     www/app.js     && cp app.js     android/app/src/main/assets/public/app.js
cp index.html www/index.html && cp index.html android/app/src/main/assets/public/index.html
cp style.css  www/style.css  && cp style.css  android/app/src/main/assets/public/style.css
```

커밋은 사용자가 명시적으로 요청할 때만 한다.

---

## 주요 기능 영역

### 1. 코드 에디터 (에디터 뷰)
- 코드명 빌더: 근음 + 3화음(M/m/aug/dim) + 7음 + 기능음(sus4/add9/b5) + 텐션 + 분수코드
- Canvas 기반 기타 핑거링 입력 (6현 4프렛)
- 손가락 번호(1~4, T), 바레(2~6현), 오픈/뮤트, 근음 표시
- Karplus-Strong 알고리즘으로 Web Audio API 기타 음성 합성
- PNG 내보내기 (x0.5 / x1 / x2 / x3)

### 2. 프로젝트 관리 (프로젝트 뷰)
- 여러 프로젝트 → 각 프로젝트 내 라인(가사) + 코드 슬롯(4 or 8열)
- 코드 썸네일 리스트: 드래그로 순서 변경, 슬롯으로 드롭
- 코드 슬롯: 드래그 앤 드롭으로 배치/교환
- 즐겨찾기(핀) / 최근 프로젝트 사이드바
- LocalStorage 기반 저장

### 3. 코드 라이브러리 (라이브러리 뷰)

화성학 이론에 기반한 기타 코드 보이싱을 사전 형식으로 제공하는 읽기 전용 탐색 뷰.  
사이드바 "라이브러리" 버튼으로 진입하며, 에디터·프로젝트 뷰와 완전히 독립된 세 번째 뷰.

---

#### 데이터 파이프라인

```
chord-voicings.js          chords-library.js              app.js
──────────────────         ─────────────────────          ──────────────
CHORD_STATIC  ──┐          buildLibrary()                 chordsLibrary
CHORD_PATTERN ──┴─────────► Step1: PATTERN 파싱           (근음별 엔트리
                             Step2: STATIC 파싱            딕셔너리)
                             Step3: 정렬
                             Step4: 운지 병합
                            ────────────────────►  window.chordsLibrary
```

- **`chord-voicings.js`** — 보이싱 원본 데이터. **개발자 직접 편집, Claude 수정 금지.**
  - `window.CHORD_STATIC` : 정적 보이싱 (오픈코드·전위코드 등)
  - `window.CHORD_PATTERN` : 패턴 보이싱 (바레코드 등, 12근음 자동 생성)
- **`chords-library.js`** — 파서 + 빌더
  - `window.chordNoteName(si, fret, flat)` 전역 노출 → `chord-voicings.js`의 `name` 함수에서 사용
  - 빌드 결과물: `window.chordsLibrary = { 'C': [...], 'C#': [...], ... }`
- **로드 순서:** `chord-voicings.js` → `chords-library.js` (index.html script 태그 순서 고정)

#### buildLibrary() 4단계

| 단계 | 내용 |
|------|------|
| 1. PATTERN 파싱 | r=0~11 순회 → 각 패턴을 12근음으로 전개, `source: 'pattern'` 태그 |
| 2. STATIC 파싱 | 고정 프렛 배열 파싱, `source: 'static'` 태그 |
| 3. 정렬 | 1차: quality 우선순위, 2차: fretNumber 오름차순, 3차: static 우선 |
| 4. 운지 병합 | `name + frets` 동일 엔트리 → `fingerings[]` 배열로 통합 (1개여도 배열) |

**quality 정렬 우선순위:**  
`M → m → M7 → 7 → m7 → sus4 → 7sus4 → add9 → sus2 → aug → dim → aug7 → dim7 → m7(b5) → 6 → m6`

---

#### UI 레이아웃 (위→아래)

```
┌─────────────────────────────┐
│  🔍 검색창 (lib-search-bar) │  Enter → 검색 결과 모달 (하단 슬라이드업)
├─────────────────────────────┤
│  lib-canvas (뷰어 캔버스)   │  선택된 코드의 큰 코드표
│  [◀ 1/2 ▶] 운지 내비게이션 │  fingerings[] 2개 이상일 때만 표시
├─────────────────────────────┤
│  [#][b]  🖐                 │  샵/플랫 토글, 손가락번호 on/off
│  [▶재생] ─ [이미지저장][가져오기] │  (lib-action-bar)
├──────────┬──────────────────┤
│ C        │ □□□□             │  lib-bottom
│ C#/Db    │ □□□□             │  좌: 근음 세로목록 (lib-root-list)
│ D   ...  │ □□□□             │  우: 카드 그리드 (lib-cards-area)
└──────────┴──────────────────┘
```

---

#### 카드 그리드 동작

- **그룹화:** `entry.name`(sharp 기준) 기준으로 묶어 대표 카드 1개만 표시  
- **배지:** 같은 코드명에 보이싱이 여러 개면 우상단에 원형 숫자 배지 표시  
- **클릭 동작:**
  - 보이싱 1개 → `selectLibEntry(idx)` 바로 호출
  - 보이싱 복수 → 탭 피드백 애니메이션 후 **보이싱 피커 모달** 열기

#### 보이싱 피커 모달

- `#lib-voicing-modal` — `.lib-cards-area` 위에 `position: absolute; inset: 0`으로 덮음  
- `#lib-voicing-overlay` — `.lib-bottom` 위에 `position: absolute; inset: 0` (action-bar는 덮지 않음)  
- **열기 애니메이션:** 클릭 카드 중심을 `transform-origin`으로 설정 후 `scale(0 → 1)`  
- **닫기:** 모달 바깥(lib-bottom 범위) 터치 → overlay onclick → `closeVoicingModal()`  
- **모달 내 카드 클릭:** `selectLibEntry()` 호출 → 뷰어만 업데이트, 모달은 유지  
- **샵/플랫 전환:** `setLibAccidental()` → `_voicingModalChord` 가 있으면 `_renderVoicingGrid()` 재호출

#### 검색 모달 (`#lib-search-modal`)

- 검색바 Enter → 키보드 내림 + 하단 슬라이드업 (`.open` 클래스 방식)  
- 검색 매칭: 근음은 대소문자 무시, quality는 대소문자 구분 (`_libMatch()`)  
- 카드 클릭해도 모달 유지 (수동 닫기 버튼 별도 존재)

---

#### 캔버스 렌더링 (`_drawLibCanvas`)

라이브러리 엔트리의 `frets`는 **절대 프렛값**, `drawCanvas`는 **슬롯 번호(1~4)** 기준 → 변환 필수:

```js
const fretOffset = entry.fretNumber - 2;   // fretNumber=2 → offset=0
슬롯 번호 = 절대프렛 - fretOffset
// barre 키(Object.entries)도 동일하게 정규화
```

- CHORD_PATTERN `fretNumber` 자동값: `Math.max(2, r + 1)` → 슬롯1이 바레 위치
- 뷰어 캔버스: 물리 1120px, CSS 320px (3.5× 해상도)
- 미니 카드 캔버스: 물리 120px, CSS 56px

#### 이미지 저장

- "이미지 저장" 버튼 클릭 → 배율 드롭다운 (1×=400×300px, 2×/3×/4×)  
- 무료 플랜은 1× 제한, 고배율은 업그레이드 모달  
- `_doExportLibChordImage(scale)` → `drawCanvas` 오프스크린 렌더 → PNG 다운로드

#### 가져오기 (`importLibChordToProject`)

- 현재 선택된 엔트리 + `_libFingeringIdx` 운지를 에디터 상태로 변환  
- fretOffset 변환 동일하게 적용 (절대프렛 → 슬롯 번호)  
- 에디터 뷰로 전환 후 바로 편집 가능

---

#### 관련 전역 상태 변수 (app.js)

```js
let _libRoot         = 'C';          // 현재 선택된 근음
let _libEntry        = null;         // 현재 선택된 엔트리 객체
let _libFingerMode   = true;         // 손가락 번호 표시 여부
let _libFingeringIdx = 0;            // 현재 표시 중인 운지 인덱스
let _libCurrentIdx   = -1;           // chordsLibrary[root] 내 인덱스
let _voicingModalChord = null;       // 보이싱 피커 모달에 열린 코드명 (sharp 기준)
```

#### 동기화 주의

`chord-voicings.js` / `chords-library.js` 수정 시 android assets 수동 복사 필수:
```bash
cp chord-voicings.js android/app/src/main/assets/public/chord-voicings.js
cp chords-library.js android/app/src/main/assets/public/chords-library.js
```

### 4. 모바일(Android) 특화
- 터치 기반 thumb 드래그: 이동 8px 초과 시 드래그 모드, 짧은 탭은 편집 모달
- 코드 슬롯/썸네일 삭제: `@media (pointer: coarse)` 에서 항상 삭제 버튼 표시
- 데스크탑 삭제: hover 시 삭제 버튼 표시 (`@media (hover: hover) and (pointer: fine)`)
- `contextmenu` 이벤트 차단 (Android 길게 누르기 ~600ms 오동작 방지)

---

## 주요 함수 참조

| 함수 | 역할 |
|------|------|
| `drawCanvas(c, ratio, data)` | 기타 코드 캔버스 렌더링 |
| `buildChordName(data)` | 코드명 문자열 생성 |
| `strumChord()` | 코드 음성 재생 |
| `navigateTo(view, projectId)` | 뷰 전환 (에디터 ↔ 프로젝트) |
| `renderProjectView(projectId)` | 프로젝트 상세뷰 렌더링 |
| `buildChordArea(line, project, editMode)` | 코드 슬롯 영역 생성 |
| `buildThumbList(project, editMode)` | 썸네일 리스트 생성 |
| `setupThumbTouchDrag(thumb, chord, projectId)` | 모바일 썸네일 터치/드래그 |
| `placeChordInSlot(projectId, rowId, slotIdx, chordId)` | 슬롯에 코드 배치/삭제 |
| `deleteChordFromProject(projectId, chordId)` | 프로젝트에서 코드 삭제 |
| `reRenderChordArea(lineId, line, project)` | 코드 영역 부분 재렌더링 |

---

## dev 브랜치 규칙

### dev 브랜치 생성 원칙
- **dev는 항상 최신 main에서 분기**하여 생성한다.
- 기존 dev가 있어도 새 작업 시작 전 `git checkout dev && git reset --hard main`으로 최신화한다.

### USB 디버깅 (dev 전용) — 온보딩 건너뜀

Android USB 연결 환경에서는 Google 로그인이 불가하므로 `dev` 브랜치에서는 온보딩을 건너뛴다.

**위치:** `app.js` → `tryAutoSignIn()` 함수 상단

```js
// ── DEV ONLY: 온보딩 건너뜀 (USB 디버깅 환경에서 Google 로그인 불가) ──
// main 병합 시 아래 3줄 제거
hideOnboarding(); _authReady = true; _authResolve(); return;
// ── /DEV ──
```

⚠️ **주의:** `dev → main` (또는 `staging`) 병합/커밋 시 반드시 위 3줄을 제거해야 한다.

### dev 커밋 후 USB 테스트 시 필수 동기화

`android/app/src/main/assets/public/`는 `.gitignore` 대상이라 **git 커밋/체크아웃으로 자동 갱신되지 않는다.**  
dev에서 app.js를 수정한 뒤 Android Studio로 빌드하면 **이전 파일이 그대로 사용**된다.

반드시 직접 복사하거나 `cap sync`를 실행해야 한다:

```bash
# 직접 복사 (cap sync 없이 빠르게)
cp app.js android/app/src/main/assets/public/app.js
cp voicing-library.js android/app/src/main/assets/public/voicing-library.js

# 또는
npx cap sync
```

---

## staging 브랜치 커밋 체크리스트

`dev → staging` 머지 후 **반드시** 아래 항목을 순서대로 확인한다.

### 1. DEV ONLY 온보딩 건너뜀 코드 제거 ✅

`app.js` → `tryAutoSignIn()` 상단의 4줄을 제거했는지 확인.

```js
// ── 이 블록 전체 제거 ──
// ── DEV ONLY: 온보딩 건너뜀 (USB 디버깅 환경에서 Google 로그인 불가) ──
// main 병합 시 아래 3줄 제거
hideOnboarding(); _authReady = true; _authResolve(); return;
// ── /DEV ──
```

제거 후 `www/app.js`도 동기화 필수.

### 2. Android Studio를 staging 브랜치로 전환

Android Studio에서 staging 브랜치를 사용하도록 전환해야 빌드 시 올바른 코드가 적용된다.

```
Android Studio → Git 탭 (하단) → Branches → staging → Checkout
```

또는 터미널에서:
```bash
git checkout staging
```

전환 후 **File → Sync Project with Gradle Files** 를 실행해 `build.gradle`(versionCode/versionName)을 반영한다.

### 3. Android assets 수동 동기화

staging 체크아웃 후 `android/app/src/main/assets/public/`은 자동 갱신되지 않으므로 직접 복사:

```bash
cp app.js android/app/src/main/assets/public/app.js
cp index.html android/app/src/main/assets/public/index.html
cp style.css android/app/src/main/assets/public/style.css
cp chord-voicings.js android/app/src/main/assets/public/chord-voicings.js
cp chords-library.js android/app/src/main/assets/public/chords-library.js
cp voicing-library.js android/app/src/main/assets/public/voicing-library.js
```

### 4. 실기기 로그인 온보딩 동작 확인

APK 빌드 후 실기기에서 앱 실행 시 **로그인 화면(온보딩)이 정상적으로 표시**되는지 확인.  
건너뛰어진다면 1번 항목 미처리 상태임.

---

## Android 빌드 설정

`android/variables.gradle`:
- `minSdkVersion = 24`
- `compileSdkVersion = 37`
- `targetSdkVersion = 37`

Android Studio: **File → Sync Project with Gradle Files** 로 적용.

---

## 전역 상태 변수 (app.js 상단)

```js
let isEditMode = true;          // 편집모드 기본값
let currentProjectId = null;    // 현재 열린 프로젝트
let contextProjectId = null;    // 컨텍스트 프로젝트
let playbackActive = false;     // 재생 모드 여부
let currentColCount = 8;        // 슬롯 열 수 (4 or 8)
```

---

## CSS 주요 규칙

- CSS 변수: `--bg`, `--surface`, `--border`, `--text`, `--text-muted`, `--accent`, `--radius`
- 모바일 삭제 버튼: `@media (pointer: coarse)` → 항상 표시
- 데스크탑 삭제 버튼: `@media (hover: hover) and (pointer: fine)` → hover 시 표시
- 반응형 분기: 768px (태블릿), 480px (모바일), 가로 모드 별도 처리

## 애니메이션 표준값 (전역)

슬라이드·모달·패널 등 **UI 요소의 등장/퇴장 트랜지션**에 아래 값을 전역 표준으로 사용한다.

```css
transition: transform .55s cubic-bezier(0.22, 1, 0.36, 1);
```

- **재생 시간:** `0.55s`
- **이징:** `cubic-bezier(0.22, 1, 0.36, 1)` — 빠르게 진입 후 끝에서 부드럽게 감속 (ease-out 계열)
- 기준 사례: `#lib-search-modal` 슬라이드 업 애니메이션
- **열기와 닫기는 항상 동일한 속도감·이징으로 설정할 것** (닫기만 빠르거나 즉시 사라지는 것 금지)

### 구현 주의사항
- `.hidden` 클래스(`display: none`)는 CSS 트랜지션을 즉시 차단함 → 슬라이드/페이드 애니메이션에 사용 금지
- 대신 전용 `.open` 클래스로 열기/닫기를 제어하고, 기본 상태(`transform: translateY(100%)` 등)를 off-screen으로 유지
- `pointer-events: none` / `pointer-events: auto`로 비활성/활성 전환

```css
/* 올바른 패턴 */
.my-modal {
  transform: translateY(100%);
  transition: transform .55s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}
.my-modal.open {
  transform: translateY(0);
  pointer-events: auto;
}
```

단순 hover/색상 전환(`.15s ease` 등)은 이 표준 적용 대상이 아님.

## TODO
- [ ] 기존 애니메이션(모달 오버레이, 사이드바, 뷰 전환 등) 트랜지션을 표준값 `.55s cubic-bezier(0.22, 1, 0.36, 1)`으로 교체


# 모바일 webview 텍스트 처리방식

- 일반 paste 이벤트만 처리하지 말고, Android WebView에서 클립보드 히스토리 선택 시 들어오는 입력 경로도 함께 고려
- 현재 코드에서 paste, beforeinput, input, composition 관련 진입점을 점검
- 클립보드 히스토리 경로에서 HTML이 들어오는 원인을 찾고, text/plain만 사용하도록 통합
- 붙여넣기 시 브라우저 기본 삽입을 막아야 한다면 막고, 클립보드에서 plain text를 추출한 뒤 브라우저 텍스트 삽입 경로로 넣을 것
- DOM range.insertNode, innerHTML, 수동 노드 생성 등 직접 DOM 삽입 방식은 피할 것
- Android WebView에서 줄바꿈과 문단 구분이 깨지지 않도록 주의

## 원하는 결과:

- 길게 눌러 붙여넣기
- 클립보드 히스토리에서 선택해 붙여넣기
- 둘 다 동일하게 plain text만 들어가야 함

# 쓰레기 코드가 최대한 남아있지 않도록 수정할 때 삭제할 것, 교체할 것을 정확히 구분하고 검토할 것.

# chord-voicings.js 수정 금지
- 개발자가 직접 편집하는 보이싱 데이터 파일이므로 Claude가 임의로 수정해서는 안 됨.
- 포맷 변경(chords-library.js 파서)이나 동기화 작업만 허용.

# 보이싱데이터 표준 포맷 (chord-voicings.js 기준)

앞으로 모든 보이싱 데이터는 아래 포맷을 표준으로 삼는다.

## 공통 규칙
- 줄 순서: **6번줄(저음 E) → 1번줄(고음 e)** (공백 구분 문자열)
- frets 토큰: `x`=뮤트(×) | `0`=개방(○) | 숫자=프렛 | (패턴 한정) `r`=근음프렛 | `r+N`/`r-N`=상대프렛
- fingers 토큰: `x`=없음 | `1~4`=손가락번호 | `T`=엄지
- 파싱 시 배열 반전 적용 (6번줄→1번줄 입력 → 캔버스는 1번줄→6번줄 순으로 그림)

## CHORD_STATIC — 정적 보이싱 (고정 오픈코드·전위코드 등)

```js
// 형식: [ frets, names, fingers, quality, fretNumber? ]
['x 3 2 0 1 0', ['C'],         'x 3 2 x 1 x', 'M',  2]
['x 0 2 2 1 0', ['Am', 'C/A'], 'x x 2 3 1 x', 'm',  2]
//               ↑ names 복수 → 동일 보이싱에서 독립 엔트리 각각 생성
```

| 필드 | 필수 | 설명 |
|------|------|------|
| frets | ✅ | 프렛 위치 문자열 |
| names | ✅ | 코드명 배열 (복수 가능) |
| fingers | ✅ | 손가락 번호 문자열 |
| quality | ✅ | 정렬 기준 태그 |
| fretNumber | ☐ | 캔버스 표시 프렛 번호 (생략 시 최솟값 자동 계산) |

quality 태그 목록:
`'M'` `'m'` `'M7'` `'7'` `'m7'` `'sus4'` `'7sus4'` `'add9'` `'sus2'`
`'aug'` `'dim'` `'aug7'` `'dim7'` `'m7(b5)'` `'6'` `'m6'` `'slash'` `'hybrid'`

## CHORD_PATTERN — 패턴 보이싱 (바레 코드 등 근음 위치가 변하는 보이싱)

```js
// 형식: { pattern, rootStr, fingers, barre, quality, fretNumber?, name? }
{ pattern: 'r r+2 r+2 r+1 r r', rootStr: 6, fingers: '1 3 4 2 1 1', barre: true, quality: 'M' }
```

| 필드 | 필수 | 설명 |
|------|------|------|
| pattern | ✅ | 프렛 패턴 문자열 (r 변수 사용) |
| rootStr | ✅ | 근음 현 번호 (6=6번줄, 5=5번줄, 4=4번줄) |
| fingers | ✅ | 손가락 번호 문자열 |
| barre | ✅ | true = r 프렛에 바레 자동 생성 |
| quality | ✅ | 정렬 기준 + 코드명 접미사 (`'M'`은 접미사 없음) |
| fretNumber | ☐ | 고정 프렛 번호 (생략 시 `Math.max(2, r+1)` 자동 적용 — 슬롯1이 바레 위치) |
| name | ☐ | `(r, flat) => string` — 복잡한 코드명이 필요할 때 직접 지정 |

코드명 자동 생성: `rootStr 현의 r프렛 음이름 + quality접미사`
예) rootStr=5, quality='M7', r=3 → `'CM7'`

### `name` 함수와 `chordNoteName()` 사용법

분수코드처럼 근음이 `r`프렛과 다른 위치에 있을 때는 `name` 함수를 직접 지정한다.  
`chords-library.js`가 `window.chordNoteName = fn`으로 전역 노출하므로 `chord-voicings.js`에서 사용 가능.

```js
// chordNoteName(si, fret, flat) → 음이름
// si: 줄 인덱스 (0=6번줄 E, 1=5번줄 A, 2=4번줄 D, 3=3번줄 G, 4=2번줄 B, 5=1번줄 e)
// si = 6 - rootStr
```

| si | 줄 | 개방음 |
|----|-----|------|
| 0 | 6번줄 | E |
| 1 | 5번줄 | A |
| 2 | 4번줄 | D |
| 3 | 3번줄 | G |
| 4 | 2번줄 | B |
| 5 | 1번줄 | e |

**예시 — E형 분수코드 (G/B, Ab/C, A/C# ...)**
```js
// 6번줄 근음(E형)에서 3번줄이 베이스인 경우
// 베이스음: 3번줄(si=3), r+1 프렛
// 근음:     6번줄(si=0), r 프렛
{
  pattern: 'r r+2 r+2 r+1 r+1 r+1',
  rootStr: 6,
  fingers: '1 3 4 2 2 2',
  barre: false,
  quality: 'slash',
  name: (r, flat) =>
    chordNoteName(0, r, flat) + '/' + chordNoteName(3, r + 1, flat)
}
```

## TODO
- [ ] `voicing-library.js`의 `DIRECT` / `FORMULA` 데이터를 `chord-voicings.js` 포맷 기반으로 리팩토링

# 특정 기타 코드를 말할 때는 6번줄부터 순서대로 나열
- ex. x02220 -> 6번줄 뮤트, 5번줄 개방현, 4번줄 2프랫, 3번줄 2프랫, 2번줄 2프랫, 1번줄 개방현

# 모바일 터치 관련된 문제 해결방법
- touchstart.preventDefault()는 이후 합성 click 이벤트를 억제한다. 터치(touchstart→touchend)와 마우스(mousedown→click)를 반드시 분리 처리할 것.

- 버튼에 touchstart.preventDefault()를 걸어도 Android WebView는 상위 contenteditable 요소에 포커스를 주어 키보드가 뜬다. touchstart 시점에 즉시 linesEl.contentEditable = 'false'로 비활성화하고, 메뉴가 닫힐 때 'true'로   복원하는 것이 유일하게 확실한 해결법이다.

# 홈 아이콘 흰 화면 버그 (One UI 7 / Galaxy S25)
- `mipmap-anydpi-v26/ic_launcher.xml`의 `<monochrome>` 레이어가 Samsung 런처에서 렌더링 실패 시 아이콘 전체를 흰 화면으로 표시함.
- 해결: `<monochrome>` 레이어 제거, foreground는 `@mipmap/ic_launcher_foreground` 직접 참조 유지.

# UI 조정 시 주의사항
- 자식 컨테이너 내부의 위치를 조정하거나 정렬할 때는 항상 부모 컨테이너의 값을 먼저 참조한다.

# 버튼 hidden 관련 주의사항
- 원인 예시: .onboarding-btn { display: flex } 은 있었지만 .onboarding-btn.hidden { display: none } 규칙이 없어서 hidden 클래스를 붙여도 flex가 계속 유지됐습니다. 다른 요소들(. modal-overlay.hidden, .view.hidden 등)은 모두 명시적으로 선언되어 있었는데 이것만 누락.

# Android Google 로그인 "Something went wrong" 오류
- **원인:** `tryAutoSignIn()`에서 `GoogleAuth.refresh()`를 호출하면 5초 타임아웃 후 reject되지만 네이티브 작업은 백그라운드에서 계속 실행됨. 이후 사용자가 Google 로그인 버튼을 눌러 `GoogleAuth.signIn()`을 호출하면 두 네이티브 작업이 충돌하여 "Something went wrong" 발생.
- **해결:** `tryAutoSignIn()`에서 `GoogleAuth.refresh()` 호출 완전 제거. 저장된 세션(localStorage)이 없으면 즉시 Google 로그인 버튼 표시. GoogleAuth는 사용자가 직접 버튼을 눌렀을 때(`onboardingSignIn()`)만 호출.

# Play Console 경로 (2026년 4월 기준)

## 스토어 등록정보 URL
- 정식 경로: `main-store-listing` (이전: `store-listing`)

## RevenueCat 서비스 계정 권한 확인 경로
예전 "설정 → API 액세스"는 2026년 기준 존재하지 않음. 대체 경로:
- **Play Console → 사용자 및 권한** (`/users-and-permissions`)
- RevenueCat 서비스 계정 행 → **관리 →** 클릭
- 필요 권한 (체크 확인):
  - ✅ 앱 정보 보기 (읽기 전용)
  - ✅ 재무 데이터 보기
  - ✅ 주문 및 구독 관리

## RevenueCat 서비스 계정 상태 확인 (2026년 기준 확인 완료)
- Play Console 권한: **정상** (재무 데이터 보기, 주문 및 구독 관리 모두 체크됨)
- RevenueCat 대시보드: Valid credentials ✅, Pub/Sub 권한 경고 ⚠️
- Google Cloud IAM: "Cloud Pub/Sub Agent" 역할 설정됨 → **"게시/구독 관리자" 역할 추가 필요**
- Pub/Sub 오류는 실시간 알림용이며 `getOfferings()` 결과와 직접 관련 없음

## RevenueCat Offerings 설정 (확인 완료)
- default Offering → Current(기본)으로 설정됨 ✅
- `pro_monthly` 패키지 → `pro_monthly:pro-monthly-base` 연결 ✅
- `standard_monthly` 패키지 → identifier가 `$rc_monthly`임 → 코드 `PRODUCT_STANDARD = '$rc_monthly'`로 수정 완료 ✅

## Google Play 구독 상품 상태 (확인 완료)
- 경로: Play Console → 수익 창출 → Play를 통한 수익 창출 → 정기결제
- `pro_monthly`, `standard_monthly` 모두 **활성 기본 요금제: 1** ✅

## RevenueCat getOfferings() 응답 구조 (확인 완료)
- Capacitor 플러그인은 `{ offerings: { current, all } }` 가 아닌 `{ current, all }` 직접 반환
- 코드에서 `offeringsResult?.offerings ?? offeringsResult` 로 양쪽 대응 처리함

## 인앱 구독 테스트 주의사항
- Play Console 개발자 계정(소유자)으로는 자기 앱 상품 구매 불가
- 테스트 시 별도 Gmail 계정 필요 (Play Console → 설정 → 라이선스 테스트에 등록)
- 라이선스 테스트 설정: 이메일 목록 **체크박스**까지 선택해야 활성화됨 (라디오 버튼만으로는 부족)
- 라이선스 응답: `RESPOND_NORMALLY` → **`LICENSED`** 로 변경해야 무료 테스트 결제 가능
- 변경 후 Play Store 캐시 삭제 + 기기 재시작 필요 (전파 최대 수시간 소요될 수 있음)

## ⚠️ RevenueCat Entitlement 상품 미연결 — 결제 후 FREE 유지되는 근본 원인

**증상:** 결제 완료 후 Supabase DB `plan`이 여전히 `free`, RC 고객 프로필에 "Unattached products" 표시

**원인:** RC Entitlement에 상품이 연결되지 않으면 웹훅 `entitlement_ids = null` → `plan = 'free'`로 저장됨

**확인 경로:**
```
RevenueCat → Product catalog → Entitlements
→ standard_entitlement: Products 열에 "Add your first product" 표시 시 미연결 상태
→ pro_entitlement: 동일 확인
```

**해결 방법:**
```
standard_entitlement 클릭 → Attach → Standard 월간 구독 선택 → 저장
pro_entitlement 클릭 → Attach → Pro 월간 구독 선택 → 저장
```

**RC 고객 프로필에서 이 문제 감지하는 법:**
- Entitlements 섹션에 "Unattached products" 항목이 있으면 → 상품-entitlement 연결 누락
- 정상 상태: Entitlements 섹션에 `standard_entitlement` 또는 `pro_entitlement` 직접 표시

**코드 방어 로직 (app.js `purchasePlan`):**
- `customerInfo.entitlements.active`가 비어있을 때 `planId` 파라미터를 폴백으로 사용
- Entitlement 미연결 또는 Sandbox 지연 상황 모두 대응

## 버전 관리 전략

### 브랜치별 versionName 규칙

| 브랜치 | versionName 형식 | 예시 |
|--------|-----------------|------|
| `dev` | `X.Y.Z_dev_N` | `1.0.2_dev_1`, `1.0.2_dev_2` |
| `staging` | `X.Y.Z_pre_N` | `1.0.2_pre_1`, `1.0.2_pre_2` |
| `main` (정식 출시) | `X.Y.Z` | `1.0.2` |

### versionCode 규칙
- 커밋마다 +1 증가 (브랜치 무관, 단조 증가)
- `android/app/build.gradle`에서 수동 관리

### 현재 상태 (2026-04-27 기준)
- **main 최신 출시:** versionCode 28 / `1.0.1`
- **staging:** versionCode 29 / `1.1.0_pre_1`
- **다음 main:** `1.1.0`

---

# Supabase Edge Function — RevenueCat 웹훅 설정 (2026-04-22 기준)

## 배포된 함수
- 함수명: `revenuecat-webhook`
- 소스: `supabase/functions/revenuecat-webhook/index.ts`
- 배포 URL: `https://jbvkygeksohlysyvaoab.supabase.co/functions/v1/revenuecat-webhook`
- **중요:** `--no-verify-jwt` 옵션으로 배포해야 함
  - 이유: Supabase가 Authorization 헤더를 JWT로 선검증하여 RevenueCat 커스텀 토큰을 차단함
  - 없으면 `UNAUTHORIZED_INVALID_JWT_FORMAT` 401 오류 발생

## 배포 명령어
```bash
cd H:/Project/Project/Chords_editor
SUPABASE_ACCESS_TOKEN=<토큰> npx supabase functions deploy revenuecat-webhook --project-ref jbvkygeksohlysyvaoab --no-verify-jwt
```

## Supabase 액세스 토큰 발급 경로
- https://supabase.com/dashboard/account/tokens → Generate new token
- 발급된 토큰을 `SUPABASE_ACCESS_TOKEN` 환경변수로 사용
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`는 Edge Function에 자동 주입됨 (별도 설정 불필요)

## Supabase 시크릿 설정
```bash
SUPABASE_ACCESS_TOKEN=<토큰> npx supabase secrets set REVENUECAT_WEBHOOK_AUTH=chorditor-rc-wh-2026-xk9m3p7qvn4r --project-ref jbvkygeksohlysyvaoab
```
- `SUPABASE_` 접두사 변수는 예약어라 직접 설정 불가 (자동 주입됨)

## RevenueCat 웹훅 설정 경로
- RevenueCat 대시보드 → Integrations → Webhooks → **Supabase DB Sync** (이미 존재)
- Webhook URL: `https://jbvkygeksohlysyvaoab.supabase.co/functions/v1/revenuecat-webhook`
- Authorization header: `chorditor-rc-wh-2026-xk9m3p7qvn4r`
- Environment: Both Production and Sandbox
- Events: All events

## Edge Function 처리 이벤트
| 이벤트 | 처리 |
|--------|------|
| INITIAL_PURCHASE, RENEWAL, PRODUCT_CHANGE, UNCANCELLATION, TRANSFER | plan 갱신, status: active |
| CANCELLATION | cancel_at_period_end: true |
| EXPIRATION, REFUND | plan: free, status: canceled |
| BILLING_ISSUE | status: past_due |

## TRANSFER 이벤트 주의사항
- TRANSFER 이벤트는 `app_user_id` 필드가 없고 `transferred_from` / `transferred_to` 배열을 사용
- `transferred_to` 배열에서 `$RCAnonymousID:` 접두사가 없는 값을 app_user_id로 사용
- app_user_id가 없으면 200 OK로 스킵 (RevenueCat 재시도 방지)

## Edge Function 배포 현황 (2026-04-22 확인)
- 배포 완료 ✅
- Send test event → 200 OK 확인 ✅
- `x-deno-execution-id` 헤더로 함수 실제 실행 확인

## Supabase DB 함수
```sql
-- subscriptions 테이블 plan 직접 업데이트 (앱에서 결제 직후 호출)
CREATE OR REPLACE FUNCTION set_my_plan(new_plan text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.subscriptions
  SET plan = new_plan, status = 'active', cancel_at_period_end = FALSE, updated_at = now()
  WHERE user_id = auth.uid();
END;
$$;
```

---

# 코드 라이브러리 — 취급 코드 목록 v1 (C 기준)

C음 기준으로 작성한 목록이며, 실제 코드는 12개 음별로 존재함.  
여기에 없는 코드는 취급하지 않음. 미처 추가하지 못한 코드가 있다면 v2 목록으로 갱신 예정.

## [Triad]
C, Cm, Caug, Cdim, Csus4, Csus2

## [7th chords]
CM7, C7, C6,  
CmM7, Cm7, Cm6,  
Cdim7, Cm7(b5),  
Caug7, C7sus4

## [전위코드]
C/E, CM7/E, C7/E,  
C/G, CM7/G, C7/G,  
C/B (= CM7/B),  
C/Bb (= C7/Bb),  
Cm/Eb, Cm7/Eb,  
Cm/G, Cm7/G,  
Cm/Bb (= Cm7/Bb),  
Csus4/E, Csus4/G,  
Cadd9/E, Cadd9/G

## [Tension]
Cadd9 (=Cadd2), CM7(9) (=CM9), CM7(#11), CM7(13) (=CM13),  
C7(b9), C7(9) (=C9), C7(#11), C7(b13), C7(13) (=C13),  
Cm7(9) (=Cm9), Cm7(11) (=Cm11)

## [하이브리드 코드]
C/D, C/F, CM7/F, C/A (=Am7), Cm/Db, Cm/D, Cm/F, Cm/Ab (=AbM7), Cm/A (=Am7(b5)),  
Cm/B (=CmM7/B)

## [etc.]
5, (no3), (no5)

---

# 결제 시스템 아키텍처 (2026-04-22 기준 완성)

## 이중 보장 흐름
```
결제 성공
├── [즉시] purchasePackage() 반환 customerInfo
│         → setPlan()             앱 UI 즉시 반영
│         → updateSupabasePlan()  Supabase DB 직접 업데이트 (1차)
└── [수초 내] RevenueCat 웹훅 → Edge Function → subscriptions upsert (2차)

앱 재시작 시
  _billingReady 완료 대기
  → syncPlanFromBilling()   RC 유료 플랜이면 updateSupabasePlan()으로 DB 선반영
  → fetchPlanWithToken()    Supabase 읽기 (이미 올바른 값)
```

## 레이스 컨디션 해결 방법
- `initBilling()`은 `_billingReady` Promise를 노출하고 `syncPlanFromBilling()`을 호출하지 않음
- `tryAutoSignIn()`에서 `_billingReady` 완료 후 순서 보장:
  1. `RC.logIn()` → RC 사용자 식별
  2. `syncPlanFromBilling()` → RC 유료이면 Supabase 업데이트
  3. `fetchPlanWithToken()` → Supabase 읽기 (이제 올바른 값)
- `fetchWebPlan()`을 결제/복원 직후에 호출하면 Supabase free로 덮어씀 → 절대 금지

## 주요 상수 (app.js)
```js
const PRODUCT_STANDARD = '$rc_monthly';  // RevenueCat 실제 identifier
const PRODUCT_PRO      = 'pro_monthly';
const ENTITLEMENT_STANDARD = 'standard_entitlement';
const ENTITLEMENT_PRO      = 'pro_entitlement';
```