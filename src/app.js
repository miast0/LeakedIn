const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const multer = require('multer');
const pool = require('./db');
const loadLocals = require('./middleware/locals');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const profileRoutes = require('./routes/profiles');
const socialRoutes = require('./routes/social');
const { flash, wantsJson } = require('./lib/http');
const { uploadRoot } = require('./lib/uploads');

function createApp() {
  const app = express();
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
  app.use(loadLocals(pool));
  app.use(authRoutes(pool));
  app.use(postRoutes(pool));
  app.use(profileRoutes(pool));
  app.use(socialRoutes(pool));

  app.use((err, req, res, _next) => {
    console.error(err);
    if (err instanceof multer.MulterError || /Only PNG/.test(err.message)) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Uploads must be 5 MB or smaller.' : err.message;
      if (wantsJson(req)) return res.status(400).json({ error: message });
      flash(req, 'error', message);
      return res.redirect(req.get('referer') || '/home');
    }
    if (wantsJson(req)) return res.status(500).json({ error: 'The action could not be completed.' });
    res.status(500).render('500', { title: 'Server error' });
  });

  return app;
}

module.exports = createApp;
