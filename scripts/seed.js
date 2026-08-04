const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const { users, postingUserKeys } = require('./seed-data/users');
const buildPosts = require('./seed-data/posts');
const buildComments = require('./seed-data/comments');
const connections = require('./seed-data/connections');

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgresql://leakedin:leakedin@localhost:5432/leakedin'
});

const now = new Date();
const configuredConferenceDate = process.env.ITCON26_DATE?.trim();
const conferenceDate = configuredConferenceDate
  ? new Date(`${configuredConferenceDate}T09:00:00`)
  : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);

if (Number.isNaN(conferenceDate.getTime())) {
  throw new Error('ITCON26_DATE must use YYYY-MM-DD format.');
}

const ctfFlag = process.env.CTF_FLAG || 'FLAG{replace_with_your_itcon26_flag}';
const conferenceLabel = conferenceDate.toLocaleDateString('en-IE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric'
});

const daysAgo = (days, hour = 10, minute = 0) => {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const conferenceDaysBefore = (days, hour = 10, minute = 0) => {
  const date = new Date(conferenceDate);
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const minutesAgo = minutes => new Date(now.getTime() - minutes * 60_000);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

const posts = buildPosts({
  daysAgo,
  conferenceDaysBefore,
  minutesAgo,
  conferenceLabel,
  ctfFlag
});

const comments = buildComments({
  daysAgo,
  conferenceDaysBefore,
  minutesAgo
});

const ASSET_ROOT = path.join(__dirname, 'seed-data', 'assets');
const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg']);

function removeOldSeedUploads(type) {
  const directory = path.join(UPLOAD_ROOT, type);
  fs.mkdirSync(directory, { recursive: true });

  for (const filename of fs.readdirSync(directory)) {
    if (filename.startsWith('seed-')) {
      fs.rmSync(path.join(directory, filename), { force: true });
    }
  }
}

function copySeedImage(relativePath, type) {
  if (!relativePath) return null;

  const source = path.resolve(ASSET_ROOT, relativePath);
  const expectedRoot = path.resolve(ASSET_ROOT) + path.sep;

  if (!source.startsWith(expectedRoot)) {
    throw new Error(`Seed image escapes asset directory: ${relativePath}`);
  }

  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) {
    throw new Error(`Seed image not found: ${relativePath}`);
  }

  const extension = path.extname(source).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new Error(`Seed image must be PNG or JPG: ${relativePath}`);
  }

  const storedExtension = extension === '.jpeg' ? '.jpg' : extension;
  const filename = `seed-${Date.now()}-${crypto.randomBytes(10).toString('hex')}${storedExtension}`;
  const destinationDirectory = path.join(UPLOAD_ROOT, type);
  const destination = path.join(destinationDirectory, filename);

  fs.mkdirSync(destinationDirectory, { recursive: true });
  fs.copyFileSync(source, destination);

  return `/uploads/${type}/${filename}`;
}

async function tableExists(client, tableName) {
  const result = await client.query(
    'SELECT to_regclass($1) IS NOT NULL AS exists',
    [`public.${tableName}`]
  );
  return result.rows[0].exists;
}

async function main() {
  removeOldSeedUploads('avatars');
  removeOldSeedUploads('posts');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      'TRUNCATE TABLE connections, reactions, comments, posts, users RESTART IDENTITY CASCADE'
    );

    if (await tableExists(client, 'session')) {
      await client.query('TRUNCATE TABLE session');
    }

    const userIds = {};

    for (const user of users) {
      const avatarPath = copySeedImage(user.avatar, 'avatars');
      const result = await client.query(
        `INSERT INTO users (
          name, email, password_hash, avatar_path, avatar_variant,
          show_email, headline, employer, job_title,
          auto_accept, seeded_user, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9,
          $10, $11, $12, $12
        ) RETURNING id`,
        [
          user.name,
          user.email,
          hash(user.password),
          avatarPath,
          user.avatarVariant ?? 0,
          Boolean(user.showEmail),
          user.headline || null,
          user.employer || null,
          user.jobTitle || null,
          Boolean(user.autoAccept),
          Boolean(user.seededUser),
          user.createdAt || daysAgo(180, 9, 0)
        ]
      );
      userIds[user.key] = result.rows[0].id;
    }

    const postIds = {};
    for (const post of [...posts].sort((a, b) => a.at - b.at)) {
      const imagePath = copySeedImage(post.image, 'posts');
      const result = await client.query(
        `INSERT INTO posts (
          user_id, content, image_path, is_private, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $5) RETURNING id`,
        [
          userIds[post.user],
          post.content || null,
          imagePath,
          Boolean(post.private),
          post.at
        ]
      );
      postIds[post.key] = result.rows[0].id;
    }

    for (const comment of [...comments].sort((a, b) => a.at - b.at)) {
      await client.query(
        `INSERT INTO comments (
          post_id, user_id, content, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $4)`,
        [
          postIds[comment.post],
          userIds[comment.user],
          comment.content,
          comment.at
        ]
      );
    }

    const reactionValues = [1, 2, 3, 4, 5, 6, -1];
    const publicPosts = posts.filter(post => !post.private);

    for (let postIndex = 0; postIndex < publicPosts.length; postIndex += 1) {
      const post = publicPosts[postIndex];
      const reactingUsers = postingUserKeys.filter(key => key !== post.user);
      const reactionCount = 1 + (postIndex % Math.min(4, reactingUsers.length));

      for (let i = 0; i < reactionCount; i += 1) {
        const userKey = reactingUsers[(postIndex + i) % reactingUsers.length];
        const reaction = reactionValues[(postIndex + i) % reactionValues.length];

        await client.query(
          `INSERT INTO reactions (
            post_id, user_id, reaction, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $4)`,
          [postIds[post.key], userIds[userKey], reaction, post.at]
        );
      }
    }

    for (const connection of connections) {
      const createdAt = daysAgo(connection.daysAgo ?? 20, 10, 0);
      await client.query(
        `INSERT INTO connections (
          requester_id, recipient_id, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $4)`,
        [
          userIds[connection.requester],
          userIds[connection.recipient],
          connection.status || 'accepted',
          createdAt
        ]
      );
    }

    await client.query('COMMIT');

    console.log('LeakedIn challenge database reset and seeded.');
    console.log(`ITCON26 date: ${conferenceLabel}`);
    console.log(`Users: ${users.length}`);
    console.log(`Posts: ${posts.length}`);
    console.log(`Comments: ${comments.length}`);
    console.log('Target: John Smith <jsmith@globalpharma.com>');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
