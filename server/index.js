// ═══════════════════════════════════════════════════════════════════
// Word Cloud Server - Bulletproof Edition
// ═══════════════════════════════════════════════════════════════════
// Design principles:
// 1. Defensive module loading - clearly log each require
// 2. Fallback to built-in http module if express fails
// 3. Every error is logged with full stack trace
// 4. Health endpoint works even in degraded mode
// 5. Process always stays alive (Render health check compatibility)
// ═══════════════════════════════════════════════════════════════════

'use strict';

// ── Keep-Alive Sentinel ───────────────────────────────────────────
// Logs every 60s so Render can see the process is alive
const ALIVE_INTERVAL = setInterval(() => {
  console.log('[ALIVE] pid=' + process.pid + ' uptime=' + Math.floor(process.uptime()) + 's mem=' + Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB');
}, 60000);
ALIVE_INTERVAL.unref();

// ── Global Error Handlers ─────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[FATAL] UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] UNHANDLED REJECTION:', reason);
});

// ── Startup Banner ────────────────────────────────────────────────
console.log('[BOOT] === Word Cloud Server Starting ===');
console.log('[BOOT] node=' + process.version + ' pid=' + process.pid + ' cwd=' + process.cwd());
console.log('[BOOT] PORT=' + (process.env.PORT || '(unset, will use 3001)'));
console.log('[BOOT] __dirname=' + __dirname);

// ── Built-in Modules (always available) ───────────────────────────
const http = require('http');
const path = require('path');
const fs = require('fs');

const distPath = path.join(__dirname, '..', 'dist');

// ── Defensive Dependency Loading ──────────────────────────────────
// Try to load express; fall back to raw http module
let express;
let cors;
let app;
let usingExpress = false;

try {
  express = require('express');
  console.log('[LOAD] express: OK');
  try {
    cors = require('cors');
    console.log('[LOAD] cors: OK');
  } catch (e) {
    console.log('[LOAD] cors: FAILED (' + e.message + ') - will use manual CORS headers');
  }
  app = express();
  usingExpress = true;
  console.log('[LOAD] express app created');
} catch (e) {
  console.log('[LOAD] express: FAILED (' + e.message + ') - falling back to raw http');
  // Create a simple request handler for the raw http server
  app = null;
}

let io = null;
let Server;
try {
  Server = require('socket.io').Server;
  console.log('[LOAD] socket.io: OK');
} catch (e) {
  console.log('[LOAD] socket.io: FAILED (' + e.message + ')');
}

console.log('[BOOT] all module loading complete');

// ── Application Setup ─────────────────────────────────────────────
if (usingExpress && app) {
  // CORS
  if (cors) {
    app.use(cors());
    console.log('[CORS] using cors middleware');
  } else {
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') return res.sendStatus(200);
      next();
    });
    console.log('[CORS] using manual headers');
  }

  // Health check (always at /health)
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'word-cloud-server',
      uptime: process.uptime(),
      node: process.version,
      pid: process.pid,
      time: new Date().toISOString()
    });
  });

  // Static file serving (if dist/ exists)
  try {
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      console.log('[STATIC] serving dist from ' + distPath);
    } else {
      console.log('[STATIC] no dist folder at ' + distPath);
    }
  } catch (e) {
    console.log('[STATIC] error: ' + e.message);
  }

  // Root route
  app.get('/', (req, res) => {
    res.json({
      service: 'word-cloud-server',
      status: 'running',
      node: process.version,
      uptime: process.uptime()
    });
  });
}

// ── Create HTTP Server ────────────────────────────────────────────
let server;

if (usingExpress && app) {
  server = http.createServer(app);
  console.log('[HTTP] created with express app');
} else {
  // Fallback: raw http handler with health check
  server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'word-cloud-server',
        mode: 'fallback-http',
        uptime: process.uptime(),
        node: process.version,
        pid: process.pid,
        time: new Date().toISOString()
      }));
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ status: 'ok', message: 'degraded mode' }));
    }
  });
  console.log('[HTTP] created with fallback raw handler');
}

