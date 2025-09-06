async function renderCards() {
  if (!window.userSessionManager.currentUser || !window.userSessionManager.currentUser.uid) {
    showToast('Faça login primeiro.', 'warning');
    window.navigateTo('#');
    return;
  }

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="cards-section fade-in-up">
      <button class="back-btn" onclick="window.goBack()"><i data-lucide="arrow-left"></i> Voltar</button>
      <h2><i data-lucide="credit-card"></i> Meus Cartões 💳</h2>
      
      <div class="cards-grid">
        <div class="card-item virtual">
          <div class="card-header">
            <div class="card-chip">
              <i data-lucide="cpu"></i>
            </div>
            <div class="card-logo">
              <span>Aurora</span>
            </div>
          </div>
          <div class="card-number">
            <span>**** **** **** 1234</span>
          </div>
          <div class="card-footer">
            <div class="card-holder">
              <small>Titular</small>
              <span>${window.userSessionManager.currentUser.username}</span>
            </div>
            <div class="card-expiry">
              <small>Expira</small>
              <span>12/28</span>
            </div>
          </div>
          <div class="card-type">
            <i data-lucide="wifi"></i>
            <span>Virtual</span>
          </div>
        </div>
        
        <div class="card-actions">
          <button onclick="showCardDetails()" class="card-btn">
            <i data-lucide="eye"></i> Ver Detalhes
          </button>
          <button onclick="generateNewCard()" class="card-btn">
            <i data-lucide="refresh-cw"></i> Gerar Novo Cartão
          </button>
          <button onclick="manageCardLimits()" class="card-btn">
            <i data-lucide="settings"></i> Gerenciar Limites
          </button>
        </div>
      </div>
      
      <div class="transactions-section">
        <h3><i data-lucide="history"></i> Últimas Transações do Cartão</h3>
        <div id="cardTransactions">
          <p><i data-lucide="loader"></i> Carregando transações...</p>
        </div>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }

  loadCardTransactions();
}

function showCardDetails() {
  const modalContent = `
    <div class="card-details">
      <h3>Detalhes do Cartão Virtual</h3>
      <div class="detail-item">
        <label>Número do Cartão</label>
        <p>4111 1111 1111 1234</p>
      </div>
      <div class="detail-item">
        <label>Nome do Titular</label>
        <p>${window.userSessionManager.currentUser.username}</p>
      </div>
      <div class="detail-item">
        <label>Data de Validade</label>
        <p>12/2028</p>
      </div>
      <div class="detail-item">
        <label>CVV</label>
        <p>123</p>
      </div>
      <div class="detail-item">
        <label>Limite Disponível</label>
        <p>${formatCurrency(5000)}</p>
      </div>
      <div class="security-note">
        <i data-lucide="shield"></i>
        <p>Seus dados estão protegidos por criptografia de alta segurança.</p>
      </div>
    </div>
  `;
  
  createModal(
    { text: 'Detalhes do Cartão', icon: 'credit-card' },
    modalContent,
    [
      {
        text: 'Fechar',
        icon: 'x',
        class: 'secondary-btn',
        onclick: 'this.closest(\'.modal-overlay\').remove()'
      }
    ]
  );
}

function generateNewCard() {
  showToast('Funcionalidade de gerar novo cartão em desenvolvimento!', 'info');
}

function manageCardLimits() {
  showToast('Funcionalidade de gerenciar limites em desenvolvimento!', 'info');
}

async function loadCardTransactions() {
  const transactionsContainer = document.getElementById('cardTransactions');
  if (!transactionsContainer) return;
  
  try {
    const uid = window.userSessionManager.currentUser.uid;
    const snapshot = await window.database.ref(`users/${uid}/transactions`).once('value');
    
    if (!snapshot.exists()) {
      transactionsContainer.innerHTML = '<p>Nenhuma transação com cartão encontrada.</p>';
      return;
    }
    
    const transactions = snapshot.val();
    const cardTransactions = Object.entries(transactions)
      .map(([id, transaction]) => ({ id, ...transaction }))
      .filter(t => t.type === 'card_payment')
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5); // Mostrar apenas as 5 últimas
    
    if (cardTransactions.length === 0) {
      transactionsContainer.innerHTML = '<p>Nenhuma transação com cartão encontrada.</p>';
      return;
    }
    
    transactionsContainer.innerHTML = cardTransactions.map(transaction => {
      const date = new Date(transaction.timestamp).toLocaleString('pt-BR');
      return `
        <div class="transaction-item">
          <div class="transaction-icon">
            <i data-lucide="shopping-bag"></i>
          </div>
          <div class="transaction-details">
            <h4>${transaction.merchant || 'Compra no cartão'}</h4>
            <p>${date}</p>
          </div>
          <div class="transaction-amount negative">
            - ${formatCurrency(transaction.amount)}
          </div>
        </div>
      `;
    }).join('');
    
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (error) {
    console.error("Erro ao carregar transações do cartão:", error);
    transactionsContainer.innerHTML = '<p>Erro ao carregar transações.</p>';
  }
}