(() => {
  const openComposer = document.getElementById('openComposer');
  const composerForm = document.getElementById('composerForm');
  if (openComposer && composerForm) {
    openComposer.addEventListener('click', () => composerForm.classList.toggle('hidden'));
  }

  const reactionNames = { 1: 'Like', 2: 'Celebrate', 3: 'Support', 4: 'Love', 5: 'Insightful', 6: 'Funny', '-1': 'Dislike' };
  const reactionEmoji = { 1: '👍', 2: '🎉', 3: '🤝', 4: '❤️', 5: '💡', 6: '😄', '-1': '👎' };

  document.addEventListener('click', async event => {
    const option = event.target.closest('.reaction-option');
    const main = event.target.closest('.reaction-main');
    const editComment = event.target.closest('.edit-comment-button');
    const cancelEdit = event.target.closest('.cancel-comment-edit');
    const contact = event.target.closest('.contact-button');

    if (option || main) {
      event.preventDefault();
      const button = option || main;
      const card = button.closest('[data-post-id]');
      const reaction = Number(button.dataset.reaction || 1);
      const response = await fetch(`/posts/${card.dataset.postId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction })
      });
      if (response.ok) location.reload();
      return;
    }

    if (editComment) {
      const comment = editComment.closest('[data-comment-id]');
      comment.querySelector('.comment-content').classList.add('hidden');
      comment.querySelector('.comment-edit-form').classList.remove('hidden');
      comment.querySelector('textarea').focus();
      return;
    }

    if (cancelEdit) {
      const comment = cancelEdit.closest('[data-comment-id]');
      comment.querySelector('.comment-content').classList.remove('hidden');
      comment.querySelector('.comment-edit-form').classList.add('hidden');
      return;
    }

    if (contact) {
      const box = document.getElementById('contactEmail');
      box.textContent = contact.dataset.email;
      box.classList.remove('hidden');
    }
  });

  const feed = document.getElementById('feed');
  const status = document.getElementById('feedStatus');
  if (!feed || !status) return;

  let cursor = null;
  let loading = false;
  let done = false;
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const icon = name => `<svg><use href="/static/img/icons.svg#${name}"></use></svg>`;
  const avatar = user => user.avatar_path || `/static/img/default-avatar-${Number(user.avatar_variant || 0) % 5}.svg`;

  function commentPreview(comment) {
    return `<div class="comment compact-comment">
      <img class="avatar small" src="${escapeHtml(avatar(comment))}" alt="${escapeHtml(comment.name)}">
      <div class="comment-bubble"><a href="/profile/${comment.user_id}"><strong>${escapeHtml(comment.name)}</strong></a><p>${escapeHtml(comment.content)}</p></div>
    </div>`;
  }

  function postCard(post) {
    const subtitle = [post.job_title, post.employer].filter(Boolean).join(' at ') || 'LeakedIn member';
    const currentReaction = Number(post.my_reaction || 0);
    const previews = Array.isArray(post.preview_comments) ? post.preview_comments : [];
    const picker = [[1,'👍','Like'],[2,'🎉','Celebrate'],[3,'🤝','Support'],[4,'❤️','Love'],[5,'💡','Insightful'],[6,'😄','Funny'],[-1,'👎','Dislike']]
      .map(([value, emoji, label]) => `<button class="reaction-option" data-reaction="${value}" title="${label}" aria-label="${label}">${emoji}</button>`).join('');

    return `<article class="post-card" data-post-id="${post.id}">
      <div class="post-head">
        <a href="/profile/${post.user_id}"><img class="avatar medium" src="${escapeHtml(avatar(post))}" alt="${escapeHtml(post.name)}"></a>
        <div class="post-author"><a class="user-name" href="/profile/${post.user_id}">${escapeHtml(post.name)}</a><div class="subline">${escapeHtml(subtitle)}</div><div class="timestamp">${new Date(post.created_at).toLocaleString()}</div></div>
      </div>
      ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
      ${post.image_path ? `<img class="post-image" src="${escapeHtml(post.image_path)}" alt="Post image">` : ''}
      <div class="post-meta"><div class="reaction-summary">${post.reaction_count ? `<span class="mini-reactions">${(post.reaction_types || []).slice(0,3).map(value => reactionEmoji[value]).join(' ')}</span><span>${post.reaction_count}</span>` : ''}</div><a href="/posts/${post.id}">${post.comment_count} comments</a></div>
      <div class="post-actions">
        <div class="reaction-control"><button class="action-button reaction-main ${currentReaction ? 'active' : ''}" data-reaction="${currentReaction || 1}"><span class="reaction-main-emoji">${reactionEmoji[currentReaction] || '👍'}</span><span class="action-label">${reactionNames[currentReaction] || 'Like'}</span></button><div class="reaction-picker">${picker}</div></div>
        <a class="action-button" href="/posts/${post.id}#comments">${icon('comment')}<span class="action-label">Comment</span></a>
      </div>
      ${previews.length ? `<div class="comment-preview-list">${previews.map(commentPreview).join('')}${post.comment_count > previews.length ? `<a class="view-more-comments" href="/posts/${post.id}#comments">View all comments</a>` : ''}</div>` : ''}
      <form class="inline-comment-form" action="/posts/${post.id}/comments" method="post"><img class="avatar small" src="${escapeHtml(window.currentUserAvatar || '/static/img/default-avatar-0.svg')}" alt="You"><div class="inline-comment-input"><input name="content" placeholder="Add a comment…" required><button class="icon-button" title="Post comment" aria-label="Post comment">${icon('send')}</button></div></form>
    </article>`;
  }

  async function load() {
    if (loading || done) return;
    loading = true;
    status.textContent = 'Loading posts…';
    const query = cursor ? `?before=${encodeURIComponent(cursor.before)}&beforeId=${encodeURIComponent(cursor.beforeId)}` : '';
    const response = await fetch('/api/feed' + query);
    if (!response.ok) {
      status.textContent = 'Could not load posts.';
      loading = false;
      return;
    }
    const data = await response.json();
    data.posts.forEach(post => feed.insertAdjacentHTML('beforeend', postCard(post)));
    cursor = data.nextCursor;
    done = !cursor;
    status.textContent = done ? 'You have reached the end.' : 'Loading more…';
    loading = false;
  }

  const observer = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) load();
  }, { rootMargin: '500px' });
  observer.observe(status);
  load();
})();
