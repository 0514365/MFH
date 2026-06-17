// MFH-STATIC-PREVIEW-SERVER
// letter-templates 루트를 정적 서빙하는 최소 서버 (preview_start 'letter-static' 전용).
// python http.server 가 sandbox 의 os.getcwd() 권한 오류로 못 떠서 node 로 대체.
// ROOT 는 절대경로 하드코딩(getcwd 미사용).
import http from 'http';
import fs from 'fs';
import path from 'path';

const ROOT = '/Users/wbook_m1/Library/CloudStorage/Dropbox-개인용/MFH/letter-templates';
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif', '.json': 'application/json',
};

http.createServer((req, res) => {
  const rel = decodeURIComponent((req.url || '/').split('?')[0]);
  let p = path.join(ROOT, rel);
  if (rel.endsWith('/')) p = path.join(p, 'index.html');
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('404: ' + rel); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(8765, () => console.log('MFH static preview on http://localhost:8765'));
