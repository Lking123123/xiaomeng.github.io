// 双击无法运行，请按照下面的步骤操作
// 这个文件是给懂一点命令行的朋友准备的
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('✅ 服务已启动！');
  console.log('📱 请在浏览器中打开: http://localhost:3000');
  console.log('💡 按 F12 然后点左上角的手机图标，切换到手机模式查看');
  console.log('⏹ 按 Ctrl+C 可以停止服务');
});
