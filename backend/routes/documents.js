import { Router } from 'express';
import Document from '../models/Document.js';
import { sanitizeRoomId } from '../utils/validate.js';

const router = Router();

function resolveRoomId(req, res) {
  const id = sanitizeRoomId(req.params.roomId);
  if (!id) {
    res.status(400).json({ message: 'Invalid room ID.' });
    return null;
  }
  return id;
}

// GET /api/documents/:roomId — fetch persisted document
router.get('/:roomId', async (req, res) => {
  const roomId = resolveRoomId(req, res);
  if (!roomId) return;
  try {
    const doc = await Document.findOne({ roomId: String(roomId) });
    if (!doc) return res.status(404).json({ message: 'Room not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/documents/:roomId — create or update language metadata
router.post('/:roomId', async (req, res) => {
  const roomId = resolveRoomId(req, res);
  if (!roomId) return;
  try {
    const { language } = req.body;
    const doc = await Document.findOneAndUpdate(
      { roomId: String(roomId) },
      { language },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/documents/:roomId — hard-delete a room's document
router.delete('/:roomId', async (req, res) => {
  const roomId = resolveRoomId(req, res);
  if (!roomId) return;
  try {
    await Document.deleteOne({ roomId: String(roomId) });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
