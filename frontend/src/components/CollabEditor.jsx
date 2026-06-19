import { useRef, useState, useCallback, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useCollaboration } from '../hooks/useCollaboration.js';
import { LANGUAGES, getLang } from '../config/languages.js';
import ConsolePanel from './ConsolePanel.jsx';
import ChatPanel from './ChatPanel.jsx';

// ── Inline sub-components ─────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#DDA0DD','#F7DC6F','#98D8C8','#FFEAA7',
];

function UsersIndicator({ users }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="users-btn"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="users-btn__dot" />
      {users.length} {users.length === 1 ? 'user' : 'users'}

      {open && users.length > 0 && (
        <div className="users-popover">
          <div className="users-popover__title">In this room</div>
          {users.map((u, i) => (
            <div key={u.id} className="users-popover__item">
              <span
                className="users-popover__avatar"
                style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
              >
                {u.username.slice(0, 1).toUpperCase()}
              </span>
              {u.username}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoomNameEditor({ roomName, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(roomName);

  useEffect(() => {
    if (!editing) setDraft(roomName);
  }, [roomName, editing]);

  function commit() {
    setEditing(false);
    const name = draft.trim() || roomName;
    setDraft(name);
    if (name !== roomName) onRename(name);
  }

  if (editing) {
    return (
      <input
        className="navbar__name-input"
        value={draft}
        maxLength={40}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter')  { commit(); }
          if (e.key === 'Escape') { setDraft(roomName); setEditing(false); }
        }}
        autoFocus
      />
    );
  }

  return (
    <button
      className="navbar__name-btn"
      onClick={() => { setDraft(roomName); setEditing(true); }}
      title="Click to rename room"
    >
      {roomName}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CollabEditor({ roomId, username }) {
  const editorRef   = useRef(null);
  const [language,     setLanguage]     = useState('javascript');
  const [activeTab,    setActiveTab]    = useState('console');
  const [consoleOutput,setConsoleOutput]= useState(null);
  const [isRunning,    setIsRunning]    = useState(false);
  const [newChat,      setNewChat]      = useState(false);

  const {
    isRemoteChange,
    emitDelta,
    emitCursor,
    applyPendingState,
    users,
    chatMessages,
    sendChat,
    roomName,
    renameRoom,
  } = useCollaboration({ roomId, username, editorRef, setLanguage });

  // Badge for new chat messages when console tab is active
  const prevChatLen = useRef(0);
  useEffect(() => {
    if (activeTab !== 'chat' && chatMessages.length > prevChatLen.current) {
      setNewChat(true);
    }
    prevChatLen.current = chatMessages.length;
  }, [chatMessages, activeTab]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    if (tab === 'chat') setNewChat(false);
  }

  // ── Monaco lifecycle ────────────────────────────────────────────────────────

  const handleEditorDidMount = useCallback((editor) => {
    editorRef.current = editor;
    applyPendingState(editor);

    editor.onDidChangeModelContent((event) => {
      if (isRemoteChange.current) return;
      emitDelta(event.changes, editor.getValue(), editor.getModel()?.getLanguageId() ?? language);
    });

    editor.onDidChangeCursorPosition((event) => {
      emitCursor({ lineNumber: event.position.lineNumber, column: event.position.column });
    });

    editor.focus();
  }, [applyPendingState, emitDelta, emitCursor, isRemoteChange, language]);

  // ── Language change ─────────────────────────────────────────────────────────

  function handleLanguageChange(e) {
    const lang = e.target.value;
    setLanguage(lang);
    const content = editorRef.current?.getValue() ?? '';
    emitDelta([], content, lang);
  }

  // ── Code execution ──────────────────────────────────────────────────────────

  async function handleRun() {
    const code = editorRef.current?.getValue() ?? '';
    const lang = getLang(language);

    if (!lang.pistonId) {
      setConsoleOutput({ stdout: '', stderr: `"${lang.label}" cannot be executed.`, exitCode: 1 });
      setActiveTab('console');
      return;
    }

    setIsRunning(true);
    setActiveTab('console');
    setConsoleOutput(null);

    try {
      const res  = await fetch('/api/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code, language }),
      });
      const data = await res.json();
      setConsoleOutput(data);
    } catch (err) {
      setConsoleOutput({ stdout: '', stderr: `Network error: ${err.message}`, exitCode: 1 });
    } finally {
      setIsRunning(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="room">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <nav className="navbar">
        <span className="navbar__brand">collab</span>
        <span className="navbar__sep">/</span>

        <RoomNameEditor roomName={roomName} onRename={renameRoom} />

        <div className="navbar__divider" />

        <select
          className="lang-select"
          value={language}
          onChange={handleLanguageChange}
          title="Select language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.monacoId} value={l.monacoId}>{l.label}</option>
          ))}
        </select>

        <button
          className="run-btn"
          onClick={handleRun}
          disabled={isRunning}
          title="Run code (Piston API)"
        >
          {isRunning
            ? <><span className="run-btn__spinner" /> Running…</>
            : '▶  Run'
          }
        </button>

        <div className="navbar__spacer" />

        <UsersIndicator users={users} />
      </nav>

      {/* ── Editor pane ─────────────────────────────────────────────────── */}
      <div className="room__editor">
        <MonacoEditor
          height="100%"
          language={language}
          theme="vs-dark"
          options={{
            fontSize:                    14,
            fontFamily:                  "'Cascadia Code', 'Fira Code', 'Courier New', monospace",
            fontLigatures:               true,
            minimap:                     { enabled: false },
            scrollBeyondLastLine:        false,
            automaticLayout:             true,
            padding:                     { top: 12, bottom: 12 },
            renderWhitespace:            'selection',
            cursorBlinking:              'smooth',
            cursorSmoothCaretAnimation:  'on',
            smoothScrolling:             true,
            bracketPairColorization:     { enabled: true },
            tabSize:                     2,
            wordWrap:                    'off',
          }}
          onMount={handleEditorDidMount}
        />
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar__tabs">
          <button
            className={`sidebar__tab${activeTab === 'console' ? ' active' : ''}`}
            onClick={() => handleTabChange('console')}
          >
            Console
            {isRunning && <span className="tab-badge" />}
          </button>
          <button
            className={`sidebar__tab${activeTab === 'chat' ? ' active' : ''}`}
            onClick={() => handleTabChange('chat')}
          >
            Chat
            {newChat && activeTab !== 'chat' && <span className="tab-badge" />}
          </button>
        </div>

        <div className="sidebar__body">
          {activeTab === 'console'
            ? <ConsolePanel output={consoleOutput} isRunning={isRunning} />
            : <ChatPanel messages={chatMessages} onSend={sendChat} username={username} />
          }
        </div>
      </aside>
    </div>
  );
}
