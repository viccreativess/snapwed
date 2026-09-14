const { google } = require('googleapis');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

// Token storage path (persisted across restarts)
const TOKEN_PATH = path.join(__dirname, '..', 'data', 'google_token.json');

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    }
  } catch (e) {}
  return null;
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

function getAuthedClient() {
  const tokens = loadTokens();
  if (!tokens) throw new Error('Google Drive not connected. Please authorize in the admin panel.');
  const auth = getOAuthClient();
  auth.setCredentials(tokens);
  // Auto-refresh tokens when expired
  auth.on('tokens', (newTokens) => {
    const current = loadTokens() || {};
    saveTokens({ ...current, ...newTokens });
  });
  return auth;
}

function getDrive() {
  const auth = getAuthedClient();
  return google.drive({ version: 'v3', auth });
}

// ─── Auth ──────────────────────────────────────────────────────────────────

function getAuthUrl() {
  const auth = getOAuthClient();
  return auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/drive.file'],
  });
}

async function exchangeCodeForTokens(code) {
  const auth = getOAuthClient();
  const { tokens } = await auth.getToken(code);
  saveTokens(tokens);
  return tokens;
}

function isConnected() {
  return loadTokens() !== null;
}

// ─── Folder Management ─────────────────────────────────────────────────────

async function ensureFolder(folderName, parentId = null) {
  const drive = getDrive();
  const query = [
    `name = '${folderName}'`,
    `mimeType = 'application/vnd.google-apps.folder'`,
    `trashed = false`,
    parentId ? `'${parentId}' in parents` : `'root' in parents`,
  ].join(' and ');

  const res = await drive.files.list({ q: query, fields: 'files(id, name)' });
  if (res.data.files.length > 0) return res.data.files[0].id;

  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : [],
    },
    fields: 'id',
  });
  return folder.data.id;
}

async function getOrCreateEventFolder(eventName) {
  const rootId = await ensureFolder('SnapWed');
  return ensureFolder(eventName, rootId);
}

// ─── Upload ────────────────────────────────────────────────────────────────

async function uploadFile({ buffer, originalname, mimetype, eventName }) {
  const drive = getDrive();
  const folderId = await getOrCreateEventFolder(eventName);

  const readable = new Readable();
  readable.push(buffer);
  readable.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: originalname,
      parents: [folderId],
    },
    media: {
      mimeType: mimetype,
      body: readable,
    },
    fields: 'id, name, webContentLink, webViewLink, thumbnailLink, createdTime, size',
  });

  // Make file publicly readable so guests can see the gallery
  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return res.data;
}

// ─── List Files ────────────────────────────────────────────────────────────

async function listEventFiles(eventName) {
  const drive = getDrive();
  let folderId;
  try {
    folderId = await getOrCreateEventFolder(eventName);
  } catch (e) {
    return [];
  }

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false and mimeType contains 'image/'`,
    fields: 'files(id, name, thumbnailLink, webContentLink, createdTime, size)',
    orderBy: 'createdTime desc',
    pageSize: 200,
  });

  return res.data.files.map((f) => ({
    id: f.id,
    name: f.name,
    // High-res direct download link
    url: `https://drive.google.com/uc?export=view&id=${f.id}`,
    // Thumbnail for gallery grid
    thumbnail: f.thumbnailLink
      ? f.thumbnailLink.replace('=s220', '=s600')
      : `https://drive.google.com/uc?export=view&id=${f.id}`,
    downloadUrl: f.webContentLink,
    createdTime: f.createdTime,
    size: f.size,
  }));
}

// ─── Stream / Proxy ────────────────────────────────────────────────────────

async function streamFile(fileId, res) {
  const drive = getDrive();
  const meta = await drive.files.get({ fileId, fields: 'mimeType, name' });
  res.setHeader('Content-Type', meta.data.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  response.data.pipe(res);
}

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  isConnected,
  uploadFile,
  listEventFiles,
  streamFile,
  getOrCreateEventFolder,
};
