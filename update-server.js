// ============================================================
// 简单更新文件服务器
// 用法: node deploy/update-server.js
// 然后移动端连到 http://你的电脑IP:3456
// ============================================================
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const PORT = 3456;
const DEPLOY_DIR = __dirname;

// 获取本机局域网 IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];
  const filePath = path.join(DEPLOY_DIR, url === '/' ? 'version.json' : url);
  const ext = path.extname(filePath);

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
    console.log(`[${new Date().toLocaleTimeString()}] 200 ${url}`);
  } catch (e) {
    res.writeHead(404);
    res.end('Not Found');
    console.log(`[${new Date().toLocaleTimeString()}] 404 ${url}`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n========================================');
  console.log('  更新服务器已启动');
  console.log('  地址: http://' + ip + ':' + PORT);
  console.log('========================================\n');
  console.log('发布新版本:');
  console.log('  1. 修改 deploy/version.json 中的 version');
  console.log('  2. 把新版 index.html 放到 deploy/app.html');
  console.log('  3. App 下次启动时会自动检测并下载\n');
});