// ── Socket.IO Setup ───────────────────────────────────────────────
const rooms = {};

if (Server) {
  try {
    io = new Server(server, {
      cors: { origin: '*', methods: ['GET', 'POST'] }
    });
    console.log('[SIO] Socket.IO initialized');

    io.on('connection', (socket) => {
      console.log('[SIO] client connected: ' + socket.id);

      // Host creates a new room
      socket.on('create-room', (callback) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = {
          topic: '',
          words: {},
          wordCount: 0,
          hostId: socket.id,
          dirty: false
        };
        socket.join(roomId);
        console.log('[SIO] room created: ' + roomId + ' by ' + socket.id);

        if (typeof callback === 'function') {
          callback({ roomId });
        }
      });

      // Join an existing room
      socket.on('join-room', ({ roomId }, callback) => {
        const room = rooms[roomId];
        if (!room) {
          if (typeof callback === 'function') {
            callback({ error: 'Room not found' });
          }
          return;
        }
        socket.join(roomId);
        console.log('[SIO] ' + socket.id + ' joined room ' + roomId);

        socket.emit('room-data', {
          topic: room.topic,
          words: { ...room.words },
          wordCount: room.wordCount
        });

        if (typeof callback === 'function') {
          callback({ success: true });
        }
      });

      // Host sets topic
      socket.on('set-topic', ({ roomId, topic }) => {
        const room = rooms[roomId];
        if (room && room.hostId === socket.id) {
          room.topic = topic;
          io.to(roomId).emit('topic-update', topic);
        }
      });

      // Audience submits a word
      socket.on('submit-word', ({ roomId, word }) => {
        const room = rooms[roomId];
        if (!room || !word || !word.trim()) return;

        const normalized = word.trim().slice(0, 30);
        room.words[normalized] = (room.words[normalized] || 0) + 1;
        room.wordCount++;

        if (!room.dirty) {
          room.dirty = true;
          setTimeout(() => {
            if (rooms[roomId]) {
              io.to(roomId).emit('word-update', { ...room.words });
              room.dirty = false;
            }
          }, 300);
        }
      });

      // Host clears all words
      socket.on('clear-words', ({ roomId }) => {
        const room = rooms[roomId];
        if (room && room.hostId === socket.id) {
          room.words = {};
          room.wordCount = 0;
          io.to(roomId).emit('word-update', {});
        }
      });

      // Host ends session
      socket.on('end-session', ({ roomId }) => {
        const room = rooms[roomId];
        if (room && room.hostId === socket.id) {
          io.to(roomId).emit('session-ended');
          delete rooms[roomId];
          console.log('[SIO] room ' + roomId + ' ended');
        }
      });

      socket.on('disconnect', () => {
        console.log('[SIO] client disconnected: ' + socket.id);
      });
    });

    console.log('[SIO] connection handler registered');
  } catch (e) {
    console.log('[SIO] FAILED to initialize Socket.IO: ' + e.message);
    console.log(e.stack);
  }
} else {
  console.log('[SIO] Socket.IO not available - WebSocket functionality disabled');
}

// ── SPA Fallback (Express mode only) ──────────────────────────────
if (usingExpress && app) {
  if (fs.existsSync(distPath)) {
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.json({
          service: 'word-cloud-server',
          status: 'running'
        });
      }
    });
  }
}

// ── Start Listening ───────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

function attemptListen(port) {
  try {
    server.listen(port, '0.0.0.0', () => {
      console.log('[READY] Server listening on port ' + port);
      console.log('[READY] http://0.0.0.0:' + port + '/health');
      console.log('[READY] === Word Cloud Server Started Successfully ===');
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log('[PORT] port ' + port + ' in use, trying ' + (port + 1));
        attemptListen(port + 1);
      } else {
        console.error('[PORT] error: ' + err.message);
      }
    });
  } catch (e) {
    console.error('[PORT] FATAL: ' + e.message);
    console.error(e.stack);
  }
}

attemptListen(PORT);
