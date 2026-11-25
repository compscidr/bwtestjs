// Minimal web server for the browser tests.
//
// Serves the repo as static files and stands in for the things bwtest.js
// expects from a real deployment:
//  - GET  *.dat -> a small payload, whatever the file name, so the test can walk
//                  the whole 28.8kbps..1Gbps ladder without 1GB of fixtures
//  - POST *     -> body is consumed and acknowledged (upload test)
//  - HEAD *     -> handled like GET without a body (rtt test)
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2]) || 8123;
const PAYLOAD = Buffer.alloc(20 * 1024, 'x');
// Keeps every transfer measurably longer than 0ms, so throughput is finite.
const DELAY_MS = 20;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png'
};

function send(req, res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': body.length });
  res.end(req.method === 'HEAD' ? undefined : body);
}

http.createServer(function (req, res) {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

  if (req.method === 'POST') {
    req.resume();
    req.on('end', function () {
      setTimeout(function () { send(req, res, 200, 'text/plain', Buffer.from('ok')); }, DELAY_MS);
    });
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(req, res, 405, 'text/plain', Buffer.from('method not allowed'));
  }

  if (pathname.endsWith('.dat')) {
    return setTimeout(function () { send(req, res, 200, 'text/plain', PAYLOAD); }, DELAY_MS);
  }

  const file = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(ROOT + path.sep)) {
    return send(req, res, 403, 'text/plain', Buffer.from('forbidden'));
  }
  fs.readFile(file, function (err, data) {
    if (err) {
      return send(req, res, 404, 'text/plain', Buffer.from('not found'));
    }
    send(req, res, 200, TYPES[path.extname(file)] || 'application/octet-stream', data);
  });
}).listen(PORT, '127.0.0.1', function () {
  console.log('test server listening on http://127.0.0.1:' + PORT);
});
