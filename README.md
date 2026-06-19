# Collaborative Code Editor

A real-time collaborative code editor built with the MERN stack and Socket.io. Multiple users can write code together in isolated rooms, see each other's cursors live, chat, and execute code directly in the browser — no login required.

---

## Features

- **Live collaboration** — edits sync instantly across all room members via WebSockets
- **Named cursor tracking** — every remote user's caret is rendered in a distinct colour with their display name
- **Multi-language code execution** — run code in 12 languages (JavaScript, TypeScript, Python, Go, Rust, Java, C++, C, C#, Ruby, PHP, Shell) powered by the [Wandbox](https://wandbox.org/) API
- **Real-time chat** — built into the sidebar using the same Socket.io room connection
- **Editable room names** — click the room name in the navbar to rename it; the change syncs to all peers
- **Write-behind caching** — keystrokes hit an in-memory cache; MongoDB is flushed in bulk on a configurable interval to prevent per-keystroke DB writes
- **Zero-install local dev** — `mongodb-memory-server` spins up an in-process MongoDB when no `MONGO_URI` is set

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Monaco Editor |
| Realtime | Socket.io (WebSockets with fallback) |
| Backend | Node.js, Express |
| Database | MongoDB + Mongoose |
| Code Execution | Wandbox public API |
| Dev DB | mongodb-memory-server |

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- MongoDB (optional — falls back to in-memory if not set)

### Installation

```bash
# Clone the repo
git clone https://github.com/Aarushi1623/collaborative-editor.git
cd collaborative-editor

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Environment Variables

Copy the example file and edit as needed:

```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend port |
| `MONGO_URI` | _(unset)_ | MongoDB connection string — leave unset to use in-memory DB |
| `CLIENT_URL` | `http://localhost:5173` | Frontend origin for CORS |
| `FLUSH_INTERVAL_MS` | `5000` | How often the write-behind cache flushes to MongoDB |

### Running Locally

```bash
# Terminal 1 — backend
cd backend
node server.js

# Terminal 2 — frontend
cd frontend
npm run dev
```

Enter a display name, and create or join a room.

---

## Project Structure

```
collaborative-editor/
├── backend/
│   ├── cache/
│   │   └── writeBehindCache.js   # In-memory write-behind cache with MongoDB flush
│   ├── config/
│   │   └── db.js                 # Mongoose connect with in-memory fallback
│   ├── models/
│   │   └── Document.js           # Room document schema
│   ├── routes/
│   │   ├── documents.js          # REST API for document persistence
│   │   └── execute.js            # Code execution proxy → Wandbox
│   ├── socket/
│   │   ├── index.js              # Socket.io server setup + room lifecycle
│   │   └── handlers/
│   │       ├── deltaHandler.js   # Document sync events
│   │       ├── cursorHandler.js  # Cursor position relay
│   │       └── chatHandler.js    # Chat message relay
│   ├── utils/
│   │   └── validate.js           # Input sanitisation (NoSQL injection hardening)
│   └── server.js                 # Express + HTTP + Socket.io bootstrap
└── frontend/
    └── src/
        ├── components/
        │   ├── CollabEditor.jsx   # Main editor view (Monaco + Navbar + Sidebar)
        │   ├── ConsolePanel.jsx   # Code execution output panel
        │   └── ChatPanel.jsx      # Real-time chat panel
        ├── hooks/
        │   └── useCollaboration.js # Socket lifecycle, cursor rendering, chat, presence
        ├── pages/
        │   ├── LandingPage.jsx    # Username entry + Create/Join room
        │   └── EditorPage.jsx     # Route wrapper for a room
        ├── services/
        │   └── socket.js          # Singleton Socket.io client
        └── config/
            └── languages.js       # Language definitions (Monaco ID, display name, executor ID)
```

---

## How It Works

### Room Isolation
Each room is identified by a slug in the URL (`/room/:id`). The backend uses Socket.io's built-in room abstraction — events are scoped to only the sockets that have joined the same room ID.

### Write-Behind Cache
Typing emits a `document-delta` event on every change. The server writes the full document content to an in-memory `Map` keyed by `roomId`. A `setInterval` flush periodically runs a MongoDB `bulkWrite` with `upsert` operations, batching all dirty rooms in one round-trip. This decouples editor responsiveness from database latency entirely.

### Remote Cursors
Monaco has no public API for rendering foreign cursors. The solution uses `deltaDecorations` with a `beforeContentClassName` pointing to a dynamically injected `<style>` tag per user. A CSS `::before` pseudo-element on the decoration displays the username label above the cursor bar in the user's assigned colour.

### Infinite Loop Prevention
When a remote delta arrives and the editor model is updated via `model.setValue()`, Monaco fires `onDidChangeModelContent` — which would re-broadcast the same change. An `isRemoteChange` ref is set to `true` synchronously before the model update and cleared immediately after; the change listener checks this flag and skips emitting if set.

---

## Security

All socket event payloads and HTTP route parameters are passed through `backend/utils/validate.js` before reaching any database or cache operation:

- `roomId` is explicitly cast to `String` before every Mongoose query to prevent NoSQL object injection
- Content payloads are capped at 1 MB to guard the write-behind cache against memory exhaustion
- Cursor coordinates are shape-validated (must be positive numbers) before being relayed to peers
- Username and message fields are length-capped server-side, independent of frontend `maxLength` attributes

---

## License

MIT
