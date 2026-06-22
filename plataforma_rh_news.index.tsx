import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, EyeOff, Star, Trash2, Edit3, CheckCircle, 
  LogOut, Plus, Link as LinkIcon, MessageSquare, 
  ArrowRight, Newspaper, Sparkles, Check 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';

// --- CONFIGURAÇÕES DE ESTILO (VENDE-C) ---
const COLORS = {
  pink: '#FF0055',    // Rosa choque Vende-C
  dark: '#0a0a0a',    // Fundo escuro
  darker: '#050505',
  gray: '#2a2a2a'
};

// Injetando as fontes do Google Fonts
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

// Inicializa as instâncias do Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'rh-news-app';

export default function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('public'); // 'public' ou 'moderator'
  const [currentView, setCurrentView] = useState('public_eval'); // 'login', 'mod_dash', 'public_eval'
  
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
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Conecta as Edições do RH News
    const newsRef = collection(db, 'artifacts', appId, 'public', 'data', 'newsletters');
    const unsubNews = onSnapshot(newsRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordena pela data de criação
      setNewsletters(data.sort((a, b) => a.id.localeCompare(b.id)));
    }, (err) => console.error("Erro ao buscar edições:", err));

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
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9]/g, '-') // Troca espaços e símbolos por hifens
        .replace(/-+/g, '-') // Remove hifens duplicados
        .replace(/(^-|-$)/g, ''); // Tira hifen do começo ou do fim
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
                      className="flex-1 md:flex-none bg-red-900/30 hover:bg-red-900/60 text-red-500 p-3 rounded-lg flex justify-center items-center gap-2 transition-colors"
                    >
                      <Trash2 size={18} /> <span className="md:hidden">Apagar</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'evals' && (
          <EvaluationsPanel newsletters={newsletters} evaluations={evaluations} />
        )}
      </div>
    </div>
  );
}

