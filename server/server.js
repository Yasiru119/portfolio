require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { readData, writeData, genId } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

/* ---------- Middleware ---------- */
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }, // 8 hours
  })
);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, genId('img_') + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  },
});

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

/* ---------- Public API ---------- */
app.get('/api/config', (req, res) => {
  const data = readData();
  res.json(data.config);
});

app.get('/api/portfolio', (req, res) => {
  const data = readData();
  res.json(data.portfolio);
});

app.get('/api/testimonials', (req, res) => {
  const data = readData();
  res.json(data.testimonials);
});

app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }
  const data = readData();
  data.messages.unshift({
    id: genId('m_'),
    name: String(name).slice(0, 200),
    email: String(email).slice(0, 200),
    message: String(message).slice(0, 5000),
    createdAt: new Date().toISOString(),
    read: false,
  });
  writeData(data);
  res.json({ ok: true });
});

/* ---------- Admin auth ---------- */
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  const validUser = username === process.env.ADMIN_USER;
  const validPass = validUser && bcrypt.compareSync(password || '', process.env.ADMIN_PASSWORD_HASH || '');
  if (!validUser || !validPass) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

app.post('/api/admin/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!bcrypt.compareSync(currentPassword || '', process.env.ADMIN_PASSWORD_HASH || '')) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  const newHash = bcrypt.hashSync(newPassword, 10);
  const envPath = path.join(__dirname, '..', '.env');
  let envContent = fs.readFileSync(envPath, 'utf-8');
  envContent = envContent.replace(/ADMIN_PASSWORD_HASH=.*/g, `ADMIN_PASSWORD_HASH=${newHash}`);
  fs.writeFileSync(envPath, envContent, 'utf-8');
  process.env.ADMIN_PASSWORD_HASH = newHash;
  res.json({ ok: true, note: 'Password updated. Restart the server to ensure it fully reloads on all platforms.' });
});

/* ---------- Admin: config ---------- */
app.put('/api/admin/config', requireAuth, (req, res) => {
  const data = readData();
  data.config = { ...data.config, ...req.body };
  writeData(data);
  res.json(data.config);
});

/* ---------- Admin: portfolio CRUD ---------- */
app.get('/api/admin/portfolio', requireAuth, (req, res) => {
  res.json(readData().portfolio);
});

app.post('/api/admin/portfolio', requireAuth, upload.single('image'), (req, res) => {
  const data = readData();
  const item = {
    id: genId('p_'),
    category: req.body.category || 'branding',
    title: req.body.title || 'Untitled Project',
    description: req.body.description || '',
    image: req.file ? '/uploads/' + req.file.filename : req.body.image || '',
  };
  data.portfolio.unshift(item);
  writeData(data);
  res.json(item);
});

app.put('/api/admin/portfolio/:id', requireAuth, upload.single('image'), (req, res) => {
  const data = readData();
  const idx = data.portfolio.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const existing = data.portfolio[idx];
  data.portfolio[idx] = {
    ...existing,
    category: req.body.category ?? existing.category,
    title: req.body.title ?? existing.title,
    description: req.body.description ?? existing.description,
    image: req.file ? '/uploads/' + req.file.filename : req.body.image ?? existing.image,
  };
  writeData(data);
  res.json(data.portfolio[idx]);
});

app.delete('/api/admin/portfolio/:id', requireAuth, (req, res) => {
  const data = readData();
  data.portfolio = data.portfolio.filter((p) => p.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

/* ---------- Admin: testimonials CRUD ---------- */
app.get('/api/admin/testimonials', requireAuth, (req, res) => {
  res.json(readData().testimonials);
});

app.post('/api/admin/testimonials', requireAuth, (req, res) => {
  const data = readData();
  const item = {
    id: genId('t_'),
    quote: req.body.quote || '',
    name: req.body.name || '',
    role: req.body.role || '',
  };
  data.testimonials.unshift(item);
  writeData(data);
  res.json(item);
});

app.put('/api/admin/testimonials/:id', requireAuth, (req, res) => {
  const data = readData();
  const idx = data.testimonials.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.testimonials[idx] = { ...data.testimonials[idx], ...req.body };
  writeData(data);
  res.json(data.testimonials[idx]);
});

app.delete('/api/admin/testimonials/:id', requireAuth, (req, res) => {
  const data = readData();
  data.testimonials = data.testimonials.filter((t) => t.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

/* ---------- Admin: messages ---------- */
app.get('/api/admin/messages', requireAuth, (req, res) => {
  res.json(readData().messages);
});

app.patch('/api/admin/messages/:id/read', requireAuth, (req, res) => {
  const data = readData();
  const idx = data.messages.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  data.messages[idx].read = true;
  writeData(data);
  res.json(data.messages[idx]);
});

app.delete('/api/admin/messages/:id', requireAuth, (req, res) => {
  const data = readData();
  data.messages = data.messages.filter((m) => m.id !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

/* ---------- Static files ---------- */
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`YW Designs site running at http://localhost:${PORT}`);
  console.log(`Admin panel at http://localhost:${PORT}/admin`);
});
