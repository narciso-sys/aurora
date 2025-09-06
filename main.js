function generateIBAN() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let iban = 'ACB';
  for (let i = 0; i < 20; i++) {
    iban += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return iban;
}

function usernameToEmail(username) {
  return `${username.toLowerCase()}@aurora.capital`;
}

class UserSessionManager {
  constructor() {
    this.currentUser = null;
    this.isInitializing = false;
    this.listeners = [];
    this.history = []; // Histórico de navegação para botão de voltar
  }
  
  async initialize() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    
    try {
      window.auth.onAuthStateChanged(async (user) => {
        console.log("Auth state changed:", user ? "Usuário logado" : "Nenhum usuário autenticado");
        if (user) {
          try {
            const username = user.email.split('@')[0];
            const userData = await this.loadUserData(username, user.uid);
            this.currentUser = { uid: user.uid, ...user, ...userData, username };
            console.log("✅ Dados do usuário carregados:", this.currentUser);
            this.notifyListeners();
            
            // Mostrar navbar
            const navbar = document.getElementById('navbar');
            if (navbar) navbar.classList.remove('hidden');
            
            // Navegar para dashboard se estiver na página inicial
            if (window.location.hash === '' || window.location.hash === '#') {
              this.navigateTo('#dashboard', true);
            } else {
              this.renderPage();
            }
          } catch (error) {
            console.error("❌ Erro ao carregar dados do usuário:", error);
            showToast('Erro ao carregar perfil. Fazendo logout...', 'error');
            await this.logout();
          }
        } else {
          this.currentUser = null;
          console.log("Nenhum usuário autenticado");
          
          // Esconder navbar
          const navbar = document.getElementById('navbar');
          if (navbar) navbar.classList.add('hidden');
          
          this.notifyListeners();
          this.renderAuthScreen();
          
          // Se não estiver na página de auth, redirecionar
          if (window.location.hash !== '' && window.location.hash !== '#') {
            window.location.hash = '';
          }
        }
      });
    } catch (error) {
      console.error("Erro ao inicializar autenticação:", error);
      showToast('Erro ao inicializar aplicação.', 'error');
    } finally {
      this.isInitializing = false;
    }
  }
  
  async loadUserData(username, uid) {
    return new Promise((resolve, reject) => {
      const userRef = window.database.ref(`users/${uid}`);
      userRef.once('value')
        .then(snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            data.balance = data.balance || 1000;
            data.gameBalance = data.gameBalance || 0;
            data.level = data.level || 1;
            data.xp = data.xp || 0;
            resolve(data);
          } else {
            const defaultData = {
              email: usernameToEmail(username),
              username: username,
              balance: 1000,
              gameBalance: 0,
              level: 1,
              xp: 0,
              iban: generateIBAN(),
              pixKeys: [usernameToEmail(username)],
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
              createdAt: Date.now()
            };
            userRef.set(defaultData)
              .then(() => resolve(defaultData))
              .catch(error => reject(error));
          }
        })
        .catch(error => reject(error));
    });
  }
  
  async login(username, password) {
    showLoading();
    try {
      const email = usernameToEmail(username);
      await window.auth.signInWithEmailAndPassword(email, password);
      showToast('Login efetuado com sucesso!', 'success');
      return true;
    } catch (error) {
      let errorMessage = 'Credenciais inválidas.';
      if (error.code === 'auth/user-not-found') errorMessage = 'Usuário não encontrado.';
      else if (error.code === 'auth/wrong-password') errorMessage = 'Senha incorreta.';
      showToast(errorMessage, 'error');
      return false;
    } finally {
      hideLoading();
    }
  }
  
  async register(username, password, customPixKey = null, gender = 'male') {
    showLoading();
    try {
      const email = usernameToEmail(username);
      const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
      const userData = {
        email: email,
        username: username,
        balance: 1000,
        gameBalance: 0,
        level: 1,
        xp: 0,
        iban: generateIBAN(),
        pixKeys: customPixKey ? [email, customPixKey] : [email],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}&gender=${gender}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
        createdAt: Date.now()
      };
      await window.database.ref(`users/${userCredential.user.uid}`).set(userData);
      showToast('Registro concluído! Faça login.', 'success');
      return true;
    } catch (error) {
      let errorMessage = 'Erro ao registrar.';
      if (error.code === 'auth/email-already-in-use') errorMessage = 'Usuário já existe.';
      else if (error.code === 'auth/weak-password') errorMessage = 'Senha fraca (mín. 6 caracteres).';
      showToast(errorMessage, 'error');
      return false;
    } finally {
      hideLoading();
    }
  }
  
  async logout() {
    try {
      await window.auth.signOut();
      this.currentUser = null;
      this.notifyListeners();
      this.history = [];
      window.location.hash = '';
      showToast('Logout efetuado com sucesso.', 'success');
    } catch (error) {
      showToast('Erro ao fazer logout.', 'error');
    }
  }
  
  navigateTo(hash, replace = false) {
    const currentHash = window.location.hash;
    
    if (currentHash !== hash) {
      if (!replace) {
        this.history.push(currentHash);
      }
      window.location.hash = hash;
    }
  }
  
  goBack() {
    if (this.history.length > 0) {
      const previousHash = this.history.pop();
      window.location.hash = previousHash;
    } else {
      window.location.hash = '#dashboard';
    }
  }
  
  renderPage() {
    showLoading();
    try {
      const hash = window.location.hash;
      const app = document.getElementById('app');
      if (!app) return;
      
      app.innerHTML = '';
      
      // Verificar autenticação para páginas protegidas
      const protectedPages = ['#dashboard', '#transactions', '#investments', '#games', '#cards'];
      
      if (protectedPages.includes(hash) && (!this.currentUser || !this.currentUser.uid)) {
        showToast('Faça login primeiro.', 'warning');
        this.navigateTo('#', true);
        return;
      }
      
      switch (hash) {
        case '#dashboard':
          renderDashboard();
          break;
        case '#transactions':
          renderTransactions();
          break;
        case '#investments':
          renderInvestments();
          break;
        case '#games':
          renderGames();
          break;
        case '#cards':
          renderCards();
          break;
        default:
          this.renderAuthScreen();
          break;
      }
    } catch (error) {
      showToast('Erro ao carregar página: ' + error.message, 'error');
      console.error('Erro ao renderizar página:', error);
    } finally {
      hideLoading();
    }
  }
  
  renderAuthScreen() {
    const app = document.getElementById('app');
    if (!app) return;
    
    app.innerHTML = `
      <div class="auth-container" id="authScreen">
        <div class="auth-box fade-in-up">
          <h2><i data-lucide="landmark" aria-hidden="true"></i> Bem-vindo ao Aurora Capital Bank 💲</h2>
          <p class="subtitle">Seu banco educacional para aprender finanças de forma divertida!</p>
          <div class="tabs">
            <button class="tab active" data-tab="login" aria-label="Aba de Login">Entrar</button>
            <button class="tab" data-tab="register" aria-label="Aba de Registro">Registar</button>
          </div>
          <form id="loginForm" aria-label="Formulário de Login">
            <input type="text" id="loginUsername" placeholder="Nome de utilizador" required aria-label="Nome de utilizador" />
            <input type="password" id="loginPassword" placeholder="Palavra-passe" required aria-label="Palavra-passe" />
            <button type="submit" aria-label="Entrar na conta"><i data-lucide="log-in" aria-hidden="true"></i> Entrar na minha conta</button>
          </form>
          <form id="registerForm" style="display: none;" aria-label="Formulário de Registro">
            <input type="text" id="regUsername" placeholder="Nome de utilizador" required aria-label="Nome de utilizador para registro" />
            <input type="password" id="regPassword" placeholder="Palavra-passe" required aria-label="Palavra-passe para registro" />
            <input type="text" id="regPixKey" placeholder="Chave PIX personalizada (opcional)" aria-label="Chave PIX personalizada (opcional)" />
            <div class="gender-selection">
              <p>Selecione seu gênero para avatar personalizado:</p>
              <div class="gender-options">
                <label>
                  <input type="radio" name="gender" value="male" checked aria-label="Selecionar gênero masculino" />
                  <i data-lucide="user" aria-hidden="true"></i> Homem
                </label>
                <label>
                  <input type="radio" name="gender" value="female" aria-label="Selecionar gênero feminino" />
                  <i data-lucide="user" aria-hidden="true"></i> Mulher
                </label>
              </div>
            </div>
            <button type="submit" aria-label="Criar conta"><i data-lucide="user-plus" aria-hidden="true"></i> Criar minha conta</button>
          </form>
          <div class="auth-footer">
            <p>🔒 Sua segurança é nossa prioridade. Todos os dados são criptografados.</p>
          </div>
        </div>
      </div>
    `;
    
    setTimeout(() => {
      if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
      }
    }, 100);
    
    const tabs = document.querySelectorAll('.tab');
    if (tabs) {
      tabs.forEach(tab => {
        tab.addEventListener('click', function() {
          tabs.forEach(t => t.classList.remove('active'));
          this.classList.add('active');
          const tabName = this.getAttribute('data-tab');
          const loginForm = document.getElementById('loginForm');
          const registerForm = document.getElementById('registerForm');
          if (loginForm && registerForm) {
            loginForm.style.display = tabName === 'login' ? 'block' : 'none';
            registerForm.style.display = tabName === 'register' ? 'block' : 'none';
          }
        });
      });
    }
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;
        if (username && password) {
          await this.login(username, password);
        } else {
          showToast('Preencha todos os campos.', 'error');
        }
      });
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername')?.value.trim();
        const password = document.getElementById('regPassword')?.value;
        const customPixKey = document.getElementById('regPixKey')?.value.trim();
        const genderRadios = document.getElementsByName('gender');
        let gender = 'male';
        for (const radio of genderRadios) {
          if (radio.checked) {
            gender = radio.value;
            break;
          }
        }
        if (username && password) {
          await this.register(username, password, customPixKey, gender);
        } else {
          showToast('Preencha todos os campos obrigatórios.', 'error');
        }
      });
    }
  }
  
  addListener(callback) {
    this.listeners.push(callback);
  }
  
  notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentUser));
  }
}

