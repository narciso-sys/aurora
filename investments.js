async function renderInvestments() {
  if (!window.userSessionManager.currentUser || !window.userSessionManager.currentUser.uid) {
    showToast('Faça login primeiro.', 'warning');
    window.navigateTo('#');
    return;
  }

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="investments-section fade-in-up">
      <button class="back-btn" onclick="window.goBack()"><i data-lucide="arrow-left"></i> Voltar</button>
      <h2><i data-lucide="trending-up"></i> Investimentos Simulados 📈</h2>
      
      <div class="investment-cards">
        <div class="investment-card">
          <div class="investment-icon conservative">
            <i data-lucide="shield"></i>
          </div>
          <h3>Conservador</h3>
          <p>Baixo risco, retorno previsível</p>
          <div class="return-rate">+0.5% ao mês</div>
          <button onclick="openInvestmentModal('conservador')">Investir</button>
        </div>
        
        <div class="investment-card">
          <div class="investment-icon moderate">
            <i data-lucide="scales"></i>
          </div>
          <h3>Moderado</h3>
          <p>Risco e retorno balanceados</p>
          <div class="return-rate">+1.2% ao mês</div>
          <button onclick="openInvestmentModal('moderado')">Investir</button>
        </div>
        
        <div class="investment-card">
          <div class="investment-icon aggressive">
            <i data-lucide="zap"></i>
          </div>
          <h3>Agressivo</h3>
          <p>Alto risco, potencial alto retorno</p>
          <div class="return-rate">+2.5% ao mês</div>
          <button onclick="openInvestmentModal('agressivo')">Investir</button>
        </div>
      </div>
      
      <div class="my-investments">
        <h3><i data-lucide="briefcase"></i> Meus Investimentos</h3>
        <div id="investmentsList">
          <p><i data-lucide="loader"></i> Carregando investimentos...</p>
        </div>
      </div>
      
      <div class="investment-education">
        <h3><i data-lucide="book-open"></i> Educação Financeira</h3>
        <p>Aprenda sobre os diferentes tipos de investimento e como diversificar sua carteira.</p>
        <button onclick="learnAboutInvestments()">
          <i data-lucide="book-open"></i> Aprender sobre Investimentos
        </button>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }

  loadUserInvestments();
}

function openInvestmentModal(type) {
  const investmentTypes = {
    conservador: { name: 'Conservador', rate: 0.5, min: 50, risk: 'Baixo' },
    moderado: { name: 'Moderado', rate: 1.2, min: 100, risk: 'Médio' },
    agressivo: { name: 'Agressivo', rate: 2.5, min: 200, risk: 'Alto' }
  };
  
  const investment = investmentTypes[type];
  const modalContent = `
    <div class="investment-modal">
      <h3>Investimento ${investment.name}</h3>
      <p>Tipo: ${investment.risk} risco</p>
      <p>Rentabilidade esperada: ${investment.rate}% ao mês</p>
      <p>Valor mínimo: ${formatCurrency(investment.min)}</p>
      
      <div class="investment-form">
        <label for="investmentAmount">Valor a investir:</label>
        <input type="number" id="investmentAmount" min="${investment.min}" step="10" placeholder="${formatCurrency(investment.min)}" required>
        
        <label for="investmentMonths">Prazo (meses):</label>
        <input type="number" id="investmentMonths" min="1" max="24" value="12" required>
        
        <div class="projection">
          <h4>Projeção de Retorno:</h4>
          <p id="returnProjection">-</p>
        </div>
      </div>
    </div>
  `;
  
  const modal = createModal(
    { text: `Investir - ${investment.name}`, icon: 'trending-up' },
    modalContent,
    [
      {
        text: 'Cancelar',
        icon: 'x',
        class: 'secondary-btn',
        onclick: 'this.closest(\'.modal-overlay\').remove()'
      },
      {
        text: 'Confirmar Investimento',
        icon: 'check',
        class: 'primary-btn',
        onclick: `confirmInvestment('${type}', ${investment.rate})`
      }
    ]
  );
  
  // Adicionar event listeners para cálculo em tempo real
  const amountInput = document.getElementById('investmentAmount');
  const monthsInput = document.getElementById('investmentMonths');
  
  const calculateProjection = () => {
    const amount = parseFloat(amountInput.value) || 0;
    const months = parseInt(monthsInput.value) || 0;
    
    if (amount >= investment.min && months > 0) {
      const returnValue = amount * Math.pow(1 + (investment.rate / 100), months) - amount;
      document.getElementById('returnProjection').textContent = 
        `Retorno estimado: ${formatCurrency(returnValue)} em ${months} meses`;
    } else {
      document.getElementById('returnProjection').textContent = '-';
    }
  };
  
  amountInput.addEventListener('input', calculateProjection);
  monthsInput.addEventListener('input', calculateProjection);
}

