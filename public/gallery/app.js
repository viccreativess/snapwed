(() => {
  const eventId = location.pathname.split('/').filter(Boolean)[1];
  if (!eventId) return;

  let photos = [];
  let currentIdx = 0;

  // ─── Lightbox ─────────────────────────────────────────────────────────────
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lb-img');
  const lbCounter = document.getElementById('lb-counter');
  const lbDownload = document.getElementById('lb-download');

  function openLightbox(idx) {
    currentIdx = idx;
    updateLightbox();
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function updateLightbox() {
    const photo = photos[currentIdx];
    lbImg.src = photo.url;
    lbImg.alt = photo.name;
    lbCounter.textContent = `${currentIdx + 1} / ${photos.length}`;
    lbDownload.href = photo.downloadUrl || photo.url;
    lbDownload.download = photo.name;
  }

  document.getElementById('lb-close').addEventListener('click', closeLightbox);
  document.getElementById('lb-prev').addEventListener('click', () => {
    currentIdx = (currentIdx - 1 + photos.length) % photos.length;
    updateLightbox();
  });
  document.getElementById('lb-next').addEventListener('click', () => {
    currentIdx = (currentIdx + 1) % photos.length;
    updateLightbox();
  });
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (lightbox.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') { currentIdx = (currentIdx - 1 + photos.length) % photos.length; updateLightbox(); }
    if (e.key === 'ArrowRight') { currentIdx = (currentIdx + 1) % photos.length; updateLightbox(); }
  });

  // ─── Swipe Support ────────────────────────────────────────────────────────
  let touchStartX = 0;
  lightbox.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) currentIdx = (currentIdx + 1) % photos.length;
      else currentIdx = (currentIdx - 1 + photos.length) % photos.length;
      updateLightbox();
    }
  }, { passive: true });

  // ─── Gallery Render ───────────────────────────────────────────────────────
  async function loadGallery() {
    try {
      const res = await fetch(`/api/gallery/${eventId}`);
      if (!res.ok) throw new Error('Failed to load gallery');
      const data = await res.json();
      photos = data.photos || [];

      // Update header
      if (data.event) {
        document.getElementById('couple-names').textContent = data.event.coupleNames;
        document.title = `${data.event.coupleNames} — Wedding Gallery`;
      }
      document.getElementById('upload-link').href = `/upload/${eventId}`;
      document.getElementById('empty-upload-link').href = `/upload/${eventId}`;

      const countEl = document.getElementById('photo-count');
      const loadingEl = document.getElementById('loading');
      const emptyEl = document.getElementById('gallery-empty');
      const grid = document.getElementById('masonry-grid');

      loadingEl.style.display = 'none';

      // Build guestbook map: photoId → guestName
      const guestMap = {};
      (data.guestbook || []).forEach((entry) => {
        (entry.photoIds || []).forEach((id) => {
          guestMap[id] = entry.guestName;
        });
      });

      if (photos.length === 0) {
        emptyEl.classList.remove('hidden');
        countEl.textContent = 'No photos yet';
        return;
      }

      countEl.textContent = `${photos.length} photo${photos.length !== 1 ? 's' : ''} shared`;

      photos.forEach((photo, idx) => {
        const item = document.createElement('div');
        item.className = 'masonry-item';
        item.style.animationDelay = `${(idx % 20) * 40}ms`;

        const img = document.createElement('img');
        img.alt = photo.name || 'Wedding photo';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.src = photo.thumbnail || photo.url;
        img.onerror = () => { img.src = photo.url; };

        const overlay = document.createElement('div');
        overlay.className = 'masonry-overlay';
        const name = guestMap[photo.id];
        if (name) {
          const span = document.createElement('span');
          span.className = 'overlay-name';
          span.textContent = name;
          overlay.appendChild(span);
        }

        item.appendChild(img);
        item.appendChild(overlay);
        item.addEventListener('click', () => openLightbox(idx));
        grid.appendChild(item);
      });
    } catch (err) {
      console.error(err);
      document.getElementById('loading').innerHTML = '<p style="color:#c2527a;text-align:center;padding:40px">Could not load gallery.</p>';
    }
  }

  loadGallery();

  // Auto-refresh every 30 seconds
  setInterval(loadGallery, 30000);
})();
