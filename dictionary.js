const Dictionary = (() => {
  const elements = {
    dictPanel: document.querySelector('.dictionary-panel'),
    dictWord: document.getElementById('dict-word'),
    dictMeaning: document.getElementById('dict-meaning'),
    dictExample: document.getElementById('dict-example'),
    dictLoading: document.getElementById('dict-loading'),
    dictContent: document.getElementById('dict-content'),
    closeDict: document.getElementById('close-dict'),
    showExample: document.getElementById('show-example')
  };

  const API_CONFIG = {
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: "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",
    model: "mistralai/mistral-7b-instruct"
  };

  const definitionCache = new Map();

  return {
    init: function() {
      this._setupEventListeners();
    },

    _setupEventListeners: function() {
      document.addEventListener('mouseup', (e) => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        if (text && text.length <= 100) {
          this._getDefinition(text);
        }
      });

      elements.closeDict.addEventListener('click', () => this.close());
      elements.showExample.addEventListener('click', () => this._toggleExample());
    },

    _getDefinition: async function(text) {
      this._showLoading(true);
      elements.dictWord.textContent = text;
      elements.dictExample.textContent = '';
      elements.dictExample.classList.remove('show');
      elements.dictContent.style.display = 'none';

      try {
        if (definitionCache.has(text)) {
          const { definition, example } = definitionCache.get(text);
          elements.dictMeaning.textContent = definition;
          elements.dictExample.textContent = example;
          this.show();
          return;
        }

        const definition = await this._fetchAIResponse(text, 'definition');
        elements.dictMeaning.textContent = definition;
        
        definitionCache.set(text, { definition, example: '' });
        
        this.show();
      } catch (error) {
        console.error('Dictionary error:', error);
        elements.dictMeaning.textContent = "Error loading definition";
        this.show();
      } finally {
        this._showLoading(false);
      }
    },

    _toggleExample: async function() {
      const word = elements.dictWord.textContent;
      if (!word) return;

      if (elements.dictExample.classList.contains('show')) {
        elements.dictExample.classList.remove('show');
        return;
      }

      const cachedData = definitionCache.get(word);
      if (cachedData && cachedData.example) {
        elements.dictExample.textContent = cachedData.example;
        elements.dictExample.classList.add('show');
        return;
      }

      this._showLoading(true);
      try {
        const example = await this._fetchAIResponse(word, 'example');
        elements.dictExample.textContent = example;
        elements.dictExample.classList.add('show');
        
        if (definitionCache.has(word)) {
          definitionCache.set(word, {
            ...definitionCache.get(word),
            example: example
          });
        }
      } catch (error) {
        console.error('Example error:', error);
        elements.dictExample.textContent = "Error loading example";
      } finally {
        this._showLoading(false);
      }
    },

    _fetchAIResponse: async function(text, type) {
      const prompt = type === 'definition' 
        ? `Provide a concise dictionary definition of "${text}" in one sentence.`
        : `Provide one clear example sentence using "${text}" in context.`;

      const response = await fetch(API_CONFIG.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_CONFIG.key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: API_CONFIG.model,
          messages: [{
            role: "system",
            content: "You are a helpful dictionary assistant for book readers. Be concise and accurate."
          }, {
            role: "user",
            content: prompt
          }],
          temperature: 0.3,
          max_tokens: 100
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content?.trim() || "Definition not available";
    },

    _showLoading: function(show) {
      elements.dictLoading.style.display = show ? 'flex' : 'none';
      elements.dictContent.style.display = show ? 'none' : 'block';
    },

    show: function() {
      elements.dictPanel.style.display = 'flex';
    },

    close: function() {
      elements.dictPanel.style.display = 'none';
    }
  };
})();