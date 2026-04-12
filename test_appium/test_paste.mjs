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
  const img = await driver.takeScreenshot();
  writeFileSync(`${OUT}/clip_${name}.png`, img, 'base64');
  console.log(`[ss] clip_${name}.png`);
}
async function js(script) { return driver.execute(script); }
async function assertProject() {
  const v = await js(`
    const vp = document.getElementById('view-project');
    return (vp && !vp.classList.contains('hidden') && getComputedStyle(vp).display !== 'none') ? 'project' : 'other';
  `);
  if (v !== 'project') throw new Error(`[PAGE LEAVE] current: ${v}`);
}
async function getLineState() {
  return js(`
    return Array.from(document.querySelectorAll('.project-line')).map(l => ({
      text: Array.from(l.childNodes).filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim(),
      slots: l.querySelectorAll('.chord-slot').length,
      filled: l.querySelectorAll('.chord-slot img').length,
    }));
  `);
}

try {
  console.log('Connecting...');
  driver = await remote({
    protocol: 'http', hostname: '127.0.0.1', port: 4723, path: '/',
    capabilities: caps, connectionRetryCount: 1, logLevel: 'warn',
  });
  await sleep(2000);

  // NATIVE 컨텍스트에서 클립보드 읽기
  const ctxs = await driver.getContexts();
  console.log('Contexts:', JSON.stringify(ctxs));

  // 클립보드는 NATIVE 컨텍스트에서 읽어야 함
  const nativeCtx = ctxs.find(c => (typeof c === 'string' ? c : c.id) === 'NATIVE_APP');
  if (nativeCtx) await driver.switchContext('NATIVE_APP');

  const clipRaw = await driver.getClipboard();
  const clipText = Buffer.from(clipRaw, 'base64').toString('utf8');
  console.log('\n=== 기기 클립보드 원문 ===');
  console.log(JSON.stringify(clipText));
  console.log('길이:', clipText.length);
  console.log('줄 수:', clipText.split('\n').length);
  console.log('\\r 포함:', clipText.includes('\r'));
  console.log('\\n 포함:', clipText.includes('\n'));
  console.log('\\u2028 포함:', clipText.includes('\u2028'));
  console.log('\\u2029 포함:', clipText.includes('\u2029'));
  writeFileSync(`${OUT}/clipboard_raw.txt`, clipText, 'utf8');

  // WebView 컨텍스트로 전환
  const appCtx = ctxs.find(c => (typeof c === 'string' ? c : c.id)?.includes('WEBVIEW_com.chorditor.app'));
  if (appCtx) await driver.switchContext(typeof appCtx === 'string' ? appCtx : appCtx.id);

  await assertProject();
  console.log('\nOn project page ✓');

  // 편집 모드 확인
  const modeState = await js(`
    const linesEl = document.querySelector('.project-lines');
    return { editable: linesEl?.contentEditable, btnText: Array.from(document.querySelectorAll('.project-header-btn')).map(b=>b.textContent.trim()).join(',') };
  `);
  console.log('Mode:', modeState);
  await ss('00_initial');

  if (modeState.editable !== 'true') {
    await js(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='편집'&&b.classList.contains('project-header-btn'))?.click()`);
    await sleep(700);
    await assertProject();
  }

  const before = await getLineState();
  console.log(`\nBefore: ${before.length} lines`);
  before.forEach((l, i) => console.log(`  [${i}] "${l.text.substring(0,40)}" | slots:${l.slots}`));

  // 마지막 라인에 포커스 + 커서 끝
  const tapCoord = await js(`
    const linesEl = document.querySelector('.project-lines');
    const lastLine = linesEl?.querySelector('.project-line:last-child');
    if (lastLine) {
      lastLine.focus();
      const range = document.createRange();
      range.selectNodeContents(lastLine);
      range.collapse(false);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      lastLine.scrollIntoView({ block: 'center' });
    }
    const r = lastLine?.getBoundingClientRect();
    return r ? { x: Math.round(r.left + 30), y: Math.round(Math.min(r.top + r.height/2, window.innerHeight - 20)) } : null;
  `);
  console.log('\nTap coord:', tapCoord);
  if (!tapCoord) throw new Error('project-lines not found');

  await ss('01_before_paste');

  // 탭 → 포커스
  await driver.performActions([{
    type: 'pointer', id: 'f1', parameters: { pointerType: 'touch' },
    actions: [
      { type: 'pointerMove', duration: 0, x: tapCoord.x, y: tapCoord.y },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: 80 },
      { type: 'pointerUp', button: 0 },
    ]
  }]);
  await sleep(500);
  await assertProject();

  // Ctrl+V
  console.log('Sending Ctrl+V...');
  await driver.keys(['\uE009', 'v']);
  await sleep(1500);
  await assertProject();
  await ss('02_after_paste');

  const after = await getLineState();
  console.log(`\nAfter: ${after.length} lines`);
  after.forEach((l, i) => console.log(`  [${i}] "${l.text.substring(0,50)}" | slots:${l.slots}`));

  const addedLines = after.length - before.length;
  const clipLines = clipText.split('\n').filter(l => l.trim() !== '').length;
  console.log(`\n=== RESULT ===`);
  console.log(`클립보드 줄 수(비어있지 않은): ${clipLines}`);
  console.log(`추가된 row 수: ${addedLines}`);
  console.log(`Row 생성: ${addedLines >= clipLines - 1 ? 'PASS ✓' : `FAIL (got ${addedLines}, expected ~${clipLines - 1})`}`);

  const newLines = after.slice(before.length - 1);
  newLines.forEach((l, i) => {
    console.log(`  새 row[${i}] slots:${l.slots} text:"${l.text.substring(0,40)}" → ${l.slots > 0 ? 'PASS ✓' : 'FAIL'}`);
  });

  await ss('03_final');

} catch(e) {
  if (e.message.startsWith('[PAGE LEAVE]')) {
    console.error('\n!!!! PAGE LEAVE - STOP !!!!');
    console.error(e.message);
  } else {
    console.error('\nERROR:', e.message);
  }
  if (driver) { try { await driver.takeScreenshot().then(img => writeFileSync(`${OUT}/clip_error.png`, img, 'base64')); } catch(_) {} }
} finally {
  if (driver) { await driver.deleteSession().catch(() => {}); }
  console.log('Done.');
}
