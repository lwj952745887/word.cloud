import { io } from 'socket.io-client';

// ── Same-Origin Connection ───────────────────────────────────────
// No URL = connects to current page's origin.
// In production: Nginx proxies /socket.io to Node.js backend
// In development: Vite dev server proxies /socket.io to localhost:3001
// This avoids all mixed-content, CORS, and URL configuration issues.
// ─────────────────────────────────────────────────────────────────
const socket = io({
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
