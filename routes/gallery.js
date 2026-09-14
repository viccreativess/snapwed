const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const drive = require('../services/googleDrive');

const Event = require('../models/Event');

// GET /api/gallery/:eventId — returns list of photos from Drive
router.get('/:eventId', async (req, res) => {
  try {
    const event = await Event.findOne({ id: req.params.eventId });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (!(await drive.isConnected())) {
      return res.json({ photos: [], guestbook: [] });
    }

    const photos = await drive.listEventFiles(event.name);
    const guestbook = event.guestbook || [];

    res.json({ photos, guestbook, event: {
      id: event.id,
      name: event.name,
      coupleNames: event.coupleNames,
      date: event.date,
    }});
  } catch (err) {
    console.error('Gallery error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gallery/proxy/:fileId — proxy Drive image (avoids CORS issues)
router.get('/proxy/:fileId', async (req, res) => {
  try {
    await drive.streamFile(req.params.fileId, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
