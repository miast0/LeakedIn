async function ensureSchemaUpdates(pool) {
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

module.exports = ensureSchemaUpdates;
