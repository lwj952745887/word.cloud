// Minimal health server for Render diagnostic
// Uses only Node.js built-in modules - no npm dependencies required
const http = require('http');

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  console.log(`[health.js] Request: ${req.method} ${req.url}`);
  
  if (req.url === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), pid: process.pid }));
    return;
  }
  
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify({
    service: 'word-cloud-health-check',
    status: 'running',
    node: process.version,
    env: process.env.NODE_ENV || 'not-set'
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[health.js] Minimal server running on http://0.0.0.0:${PORT}`);
  console.log(`[health.js] Node.js version: ${process.version}`);
  console.log(`[health.js] Health check: http://localhost:${PORT}/health`);
});
