document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const fileInput = document.getElementById('fileInput');
    const addPanelBtn = document.getElementById('addPanelBtn');
    const panelsContainer = document.getElementById('panelsContainer');
    const textDirection = document.getElementById('textDirection');
    const fontSelector = document.getElementById('fontSelector');
    const fontSize = document.getElementById('fontSize');
    const textColor = document.getElementById('textColor');
    const bgColor = document.getElementById('bgColor');
    const addFontBtn = document.getElementById('addFontBtn');
    const customFontModal = document.getElementById('customFontModal');
    const closeModal = document.getElementById('closeModal');
    const saveFontBtn = document.getElementById('saveFontBtn');
    
    // Custom fonts storage
    const customFonts = [];
    let panelCounter = 0;
    
    // Event Listeners
    fileInput.addEventListener('change', handleFileSelection);
    addPanelBtn.addEventListener('click', addEmptyPanel);
    textDirection.addEventListener('change', updateTextDirection);
    fontSelector.addEventListener('change', updateFont);
    fontSize.addEventListener('change', updateFontSize);
    textColor.addEventListener('input', updateTextColor);
    bgColor.addEventListener('input', updateBackgroundColor);
    addFontBtn.addEventListener('click', showCustomFontModal);
    closeModal.addEventListener('click', hideCustomFontModal);
    saveFontBtn.addEventListener('click', addCustomFont);
    
    // Add initial empty panel
    addEmptyPanel();
    
    // Functions
    function handleFileSelection(event) {
      const files = event.target.files;
      if (!files.length) return;
      
      Array.from(files).forEach(file => {
        const fileName = file.name;
        const reader = new FileReader();
        
        reader.onload = function(e) {
          const content = e.target.result;
          addPanel(fileName, content);
        };
        
        reader.readAsText(file);
      });
      
      // Reset file input
      fileInput.value = '';
    }
    
    function addEmptyPanel() {
      addPanel('Empty Panel', '');
    }
    
    function addPanel(title, content) {
      panelCounter++;
      const panelId = `panel-${panelCounter}`;
      
      const panel = document.createElement('div');
      panel.className = 'panel';
      panel.id = panelId;
      
      const currentDirection = textDirection.value;
      const currentFont = fontSelector.value;
      const currentFontSize = fontSize.value;
      const currentTextColor = textColor.value;
      const currentBgColor = bgColor.value;
      
      panel.innerHTML = `
        <div class="panel-header">
          <div class="panel-title">${title}</div>
          <button class="panel-close" onclick="document.getElementById('${panelId}').remove()">&times;</button>
        </div>
        <div class="panel-content ${currentDirection}" 
             style="font-family: ${currentFont}; 
                    font-size: ${currentFontSize};
                    color: ${currentTextColor};
                    background-color: ${currentBgColor};">
          ${parseFileContent(content, title)}
        </div>
      `;
      
      panelsContainer.appendChild(panel);
    }
    
    function parseFileContent(content, fileName) {
      if (!content) return '';
      
      // Determine file type from extension
      const extension = fileName.split('.').pop().toLowerCase();
      
      try {
        if (extension === 'usx' || extension === 'xml') {
          return parseUSXContent(content);
        } else if (extension === 'sfm') {
          return parseSFMContent(content);
        } else {
          // If we can't determine the type, just display as plain text
          return `<pre>${escapeHTML(content)}</pre>`;
        }
      } catch (error) {
        return `<div class="error">Error parsing file: ${error.message}</div>`;
      }
    }
    
    function parseUSXContent(content) {
      // Create a DOM parser for XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, "text/xml");
      
      // Check for parsing errors
      if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
        return `<div class="error">Invalid XML format</div><pre>${escapeHTML(content)}</pre>`;
      }
      
      // Simple USX rendering - this would need to be expanded for full USX support
      let html = '';
      
      // Handle scripture text
      const chapters = xmlDoc.getElementsByTagName('chapter');
      const verses = xmlDoc.getElementsByTagName('verse');
      const paras = xmlDoc.getElementsByTagName('para');
      
      // Process paragraphs
      for (let i = 0; i < paras.length; i++) {
        const para = paras[i];
        const style = para.getAttribute('style') || '';
        
        if (style.startsWith('h')) {
          // Heading
          html += `<h${style.charAt(1) || '2'}>${para.textContent}</h${style.charAt(1) || '2'}>`;
        } else if (style === 'p') {
          // Regular paragraph
          html += `<p>${processNodes(para.childNodes)}</p>`;
        } else {
          // Other paragraph types
          html += `<div class="para ${style}">${processNodes(para.childNodes)}</div>`;
        }
      }
      
      return html || `<pre>${escapeHTML(content)}</pre>`;
    }
    
    function processNodes(nodes) {
      let result = '';
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        if (node.nodeType === Node.TEXT_NODE) {
          result += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'verse') {
            const num = node.getAttribute('number') || '';
            result += `<sup class="verse-number">${num}</sup> `;
          } else if (node.tagName === 'chapter') {
            const num = node.getAttribute('number') || '';
            result += `<strong class="chapter-number">${num}</strong> `;
          } else {
            result += processNodes(node.childNodes);
          }
        }
      }
      
      return result;
    }
    
    function parseSFMContent(content) {
      // Simple SFM parsing - would need to be expanded for full SFM support
      let html = '';
      const lines = content.trim().split('\n');
      
      // Process paragraph markers and verses
      let currentParagraph = '';
      let inParagraph = false;
      
      lines.forEach(line => {
        const trimmed = line.trim();
        
        // Chapter marker
        if (trimmed.startsWith('\\c ')) {
          if (inParagraph) {
            html += `<p>${currentParagraph}</p>`;
            currentParagraph = '';
            inParagraph = false;
          }
          const chapter = trimmed.substring(3).trim();
          html += `<h2 class="chapter">Chapter ${chapter}</h2>`;
        }
        // Verse marker
        else if (trimmed.startsWith('\\v ')) {
          const verseText = trimmed.substring(3).trim();
          const verseNum = verseText.split(' ')[0];
          const verseContent = verseText.substring(verseNum.length).trim();
          
          if (!inParagraph) {
            inParagraph = true;
          }
          
          currentParagraph += `<sup class="verse-num">${verseNum}</sup> ${verseContent} `;
        }
        // Section heading
        else if (trimmed.startsWith('\\s ')) {
          if (inParagraph) {
            html += `<p>${currentParagraph}</p>`;
            currentParagraph = '';
            inParagraph = false;
          }
          html += `<h3>${trimmed.substring(3).trim()}</h3>`;
        }
        // Paragraph marker
        else if (trimmed.startsWith('\\p')) {
          if (inParagraph) {
            html += `<p>${currentParagraph}</p>`;
            currentParagraph = '';
          }
          inParagraph = true;
        }
        // Other markers or continuation of content
        else {
          if (inParagraph) {
            currentParagraph += ' ' + trimmed;
          } else if (trimmed) {
            html += `<div>${trimmed}</div>`;
          }
        }
      });
      
      // Add final paragraph if exists
      if (inParagraph && currentParagraph) {
        html += `<p>${currentParagraph}</p>`;
      }
      
      return html || `<pre>${escapeHTML(content)}</pre>`;
    }
    
    function updateTextDirection() {
      const direction = textDirection.value;
      const panelContents = document.querySelectorAll('.panel-content');
      
      panelContents.forEach(content => {
        content.classList.remove('rtl', 'ltr');
        content.classList.add(direction);
      });
    }
    
    function updateFont() {
      const selectedFont = fontSelector.value;
      const panelContents = document.querySelectorAll('.panel-content');
      
      panelContents.forEach(content => {
        content.style.fontFamily = selectedFont;
      });
    }
    
    function updateFontSize() {
      const size = fontSize.value;
      const panelContents = document.querySelectorAll('.panel-content');
      
      panelContents.forEach(content => {
        content.style.fontSize = size;
      });
    }
    
    function updateTextColor() {
      const color = textColor.value;
      const panelContents = document.querySelectorAll('.panel-content');
      
      panelContents.forEach(content => {
        content.style.color = color;
      });
    }
    
    function updateBackgroundColor() {
      const color = bgColor.value;
      const panelContents = document.querySelectorAll('.panel-content');
      
      panelContents.forEach(content => {
        content.style.backgroundColor = color;
      });
    }
    
    function showCustomFontModal() {
      customFontModal.style.display = 'flex';
    }
    
    function hideCustomFontModal() {
      customFontModal.style.display = 'none';
      document.getElementById('fontName').value = '';
      document.getElementById('fontFile').value = '';
      document.getElementById('fontUrl').value = '';
    }
    
    function addCustomFont() {
      const fontName = document.getElementById('fontName').value.trim();
      const fontFile = document.getElementById('fontFile').files[0];
      const fontUrl = document.getElementById('fontUrl').value.trim();
      
      if (!fontName) {
        alert('Please enter a font name');
        return;
      }
      
      if (!fontFile && !fontUrl) {
        alert('Please provide either a font file or a URL');
        return;
      }
      
      if (fontFile) {
        // Handle font file
        const fontUrl = URL.createObjectURL(fontFile);
        addFontFace(fontName, fontUrl);
      } else if (fontUrl) {
        // Handle font URL
        loadExternalFont(fontName, fontUrl);
      }
      
      // Add to select dropdown
      const option = document.createElement('option');
      option.value = `'${fontName}', sans-serif`;
      option.textContent = fontName;
      fontSelector.appendChild(option);
      
      // Select the new font
      fontSelector.value = `'${fontName}', sans-serif`;
      updateFont();
      
      // Close modal
      hideCustomFontModal();
    }
    
    function addFontFace(fontName, url) {
      const fontFace = new FontFace(fontName, `url(${url})`);
      
      fontFace.load().then(function(loadedFace) {
        document.fonts.add(loadedFace);
        customFonts.push({
          name: fontName,
          url: url
        });
      }).catch(function(error) {
        alert(`Error loading font: ${error.message}`);
      });
    }
    
    function loadExternalFont(fontName, url) {
      const linkEl = document.createElement('link');
      linkEl.rel = 'stylesheet';
      linkEl.href = url;
      document.head.appendChild(linkEl);
      
      customFonts.push({
        name: fontName,
        url: url
      });
    }
    
    function escapeHTML(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  });