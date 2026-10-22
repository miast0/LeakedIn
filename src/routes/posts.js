const express = require('express');
const { auth, flash, wantsJson } = require('../lib/http');
const { postUpload, postMediaUpload, deleteUploaded, validateUploadedImage, validateUploadedMedia } = require('../lib/uploads');
const { POST_SELECT } = require('../queries/posts');

module.exports = pool => {
  const router = express.Router();

  router.get('/home', auth, (req, res) => res.render('home', { title: 'Home' }));
  router.get('/api/feed', auth, async (req, res, next) => {
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

  router.post('/posts', auth, postMediaUpload.single('media'), async (req, res, next) => {
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

  router.get('/posts/:id', auth, async (req, res, next) => {
    try {
      const { rows } = await pool.query(`${POST_SELECT} WHERE p.id=$2 AND (p.is_private=FALSE OR p.user_id=$1) GROUP BY p.id,u.id`, [req.session.userId, req.params.id]);
      if (!rows[0]) return res.status(404).render('404', { title: 'Post not found' });
      const comments = await pool.query('SELECT c.*,u.name,u.avatar_path,u.avatar_variant FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=$1 ORDER BY c.created_at ASC', [req.params.id]);
      res.render('post', { title: 'Post', post: rows[0], comments: comments.rows });
    } catch (err) { next(err); }
  });

  router.post('/posts/:id/reaction', auth, async (req, res, next) => {
    const client = await pool.connect();
    try {
      const reaction = Number(req.body.reaction);
      if (![1, 2, 3, 4, 5, 6].includes(reaction)) return res.status(400).json({ error: 'Invalid reaction' });
      await client.query('BEGIN');
      const visible = await client.query('SELECT user_id FROM posts WHERE id=$1 AND (is_private=FALSE OR user_id=$2)', [req.params.id, req.session.userId]);
      if (!visible.rowCount) { await client.query('ROLLBACK'); return res.sendStatus(404); }
      const ownerId = visible.rows[0].user_id;
      const existing = await client.query('SELECT reaction FROM reactions WHERE post_id=$1 AND user_id=$2', [req.params.id, req.session.userId]);
      let currentReaction = reaction;
      if (existing.rows[0]?.reaction === reaction) {
        await client.query('DELETE FROM reactions WHERE post_id=$1 AND user_id=$2', [req.params.id, req.session.userId]);
        await client.query("DELETE FROM notifications WHERE type='reaction' AND post_id=$1 AND actor_id=$2", [req.params.id, req.session.userId]);
        currentReaction = 0;
      } else {
        await client.query(`INSERT INTO reactions(post_id,user_id,reaction) VALUES($1,$2,$3)
          ON CONFLICT(post_id,user_id) DO UPDATE SET reaction=EXCLUDED.reaction,updated_at=NOW()`, [req.params.id, req.session.userId, reaction]);
        if (Number(ownerId) !== Number(req.session.userId)) {
          await client.query("DELETE FROM notifications WHERE type='reaction' AND post_id=$1 AND actor_id=$2", [req.params.id, req.session.userId]);
          await client.query("INSERT INTO notifications(user_id,actor_id,type,post_id,reaction) VALUES($1,$2,'reaction',$3,$4)", [ownerId, req.session.userId, req.params.id, reaction]);
        }
      }
      const summary = await client.query(`SELECT COUNT(*)::int AS count,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT reaction ORDER BY reaction), NULL) AS types
        FROM reactions WHERE post_id=$1`, [req.params.id]);
      await client.query('COMMIT');
      res.json({ ok: true, reaction: currentReaction, count: summary.rows[0].count, types: summary.rows[0].types });
    } catch (err) { await client.query('ROLLBACK'); next(err); } finally { client.release(); }
  });

  router.post('/posts/:id/comments', auth, async (req, res, next) => {
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
        await client.query("INSERT INTO notifications(user_id,actor_id,type,post_id,comment_id) VALUES($1,$2,'comment',$3,$4)", [ownerId, req.session.userId, req.params.id, comment.rows[0].id]);
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

  router.post('/comments/:id/edit', auth, async (req, res, next) => {
    try {
      const content = String(req.body.content || '').trim();
      if (!content) return wantsJson(req) ? res.status(400).json({ error: 'Comment cannot be empty.' }) : res.redirect(req.get('referer') || '/home');
      const result = await pool.query(`UPDATE comments c SET content=$1,updated_at=NOW() FROM users u
        WHERE c.id=$2 AND c.user_id=$3 AND u.id=c.user_id AND u.seeded_user=FALSE`, [content, req.params.id, req.session.userId]);
      if (wantsJson(req)) return result.rowCount ? res.json({ ok: true, content }) : res.sendStatus(403);
      res.redirect(req.get('referer') || '/home');
    } catch (err) { next(err); }
  });

  router.post('/comments/:id/delete', auth, async (req, res, next) => {
    try {
      const result = await pool.query('DELETE FROM comments c USING users u WHERE c.id=$1 AND c.user_id=$2 AND u.id=c.user_id AND u.seeded_user=FALSE RETURNING c.post_id', [req.params.id, req.session.userId]);
      if (wantsJson(req)) {
        if (!result.rowCount) return res.sendStatus(403);
        const count = await pool.query('SELECT COUNT(*)::int AS count FROM comments WHERE post_id=$1', [result.rows[0].post_id]);
        return res.json({ ok: true, count: count.rows[0].count });
      }
      res.redirect(req.get('referer') || '/home');
    } catch (err) { next(err); }
  });

  router.get('/posts/:id/edit', auth, async (req, res, next) => {
    try {
      const { rows } = await pool.query('SELECT p.* FROM posts p JOIN users u ON u.id=p.user_id WHERE p.id=$1 AND p.user_id=$2 AND u.seeded_user=FALSE', [req.params.id, req.session.userId]);
      if (!rows[0]) return res.sendStatus(403);
      res.render('edit-post', { title: 'Edit post', post: rows[0] });
    } catch (err) { next(err); }
  });

  router.post('/posts/:id/edit', auth, postUpload.single('image'), async (req, res, next) => {
    try {
      if (!(await validateUploadedImage(req.file))) { deleteUploaded(req.file); flash(req, 'error', 'The uploaded file is not a valid PNG or JPG image.'); return res.redirect(`/posts/${req.params.id}/edit`); }
      const current = await pool.query('SELECT p.* FROM posts p JOIN users u ON u.id=p.user_id WHERE p.id=$1 AND p.user_id=$2 AND u.seeded_user=FALSE', [req.params.id, req.session.userId]);
      if (!current.rows[0]) { deleteUploaded(req.file); return res.sendStatus(403); }
      const content = String(req.body.content || '').trim();
      const imagePath = req.file ? `/uploads/posts/${req.file.filename}` : current.rows[0].image_path;
      if (!content && !imagePath) { deleteUploaded(req.file); flash(req, 'error', 'A post needs text, an image, or both.'); return res.redirect(`/posts/${req.params.id}/edit`); }
      await pool.query('UPDATE posts SET content=$1,image_path=$2,is_private=$3,updated_at=NOW() WHERE id=$4', [content || null, imagePath, req.body.is_private === 'on', req.params.id]);
      res.redirect(`/posts/${req.params.id}`);
    } catch (err) { deleteUploaded(req.file); next(err); }
  });

  router.post('/posts/:id/delete', auth, async (req, res, next) => {
    try {
      const result = await pool.query('DELETE FROM posts p USING users u WHERE p.id=$1 AND p.user_id=$2 AND u.id=p.user_id AND u.seeded_user=FALSE', [req.params.id, req.session.userId]);
      if (wantsJson(req)) return result.rowCount ? res.json({ ok: true }) : res.sendStatus(403);
      res.redirect('/home');
    } catch (err) { next(err); }
  });

  return router;
};
