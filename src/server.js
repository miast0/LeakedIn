const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const multer = require('multer');
const { Pool } = require('pg');

const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const uploadRoot = path.join(__dirname, '..', 'uploads');
const avatarDir = path.join(uploadRoot, 'avatars');
const postDir = path.join(uploadRoot, 'posts');
fs.mkdirSync(avatarDir, { recursive: true });
fs.mkdirSync(postDir, { recursive: true });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(uploadRoot));
app.use(session({
  store: new pgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'leakedin-dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

const imageStorage = (folder) => multer.diskStorage({
  destination: folder,
  filename: (_req, file, cb) => {
    const extensions = { 'image/png': '.png', 'image/jpeg': '.jpg', 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };
    const ext = extensions[file.mimetype] || '';
    cb(null, `${Date.now()}-${crypto.randomBytes(10).toString('hex')}${ext}`);
  }
});
const imageFilter = (_req, file, cb) => {
  const valid = ['image/png', 'image/jpeg'].includes(file.mimetype);
  cb(valid ? null : new Error('Only PNG and JPG images are allowed.'), valid);
};
const postMediaFilter = (_req, file, cb) => {
  const valid = ['image/png', 'image/jpeg', 'video/mp4', 'video/webm', 'video/quicktime'].includes(file.mimetype);
  cb(valid ? null : new Error('Only PNG, JPG, MP4, WebM and MOV files are allowed.'), valid);
};
const avatarUpload = multer({ storage: imageStorage(avatarDir), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const postUpload = multer({ storage: imageStorage(postDir), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const postMediaUpload = multer({ storage: imageStorage(postDir), fileFilter: postMediaFilter, limits: { fileSize: 5 * 1024 * 1024 } });

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}
function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function auth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}
function deleteUploaded(file) {
  if (file?.path) fs.unlink(file.path, () => {});
}
async function validateUploadedImage(file) {
  if (!file) return true;
  const { fileTypeFromFile } = await import('file-type');
  const detected = await fileTypeFromFile(file.path);
  return Boolean(detected && ['image/png', 'image/jpeg'].includes(detected.mime));
}
async function validateUploadedMedia(file) {
  if (!file) return true;
  const { fileTypeFromFile } = await import('file-type');
  const detected = await fileTypeFromFile(file.path);
  return Boolean(detected && ['image/png', 'image/jpeg', 'video/mp4', 'video/webm', 'video/quicktime'].includes(detected.mime));
}
function flash(req, type, message) {
  req.session.flash = { type, message };
}
function wantsJson(req) {
  return req.get('accept')?.includes('application/json') || req.get('x-requested-with') === 'XMLHttpRequest';
}

app.use(async (req, res, next) => {
  res.locals.currentUser = null;
  res.locals.notificationCount = 0;
  res.locals.currentPath = req.path;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  if (!req.session.userId) return next();
  try {
    const [userResult, notificationResult] = await Promise.all([
      pool.query('SELECT id, name, email, avatar_path, avatar_variant, headline, employer, job_title, show_email, seeded_user FROM users WHERE id=$1', [req.session.userId]),
      pool.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND read_at IS NULL', [req.session.userId])
    ]);
    if (!userResult.rows[0]) req.session.destroy(() => {});
    else {
      res.locals.currentUser = userResult.rows[0];
      res.locals.notificationCount = notificationResult.rows[0].count;
    }
    next();
  } catch (err) { next(err); }
});

app.get('/', (req, res) => res.redirect(req.session.userId ? '/home' : '/login'));
app.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/home');
  res.render('login', { title: 'Sign in' });
});
app.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const { rows } = await pool.query('SELECT id, password_hash FROM users WHERE email=$1', [email]);
    if (!rows[0] || rows[0].password_hash !== sha256(password)) {
      return res.status(401).render('login', {
        title: 'Sign in',
        flash: { type: 'error', message: 'Incorrect email or password.' },
        email
      });
    }
    req.session.userId = rows[0].id;
    return req.session.save(() => res.redirect('/home'));
  } catch (err) { next(err); }
});
app.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/home');
  res.render('register', { title: 'Join LeakedIn' });
});
app.post('/register', avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    if (!(await validateUploadedImage(req.file))) {
      deleteUploaded(req.file);
      flash(req, 'error', 'The uploaded file is not a valid PNG or JPG image.');
      return req.session.save(() => res.redirect('/register'));
    }
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const confirm = String(req.body.confirm_password || '');
    if (!name) {
      deleteUploaded(req.file);
      flash(req, 'error', 'Name is required.');
      return req.session.save(() => res.redirect('/register'));
    }
    if (!validEmail(email)) {
      deleteUploaded(req.file);
      flash(req, 'error', 'Enter a valid email address.');
      return req.session.save(() => res.redirect('/register'));
    }
    if (password.length < 4) {
      deleteUploaded(req.file);
      flash(req, 'error', 'Password is too short.');
      return req.session.save(() => res.redirect('/register'));
    }
    if (password !== confirm) {
      deleteUploaded(req.file);
      flash(req, 'error', 'Passwords do not match.');
      return req.session.save(() => res.redirect('/register'));
    }
    const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : null;
    const result = await pool.query(
      'INSERT INTO users(name,email,password_hash,avatar_path,show_email) VALUES($1,$2,$3,$4,$5) RETURNING id',
      [name, email, sha256(password), avatarPath, req.body.show_email === 'on']
    );
    req.session.userId = result.rows[0].id;
    res.redirect('/home');
  } catch (err) {
    deleteUploaded(req.file);
    if (err.code === '23505') {
      flash(req, 'error', 'An account already exists with that email.');
      return req.session.save(() => res.redirect('/register'));
    }
    next(err);
  }
});
app.post('/logout', auth, (req, res) => req.session.destroy(() => res.redirect('/login')));

