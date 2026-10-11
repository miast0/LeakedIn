CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash CHAR(64) NOT NULL,
  avatar_path TEXT,
  avatar_variant SMALLINT NOT NULL DEFAULT (FLOOR(RANDOM() * 5)::SMALLINT),
  show_email BOOLEAN NOT NULL DEFAULT FALSE,
  headline VARCHAR(220),
  employer VARCHAR(160),
  job_title VARCHAR(160),
  auto_accept BOOLEAN NOT NULL DEFAULT FALSE,
  seeded_user BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content TEXT,
  image_path TEXT,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NULLIF(BTRIM(content), '') IS NOT NULL OR image_path IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content TEXT NOT NULL CHECK (NULLIF(BTRIM(content), '') IS NOT NULL),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reactions (
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction SMALLINT NOT NULL CHECK (reaction IN (1, 2, 3, 4, 5, 6)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS connections (
  requester_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(10) NOT NULL CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (requester_id, recipient_id),
  CHECK (requester_id <> recipient_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('comment', 'reaction', 'connection')),
  post_id BIGINT REFERENCES posts(id) ON DELETE CASCADE,
  comment_id BIGINT REFERENCES comments(id) ON DELETE CASCADE,
  reaction SMALLINT CHECK (reaction IN (1, 2, 3, 4, 5, 6)),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (user_id <> actor_id)
);

CREATE INDEX IF NOT EXISTS idx_posts_public_feed ON posts (created_at DESC, id DESC) WHERE is_private = FALSE;
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id, id DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING GIN (to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(headline,'') || ' ' || coalesce(employer,'') || ' ' || coalesce(job_title,'')));
