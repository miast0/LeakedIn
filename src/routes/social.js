const express = require('express');
const { auth, wantsJson } = require('../lib/http');

module.exports = pool => {
  const router = express.Router();

  router.get('/api/notifications/stream', auth, (req, res) => {
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
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
    req.on('close', () => { closed = true; clearInterval(timer); });
  });

  router.get('/notifications', auth, async (req, res, next) => {
    try {
      const { rows } = await pool.query(`SELECT n.*,u.name,u.avatar_path,u.avatar_variant,
        LEFT(COALESCE(p.content,''),180) AS post_content
        FROM notifications n JOIN users u ON u.id=n.actor_id LEFT JOIN posts p ON p.id=n.post_id
        WHERE n.user_id=$1 ORDER BY n.created_at DESC,n.id DESC LIMIT 200`, [req.session.userId]);
      await pool.query('UPDATE notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL', [req.session.userId]);
      res.locals.notificationCount = 0;
      res.render('notifications', { title: 'Notifications', notifications: rows });
    } catch (err) { next(err); }
  });

  router.post('/connections/:id/request', auth, async (req, res, next) => {
    const client = await pool.connect();
    try {
      const target = Number(req.params.id);
      if (target === Number(req.session.userId)) return res.sendStatus(400);
      await client.query('BEGIN');
      const user = await client.query('SELECT auto_accept FROM users WHERE id=$1 FOR UPDATE', [target]);
      if (!user.rows[0]) { await client.query('ROLLBACK'); return res.sendStatus(404); }
      const existing = await client.query('SELECT 1 FROM connections WHERE (requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1)', [req.session.userId, target]);
      let status = 'existing';
      if (!existing.rowCount) {
        status = user.rows[0].auto_accept ? 'accepted' : 'pending';
        await client.query('INSERT INTO connections(requester_id,recipient_id,status) VALUES($1,$2,$3)', [req.session.userId, target, status]);
        if (status === 'pending') await client.query("INSERT INTO notifications(user_id,actor_id,type) VALUES($1,$2,'connection')", [target, req.session.userId]);
      }
      await client.query('COMMIT');
      if (wantsJson(req)) return res.json({ ok: true, status });
      res.redirect(req.get('referer') || `/profile/${target}`);
    } catch (err) { await client.query('ROLLBACK'); next(err); } finally { client.release(); }
  });

  router.post('/connections/:id/accept', auth, async (req, res, next) => {
    try {
      await pool.query("UPDATE connections SET status='accepted',updated_at=NOW() WHERE requester_id=$1 AND recipient_id=$2 AND status='pending'", [req.params.id, req.session.userId]);
      await pool.query("DELETE FROM notifications WHERE type='connection' AND actor_id=$1 AND user_id=$2", [req.params.id, req.session.userId]);
      if (wantsJson(req)) return res.json({ ok: true, status: 'accepted' });
      res.redirect('/network');
    } catch (err) { next(err); }
  });

  router.post('/connections/:id/reject', auth, async (req, res, next) => {
    try {
      await pool.query("DELETE FROM connections WHERE requester_id=$1 AND recipient_id=$2 AND status='pending'", [req.params.id, req.session.userId]);
      await pool.query("DELETE FROM notifications WHERE type='connection' AND actor_id=$1 AND user_id=$2", [req.params.id, req.session.userId]);
      if (wantsJson(req)) return res.json({ ok: true, status: 'rejected' });
      res.redirect('/network');
    } catch (err) { next(err); }
  });

  router.post('/connections/:id/remove', auth, async (req, res, next) => {
    try {
      await pool.query("DELETE FROM connections WHERE status='accepted' AND ((requester_id=$1 AND recipient_id=$2) OR (requester_id=$2 AND recipient_id=$1))", [req.session.userId, req.params.id]);
      if (wantsJson(req)) return res.json({ ok: true, status: 'none' });
      res.redirect(req.get('referer') || '/network');
    } catch (err) { next(err); }
  });

  router.get('/network', auth, async (req, res, next) => {
    try {
      const fields = 'u.id,u.name,u.avatar_path,u.avatar_variant,u.headline,u.job_title,u.employer';
      const incoming = await pool.query(`SELECT ${fields} FROM connections c JOIN users u ON u.id=c.requester_id WHERE c.recipient_id=$1 AND c.status='pending' ORDER BY c.created_at DESC`, [req.session.userId]);
      const outgoing = await pool.query(`SELECT ${fields} FROM connections c JOIN users u ON u.id=c.recipient_id WHERE c.requester_id=$1 AND c.status='pending' ORDER BY c.created_at DESC`, [req.session.userId]);
      const connections = await pool.query(`SELECT ${fields} FROM connections c JOIN users u ON u.id=CASE WHEN c.requester_id=$1 THEN c.recipient_id ELSE c.requester_id END WHERE c.status='accepted' AND (c.requester_id=$1 OR c.recipient_id=$1) ORDER BY u.name`, [req.session.userId]);
      res.render('network', { title: 'My Network', incoming: incoming.rows, outgoing: outgoing.rows, connections: connections.rows });
    } catch (err) { next(err); }
  });

  return router;
};
