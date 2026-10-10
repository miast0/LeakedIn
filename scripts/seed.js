require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const scenarioName = process.env.SEED_SCENARIO || 'itcon';
if (!/^[a-z0-9_-]+$/i.test(scenarioName)) throw new Error('Invalid SEED_SCENARIO.');
const scenario = require(path.join(__dirname, 'seeds', scenarioName));
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://leakedin:leakedin@localhost:5432/leakedin' });

const configuredDate = process.env.ITCON26_DATE?.trim();
const now = new Date();
const eventDate = configuredDate ? new Date(`${configuredDate}T09:00:00`) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9);
if (Number.isNaN(eventDate.getTime())) throw new Error('ITCON26_DATE must use YYYY-MM-DD format.');
const eventLabel = eventDate.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
const uploadSeedRoot = path.join(__dirname, 'uploads-seed');
const uploadRoot = path.join(__dirname, '..', 'uploads');
const allowedExtensions = new Set(['.png', '.jpg', '.jpeg']);
const hash = value => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

function timestamp(day, time) {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date(eventDate);
  date.setDate(date.getDate() + day);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function textFor(post) {
  const text = post.textFromEnv ? process.env[post.textFromEnv] : post.text;
  if (!text) throw new Error(`Missing post text${post.textFromEnv ? ` from ${post.textFromEnv}` : ''}.`);
  return text.replaceAll('{eventDate}', eventLabel);
}

function clearSeedUploads(type) {
  const directory = path.join(uploadRoot, type);
  fs.mkdirSync(directory, { recursive: true });
  for (const filename of fs.readdirSync(directory)) {
    if (filename.startsWith('seed-')) fs.rmSync(path.join(directory, filename), { force: true });
  }
}

function copyUpload(relativePath, type) {
  if (!relativePath) return null;
  const source = path.resolve(uploadSeedRoot, relativePath);
  if (!source.startsWith(path.resolve(uploadSeedRoot) + path.sep)) throw new Error(`Seed upload escapes shared folder: ${relativePath}`);
  if (!fs.existsSync(source)) throw new Error(`Seed upload not found: ${relativePath}`);
  const extension = path.extname(source).toLowerCase();
  if (!allowedExtensions.has(extension)) throw new Error(`Seed upload must be PNG or JPG: ${relativePath}`);
  const filename = `seed-${Date.now()}-${crypto.randomBytes(10).toString('hex')}${extension === '.jpeg' ? '.jpg' : extension}`;
  const destination = path.join(uploadRoot, type, filename);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return `/uploads/${type}/${filename}`;
}

async function tableExists(client, name) {
  const { rows } = await client.query('SELECT to_regclass($1) IS NOT NULL AS exists', [`public.${name}`]);
  return rows[0].exists;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (process.argv.includes('--if-empty')) {
      await client.query('SELECT pg_advisory_xact_lock(1279344454)');
      const { rows } = await client.query('SELECT EXISTS (SELECT 1 FROM users) AS seeded');
      if (rows[0].seeded) {
        await client.query('ROLLBACK');
        console.log('LeakedIn database already contains users; skipping initial seed.');
        return;
      }
    }

    clearSeedUploads('avatars');
    clearSeedUploads('posts');
    await client.query('TRUNCATE TABLE connections, reactions, comments, posts, users RESTART IDENTITY CASCADE');
    if (await tableExists(client, 'session')) await client.query('TRUNCATE TABLE session');

    const userIds = {};
    const publicPosts = [];
    const postingUsers = scenario.users.filter(user => user.posts.length).map(user => user.id);

    for (const user of scenario.users) {
      const { rows } = await client.query(
        `INSERT INTO users (
          name, email, password_hash, avatar_path, avatar_variant, show_email,
          headline, employer, job_title, auto_accept, seeded_user, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12) RETURNING id`,
        [user.name, user.email, hash(user.password), copyUpload(user.avatar, 'avatars'), user.avatarVariant,
          user.showEmail, user.headline, user.employer, user.jobTitle, user.autoAccept, user.seededUser,
          timestamp(-180, '09:00')]
      );
      userIds[user.id] = rows[0].id;
    }

    for (const user of scenario.users) {
      for (const post of user.posts) {
        const createdAt = timestamp(post.day, post.time);
        const { rows } = await client.query(
          `INSERT INTO posts (user_id, content, image_path, is_private, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$5) RETURNING id`,
          [userIds[user.id], textFor(post), copyUpload(post.image, 'posts'), Boolean(post.private), createdAt]
        );
        if (!post.private) publicPosts.push({ id: rows[0].id, user: user.id, at: createdAt });

        for (const comment of post.comments || []) {
          const commentAt = new Date(createdAt.getTime() + comment.minutesAfter * 60000);
          await client.query(
            `INSERT INTO comments (post_id, user_id, content, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$4)`,
            [rows[0].id, userIds[comment.user], comment.text, commentAt]
          );
        }
      }
    }

    const reactions = [1, 2, 3, 4, 5, 6, -1];
    for (let postIndex = 0; postIndex < publicPosts.length; postIndex += 1) {
      const post = publicPosts[postIndex];
      const candidates = postingUsers.filter(user => user !== post.user);
      if (!candidates.length) continue;
      const count = 1 + (postIndex % Math.min(4, candidates.length));
      for (let index = 0; index < count; index += 1) {
        const user = candidates[(postIndex + index) % candidates.length];
        await client.query(
          `INSERT INTO reactions (post_id, user_id, reaction, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$4)`,
          [post.id, userIds[user], reactions[(postIndex + index) % reactions.length], post.at]
        );
      }
    }

    for (const connection of scenario.connections) {
      const createdAt = timestamp(-connection.daysBeforeEvent, '10:00');
      await client.query(
        `INSERT INTO connections (requester_id, recipient_id, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$4)`,
        [userIds[connection.from], userIds[connection.to], connection.status, createdAt]
      );
    }

    await client.query('COMMIT');
    const postCount = scenario.users.reduce((total, user) => total + user.posts.length, 0);
    console.log(`${scenario.name} seed complete for ${eventLabel}.`);
    console.log(`Users: ${scenario.users.length}; posts: ${postCount}`);
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