async function confirmInvestment(type, monthlyRate) {
  const amount = parseFloat(document.getElementById('investmentAmount').value);
  const months = parseInt(document.getElementById('investmentMonths').value);
  
  if (!amount || !months) {
    showToast('Preencha todos os campos.', 'error');
    return;
  }
  
  const investmentTypes = {
    conservador: { name: 'Conservador', min: 50 },
    moderado: { name: 'Moderado', min: 100 },
    agressivo: { name: 'Agressivo', min: 200 }
  };
  
  const investment = investmentTypes[type];
  
  if (amount < investment.min) {
    showToast(`O valor mínimo para este investimento é ${formatCurrency(investment.min)}.`, 'error');
    return;
  }
  
  const currentUser = window.userSessionManager.currentUser;
  if (amount > currentUser.balance) {
    showToast(`Saldo insuficiente. Saldo atual: ${formatCurrency(currentUser.balance)}`, 'error');
    return;
  }
  
  showLoading();
  
  try {
    const uid = currentUser.uid;
    const userRef = window.database.ref(`users/${uid}`);
    
    // Criar ID único para o investimento
    const investmentId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await userRef.transaction((userData) => {
      if (userData) {
        // Deduzir valor do saldo
        userData.balance = (userData.balance || 0) - amount;
        
        // Adicionar investimento
        if (!userData.investments) userData.investments = {};
        userData.investments[investmentId] = {
          type: type,
          name: investment.name,
          amount: amount,
          monthlyRate: monthlyRate,
          months: months,
          startDate: Date.now(),
          expectedReturn: amount * Math.pow(1 + (monthlyRate / 100), months) - amount,
          status: 'active'
        };
        
        // Registrar transação
        if (!userData.transactions) userData.transactions = {};
        const transactionId = `investment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        userData.transactions[transactionId] = {
          type: 'investment_out',
          amount: amount,
          investment: investment.name,
          timestamp: Date.now(),
          status: 'completed'
        };
      }
      return userData;
    });
    
    // Atualizar estado local
    currentUser.balance -= amount;
    
    showToast(`Investimento de ${formatCurrency(amount)} realizado com sucesso!`, 'success');
    document.querySelector('.modal-overlay')?.remove();
    loadUserInvestments();
    
    // Se estiver no dashboard, atualizar
    if (window.location.hash === '#dashboard') {
      renderDashboard();
    }
  } catch (error) {
    console.error("Erro ao realizar investimento:", error);
    showToast('Erro ao processar investimento. Tente novamente.', 'error');
  } finally {
    hideLoading();
  }
}

async function loadUserInvestments() {
  const investmentsList = document.getElementById('investmentsList');
  if (!investmentsList) return;
  
  try {
    const uid = window.userSessionManager.currentUser.uid;
    const snapshot = await window.database.ref(`users/${uid}/investments`).once('value');
    
    if (!snapshot.exists()) {
      investmentsList.innerHTML = '<p>Você ainda não possui investimentos.</p>';
      return;
    }
    
    const investments = snapshot.val();
    const investmentsArray = Object.entries(investments)
      .map(([id, investment]) => ({ id, ...investment }))
      .sort((a, b) => b.startDate - a.startDate);
    
    investmentsList.innerHTML = investmentsArray.map(investment => {
      const startDate = new Date(investment.startDate).toLocaleDateString('pt-BR');
      const endDate = new Date(investment.startDate + investment.months * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
      const elapsedMonths = Math.floor((Date.now() - investment.startDate) / (30 * 24 * 60 * 60 * 1000));
      const remainingMonths = Math.max(0, investment.months - elapsedMonths);
      
      // Calcular valor atual (simulado)
      const currentValue = investment.amount * Math.pow(1 + (investment.monthlyRate / 100), Math.min(elapsedMonths, investment.months));
      const profit = currentValue - investment.amount;
      
      return `
        <div class="investment-item">
          <div class="investment-info">
            <h4>${investment.name}</h4>
            <p>Investido: ${formatCurrency(investment.amount)}</p>
            <p>Início: ${startDate} • Término: ${endDate}</p>
            <p>Rentabilidade: ${investment.monthlyRate}% ao mês</p>
            <p>Valor atual: ${formatCurrency(currentValue)}</p>
            <p>${profit >= 0 ? 'Lucro: ' : 'Prejuízo: '} ${formatCurrency(Math.abs(profit))}</p>
            <p>Meses restantes: ${remainingMonths}</p>
          </div>
          <div class="investment-actions">
            ${remainingMonths > 0 ? `
              <button onclick="rescueInvestment('${investment.id}', ${currentValue}, ${investment.amount})" class="rescue-btn">
                <i data-lucide="dollar-sign"></i> Resgatar Antecipadamente
              </button>
            ` : `
              <button onclick="rescueInvestment('${investment.id}', ${currentValue}, ${investment.amount})" class="primary-btn">
                <i data-lucide="dollar-sign"></i> Resgatar
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
    
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (error) {
    console.error("Erro ao carregar investimentos:", error);
    investmentsList.innerHTML = '<p>Erro ao carregar investimentos.</p>';
  }
}

async function rescueInvestment(investmentId, currentValue, investedAmount) {
  const confirmRescue = confirm(`Deseja resgatar este investimento? Valor atual: ${formatCurrency(currentValue)}`);
  if (!confirmRescue) return;
  
  showLoading();
  
  try {
    const uid = window.userSessionManager.currentUser.uid;
    const userRef = window.database.ref(`users/${uid}`);
    
    await userRef.transaction((userData) => {
      if (userData && userData.investments && userData.investments[investmentId]) {
        const investment = userData.investments[investmentId];
        const profit = currentValue - investedAmount;
        
        // Creditar valor na conta
        userData.balance = (userData.balance || 0) + currentValue;
        
        // Marcar investimento como resgatado
        investment.status = 'rescued';
        investment.rescueDate = Date.now();
        investment.finalValue = currentValue;
        
        // Registrar transação
        if (!userData.transactions) userData.transactions = {};
        const transactionId = `investment_in_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        userData.transactions[transactionId] = {
          type: 'investment_in',
          amount: currentValue,
          investment: investment.name,
          profit: profit,
          timestamp: Date.now(),
          status: 'completed'
        };
      }
      return userData;
    });
    
    // Atualizar estado local
    window.userSessionManager.currentUser.balance += currentValue;
    
    showToast(`Investimento resgatado! ${formatCurrency(currentValue)} creditados na sua conta.`, 'success');
    loadUserInvestments();
    
    // Se estiver no dashboard, atualizar
    if (window.location.hash === '#dashboard') {
      renderDashboard();
    }
  } catch (error) {
    console.error("Erro ao resgatar investimento:", error);
    showToast('Erro ao resgatar investimento. Tente novamente.', 'error');
  } finally {
    hideLoading();
  }
}

async function learnAboutInvestments() {
  try {
    showLoading();
    const education = await callGeminiAPI('Educação Financeira - Explique os principais tipos de investimento (renda fixa, variável, fundos) e dicas para iniciantes.');
    
    createModal(
      { text: 'Educação Financeira', icon: 'book-open' },
      `<div style="line-height: 1.6;">${education.replace(/\n/g, '<br>')}</div>`,
      [{ 
        text: 'Fechar', 
        icon: 'x', 
        class: 'secondary-btn', 
        onclick: 'this.closest(\'.modal-overlay\').remove()' 
      }]
    );
  } catch (error) {
    console.error("Erro ao carregar educação financeira:", error);
    showToast('Erro ao carregar conteúdo educativo.', 'error');
  } finally {
    hideLoading();
  }
}