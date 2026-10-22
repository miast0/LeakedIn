const express = require('express');
const { auth, flash } = require('../lib/http');
const { avatarUpload, deleteUploaded, validateUploadedImage } = require('../lib/uploads');
const { POST_SELECT } = require('../queries/posts');

module.exports = pool => {
  const router = express.Router();

  router.get('/profile/edit', auth, (req, res) => {
    if (res.locals.currentUser.seeded_user) return res.sendStatus(403);
    res.render('edit-profile', { title: 'Edit profile' });
  });
  router.post('/profile/edit', auth, avatarUpload.single('avatar'), async (req, res, next) => {
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

  router.get('/profile/:id', auth, async (req, res, next) => {
    try {
      const userResult = await pool.query('SELECT id,name,email,avatar_path,avatar_variant,show_email,headline,employer,job_title,seeded_user,created_at FROM users WHERE id=$1', [req.params.id]);
      if (!userResult.rows[0]) return res.status(404).render('404', { title: 'User not found' });
      const posts = await pool.query(`${POST_SELECT} WHERE p.user_id=$2 AND (p.is_private=FALSE OR p.user_id=$1) GROUP BY p.id,u.id ORDER BY p.created_at DESC,p.id DESC`, [req.session.userId, req.params.id]);
      const relation = await pool.query('SELECT requester_id,recipient_id,status FROM connections WHERE (requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1)', [req.session.userId, req.params.id]);
      const count = await pool.query("SELECT COUNT(*)::int AS count FROM connections WHERE status='accepted' AND (requester_id=$1 OR recipient_id=$1)", [req.params.id]);
      res.render('profile', { title: userResult.rows[0].name, profile: userResult.rows[0], posts: posts.rows, relation: relation.rows[0] || null, connectionCount: count.rows[0].count });
    } catch (err) { next(err); }
  });

  router.get('/search', auth, async (req, res, next) => {
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

  return router;
};