app.get('/home', auth, (req, res) => res.render('home', { title: 'Home' }));

const POST_SELECT = `
SELECT p.id,p.content,p.image_path,p.is_private,p.created_at,p.updated_at,
 u.id AS user_id,u.name,u.avatar_path,u.avatar_variant,u.job_title,u.employer,
 COUNT(r.reaction)::int AS reaction_count,
 ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.reaction), NULL) AS reaction_types,
 COALESCE(SUM(CASE WHEN r.reaction=1 THEN 1 ELSE 0 END),0)::int AS likes,
 COALESCE(MAX(CASE WHEN r.user_id=$1 THEN r.reaction END),0)::int AS my_reaction,
 (SELECT COUNT(*)::int FROM comments c WHERE c.post_id=p.id) AS comment_count,
 COALESCE((SELECT json_agg(preview ORDER BY preview.created_at ASC) FROM (
   SELECT c.id,c.user_id,c.content,c.created_at,cu.name,cu.avatar_path,cu.avatar_variant
   FROM comments c JOIN users cu ON cu.id=c.user_id
   WHERE c.post_id=p.id ORDER BY c.created_at DESC LIMIT 3
 ) preview),'[]'::json) AS preview_comments
FROM posts p JOIN users u ON u.id=p.user_id
LEFT JOIN reactions r ON r.post_id=p.id`;

app.get('/api/feed', auth, async (req, res, next) => {
  try {
    const limit = 10;
    const params = [req.session.userId, limit];
    let cursorSql = '';
    if (req.query.before && req.query.beforeId) {
      params.push(req.query.before, Number(req.query.beforeId));
      cursorSql = 'AND (p.created_at, p.id) < ($3::timestamptz, $4::bigint)';
    }
    const sql = `${POST_SELECT} WHERE p.is_private=FALSE ${cursorSql}
      GROUP BY p.id,u.id ORDER BY p.created_at DESC,p.id DESC LIMIT $2`;
    const { rows } = await pool.query(sql, params);
    const last = rows[rows.length - 1];
    res.json({ posts: rows, nextCursor: rows.length === limit ? { before: last.created_at, beforeId: last.id } : null });
  } catch (err) { next(err); }
});

