import { Server } from 'socket.io';
import cache from '../cache/writeBehindCache.js';
import registerDeltaHandler from './handlers/deltaHandler.js';
import registerCursorHandler from './handlers/cursorHandler.js';
import registerChatHandler from './handlers/chatHandler.js';
import { sanitizeRoomId, sanitizeUsername, sanitizeRoomName } from '../utils/validate.js';

/**
 * roomRegistry: roomId → Map<socketId, { username }>
 * Tracks every connected member with their display name so we can
 * broadcast rich presence (count + names) to all peers.
 */
const roomRegistry = new Map();

export default function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
    pingTimeout:  60_000,
    pingInterval: 25_000,
  });

  const flushMs = parseInt(process.env.FLUSH_INTERVAL_MS ?? '5000', 10);
  cache.startFlushInterval(flushMs);

  io.on('connection', (socket) => {
    console.log(`[Socket] + ${socket.id}`);

    // ── Room lifecycle ──────────────────────────────────────────────────────────

    socket.on('join-room', ({ roomId: rawRoomId, username: rawUsername }) => {
      const roomId   = sanitizeRoomId(rawRoomId);
      const username = sanitizeUsername(rawUsername);
      if (!roomId) return;

      socket.join(roomId);

      if (!roomRegistry.has(roomId)) roomRegistry.set(roomId, new Map());
      roomRegistry.get(roomId).set(socket.id, { username });

      broadcastRoomUsers(io, roomId);
      console.log(`[Socket] "${username}" (${socket.id}) joined room "${roomId}" (${roomRegistry.get(roomId).size} users)`);
    });

    socket.on('leave-room', ({ roomId: rawRoomId }) => {
      const roomId = sanitizeRoomId(rawRoomId);
      if (roomId) handleLeave(socket, io, roomId);
    });

    // ── Room rename ─────────────────────────────────────────────────────────────
    // Just a relay — no persistence needed for this display-name feature.
    socket.on('room-rename', ({ roomId: rawRoomId, name: rawName }) => {
      const roomId = sanitizeRoomId(rawRoomId);
      const name   = sanitizeRoomName(rawName);
      if (!roomId || !name) return;
      io.to(roomId).emit('room-renamed', { name });
    });

    // ── Disconnect ──────────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      console.log(`[Socket] - ${socket.id}`);
      roomRegistry.forEach((_, roomId) => {
        if (roomRegistry.get(roomId)?.has(socket.id)) {
          handleLeave(socket, io, roomId);
        }
      });
    });

    // ── Feature handlers ────────────────────────────────────────────────────────

    registerDeltaHandler(socket, io);
    registerCursorHandler(socket, io);
    registerChatHandler(socket, io);
  });

  process.on('SIGTERM', () => cache.teardown().then(() => process.exit(0)));
  process.on('SIGINT',  () => cache.teardown().then(() => process.exit(0)));
}

function handleLeave(socket, io, roomId) {
  socket.leave(roomId);

  const members = roomRegistry.get(roomId);
  if (!members) return;

  members.delete(socket.id);

  if (members.size === 0) {
    roomRegistry.delete(roomId);
  } else {
    broadcastRoomUsers(io, roomId);
  }

  io.to(roomId).emit('cursor-leave', { userId: socket.id });
}

function broadcastRoomUsers(io, roomId) {
  const members = roomRegistry.get(roomId);
  const users = members
    ? [...members.entries()].map(([id, data]) => ({ id, username: data.username }))
    : [];
  io.to(roomId).emit('room-users', { count: users.length, users });
}
