const crypto = require('crypto');
const express = require('express');
const { auth, flash } = require('../lib/http');
const { avatarUpload, deleteUploaded, validateUploadedImage } = require('../lib/uploads');

const sha256 = value => crypto.createHash('sha256').update(value, 'utf8').digest('hex');
const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

module.exports = pool => {
  const router = express.Router();

  router.get('/', (req, res) => res.redirect(req.session.userId ? '/home' : '/login'));
  router.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/home');
    res.render('login', { title: 'Sign in' });
  });
  router.post('/login', async (req, res, next) => {
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

  router.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/home');
    res.render('register', { title: 'Join LeakedIn' });
  });
  router.post('/register', avatarUpload.single('avatar'), async (req, res, next) => {
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
      return req.session.save(() => res.redirect('/home'));
    } catch (err) {
      deleteUploaded(req.file);
      if (err.code === '23505') {
        flash(req, 'error', 'An account already exists with that email.');
        return req.session.save(() => res.redirect('/register'));
      }
      next(err);
    }
  });

  router.post('/logout', auth, (req, res) => req.session.destroy(() => res.redirect('/login')));
  return router;
};
