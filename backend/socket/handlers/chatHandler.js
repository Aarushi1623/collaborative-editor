import { sanitizeRoomId, sanitizeUsername, sanitizeMessage } from '../../utils/validate.js';

/**
 * Registers chat message listeners.
 *
 * Events handled:
 *   chat-message — relay a user's message to all peers in the room
 */
export default function registerChatHandler(socket, io) {
  socket.on('chat-message', ({ roomId: rawRoomId, message: rawMessage, username: rawUsername }) => {
    const roomId  = sanitizeRoomId(rawRoomId);
    const message = sanitizeMessage(rawMessage);
    if (!roomId || !message) return;

    io.to(roomId).emit('chat-message', {
      userId:    socket.id,
      username:  sanitizeUsername(rawUsername),
      message,
      timestamp: Date.now(),
    });
  });
}
