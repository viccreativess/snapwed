const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const drive = require('../services/googleDrive');

const EVENTS_FILE = path.join(__dirname, '..', 'data', 'events.json');

function readEvents() {
  try { return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8')); }
  catch (e) { return []; }
}

// GET /api/gallery/:eventId — returns list of photos from Drive
router.get('/:eventId', async (req, res) => {
  try {
    const events = readEvents();
    const event = events.find((e) => e.id === req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (!drive.isConnected()) {
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
