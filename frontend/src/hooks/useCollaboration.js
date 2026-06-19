import { useEffect, useRef, useState, useCallback } from 'react';
import { ensureConnected, getSocket } from '../services/socket.js';

// ── Cursor palette ───────────────────────────────────────────────────────────

const PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
];

// Module-level maps so cursor state survives re-renders within the same session
const userDataMap  = new Map(); // userId → { color, username }
const decorationMap = new Map(); // userId → string[]

let colorIndex = 0;

function getOrAssign(userId, username) {
  if (!userDataMap.has(userId)) {
    userDataMap.set(userId, {
      color:    PALETTE[colorIndex++ % PALETTE.length],
      username: username ?? 'Anonymous',
    });
  } else if (username) {
    // Refresh username in case it changed
    userDataMap.get(userId).username = username;
  }
  return userDataMap.get(userId);
}

function injectCursorStyle(userId, color, username) {
  const id  = `__cs_${userId}`;
  // Sanitise: CSS content values must have escaped quotes/backslashes
  const safeName = (username ?? '?').replace(/\\/g, '\\\\').replace(/"/g, '\\"').slice(0, 24);

  const css = `
    .rc-bar-${userId} {
      border-left: 2px solid ${color};
      margin-left: -1px;
    }
    .rc-flag-${userId} {
      display: inline-block;
      width: 0;
      overflow: visible;
      vertical-align: top;
    }
    .rc-flag-${userId}::before {
      content: "${safeName}";
      position: absolute;
      bottom: 100%;
      left: -1px;
      background: ${color};
      color: #fff;
      font-size: 10px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-weight: 600;
      padding: 1px 5px;
      border-radius: 3px 3px 3px 0;
      white-space: nowrap;
      pointer-events: none;
      z-index: 1000;
      line-height: 15px;
    }
  `;

  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

function renderRemoteCursor(editor, userId, cursor, username) {
  const { color } = getOrAssign(userId, username);
  injectCursorStyle(userId, color, username ?? userDataMap.get(userId)?.username ?? '?');

  const prev = decorationMap.get(userId) ?? [];
  const next = editor.deltaDecorations(prev, [{
    range: {
      startLineNumber: cursor.lineNumber,
      startColumn:     cursor.column,
      endLineNumber:   cursor.lineNumber,
      endColumn:       cursor.column,
    },
    options: {
      className:             `rc-bar-${userId}`,
      beforeContentClassName: `rc-flag-${userId}`,
      stickiness: 1,
    },
  }]);
  decorationMap.set(userId, next);
}

function clearRemoteCursor(editor, userId) {
  const prev = decorationMap.get(userId);
  if (prev?.length) editor.deltaDecorations(prev, []);
  decorationMap.delete(userId);
  document.getElementById(`__cs_${userId}`)?.remove();
  userDataMap.delete(userId);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages the full Socket.io lifecycle for a collaborative editing session.
 *
 * Returns helpers for emitting events and reactive state for UI (users, chat, roomName).
 */
export function useCollaboration({ roomId, username, editorRef, setLanguage }) {
  const isRemoteChange = useRef(false);
  const pendingState   = useRef(null);

  const [users,        setUsers]        = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [roomName,     setRoomName]     = useState(roomId);

  useEffect(() => {
    // Reset room name when navigating to a new room
    setRoomName(roomId);
  }, [roomId]);

  useEffect(() => {
    const socket = ensureConnected();

    // ── Helpers ─────────────────────────────────────────────────────────────

    function applyDocState(editor, content, lang) {
      isRemoteChange.current = true;
      const model = editor.getModel();
      if (model && model.getValue() !== content) model.setValue(content);
      isRemoteChange.current = false;
      if (lang) setLanguage(lang);
    }

    function joinRoom() {
      socket.emit('join-room',        { roomId, username });
      socket.emit('request-document', { roomId });
    }

    // ── Event handlers ───────────────────────────────────────────────────────

    function onConnect() {
      // Fires on initial connect AND on every reconnect
      joinRoom();
    }

    function onDocumentState({ content, language }) {
      const editor = editorRef.current;
      if (editor) {
        applyDocState(editor, content, language);
      } else {
        pendingState.current = { content, language };
      }
    }

    function onDocumentDelta({ content, language }) {
      const editor = editorRef.current;
      if (!editor) return;
      const model = editor.getModel();
      if (!model || model.getValue() === content) return;
      isRemoteChange.current = true;
      model.setValue(content);
      isRemoteChange.current = false;
      if (language) setLanguage(language);
    }

    function onCursorMove({ userId, cursor, username: remoteUsername }) {
      const editor = editorRef.current;
      if (!editor) return;
      renderRemoteCursor(editor, userId, cursor, remoteUsername);
    }

    function onCursorLeave({ userId }) {
      if (editorRef.current) clearRemoteCursor(editorRef.current, userId);
    }

    function onRoomUsers({ users: list }) {
      setUsers(list ?? []);
    }

    function onRoomRenamed({ name }) {
      setRoomName(name);
    }

    function onChatMessage(msg) {
      setChatMessages((prev) => [...prev, msg]);
    }

    // ── Subscribe ────────────────────────────────────────────────────────────

    socket.on('connect',        onConnect);
    socket.on('document-state', onDocumentState);
    socket.on('document-delta', onDocumentDelta);
    socket.on('cursor-move',    onCursorMove);
    socket.on('cursor-leave',   onCursorLeave);
    socket.on('room-users',     onRoomUsers);
    socket.on('room-renamed',   onRoomRenamed);
    socket.on('chat-message',   onChatMessage);

    // Join immediately if already connected; otherwise `onConnect` will fire
    if (socket.connected) joinRoom();

    // ── Cleanup ──────────────────────────────────────────────────────────────

    return () => {
      socket.emit('leave-room', { roomId });

      socket.off('connect',        onConnect);
      socket.off('document-state', onDocumentState);
      socket.off('document-delta', onDocumentDelta);
      socket.off('cursor-move',    onCursorMove);
      socket.off('cursor-leave',   onCursorLeave);
      socket.off('room-users',     onRoomUsers);
      socket.off('room-renamed',   onRoomRenamed);
      socket.off('chat-message',   onChatMessage);

      decorationMap.forEach((_, uid) => {
        if (editorRef.current) clearRemoteCursor(editorRef.current, uid);
      });
    };
  }, [roomId, username]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Emitters (stable refs, safe to use in Monaco callbacks) ──────────────

  const emitDelta = useCallback((changes, content, language) => {
    if (isRemoteChange.current) return;
    getSocket().emit('document-delta', { roomId, delta: changes, content, language });
  }, [roomId]);

  const emitCursor = useCallback((cursor) => {
    getSocket().emit('cursor-move', { roomId, cursor, username });
  }, [roomId, username]);

  const sendChat = useCallback((message) => {
    getSocket().emit('chat-message', { roomId, message, username });
  }, [roomId, username]);

  const renameRoom = useCallback((name) => {
    getSocket().emit('room-rename', { roomId, name });
  }, [roomId]);

  /** Apply a stashed document state once Monaco has mounted. */
  const applyPendingState = useCallback((editor) => {
    if (!pendingState.current) return;
    const { content, language } = pendingState.current;
    pendingState.current = null;
    isRemoteChange.current = true;
    editor.getModel()?.setValue(content);
    isRemoteChange.current = false;
    if (language) setLanguage(language);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isRemoteChange,
    emitDelta,
    emitCursor,
    applyPendingState,
    users,
    chatMessages,
    sendChat,
    roomName,
    renameRoom,
  };
}
