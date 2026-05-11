const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());

// Health check for Render
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

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

// Serve static files if dist/ exists (standalone deployment)
const distPath = path.join(__dirname, '..', 'dist');
const fs = require('fs');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('Serving static files from:', distPath);

  // SPA fallback for standalone deployment
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
  console.log('No dist/ found - running in API-only mode for GitHub Pages deployment');
  app.get('/', (req, res) => {
    res.json({
      service: 'word-cloud-server',
      status: 'running',
      message: 'Backend WebSocket server is running. Connect frontend via GitHub Pages.'
    });
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Word.Cloud server running on http://0.0.0.0:${PORT}`);
});
