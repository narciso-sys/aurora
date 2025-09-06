// Configuração do Firebase - Versão COMPAT (ESTÁVEL)
const firebaseConfig = {
    apiKey: "AIzaSyChvOc4mp34Xj1H-eVymYvmLoocRcJOUEw",
    authDomain: "aurora-f5c63.firebaseapp.com",
    databaseURL: "https://aurora-f5c63-default-rtdb.firebaseio.com",
    projectId: "aurora-f5c63",
    storageBucket: "aurora-f5c63.firebasestorage.app",
    messagingSenderId: "74923929901",
    appId: "1:74923929901:web:a7a3d970b95e57121fa3a4"
  };

// Inicializar Firebase com tratamento de erro
try {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("✅ Firebase inicializado com sucesso!");
  }
} catch (error) {
  console.error("❌ Erro ao inicializar Firebase:", error);
}

// Exportar instâncias com fallback
window.auth = firebase.auth ? firebase.auth() : {
  onAuthStateChanged: () => console.warn('Auth não disponível'),
  signInWithEmailAndPassword: () => Promise.reject('Auth não disponível'),
  createUserWithEmailAndPassword: () => Promise.reject('Auth não disponível'),
  signOut: () => Promise.reject('Auth não disponível')
};

window.database = firebase.database ? firebase.database() : {
  ref: () => ({
    once: () => Promise.reject('Database não disponível'),
    set: () => Promise.reject('Database não disponível'),
    update: () => Promise.reject('Database não disponível'),
    transaction: () => Promise.reject('Database não disponível')
  })
};


window.firebaseReady = true;
