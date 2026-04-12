import { remote } from 'webdriverio';
import { writeFileSync, mkdirSync } from 'fs';
import { Buffer } from 'buffer';

const OUT = 'H:/Project/Project/Chords_editor/test_appium/screenshots';
try { mkdirSync(OUT, { recursive: true }); } catch(_) {}

const caps = {
  platformName: 'Android',
  'appium:deviceName': 'R5KYC01EDGN',
  'appium:automationName': 'UiAutomator2',
  'appium:appPackage': 'com.chorditor.app',
  'appium:appActivity': 'com.chorditor.app.MainActivity',
  'appium:noReset': true,
  'appium:newCommandTimeout': 120,
  'appium:chromedriverExecutable': 'D:/AndroidSdk/chromedriver/chromedriver.exe',
};

let driver;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ss(name) {
  try {
    const img = await driver.takeScreenshot();
    writeFileSync(`${OUT}/${name}.png`, img, 'base64');
    console.log(`[ss] ${name}.png`);
  } catch(e) { console.log(`[ss fail] ${name}: ${e.message}`); }
}

async function tap(x, y, ms = 80) {
  await driver.performActions([{
    type: 'pointer', id: 'f1', parameters: { pointerType: 'touch' },
    actions: [
      { type: 'pointerMove', duration: 0, x, y },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: ms },
      { type: 'pointerUp', button: 0 },
    ]
  }]);
  await sleep(500);
}

async function longPress(x, y, ms = 600) {
  await driver.performActions([{
    type: 'pointer', id: 'f1', parameters: { pointerType: 'touch' },
    actions: [
      { type: 'pointerMove', duration: 0, x, y },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: ms },
      { type: 'pointerUp', button: 0 },
    ]
  }]);
  await sleep(500);
}

async function drag(sx, sy, ex, ey, holdMs = 600, moveMs = 500) {
  await driver.performActions([{
    type: 'pointer', id: 'f1', parameters: { pointerType: 'touch' },
    actions: [
      { type: 'pointerMove', duration: 0, x: sx, y: sy },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: holdMs },
      { type: 'pointerMove', duration: moveMs, x: ex, y: ey },
      { type: 'pointerUp', button: 0 },
    ]
  }]);
  await sleep(600);
}

// JS 실행 (WebView 컨텍스트)
async function js(script) {
  return await driver.execute(script);
}

