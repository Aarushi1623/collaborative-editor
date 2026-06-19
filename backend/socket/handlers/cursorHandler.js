import { sanitizeRoomId, sanitizeUsername, isValidCursor } from '../../utils/validate.js';

/**
 * Registers cursor-position listeners.
 *
 * Events handled:
 *   cursor-move — relay caret coordinates + username to room peers
 */
export default function registerCursorHandler(socket, _io) {
  socket.on('cursor-move', ({ roomId: rawRoomId, cursor, username: rawUsername }) => {
    const roomId = sanitizeRoomId(rawRoomId);
    if (!roomId || !isValidCursor(cursor)) return;

    socket.to(roomId).emit('cursor-move', {
      userId:   socket.id,
      username: sanitizeUsername(rawUsername),
      cursor,   // { lineNumber, column }
    });
  });
}
