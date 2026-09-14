const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const drive = require('../services/googleDrive');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|heic|heif/i;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const Event = require('../models/Event');

// POST /api/upload/:eventId — guests upload photos + guestbook entry
router.post('/:eventId', upload.array('photos', 20), async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findOne({ id: eventId });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (!(await drive.isConnected())) {
      return res.status(503).json({ error: 'Google Drive not connected yet. Please contact the event host.' });
    }

    const { guestName, message } = req.body;
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Upload all files to Drive concurrently
    const uploaded = await Promise.all(
      files.map((file) =>
        drive.uploadFile({
          buffer: file.buffer,
          originalname: file.originalname,
          mimetype: file.mimetype,
          eventName: event.name,
        })
      )
    );

    // Save guestbook entry
    const entry = {
      id: Date.now().toString(),
      guestName: guestName || 'Anonymous',
      message: message || '',
      photoIds: uploaded.map((f) => f.id),
      photoNames: uploaded.map((f) => f.name),
      uploadedAt: new Date().toISOString(),
    };

    if (!event.guestbook) event.guestbook = [];
    event.guestbook.push(entry);
    await event.save();

    res.json({
      success: true,
      uploaded: uploaded.length,
      entry,
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/upload/:eventId/info — public event info (name, couple names)
router.get('/:eventId/info', async (req, res) => {
  const event = await Event.findOne({ id: req.params.eventId });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json({
    id: event.id,
    name: event.name,
    coupleNames: event.coupleNames,
    date: event.date,
    welcomeMessage: event.welcomeMessage,
    coverColor: event.coverColor,
  });
});

module.exports = router;
