# LeakedIn

## Run

```bash
docker compose up --build -d
```

This will launch the site with no content, you can seed the site with:
`docker compose exec app npm run seed`
The seed script will wipe the database and replace it with the seeded users and posts.

Open `http://localhost:3000`.

## Seed data
Content is configured in:

- `seed-data/users.js`
- `seed-data/posts.js`
- `seed-data/comments.js`
- `seed-data/connections.js`

Optional avatar files go under `seed-data/assets/avatars/` and are referenced from a user as:

```js
avatar: 'avatars/john-smith.jpg'
```

Optional post images go under `seed-data/assets/posts/` and are referenced from a post as:

```js
image: 'posts/itcon-booth.jpg'
```

During seeding, files are copied into the normal upload directories and renamed to `seed-<timestamp>-<random>.<ext>`. The generated upload path is stored in PostgreSQL.

The script reads `ITCON26_DATE` and `CTF_FLAG` from the environment. If `ITCON26_DATE` is empty, today's local date is used.

### Hidden database controls

`users.auto_accept`
: Automatically accepts incoming connection requests. It is not exposed by the application UI.

`users.seeded_user`
: Prevents normal application routes from editing the profile or editing/deleting that user's posts and comments. It is not exposed by the UI. Direct database changes and the seed script still work.

