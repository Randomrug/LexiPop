const PDFViewer = (() => {
  const elements = {
    fileInput: document.getElementById('file-input'),
    openPdf: document.getElementById('open-pdf'),
    zoomIn: document.getElementById('zoom-in'),
    zoomOut: document.getElementById('zoom-out'),
    zoomReset: document.getElementById('zoom-reset'),
    zoomPercent: document.getElementById('zoom-percent'),
    singleMode: document.getElementById('single-mode'),
    scrollMode: document.getElementById('scroll-mode'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),
    pageNum: document.getElementById('page-num'),
    pageCount: document.getElementById('page-count'),
    pdfContainer: document.getElementById('pdf-container'),
    pdfViewerContainer: document.getElementById('pdf-viewer-container'),
    loadingOverlay: document.getElementById('loading-overlay')
  };

  const state = {
    pdf: null,
    currentPage: 1,
    totalPages: 0,
    scale: 1.3,
    viewMode: 'single',
    isRendering: false
  };

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

  return {
    init: function() {
      this._setupEventListeners();
      this._updateUI();
    },

    _setupEventListeners: function() {
      elements.openPdf.addEventListener('click', () => elements.fileInput.click());
      elements.fileInput.addEventListener('change', (e) => this._handleFileSelect(e));

      elements.zoomIn.addEventListener('click', () => this._zoom(0.1));
      elements.zoomOut.addEventListener('click', () => this._zoom(-0.1));
      elements.zoomReset.addEventListener('click', () => this._fitWidth());

      elements.singleMode.addEventListener('click', () => {
        console.log('Single mode clicked');
        this._setViewMode('single');
      });

      elements.scrollMode.addEventListener('click', () => {
        console.log('Scroll mode clicked');
        this._setViewMode('scroll');
      });

      elements.prevPage.addEventListener('click', () => this._navigate(-1));
      elements.nextPage.addEventListener('click', () => this._navigate(1));
      elements.pageNum.addEventListener('change', () => this._handlePageInput());
      elements.pageNum.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._handlePageInput();
      });

      document.addEventListener('keydown', (e) => this._handleKeyboardNavigation(e));
      elements.pdfViewerContainer.addEventListener('scroll', () => {
        if (state.viewMode === 'scroll') {
          this._updateCurrentPageFromScroll();
        }
      });
    },

    _setViewMode: function(mode) {
      state.viewMode = mode;

      elements.singleMode.classList.toggle('active', mode === 'single');
      elements.scrollMode.classList.toggle('active', mode === 'scroll');

      if (!state.pdf) return;

      elements.pdfContainer.innerHTML = '';

      if (mode === 'scroll') {
        console.log('Rendering all pages in scroll mode...');
        this._renderAllPages();
      } else {
        console.log('Rendering single page...');
        this._renderPage(state.currentPage);
      }
    },

    _handleFileSelect: async function(event) {
      const file = event.target.files[0];
      if (!file || file.type !== 'application/pdf') {
        this._showError('Please select a valid PDF file!');
        return;
      }

      this._showLoading(true);

      try {
        const arrayBuffer = await file.arrayBuffer();
        state.pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        state.totalPages = state.pdf.numPages;
        state.currentPage = 1;

        elements.pageCount.textContent = state.totalPages;
        elements.pageNum.max = state.totalPages;
        elements.pageNum.value = 1;

        if (state.viewMode === 'scroll') {
          await this._renderAllPages();
        } else {
          await this._renderPage(1);
        }
      } catch (err) {
        console.error('PDF loading error:', err);
        this._showError('Failed to load PDF. Please try another file.');
      } finally {
        this._showLoading(false);
      }
    },

    _renderPage: async function(pageNum) {
      if (!state.pdf || state.isRendering) return;
      state.isRendering = true;

      if (state.viewMode === 'single') {
        elements.pdfContainer.innerHTML = '';
      }

      try {
        const page = await state.pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: state.scale });

        const pageDiv = document.createElement('div');
        pageDiv.className = 'page-container';
        pageDiv.dataset.pageNumber = pageNum;
        elements.pdfContainer.appendChild(pageDiv);

        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'canvas-wrapper';
        pageDiv.appendChild(canvasWrapper);

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvasWrapper.appendChild(canvas);

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        const textContent = await page.getTextContent();
        const textLayer = document.createElement('div');
        textLayer.className = 'textLayer';
        textLayer.style.width = `${viewport.width}px`;
        textLayer.style.height = `${viewport.height}px`;

        pdfjsLib.renderTextLayer({
          textContent: textContent,
          container: textLayer,
          viewport: viewport,
          textDivs: [],
          enhanceTextSelection: true
        });

        canvasWrapper.appendChild(textLayer);
      } catch (err) {
        console.error('Page rendering error:', err);
      } finally {
        state.isRendering = false;
      }
    },

    _renderAllPages: async function() {
      if (!state.pdf) return;
      elements.pdfContainer.innerHTML = '';
      this._showLoading(true);

      for (let i = 1; i <= state.totalPages; i++) {
       await this._renderPage(i);
        }

      this._showLoading(false);
      this._goToPage(state.currentPage);
    },

    _zoom: function(change) {
      const newScale = Math.max(0.5, Math.min(3, state.scale + change));
      if (Math.abs(newScale - state.scale) > 0.01) {
        state.scale = newScale;
        elements.zoomPercent.textContent = `${Math.round(state.scale * 100)}%`;
        this._refreshView();
      }
    },

    _fitWidth: async function() {
      if (!state.pdf) return;

      const page = await state.pdf.getPage(state.currentPage);
      const containerWidth = elements.pdfViewerContainer.clientWidth - 40;
      const viewport = page.getViewport({ scale: 1 });
      state.scale = containerWidth / viewport.width;

      elements.zoomPercent.textContent = `${Math.round(state.scale * 100)}%`;
      this._refreshView();
    },

    _refreshView: function() {
      if (state.viewMode === 'scroll') {
        this._renderAllPages();
      } else {
        this._renderPage(state.currentPage);
      }
    },

    _navigate: function(direction) {
      const newPage = state.currentPage + direction;
      this._goToPage(newPage);
    },

    _goToPage: function(pageNum) {
      pageNum = Math.max(1, Math.min(pageNum, state.totalPages));
      state.currentPage = pageNum;
      elements.pageNum.value = pageNum;

      if (state.viewMode === 'single') {
        this._renderPage(pageNum);
      } else {
        const pageElement = document.querySelector(`.page-container[data-page-number="${pageNum}"]`);
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
      this._updateUI();
    },

    _updateCurrentPageFromScroll: function() {
      const pageContainers = document.querySelectorAll('.page-container');
      let visiblePage = 1;

      pageContainers.forEach(container => {
        const rect = container.getBoundingClientRect();
        const containerTop = rect.top + elements.pdfViewerContainer.scrollTop;

        if (elements.pdfViewerContainer.scrollTop >= containerTop - 100) {
          visiblePage = parseInt(container.dataset.pageNumber);
        }
      });

      if (visiblePage !== state.currentPage) {
        state.currentPage = visiblePage;
        elements.pageNum.value = visiblePage;
        this._updateUI();
      }
    },

    _handlePageInput: function() {
      const pageNum = parseInt(elements.pageNum.value);
      if (!isNaN(pageNum)) {
        this._goToPage(pageNum);
      } else {
        elements.pageNum.value = state.currentPage;
      }
    },

    _handleKeyboardNavigation: function(e) {
      if (!state.pdf) return;

      switch (e.key) {
        case 'ArrowLeft':
          this._navigate(-1);
          break;
        case 'ArrowRight':
          this._navigate(1);
          break;
        case 'ArrowDown':
          if (state.viewMode === 'scroll') elements.pdfViewerContainer.scrollBy(0, 50);
          break;
        case 'ArrowUp':
          if (state.viewMode === 'scroll') elements.pdfViewerContainer.scrollBy(0, -50);
          break;
        case 'Home':
          this._goToPage(1);
          break;
        case 'End':
          this._goToPage(state.totalPages);
          break;
      }
    },

    _updateUI: function() {
      elements.prevPage.disabled = state.currentPage <= 1;
      elements.nextPage.disabled = state.currentPage >= state.totalPages;
    },

    _showLoading: function(show) {
      elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    },

    _showError: function(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        ${message}
      `;
      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 3000);
    }
  };
})();
