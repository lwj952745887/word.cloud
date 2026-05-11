import { io } from 'socket.io-client';

// Detect production vs development
const isProd = window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

// In production (GitHub Pages), connect to Render backend
// In development, Vite proxy handles forwarding to localhost:3001
const WS_URL = isProd
  ? 'wss://word-cloud-2zah.onrender.com'
  : undefined;

const socket = io(WS_URL, {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});

// Log connection events for debugging
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
});
socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err.message);
});

export default socket;