try {
  console.log('Connecting to Appium...');
  driver = await remote({
    protocol: 'http', hostname: '127.0.0.1', port: 4723, path: '/',
    capabilities: caps,
    connectionRetryCount: 1,
    logLevel: 'warn',
  });
  console.log('Connected!');
  await sleep(3000);
  await ss('01_launch');

  // 올바른 WebView 컨텍스트로 전환
  const ctxs = await driver.getContexts();
  console.log('Contexts:', JSON.stringify(ctxs));

  // com.chorditor.app WebView 우선
  const appCtx = ctxs.find(c => {
    const id = typeof c === 'string' ? c : c.id;
    return id && id.includes('WEBVIEW_com.chorditor.app');
  });
  const webCtxId = appCtx
    ? (typeof appCtx === 'string' ? appCtx : appCtx.id)
    : (() => {
        const f = ctxs.find(c => {
          const id = typeof c === 'string' ? c : c.id;
          return id && id.includes('WEBVIEW');
        });
        return f ? (typeof f === 'string' ? f : f.id) : null;
      })();

  if (webCtxId) {
    await driver.switchContext(webCtxId);
    console.log('Switched to:', webCtxId);
  }
  const { width, height } = await driver.getWindowSize();
  console.log(`Screen: ${width}x${height}`);

  // ====================================================
  // 사이드바 열기 → 프로젝트로 이동
  // ====================================================
  console.log('\n--- Navigate to Project Page ---');
  // 햄버거 버튼 탭 (상단 좌측)
  await tap(30, 30);
  await ss('02_sidebar_open');

  // 사이드바에서 최근 프로젝트 클릭
  try {
    const sidebarItem = await driver.$('.sidebar-item');
    const rect = await sidebarItem.getLocation();
    const size = await sidebarItem.getSize();
    const cx = rect.x + size.width / 2;
    const cy = rect.y + size.height / 2;
    console.log(`Sidebar item at (${cx}, ${cy})`);
    await tap(cx, cy);
  } catch(e) {
    console.log('Sidebar item not found via CSS:', e.message);
    // fallback: JS로 클릭
    await js(`
      const item = document.querySelector('.sidebar-item');
      if (item) item.click();
    `);
    await sleep(500);
  }
  await ss('03_project_page');

  // 현재 페이지 확인
  const currentView = await js(`
    const views = ['view-editor','view-project','view-home'];
    for (const v of views) {
      const el = document.getElementById(v);
      if (el && !el.classList.contains('hidden') && el.style.display !== 'none') return v;
    }
    return document.querySelector('.view:not(.hidden)')?.id || 'unknown';
  `);
  console.log('Current view:', currentView);

  // ====================================================
  // TEST 1: 프로젝트 페이지 Hold 버튼
  // ====================================================
  console.log('\n=== TEST 1: Hold Button in Project Page ===');

  // 편집 모드 진입 (edit 버튼 클릭)
  try {
    await js(`
      const editBtn = document.querySelector('[onclick*="editMode"], .edit-btn, #edit-btn');
      if (editBtn) { editBtn.click(); console.log('edit clicked'); }
    `);
    await sleep(600);
  } catch(e) {}
  await ss('04_edit_mode');

  // 코드 썸네일 위치 파악
  const thumbPos = await js(`
    const thumb = document.querySelector('.chord-thumb');
    if (!thumb) return null;
    const r = thumb.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height };
  `);
  console.log('Thumb position:', thumbPos);

  if (thumbPos) {
    const tx = Math.round(thumbPos.x);
    const ty = Math.round(thumbPos.y);

    // 1-A: 단순 탭 (드래그 없어야 함)
    console.log(`1-A: Quick tap at (${tx}, ${ty})`);
    await tap(tx, ty, 80);
    await ss('05_after_quick_tap');

    // 1-B: 8px 이하 미세 이동 (드래그 모드 진입 안 해야 함)
    console.log('1-B: Micro drag < 8px (should NOT trigger drag)');
    await driver.performActions([{
      type: 'pointer', id: 'f1', parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: tx, y: ty },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 100 },
        { type: 'pointerMove', duration: 200, x: tx + 5, y: ty + 5 },
        { type: 'pointerUp', button: 0 },
      ]
    }]);
    await sleep(600);
    await ss('06_after_micro_drag');

    // 1-C: 실제 드래그 (8px 초과, ghost 생성 확인)
    console.log('1-C: Real drag > 8px (should trigger ghost drag)');
    await drag(tx, ty, tx + 100, ty, 0, 600);
    await ss('07_after_real_drag');

    // ghost가 사라졌는지 확인
    const ghostExists = await js(`!!document.querySelector('.drag-ghost')`);
    console.log('Ghost after drag:', ghostExists, ghostExists ? 'FAIL (not cleaned up)' : 'OK');

    // 1-D: 드래그 중 아이콘 레이어 체크 (z-index 확인)
    const layerInfo = await js(`
      const thumb = document.querySelector('.chord-thumb');
      const delBtn = document.querySelector('.chord-thumb-delete');
      if (!thumb || !delBtn) return 'elements not found';
      const ts = window.getComputedStyle(thumb);
      const ds = window.getComputedStyle(delBtn);
      return { thumbZ: ts.zIndex, delBtnZ: ds.zIndex, pointerEvents: ds.pointerEvents };
    `);
    console.log('Layer info:', layerInfo);

  } else {
    console.log('No .chord-thumb found - project may be empty or not in edit mode');
    // 프로젝트 페이지 DOM 상태 확인
    const domInfo = await js(`
      return {
        body: document.body.className,
        visibleViews: Array.from(document.querySelectorAll('.view')).map(v => ({
          id: v.id, hidden: v.classList.contains('hidden'), display: getComputedStyle(v).display
        }))
      };
    `);
    console.log('DOM info:', JSON.stringify(domInfo, null, 2));
    await ss('05_no_thumb_debug');
  }

  // ====================================================
  // TEST 2: 클립보드 붙여넣기
  // ====================================================
  console.log('\n=== TEST 2: Clipboard Paste ===');

  // 에디터 뷰로 이동
  await js(`navigateTo('editor')`);
  await sleep(800);
  await ss('08_editor_view');

  const testText = '[C]안녕하세요 [G]World\n[Am]코드 [F]붙여넣기 테스트';
  const b64 = Buffer.from(testText, 'utf8').toString('base64');
  await driver.setClipboard(b64, 'plainText');
  console.log('Clipboard set to:', testText);

  // 텍스트 에디터 영역(.lines-editor) 클릭
  const linesPos = await js(`
    const el = document.querySelector('.lines-editor, #lines-editor, [contenteditable]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + 20, y: r.top + 20 };
  `);
  console.log('Lines editor pos:', linesPos);

  if (linesPos) {
    await tap(Math.round(linesPos.x), Math.round(linesPos.y));
    await sleep(400);
    await ss('09_editor_focused');

    // Ctrl+V
    await driver.keys(['\uE009', 'v']);
    await sleep(800);
    await ss('10_after_ctrl_v');

    // 결과 확인
    const lineContent = await js(`
      const el = document.querySelector('.lines-editor, #lines-editor, [contenteditable]');
      return el ? el.innerText || el.textContent : 'not found';
    `);
    console.log('Lines content after ctrl+v:', lineContent?.substring(0, 200));

    // 일반 텍스트 붙여넣기와 동일한지 비교
    const hasChordNotation = lineContent && (lineContent.includes('[C]') || lineContent.includes('[Am]'));
    console.log('Chord notation preserved:', hasChordNotation ? 'PASS' : 'CHECK NEEDED');

  } else {
    console.log('Lines editor not found');
    const inputElements = await js(`
      return Array.from(document.querySelectorAll('[contenteditable], textarea, .line, .chord-line'))
        .map(e => ({ tag: e.tagName, class: e.className.substring(0,40), editable: e.contentEditable })).slice(0,5)
    `);
    console.log('Input elements:', JSON.stringify(inputElements));
    await ss('09_no_editor_debug');
  }

  // ====================================================
  // 사이드바 hold (500ms) 테스트
  // ====================================================
  console.log('\n=== TEST 3: Sidebar Item Hold (500ms) ===');
  await tap(30, 30); // 햄버거 열기
  await sleep(400);
  await ss('11_sidebar_for_hold');

  const sidebarItemPos = await js(`
    const item = document.querySelector('.sidebar-item');
    if (!item) return null;
    const r = item.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
  `);

  if (sidebarItemPos) {
    const sx = Math.round(sidebarItemPos.x);
    const sy = Math.round(sidebarItemPos.y);

    // 3-A: 짧은 탭 → actions 표시 안 해야 함
    await tap(sx, sy, 100);
    await sleep(300);
    const actionsAfterTap = await js(`!!document.querySelector('.sidebar-item.show-actions')`);
    console.log('3-A Quick tap shows actions:', actionsAfterTap, actionsAfterTap ? 'CHECK (unexpected)' : 'PASS');
    await ss('12_sidebar_tap_result');

    // 3-B: 600ms hold → actions 표시되어야 함
    await longPress(sx, sy, 600);
    await sleep(300);
    const actionsAfterHold = await js(`!!document.querySelector('.sidebar-item.show-actions')`);
    console.log('3-B Hold 600ms shows actions:', actionsAfterHold, actionsAfterHold ? 'PASS' : 'FAIL');
    await ss('13_sidebar_hold_result');

    // 3-C: hold 중 포인터 이탈 → actions 표시 안 해야 함
    await driver.performActions([{
      type: 'pointer', id: 'f1', parameters: { pointerType: 'touch' },
      actions: [
        { type: 'pointerMove', duration: 0, x: sx, y: sy },
        { type: 'pointerDown', button: 0 },
        { type: 'pause', duration: 300 },
        { type: 'pointerMove', duration: 100, x: sx + 100, y: sy }, // 이탈
        { type: 'pointerUp', button: 0 },
      ]
    }]);
    await sleep(300);
    const actionsAfterLeave = await js(`!!document.querySelector('.sidebar-item.show-actions')`);
    console.log('3-C Pointer leave cancels hold:', !actionsAfterLeave ? 'PASS' : 'CHECK (still showing)');
    await ss('14_sidebar_leave_result');
  } else {
    console.log('Sidebar item not found for hold test');
  }

  await ss('15_final');
  console.log('\n=== ALL TESTS DONE ===');
  console.log('Screenshots:', OUT);

} catch(e) {
  console.error('\nFATAL ERROR:', e.message);
  if (driver) { await ss('error').catch(() => {}); }
} finally {
  if (driver) {
    await driver.deleteSession().catch(() => {});
    console.log('Session closed.');
  }
}
