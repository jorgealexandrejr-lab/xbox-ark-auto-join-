(function() {
  if (window.xboxMacroActive !== undefined) {
    const existingPanel = document.getElementById('xbox-macro-panel');
    if (existingPanel) existingPanel.remove();
    window.xboxMacroActive = false;
    if (window.stopXboxMacro) window.stopXboxMacro();
  }

  window.xboxMacroActive = false;
  let delayAfterX = 4000;
  let delayAfterB = 2000;
  let pressDuration = 150;
  let attemptCount = 0;
  let macroTimeoutId = null;
  let currentReject = null;

  const virtualButtons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
  const virtualAxes = [0, 0, 0, 0];

  const nativeGetGamepads = navigator.getGamepads.bind(navigator);

  navigator.getGamepads = function() {
    const realGamepads = nativeGetGamepads();
    const result = [];
    const realGp = realGamepads ? realGamepads[0] : null;
    
    let mockGp;
    if (realGp) {
      mockGp = {
        id: realGp.id,
        index: realGp.index,
        connected: realGp.connected,
        timestamp: performance.now(),
        mapping: realGp.mapping || "standard",
        axes: [...realGp.axes],
        buttons: realGp.buttons.map((b, i) => {
          if (virtualButtons[i].pressed) {
            return { pressed: true, touched: true, value: 1.0 };
          }
          return { pressed: b.pressed, touched: b.touched, value: b.value };
        })
      };
    } else {
      mockGp = {
        id: "Xbox Wireless Controller (Virtual Antigravity)",
        index: 0,
        connected: true,
        timestamp: performance.now(),
        mapping: "standard",
        axes: [...virtualAxes],
        buttons: virtualButtons.map(b => ({ ...b }))
      };
    }
    
    result.push(mockGp);
    
    if (realGamepads) {
      for (let i = 1; i < realGamepads.length; i++) {
        if (realGamepads[i]) result.push(realGamepads[i]);
      }
    }
    
    return result;
  };

  try {
    const mockGp = navigator.getGamepads()[0];
    const event = new GamepadEvent('gamepadconnected', { gamepad: mockGp });
    window.dispatchEvent(event);
  } catch (e) {}

  const styleEl = document.createElement('style');
  styleEl.id = 'xbox-macro-style';
  styleEl.innerHTML = `
    #xbox-macro-panel {
      position: fixed;
      top: 30px;
      right: 30px;
      width: 330px;
      background: rgba(18, 18, 22, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05);
      color: #e2e8f0;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: 9999999;
      padding: 24px;
      user-select: none;
      transition: border-color 0.3s, box-shadow 0.3s;
    }
    #xbox-macro-panel:hover {
      border-color: rgba(16, 124, 16, 0.4);
      box-shadow: 0 15px 45px rgba(0, 0, 0, 0.6), 0 0 20px rgba(16, 124, 16, 0.15);
    }
    #xbox-macro-launcher {
      position: fixed;
      top: 30px;
      right: 30px;
      width: 44px;
      height: 44px;
      background: rgba(18, 18, 22, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(16, 124, 16, 0.4);
      border-radius: 50%;
      display: none;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      cursor: pointer;
      z-index: 9999999;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
      user-select: none;
    }
    #xbox-macro-launcher:hover {
      transform: scale(1.1);
      box-shadow: 0 0 15px rgba(16, 124, 16, 0.6);
      border-color: rgba(16, 124, 16, 0.8);
    }
    .xbox-close-btn {
      font-size: 1.4rem;
      cursor: pointer;
      color: #64748b;
      transition: color 0.2s;
      line-height: 1;
      padding: 0 4px;
      user-select: none;
    }
    .xbox-close-btn:hover {
      color: #ef4444;
    }
    .xbox-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      cursor: move;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .xbox-title {
      font-weight: 700;
      font-size: 1.1rem;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .xbox-logo-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #107c10;
      box-shadow: 0 0 8px #107c10;
    }
    .xbox-logo-dot.running {
      background: #10b981;
      box-shadow: 0 0 12px #10b981;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
    .xbox-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .xbox-stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.03);
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.02);
    }
    .xbox-stat-label {
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .xbox-stat-val {
      font-weight: 600;
      font-size: 0.95rem;
    }
    .xbox-input-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .xbox-input-label {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .xbox-input-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .xbox-input {
      flex: 1;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 8px 12px;
      color: #fff;
      font-size: 0.9rem;
      font-family: inherit;
      outline: none;
    }
    .xbox-input:focus {
      border-color: #107c10;
    }
    .xbox-btn {
      width: 100%;
      background: linear-gradient(135deg, #107c10 0%, #0d5f0d 100%);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 12px;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(16, 124, 16, 0.3);
      transition: all 0.2s;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
    }
    .xbox-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(16, 124, 16, 0.4);
      background: linear-gradient(135deg, #128c12 0%, #107c10 100%);
    }
    .xbox-btn:active {
      transform: translateY(1px);
    }
    .xbox-btn.running {
      background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
    .xbox-btn.running:hover {
      background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
      box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
    }
    .xbox-footer-tip {
      font-size: 0.72rem;
      color: #64748b;
      text-align: center;
      line-height: 1.4;
      margin-top: 8px;
    }
    .xbox-footer-tip code {
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 4px;
      border-radius: 4px;
      font-family: monospace;
      color: #e2e8f0;
    }
    
    .xbox-controller-sim {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-top: 10px;
    }
    .xbox-sim-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 0.85rem;
      color: rgba(255,255,255,0.3);
      transition: all 0.15s;
    }
    .xbox-sim-btn.btn-x.active {
      background: #2563eb;
      color: white;
      border-color: #2563eb;
      box-shadow: 0 0 10px rgba(37, 99, 235, 0.6);
      transform: scale(1.1);
    }
    .xbox-sim-btn.btn-b.active {
      background: #dc2626;
      color: white;
      border-color: #dc2626;
      box-shadow: 0 0 10px rgba(220, 38, 38, 0.6);
      transform: scale(1.1);
    }
  `;

  const panel = document.createElement('div');
  panel.id = 'xbox-macro-panel';
  panel.innerHTML = `
    <div class="xbox-header" id="xbox-macro-header">
      <div class="xbox-title">
        <span class="xbox-logo-dot" id="xbox-status-dot"></span>
        Xbox - Ark Auto Join
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 0.75rem; color: #64748b;">v1.3</span>
        <div id="xbox-btn-close" class="xbox-close-btn" title="Minimizar (F2)">×</div>
      </div>
    </div>
    <div class="xbox-body">
      <div class="xbox-stat-row">
        <span class="xbox-stat-label">Status:</span>
        <span class="xbox-stat-val" id="xbox-txt-status" style="color: #94a3b8;">Parado</span>
      </div>
      
      <div class="xbox-stat-row">
        <span class="xbox-stat-label">Tentativas:</span>
        <span class="xbox-stat-val" id="xbox-txt-attempts" style="color: #107c10;">0</span>
      </div>

      <div class="xbox-controller-sim">
        <div id="sim-btn-x" class="xbox-sim-btn btn-x">X</div>
        <div id="sim-btn-b" class="xbox-sim-btn btn-b">B</div>
      </div>

      <div class="xbox-input-group">
        <label class="xbox-input-label">Espera após X (Conexão / Erro)</label>
        <div class="xbox-input-row">
          <input type="number" id="xbox-in-delayx" class="xbox-input" value="4.0" step="0.5" min="1.0">
          <span style="font-size: 0.85rem; color: #64748b;">segundos</span>
        </div>
      </div>

      <div class="xbox-input-group">
        <label class="xbox-input-label">Espera após B (Fechar Pop-up)</label>
        <div class="xbox-input-row">
          <input type="number" id="xbox-in-delayb" class="xbox-input" value="2.0" step="0.5" min="0.5">
          <span style="font-size: 0.85rem; color: #64748b;">segundos</span>
        </div>
      </div>

      <button id="xbox-btn-toggle" class="xbox-btn">
        <svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        Iniciar Macro
      </button>

      <div class="xbox-footer-tip">
        Pressione <code>ESC</code> ou <code>ESPAÇO</code> no teclado para PARAR o macro instantaneamente.
      </div>
    </div>
  `;

  const launcher = document.createElement('div');
  launcher.id = 'xbox-macro-launcher';
  launcher.innerHTML = '🎮';
  launcher.title = 'Abrir Painel Auto-Join (F2)';

  function checkAndInject() {
    if (!document.getElementById('xbox-macro-style')) {
      document.head.appendChild(styleEl);
    }
    if (!document.getElementById('xbox-macro-panel')) {
      document.body.appendChild(panel);
    }
    if (!document.getElementById('xbox-macro-launcher')) {
      document.body.appendChild(launcher);
    }
  }

  // Rodar contínuo para persistir contra navegação React (SPA)
  checkAndInject();
  setInterval(checkAndInject, 1000);

  const statusDot = document.getElementById('xbox-status-dot');
  const txtStatus = document.getElementById('xbox-txt-status');
  const txtAttempts = document.getElementById('xbox-txt-attempts');
  const btnToggle = document.getElementById('xbox-btn-toggle');
  const inDelayX = document.getElementById('xbox-in-delayx');
  const inDelayB = document.getElementById('xbox-in-delayb');
  const simBtnX = document.getElementById('sim-btn-x');
  const simBtnB = document.getElementById('sim-btn-b');

  function updateUIState(state, statusText) {
    txtStatus.innerText = statusText;
    if (state === 'idle') {
      statusDot.className = 'xbox-logo-dot';
      txtStatus.style.color = '#94a3b8';
      btnToggle.className = 'xbox-btn';
      btnToggle.innerHTML = `<svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Iniciar Macro`;
    } else if (state === 'running') {
      statusDot.className = 'xbox-logo-dot running';
      txtStatus.style.color = '#10b981';
      btnToggle.className = 'xbox-btn running';
      btnToggle.innerHTML = `<svg style="width:16px;height:16px;fill:currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Parar Macro`;
    } else if (state === 'pressing_x') {
      txtStatus.innerText = "Pressionando X...";
      txtStatus.style.color = '#3b82f6';
      simBtnX.classList.add('active');
    } else if (state === 'pressing_b') {
      txtStatus.innerText = "Pressionando B...";
      txtStatus.style.color = '#ef4444';
      simBtnB.classList.add('active');
    }
  }

  const header = document.getElementById('xbox-macro-header');
  let isDragging = false;
  let startX, startY, initialX, initialY;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    panel.style.transition = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = `${initialX + dx}px`;
    panel.style.top = `${initialY + dy}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      panel.style.transition = 'border-color 0.3s, box-shadow 0.3s';
    }
  });

  const sleep = (ms) => new Promise((resolve, reject) => {
    currentReject = reject;
    macroTimeoutId = setTimeout(() => {
      currentReject = null;
      resolve();
    }, ms);
  });

  function startMacro() {
    delayAfterX = parseFloat(inDelayX.value) * 1000;
    delayAfterB = parseFloat(inDelayB.value) * 1000;
    if (isNaN(delayAfterX) || delayAfterX < 1000) delayAfterX = 1000;
    if (isNaN(delayAfterB) || delayAfterB < 500) delayAfterB = 500;
    window.xboxMacroActive = true;
    attemptCount = 0;
    txtAttempts.innerText = "0";
    updateUIState('running', 'Iniciando...');
    runMacroLoop();
  }

  function stopMacro() {
    window.xboxMacroActive = false;
    if (macroTimeoutId) {
      clearTimeout(macroTimeoutId);
      macroTimeoutId = null;
    }
    if (currentReject) {
      currentReject(new Error("Stopped"));
      currentReject = null;
    }
    virtualButtons.forEach(btn => {
      btn.pressed = false;
      btn.value = 0.0;
    });
    simBtnX.classList.remove('active');
    simBtnB.classList.remove('active');
    updateUIState('idle', 'Parado');
  }

  window.stopXboxMacro = stopMacro;

  async function runMacroLoop() {
    while (window.xboxMacroActive) {
      try {
        updateUIState('pressing_x');
        virtualButtons[2].pressed = true;
        virtualButtons[2].value = 1.0;
        await sleep(pressDuration);
        
        virtualButtons[2].pressed = false;
        virtualButtons[2].value = 0.0;
        simBtnX.classList.remove('active');
        
        updateUIState('running', `Aguardando pós-X (${(delayAfterX/1000).toFixed(1)}s)...`);
        await sleep(delayAfterX);
        if (!window.xboxMacroActive) break;

        updateUIState('pressing_b');
        virtualButtons[1].pressed = true;
        virtualButtons[1].value = 1.0;
        await sleep(pressDuration);
        
        virtualButtons[1].pressed = false;
        virtualButtons[1].value = 0.0;
        simBtnB.classList.remove('active');
        
        updateUIState('running', `Aguardando pós-B (${(delayAfterB/1000).toFixed(1)}s)...`);
        await sleep(delayAfterB);
        if (!window.xboxMacroActive) break;

        attemptCount++;
        txtAttempts.innerText = attemptCount;
      } catch (err) {
        if (err.message === "Stopped") break;
        console.error("Erro no loop:", err);
        stopMacro();
        break;
      }
    }
  }

  function toggleVisibility() {
    const isHidden = panel.style.display === 'none';
    if (isHidden) {
      panel.style.display = 'block';
      launcher.style.display = 'none';
    } else {
      panel.style.display = 'none';
      launcher.style.display = 'flex';
    }
  }

  btnToggle.addEventListener('click', () => {
    if (window.xboxMacroActive) stopMacro();
    else startMacro();
  });

  document.getElementById('xbox-btn-close').addEventListener('click', toggleVisibility);
  launcher.addEventListener('click', toggleVisibility);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
      e.preventDefault();
      e.stopPropagation();
      toggleVisibility();
    }
    if (window.xboxMacroActive) {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        stopMacro();
        console.log("Macro parado via teclado!");
      }
    }
  }, true);

  console.log("Xbox Server Auto-Join Antigravity injetado com sucesso!");
})();
