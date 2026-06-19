import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import connectDB from './config/db.js';
import documentRoutes from './routes/documents.js';
import executeRoute from './routes/execute.js';
import initSocket from './socket/index.js';

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.use('/api/documents', documentRoutes);
app.use('/api/execute', executeRoute);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

connectDB();
initSocket(server);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`[Server] Listening on http://localhost:${PORT}`));
