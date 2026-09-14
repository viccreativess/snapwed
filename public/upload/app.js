(() => {
  const eventId = location.pathname.split('/').filter(Boolean)[1];
  if (!eventId) {
    showError('No event ID found in URL.');
    return;
  }

  let selectedFiles = [];
  let eventInfo = null;

  const screens = {
    loading: document.getElementById('loading-screen'),
    upload: document.getElementById('upload-screen'),
    success: document.getElementById('success-screen'),
    error: document.getElementById('error-screen'),
  };

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  function showError(msg) {
    document.getElementById('error-msg').textContent = msg;
    showScreen('error');
  }

  // ─── Load Event Info ──────────────────────────────────────────────────────
  async function loadEvent() {
    try {
      const res = await fetch(`/api/upload/${eventId}/info`);
      if (!res.ok) throw new Error('Event not found');
      eventInfo = await res.json();

      document.getElementById('couple-names').textContent = eventInfo.coupleNames;
      document.getElementById('welcome-msg').textContent = eventInfo.welcomeMessage || 'Share your photos! 📸';
      document.title = `Share Photos — ${eventInfo.coupleNames} Wedding`;

      // Apply accent color
      if (eventInfo.coverColor) {
        document.documentElement.style.setProperty('--rose', eventInfo.coverColor);
      }

      showScreen('upload');
    } catch (err) {
      showError(err.message || 'Could not load event. Please check the URL.');
    }
  }

  // ─── File Handling ────────────────────────────────────────────────────────
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const previewGrid = document.getElementById('preview-grid');
  const uploadBtn = document.getElementById('upload-btn');
  const btnText = document.getElementById('btn-text');
  const btnSpinner = document.getElementById('btn-spinner');

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    addFiles([...e.dataTransfer.files]);
  });

  fileInput.addEventListener('change', () => {
    addFiles([...fileInput.files]);
    fileInput.value = '';
  });

  function addFiles(newFiles) {
    const imageFiles = newFiles.filter((f) => f.type.startsWith('image/'));
    selectedFiles = [...selectedFiles, ...imageFiles].slice(0, 20);
    renderPreviews();
    updateBtn();
  }

  function renderPreviews() {
    previewGrid.innerHTML = '';
    if (selectedFiles.length === 0) {
      previewGrid.classList.add('hidden');
      return;
    }
    previewGrid.classList.remove('hidden');
    selectedFiles.forEach((file, idx) => {
      const item = document.createElement('div');
      item.className = 'preview-item';
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      const btn = document.createElement('button');
      btn.className = 'preview-remove';
      btn.innerHTML = '✕';
      btn.setAttribute('aria-label', 'Remove photo');
      btn.onclick = (e) => { e.stopPropagation(); removeFile(idx); };
      item.appendChild(img);
      item.appendChild(btn);
      previewGrid.appendChild(item);
    });
  }

  function removeFile(idx) {
    selectedFiles.splice(idx, 1);
    renderPreviews();
    updateBtn();
  }

  function updateBtn() {
    if (selectedFiles.length === 0) {
      uploadBtn.disabled = true;
      btnText.textContent = 'Select photos first';
    } else {
      uploadBtn.disabled = false;
      btnText.textContent = `Upload ${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''}`;
    }
  }

  // ─── Upload ───────────────────────────────────────────────────────────────
  uploadBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    const guestName = document.getElementById('guest-name').value.trim();
    const message = document.getElementById('guest-message').value.trim();

    uploadBtn.disabled = true;
    btnText.textContent = 'Uploading…';
    btnSpinner.classList.remove('hidden');

    // Add progress bar
    let progressWrap = document.querySelector('.progress-wrap');
    if (!progressWrap) {
      progressWrap = document.createElement('div');
      progressWrap.className = 'progress-wrap';
      const bar = document.createElement('div');
      bar.className = 'progress-bar';
      progressWrap.appendChild(bar);
      uploadBtn.insertAdjacentElement('afterend', progressWrap);
    }
    const progressBar = progressWrap.querySelector('.progress-bar');
    progressBar.style.width = '10%';

    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append('photos', f));
      if (guestName) formData.append('guestName', guestName);
      if (message) formData.append('message', message);

      // Simulate progress while XHR uploads
      let progress = 10;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 8, 85);
        progressBar.style.width = `${progress}%`;
      }, 300);

      const res = await fetch(`/api/upload/${eventId}`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      progressBar.style.width = '100%';

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      const count = data.uploaded;

      // Populate success screen
      const successSub = document.getElementById('success-sub');
      successSub.textContent = `${count} photo${count > 1 ? 's' : ''} uploaded for ${eventInfo.coupleNames}. Thank you! 💕`;

      const viewLink = document.getElementById('view-gallery-link');
      viewLink.href = `/gallery/${eventId}`;

      document.getElementById('upload-more-btn').addEventListener('click', () => {
        selectedFiles = [];
        renderPreviews();
        updateBtn();
        document.getElementById('guest-name').value = '';
        document.getElementById('guest-message').value = '';
        if (progressWrap) progressWrap.remove();
        showScreen('upload');
      });

      setTimeout(() => showScreen('success'), 500);
    } catch (err) {
      progressBar.style.width = '0%';
      btnSpinner.classList.add('hidden');
      btnText.textContent = `Upload ${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''}`;
      uploadBtn.disabled = false;
      alert('Upload failed: ' + err.message);
    }
  });

  loadEvent();
})();