app.post('/posts', auth, postMediaUpload.single('media'), async (req, res, next) => {
  try {
    if (!(await validateUploadedMedia(req.file))) {
      deleteUploaded(req.file);
      if (wantsJson(req)) return res.status(400).json({ error: 'The uploaded file is not a valid image or video.' });
      flash(req, 'error', 'The uploaded file is not a valid image or video.');
      return res.redirect('/home');
    }
    const content = String(req.body.content || '').trim();
    const imagePath = req.file ? `/uploads/posts/${req.file.filename}` : null;
    if (!content && !imagePath) {
      deleteUploaded(req.file);
      if (wantsJson(req)) return res.status(400).json({ error: 'A post needs text, media, or both.' });
      flash(req, 'error', 'A post needs text, media, or both.');
      return res.redirect('/home');
    }
    const inserted = await pool.query('INSERT INTO posts(user_id,content,image_path,is_private) VALUES($1,$2,$3,$4) RETURNING id',
      [req.session.userId, content || null, imagePath, req.body.is_private === 'on']);
    if (wantsJson(req)) {
      const { rows } = await pool.query(`${POST_SELECT} WHERE p.id=$2 GROUP BY p.id,u.id`, [req.session.userId, inserted.rows[0].id]);
      return res.status(201).json({ ok: true, post: rows[0] });
    }
    res.redirect('/home');
  } catch (err) { deleteUploaded(req.file); next(err); }
});

app.get('/posts/:id', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`${POST_SELECT} WHERE p.id=$2 AND (p.is_private=FALSE OR p.user_id=$1) GROUP BY p.id,u.id`, [req.session.userId, req.params.id]);
    if (!rows[0]) return res.status(404).render('404', { title: 'Post not found' });
    const comments = await pool.query(`SELECT c.*,u.name,u.avatar_path,u.avatar_variant FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=$1 ORDER BY c.created_at ASC`, [req.params.id]);
    res.render('post', { title: 'Post', post: rows[0], comments: comments.rows });
  } catch (err) { next(err); }
});

app.post('/posts/:id/reaction', auth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const reaction = Number(req.body.reaction);
    if (![1,2,3,4,5,6].includes(reaction)) return res.status(400).json({ error: 'Invalid reaction' });
    await client.query('BEGIN');
    const visible = await client.query('SELECT user_id FROM posts WHERE id=$1 AND (is_private=FALSE OR user_id=$2)', [req.params.id, req.session.userId]);
    if (!visible.rowCount) { await client.query('ROLLBACK'); return res.sendStatus(404); }
    const ownerId = visible.rows[0].user_id;
    const existing = await client.query('SELECT reaction FROM reactions WHERE post_id=$1 AND user_id=$2', [req.params.id, req.session.userId]);
    let currentReaction = reaction;
    if (existing.rows[0]?.reaction === reaction) {
      await client.query('DELETE FROM reactions WHERE post_id=$1 AND user_id=$2', [req.params.id, req.session.userId]);
      await client.query(`DELETE FROM notifications WHERE type='reaction' AND post_id=$1 AND actor_id=$2`, [req.params.id, req.session.userId]);
      currentReaction = 0;
    } else {
      await client.query(`INSERT INTO reactions(post_id,user_id,reaction) VALUES($1,$2,$3)
        ON CONFLICT(post_id,user_id) DO UPDATE SET reaction=EXCLUDED.reaction,updated_at=NOW()`, [req.params.id, req.session.userId, reaction]);
      if (Number(ownerId) !== Number(req.session.userId)) {
        await client.query(`DELETE FROM notifications WHERE type='reaction' AND post_id=$1 AND actor_id=$2`, [req.params.id, req.session.userId]);
        await client.query(`INSERT INTO notifications(user_id,actor_id,type,post_id,reaction) VALUES($1,$2,'reaction',$3,$4)`, [ownerId, req.session.userId, req.params.id, reaction]);
      }
    }
    const summary = await client.query(`SELECT COUNT(*)::int AS count,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT reaction ORDER BY reaction), NULL) AS types
      FROM reactions WHERE post_id=$1`, [req.params.id]);
    await client.query('COMMIT');
    res.json({ ok: true, reaction: currentReaction, count: summary.rows[0].count, types: summary.rows[0].types });
  } catch (err) { await client.query('ROLLBACK'); next(err); } finally { client.release(); }
});

