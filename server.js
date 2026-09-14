const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'snapwed-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // 1 day
  })
);

// ─── Static Files ──────────────────────────────────────────────────────────
app.use('/upload', express.static(path.join(__dirname, 'public', 'upload')));
app.use('/gallery', express.static(path.join(__dirname, 'public', 'gallery')));
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/upload', require('./routes/upload'));
app.use('/api/gallery', require('./routes/gallery'));
app.use('/api/admin', require('./routes/admin'));

// ─── Root Redirect ─────────────────────────────────────────────────────────
app.get('/', (req, res) => res.redirect('/admin'));

// ─── SPA Fallbacks ─────────────────────────────────────────────────────────
app.get('/upload/*path', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'upload', 'index.html'))
);
app.get('/gallery/*path', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'gallery', 'index.html'))
);
app.get('/admin/*path', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'))
);


// ─── Global Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ─── Database & Server Start ───────────────────────────────────────────────
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Please set it in your environment variables.');
  process.exit(1);
}

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`\n🎉 SnapWed running at http://localhost:${PORT}`);
      console.log(`   Admin panel: http://localhost:${PORT}/admin\n`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
