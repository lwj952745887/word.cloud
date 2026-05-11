const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

// Global error handler - prevents crashes
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

// Log startup info immediately
const startupMsg = JSON.stringify({
  event: 'startup',
  node: process.version,
  cwd: process.cwd(),
  dirname: __dirname,
  port: process.env.PORT || 3001,
  time: new Date().toISOString()
});
console.log('STARTUP:', startupMsg);

app.use(cors());

// Health check - MUST be registered BEFORE any conditional middleware
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    node: process.version
  });
});

// Static file serving (only if dist/ exists)
const distPath = path.join(__dirname, '..', 'dist');
try {
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    console.log('DIST: dist folder found, serving static files');
  } else {
    console.log('DIST: no dist folder, API-only mode');
  }
} catch (e) {
  console.log('DIST: error checking dist folder:', e.message);
}

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

console.log('SOCKET: Socket.IO initialized');

// In-memory store for rooms
const rooms = {};

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

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
    console.log(`Room created: ${roomId} by ${socket.id}`);

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
    console.log(`${socket.id} joined room ${roomId}`);

    // Send current state to the new client
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

    // Throttled broadcast: every 300ms
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
      console.log(`Room ${roomId} ended`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// SPA fallback for standalone deployment (if dist/ exists)
if (fs.existsSync(distPath)) {
  app.get('*', (req, res) => {
    const indexPath = path.join(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(200).json({
        service: 'word-cloud-server',
        status: 'running',
        message: 'Backend API is running. Frontend is served via GitHub Pages.'
      });
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      service: 'word-cloud-server',
      status: 'running',
      message: 'Backend WebSocket server is running. Connect frontend via GitHub Pages.'
    });
  });
}

const PORT = process.env.PORT || 3001;
try {
  server.listen(PORT, '0.0.0.0', () => {
    console.log('LISTEN: server running on port ' + PORT);
  });
  console.log('READY: all modules loaded, waiting for connections');
} catch (e) {
  console.error('FATAL: could not start server:', e.message, e.stack);
  // Keep process alive for Render health check
  setInterval(() => console.log('ALIVE: server failed to start, but process alive'), 30000);
}
