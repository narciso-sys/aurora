function renderDashboard() {
  if (!window.userSessionManager.currentUser || !window.userSessionManager.currentUser.uid) {
    showToast('Faça login primeiro.', 'warning');
    window.navigateTo('#');
    return;
  }

  const currentUser = window.userSessionManager.currentUser;
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="dashboard fade-in-up">
      <div class="user-profile">
        <img src="${currentUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + currentUser.username}" alt="Avatar">
        <h3>${currentUser.username}</h3>
        <div class="level-badge">Nível ${currentUser.level || 1}</div>
        <p><i data-lucide="dollar-sign"></i> Saldo: ${formatCurrency(currentUser.balance || 1000)}</p>
        <p><i data-lucide="gamepad-2"></i> Saldo Jogos: ${formatCurrency(currentUser.gameBalance || 0)}</p>
        <p><i data-lucide="hash"></i> IBAN: ${currentUser.iban || 'Não disponível'}</p>
        <p><i data-lucide="key"></i> PIX: ${currentUser.pixKeys ? currentUser.pixKeys[0] : 'Não disponível'}</p>
        <p><i data-lucide="star"></i> XP: ${currentUser.xp || 0}</p>
      </div>
      
      <div>
        <div class="balance-section">
          <div class="balance-card">
            <h4>Saldo Principal</h4>
            <div class="amount">${formatCurrency(currentUser.balance || 1000)}</div>
            <div class="currency">AURORA 💲</div>
          </div>
          
          <div class="balance-card game">
            <h4>Saldo de Jogos</h4>
            <div class="amount">${formatCurrency(currentUser.gameBalance || 0)}</div>
            <div class="currency">AURORA 💲</div>
            ${currentUser.gameBalance > 0 ? '<button class="redeem-btn" id="redeemBtn">Resgatar para Saldo Principal</button>' : ''}
          </div>
        </div>
        
        <div class="quick-actions">
          <div class="action-card" onclick="window.navigateTo('#transactions')">
            <i data-lucide="send"></i>
            <h4>Transferir</h4>
            <p>PIX e IBAN</p>
          </div>
          <div class="action-card" onclick="window.navigateTo('#cards')">
            <i data-lucide="credit-card"></i>
            <h4>Cartões</h4>
            <p>Virtuais</p>
          </div>
          <div class="action-card" onclick="window.navigateTo('#investments')">
            <i data-lucide="trending-up"></i>
            <h4>Investir</h4>
            <p>Simulado</p>
          </div>
          <div class="action-card" onclick="window.navigateTo('#games')">
            <i data-lucide="gamepad-2"></i>
            <h4>Jogar</h4>
            <p>Ganhe dinheiro</p>
          </div>
        </div>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }

  // Botão de resgate
  const redeemBtn = document.getElementById('redeemBtn');
  if (redeemBtn) {
    redeemBtn.addEventListener('click', async () => {
      if ((currentUser.gameBalance || 0) <= 0) {
        showToast('Não há saldo para resgatar.', 'info');
        return;
      }

      showLoading();
      try {
        const uid = currentUser.uid;
        const userRef = window.database.ref(`users/${uid}`);
        
        await userRef.transaction(currentData => {
          if (currentData) {
            const gameBalance = currentData.gameBalance || 0;
            return {
              ...currentData,
              balance: (currentData.balance || 0) + gameBalance,
              gameBalance: 0
            };
          }
          return currentData;
        });

        // Atualizar estado local
        currentUser.balance = (currentUser.balance || 0) + (currentUser.gameBalance || 0);
        currentUser.gameBalance = 0;
        
        showToast(`Resgatado ${formatCurrency(currentUser.gameBalance)} com sucesso!`, 'success');
        renderDashboard(); // Atualizar UI
      } catch (error) {
        console.error("Erro ao resgatar:", error);
        showToast('Erro ao resgatar saldo. Tente novamente.', 'error');
      } finally {
        hideLoading();
      }
    });
  }
}