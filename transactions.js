async function renderTransactions() {
  if (!window.userSessionManager.currentUser || !window.userSessionManager.currentUser.uid) {
    showToast('Faça login primeiro.', 'warning');
    window.navigateTo('#');
    return;
  }

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="transactions-section fade-in-up">
      <button class="back-btn" onclick="window.goBack()"><i data-lucide="arrow-left"></i> Voltar</button>
      <h2><i data-lucide="repeat"></i> Transações 💲</h2>
      
      <div class="transfer-section">
        <h3><i data-lucide="zap"></i> Transferência PIX</h3>
        <div class="transfer-form">
          <input type="text" id="pixKey" placeholder="Chave PIX (email ou personalizada)" required>
          <p id="pixRecipient" style="color: #0d47a1; margin: 0.5rem 0;"></p>
          <input type="number" id="pixAmount" placeholder="Valor (A$)" min="0.01" step="0.01" required>
          <button id="pixBtn"><i data-lucide="send"></i> Enviar PIX</button>
        </div>
      </div>

      <div class="transfer-section">
        <h3><i data-lucide="globe"></i> Transferência IBAN</h3>
        <div class="transfer-form">
          <input type="text" id="iban" placeholder="IBAN do destinatário" required>
          <p id="ibanRecipient" style="color: #0d47a1; margin: 0.5rem 0;"></p>
          <input type="number" id="ibanAmount" placeholder="Valor (A$)" min="0.01" step="0.01" required>
          <button id="ibanBtn"><i data-lucide="send"></i> Enviar IBAN</button>
        </div>
      </div>

      <div class="transactions-list">
        <h3><i data-lucide="history"></i> Histórico de Transações</h3>
        <div id="transactionsHistory">
          <p><i data-lucide="loader"></i> A carregar histórico...</p>
        </div>
      </div>
      
      <button id="analyzeExpensesBtn" class="ai-analysis-btn">
        <i data-lucide="bot"></i>
        <span>Analisar Despesas com IA</span>
      </button>
    </div>
  `;

  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }

  // Adicionar listeners para validação em tempo real
  document.getElementById('pixKey').addEventListener('input', validatePixKey);
  document.getElementById('iban').addEventListener('input', validateIban);
  document.getElementById('pixBtn').addEventListener('click', sendPIX);
  document.getElementById('ibanBtn').addEventListener('click', sendIBAN);
  document.getElementById('analyzeExpensesBtn').addEventListener('click', analyzeExpensesWithAI);

  loadTransactionHistory();
  setupRealtimeListener();
}

async function validatePixKey() {
  const pixKey = document.getElementById('pixKey').value.trim();
  const pixRecipient = document.getElementById('pixRecipient');
  if (!pixKey) {
    pixRecipient.textContent = '';
    return;
  }

  try {
    const snapshot = await window.database.ref('users').orderByChild('pixKeys').once('value');
    let recipientFound = false;
    
    if (snapshot.exists()) {
      snapshot.forEach(child => {
        const userData = child.val();
        if (userData.pixKeys && userData.pixKeys.includes(pixKey)) {
          pixRecipient.textContent = `Destinatário: ${userData.username}`;
          pixRecipient.style.color = '#10b981';
          recipientFound = true;
          return true; // Break the loop
        }
      });
    }
    
    if (!recipientFound) {
      pixRecipient.textContent = 'Destinatário não encontrado.';
      pixRecipient.style.color = '#ef4444';
    }
  } catch (error) {
    console.error("Erro ao validar chave PIX:", error);
    pixRecipient.textContent = 'Erro ao verificar destinatário.';
    pixRecipient.style.color = '#ef4444';
  }
}

async function validateIban() {
  const iban = document.getElementById('iban').value.trim();
  const ibanRecipient = document.getElementById('ibanRecipient');
  if (!iban) {
    ibanRecipient.textContent = '';
    return;
  }

  try {
    const snapshot = await window.database.ref('users').orderByChild('iban').equalTo(iban).once('value');
    if (snapshot.exists()) {
      const recipientUid = Object.keys(snapshot.val())[0];
      const recipientUsername = snapshot.val()[recipientUid].username;
      ibanRecipient.textContent = `Destinatário: ${recipientUsername}`;
      ibanRecipient.style.color = '#10b981';
    } else {
      ibanRecipient.textContent = 'Destinatário não encontrado.';
      ibanRecipient.style.color = '#ef4444';
    }
  } catch (error) {
    console.error("Erro ao validar IBAN:", error);
    ibanRecipient.textContent = 'Erro ao verificar destinatário.';
    ibanRecipient.style.color = '#ef4444';
  }
}

function setupRealtimeListener() {
  const uid = window.userSessionManager.currentUser.uid;
  if (!uid) {
    console.error("UID do usuário não definido.");
    showToast('Erro: Usuário não identificado.', 'error');
    window.navigateTo('#');
    return;
  }

  const userRef = window.database.ref(`users/${uid}`);
  
  userRef.child('balance').on('value', (snapshot) => {
    const newBalance = snapshot.val();
    if (newBalance !== window.userSessionManager.currentUser.balance) {
      window.userSessionManager.currentUser.balance = newBalance;
      if (window.location.hash === '#dashboard') {
        renderDashboard();
      }
    }
  });
  
  userRef.child('gameBalance').on('value', (snapshot) => {
    const newGameBalance = snapshot.val();
    if (newGameBalance !== window.userSessionManager.currentUser.gameBalance) {
      window.userSessionManager.currentUser.gameBalance = newGameBalance;
      if (window.location.hash === '#dashboard') {
        renderDashboard();
      }
    }
  });
  
  userRef.child('transactions').on('child_added', () => {
    loadTransactionHistory();
  });
}

async function sendPIX() {
  const pixKey = document.getElementById('pixKey').value.trim();
  const amountStr = document.getElementById('pixAmount').value;
  const amount = parseFloat(amountStr);

  if (!pixKey || !amountStr || isNaN(amount) || amount <= 0) {
    showToast('Preencha todos os campos corretamente.', 'error');
    return;
  }

  showLoading();

  try {
    const senderUid = window.userSessionManager.currentUser.uid;
    if (!senderUid) {
      showToast('Erro: Usuário não identificado.', 'error');
      window.navigateTo('#');
      return;
    }

    const senderRef = window.database.ref(`users/${senderUid}`);
    const snapshot = await senderRef.child('balance').once('value');
    const currentBalance = snapshot.val() || 0;
    window.userSessionManager.currentUser.balance = currentBalance;

    if (amount > currentBalance) {
      showToast(`Saldo insuficiente. Saldo atual: ${formatCurrency(currentBalance)}`, 'error');
      hideLoading();
      return;
    }

    let recipientSnapshot = await window.database.ref('users').once('value');
    let recipientUid = null;
    let recipientUsername = null;
    
    if (recipientSnapshot.exists()) {
      recipientSnapshot.forEach(child => {
        const userData = child.val();
        if (userData.pixKeys && userData.pixKeys.includes(pixKey)) {
          recipientUid = child.key;
          recipientUsername = userData.username;
          return true; // Break the loop
        }
      });
    }
    
    if (!recipientUid) {
      showToast('Destinatário não encontrado com esta chave PIX.', 'error');
      hideLoading();
      return;
    }

    if (recipientUid === senderUid) {
      showToast('Não é possível transferir para si mesmo.', 'error');
      hideLoading();
      return;
    }

    // Confirmar transferência
    const confirmSend = confirm(`Enviar ${formatCurrency(amount)} via PIX para ${recipientUsername}?`);
    if (!confirmSend) {
      showToast('Transferência cancelada.', 'info');
      hideLoading();
      return;
    }

    const recipientRef = window.database.ref(`users/${recipientUid}`);

    // Usar transaction para garantir atomicidade
    const transactionResult = await senderRef.transaction((senderData) => {
      if (!senderData || senderData.balance < amount) {
        return; // Abortar se saldo insuficiente
      }

      senderData.balance -= amount;
      
      const timestamp = Date.now();
      const transactionId = `pix_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (!senderData.transactions) senderData.transactions = {};
      senderData.transactions[transactionId] = {
        type: 'pix_out',
        amount: amount,
        recipient: recipientUsername,
        timestamp: timestamp,
        status: 'completed'
      };

      return senderData;
    });

    if (!transactionResult.committed) {
      showToast('Transação abortada. Verifique o saldo e tente novamente.', 'error');
      hideLoading();
      return;
    }

    // Atualizar destinatário
    await recipientRef.transaction((recipientData) => {
      if (recipientData) {
        recipientData.balance = (recipientData.balance || 0) + amount;
        
        if (!recipientData.transactions) recipientData.transactions = {};
        const transactionId = `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        recipientData.transactions[transactionId] = {
          type: 'pix_in',
          amount: amount,
          sender: window.userSessionManager.currentUser.username,
          timestamp: Date.now(),
          status: 'completed'
        };
      }
      return recipientData;
    });

    // Atualizar saldo local
    window.userSessionManager.currentUser.balance -= amount;
    
    showToast(`Transferência PIX de ${formatCurrency(amount)} realizada com sucesso!`, 'success');
    document.getElementById('pixKey').value = '';
    document.getElementById('pixAmount').value = '';
    document.getElementById('pixRecipient').textContent = '';
    
    loadTransactionHistory();
  } catch (error) {
    console.error("Erro ao enviar PIX:", error);
    showToast('Erro ao processar transferência. Tente novamente.', 'error');
  } finally {
    hideLoading();
  }
}

async function sendIBAN() {
  const iban = document.getElementById('iban').value.trim();
  const amountStr = document.getElementById('ibanAmount').value;
  const amount = parseFloat(amountStr);

  if (!iban || !amountStr || isNaN(amount) || amount <= 0) {
    showToast('Preencha todos os campos corretamente.', 'error');
    return;
  }

  showLoading();

  try {
    const senderUid = window.userSessionManager.currentUser.uid;
    if (!senderUid) {
      showToast('Erro: Usuário não identificado.', 'error');
      window.navigateTo('#');
      return;
    }

    const senderRef = window.database.ref(`users/${senderUid}`);
    const snapshot = await senderRef.child('balance').once('value');
    const currentBalance = snapshot.val() || 0;
    window.userSessionManager.currentUser.balance = currentBalance;

    if (amount > currentBalance) {
      showToast(`Saldo insuficiente. Saldo atual: ${formatCurrency(currentBalance)}`, 'error');
      hideLoading();
      return;
    }

    const recipientSnapshot = await window.database.ref('users').orderByChild('iban').equalTo(iban).once('value');
    if (!recipientSnapshot.exists()) {
      showToast('Destinatário não encontrado com este IBAN.', 'error');
      hideLoading();
      return;
    }

    const recipientUid = Object.keys(recipientSnapshot.val())[0];
    const recipientData = recipientSnapshot.val()[recipientUid];
    const recipientUsername = recipientData.username;

    if (recipientUid === senderUid) {
      showToast('Não é possível transferir para si mesmo.', 'error');
      hideLoading();
      return;
    }

    // Confirmar transferência
    const confirmSend = confirm(`Enviar ${formatCurrency(amount)} via IBAN para ${recipientUsername}?`);
    if (!confirmSend) {
      showToast('Transferência cancelada.', 'info');
      hideLoading();
      return;
    }

    const recipientRef = window.database.ref(`users/${recipientUid}`);

    // Usar transaction para garantir atomicidade
    const transactionResult = await senderRef.transaction((senderData) => {
      if (!senderData || senderData.balance < amount) {
        return; // Abortar se saldo insuficiente
      }

      senderData.balance -= amount;
      
      const timestamp = Date.now();
      const transactionId = `iban_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
      
      if (!senderData.transactions) senderData.transactions = {};
      senderData.transactions[transactionId] = {
        type: 'iban_out',
        amount: amount,
        recipient: recipientUsername,
        timestamp: timestamp,
        status: 'completed'
      };

      return senderData;
    });

    if (!transactionResult.committed) {
      showToast('Transação abortada. Verifique o saldo e tente novamente.', 'error');
      hideLoading();
      return;
    }

    // Atualizar destinatário
    await recipientRef.transaction((recipientData) => {
      if (recipientData) {
        recipientData.balance = (recipientData.balance || 0) + amount;
        
        if (!recipientData.transactions) recipientData.transactions = {};
        const transactionId = `iban_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        recipientData.transactions[transactionId] = {
          type: 'iban_in',
          amount: amount,
          sender: window.userSessionManager.currentUser.username,
          timestamp: Date.now(),
          status: 'completed'
        };
      }
      return recipientData;
    });

    // Atualizar saldo local
    window.userSessionManager.currentUser.balance -= amount;
    
    showToast(`Transferência IBAN de ${formatCurrency(amount)} realizada com sucesso!`, 'success');
    document.getElementById('iban').value = '';
    document.getElementById('ibanAmount').value = '';
    document.getElementById('ibanRecipient').textContent = '';
    
    loadTransactionHistory();
  } catch (error) {
    console.error("Erro ao enviar IBAN:", error);
    showToast('Erro ao processar transferência. Tente novamente.', 'error');
  } finally {
    hideLoading();
  }
}

async function loadTransactionHistory() {
  const historyContainer = document.getElementById('transactionsHistory');
  if (!historyContainer) return;

  try {
    const uid = window.userSessionManager.currentUser.uid;
    if (!uid) {
      historyContainer.innerHTML = '<p>Erro: Usuário não identificado.</p>';
      return;
    }

    const snapshot = await window.database.ref(`users/${uid}/transactions`).once('value');
    if (!snapshot.exists()) {
      historyContainer.innerHTML = '<p>Nenhuma transação encontrada.</p>';
      return;
    }

    const transactions = snapshot.val();
    const transactionsArray = Object.entries(transactions)
      .map(([id, transaction]) => ({ id, ...transaction }))
      .sort((a, b) => b.timestamp - a.timestamp);

    if (transactionsArray.length === 0) {
      historyContainer.innerHTML = '<p>Nenhuma transação encontrada.</p>';
      return;
    }

    historyContainer.innerHTML = transactionsArray.map(transaction => {
      const date = new Date(transaction.timestamp).toLocaleString('pt-BR');
      const amountClass = transaction.type.includes('_in') ? 'positive' : 'negative';
      const icon = transaction.type.includes('pix') ? 'zap' : 'globe';
      const typeText = transaction.type.includes('pix') ? 'PIX' : 'IBAN';
      const direction = transaction.type.includes('_in') ? 'Recebido' : 'Enviado';
      const counterparty = transaction.type.includes('_in') ? transaction.sender : transaction.recipient;

      return `
        <div class="transaction-item">
          <div class="transaction-icon">
            <i data-lucide="${icon}"></i>
          </div>
          <div class="transaction-details">
            <h4>${direction} via ${typeText}</h4>
            <p>${counterparty} • ${date}</p>
          </div>
          <div class="transaction-amount ${amountClass}">
            ${transaction.type.includes('_in') ? '+' : '-'} ${formatCurrency(transaction.amount)}
          </div>
        </div>
      `;
    }).join('');

    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
    historyContainer.innerHTML = '<p>Erro ao carregar histórico de transações.</p>';
  }
}

async function analyzeExpensesWithAI() {
  try {
    showLoading();
    const uid = window.userSessionManager.currentUser.uid;
    const snapshot = await window.database.ref(`users/${uid}/transactions`).once('value');
    
    if (!snapshot.exists()) {
      showToast('Nenhuma transação encontrada para análise.', 'info');
      hideLoading();
      return;
    }

    const transactions = snapshot.val();
    const transactionsArray = Object.entries(transactions)
      .map(([id, transaction]) => ({ id, ...transaction }))
      .filter(t => t.type.includes('_out'))
      .sort((a, b) => b.timestamp - a.timestamp);

    if (transactionsArray.length === 0) {
      showToast('Nenhuma despesa encontrada para análise.', 'info');
      hideLoading();
      return;
    }

    const totalExpenses = transactionsArray.reduce((sum, t) => sum + t.amount, 0);
    const averageExpense = totalExpenses / transactionsArray.length;
    const largestExpense = Math.max(...transactionsArray.map(t => t.amount));
    const expenseCount = transactionsArray.length;

    const analysis = await callGeminiAPI(`
      Analise as despesas financeiras deste usuário e forneça:
      1. Um resumo das despesas (total gasto, média por transação)
      2. Identifique padrões (quais são os maiores gastos)
      3. Dê 2-3 dicas práticas para economizar baseado nos gastos
      
      Dados:
      - Total de despesas: ${formatCurrency(totalExpenses)}
      - Número de transações: ${expenseCount}
      - Maior gasto individual: ${formatCurrency(largestExpense)}
      - Média por transação: ${formatCurrency(averageExpense)}
      
      Forneça a resposta em português, com tom amigável e educativo.
    `);

    createModal(
      { text: 'Análise de Despesas com IA', icon: 'bot' },
      `<div style="line-height: 1.6;">${analysis.replace(/\n/g, '<br>')}</div>`,
      [{ 
        text: 'Fechar', 
        icon: 'x', 
        class: 'secondary-btn', 
        onclick: 'this.closest(\'.modal-overlay\').remove()' 
      }]
    );
  } catch (error) {
    console.error("Erro na análise com IA:", error);
    showToast('Erro ao analisar despesas com IA.', 'error');
  } finally {
    hideLoading();
  }
}