// ==========================================
// FORMULÁRIO DE CRIAÇÃO/EDIÇÃO
// ==========================================
function EditorForm({ initialData, onSave, onCancel }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [monthYear, setMonthYear] = useState(initialData?.monthYear || '');
  const [status, setStatus] = useState(initialData?.status || 'draft');
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && initialData?.content) {
      editorRef.current.innerHTML = initialData.content;
    }
  }, [initialData]);

  const handleSave = () => {
    const content = editorRef.current.innerHTML;
    if (!title || !monthYear) {
      alert("Preencha título e mês/ano.");
      return;
    }
    onSave({ title, monthYear, content, status, id: initialData?.id });
  };

  return (
    <div className="bg-[#111] p-6 rounded-2xl border border-gray-800 shadow-xl animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="font-title text-3xl text-white">
          {initialData ? 'Editar Edição' : 'Criar Nova Edição'}
        </h2>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-sm text-gray-400">Status:</span>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#1a1a1a] border border-gray-700 rounded p-2 text-sm text-white focus:outline-none focus:border-[#FF0055] flex-1 md:flex-none"
          >
            <option value="draft">Rascunho</option>
            <option value="published">Finalizado / Publicado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Mês / Ano</label>
          <input 
            type="text" 
            value={monthYear} onChange={(e) => setMonthYear(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#FF0055]"
            placeholder="Ex: Julho 2026"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">Título da Edição</label>
          <input 
            type="text" 
            value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#FF0055]"
            placeholder="Ex: Resumo do Mês"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="flex flex-col md:flex-row text-sm text-gray-400 mb-2 items-start md:items-center justify-between gap-2">
          <span>Conteúdo da Edição</span>
          <span className="text-xs text-gray-300 bg-white/10 px-2 py-1 rounded">Copie e cole do seu e-mail (Textos, Imagens, etc)</span>
        </label>
        
        <div 
          ref={editorRef}
          className="w-full min-h-[350px] max-h-[700px] overflow-y-auto bg-[#1a1a1a] text-white p-6 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF0055] content-editor"
          contentEditable="true"
          data-placeholder="Clique aqui e pressione Ctrl+V para colar as imagens e textos do seu e-mail do RH News..."
          suppressContentEditableWarning={true}
        ></div>
      </div>

      <div className="flex flex-col md:flex-row justify-end gap-4">
        <button onClick={onCancel} className="px-6 py-3 text-gray-400 hover:text-white transition-colors border border-gray-800 rounded-lg">
          Cancelar
        </button>
        <button onClick={handleSave} className="bg-[#FF0055] hover:bg-[#d60047] text-white font-bold px-8 py-3 rounded-lg flex justify-center items-center gap-2 transition-transform hover:scale-105">
          <CheckCircle size={20} /> Salvar Edição
        </button>
      </div>
    </div>
  );
}

// ==========================================
// PAINEL DE AVALIAÇÕES (MODERADOR)
// ==========================================
function EvaluationsPanel({ newsletters, evaluations }) {
  const [selectedNewsId, setSelectedNewsId] = useState(newsletters[0]?.id || '');

  const filteredEvals = evaluations.filter(e => e.newsletterId === selectedNewsId);
  const avgRating = filteredEvals.length > 0 
    ? (filteredEvals.reduce((acc, curr) => acc + curr.rating, 0) / filteredEvals.length).toFixed(1) 
    : 0;

  return (
    <div className="bg-[#111] p-6 rounded-2xl border border-gray-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="w-full md:w-auto">
          <h2 className="font-title text-3xl text-[#FF0055] mb-2">Visão Geral de Resultados</h2>
          <select 
            value={selectedNewsId} 
            onChange={(e) => setSelectedNewsId(e.target.value)}
            className="w-full md:w-auto bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-[#FF0055]"
          >
            <option value="" disabled>Selecione uma edição...</option>
            {newsletters.map(n => (
              <option key={n.id} value={n.id}>{n.monthYear} - {n.title}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-auto bg-black border border-gray-800 px-8 py-4 rounded-xl flex items-center justify-around gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Média Geral</p>
            <div className="flex items-center justify-center gap-2 text-4xl font-black text-white font-title">
              <Star fill="#FF0055" className="text-[#FF0055]" size={32} />
              {avgRating > 0 ? avgRating : '-'}
            </div>
          </div>
          <div className="w-px h-12 bg-gray-800 mx-2"></div>
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Recebido</p>
            <p className="text-3xl font-bold text-white">{filteredEvals.length}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredEvals.length === 0 ? (
          <div className="text-center py-12 bg-[#1a1a1a] rounded-xl border border-gray-800 border-dashed">
            <MessageSquare size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">Nenhuma avaliação recebida para esta edição ainda.</p>
          </div>
        ) : (
          filteredEvals.map((evalData, index) => (
            <div key={index} className="bg-[#1a1a1a] p-5 rounded-xl border border-gray-800 flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0 flex flex-col items-center justify-center bg-black w-24 h-24 rounded-xl border border-gray-700">
                <span className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Nota</span>
                <span className={`text-3xl font-black ${evalData.rating >= 8 ? 'text-white' : evalData.rating >= 5 ? 'text-gray-300' : 'text-[#FF0055]'}`}>
                  {evalData.rating}
                </span>
              </div>
              <div className="flex-grow">
                <h4 className="text-xl font-bold text-white">{evalData.name}</h4>
                <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{evalData.role}</span>
                {evalData.comment && (
                  <div className="mt-4 bg-[#111] p-4 rounded-lg text-gray-300 italic text-sm border-l-4 border-[#FF0055]">
                    "{evalData.comment}"
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ==========================================
// TELA PÚBLICA / COLABORADOR (PARA AVALIAR)
// ==========================================
function CollaboratorView({ newsletters, evaluations, onSubmitEval }) {
  const publishedNews = newsletters.filter(n => n.status === 'published');
  
  const [selectedId, setSelectedId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const idFromQuery = params.get('edition');
    const idFromHash = window.location.hash.replace('#', '');
    return idFromQuery || idFromHash || null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedId(params.get('edition') || window.location.hash.replace('#', '') || null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  let currentNews = publishedNews.find(n => n.id === selectedId);
  if (!currentNews && publishedNews.length > 0) {
    currentNews = publishedNews[publishedNews.length - 1];
  }

  const otherNews = publishedNews.filter(n => n.id !== currentNews?.id).reverse();

  const [rating, setRating] = useState(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showEval, setShowEval] = useState(false);

  useEffect(() => {
    setRating(null);
    setName('');
    setRole('');
    setComment('');
    setSubmitted(false);
    setShowEval(false);
  }, [currentNews?.id]);

  if (!currentNews) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a]">
        <div className="text-center p-10 bg-[#111] rounded-2xl shadow-xl max-w-md w-full border border-gray-800">
          <h1 className="text-4xl font-bold text-[#FF0055] mb-4">RH NEWS</h1>
          <p className="text-gray-500">Nenhuma edição disponível no momento.</p>
        </div>
      </div>
    );
  }

  const newsEvals = evaluations.filter(e => e.newsletterId === currentNews.id);
  const avgRating = newsEvals.length > 0 
    ? (newsEvals.reduce((acc, curr) => acc + curr.rating, 0) / newsEvals.length).toFixed(1) 
    : "0.0";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === null) {
      alert("Por favor, selecione uma nota de 0 a 10.");
      return;
    }
    onSubmitEval({
      newsletterId: currentNews.id,
      rating,
      name,
      role,
      comment,
      date: new Date().toISOString()
    });
    setSubmitted(true);
  };

  const handleScrollToEval = () => {
    setShowEval(true);
    setTimeout(() => {
      const section = document.getElementById('avaliacao-section');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-20 font-body">
      <header className="bg-[#050505] border-b border-gray-900 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-[#FF0055] p-2 rounded-xl shadow-lg shadow-[#FF0055]/20">
              <Newspaper size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">RH News</h1>
              <p className="text-gray-500 text-xs">Newsletter interno</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative w-full border-b border-gray-900 overflow-hidden bg-[#111]">
        <div 
          className="absolute inset-0 bg-cover bg-center z-0 scale-105"
          style={{ backgroundImage: "url('vende-c.jpg')" }}
        >
          <div className="absolute inset-0 bg-black/50"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-28 md:py-36 flex flex-col items-start">
          <div className="inline-flex items-center gap-2 bg-[#FF0055]/10 border border-[#FF0055]/20 text-[#FF0055] px-4 py-1.5 rounded-full text-sm font-semibold mb-6 shadow-sm">
            <Sparkles size={16} /> Edição do mês — {currentNews.monthYear}
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight uppercase max-w-4xl">
            RH NEWS — {currentNews.monthYear}
          </h1>
          
          <div className="flex items-center gap-3 bg-[#111]/80 backdrop-blur-md border border-gray-800 px-4 py-2.5 rounded-full w-fit mb-10 shadow-lg">
            <Star fill="#D4FF00" className="text-[#D4FF00]" size={18} />
            <span className="text-white font-bold text-lg">{avgRating}</span>
            <span className="text-gray-400 text-sm">({newsEvals.length} avaliações)</span>
          </div>

          <button 
            onClick={handleScrollToEval}
            className="bg-[#FF0055] hover:bg-[#d60047] text-white font-bold py-4 px-8 rounded-xl flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 shadow-xl shadow-[#FF0055]/20"
          >
            Ler e avaliar <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-16">
        {showEval && (
          <div id="avaliacao-section" className="mb-24 animate-fade-in scroll-mt-24">
            <section className="bg-[#111] rounded-2xl shadow-2xl overflow-hidden mb-12 border border-gray-800">
              <div className="bg-[#050505] p-8 text-white border-b border-gray-800">
                <h2 className="text-3xl font-bold text-white mb-2">Avalie esta edição</h2>
                <p className="text-gray-400 text-lg">Sua opinião constrói o nosso RH News. Avalie com base no conteúdo que você leu.</p>
              </div>

              <div className="p-6 md:p-10">
                {submitted ? (
                  <div className="text-center py-12 animate-fade-in">
                    <div className="w-24 h-24 bg-[#FF0055]/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <CheckCircle size={50} className="text-[#FF0055]" />
                    </div>
                    <h3 className="text-3xl font-black text-white mb-3">Avaliação Registrada!</h3>
                    <p className="text-gray-400 text-lg mb-8">Muito obrigado, <span className="font-bold text-white">{name.split(' ')[0]}</span>! Sua nota e feedback ajudam o RH a evoluir sempre.</p>
                    <a href="#conteudo" className="inline-block bg-[#FF0055] hover:bg-[#d60047] text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                      Ler a edição completa ↓
                    </a>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="text-center">
                      <label className="block font-bold text-gray-300 mb-6 uppercase tracking-widest text-lg">
                        De 0 a 10, que nota você dá para esta edição?
                      </label>
                      <div className="flex flex-wrap justify-center gap-3">
                        {[0,1,2,3,4,5,6,7,8,9,10].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setRating(num)}
                            className={`w-12 h-12 md:w-14 md:h-14 rounded-full font-black text-xl transition-all ${
                              rating === num 
                                ? 'bg-[#FF0055] text-white scale-110 shadow-xl shadow-[#FF0055]/40 ring-4 ring-offset-2 ring-black border border-[#FF0055]' 
                                : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a] hover:text-white hover:scale-105 border border-gray-800'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-gray-800 w-full my-8"></div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">Seu Nome Completo</label>
                        <input 
                          type="text" required
                          value={name} onChange={e => setName(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-4 text-lg text-white focus:bg-[#222] focus:ring-2 focus:ring-[#FF0055] focus:border-transparent outline-none transition-all shadow-sm"
                          placeholder="Ex: João da Silva"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">Seu Cargo na Vende-C</label>
                        <input 
                          type="text" required
                          value={role} onChange={e => setRole(e.target.value)}
                          className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-4 text-lg text-white focus:bg-[#222] focus:ring-2 focus:ring-[#FF0055] focus:border-transparent outline-none transition-all shadow-sm"
                          placeholder="Ex: Consultor de Vendas"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">
                        Deixe um Comentário ou Sugestão <span className="text-gray-600 font-normal normal-case">(Opcional)</span>
                      </label>
                      <textarea 
                        value={comment} onChange={e => setComment(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-gray-700 rounded-xl p-4 text-lg text-white h-32 resize-none focus:bg-[#222] focus:ring-2 focus:ring-[#FF0055] focus:border-transparent outline-none transition-all shadow-sm"
                        placeholder="O que você mais gostou nesta edição? O que podemos melhorar?"
                      ></textarea>
                    </div>

                    <button 
                      type="submit" 
                      className="w-full bg-[#FF0055] hover:bg-[#d60047] text-white font-black py-5 rounded-xl text-xl shadow-xl shadow-[#FF0055]/30 transition-all transform hover:-translate-y-1 tracking-wide uppercase border border-[#FF0055]"
                    >
                      Confirmar Minha Avaliação
                    </button>
                  </form>
                )}
              </div>
            </section>

            <section id="conteudo" className="bg-[#111] p-6 md:p-12 rounded-2xl shadow-xl border border-gray-800 mt-12">
              <div className="mb-10 border-b-2 border-gray-800 pb-6 text-left">
                <p className="text-[#FF0055] uppercase tracking-widest text-sm font-bold mb-2">Conteúdo da Edição</p>
                <h3 className="text-4xl md:text-5xl font-bold text-white leading-tight">{currentNews.title}</h3>
              </div>
              
              <div 
                className="prose prose-lg md:prose-xl max-w-none 
                           prose-img:rounded-xl prose-img:shadow-lg prose-img:mx-auto 
                           prose-headings:text-white prose-headings:font-bold
                           prose-a:text-[#FF0055] prose-a:font-bold hover:prose-a:text-white
                           text-gray-300 prose-strong:text-white prose-p:text-gray-300 prose-li:text-gray-300"
                dangerouslySetInnerHTML={{ __html: currentNews.content }}
              />
            </section>
          </div>
        )}

        {otherNews.length > 0 && (
          <section className="mb-24 pt-10 border-t border-gray-800">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-1.5 h-8 bg-[#FF0055] rounded-full"></div>
              <h2 className="text-3xl font-bold text-white">Outras Edições</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {otherNews.map(news => (
                <a 
                  key={news.id} 
                  href={`?edition=${news.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedId(news.id);
                    window.history.pushState({}, '', `?edition=${news.id}`);
                    window.scrollTo(0, 0);
                  }}
                  className="block bg-[#111] border border-gray-800 rounded-xl p-6 hover:border-[#FF0055] hover:-translate-y-1 transition-all cursor-pointer group h-full flex flex-col"
                >
                  <span className="text-xs text-[#FF0055] font-bold uppercase tracking-wider mb-2 block">
                    {news.monthYear}
                  </span>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#FF0055] transition-colors">
                    {news.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-3 mt-auto">
                    Acesse para ler o conteúdo desta edição e rever as novidades do mês.
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
