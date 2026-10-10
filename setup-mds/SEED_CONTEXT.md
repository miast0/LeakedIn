# LeakedIn Seed Generation Reference

Use this file alongside the supplied persona definitions to create or replace:

```text
scripts/seed.js
```

The seed script is the source for all challenge users, posts, comments, reactions and cosmetic connections.

## Users

Primary users should be objects like:

```js
{
	key: 'john-target',
	name: 'John Smith',
	email: 'jsmith@example.com',
	password: 'ExamplePassword',
	headline: 'Marketing Director at Example Corp',
	employer: 'Example Corp',
	jobTitle: 'Marketing Director',
	showEmail: true,
	avatarVariant: 0
}
```

`key` is an internal identifier used by posts/comments. Passwords are written plaintext in the seed file and SHA-256 hashed before database insertion.

Seeded accounts should normally receive:

```js
autoAccept: true,
seeded: true
```

These map to the hidden `auto_accept` and `seeded_user` database fields.

Background/search-only users can be created in bulk and do not need posts or interactions.

## Posts

Posts use:

```js
{
	key: 'john-post-1',
	user: 'john-target',
	at: daysAgo(20, 14, 30),
	content: 'Post content.'
}
```

For recent posts use:

```js
at: minutesAgo(30)
```

A private post simply adds:

```js
private: true
```

For users with many posts, create a separate timeline array and merge it into `posts`.

When generating persona content:

* Preserve the persona's defined facts.
* Create realistic professional filler where needed.
* Spread posts across believable dates.
* Do not make every post challenge-relevant.
* Keep each user's tone and posting habits distinct.
* Place important clues naturally among normal posts.

## Comments

Comments reference post and user keys:

```js
{
	post: 'john-post-1',
	user: 'alice',
	at: daysAgo(19, 10, 0),
	content: 'Great work.'
}
```

## Reactions and Connections

Reactions can be generated automatically from the main posting users to make the feed look active.

Connections are cosmetic only and do not affect post visibility.

## Seed Flow

The script should:

```text
1. Begin transaction
2. Truncate users/posts/comments/reactions/connections
3. Clear existing sessions
4. Insert users and record their database IDs
5. Insert posts and record their database IDs
6. Insert comments
7. Insert reactions
8. Insert connections
9. Commit
```

The supplied personas define the content and identities. This document only defines how that information should be converted into LeakedIn seed data.

Keep the resulting `seed.js` simple and directly editable. Do not add unnecessary abstractions.

