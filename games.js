async function renderGames() {
  if (!window.userSessionManager.currentUser || !window.userSessionManager.currentUser.uid) {
    showToast('Faça login primeiro.', 'warning');
    window.navigateTo('#');
    return;
  }

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="games-section fade-in-up">
      <button class="back-btn" onclick="window.goBack()"><i data-lucide="arrow-left"></i> Voltar</button>
      <h2><i data-lucide="gamepad-2"></i> Jogos e Entretenimento 🎮</h2>
      
      <div class="games-grid">
        <div class="game-card" onclick="startQuizGame()">
          <div class="game-icon">
            <i data-lucide="help-circle"></i>
          </div>
          <h3>Quiz Financeiro</h3>
          <p>Teste seus conhecimentos sobre finanças e ganhe prêmios!</p>
          <div class="game-reward">Ganhe até A$ 50,00</div>
        </div>
        
        <div class="game-card" onclick="startSlotMachine()">
          <div class="game-icon">
            <i data-lucide="dices"></i>
          </div>
          <h3>Caça-Níqueis</h3>
          <p>Sorteie combinações para ganhar prêmios em dinheiro!</p>
          <div class="game-reward">Ganhe até A$ 100,00</div>
        </div>
        
        <div class="game-card" onclick="startMemoryGame()">
          <div class="game-icon">
            <i data-lucide="brain"></i>
          </div>
          <h3>Jogo da Memória</h3>
          <p>Encontre os pares de cartas iguais para ganhar recompensas!</p>
          <div class="game-reward">Ganhe até A$ 30,00</div>
        </div>
        
        <div class="game-card" onclick="startRouletteGame()">
          <div class="game-icon">
            <i data-lucide="circle"></i>
          </div>
          <h3>Roleta</h3>
          <p>Aposte em cores e números para multiplicar seus ganhos!</p>
          <div class="game-reward">Ganhe até A$ 200,00</div>
        </div>
      </div>
      
      <div class="games-info">
        <p><i data-lucide="info"></i> Os prêmios são creditados no seu <strong>Saldo de Jogos</strong> e podem ser resgatados para o saldo principal a qualquer momento.</p>
      </div>
    </div>
  `;

  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

async function startQuizGame() {
  try {
    showLoading();
    
    // Carregar perguntas do arquivo JSON
    const response = await fetch('perguntas.json');
    if (!response.ok) {
      throw new Error('Erro ao carregar perguntas.');
    }
    
    const questions = await response.json();
    if (!questions || questions.length === 0) {
      throw new Error('Nenhuma pergunta disponível.');
    }
    
    // Selecionar 10 perguntas aleatórias
    const selectedQuestions = [];
    const usedIndices = new Set();
    
    while (selectedQuestions.length < 10 && selectedQuestions.length < questions.length) {
      const randomIndex = Math.floor(Math.random() * questions.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        selectedQuestions.push(questions[randomIndex]);
      }
    }
    
    let currentQuestionIndex = 0;
    let correctAnswers = 0;
    let gameBalance = 0;
    
    const askQuestion = () => {
      if (currentQuestionIndex >= selectedQuestions.length) {
        endQuizGame(correctAnswers, gameBalance);
        return;
      }
      
      const question = selectedQuestions[currentQuestionIndex];
      const answers = [...question.incorrect_answers, question.correct_answer]
        .sort(() => Math.random() - 0.5);
      
      const modalContent = `
        <div class="quiz-question">
          <h3>Pergunta ${currentQuestionIndex + 1}/${selectedQuestions.length}</h3>
          <p>${question.question}</p>
          <div class="quiz-options">
            ${answers.map((answer, index) => `
              <button class="quiz-option" onclick="selectAnswer(${index}, '${answer.replace(/'/g, "\\'")}', '${question.correct_answer.replace(/'/g, "\\'")}')">
                ${answer}
              </button>
            `).join('')}
          </div>
        </div>
      `;
      
      const modal = createModal(
        { text: 'Quiz Financeiro', icon: 'help-circle' },
        modalContent,
        [] // Sem botões, apenas as opções de resposta
      );
      
      // Adicionar evento para fechar o modal
      modal.querySelector('.modal-close').addEventListener('click', () => {
        endQuizGame(correctAnswers, gameBalance);
      });
    };
    
    window.selectAnswer = (selectedIndex, selectedAnswer, correctAnswer) => {
      const isCorrect = selectedAnswer === correctAnswer;
      const modalContent = document.querySelector('.modal-content');
      
      if (isCorrect) {
        correctAnswers++;
        const reward = 5 * (currentQuestionIndex + 1); // Recompensa progressiva
        gameBalance += reward;
        
        modalContent.innerHTML = `
          <div class="quiz-feedback correct">
            <i data-lucide="check-circle"></i>
            <h3>Resposta Correta!</h3>
            <p>Você ganhou A$ ${reward.toFixed(2)}</p>
            <p>Próxima pergunta em 2 segundos...</p>
          </div>
        `;
      } else {
        modalContent.innerHTML = `
          <div class="quiz-feedback incorrect">
            <i data-lucide="x-circle"></i>
            <h3>Resposta Incorreta</h3>
            <p>A resposta correta era: ${correctAnswer}</p>
            <p>Próxima pergunta em 2 segundos...</p>
          </div>
        `;
      }
      
      // Atualizar ícones
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
      
      // Avançar para próxima pergunta após 2 segundos
      setTimeout(() => {
        currentQuestionIndex++;
        document.querySelector('.modal-overlay')?.remove();
        askQuestion();
      }, 2000);
    };
    
    askQuestion();
    
  } catch (error) {
    console.error("Erro no quiz:", error);
    showToast('Erro ao iniciar o quiz. Tente novamente.', 'error');
  } finally {
    hideLoading();
  }
}

function endQuizGame(correctAnswers, gameBalance) {
  const totalQuestions = 10;
  const percentage = (correctAnswers / totalQuestions) * 100;
  let bonus = 0;
  
  if (percentage >= 80) bonus = 20;
  else if (percentage >= 60) bonus = 10;
  
  const totalEarnings = gameBalance + bonus;
  
  const modalContent = `
    <div class="quiz-results">
      <h3>Quiz Concluído!</h3>
      <p>Você acertou ${correctAnswers} de ${totalQuestions} perguntas</p>
      <p>Pontuação: ${percentage.toFixed(0)}%</p>
      <div class="earnings-breakdown">
        <p>Ganhos do quiz: A$ ${gameBalance.toFixed(2)}</p>
        ${bonus > 0 ? `<p>Bônus por desempenho: A$ ${bonus.toFixed(2)}</p>` : ''}
        <p class="total-earnings">Total: A$ ${totalEarnings.toFixed(2)}</p>
      </div>
    </div>
  `;
  
  const modal = createModal(
    { text: 'Resultado do Quiz', icon: 'award' },
    modalContent,
    [
      {
        text: 'Fechar',
        icon: 'x',
        class: 'secondary-btn',
        onclick: 'this.closest(\'.modal-overlay\').remove()'
      },
      {
        text: 'Resgatar Prêmio',
        icon: 'dollar-sign',
        class: 'primary-btn',
        onclick: `creditGameBalance(${totalEarnings}); this.closest('.modal-overlay').remove();`
      }
    ]
  );
}

async function creditGameBalance(amount) {
  try {
    const uid = window.userSessionManager.currentUser.uid;
    const userRef = window.database.ref(`users/${uid}`);
    
    await userRef.transaction((userData) => {
      if (userData) {
        userData.gameBalance = (userData.gameBalance || 0) + amount;
        
        // Adicionar XP baseado no valor ganho
        const xpEarned = Math.floor(amount * 10);
        userData.xp = (userData.xp || 0) + xpEarned;
        
        // Verificar level up
        const xpForNextLevel = (userData.level || 1) * 1000;
        if (userData.xp >= xpForNextLevel) {
          userData.level = (userData.level || 1) + 1;
          showToast(`Parabéns! Você alcançou o nível ${userData.level}!`, 'success');
        }
        
        // Registrar transação de jogo
        if (!userData.transactions) userData.transactions = {};
        const transactionId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        userData.transactions[transactionId] = {
          type: 'game_win',
          amount: amount,
          game: 'Quiz Financeiro',
          timestamp: Date.now(),
          status: 'completed'
        };
      }
      return userData;
    });
    
    // Atualizar estado local
    window.userSessionManager.currentUser.gameBalance += amount;
    
    showToast(`A$ ${amount.toFixed(2)} creditados no seu saldo de jogos!`, 'success');
    
    // Se estiver no dashboard, atualizar
    if (window.location.hash === '#dashboard') {
      renderDashboard();
    }
  } catch (error) {
    console.error("Erro ao creditar saldo:", error);
    showToast('Erro ao creditar prêmio. Tente novamente.', 'error');
  }
}

function startSlotMachine() {
  showToast('Jogo de caça-níqueis em desenvolvimento!', 'info');
}

function startMemoryGame() {
  showToast('Jogo da memória em desenvolvimento!', 'info');
}

function startRouletteGame() {
  showToast('Roleta em desenvolvimento!', 'info');
}