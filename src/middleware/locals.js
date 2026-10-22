module.exports = pool => async (req, res, next) => {
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
  } catch (err) {
    next(err);
  }
};