app.post('/posts/:id/comments', auth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const content = String(req.body.content || '').trim();
    if (!content) return wantsJson(req) ? res.status(400).json({ error: 'Comment cannot be empty.' }) : res.redirect(`/posts/${req.params.id}`);
    await client.query('BEGIN');
    const visible = await client.query('SELECT user_id FROM posts WHERE id=$1 AND (is_private=FALSE OR user_id=$2)', [req.params.id, req.session.userId]);
    if (!visible.rowCount) { await client.query('ROLLBACK'); return res.sendStatus(404); }
    const comment = await client.query('INSERT INTO comments(post_id,user_id,content) VALUES($1,$2,$3) RETURNING id,content,created_at', [req.params.id, req.session.userId, content]);
    const ownerId = visible.rows[0].user_id;
    if (Number(ownerId) !== Number(req.session.userId)) {
      await client.query(`INSERT INTO notifications(user_id,actor_id,type,post_id,comment_id) VALUES($1,$2,'comment',$3,$4)`, [ownerId, req.session.userId, req.params.id, comment.rows[0].id]);
    }
    const count = await client.query('SELECT COUNT(*)::int AS count FROM comments WHERE post_id=$1', [req.params.id]);
    await client.query('COMMIT');
    if (wantsJson(req)) return res.status(201).json({
      ok: true,
      count: count.rows[0].count,
      comment: { ...comment.rows[0], user_id: req.session.userId, name: res.locals.currentUser.name,
        avatar_path: res.locals.currentUser.avatar_path, avatar_variant: res.locals.currentUser.avatar_variant,
        editable: !res.locals.currentUser.seeded_user }
    });
    res.redirect(`/posts/${req.params.id}`);
  } catch (err) { await client.query('ROLLBACK'); next(err); } finally { client.release(); }
});

app.post('/comments/:id/edit', auth, async (req, res, next) => {
  try {
    const content = String(req.body.content || '').trim();
    if (!content) return wantsJson(req) ? res.status(400).json({ error: 'Comment cannot be empty.' }) : res.redirect(req.get('referer') || '/home');
    const result = await pool.query(`UPDATE comments c SET content=$1,updated_at=NOW() FROM users u
      WHERE c.id=$2 AND c.user_id=$3 AND u.id=c.user_id AND u.seeded_user=FALSE`,
      [content, req.params.id, req.session.userId]);
    if (wantsJson(req)) return result.rowCount ? res.json({ ok: true, content }) : res.sendStatus(403);
    res.redirect(req.get('referer') || '/home');
  } catch (err) { next(err); }
});
app.post('/comments/:id/delete', auth, async (req, res, next) => {
  try {
    const result = await pool.query(`DELETE FROM comments c USING users u WHERE c.id=$1 AND c.user_id=$2 AND u.id=c.user_id AND u.seeded_user=FALSE RETURNING c.post_id`, [req.params.id, req.session.userId]);
    if (wantsJson(req)) {
      if (!result.rowCount) return res.sendStatus(403);
      const count = await pool.query('SELECT COUNT(*)::int AS count FROM comments WHERE post_id=$1', [result.rows[0].post_id]);
      return res.json({ ok: true, count: count.rows[0].count });
    }
    res.redirect(req.get('referer') || '/home');
  } catch (err) { next(err); }
});

