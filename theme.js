const ThemeManager = (() => {
  const elements = {
    themeDropdown: document.querySelector('.theme-dropdown'),
    themeButton: document.querySelector('.theme-dropdown .tool-button'),
    themeOptions: document.querySelectorAll('.theme-option'),
    dropdownContent: document.querySelector('.theme-dropdown-content'),
    muteButton: null // Will be initialized
  };

  const themes = {
    classic: {
      icon: 'fa-star',
      label: 'Classic',
      css: 'classic.css',
      music: 'musics/classic.mp3'
    },
    pleasant: {
      icon: 'fa-heart',
      label: 'Pleasant',
      css: 'pleasant.css',
      music: 'musics/pleasant.mp3'
    },
    goofy: {
      icon: 'fa-ghost',
      label: 'Goofy',
      css: 'goofy.css',
      music: 'musics/goofy.mp3'
    },
    sunshine: {
      icon: 'fa-sun',
      label: 'Sunshine',
      css: 'sunshine.css',
      music: 'musics/sunshine.mp3'
    }
  };

  const state = {
    audio: new Audio(),
    isMuted: false,
    currentTheme: 'classic'
  };

  return {
    init: function() {
      // Create mute button
      this._createMuteButton();
      this._setupEventListeners();
      this._loadSavedTheme();
    },

    _createMuteButton: function() {
      const muteBtn = document.createElement('button');
      muteBtn.id = 'mute-button';
      muteBtn.className = 'tool-button circle';
      muteBtn.title = 'Toggle Sound';
      muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
      
      // Insert before theme dropdown
      const themeContainer = elements.themeDropdown.parentNode;
      themeContainer.insertBefore(muteBtn, elements.themeDropdown);
      
      elements.muteButton = muteBtn;
    },

    _setupEventListeners: function() {
      // Existing dropdown listeners...
      elements.themeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        elements.dropdownContent.classList.toggle('show');
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('.theme-dropdown')) {
          elements.dropdownContent.classList.remove('show');
        }
      });

      elements.themeOptions.forEach(option => {
        option.addEventListener('click', () => {
          const theme = option.dataset.theme;
          this._setTheme(theme);
          elements.dropdownContent.classList.remove('show');
        });
      });

      // Mute button listener
      elements.muteButton.addEventListener('click', () => this._toggleMute());
    },

    _setTheme: function(theme) {
      // Remove all theme classes
      document.body.classList.remove(
        'classic-theme', 'pleasant-theme', 
         'sunshine-theme','goofy-theme'
      );
      
      // Add current theme class
      document.body.classList.add(`${theme}-theme`);
      
      // Update theme button
      elements.themeButton.innerHTML = `
        <i class="fas ${themes[theme].icon}"></i> ${themes[theme].label} <i class="fas fa-chevron-down"></i>
      `;
      
      // Update stylesheet
      document.getElementById('theme-style').href = 'styles/' + themes[theme].css;
      
      
      // Save and play music
      localStorage.setItem('selectedTheme', theme);
      state.currentTheme = theme;
      this._playThemeMusic();
    },

    _playThemeMusic: function() {
      if (state.isMuted) return;
      
      state.audio.pause();
      state.audio = new Audio(themes[state.currentTheme].music);
      state.audio.loop = true;
      state.audio.volume = 0.3; // 30% volume
      state.audio.play().catch(e => console.log("Audio play prevented:", e));
    },

    _toggleMute: function() {
      state.isMuted = !state.isMuted;
      
      // Update button icon
      elements.muteButton.innerHTML = `
        <i class="fas ${state.isMuted ? 'fa-volume-mute' : 'fa-volume-up'}"></i>
      `;
      
      // Pause or play
      if (state.isMuted) {
        state.audio.pause();
      } else {
        this._playThemeMusic();
      }
      
      localStorage.setItem('isMuted', state.isMuted);
    },

    _loadSavedTheme: function() {
      const savedTheme = localStorage.getItem('selectedTheme') || 'classic';
      const isMuted = localStorage.getItem('isMuted') === 'true';
      
      if (isMuted) {
        state.isMuted = true;
        elements.muteButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
      }
      
      this._setTheme(savedTheme);
    }
  };
})();