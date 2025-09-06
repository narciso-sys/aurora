function showLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.remove('hidden');
  } else {
    console.warn("Elemento de loading não encontrado.");
  }
}

function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
  } else {
    console.warn("Elemento de loading não encontrado.");
  }
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.warn("Elemento de toast não encontrado.");
    return;
  }
  
  // Ícone baseado no tipo
  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'alert-circle';
  if (type === 'warning') icon = 'alert-triangle';
  
  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;
  
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
  
  // Atualizar ícones
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function formatCurrency(amount) {
  try {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      throw new Error('Valor inválido para formatação de moeda.');
    }
    return `A$ ${parsedAmount.toFixed(2).replace('.', ',')}`;
  } catch (error) {
    console.error("Erro ao formatar moeda:", error.message);
    return `A$ 0,00`;
  }
}

// Função para criar modais
function createModal(title, content, buttons = []) {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    backdrop-filter: blur(5px);
  `;
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.cssText = `
    background: linear-gradient(135deg, rgba(10, 25, 47, 0.98), rgba(30, 58, 138, 0.98));
    padding: 2.5rem;
    border-radius: 20px;
    box-shadow: 0 0 40px rgba(0, 180, 216, 0.6);
    border: 2px solid rgba(0, 180, 216, 0.3);
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
  `;
  
  modal.innerHTML = `
    <div class="modal-header">
      <h3 style="color: var(--primary); margin-bottom: 1.5rem; display: flex; align-items: center; gap: 10px;">
        <i data-lucide="${title.icon || 'info'}"></i> ${title.text}
      </h3>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
        <i data-lucide="x"></i>
      </button>
    </div>
    <div class="modal-content">${content}</div>
    <div class="modal-actions" style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: flex-end;">
      ${buttons.map(btn => `
        <button class="${btn.class}" onclick="${btn.onclick}">
          <i data-lucide="${btn.icon}"></i> ${btn.text}
        </button>
      `).join('')}
    </div>
  `;
  
  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);
  
  // Fechar modal ao clicar fora
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });
  
  // Atualizar ícones
  setTimeout(() => {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }, 100);
  
  return modalOverlay;
}
// Adicione no início do ui.js
const safeSessionStorage = {
  setItem: (key, value) => {
    try {
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('SessionStorage não disponível, usando fallback');
      // Pode usar um objeto em memória como fallback
      window._sessionStorageFallback = window._sessionStorageFallback || {};
      window._sessionStorageFallback[key] = value;
    }
  },
  getItem: (key) => {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return window._sessionStorageFallback ? window._sessionStorageFallback[key] : null;
    }
  },
  removeItem: (key) => {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      if (window._sessionStorageFallback) {
        delete window._sessionStorageFallback[key];
      }
    }
  }
};