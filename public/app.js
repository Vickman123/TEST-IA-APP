// PCPUMA AI Studio - Core Frontend Application
document.addEventListener('DOMContentLoaded', () => {
  // State
  let agents = [];
  let currentAgent = null;
  let currentChat = {
    id: 'chat-' + Date.now(),
    title: 'Nueva Conversación',
    messages: [],
    agentId: null
  };
  let chatsHistory = [];
  let credentialsData = null;
  let activeSnippetTab = 'curl';
  let isGenerating = false;
  const isGitHubPages = window.location.hostname.endsWith('github.io');
  let backendUrl = localStorage.getItem('pcpuma_backend_url') || '';

  function getApiUrl(path) {
    if (!path.startsWith('/')) path = '/' + path;
    if (backendUrl) {
      return backendUrl.replace(/\/+$/, '') + path;
    }
    return path;
  }

  // DOM Elements
  const connectionStatusText = document.getElementById('connectionStatusText');
  const connectionLatency = document.getElementById('connectionLatency');
  const pingPulse = document.getElementById('pingPulse');
  const pingDot = document.getElementById('pingDot');
  const globalModelSelector = document.getElementById('globalModelSelector');

  const agentsList = document.getElementById('agentsList');
  const chatsHistoryList = document.getElementById('chatsHistoryList');
  const chatMessages = document.getElementById('chatMessages');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const newChatBtn = document.getElementById('newChatBtn');
  const newChatHeaderBtn = document.getElementById('newChatHeaderBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const exportChatBtn = document.getElementById('exportChatBtn');
  const welcomeCard = document.getElementById('welcomeCard');
  const quickPromptsContainer = document.getElementById('quickPromptsContainer');

  // Agent Banner Elements
  const agentBannerName = document.getElementById('agentBannerName');
  const agentBannerTagline = document.getElementById('agentBannerTagline');
  const agentBannerCategory = document.getElementById('agentBannerCategory');
  const tempValueDisplay = document.getElementById('tempValueDisplay');

  // Modals
  const apiModal = document.getElementById('apiModal');
  const openApiModalBtn = document.getElementById('openApiModalBtn');
  const closeApiModalBtn = document.getElementById('closeApiModalBtn');
  const closeApiModalBtn2 = document.getElementById('closeApiModalBtn2');
  const sidebarApiQuickBtn = document.getElementById('sidebarApiQuickBtn');

  const createAgentModal = document.getElementById('createAgentModal');
  const createAgentModalBtn = document.getElementById('createAgentModalBtn');
  const closeAgentModalBtn = document.getElementById('closeAgentModalBtn');
  const cancelAgentModalBtn = document.getElementById('cancelAgentModalBtn');
  const createAgentForm = document.getElementById('createAgentForm');
  const tempSlider = document.getElementById('newAgentTemp');
  const tempSliderVal = document.getElementById('tempSliderVal');

  // Sidebar toggle
  const sidebar = document.getElementById('sidebar');
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');

  // Toast
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  window.copyCodeSnippet = function(btn) {
    const wrapper = btn.closest('.code-wrapper');
    const codeEl = wrapper ? wrapper.querySelector('pre code') : null;
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.textContent);
      if (window.showAppToast) window.showAppToast('Código copiado al portapapeles');
    }
  };

  // Configure marked renderer for code blocks with copy button
  const renderer = new marked.Renderer();
  renderer.code = function(tokenOrCode, maybeLang) {
    let code = '';
    let lang = 'text';

    if (tokenOrCode && typeof tokenOrCode === 'object') {
      code = tokenOrCode.text || '';
      lang = tokenOrCode.lang || 'text';
    } else {
      code = tokenOrCode || '';
      lang = maybeLang || 'text';
    }

    lang = (lang || 'text').trim().split(/\s+/)[0] || 'text';
    const safeCode = escapeHtml(code);
    return `
      <div class="code-wrapper">
        <div class="code-header">
          <span class="font-mono text-xs text-indigo-300 font-semibold">${lang.toUpperCase()}</span>
          <button class="code-copy-btn" onclick="copyCodeSnippet(this)">
            Copiar Código
          </button>
        </div>
        <pre><code class="language-${lang}">${safeCode}</code></pre>
      </div>
    `;
  };
  marked.setOptions({
    renderer: renderer,
    breaks: true,
    gfm: true
  });

  window.showAppToast = showToast;

  init();

  async function init() {
    setupEventListeners();
    await checkApiStatus();
    await loadCredentials();
    await loadAgents();
    await loadChats();
    renderWelcomeQuickPrompts();
    lucide.createIcons();
    setInterval(checkApiStatus, 45000);
  }

  function setupEventListeners() {
    if (toggleSidebarBtn) {
      toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
      });
    }

    newChatBtn.addEventListener('click', startNewChat);
    newChatHeaderBtn.addEventListener('click', startNewChat);

    clearChatBtn.addEventListener('click', () => {
      if (confirm('¿Deseas vaciar la pantalla actual?')) {
        currentChat.messages = [];
        renderMessages();
      }
    });

    exportChatBtn.addEventListener('click', exportChatAsDocument);

    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });

    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    messageInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });

    const openApiModal = () => {
      apiModal.classList.remove('hidden');
      updateSnippetDisplay();
      lucide.createIcons();
    };
    openApiModalBtn.addEventListener('click', openApiModal);
    if (sidebarApiQuickBtn) sidebarApiQuickBtn.addEventListener('click', openApiModal);
    closeApiModalBtn.addEventListener('click', () => apiModal.classList.add('hidden'));
    closeApiModalBtn2.addEventListener('click', () => apiModal.classList.add('hidden'));

    document.querySelectorAll('.snippet-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.snippet-tab-btn').forEach(b => {
          b.classList.remove('active', 'bg-indigo-600', 'text-white');
          b.classList.add('bg-slate-800', 'text-slate-300');
        });
        btn.classList.add('active', 'bg-indigo-600', 'text-white');
        btn.classList.remove('bg-slate-800', 'text-slate-300');
        activeSnippetTab = btn.getAttribute('data-tab');
        updateSnippetDisplay();
      });
    });

    document.getElementById('copyActiveSnippetBtn').addEventListener('click', () => {
      if (!credentialsData || !credentialsData.snippets) return;
      const snippet = credentialsData.snippets[activeSnippetTab];
      if (snippet) {
        navigator.clipboard.writeText(snippet);
        showToast('¡Snippet copiado al portapapeles!');
      }
    });

    document.querySelectorAll('.copy-field-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const el = document.getElementById(targetId);
        if (el) {
          navigator.clipboard.writeText(el.innerText.trim());
          showToast('Copiado al portapapeles');
        }
      });
    });

    createAgentModalBtn.addEventListener('click', () => {
      createAgentModal.classList.remove('hidden');
      lucide.createIcons();
    });
    closeAgentModalBtn.addEventListener('click', () => createAgentModal.classList.add('hidden'));
    cancelAgentModalBtn.addEventListener('click', () => createAgentModal.classList.add('hidden'));

    if (tempSlider && tempSliderVal) {
      tempSlider.addEventListener('input', () => {
        tempSliderVal.innerText = tempSlider.value;
      });
    }

    createAgentForm.addEventListener('submit', handleCreateAgent);

    const clearAllChatsBtn = document.getElementById('clearAllChatsBtn');
    if (clearAllChatsBtn) {
      clearAllChatsBtn.addEventListener('click', async () => {
        if (confirm('¿Eliminar todo el historial de conversaciones guardado?')) {
          for (let chat of chatsHistory) {
            await fetch(`/api/chats/${chat.id}`, { method: 'DELETE' });
          }
          chatsHistory = [];
          startNewChat();
          renderChatsHistory();
          showToast('Historial limpiado');
        }
      });
    }
  }

  async function checkApiStatus() {
    try {
      const res = await fetch(getApiUrl('/api/status'));
      if (!res.ok) throw new Error('Status ' + res.status);
      const data = await res.json();
      if (data.status === 'online') {
        connectionStatusText.innerText = 'PCPUMA API En Línea';
        connectionStatusText.className = 'text-emerald-400 font-semibold';
        connectionLatency.innerText = data.latency;
        pingPulse.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
        pingDot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500';
        return;
      }
    } catch (err) {
      if (isGitHubPages && !backendUrl) {
        connectionStatusText.innerText = 'GitHub Pages (Conectar Backend)';
        connectionStatusText.className = 'text-amber-400 font-semibold cursor-pointer underline';
        connectionLatency.innerText = '⚙️ Configurar';
        pingPulse.className = 'hidden';
        pingDot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500';
      } else {
        connectionStatusText.innerText = 'API Offline o Error';
        connectionStatusText.className = 'text-red-400 font-semibold';
        connectionLatency.innerText = 'Error';
        pingPulse.className = 'hidden';
        pingDot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500';
      }
    }
  }

  // Click on status to configure backend url
  if (connectionStatusText) {
    connectionStatusText.style.cursor = 'pointer';
    connectionStatusText.addEventListener('click', () => {
      const current = localStorage.getItem('pcpuma_backend_url') || '';
      const input = prompt('Ingresa la URL de tu backend en Render (ejemplo: https://pcpuma-ai.onrender.com) o deja vacío para local:', current);
      if (input !== null) {
        backendUrl = input.trim().replace(/\/+$/, '');
        localStorage.setItem('pcpuma_backend_url', backendUrl);
        showToast(backendUrl ? 'Backend configurado: ' + backendUrl : 'Usando backend local');
        checkApiStatus();
        loadAgents();
      }
    });
  }

  async function loadCredentials() {
    try {
      const res = await fetch(getApiUrl('/api/credentials'));
      if (res.ok) {
        credentialsData = await res.json();
      } else {
        throw new Error('Not ok');
      }
    } catch (e) {
      // Fallback estático para que el botón "Consumir API" funcione siempre en GitHub Pages
      const apiKey = 'sk-ws-H.DHDDXDX.XjLB.MEYCIQCfJDa_sSGqBbCMjOKYNG85kjB6m4yLEODkwREfVOsEhgIhAOd2v_5KqmP8cTgLlBK7ea0CaNkK0DxvLyPF3Z7AI0e1';
      const apiHost = 'ws-tq7m5b6imoeyftjn.ap-southeast-1.maas.aliyuncs.com';
      const compEndpoint = 'https://ws-tq7m5b6imoeyftjn.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1';
      const dashEndpoint = 'https://ws-tq7m5b6imoeyftjn.ap-southeast-1.maas.aliyuncs.com/api/v1';
      credentialsData = {
        credentials: {
          apiKey: apiKey,
          apiHost: apiHost,
          compatibleEndpoint: compEndpoint,
          dashScopeEndpoint: dashEndpoint
        },
        snippets: {
          curl: `curl --location '${compEndpoint}/chat/completions' \\\n--header 'Content-Type: application/json' \\\n--header 'Authorization: Bearer ${apiKey}' \\\n--data '{\n  \"model\": \"qwen-plus\",\n  \"messages\": [{\"role\": \"user\", \"content\": \"Hola PCPUMA\"}]\n}'`,
          python_openai: `from openai import OpenAI\n\nclient = OpenAI(\n    api_key="${apiKey}",\n    base_url="${compEndpoint}"\n)\n\nresponse = client.chat.completions.create(\n    model="qwen-plus",\n    messages=[{"role": "user", "content": "Hola PCPUMA"}]\n)\nprint(response.choices[0].message.content)`,
          python_requests: `import requests\n\nurl = "${compEndpoint}/chat/completions"\nheaders = {\n    "Authorization": "Bearer ${apiKey}",\n    "Content-Type": "application/json"\n}\npayload = {\n    "model": "qwen-plus",\n    "messages": [{"role": "user", "content": "Hola PCPUMA"}]\n}\nresponse = requests.post(url, headers=headers, json=payload)\nprint(response.json())`,
          nodejs_openai: `import OpenAI from 'openai';\n\nconst openai = new OpenAI({\n  apiKey: '${apiKey}',\n  baseURL: '${compEndpoint}'\n});\n\nconst response = await openai.chat.completions.create({\n  model: 'qwen-plus',\n  messages: [{ role: 'user', content: 'Hola' }]\n});\nconsole.log(response.choices[0].message.content);`,
          nodejs_fetch: `const response = await fetch('${compEndpoint}/chat/completions', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    'Authorization': 'Bearer ${apiKey}'\n  },\n  body: JSON.stringify({\n    model: 'qwen-plus',\n    messages: [{ role: 'user', content: 'Hola' }]\n  })\n});\nconst data = await response.json();\nconsole.log(data);`,
          powershell: `$headers = @{\n    "Authorization" = "Bearer ${apiKey}"\n    "Content-Type"  = "application/json"\n}\n$body = @{\n    model = "qwen-plus"\n    messages = @(@{ role = "user"; content = "Hola" })\n} | ConvertTo-Json\n$res = Invoke-RestMethod -Uri "${compEndpoint}/chat/completions" -Method Post -Headers $headers -Body $body\n$res.choices[0].message.content`
        }
      };
    }
    if (credentialsData && credentialsData.credentials) {
      document.getElementById('apiKeyVal').innerText = credentialsData.credentials.apiKey;
      document.getElementById('endpointVal').innerText = credentialsData.credentials.compatibleEndpoint;
      document.getElementById('hostVal').innerText = credentialsData.credentials.apiHost;
      document.getElementById('dashscopeVal').innerText = credentialsData.credentials.dashScopeEndpoint;
    }
    updateSnippetDisplay();
  }

  function updateSnippetDisplay() {
    if (!credentialsData || !credentialsData.snippets) return;
    const snippet = credentialsData.snippets[activeSnippetTab] || '// No snippet available';
    const codeEl = document.getElementById('snippetCodeBlock');
    codeEl.innerText = snippet;

    if (activeSnippetTab.startsWith('python')) {
      codeEl.className = 'language-python';
    } else if (activeSnippetTab.startsWith('nodejs')) {
      codeEl.className = 'language-javascript';
    } else if (activeSnippetTab === 'powershell') {
      codeEl.className = 'language-powershell';
    } else {
      codeEl.className = 'language-bash';
    }

    if (window.Prism) {
      Prism.highlightElement(codeEl);
    }
  }

  async function loadAgents() {
    try {
      const res = await fetch(getApiUrl('/api/agents'));
      if (res.ok) {
        agents = await res.json();
      } else {
        throw new Error('Not ok');
      }
    } catch (e) {
      try {
        const res2 = await fetch('./data/agents.json');
        if (res2.ok) {
          agents = await res2.json();
        } else {
          throw new Error('Fallback failed');
        }
      } catch (err2) {
        agents = [];
      }
    }
    const localCustom = JSON.parse(localStorage.getItem('pcpuma_custom_agents') || '[]');
    agents = [...agents, ...localCustom];

    if (agents.length > 0) {
      if (!currentAgent) {
        selectAgent(agents[0]);
      }
      renderAgentsList();
    }
  }

  function renderAgentsList() {
    agentsList.innerHTML = '';
    agents.forEach(agent => {
      const isSelected = currentAgent && currentAgent.id === agent.id;
      const item = document.createElement('button');
      item.className = `w-full text-left p-2.5 rounded-xl flex items-center gap-3 transition-all border ${
        isSelected
          ? 'bg-indigo-600/20 border-indigo-500/50 text-white shadow-sm'
          : 'hover:bg-slate-800/80 border-transparent text-slate-300'
      }`;

      let iconName = agent.icon || 'bot';
      if (agent.category === 'code') iconName = 'code-2';
      else if (agent.category === 'compras') iconName = 'file-spreadsheet';
      else if (agent.category === 'admin') iconName = 'briefcase';

      item.innerHTML = `
        <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
        }">
          <i data-lucide="${iconName}" class="w-4 h-4"></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-xs truncate ${isSelected ? 'text-indigo-200' : 'text-slate-200'}">${agent.name}</div>
          <div class="text-[10px] text-slate-400 truncate">${agent.tagline || 'Agente de IA'}</div>
        </div>
      `;

      item.addEventListener('click', () => {
        selectAgent(agent);
        renderAgentsList();
      });

      agentsList.appendChild(item);
    });
    lucide.createIcons();
  }

  function selectAgent(agent) {
    currentAgent = agent;
    currentChat.agentId = agent.id;
    agentBannerName.innerText = agent.name;
    agentBannerTagline.innerText = agent.tagline || '';
    agentBannerCategory.innerText = (agent.category || 'AGENTE').toUpperCase();
    tempValueDisplay.innerText = agent.temperature !== undefined ? agent.temperature : '0.3';
    
    if (agent.model && globalModelSelector) {
      globalModelSelector.value = agent.model;
    }

    renderWelcomeQuickPrompts();
    renderAgentsList();
  }

  function renderWelcomeQuickPrompts() {
    if (!quickPromptsContainer || !currentAgent) return;
    quickPromptsContainer.innerHTML = '';
    const prompts = currentAgent.quickPrompts || [];
    prompts.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'text-left p-3 rounded-xl bg-slate-950/80 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 text-xs text-slate-300 hover:text-white transition-all flex items-start gap-2.5 group shadow-sm';
      btn.innerHTML = `
        <i data-lucide="sparkle" class="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform"></i>
        <span class="line-clamp-2">${p}</span>
      `;
      btn.addEventListener('click', () => {
        messageInput.value = p;
        sendMessage();
      });
      quickPromptsContainer.appendChild(btn);
    });
    lucide.createIcons();
  }

  async function loadChats() {
    try {
      const res = await fetch('/api/chats');
      chatsHistory = await res.json();
      renderChatsHistory();
    } catch (e) {
      console.error('Error loading chats:', e);
    }
  }

  function renderChatsHistory() {
    chatsHistoryList.innerHTML = '';
    if (chatsHistory.length === 0) {
      chatsHistoryList.innerHTML = `
        <div class="text-[11px] text-slate-500 italic p-2 text-center">
          No hay chats archivados
        </div>
      `;
      return;
    }

    chatsHistory.forEach(chat => {
      const isCurrent = currentChat.id === chat.id;
      const el = document.createElement('div');
      el.className = `group flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border ${
        isCurrent ? 'bg-slate-800 border-slate-700 text-white' : 'hover:bg-slate-800/60 border-transparent text-slate-400'
      }`;
      el.innerHTML = `
        <div class="flex items-center gap-2 truncate flex-1">
          <i data-lucide="message-square" class="w-3.5 h-3.5 flex-shrink-0 ${isCurrent ? 'text-amber-400' : 'text-slate-500'}"></i>
          <span class="truncate">${chat.title || 'Conversación'}</span>
        </div>
        <button class="delete-chat-btn opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-slate-500 transition-opacity" title="Eliminar">
          <i data-lucide="trash" class="w-3 h-3"></i>
        </button>
      `;

      el.addEventListener('click', (e) => {
        if (e.target.closest('.delete-chat-btn')) {
          e.stopPropagation();
          deleteChat(chat.id);
          return;
        }
        loadChatSession(chat);
      });

      chatsHistoryList.appendChild(el);
    });
    lucide.createIcons();
  }

  function loadChatSession(chat) {
    currentChat = JSON.parse(JSON.stringify(chat));
    if (chat.agentId) {
      const found = agents.find(a => a.id === chat.agentId);
      if (found) selectAgent(found);
    }
    renderMessages();
    renderChatsHistory();
  }

  async function deleteChat(id) {
    try {
      await fetch(`/api/chats/${id}`, { method: 'DELETE' });
      chatsHistory = chatsHistory.filter(c => c.id !== id);
      if (currentChat.id === id) {
        startNewChat();
      } else {
        renderChatsHistory();
      }
      showToast('Conversación eliminada');
    } catch (e) {
      console.error(e);
    }
  }

  function startNewChat() {
    currentChat = {
      id: 'chat-' + Date.now(),
      title: 'Nueva Conversación',
      messages: [],
      agentId: currentAgent ? currentAgent.id : null
    };
    renderMessages();
    renderChatsHistory();
    messageInput.focus();
  }

  function renderMessages() {
    chatMessages.innerHTML = '';

    if (currentChat.messages.length === 0) {
      chatMessages.appendChild(welcomeCard);
      renderWelcomeQuickPrompts();
      return;
    }

    currentChat.messages.forEach((msg, idx) => {
      appendMessageToDOM(msg, idx);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function appendMessageToDOM(msg, idx) {
    const isUser = msg.role === 'user';
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex gap-3 max-w-4xl mx-auto ${isUser ? 'justify-end' : 'justify-start'}`;

    if (isUser) {
      msgDiv.innerHTML = `
        <div class="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md text-sm leading-relaxed whitespace-pre-wrap">
          ${escapeHtml(msg.content)}
        </div>
        <div class="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 flex-shrink-0 mt-1">
          <i data-lucide="user" class="w-4 h-4"></i>
        </div>
      `;
    } else {
      const parsedContent = marked.parse(msg.content);
      msgDiv.innerHTML = `
        <div class="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 flex-shrink-0 mt-1 shadow-sm">
          <i data-lucide="sparkles" class="w-4 h-4"></i>
        </div>
        <div class="max-w-[92%] sm:max-w-[85%] rounded-2xl px-5 py-4 bg-slate-900 border border-slate-800 shadow-md">
          <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/80 text-[11px] text-slate-400">
            <span class="font-medium text-slate-300 flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              ${currentAgent ? currentAgent.name : 'PCPUMA AI'}
            </span>
            <div class="flex items-center gap-2">
              <button class="copy-msg-btn hover:text-white transition-colors" data-content="${encodeURIComponent(msg.content)}" title="Copiar texto completo">
                <i data-lucide="copy" class="w-3.5 h-3.5"></i>
              </button>
              <button class="download-msg-btn hover:text-white transition-colors" data-content="${encodeURIComponent(msg.content)}" title="Descargar como Documento .md">
                <i data-lucide="file-down" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
          <div class="markdown-body">
            ${parsedContent}
          </div>
        </div>
      `;
    }

    chatMessages.appendChild(msgDiv);
    lucide.createIcons();
    if (window.Prism) {
      Prism.highlightAllUnder(msgDiv);
    }

    msgDiv.querySelectorAll('.copy-msg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = decodeURIComponent(btn.getAttribute('data-content'));
        navigator.clipboard.writeText(text);
        showToast('Texto copiado al portapapeles');
      });
    });

    msgDiv.querySelectorAll('.download-msg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = decodeURIComponent(btn.getAttribute('data-content'));
        downloadFile(`PCPUMA_Documento_${Date.now()}.md`, text);
        showToast('Documento descargado con éxito');
      });
    });
  }

  async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || isGenerating) return;

    messageInput.value = '';
    messageInput.style.height = 'auto';

    if (currentChat.messages.length === 0 && welcomeCard.parentNode) {
      welcomeCard.remove();
      currentChat.title = text.length > 32 ? text.substring(0, 32) + '...' : text;
    }

    const userMsg = { role: 'user', content: text };
    currentChat.messages.push(userMsg);
    appendMessageToDOM(userMsg, currentChat.messages.length - 1);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    isGenerating = true;
    sendBtn.disabled = true;

    const assistantMsgDiv = document.createElement('div');
    assistantMsgDiv.className = 'flex gap-3 max-w-4xl mx-auto justify-start';
    assistantMsgDiv.innerHTML = `
      <div class="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 flex-shrink-0 mt-1 shadow-sm">
        <i data-lucide="sparkles" class="w-4 h-4 animate-pulse"></i>
      </div>
      <div class="max-w-[92%] sm:max-w-[85%] rounded-2xl px-5 py-4 bg-slate-900 border border-slate-800 shadow-md">
        <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/80 text-[11px] text-slate-400">
          <span class="font-medium text-slate-300 flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
            ${currentAgent ? currentAgent.name : 'PCPUMA AI'}
          </span>
          <span class="text-[10px] text-slate-500 font-mono">Generando...</span>
        </div>
        <div class="markdown-body stream-content">
          <span class="typing-cursor"></span>
        </div>
      </div>
    `;
    chatMessages.appendChild(assistantMsgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    lucide.createIcons();

    const streamContentEl = assistantMsgDiv.querySelector('.stream-content');
    let fullResponseText = '';

    const systemPrompt = currentAgent ? currentAgent.systemPrompt : 'Eres PCPUMA AI, asistente experto.';
    const model = globalModelSelector ? globalModelSelector.value : (currentAgent?.model || 'qwen-plus');
    const temperature = currentAgent ? currentAgent.temperature : 0.3;

    const messagesToSend = [
      { role: 'system', content: systemPrompt },
      ...currentChat.messages
    ];

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          temperature,
          messages: messagesToSend,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            if (dataStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                fullResponseText += `\n**Error:** ${parsed.error}`;
                streamContentEl.innerHTML = marked.parse(fullResponseText);
                break;
              }
              const delta = parsed.choices?.[0]?.delta?.content || '';
              fullResponseText += delta;
              streamContentEl.innerHTML = marked.parse(fullResponseText) + '<span class="typing-cursor"></span>';
              chatMessages.scrollTop = chatMessages.scrollHeight;
            } catch (e) {}
          }
        }
      }

      streamContentEl.innerHTML = marked.parse(fullResponseText);
      const assistantMsg = { role: 'assistant', content: fullResponseText };
      currentChat.messages.push(assistantMsg);

      await saveCurrentChat();

      assistantMsgDiv.remove();
      appendMessageToDOM(assistantMsg, currentChat.messages.length - 1);
      chatMessages.scrollTop = chatMessages.scrollHeight;

    } catch (err) {
      console.error('Error generating chat:', err);
      streamContentEl.innerHTML = `<span class="text-red-400">Error al comunicarse con la API: ${err.message}</span>`;
    } finally {
      isGenerating = false;
      sendBtn.disabled = false;
    }
  }

  async function saveCurrentChat() {
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentChat)
      });
      const saved = await res.json();
      currentChat = saved;

      const idx = chatsHistory.findIndex(c => c.id === saved.id);
      if (idx >= 0) {
        chatsHistory[idx] = saved;
      } else {
        chatsHistory.unshift(saved);
      }
      renderChatsHistory();
    } catch (e) {
      console.error('Failed to save chat session:', e);
    }
  }

  async function handleCreateAgent(e) {
    e.preventDefault();
    const name = document.getElementById('newAgentName').value.trim();
    const tagline = document.getElementById('newAgentTagline').value.trim();
    const category = document.getElementById('newAgentCategory').value;
    const model = document.getElementById('newAgentModel').value;
    const temperature = parseFloat(document.getElementById('newAgentTemp').value);
    const systemPrompt = document.getElementById('newAgentSystemPrompt').value.trim();
    const quickPromptsRaw = document.getElementById('newAgentQuickPrompts').value.trim();

    if (!name || !systemPrompt) {
      alert('Por favor completa el nombre y las instrucciones del sistema.');
      return;
    }

    const quickPrompts = quickPromptsRaw
      ? quickPromptsRaw.split('\n').map(p => p.trim()).filter(p => p.length > 0)
      : ['¿En qué me puedes apoyar?', 'Dame un ejemplo de tu trabajo'];

    const newAgentPayload = {
      name,
      tagline,
      category,
      model,
      temperature,
      systemPrompt,
      quickPrompts,
      icon: category === 'code' ? 'code-2' : (category === 'compras' ? 'file-spreadsheet' : 'briefcase')
    };

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgentPayload)
      });
      const createdAgent = await res.json();
      agents.push(createdAgent);
      createAgentModal.classList.add('hidden');
      createAgentForm.reset();
      selectAgent(createdAgent);
      startNewChat();
      showToast(`¡Agente ${name} creado con éxito!`);
    } catch (err) {
      alert('Error creando agente: ' + err.message);
    }
  }

  function exportChatAsDocument() {
    if (currentChat.messages.length === 0) {
      alert('No hay mensajes para exportar aún.');
      return;
    }

    let doc = `# PCPUMA AI - Documento Generado\n`;
    doc += `**Agente:** ${currentAgent ? currentAgent.name : 'PCPUMA AI'}\n`;
    doc += `**Fecha:** ${new Date().toLocaleString()}\n`;
    doc += `**Modelo:** ${globalModelSelector.value}\n\n`;
    doc += `---\n\n`;

    currentChat.messages.forEach(m => {
      if (m.role === 'user') {
        doc += `### Solicitud de Usuario:\n${m.content}\n\n`;
      } else {
        doc += `### Respuesta PCPUMA:\n${m.content}\n\n---\n\n`;
      }
    });

    downloadFile(`PCPUMA_${currentChat.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`, doc);
    showToast('Documento exportado en formato Markdown');
  }

  function downloadFile(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/markdown;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  function showToast(msg) {
    toastMessage.innerText = msg;
    toast.classList.remove('translate-y-20', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
    setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
  }

  function escapeHtml(string) {
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return String(string).replace(/[&<>"']/g, s => entityMap[s]);
  }
});