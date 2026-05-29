/**
 * Itemci Upload Engine v2
 * Production-grade mobile image upload
 * Supports: multi-select, camera, gallery, HEIC warning, client compress, progress, retry, sort, delete
 */
(function() {
  'use strict';

  const UPLOAD_API = window.location.origin + '/api/upload/images';
  const MAX_FILES = 10;
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  window.UploadEngine = function(containerId, options) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let files = [];
    let uploadQueue = [];
    const opts = Object.assign({
      token: localStorage.getItem('token') || '',
      onChange: () => {},
      maxFiles: MAX_FILES,
    }, options || {});

    function render() {
      container.innerHTML = `
        <div class="ue-wrapper">
          <div class="ue-dropzone" id="ue-dropzone-${containerId}">
            <input type="file" id="ue-input-${containerId}" multiple accept="image/*,image/heic,image/heif,.heic,.heif"
              capture="environment" style="display:none">
            <div class="ue-dropzone-inner">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <p class="ue-title">Görsel Yükle</p>
              <p class="ue-sub">Tıkla, kamerayı kullan veya sürükle</p>
              <p class="ue-hint">JPEG, PNG, WebP, HEIC • Maks 50MB</p>
              <div class="ue-actions">
                <button type="button" class="ue-btn ue-btn-primary" data-action="camera">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                  Kamera
                </button>
                <button type="button" class="ue-btn ue-btn-secondary" data-action="gallery">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  Galeri
                </button>
              </div>
            </div>
          </div>
          <div class="ue-list" id="ue-list-${containerId}"></div>
          <div class="ue-progress" id="ue-progress-${containerId}" style="display:none">
            <div class="ue-progress-track"><div class="ue-progress-bar" id="ue-bar-${containerId}"></div></div>
            <span class="ue-progress-text" id="ue-text-${containerId}">0%</span>
          </div>
        </div>
      `;

      // Inject styles if not present
      if (!document.getElementById('ue-styles')) {
        const css = document.createElement('style');
        css.id = 'ue-styles';
        css.textContent = `
          .ue-wrapper { width:100%; }
          .ue-dropzone {
            border: 2px dashed rgba(139,92,246,0.25);
            border-radius: 16px;
            background: rgba(139,92,246,0.03);
            padding: 28px 16px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
          }
          .ue-dropzone:hover, .ue-dropzone.dragover {
            border-color: rgba(139,92,246,0.6);
            background: rgba(139,92,246,0.06);
          }
          .ue-dropzone-inner svg { color: #a78bfa; margin-bottom: 10px; }
          .ue-title { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 4px; }
          .ue-sub { font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
          .ue-hint { font-size: 11px; color: #64748b; margin-bottom: 14px; }
          .ue-actions { display: flex; gap: 8px; justify-content: center; }
          .ue-btn {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 8px 14px; border-radius: 8px; border: none;
            font-size: 12px; font-weight: 600; cursor: pointer; transition: transform 0.15s;
          }
          .ue-btn:hover { transform: translateY(-1px); }
          .ue-btn-primary { background: linear-gradient(135deg,#6366f1,#a855f7); color:#fff; }
          .ue-btn-secondary { background: rgba(255,255,255,0.06); color:#e2e8f0; border:1px solid rgba(255,255,255,0.08); }
          .ue-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px,1fr)); gap: 10px; margin-top: 14px; }
          .ue-item { position: relative; border-radius: 12px; overflow: hidden; aspect-ratio: 1/1; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); }
          .ue-item img { width:100%; height:100%; object-fit: cover; }
          .ue-item-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.55); }
          .ue-item-overlay svg { color:#fff; width:20px; height:20px; animation: ueSpin 1s linear infinite; }
          @keyframes ueSpin { to { transform: rotate(360deg); } }
          .ue-item-error { position:absolute; bottom:0; left:0; right:0; padding:6px 8px; background:rgba(220,38,38,0.85); color:#fff; font-size:10px; text-align:center; }
          .ue-item-retry { position:absolute; top:4px; right:4px; width:24px; height:24px; border-radius:6px; background:rgba(0,0,0,0.6); color:#fff; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; }
          .ue-item-delete { position:absolute; top:4px; left:4px; width:24px; height:24px; border-radius:6px; background:rgba(0,0,0,0.6); color:#f43f5e; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; }
          .ue-item-order { position:absolute; bottom:4px; right:4px; background:rgba(0,0,0,0.6); color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px; }
          .ue-progress { margin-top:10px; display:flex; align-items:center; gap:10px; }
          .ue-progress-track { flex:1; height:4px; background:rgba(255,255,255,0.08); border-radius:4px; overflow:hidden; }
          .ue-progress-bar { height:100%; width:0%; background: linear-gradient(90deg,#6366f1,#a855f7); border-radius:4px; transition: width 0.2s; }
          .ue-progress-text { font-size:11px; color:#94a3b8; min-width:28px; text-align:right; }
        `;
        document.head.appendChild(css);
      }

      bindEvents();
    }

    function bindEvents() {
      const dropzone = container.querySelector('.ue-dropzone');
      const input = container.querySelector('input[type="file"]');

      dropzone.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (action === 'camera') {
          input.setAttribute('capture', 'environment');
          input.removeAttribute('multiple');
        } else if (action === 'gallery') {
          input.removeAttribute('capture');
          input.setAttribute('multiple', 'true');
        }
        input.click();
      });

      input.addEventListener('change', () => {
        if (input.files.length) handleFiles(Array.from(input.files));
        input.value = '';
      });

      // Drag-drop
      dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) handleFiles(Array.from(e.dataTransfer.files));
      });
    }

    function handleFiles(fileList) {
      const remaining = opts.maxFiles - files.length;
      const toAdd = fileList.slice(0, remaining);

      if (fileList.length > remaining) {
        showToast(`Maksimum ${opts.maxFiles} görsel yükleyebilirsiniz.`);
      }

      toAdd.forEach(file => {
        if (file.size > MAX_FILE_SIZE) {
          showToast(`${file.name} çok büyük. Maksimum 50MB.`);
          return;
        }
        const isHeic = /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
        if (isHeic) {
          showToast(`${file.name} HEIC formatı. Sunucu otomatik dönüştürecek.`, 'info');
        }
        const item = { id: genId(), file, url: null, status: 'pending', error: null, order: files.length };
        files.push(item);
      });

      renderList();
      opts.onChange(getUrls());

      // Auto-upload pending
      files.filter(f => f.status === 'pending').forEach(uploadFile);
    }

    async function uploadFile(item) {
      item.status = 'uploading';
      item.error = null;
      renderList();
      updateProgress();

      let blob = item.file;
      // Client compress for large images
      if (item.file.size > 5 * 1024 * 1024) {
        try {
          blob = await compressImage(item.file, 1920, 0.85);
        } catch (e) { /* fallback to original */ }
      }

      const formData = new FormData();
      formData.append('images', blob, item.file.name.replace(/\.heic$/i, '.jpg'));

      const xhr = new XMLHttpRequest();
      xhr.open('POST', UPLOAD_API, true);
      xhr.setRequestHeader('Authorization', 'Bearer ' + opts.token);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          item.progress = Math.round((e.loaded / e.total) * 100);
          updateProgress();
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            if (res.success && res.images && res.images[0]) {
              item.status = 'done';
              item.url = res.images[0].url;
              item.progress = 100;
            } else {
              item.status = 'error';
              item.error = res.error || 'Yükleme başarısız';
            }
          } catch (e) {
            item.status = 'error';
            item.error = 'Sunucu yanıtı geçersiz';
          }
        } else {
          item.status = 'error';
          try {
            const res = JSON.parse(xhr.responseText);
            item.error = res.error || 'Yükleme başarısız';
          } catch (e) { item.error = 'Yükleme başarısız'; }
        }
        renderList();
        updateProgress();
        opts.onChange(getUrls());
      });

      xhr.addEventListener('error', () => {
        item.status = 'error';
        item.error = 'Bağlantı hatası';
        renderList();
        updateProgress();
        opts.onChange(getUrls());
      });

      xhr.addEventListener('timeout', () => {
        item.status = 'error';
        item.error = 'Zaman aşımı';
        renderList();
        updateProgress();
        opts.onChange(getUrls());
      });

      xhr.timeout = 120000; // 2 minutes for large files
      xhr.send(formData);
    }

    function compressImage(file, maxWidth, quality) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject();
          }, 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(); };
        img.src = url;
      });
    }

    function renderList() {
      const list = container.querySelector('.ue-list');
      if (!list) return;
      list.innerHTML = files.map((item, idx) => {
        const previewUrl = item.url || URL.createObjectURL(item.file);
        const isUploading = item.status === 'uploading';
        const isError = item.status === 'error';
        return `
          <div class="ue-item" data-id="${item.id}">
            <img src="${previewUrl}" alt="" loading="lazy" onerror="this.style.display='none'">
            ${isUploading ? `<div class="ue-item-overlay"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.22-8.56"/></svg></div>` : ''}
            ${isError ? `<div class="ue-item-error" title="${escapeHtml(item.error || '')}">Hata</div><button class="ue-item-retry" data-retry="${item.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg></button>` : ''}
            <button class="ue-item-delete" data-delete="${item.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            <div class="ue-item-order">${idx + 1}</div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.ue-item-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.delete;
          files = files.filter(f => f.id !== id);
          renderList();
          opts.onChange(getUrls());
        });
      });

      list.querySelectorAll('.ue-item-retry').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.retry;
          const item = files.find(f => f.id === id);
          if (item) uploadFile(item);
        });
      });
    }

    function updateProgress() {
      const uploading = files.filter(f => f.status === 'uploading');
      const progressEl = container.querySelector('.ue-progress');
      if (!uploading.length) { progressEl.style.display = 'none'; return; }
      progressEl.style.display = 'flex';
      const totalProgress = uploading.reduce((s, f) => s + (f.progress || 0), 0) / uploading.length;
      const bar = container.querySelector('.ue-progress-bar');
      const text = container.querySelector('.ue-progress-text');
      if (bar) bar.style.width = totalProgress + '%';
      if (text) text.textContent = Math.round(totalProgress) + '%';
    }

    function getUrls() {
      return files.filter(f => f.status === 'done' && f.url).map(f => f.url);
    }

    function genId() { return Math.random().toString(36).slice(2) + Date.now().toString(36); }
    function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
    function showToast(msg, type) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({ toast: true, position: 'top-end', icon: type || 'warning', title: msg, showConfirmButton: false, timer: 3000 });
      } else {
        alert(msg);
      }
    }

    render();

    return {
      getUrls,
      getFiles: () => files,
      reset: () => { files = []; renderList(); opts.onChange([]); },
    };
  };
})();