app.get('/posts/:id/edit', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT p.* FROM posts p JOIN users u ON u.id=p.user_id WHERE p.id=$1 AND p.user_id=$2 AND u.seeded_user=FALSE`, [req.params.id, req.session.userId]);
    if (!rows[0]) return res.sendStatus(403);
    res.render('edit-post', { title: 'Edit post', post: rows[0] });
  } catch (err) { next(err); }
});
app.post('/posts/:id/edit', auth, postUpload.single('image'), async (req, res, next) => {
  try {
    if (!(await validateUploadedImage(req.file))) { deleteUploaded(req.file); flash(req, 'error', 'The uploaded file is not a valid PNG or JPG image.'); return res.redirect(`/posts/${req.params.id}/edit`); }
    const current = await pool.query(`SELECT p.* FROM posts p JOIN users u ON u.id=p.user_id WHERE p.id=$1 AND p.user_id=$2 AND u.seeded_user=FALSE`, [req.params.id, req.session.userId]);
    if (!current.rows[0]) { deleteUploaded(req.file); return res.sendStatus(403); }
    const content = String(req.body.content || '').trim();
    const imagePath = req.file ? `/uploads/posts/${req.file.filename}` : current.rows[0].image_path;
    if (!content && !imagePath) { deleteUploaded(req.file); flash(req, 'error', 'A post needs text, an image, or both.'); return res.redirect(`/posts/${req.params.id}/edit`); }
    await pool.query('UPDATE posts SET content=$1,image_path=$2,is_private=$3,updated_at=NOW() WHERE id=$4', [content || null, imagePath, req.body.is_private === 'on', req.params.id]);
    res.redirect(`/posts/${req.params.id}`);
  } catch (err) { deleteUploaded(req.file); next(err); }
});
app.post('/posts/:id/delete', auth, async (req, res, next) => {
  try {
    const result = await pool.query(`DELETE FROM posts p USING users u WHERE p.id=$1 AND p.user_id=$2 AND u.id=p.user_id AND u.seeded_user=FALSE`, [req.params.id, req.session.userId]);
    if (wantsJson(req)) return result.rowCount ? res.json({ ok: true }) : res.sendStatus(403);
    res.redirect('/home');
  } catch (err) { next(err); }
});

app.get('/profile/edit', auth, (req, res) => {
  if (res.locals.currentUser.seeded_user) return res.sendStatus(403);
  res.render('edit-profile', { title: 'Edit profile' });
});
app.post('/profile/edit', auth, avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    if (!(await validateUploadedImage(req.file))) { deleteUploaded(req.file); flash(req, 'error', 'The uploaded file is not a valid PNG or JPG image.'); return res.redirect('/profile/edit'); }
    if (res.locals.currentUser.seeded_user) { deleteUploaded(req.file); return res.sendStatus(403); }
    const name = String(req.body.name || '').trim();
    if (!name) { deleteUploaded(req.file); flash(req, 'error', 'Name is required.'); return res.redirect('/profile/edit'); }
    const avatarPath = req.file ? `/uploads/avatars/${req.file.filename}` : res.locals.currentUser.avatar_path;
    await pool.query(`UPDATE users SET name=$1,headline=$2,employer=$3,job_title=$4,show_email=$5,avatar_path=$6,updated_at=NOW() WHERE id=$7`,
      [name, req.body.headline || null, req.body.employer || null, req.body.job_title || null, req.body.show_email === 'on', avatarPath, req.session.userId]);
    res.redirect(`/profile/${req.session.userId}`);
  } catch (err) { deleteUploaded(req.file); next(err); }
});

app.get('/profile/:id', auth, async (req, res, next) => {
  try {
    const userResult = await pool.query(`SELECT id,name,email,avatar_path,avatar_variant,show_email,headline,employer,job_title,seeded_user,created_at FROM users WHERE id=$1`, [req.params.id]);
    if (!userResult.rows[0]) return res.status(404).render('404', { title: 'User not found' });
    const posts = await pool.query(`${POST_SELECT} WHERE p.user_id=$2 AND (p.is_private=FALSE OR p.user_id=$1) GROUP BY p.id,u.id ORDER BY p.created_at DESC,p.id DESC`, [req.session.userId, req.params.id]);
    const relation = await pool.query(`SELECT requester_id,recipient_id,status FROM connections WHERE (requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1)`, [req.session.userId, req.params.id]);
    const count = await pool.query(`SELECT COUNT(*)::int AS count FROM connections WHERE status='accepted' AND (requester_id=$1 OR recipient_id=$1)`, [req.params.id]);
    res.render('profile', { title: userResult.rows[0].name, profile: userResult.rows[0], posts: posts.rows, relation: relation.rows[0] || null, connectionCount: count.rows[0].count });
  } catch (err) { next(err); }
});



app.get('/search', auth, async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    let rows = [];
    if (q) {
      const result = await pool.query(`SELECT id,name,avatar_path,avatar_variant,headline,employer,job_title FROM users
        WHERE name ILIKE $1 OR headline ILIKE $1 OR employer ILIKE $1 OR job_title ILIKE $1 ORDER BY name LIMIT 100`, [`%${q}%`]);
      rows = result.rows;
    }
    res.render('search', { title: 'Search', q, users: rows });
  } catch (err) { next(err); }
});

app.get('/api/notifications/stream', auth, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  });
  res.flushHeaders();

  let closed = false;
  const sendUnread = async () => {
    try {
      const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND read_at IS NULL', [req.session.userId]);
      if (!closed) res.write(`data: ${JSON.stringify({ unread: rows[0].count })}\n\n`);
    } catch (_err) {
      if (!closed) res.write('event: error\ndata: {}\n\n');
    }
  };

  sendUnread();
  const timer = setInterval(sendUnread, 3000);
  req.on('close', () => {
    closed = true;
    clearInterval(timer);
  });
});

app.get('/notifications', auth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT n.*,u.name,u.avatar_path,u.avatar_variant,
        LEFT(COALESCE(p.content,''),180) AS post_content
      FROM notifications n
      JOIN users u ON u.id=n.actor_id
      LEFT JOIN posts p ON p.id=n.post_id
      WHERE n.user_id=$1
      ORDER BY n.created_at DESC,n.id DESC
      LIMIT 200`, [req.session.userId]);
    await pool.query('UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL', [req.session.userId]);
    res.locals.notificationCount = 0;
    res.render('notifications', { title: 'Notifications', notifications: rows });
  } catch (err) { next(err); }
});

