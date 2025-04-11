document.addEventListener('DOMContentLoaded', () => {
  const ideaInput = document.getElementById('idea-input');
  const generateBtn = document.getElementById('generate-btn');
  const codeOutput = document.getElementById('code-output');
  const copyBtn = document.getElementById('copy-btn');
  const runBtn = document.getElementById('run-btn');
  const editToggleBtn = document.getElementById('edit-toggle-btn');
  const previewFrame = document.getElementById('preview-frame');
  const inputStatus = document.getElementById('input-status');
  const outputStatus = document.getElementById('output-status');
  const aiEditInput = document.getElementById('ai-edit-input');
  const aiEditBtn = document.getElementById('ai-edit-btn');
  const codeCollapseBtn = document.getElementById('code-collapse-btn');
  
  // Preview button
  const fullscreenPreviewBtn = document.getElementById('fullscreen-preview-btn');
  
  // Customization options
  const themeSelect = document.getElementById('theme-select');
  const librariesSelect = document.getElementById('libraries-select');
  const layoutSelect = document.getElementById('layout-select');
  const featuresSelect = document.getElementById('features-select');
  
  // Code editing state
  let codeEditable = false;
  
  // Preview tab reference
  window.previewTab = null;
  
  // API key for OpenRouter
  const OPENROUTER_API_KEY = "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";
  
  // Initialize the preview with the initial code
  const initializePreview = () => {
    try {
      const initialContent = codeOutput.textContent;
      const blob = new Blob([initialContent], { type: 'text/html' });
      const blobURL = URL.createObjectURL(blob);
      previewFrame.src = blobURL;
      
      previewFrame.onload = () => {
        URL.revokeObjectURL(blobURL);
      };
    } catch (err) {
      console.error('Error initializing preview:', err);
    }
  };
  
  // Run the initialization for the local preview frame
  initializePreview();
  
  // Open preview in new tab
  fullscreenPreviewBtn.addEventListener('click', () => {
    try {
      // Get current code and clean it
      let cleanedCode = codeOutput.textContent;
      // Remove Live Server WebSocket code if present
      const liveServerMatch = cleanedCode.match(/\/\/ <!\[CDATA\[\s*\(function\(\) \{\s*const protocol = window\.location\.protocol.*?\/\/ \]\]>/s);
      if (liveServerMatch) {
        cleanedCode = cleanedCode.replace(liveServerMatch[0], '');
      }
      
      // Also strip any console.log related to Live Server
      cleanedCode = cleanedCode.replace(/console\.log\('Live reload enabled\.'\);/g, '');
      cleanedCode = cleanedCode.replace(/sessionStorage && !sessionStorage\.getItem\('IsThisFirstTime_Log_From_LiveServer'\).*?}/gs, '');
      
      // Store the current code in localStorage
      localStorage.setItem('webMakerAIPreviewCode', cleanedCode);
      
      // Try to find an existing preview tab/window
      if (window.previewTab && !window.previewTab.closed) {
        // Focus the existing tab
        window.previewTab.focus();
        
        // Try to send a message to update the content
        try {
          window.previewTab.postMessage({ 
            type: 'update-preview', 
            code: cleanedCode 
          }, window.location.origin);
        } catch (e) {
          console.warn('Failed to update existing preview tab via postMessage:', e);
          // If messaging fails, reload the page to get the updated localStorage
          window.previewTab.location.reload();
        }
      } else {
        // Open a new preview tab
        window.previewTab = window.open('preview.html', 'webMakerAIPreview');
      }
    } catch (err) {
      console.error('Error opening preview tab:', err);
      outputStatus.textContent = `Error opening preview: ${err.message}`;
      outputStatus.className = 'status error';
    }
  });
  
  // Helper function to get CDN links for libraries
  function getLibraryLinks(library) {
    switch(library) {
      case 'bootstrap':
        return `<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>`;
      case 'tailwind':
        return `<script src="https://cdn.tailwindcss.com"></script>`;
      case 'jquery':
        return `<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>`;
      default:
        return '';
    }
  }
  
  // Update the local preview frame
  const updateLocalPreview = (codeContent) => {
    try {
      const iframe = previewFrame;
      
      // Remove Live Server WebSocket code if present
      let cleanedCode = codeContent;
      // Look for Live Server injected code and remove it
      const liveServerMatch = cleanedCode.match(/\/\/ <!\[CDATA\[\s*\(function\(\) \{\s*const protocol = window\.location\.protocol.*?\/\/ \]\]>/s);
      if (liveServerMatch) {
        cleanedCode = cleanedCode.replace(liveServerMatch[0], '');
      }
      
      // Also strip any console.log related to Live Server
      cleanedCode = cleanedCode.replace(/console\.log\('Live reload enabled\.'\);/g, '');
      cleanedCode = cleanedCode.replace(/sessionStorage && !sessionStorage\.getItem\('IsThisFirstTime_Log_From_LiveServer'\).*?}/gs, '');
      
      // Create a blob with the content and use it as the iframe source
      const blob = new Blob([cleanedCode], { type: 'text/html' });
      const blobURL = URL.createObjectURL(blob);
      
      // Set the iframe source to the blob URL
      iframe.src = blobURL;
      
      // Clean up by revoking the blob URL after the iframe loads
      iframe.onload = () => {
        URL.revokeObjectURL(blobURL);
      };
    } catch (err) {
      console.error('Error updating local preview:', err);
    }
  };
  
  // AI Edit functionality
  aiEditBtn.addEventListener('click', async () => {
    const editInstruction = aiEditInput.value.trim();
    
    if (!editInstruction) {
      outputStatus.textContent = 'Please enter edit instructions first';
      outputStatus.className = 'status error';
      return;
    }
    
    // Get the current code
    const currentCode = codeOutput.textContent;
    
    // Show editing status
    outputStatus.textContent = 'AI is modifying your code...';
    outputStatus.className = 'status';
    aiEditBtn.disabled = true;
    
    try {
      // Prepare the prompt for AI code modification
      const prompt = `I have the following HTML/CSS/JavaScript code:

\`\`\`html
${currentCode}
\`\`\`

I want you to modify this code based on the following instruction: "${editInstruction}"

Please provide the complete modified code. Return only the modified code as a complete HTML file, no explanations or markdown formatting.`;
      
      // Call the OpenRouter API
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://webmakerai.com",
          "X-Title": "Web Maker AI",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "deepseek/deepseek-r1-zero:free",
          "messages": [
            {
              "role": "user",
              "content": prompt
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract the modified code from the response
      let modifiedCode = data.choices[0].message.content;
      
      // Clean up the response if it contains markdown code blocks
      if (modifiedCode.includes("```html")) {
        modifiedCode = modifiedCode.split("```html")[1].split("```")[0].trim();
      } else if (modifiedCode.includes("```")) {
        modifiedCode = modifiedCode.split("```")[1].split("```")[0].trim();
      }
      
      // Update the code output
      codeOutput.textContent = formatCodeOutput(modifiedCode);
      
      // Show success message
      outputStatus.textContent = `Code modified according to: "${editInstruction}"`;
      outputStatus.className = 'status success';
      
      // Clear the edit input
      aiEditInput.value = '';
      
      // Clean the modified code to remove any potential Live Server injection
      let cleanedCode = modifiedCode;
      // Look for Live Server injected code and remove it
      const liveServerMatch = cleanedCode.match(/\/\/ <!\[CDATA\[\s*\(function\(\) \{\s*const protocol = window\.location\.protocol.*?\/\/ \]\]>/s);
      if (liveServerMatch) {
        cleanedCode = cleanedCode.replace(liveServerMatch[0], '');
      }
      
      // Also strip any console.log related to Live Server
      cleanedCode = cleanedCode.replace(/console\.log\('Live reload enabled\.'\);/g, '');
      cleanedCode = cleanedCode.replace(/sessionStorage && !sessionStorage\.getItem\('IsThisFirstTime_Log_From_LiveServer'\).*?}/gs, '');
      
      // Update both local and tab preview
      updateLocalPreview(cleanedCode);
      
      // Update the preview tab if it exists
      if (window.previewTab && !window.previewTab.closed) {
        try {
          window.previewTab.postMessage({ 
            type: 'update-preview', 
            code: cleanedCode 
          }, window.location.origin);
        } catch (e) {
          console.warn('Failed to update existing preview tab via postMessage:', e);
          // If messaging fails, store in localStorage and reload
          localStorage.setItem('webMakerAIPreviewCode', cleanedCode);
          window.previewTab.location.reload();
        }
      }
      
    } catch (error) {
      console.error('Error modifying code:', error);
      outputStatus.textContent = `Error: ${error.message}`;
      outputStatus.className = 'status error';
    } finally {
      aiEditBtn.disabled = false;
    }
  });
  
  // Allow enter key to trigger AI edit
  aiEditInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      aiEditBtn.click();
    }
  });
  
  // Toggle code editability
  editToggleBtn.addEventListener('click', () => {
    codeEditable = !codeEditable;
    
    if (codeEditable) {
      // Make code output editable
      codeOutput.contentEditable = "true";
      codeOutput.classList.add('editable');
      
      // Always expand code when editing
      if (codeOutput.classList.contains('collapsed')) {
        codeOutput.classList.remove('collapsed');
        codeCollapseBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Collapse Code
        `;
      }
      
      editToggleBtn.textContent = "Save Changes";
      editToggleBtn.classList.add('active');
      
      // Focus the editor
      codeOutput.focus();
      
      // Show editing status
      outputStatus.textContent = 'Editing mode enabled - make your changes';
      outputStatus.className = 'status';
    } else {
      // Save changes and disable editing
      codeOutput.contentEditable = "false";
      codeOutput.classList.remove('editable');
      editToggleBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M11 4H4C2.89543 4 2 4.89543 2 6V20C2 21.1046 2.89543 22 4 22H18C19.1046 22 20 21.1046 20 20V13M18.5 2.5C19.3284 3.32843 19.3284 4.67157 18.5 5.5L10 14L6 15L7 11L15.5 2.5C16.3284 1.67157 17.6716 1.67157 18.5 2.5Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg> Edit Code`;
      editToggleBtn.classList.remove('active');
      
      // Get the updated code
      const updatedCode = codeOutput.textContent;
      
      // Clean the code to remove any potential Live Server injection
      let cleanedCode = updatedCode;
      // Look for Live Server injected code and remove it
      const liveServerMatch = cleanedCode.match(/\/\/ <!\[CDATA\[\s*\(function\(\) \{\s*const protocol = window\.location\.protocol.*?\/\/ \]\]>/s);
      if (liveServerMatch) {
        cleanedCode = cleanedCode.replace(liveServerMatch[0], '');
      }
      
      // Also strip any console.log related to Live Server
      cleanedCode = cleanedCode.replace(/console\.log\('Live reload enabled\.'\);/g, '');
      cleanedCode = cleanedCode.replace(/sessionStorage && !sessionStorage\.getItem\('IsThisFirstTime_Log_From_LiveServer'\).*?}/gs, '');
      
      // Update the local preview
      updateLocalPreview(cleanedCode);
      
      // Update the preview tab if it exists
      if (window.previewTab && !window.previewTab.closed) {
        try {
          window.previewTab.postMessage({ 
            type: 'update-preview', 
            code: cleanedCode 
          }, window.location.origin);
        } catch (e) {
          console.warn('Failed to update existing preview tab via postMessage:', e);
          // If messaging fails, store in localStorage and reload
          localStorage.setItem('webMakerAIPreviewCode', cleanedCode);
          window.previewTab.location.reload();
        }
      }
      
      // Show success message
      outputStatus.textContent = 'Changes saved and applied';
      outputStatus.className = 'status success';
      
      // Clear status after 3 seconds
      setTimeout(() => {
        outputStatus.textContent = '';
      }, 3000);
    }
  });
  
  // Function to format code output with summary information
  const formatCodeOutput = (code) => {
    // Get line count
    const lineCount = code.split('\n').length;
    const chars = code.length;
    
    // If code is large, add summary information at the top
    if (lineCount > 50 || chars > 5000) {
      // Make sure code is collapsed
      codeOutput.classList.add('collapsed');
      codeCollapseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5V19M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Show Full Code (${lineCount} lines)
      `;
      
      // Add a small summary above the code output
      outputStatus.textContent = `Generated ${lineCount} lines of code (${(chars/1000).toFixed(1)}KB)`;
      outputStatus.className = 'status';
      
      setTimeout(() => {
        outputStatus.textContent = '';
      }, 5000);
    } else {
      // For smaller code, keep it expanded
      codeOutput.classList.remove('collapsed');
      codeCollapseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Collapse Code
      `;
    }
    
    return code;
  };
  
  // Generate code using the DeepSeek R1 model via OpenRouter API
  generateBtn.addEventListener('click', async () => {
    console.log("Generate button clicked");
    const idea = ideaInput.value.trim();
    
    if (!idea) {
      inputStatus.textContent = 'Please enter your idea first';
      inputStatus.className = 'status error';
      return;
    }
    
    // Get customization options
    const theme = themeSelect.value;
    const libraries = librariesSelect.value;
    const layout = layoutSelect.value;
    const features = featuresSelect.value;
    
    // Show generating status
    inputStatus.textContent = 'Generating code...';
    inputStatus.className = 'status';
    generateBtn.disabled = true;
    
    try {
      console.log("Preparing API request");
      // Prepare the prompt for DeepSeek R1 with customization options
      const prompt = `Create a single HTML file with inline CSS and JavaScript for the following idea: "${idea}".

Customization requirements:
- Theme: ${theme} style
- Libraries: ${libraries === 'none' ? 'No external libraries, use pure HTML/CSS/JS' : `Include ${libraries}`}
- Layout: Use ${layout} layout approach
- Features: Include ${features} functionality

The response should be a complete, standalone HTML file with the following structure:

<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Generated App</title>
  ${libraries !== 'none' ? getLibraryLinks(libraries) : ''}
  <style>
    /* CSS goes here */
  </style>
</head>
<body>
  <!-- HTML content goes here -->
  
  <script>
    // JavaScript goes here
  </script>
</body>
</html>

Make it responsive for all devices, visually appealing, and follow best practices. Return only the code, no explanations.`;
      
      console.log("Sending API request");
      // Call the OpenRouter API
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://webmakerai.com",
          "X-Title": "Web Maker AI",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "deepseek/deepseek-r1-zero:free",
          "messages": [
            {
              "role": "user",
              "content": prompt
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      console.log("Processing API response");
      const data = await response.json();
      
      // Extract the generated code from the response
      let generatedCode = data.choices[0].message.content;
      
      // Clean up the response if it contains markdown code blocks
      if (generatedCode.includes("```html")) {
        generatedCode = generatedCode.split("```html")[1].split("```")[0].trim();
      } else if (generatedCode.includes("```")) {
        generatedCode = generatedCode.split("```")[1].split("```")[0].trim();
      }
      
      console.log("Updating UI with generated code");
      // Format and update the code output
      codeOutput.textContent = formatCodeOutput(generatedCode);
      
      // Show success message
      inputStatus.textContent = 'Code generated successfully';
      inputStatus.className = 'status success';
      
      // Update both local and tab preview
      updateLocalPreview(generatedCode);
      
      // Always open a new preview tab or update existing one
      let previewWindow = null;
      let isNewWindow = false;
      
      // Clean the generated code to remove any potential Live Server injection
      let cleanedCode = generatedCode;
      // Look for Live Server injected code and remove it
      const liveServerMatch = cleanedCode.match(/\/\/ <!\[CDATA\[\s*\(function\(\) \{\s*const protocol = window\.location\.protocol.*?\/\/ \]\]>/s);
      if (liveServerMatch) {
        cleanedCode = cleanedCode.replace(liveServerMatch[0], '');
      }
      
      // Also strip any console.log related to Live Server
      cleanedCode = cleanedCode.replace(/console\.log\('Live reload enabled\.'\);/g, '');
      cleanedCode = cleanedCode.replace(/sessionStorage && !sessionStorage\.getItem\('IsThisFirstTime_Log_From_LiveServer'\).*?}/gs, '');
      
      // Store the code in localStorage for the preview page to access
      localStorage.setItem('webMakerAIPreviewCode', cleanedCode);
      
      if (window.previewTab && !window.previewTab.closed) {
        previewWindow = window.previewTab;
        // Focus the existing tab
        previewWindow.focus();
        
        // Try to send a message to update the content
        try {
          previewWindow.postMessage({ 
            type: 'update-preview', 
            code: cleanedCode 
          }, window.location.origin);
        } catch (e) {
          console.warn('Failed to update existing preview tab via postMessage:', e);
          // If messaging fails, reload the page to get the updated localStorage
          previewWindow.location.reload();
        }
      } else {
        // Open a new preview tab
        previewWindow = window.open('preview.html', 'webMakerAIPreview');
        // Store the reference to the window
        window.previewTab = previewWindow;
        isNewWindow = true;
      }
      
      // Show additional success message about preview
      if (isNewWindow) {
        outputStatus.textContent = 'Preview opened in new tab';
      } else {
        outputStatus.textContent = 'Preview updated in existing tab';
      }
      outputStatus.className = 'status success';
      
    } catch (error) {
      console.error('Error generating code:', error);
      inputStatus.textContent = `Error: ${error.message}`;
      inputStatus.className = 'status error';
    } finally {
      generateBtn.disabled = false;
    }
  });
  
  // Copy button functionality
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(codeOutput.textContent)
      .then(() => {
        outputStatus.textContent = 'Code copied to clipboard';
        outputStatus.className = 'status success';
        
        // Clear status after 3 seconds
        setTimeout(() => {
          outputStatus.textContent = '';
        }, 3000);
      })
      .catch(err => {
        outputStatus.textContent = 'Failed to copy code: ' + err;
        outputStatus.className = 'status error';
      });
  });
  
  // Run button functionality
  runBtn.addEventListener('click', () => {
    // First show status that we're opening a new tab
    outputStatus.textContent = 'Opening preview...';
    outputStatus.className = 'status';
    
    try {
      const codeContent = codeOutput.textContent;
      
      // Clean the code to remove any potential Live Server injection
      let cleanedCode = codeContent;
      // Look for Live Server injected code and remove it
      const liveServerMatch = cleanedCode.match(/\/\/ <!\[CDATA\[\s*\(function\(\) \{\s*const protocol = window\.location\.protocol.*?\/\/ \]\]>/s);
      if (liveServerMatch) {
        cleanedCode = cleanedCode.replace(liveServerMatch[0], '');
      }
      
      // Also strip any console.log related to Live Server
      cleanedCode = cleanedCode.replace(/console\.log\('Live reload enabled\.'\);/g, '');
      cleanedCode = cleanedCode.replace(/sessionStorage && !sessionStorage\.getItem\('IsThisFirstTime_Log_From_LiveServer'\).*?}/gs, '');
      
      // Store the code in localStorage for the preview page to access
      localStorage.setItem('webMakerAIPreviewCode', cleanedCode);
      
      // Try to find an existing preview tab/window
      let previewWindow = null;
      let isNewWindow = false;
      
      if (window.previewTab && !window.previewTab.closed) {
        previewWindow = window.previewTab;
        // Focus the existing tab
        previewWindow.focus();
        
        // Try to send a message to update the content
        try {
          previewWindow.postMessage({ 
            type: 'update-preview', 
            code: cleanedCode 
          }, window.location.origin);
        } catch (e) {
          console.warn('Failed to update existing preview tab via postMessage:', e);
          // If messaging fails, reload the page to get the updated localStorage
          previewWindow.location.reload();
        }
      } else {
        // Open a new preview tab
        previewWindow = window.open('preview.html', 'webMakerAIPreview');
        // Store the reference to the window
        window.previewTab = previewWindow;
        isNewWindow = true;
      }
      
      // Update the local preview frame for reference
      updateLocalPreview(cleanedCode);
      
      // Show different messages based on whether we opened a new tab or updated an existing one
      if (isNewWindow) {
        outputStatus.textContent = 'New preview tab opened';
      } else {
        outputStatus.textContent = 'Preview updated in existing tab';
      }
      outputStatus.className = 'status success';
      
      // Clear status after 3 seconds
      setTimeout(() => {
        outputStatus.textContent = '';
      }, 3000);
      
    } catch (err) {
      console.error('Error running code:', err);
      outputStatus.textContent = `Error running code: ${err.message}`;
      outputStatus.className = 'status error';
    }
  });

  // Add keyboard shortcut for running code (Ctrl+Enter)
  document.addEventListener('keydown', (e) => {
    // Check if Ctrl+Enter was pressed
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      runBtn.click();
    }
  });

  // Code collapse functionality
  codeCollapseBtn.addEventListener('click', () => {
    codeOutput.classList.toggle('collapsed');
    
    if (codeOutput.classList.contains('collapsed')) {
      codeCollapseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5V19M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Show Full Code
      `;
    } else {
      codeCollapseBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Collapse Code
      `;
    }
  });
}); 