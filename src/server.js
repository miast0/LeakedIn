const createApp = require('./app');
const pool = require('./db');
const ensureSchemaUpdates = require('./schema');

const port = Number(process.env.PORT || 3000);

ensureSchemaUpdates(pool)
  .then(() => createApp().listen(port, '0.0.0.0', () => console.log(`LeakedIn listening on port ${port}`)))
  .catch(err => {
    console.error('Database migration failed:', err);
    process.exit(1);
  });