app.post('/connections/:id/request', auth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const target = Number(req.params.id);
    if (target === Number(req.session.userId)) return res.sendStatus(400);
    await client.query('BEGIN');
    const user = await client.query('SELECT auto_accept FROM users WHERE id=$1 FOR UPDATE', [target]);
    if (!user.rows[0]) { await client.query('ROLLBACK'); return res.sendStatus(404); }
    const existing = await client.query(`SELECT 1 FROM connections WHERE (requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1)`, [req.session.userId, target]);
    let status = 'existing';
    if (!existing.rowCount) {
      status = user.rows[0].auto_accept ? 'accepted' : 'pending';
      await client.query('INSERT INTO connections(requester_id,recipient_id,status) VALUES($1,$2,$3)', [req.session.userId, target, status]);
      if (status === 'pending') {
        await client.query(`INSERT INTO notifications(user_id,actor_id,type) VALUES($1,$2,'connection')`, [target, req.session.userId]);
      }
    }
    await client.query('COMMIT');
    if (wantsJson(req)) return res.json({ ok: true, status });
    res.redirect(req.get('referer') || `/profile/${target}`);
  } catch (err) { await client.query('ROLLBACK'); next(err); } finally { client.release(); }
});
app.post('/connections/:id/accept', auth, async (req, res, next) => {
  try {
    await pool.query(`UPDATE connections SET status='accepted',updated_at=NOW() WHERE requester_id=$1 AND recipient_id=$2 AND status='pending'`, [req.params.id, req.session.userId]);
    await pool.query(`DELETE FROM notifications WHERE type='connection' AND actor_id=$1 AND user_id=$2`, [req.params.id, req.session.userId]);
    if (wantsJson(req)) return res.json({ ok: true, status: 'accepted' });
    res.redirect('/network');
  } catch (err) { next(err); }
});
app.post('/connections/:id/reject', auth, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM connections WHERE requester_id=$1 AND recipient_id=$2 AND status='pending'`, [req.params.id, req.session.userId]);
    await pool.query(`DELETE FROM notifications WHERE type='connection' AND actor_id=$1 AND user_id=$2`, [req.params.id, req.session.userId]);
    if (wantsJson(req)) return res.json({ ok: true, status: 'rejected' });
    res.redirect('/network');
  } catch (err) { next(err); }
});
app.post('/connections/:id/remove', auth, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM connections WHERE status='accepted' AND ((requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1))`, [req.session.userId, req.params.id]);
    if (wantsJson(req)) return res.json({ ok: true, status: 'none' });
    res.redirect(req.get('referer') || '/network');
  } catch (err) { next(err); }
});
app.get('/network', auth, async (req, res, next) => {
  try {
    const incoming = await pool.query(`SELECT u.id,u.name,u.avatar_path,u.avatar_variant,u.headline,u.job_title,u.employer FROM connections c JOIN users u ON u.id=c.requester_id WHERE c.recipient_id=$1 AND c.status='pending' ORDER BY c.created_at DESC`, [req.session.userId]);
    const outgoing = await pool.query(`SELECT u.id,u.name,u.avatar_path,u.avatar_variant,u.headline,u.job_title,u.employer FROM connections c JOIN users u ON u.id=c.recipient_id WHERE c.requester_id=$1 AND c.status='pending' ORDER BY c.created_at DESC`, [req.session.userId]);
    const connections = await pool.query(`SELECT u.id,u.name,u.avatar_path,u.avatar_variant,u.headline,u.job_title,u.employer FROM connections c JOIN users u ON u.id=CASE WHEN c.requester_id=$1 THEN c.recipient_id ELSE c.requester_id END WHERE c.status='accepted' AND (c.requester_id=$1 OR c.recipient_id=$1) ORDER BY u.name`, [req.session.userId]);
    res.render('network', { title: 'My Network', incoming: incoming.rows, outgoing: outgoing.rows, connections: connections.rows });
  } catch (err) { next(err); }
});

