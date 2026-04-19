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
├── image/            # 핑거링 이미지 (root, common, barre, open, mute)
├── www/              # 빌드 출력 (app.js / index.html / style.css 복사본)
├── android/          # Android Studio 프로젝트
│   ├── app/src/main/assets/public/   # ← 앱 배포 파일 위치
│   └── variables.gradle              # compileSdk / targetSdk 버전 관리
├── capacitor.config.json
└── package.json
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

### 3. 모바일(Android) 특화
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