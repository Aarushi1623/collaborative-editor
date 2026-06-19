import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function generateRoomId() {
  return Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6);
}

export default function LandingPage() {
  const [username, setUsername]   = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [error, setError]         = useState('');
  const navigate = useNavigate();

  // Pre-fill username from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('collab_username');
    if (saved) setUsername(saved);
  }, []);

  function saveAndGo(roomId) {
    const name = username.trim();
    if (!name) {
      setError('Please enter a display name before continuing.');
      document.getElementById('username-input')?.focus();
      return;
    }
    localStorage.setItem('collab_username', name);
    navigate(`/room/${roomId}`);
  }

  function createRoom() {
    saveAndGo(generateRoomId());
  }

  function joinRoom() {
    const id = roomInput.trim();
    if (!id) {
      setError('Enter a room ID to join.');
      return;
    }
    saveAndGo(id);
  }

  return (
    <div className="landing">
      <div className="landing__logo">⌨</div>
      <h1 className="landing__title">Collaborative Editor</h1>
      <p className="landing__subtitle">Real-time code editing, zero setup.</p>

      <div className="landing__form">
        {/* ── Identity ─────────────────────────────────────────── */}
        <div className="landing__name-section">
          <label className="landing__label" htmlFor="username-input">
            Display name
          </label>
          <input
            id="username-input"
            className="landing__input"
            type="text"
            placeholder="Your name..."
            value={username}
            maxLength={32}
            onChange={(e) => { setUsername(e.target.value); setError(''); }}
            onKeyDown={(e) => { if (e.key === 'Enter') createRoom(); }}
            autoFocus
            autoComplete="nickname"
          />
          {error && <p className="landing__error">{error}</p>}
        </div>

        {/* ── Create / Join ─────────────────────────────────────── */}
        <div className="landing__actions">
          <div className="landing__col">
            <p className="landing__col-title">New Room</p>
            <p className="landing__col-desc">Generate a fresh room with a unique ID.</p>
            <button className="btn btn--primary" onClick={createRoom}>
              Create Room
            </button>
          </div>

          <div className="landing__col">
            <p className="landing__col-title">Join Room</p>
            <p className="landing__col-desc">Have a room ID? Paste it below.</p>
            <div className="landing__join-row">
              <input
                className="landing__input"
                type="text"
                placeholder="room-id"
                value={roomInput}
                spellCheck={false}
                onChange={(e) => { setRoomInput(e.target.value); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') joinRoom(); }}
              />
            </div>
            <button
              className="btn btn--ghost"
              style={{ width: '100%', marginTop: 8 }}
              onClick={joinRoom}
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