app.use((err, req, res, _next) => {
  console.error(err);
  if (err instanceof multer.MulterError || /Only PNG/.test(err.message)) {
    if (wantsJson(req)) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Uploads must be 5 MB or smaller.' : err.message });
    flash(req, 'error', err.code === 'LIMIT_FILE_SIZE' ? 'Uploads must be 5 MB or smaller.' : err.message);
    return res.redirect(req.get('referer') || '/home');
  }
  if (wantsJson(req)) return res.status(500).json({ error: 'The action could not be completed.' });
  res.status(500).render('500', { title: 'Server error' });
});

async function ensureSchemaUpdates() {
  await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('comment', 'reaction', 'connection')),
    post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
    comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
    reaction SMALLINT CHECK (reaction IN (1,2,3,4,5,6)),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (user_id <> actor_id)
  )`);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id,created_at DESC,id DESC)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id,id DESC) WHERE read_at IS NULL');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_variant SMALLINT');
  await pool.query('UPDATE users SET avatar_variant = FLOOR(RANDOM() * 5)::SMALLINT WHERE avatar_variant IS NULL');
  await pool.query('ALTER TABLE users ALTER COLUMN avatar_variant SET DEFAULT (FLOOR(RANDOM() * 5)::SMALLINT)');
  await pool.query('ALTER TABLE users ALTER COLUMN avatar_variant SET NOT NULL');
  await pool.query('ALTER TABLE reactions DROP CONSTRAINT IF EXISTS reactions_reaction_check');
  await pool.query('UPDATE reactions SET reaction=1 WHERE reaction=-1');
  await pool.query('ALTER TABLE reactions ADD CONSTRAINT reactions_reaction_check CHECK (reaction IN (1,2,3,4,5,6))');
}

ensureSchemaUpdates()
  .then(() => app.listen(port, '0.0.0.0', () => console.log(`LeakedIn listening on port ${port}`)))
  .catch(err => {
    console.error('Database migration failed:', err);
    process.exit(1);
  });
