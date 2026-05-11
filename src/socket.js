import { io } from 'socket.io-client';

// In production, connect to the Render backend via WSS
// In development, Vite proxy handles forwarding to localhost:3001
const WS_URL = import.meta.env.VITE_WS_URL;

const socket = io(WS_URL || undefined, {
  transports: ['websocket', 'polling'],
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});

export default socket;
