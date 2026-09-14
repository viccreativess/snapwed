const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const drive = require('../services/googleDrive');

const Event = require('../models/Event');

// ─── Auth Middleware ────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// ─── Login ──────────────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'snapwed2024';
  if (password === adminPassword) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Wrong password' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get('/me', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// ─── Google Drive OAuth ─────────────────────────────────────────────────────
router.get('/auth/google', requireAdmin, (req, res) => {
  const url = drive.getAuthUrl();
  res.json({ url });
});

router.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    await drive.exchangeCodeForTokens(code);
    res.redirect('/admin?driveConnected=1');
  } catch (err) {
    res.redirect('/admin?driveError=1');
  }
});

router.get('/drive/status', requireAdmin, async (req, res) => {
  res.json({ connected: await drive.isConnected() });
});

// ─── Events CRUD ────────────────────────────────────────────────────────────
router.get('/events', requireAdmin, async (req, res) => {
  const events = await Event.find({}, '-_id -__v');
  res.json(events);
});

router.post('/events', requireAdmin, async (req, res) => {
  const { name, coupleNames, date, welcomeMessage, coverColor } = req.body;
  if (!name || !coupleNames) {
    return res.status(400).json({ error: 'name and coupleNames are required' });
  }
  const event = new Event({
    id: uuidv4(),
    name: name.trim(),
    coupleNames: coupleNames.trim(),
    date: date || '',
    welcomeMessage: welcomeMessage || 'Scan to share your photos! 📸',
    coverColor: coverColor || '#d4a0c7',
    guestbook: [],
    createdAt: new Date().toISOString(),
  });
  await event.save();
  res.json(event);
});

router.put('/events/:id', requireAdmin, async (req, res) => {
  const event = await Event.findOneAndUpdate(
    { id: req.params.id },
    { $set: req.body },
    { new: true }
  );
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

router.delete('/events/:id', requireAdmin, async (req, res) => {
  await Event.findOneAndDelete({ id: req.params.id });
  res.json({ success: true });
});

// ─── QR Code ────────────────────────────────────────────────────────────────
router.get('/events/:id/qr', requireAdmin, async (req, res) => {
  const event = await Event.findOne({ id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const uploadUrl = `${baseUrl}/upload/${event.id}`;

  const qrDataUrl = await qrcode.toDataURL(uploadUrl, {
    width: 400,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' },
  });

  res.json({ qrDataUrl, uploadUrl });
});

// ─── Guestbook ──────────────────────────────────────────────────────────────
router.get('/events/:id/guestbook', requireAdmin, async (req, res) => {
  const event = await Event.findOne({ id: req.params.id });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event.guestbook || []);
});

// ─── Photos (via Drive) ─────────────────────────────────────────────────────
router.get('/events/:id/photos', requireAdmin, async (req, res) => {
  try {
    const event = await Event.findOne({ id: req.params.id });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (!(await drive.isConnected())) return res.json([]);
    const photos = await drive.listEventFiles(event.name);
    res.json(photos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
