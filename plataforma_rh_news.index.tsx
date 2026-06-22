import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, EyeOff, Star, Trash2, Edit3, CheckCircle, 
  LogOut, Plus, Link as LinkIcon, MessageSquare, 
  ArrowRight, Newspaper, Sparkles, Check 
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';

// --- CONFIGURAÇÕES DE ESTILO (VENDE-C) ---
const COLORS = {
  pink: '#FF0055',    
  dark: '#0a0a0a',    
  darker: '#050505',
  gray: '#2a2a2a'
};

const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght=300;400;600;700;900&display=swap');
  
  .font-title { font-family: 'Inter', sans-serif; }
  .font-body { font-family: 'Inter', sans-serif; }
  
  .content-editor:empty:before {
    content: attr(data-placeholder);
    color: #666;
    pointer-events: none;
    display: block;
  }
`;

// --- CONFIGURAÇÃO DO BANCO DE DADOS EM NUVEM (FIREBASE) ---
const firebaseConfig = {
  apiKey: "AIzaSyDjkQvOgOClV7T1_kYQUgad_5_aaQ7-F_Q",
  authDomain: "avalie-rh-news.firebaseapp.com",
  projectId: "avalie-rh-news",
  storageBucket: "avalie-rh-news.firebasestorage.app",
  messagingSenderId: "578422633995",
  appId: "1:578422633995:web:ce98089ed34a83e7d6790e"
};

// Inicialização segura do Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'rh-news-app';

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('public'); 
  const [currentView, setCurrentView] = useState('public_eval'); 
  const [loading, setLoading] = useState(true); 
  
  const [newsletters, setNewsletters] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = fontStyles;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  // --- CONEXÃO E LEITURA DE DADOS EM TEMPO REAL ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Erro na autenticação:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Conecta as Edições do RH News
    const newsRef = collection(db, 'artifacts', appId, 'public', 'data', 'newsletters');
    const unsubNews = onSnapshot(newsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNewsletters(data.sort((a, b) => a.id.localeCompare(b.id)));
      setLoading(false); 
    }, (err) => {
      console.error("Erro ao buscar edições:", err);
      setLoading(false);
    });

    // Conecta as Avaliações
    const evalsRef = collection(db, 'artifacts', appId, 'public', 'data', 'evaluations');
    const unsubEvals = onSnapshot(evalsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEvaluations(data);
    }, (err) => console.error("Erro ao buscar avaliações:", err));

    return () => {
      unsubNews();
      unsubEvals();
    };
  }, [user]);

  // --- FUNÇÕES DE SALVAR NO BANCO DE DADOS ---
  const handleSaveNews = async (news) => {
    if (!user) return;
    
    const generateSlug = (text) => {
      return text.toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9]/g, '-') 
        .replace(/-+/g, '-') 
        .replace(/(^-|-$)/g, ''); 
    };
    
    const id = news.id || generateSlug(news.monthYear) || Date.now().toString(36); 
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'newsletters', id), { ...news, id });
  };

  const handleDeleteNews = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'newsletters', id));
  };

  const handleSaveEval = async (evalData) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'evaluations'), evalData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-gray-400 animate-pulse font-title">Carregando dados do RH News...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-body selection:bg-[#FF0055] selection:text-white">
      {/* Navegação de Teste (Simula URL) */}
      <div className="bg-black text-xs text-gray-500 p-2 flex justify-between border-b border-gray-800">
        <span>Simulador VENDE-C (Preview)</span>
        <div className="flex gap-4">
          <button onClick={() => { setUserRole('public'); setCurrentView('public_eval'); window.location.hash = ''; }} className="hover:text-white">Visão Colaborador</button>
          <button onClick={() => { if(userRole !== 'moderator') setCurrentView('login'); else setCurrentView('mod_dash'); }} className="hover:text-white">Acesso Moderador</button>
        </div>
      </div>

      {currentView === 'login' && (
        <LoginScreen onLoginSuccess={() => { setUserRole('moderator'); setCurrentView('mod_dash'); }} />
      )}

      {currentView === 'mod_dash' && userRole === 'moderator' && (
        <ModeratorDashboard 
          newsletters={newsletters} 
          onSaveNews={handleSaveNews}
          onDeleteNews={handleDeleteNews}
          evaluations={evaluations}
          onLogout={() => { setUserRole('public'); setCurrentView('public_eval'); }}
        />
      )}

      {currentView === 'public_eval' && (
        <CollaboratorView 
          newsletters={newsletters} 
          evaluations={evaluations}
          onSubmitEval={handleSaveEval}
        />
      )}
    </div>
  );
}

// ==========================================
// TELA DE LOGIN DO MODERADOR
// ==========================================
function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const validEmails = ['vinicius.silva@vende-c.com', 'lucas.izan@vende-c.com'];
    if (validEmails.includes(email) && password === 'rh2026!') {
      onLoginSuccess();
    } else {
      setError('Credenciais inválidas. Verifique seu e-mail e senha.');
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111] p-8 rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#FF0055]"></div>
        
        <h1 className="font-title text-5xl font-black mb-2 text-center text-[#FF0055]">RH NEWS</h1>
        <p className="text-gray-400 text-center mb-8">Acesso restrito à moderação</p>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#FF0055] transition-colors"
              placeholder="nome@vende-c.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Senha</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 pr-12 text-white focus:outline-none focus:border-[#FF0055] transition-colors"
                placeholder="Senha"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button 
            type="submit" 
            className="w-full bg-[#FF0055] hover:bg-[#d60047] text-white font-bold py-3 rounded-lg transition-transform hover:scale-[1.02] active:scale-95 mt-4"
          >
            ENTRAR
          </button>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// DASHBOARD DO MODERADOR
// ==========================================
function ModeratorDashboard({ newsletters, onSaveNews, onDeleteNews, evaluations, onLogout }) {
  const [activeTab, setActiveTab] = useState('manage'); 
  const [editingId, setEditingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyLink = (id) => {
    let baseUrl = window.location.href.split('?')[0].split('#')[0];
    if (baseUrl.includes('blob:') || baseUrl.includes('usercontent')) {
      baseUrl = 'https://rhnews.vende-c.com/';
    }
    
    const url = `${baseUrl}?edition=${id}`;
    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 3000);
    } catch (err) {
      console.error('Falha ao copiar', err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="pb-20">
      <div className="relative w-full h-[40vh] min-h-[350px] flex flex-col items-center justify-center text-center overflow-hidden bg-[#111]">
        <div 
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ 
            backgroundImage: "url('vende-c.jpg')",
            backgroundPosition: 'center',
            backgroundSize: 'cover'
          }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"></div>
        </div>

        <div className="relative z-10 p-4 max-w-4xl mx-auto flex flex-col items-center">
          <h1 className="font-title text-6xl md:text-8xl font-black text-white leading-none mb-2 drop-shadow-lg tracking-wide">
            RH NEWS <span className="text-[#FF0055]">VENDE-C</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl font-light max-w-2xl mt-4">
            sua plataforma de avaliações do RH News da maior escola de vendas do Brasil
          </p>
        </div>

        <button 
          onClick={onLogout}
          className="absolute top-4 right-4 flex items-center gap-2 text-gray-400 hover:text-[#FF0055] bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm transition-colors"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="flex gap-4 border-b border-gray-800 pb-4 mb-8 overflow-x-auto">
          <button 
            onClick={() => { setActiveTab('manage'); setEditingId(null); }}
            className={`font-title text-xl uppercase tracking-wide px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'manage' ? 'text-[#FF0055] border-b-2 border-[#FF0055]' : 'text-gray-500 hover:text-white'}`}
          >
            Gerenciar Edições
          </button>
          <button 
            onClick={() => setActiveTab('create')}
            className={`font-title text-xl uppercase tracking-wide px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'create' ? 'text-white border-b-2 border-white' : 'text-gray-500 hover:text-white'}`}
          >
            + Nova Edição
          </button>
          <button 
            onClick={() => { setActiveTab('evals'); setEditingId(null); }}
            className={`font-title text-xl uppercase tracking-wide px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${activeTab === 'evals' ? 'text-[#FF0055] border-b-2 border-[#FF0055]' : 'text-gray-500 hover:text-white'}`}
          >
            Ver Avaliações
          </button>
        </div>

        {activeTab === 'create' && (
          <EditorForm 
            onSave={async (newNews) => {
              await onSaveNews(newNews);
              setActiveTab('manage');
            }}
            onCancel={() => setActiveTab('manage')}
          />
        )}

        {activeTab === 'manage' && editingId && (
          <EditorForm 
            initialData={newsletters.find(n => n.id === editingId)}
            onSave={async (updatedNews) => {
              await onSaveNews(updatedNews);
              setEditingId(null);
            }}
            onCancel={() => setEditingId(null)}
          />
        )}

        {activeTab === 'manage' && !editingId && (
          <div className="grid gap-4">
            {newsletters.length === 0 ? (
              <p className="text-gray-500 text-center py-10">Nenhuma edição cadastrada.</p>
            ) : (
              newsletters.map(news => (
                <div key={news.id} className="bg-[#111] border border-gray-800 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-gray-700 transition-colors">
                  <div>
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{news.monthYear}</span>
                    <h3 className="text-2xl font-title font-bold mt-1 text-white">{news.title}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${news.status === 'published' ? 'bg-[#FF0055]/20 text-[#FF0055]' : 'bg-gray-800 text-gray-400'}`}>
                        {news.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 w-full md:w-auto flex-wrap md:flex-nowrap">
                    {news.status === 'published' && (
                      <button 
                        onClick={() => handleCopyLink(news.id)} 
                        className={`flex-1 md:flex-none p-3 rounded-lg flex justify-center items-center gap-2 transition-colors border ${copiedId === news.id ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-transparent text-[#00E5FF] hover:bg-[#00E5FF]/10 border-[#00E5FF]/30'}`}
                      >
                        {copiedId === news.id ? (
                          <><Check size={18} /> <span>Copiado!</span></>
                        ) : (
                          <><LinkIcon size={18} /> <span>Link</span></>
                        )}
                      </button>
                    )}
                    
                    <button onClick={() => setEditingId(news.id)} className="flex-1 md:flex-none bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg flex justify-center items-center gap-2 transition-colors">
                      <Edit3 size={18} /> <span className="md:hidden">Editar</span>
                    </button>
                    <button 
                      onClick={() => onDeleteNews(news.id)}
                      className="flex-1 md:flex-none bg-red-900/30 hover:bg-red-900/60 text-
