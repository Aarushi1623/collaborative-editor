import cache from '../../cache/writeBehindCache.js';
import { sanitizeRoomId, isContentSafe } from '../../utils/validate.js';

/**
 * Registers document delta and initial-state request listeners on a socket.
 *
 * Events handled:
 *   document-delta   — client pushed a text change; update cache and fan-out to room peers
 *   request-document — client asks for the current document state on join
 */
export default function registerDeltaHandler(socket, io) {
  socket.on('document-delta', ({ roomId: rawRoomId, delta, content, language }) => {
    const roomId = sanitizeRoomId(rawRoomId);
    if (!roomId || !isContentSafe(content)) return;

    cache.set(roomId, content, language ?? 'javascript');

    // Broadcast to all OTHER clients in the room (socket.to excludes the sender)
    socket.to(roomId).emit('document-delta', {
      delta,
      content,
      language,
      userId: socket.id,
    });
  });

  socket.on('request-document', async ({ roomId: rawRoomId }) => {
    const roomId = sanitizeRoomId(rawRoomId);
    if (!roomId) return;

    let entry = cache.get(roomId);
    if (!entry) entry = await cache.loadFromDB(roomId);

    socket.emit('document-state', {
      content:  entry?.content  ?? '',
      language: entry?.language ?? 'javascript',
    });
  });
}
