const MAX_ROOM_ID_LEN  = 64;
const MAX_CONTENT_BYTES = 1_000_000; // 1 MB
const MAX_USERNAME_LEN  = 32;
const MAX_MESSAGE_LEN   = 500;
const MAX_ROOM_NAME_LEN = 40;

/**
 * Coerces a socket/HTTP payload value to a safe room ID string.
 * Returns null when the value is absent, too long, or starts with a
 * MongoDB operator prefix ('$') — covering the most common NoSQL
 * injection vector where JSON deserialization turns a string into an object.
 */
export function sanitizeRoomId(raw) {
  if (raw === null || raw === undefined) return null;
  const str = String(raw).trim();
  if (!str || str.length > MAX_ROOM_ID_LEN || str.startsWith('$')) return null;
  return str;
}

export function sanitizeUsername(raw) {
  if (!raw) return 'Anonymous';
  return String(raw).trim().slice(0, MAX_USERNAME_LEN) || 'Anonymous';
}

export function sanitizeRoomName(raw) {
  if (!raw) return null;
  const str = String(raw).trim().slice(0, MAX_ROOM_NAME_LEN);
  return str || null;
}

export function sanitizeMessage(raw) {
  if (!raw) return null;
  const str = String(raw).trim().slice(0, MAX_MESSAGE_LEN);
  return str || null;
}

/** Guards the write-behind cache against multi-MB document bombs. */
export function isContentSafe(content) {
  return typeof content === 'string' && Buffer.byteLength(content, 'utf8') <= MAX_CONTENT_BYTES;
}

/** Validates that a cursor payload has the expected numeric shape. */
export function isValidCursor(cursor) {
  return (
    cursor !== null &&
    typeof cursor === 'object' &&
    !Array.isArray(cursor) &&
    typeof cursor.lineNumber === 'number' &&
    typeof cursor.column === 'number' &&
    cursor.lineNumber >= 1 &&
    cursor.column >= 1
  );
}