const userSessionManager = new UserSessionManager();
window.userSessionManager = userSessionManager;
window.navigateTo = (hash) => userSessionManager.navigateTo(hash);
window.goBack = () => userSessionManager.goBack();

// ... código anterior ...

async function initializeApp() {
  console.log("🌟 Aurora Capital Bank - Inicializando...");
  
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      userSessionManager.logout();
    });
  }
  
  // Verificar se estamos em um ambiente com restrições de storage
  const isStorageAvailable = () => {
    try {
      const test = 'test';
      sessionStorage.setItem(test, test);
      sessionStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('SessionStorage não disponível:', e.message);
      return false;
    }
  };
  
  if (!isStorageAvailable()) {
    showToast('Seu navegador possui restrições de privacidade. Algumas funcionalidades podem não estar disponíveis.', 'warning');
  }
  
  if (window.firebaseReady) {
    try {
      await userSessionManager.initialize();
      console.log("✅ Aurora Capital Bank carregado com sucesso!");
    } catch (error) {
      console.error("Erro na inicialização:", error);
      showToast('Erro ao inicializar aplicação. Recarregue a página.', 'error');
    }
  } else {
    console.error("Erro: Firebase não inicializado.");
    showToast('Erro de conexão. Verifique sua internet.', 'error');
    
    // Modo offline/demo como fallback
    setTimeout(() => {
      userSessionManager.renderAuthScreen();
    }, 1000);
  }
}

// ... resto do código ...}

window.addEventListener('hashchange', () => userSessionManager.renderPage());
window.addEventListener('load', () => {
  // Inicializar após um pequeno delay para garantir que tudo está carregado
  setTimeout(initializeApp, 300);
});