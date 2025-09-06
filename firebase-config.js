// Configuração do Firebase - Versão COMPAT (ESTÁVEL)
const firebaseConfig = {
  apiKey: "AIzaSyAOxTfFllkUMCPxkI1_aOi_o19ZB9_pVug",
  authDomain: "aurora-5c272.firebaseapp.com",
  databaseURL: "https://aurora-5c272-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "aurora-5c272",
  storageBucket: "aurora-5c272.firebasestorage.app",
  messagingSenderId: "730839225268",
  appId: "1:730839225268:web:c946f301e5f51b4ed058e1"
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