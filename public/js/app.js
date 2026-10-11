(() => {
  const profileMenu = document.querySelector('.nav-profile-menu');
  if (profileMenu) {
    document.addEventListener('click', event => {
      if (profileMenu.open && !profileMenu.contains(event.target)) profileMenu.removeAttribute('open');
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') profileMenu.removeAttribute('open');
    });
  }

  const notificationBadge = document.getElementById('notificationBadge');
  if (notificationBadge) {
    let lastUnread = Number(notificationBadge.textContent.replace('+', '')) || 0;
    const updateNotificationBadge = unread => {
      notificationBadge.textContent = unread > 99 ? '99+' : String(unread);
      notificationBadge.setAttribute('aria-label', `${unread} unread notifications`);
      notificationBadge.classList.toggle('hidden', unread === 0);
      if (unread > lastUnread) notificationBadge.classList.add('notification-badge-pulse');
      setTimeout(() => notificationBadge.classList.remove('notification-badge-pulse'), 500);
      lastUnread = unread;
    };
    const notificationStream = new EventSource('/api/notifications/stream');
    notificationStream.onmessage = event => updateNotificationBadge(Number(JSON.parse(event.data).unread) || 0);
  }

  const openComposer = document.getElementById('openComposer');
  const composerModal = document.getElementById('composerModal');
  const composerForm = document.getElementById('composerForm');
  const composerTitle = document.getElementById('composerTitle');
  const composerText = document.getElementById('composerText');
  const composerMedia = document.getElementById('composerMedia');
  const selectedMedia = document.getElementById('selectedMedia');
  const closeComposer = document.getElementById('closeComposer');
  if (openComposer && composerModal && composerForm) {
    let selectedMediaUrl = null;
    const clearSelectedMedia = () => {
      if (selectedMediaUrl) URL.revokeObjectURL(selectedMediaUrl);
      selectedMediaUrl = null;
      composerMedia.value = '';
      selectedMedia.replaceChildren();
      selectedMedia.classList.add('hidden');
    };
    const showComposer = (title = 'Create a post') => {
      composerTitle.textContent = title;
      composerModal.classList.remove('hidden');
      document.body.classList.add('modal-open');
      composerText.focus();
    };
    const hideComposer = () => {
      composerModal.classList.add('hidden');
      document.body.classList.remove('modal-open');
    };

    openComposer.addEventListener('click', () => {
      clearSelectedMedia();
      showComposer('Create a post');
    });
    document.querySelectorAll('[data-open-composer]').forEach(button => {
      button.addEventListener('click', () => {
        clearSelectedMedia();
        showComposer(button.dataset.composerTitle || 'Create a post');
      });
    });
    document.querySelectorAll('[data-composer-mode]').forEach(button => {
      button.addEventListener('click', () => {
        const video = button.dataset.composerMode === 'video';
        composerMedia.accept = video ? 'video/mp4,video/webm,video/quicktime' : 'image/png,image/jpeg';
        composerMedia.value = '';
        composerMedia.click();
      });
    });
    composerMedia.addEventListener('change', () => {
      if (!composerMedia.files.length) return;
      const file = composerMedia.files[0];
      if (selectedMediaUrl) URL.revokeObjectURL(selectedMediaUrl);
      selectedMediaUrl = URL.createObjectURL(file);
      const preview = document.createElement(file.type.startsWith('video/') ? 'video' : 'img');
      preview.src = selectedMediaUrl;
      if (preview.tagName === 'VIDEO') preview.controls = true;
      const name = document.createElement('span');
      name.textContent = file.name;
      selectedMedia.replaceChildren(preview, name);
      selectedMedia.classList.remove('hidden');
      showComposer(file.type.startsWith('video/') ? 'Create a video post' : 'Create a photo post');
    });
    closeComposer.addEventListener('click', hideComposer);
    composerModal.addEventListener('click', event => {
      if (event.target === composerModal) hideComposer();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !composerModal.classList.contains('hidden')) hideComposer();
    });
    composerForm.addEventListener('submit', async event => {
      event.preventDefault();
      const button = event.submitter;
      if (button) button.disabled = true;
      try {
        const response = await fetch(composerForm.action, {
          method: 'POST',
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
          body: new FormData(composerForm)
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'The post could not be created.');
        document.getElementById('feed')?.insertAdjacentHTML('afterbegin', postCard(data.post));
        composerForm.reset();
        clearSelectedMedia();
        hideComposer();
      } catch (error) {
        showAsyncMessage(error.message, true);
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  const reactionNames = { 1: 'Like', 2: 'Celebrate', 3: 'Support', 4: 'Love', 5: 'Insightful', 6: 'Funny' };
  const reactionEmoji = { 1: '👍', 2: '🎉', 3: '🤝', 4: '❤️', 5: '💡', 6: '😄' };
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const icon = name => `<svg><use href="/static/img/icons.svg#${name}"></use></svg>`;
  const avatar = user => user.avatar_path || `/static/img/default-avatar-${Number(user.avatar_variant || 0) % 5}.svg`;

  function showAsyncMessage(message, error = false) {
    let notice = document.getElementById('asyncNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'asyncNotice';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');
      document.body.appendChild(notice);
    }
    notice.textContent = message;
    notice.className = `async-notice ${error ? 'error' : 'success'}`;
    clearTimeout(showAsyncMessage.timer);
    showAsyncMessage.timer = setTimeout(() => notice.classList.add('hidden'), 3000);
  }

  function updatePostCounts(card, data) {
    if (!card) return;
    if (Number.isInteger(data.count)) {
      const count = card.querySelector('[data-comment-count]');
      if (count) count.textContent = `${data.count} comment${data.count === 1 ? '' : 's'}`;
    }
  }

  function updateReaction(card, data) {
    const current = Number(data.reaction || 0);
    const main = card.querySelector('.reaction-main');
    main.dataset.reaction = current || 1;
    main.classList.toggle('active', Boolean(current));
    main.querySelector('.reaction-main-emoji').innerHTML = current ? reactionEmoji[current] : icon('like');
    main.querySelector('.action-label').textContent = reactionNames[current] || 'Like';
    const summary = card.querySelector('[data-reaction-summary]');
    const types = Array.isArray(data.types) ? data.types.map(Number) : [];
    summary.innerHTML = data.count ? `<span class="mini-reactions">${types.slice(0, 3).map(value => reactionEmoji[value]).join(' ')}</span><span>${data.count}</span>` : '';
  }

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
      button.disabled = true;
      try {
        const response = await fetch(`/posts/${card.dataset.postId}/reaction`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ reaction })
        });
        if (!response.ok) throw new Error('Could not update the reaction.');
        updateReaction(card, await response.json());
      } catch (error) {
        showAsyncMessage(error.message, true);
      } finally {
        button.disabled = false;
      }
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

  function commentMarkup(comment) {
    const controls = comment.editable ? `<div class="comment-actions">
      <button class="icon-button edit-comment-button" title="Edit comment" aria-label="Edit comment">${icon('edit')}</button>
      <form class="async-comment-delete" method="post" action="/comments/${comment.id}/delete" data-confirm="Delete this comment?">
        <button class="icon-button danger" title="Delete comment" aria-label="Delete comment">${icon('delete')}</button>
      </form></div>` : '';
    const editForm = comment.editable ? `<form class="comment-edit-form hidden" method="post" action="/comments/${comment.id}/edit">
      <textarea name="content" rows="3" required>${escapeHtml(comment.content)}</textarea>
      <div class="edit-form-actions"><button type="button" class="secondary cancel-comment-edit">Cancel</button><button class="primary">Save</button></div>
    </form>` : '';
    return `<div class="comment" data-comment-id="${comment.id}">
      <img class="avatar small" src="${escapeHtml(avatar(comment))}" alt="${escapeHtml(comment.name)}">
      <div class="comment-bubble"><div class="comment-heading"><div><a href="/profile/${comment.user_id}"><strong>${escapeHtml(comment.name)}</strong></a><span class="timestamp">Just now</span></div>${controls}</div>
      <p class="comment-content">${escapeHtml(comment.content)}</p>${editForm}</div></div>`;
  }

  document.addEventListener('submit', async event => {
    const form = event.target;
    const isCommentCreate = form.matches('.async-comment-form');
    const isCommentEdit = form.matches('.comment-edit-form');
    const isCommentDelete = form.matches('.async-comment-delete');
    const isConnection = form.matches('.async-connection-form');
    const isPostDelete = form.matches('.async-post-delete');
    if (!isCommentCreate && !isCommentEdit && !isCommentDelete && !isConnection && !isPostDelete) return;
    event.preventDefault();
    if (form.dataset.confirm && !window.confirm(form.dataset.confirm)) return;
    const submitter = event.submitter;
    if (submitter) submitter.disabled = true;
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(form))
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The action could not be completed.');

      if (isCommentCreate) {
        const card = form.closest('[data-post-id]');
        updatePostCounts(card, data);
        const list = document.querySelector('[data-comments-list]');
        if (list) list.insertAdjacentHTML('beforeend', commentMarkup(data.comment));
        form.reset();
      } else if (isCommentEdit) {
        const comment = form.closest('[data-comment-id]');
        comment.querySelector('.comment-content').textContent = data.content;
        comment.querySelector('.comment-content').classList.remove('hidden');
        form.classList.add('hidden');
      } else if (isCommentDelete) {
        const comment = form.closest('[data-comment-id]');
        const card = document.querySelector('[data-post-id]');
        comment.remove();
        updatePostCounts(card, data);
      } else if (isPostDelete) {
        form.closest('[data-post-id]')?.remove();
      } else if (form.dataset.removeRow !== undefined) {
        form.closest('[data-connection-row]')?.remove();
      } else if (data.status === 'pending' || data.status === 'existing') {
        const pending = document.createElement('button');
        pending.className = 'secondary';
        pending.disabled = true;
        pending.textContent = 'Pending';
        form.replaceWith(pending);
      } else if (data.status === 'accepted') {
        form.action = form.action.replace(/\/request$/, '/remove');
        submitter.className = 'secondary';
        submitter.textContent = 'Remove connection';
        const count = document.querySelector('[data-connection-count]');
        if (count) {
          const value = Number(count.dataset.connectionCount) + 1;
          count.dataset.connectionCount = value;
          count.textContent = `${value} connection${value === 1 ? '' : 's'}`;
        }
      } else if (data.status === 'none') {
        form.action = form.action.replace(/\/remove$/, '/request');
        submitter.className = 'primary';
        submitter.textContent = 'Connect';
        const count = document.querySelector('[data-connection-count]');
        if (count) {
          const value = Math.max(0, Number(count.dataset.connectionCount) - 1);
          count.dataset.connectionCount = value;
          count.textContent = `${value} connection${value === 1 ? '' : 's'}`;
        }
      }
    } catch (error) {
      showAsyncMessage(error.message, true);
    } finally {
      if (submitter && submitter.isConnected) submitter.disabled = false;
    }
  });

  const feed = document.getElementById('feed');
  const status = document.getElementById('feedStatus');
  if (!feed || !status) return;

  let cursor = null;
  let loading = false;
  let done = false;
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
    const picker = [[1,'👍','Like'],[2,'🎉','Celebrate'],[3,'🤝','Support'],[4,'❤️','Love'],[5,'💡','Insightful'],[6,'😄','Funny']]
      .map(([value, emoji, label]) => `<button class="reaction-option" data-reaction="${value}" title="${label}" aria-label="${label}">${emoji}</button>`).join('');

    return `<article class="post-card" data-post-id="${post.id}">
      <div class="post-head">
        <a href="/profile/${post.user_id}"><img class="avatar medium" src="${escapeHtml(avatar(post))}" alt="${escapeHtml(post.name)}"></a>
        <div class="post-author"><a class="user-name" href="/profile/${post.user_id}">${escapeHtml(post.name)}</a><div class="subline">${escapeHtml(subtitle)}</div><div class="timestamp">${new Date(post.created_at).toLocaleString()}</div></div>
      </div>
      ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
      ${post.image_path ? (/\.(mp4|webm)$/i.test(post.image_path) ? `<video class="post-image" src="${escapeHtml(post.image_path)}" controls preload="metadata"></video>` : `<img class="post-image" src="${escapeHtml(post.image_path)}" alt="Post image">`) : ''}
      <div class="post-meta"><div class="reaction-summary" data-reaction-summary>${post.reaction_count ? `<span class="mini-reactions">${(post.reaction_types || []).slice(0,3).map(value => reactionEmoji[value]).join(' ')}</span><span>${post.reaction_count}</span>` : ''}</div><a href="/posts/${post.id}" data-comment-count>${post.comment_count} comments</a></div>
      <div class="post-actions linkedin-actions">
        <div class="reaction-control"><button class="action-button reaction-main ${currentReaction ? 'active' : ''}" data-reaction="${currentReaction || 1}"><span class="reaction-main-emoji">${currentReaction ? reactionEmoji[currentReaction] : icon('like')}</span><span class="action-label">${reactionNames[currentReaction] || 'Like'}</span></button><div class="reaction-picker">${picker}</div></div>
        <a class="action-button" href="/posts/${post.id}#comments">${icon('comment')}<span class="action-label">Comment</span></a>
        <button class="action-button" type="button">${icon('repost')}<span class="action-label">Repost</span></button>
        <button class="action-button" type="button">${icon('send')}<span class="action-label">Send</span></button>
      </div>
      ${previews.length ? `<div class="comment-preview-list">${previews.map(commentPreview).join('')}${post.comment_count > previews.length ? `<a class="view-more-comments" href="/posts/${post.id}#comments">View all comments</a>` : ''}</div>` : ''}
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
