function auth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

function flash(req, type, message) {
  req.session.flash = { type, message };
}

function wantsJson(req) {
  return req.get('accept')?.includes('application/json') || req.get('x-requested-with') === 'XMLHttpRequest';
}

module.exports = { auth, flash, wantsJson };
