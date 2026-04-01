const chokidar = require('chokidar');
const { exec } = require('child_process');

console.log('파일 감시 시작... (index.html, style.css, app.js, image/)');

const watcher = chokidar.watch([
  'index.html',
  'style.css', 
  'app.js',
  'image'
], {
  persistent: true,
  ignoreInitial: true
});

watcher.on('change', (path) => {
  console.log(`변경 감지: ${path}`);
  console.log('Android 동기화 중...');
  
  exec('xcopy index.html www\\ /Y && xcopy style.css www\\ /Y && xcopy app.js www\\ /Y && xcopy image www\\image\\ /E /Y && npx cap sync android', 
    (err, stdout, stderr) => {
      if (err) {
        console.error('오류:', err);
        return;
      }
      console.log('동기화 완료! ✅');
    }
  );
});

// cmd 실행 : node watch.js