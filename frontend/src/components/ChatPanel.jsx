import { useState, useEffect, useRef } from 'react';

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatPanel({ messages, onSend, username }) {
  const [input, setInput]   = useState('');
  const bottomRef           = useRef(null);
  const inputRef            = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const msg = input.trim();
    if (!msg) return;
    onSend(msg);
    setInput('');
    inputRef.current?.focus();
  }

  return (
    <div className="chat">
      <div className="chat__messages">
        {messages.length === 0 && (
          <p className="chat__empty">No messages yet. Say hello!</p>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.username === username;
          return (
            <div key={i} className={`chat__msg${isOwn ? ' chat__msg--own' : ''}`}>
              <div className="chat__meta">
                <span className="chat__name">{isOwn ? 'You' : msg.username}</span>
                <span className="chat__time">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="chat__bubble">{msg.message}</div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      <div className="chat__input-area">
        <input
          ref={inputRef}
          className="chat__input"
          placeholder="Message…"
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button className="chat__send" onClick={handleSend} disabled={!input.trim()}>
          →
        </button>
      </div>
    </div>
  );
}
