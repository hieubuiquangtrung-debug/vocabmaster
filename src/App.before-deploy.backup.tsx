// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Plus, Trash2, Edit, Play, Trophy, Users, CheckCircle, XCircle, 
  RotateCw, Volume2, Sparkles, ArrowRight, ArrowLeft, Award, Clock, Star, 
  BarChart2, Copy, Share2, Check, RefreshCw, Grid, HelpCircle, Key, UserCheck, Eye
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCGLEoKvUovc0jTL5dWzSviJSWyuMfG2Bo",
  authDomain: "vocabmaster-2b35b.firebaseapp.com",
  projectId: "vocabmaster-2b35b",
  storageBucket: "vocabmaster-2b35b.firebasestorage.app",
  messagingSenderId: "526077722044",
  appId: "1:526077722044:web:b8fea3e0f7cc385977bfb9",
  measurementId: "G-JJFZ6D0RR1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'vocab-master-app';

const playAudioFeedback = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'incorrect') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
      osc.frequency.exponentialRampToValueAtTime(164.81, ctx.currentTime + 0.2); // E3
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'flip') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    }
  } catch (e) {
    // Audio context not allowed or failed
  }
};

const speakWord = (text, lang = 'en-US') => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }
};

const Confetti = () => {
  const pieces = Array.from({ length: 40 });
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const size = Math.random() * 10 + 6;
        const animDuration = Math.random() * 2 + 2;
        const delay = Math.random() * 0.5;
        const bgColors = ['#f43f5e', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'];
        const color = bgColors[Math.floor(Math.random() * bgColors.length)];
        return (
          <div
            key={i}
            className="absolute top-0 rounded-sm animate-bounce"
            style={{
              left: `${left}%`,
              width: `${size}px`,
              height: `${size * 1.5}px`,
              backgroundColor: color,
              opacity: 0.8,
              transform: `rotate(${Math.random() * 360}deg)`,
              animation: `fall ${animDuration}s ease-out ${delay}s infinite`
            }}
          />
        );
      })}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('student'); // 'student', 'teacher-login', or 'teacher'
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [teacherLoginError, setTeacherLoginError] = useState('');
  const [isTeacherLoggedIn, setIsTeacherLoggedIn] = useState(false);
  const [sets, setSets] = useState([]);
  const [selectedSetId, setSelectedSetId] = useState('');
  const sharedSetId = new URLSearchParams(window.location.search).get('set');
  useEffect(() => {
  if (sharedSetId) {
    setSelectedSetId(sharedSetId);
    setMode('student');
    setActiveStudyMode('menu');
  }
}, [sharedSetId]);

  const [results, setResults] = useState([]);
  
  // Student state
  const [studentName, setStudentName] = useState(() => localStorage.getItem('vocab_student_name') || '');
  const [activeStudyMode, setActiveStudyMode] = useState('menu'); // 'menu', 'flashcards', 'quiz', 'matching', 'spelling', 'completed'
  const [latestScoreData, setLatestScoreData] = useState(null);

  // Form State for creating/editing sets
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [editingSetId, setEditingSetId] = useState(null);
  const [setTitle, setSetTitle] = useState('');
  const [setDescription, setSetDescription] = useState('');
  const [terms, setTerms] = useState([
    { id: '1', term: 'Hello', definition: 'Xin chào', example: 'Hello, how are you?' },
    { id: '2', term: 'Vocabulary', definition: 'Từ vựng', example: 'Learning vocabulary is fun.' },
    { id: '3', term: 'Teacher', definition: 'Giáo viên', example: 'Our teacher is very supportive.' },
    { id: '4', term: 'Student', definition: 'Học sinh', example: 'The student studies hard.' }
  ]);
 
  const [copiedLink, setCopiedLink] = useState(false);
  
  const handleTeacherLogin = async (e) => {
  e.preventDefault();

  setTeacherLoginError('');

  try {
    await signInWithEmailAndPassword(
      auth,
      teacherEmail.trim(),
      teacherPassword
    );

    setIsTeacherLoggedIn(true);
    setMode('teacher');
    setTeacherPassword('');
  } catch (error) {
    console.error('Teacher login error:', error);
    setTeacherLoginError('Email hoặc mật khẩu không đúng.');
  }
};

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

useEffect(() => {
  if (!user) return;

  // =========================
  // LOAD VOCABULARY SETS
  // Students + Teachers
  // =========================
  const setsRef = collection(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    'vocab_sets'
  );

  const unsubSets = onSnapshot(
    setsRef,
    (snapshot) => {
      const setsData = [];

      snapshot.forEach((doc) => {
        setsData.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setSets(setsData);

      // Auto select first set if none selected
      if (setsData.length > 0 && !selectedSetId && !sharedSetId) {
  setSelectedSetId(setsData[0].id);
}
    },
    (error) => {
      console.error("Error fetching sets:", error);
    }
  );

  // =========================
  // LOAD STUDENT RESULTS
  // TEACHER ONLY
  // =========================
  let unsubResults = null;

  if (isTeacherLoggedIn) {
    const resultsRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'vocab_results'
    );

    unsubResults = onSnapshot(
      resultsRef,
      (snapshot) => {
        const resultsData = [];

        snapshot.forEach((doc) => {
          resultsData.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // Sort by date descending
        resultsData.sort(
          (a, b) =>
            new Date(b.timestamp || 0) -
            new Date(a.timestamp || 0)
        );

        setResults(resultsData);
      },
      (error) => {
        console.error("Error fetching results:", error);
      }
    );
  } else {
    // Student does not read the results collection
    setResults([]);
  }

  return () => {
    unsubSets();

    if (unsubResults) {
      unsubResults();
    }
  };
}, [user, isTeacherLoggedIn]);

  // Selected Set Details
  const activeSet = sets.find(s => s.id === selectedSetId) || (sets.length > 0 ? sets[0] : null);

  const handleAddTermRow = () => {
    setTerms([...terms, { id: Date.now().toString(), term: '', definition: '', example: '' }]);
  };

  const handleTermChange = (id, field, value) => {
    setTerms(terms.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleRemoveTermRow = (id) => {
    if (terms.length <= 2) {
      alert("Bộ từ vựng cần có ít nhất 2 từ!");
      return;
    }
    setTerms(terms.filter(t => t.id !== id));
  };

  const handleSaveSet = async (e) => {
    e.preventDefault();
    if (!setTitle.trim()) return alert("Vui lòng nhập tên bộ từ vựng!");
    
    const validTerms = terms.filter(t => t.term.trim() && t.definition.trim());
    if (validTerms.length < 2) return alert("Cần ít nhất 2 từ hợp lệ (gồm Từ & Định nghĩa)!");

    try {
      const setPayload = {
        title: setTitle,
        description: setDescription,
        terms: validTerms,
        createdAt: new Date().toISOString(),
        author: 'Teacher'
      };

      if (editingSetId) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'vocab_sets', editingSetId);
        await updateDoc(docRef, setPayload);
      } else {
        const colRef = collection(db, 'artifacts', appId, 'public', 'data', 'vocab_sets');
        const newDoc = await addDoc(colRef, setPayload);
        setSelectedSetId(newDoc.id);
      }

      // Reset form
      setSetTitle('');
      setSetDescription('');
      setTerms([{ id: '1', term: '', definition: '', example: '' }]);
      setIsCreatingSet(false);
      setEditingSetId(null);
    } catch (err) {
      console.error("Error saving set:", err);
    }
  };

  const handleStartEditSet = (vocabSet) => {
    setEditingSetId(vocabSet.id);
    setSetTitle(vocabSet.title);
    setSetDescription(vocabSet.description || '');
    setTerms(vocabSet.terms || []);
    setIsCreatingSet(true);
  };

  const handleDeleteSet = async (setId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa bộ từ vựng này không?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'vocab_sets', setId));
        if (selectedSetId === setId) {
          setSelectedSetId('');
        }
      } catch (err) {
        console.error("Error deleting set:", err);
      }
    }
  };

  const handleSaveScore = async (scoreData) => {
    if (!studentName.trim()) return;
    localStorage.setItem('vocab_student_name', studentName);
    
    setLatestScoreData(scoreData);
    setActiveStudyMode('completed');

    if (!user || !activeSet) return;

    try {
      const resultsColRef = collection(db, 'artifacts', appId, 'public', 'data', 'vocab_results');
      await addDoc(resultsColRef, {
        studentName: studentName.trim(),
        setId: activeSet.id,
        setTitle: activeSet.title,
        mode: scoreData.mode,
        score: scoreData.score,
        total: scoreData.total,
        percentage: Math.round((scoreData.score / scoreData.total) * 100),
        timeTakenSeconds: scoreData.timeSeconds || 0,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error saving score:", err);
    }
  };

  const copyShareLink = () => {
  if (!selectedSetId) return;

  const url = new URL(window.location.href);
  url.searchParams.set('set', selectedSetId);

  navigator.clipboard.writeText(url.toString());

  setCopiedLink(true);
  setTimeout(() => setCopiedLink(false), 2000);
};

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveStudyMode('menu')}>
            <div className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900 tracking-tight flex items-center gap-2">
                Vocab<span className="text-indigo-600">Master</span>
                <span className="text-xs font-semibold uppercase px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Luyện Từ Vựng</span>
              </h1>
            </div>
          </div>

          {/* Role Toggle Switch */}
          <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => { setMode('student'); setActiveStudyMode('menu'); }}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'student' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Học Sinh</span>
            </button>
            <button
            onClick={() => {
  if (isTeacherLoggedIn) {
    setMode('teacher');
    setIsCreatingSet(false);
  } else {
    setMode('teacher-login');
  }
}}
               className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                mode === 'teacher' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Key className="w-4 h-4" />
              <span>Giáo Viên</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
       
        {mode === 'teacher-login' ? (
  <TeacherLogin
    teacherEmail={teacherEmail}
    setTeacherEmail={setTeacherEmail}
    teacherPassword={teacherPassword}
    setTeacherPassword={setTeacherPassword}
    teacherLoginError={teacherLoginError}
    handleTeacherLogin={handleTeacherLogin}
    setMode={setMode}
  />
) : mode === 'teacher' ? (
          /* ================= TEACHER MODE ================= */
          <TeacherDashboard 
            sets={sets}
            selectedSetId={selectedSetId}
            setSelectedSetId={setSelectedSetId}
            results={results}
            isCreatingSet={isCreatingSet}
            setIsCreatingSet={setIsCreatingSet}
            setTitle={setTitle}
            setSetTitle={setSetTitle}
            setDescription={setDescription}
            setSetDescription={setSetDescription}
            terms={terms}
            handleAddTermRow={handleAddTermRow}
            handleTermChange={handleTermChange}
            handleRemoveTermRow={handleRemoveTermRow}
            handleSaveSet={handleSaveSet}
            handleStartEditSet={handleStartEditSet}
            handleDeleteSet={handleDeleteSet}
            copyShareLink={copyShareLink}
            copiedLink={copiedLink}
          />
        ) : (
          /* ================= STUDENT MODE ================= */
          <StudentArea
            sets={sets}
            selectedSetId={selectedSetId}
            setSelectedSetId={setSelectedSetId}
            activeSet={activeSet}
            studentName={studentName}
            setStudentName={setStudentName}
            activeStudyMode={activeStudyMode}
            setActiveStudyMode={setActiveStudyMode}
            handleSaveScore={handleSaveScore}
            latestScoreData={latestScoreData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
        <p>VocabMaster &copy; {new Date().getFullYear()} - Nền Tảng Tự Học Từ Vựng Tương Tác</p>
      </footer>
    </div>
  );
}
function TeacherLogin({
  teacherEmail,
  setTeacherEmail,
  teacherPassword,
  setTeacherPassword,
  teacherLoginError,
  handleTeacherLogin,
  setMode
}) {
  return (
    <div className="max-w-md mx-auto mt-16">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Key className="w-7 h-7" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900">
            Đăng nhập Giáo viên
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            Đăng nhập để quản lý các bộ từ vựng và kết quả học sinh.
          </p>
        </div>

        <form onSubmit={handleTeacherLogin} className="space-y-5">

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Email
            </label>

            <input
              type="email"
              value={teacherEmail}
              onChange={(e) => setTeacherEmail(e.target.value)}
              placeholder="teacher@vocabmaster.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Mật khẩu
            </label>

            <input
              type="password"
              value={teacherPassword}
              onChange={(e) => setTeacherPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {teacherLoginError && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">
              {teacherLoginError}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition"
          >
            Đăng nhập
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('student');
              setTeacherLoginError('');
            }}
            className="w-full text-slate-500 hover:text-slate-800 text-sm"
          >
            ← Quay lại Học sinh
          </button>

        </form>
      </div>
    </div>
  );
}
function TeacherDashboard({
  sets, selectedSetId, setSelectedSetId, results, isCreatingSet, setIsCreatingSet,
  setTitle, setSetTitle, setDescription, setSetDescription, terms,
  handleAddTermRow, handleTermChange, handleRemoveTermRow, handleSaveSet,
  handleStartEditSet, handleDeleteSet, copyShareLink, copiedLink
}) {
  const [showQRCode, setShowQRCode] = useState(false);
  const [activeTab, setActiveTab] = useState('sets'); // 'sets' or 'leaderboard'

  const selectedSet = sets.find(s => s.id === selectedSetId);
  const filteredResults = results.filter(r => !selectedSetId || r.setId === selectedSetId);

  return (
    <div className="space-y-6">
      {/* Teacher Top Bar */}
      <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-indigo-300 bg-indigo-800/80 px-2.5 py-1 rounded-md">
            Giao Diện Quản Lý Giáo Viên
          </span>
          <h2 className="text-2xl font-extrabold mt-2">Bảng Điều Khiển Lớp Học</h2>
          <p className="text-indigo-200 text-sm mt-1">
            Tạo bài tập từ vựng, chia sẻ link cho học sinh và xem bảng xếp hạng điểm thực tế.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!isCreatingSet && (
            <button
              onClick={() => {
                setSetTitle('');
                setSetDescription('');
                setIsCreatingSet(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm"
            >
              <Plus className="w-5 h-5" />
              Tạo Bộ Từ Mới
            </button>
          )}
          <div className="relative">
  <div className="flex items-center gap-2">
    <button
      onClick={copyShareLink}
      className="bg-indigo-700 hover:bg-indigo-600 text-indigo-100 font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm border border-indigo-500/30"
    >
      {copiedLink ? (
        <Check className="w-4 h-4 text-emerald-400" />
      ) : (
        <Share2 className="w-4 h-4" />
      )}
      {copiedLink ? "Đã sao chép Link!" : "Sao Chép Link Học Sinh"}
    </button>

    <button
      onClick={() => setShowQRCode(!showQRCode)}
      className="bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 text-sm border border-white/20"
    >
      <Grid className="w-4 h-4" />
      QR Code
    </button>
  </div>

  {showQRCode && selectedSetId && (
    <div className="absolute right-0 top-full mt-3 z-50 bg-white p-5 rounded-2xl shadow-xl border border-slate-200 w-72">
      <div className="text-center">
        <h4 className="font-bold text-slate-800 text-sm">
  {selectedSet?.title || 'Bài học'}
</h4>

        <p className="text-xs text-slate-500 mt-1 mb-4">
          Học sinh quét mã để mở bài học
        </p>

        <div className="flex justify-center">
          <QRCodeSVG
            value={`${window.location.origin}/?set=${selectedSetId}`}
            size={200}
            level="H"
          />
        </div>

        <button
          onClick={() => setShowQRCode(false)}
          className="mt-4 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          Đóng
        </button>
      </div>
    </div>
  )}
</div>
          
        </div>
      </div>

      {isCreatingSet ? (
        /* CREATE / EDIT SET FORM */
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-fadeIn">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">
              {setTitle ? `Chỉnh Sửa: ${setTitle}` : 'Tạo Bộ Từ Vựng Mới'}
            </h3>
            <button
              onClick={() => setIsCreatingSet(false)}
              className="text-slate-400 hover:text-slate-600 font-medium text-sm"
            >
              Hủy Bỏ
            </button>
          </div>

          <form onSubmit={handleSaveSet} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Tên Bộ Từ Vựng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Unit 1 - Family & Friends"
                  value={setTitle}
                  onChange={(e) => setSetTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Mô Tả / Ghi Chú
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Từ vựng Tiếng Anh lớp 6 nâng cao"
                  value={setDescription}
                  onChange={(e) => setSetDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none transition"
                />
              </div>
            </div>

            {/* Terms List Input */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">
                  Danh Sách Từ & Định Nghĩa ({terms.length})
                </h4>
              </div>

              {terms.map((item, index) => (
                <div key={item.id || index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-start md:items-center relative group">
                  <span className="font-extrabold text-slate-400 text-xs w-6">#{index + 1}</span>
                  <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Từ / Khái niệm (English)"
                      value={item.term}
                      onChange={(e) => handleTermChange(item.id, 'term', e.target.value)}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Nghĩa / Định nghĩa (Tiếng Việt)"
                      value={item.definition}
                      onChange={(e) => handleTermChange(item.id, 'definition', e.target.value)}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Ví dụ (Không bắt buộc)"
                      value={item.example || ''}
                      onChange={(e) => handleTermChange(item.id, 'example', e.target.value)}
                      className="px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTermRow(item.id)}
                    className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                    title="Xóa hàng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={handleAddTermRow}
                className="w-full py-3 border-2 border-dashed border-indigo-200 hover:border-indigo-400 text-indigo-600 font-medium rounded-xl hover:bg-indigo-50/50 transition flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" /> Thêm Từ Mới
              </button>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreatingSet(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium text-sm transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm shadow-md transition"
              >
                Lưu Bộ Từ Vựng
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* MAIN TEACHER VIEW: SETS & RESULTS */
        <div className="space-y-6">
          {/* Sub Navigation */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('sets')}
              className={`pb-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
                activeTab === 'sets'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" /> Danh Sách Bộ Từ ({sets.length})
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`pb-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
                activeTab === 'leaderboard'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Trophy className="w-4 h-4" /> Kết Quả & Bảng Xếp Hạng ({filteredResults.length})
            </button>
          </div>

          {activeTab === 'sets' ? (
            /* TAB 1: SETS LIST */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sets.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Chưa có bộ từ vựng nào được tạo.</p>
                  <button
                    onClick={() => setIsCreatingSet(true)}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
                  >
                    + Tạo bộ từ đầu tiên
                  </button>
                </div>
              ) : (
                sets.map(s => (
                  <div 
                    key={s.id} 
                    className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between ${
                      selectedSetId === s.id ? 'ring-2 ring-indigo-500 border-indigo-200' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h3 className="font-bold text-slate-900 text-lg line-clamp-1">{s.title}</h3>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                          {s.terms?.length || 0} từ
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs line-clamp-2 mb-4 h-8">
                        {s.description || 'Không có mô tả.'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleStartEditSet(s)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Sửa bộ từ"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSet(s.id)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Xóa bộ từ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => setSelectedSetId(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                          selectedSetId === s.id
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {selectedSetId === s.id ? 'Đang chọn' : 'Chọn bài này'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* TAB 2: LEADERBOARD & RESULTS */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Lọc theo bài:</span>
                  <select
                    value={selectedSetId}
                    onChange={(e) => setSelectedSetId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- Tất cả bài tập --</option>
                    {sets.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-slate-500">
                  Tổng lượt nộp bài: <span className="font-bold text-slate-800">{filteredResults.length}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Học Sinh</th>
                      <th className="py-3 px-4">Bộ Từ Vựng</th>
                      <th className="py-3 px-4">Chế Độ</th>
                      <th className="py-3 px-4 text-center">Điểm Số</th>
                      <th className="py-3 px-4 text-center">Tỷ Lệ</th>
                      <th className="py-3 px-4 text-right">Thời Gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-400">
                          Chưa có kết quả nộp bài nào từ học sinh.
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((r, idx) => (
                        <tr key={r.id || idx} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-extrabold ${
                              idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {idx + 1}
                            </span>
                            {r.studentName}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{r.setTitle}</td>
                          <td className="py-3 px-4">
                            <span className="capitalize px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium text-xs">
                              {r.mode === 'quiz' ? 'Trắc nghiệm' : r.mode === 'matching' ? 'Nối từ' : r.mode === 'spelling' ? 'Chính tả' : 'Thẻ nhớ'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-slate-800">
                            {r.score} / {r.total}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                              r.percentage >= 80 ? 'bg-emerald-100 text-emerald-700' :
                              r.percentage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {r.percentage}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400 text-xs">
                            {r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Vừa xong'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StudentArea({
  sets, selectedSetId, setSelectedSetId, activeSet, studentName, setStudentName,
  activeStudyMode, setActiveStudyMode, handleSaveScore, latestScoreData
}) {
  const isSharedLink = new URLSearchParams(window.location.search).has('set');
  
  if (sets.length === 0) {
    return (
      <div className="py-16 text-center max-w-md mx-auto bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
        <BookOpen className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800">Chưa có bài học nào</h3>
        <p className="text-slate-500 text-sm mt-2">Vui lòng chờ giáo viên tạo và kích hoạt bộ từ vựng!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Name & Set Selection Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 max-w-xs">
            <label className="block text-xs font-semibold text-slate-500 mb-0.5">Tên Học Sinh</label>
            <input
              type="text"
              placeholder="Nhập tên của bạn..."
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-sm font-semibold outline-none"
            />
          </div>
        </div>

      <div className="flex items-center gap-3">
  <span className="text-xs font-semibold text-slate-500">Chọn Bài Học:</span>
  <select
    value={selectedSetId}
    disabled={isSharedLink}
    onChange={(e) => {
      setSelectedSetId(e.target.value);
      setActiveStudyMode('menu');
    }}
    className={`px-4 py-2 rounded-xl border font-semibold text-sm outline-none ${
  isSharedLink
    ? 'border-indigo-200 bg-indigo-50 text-indigo-700 cursor-not-allowed'
    : 'border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-500'
}`}
    >
    {sets.map(s => (
      <option key={s.id} value={s.id}>
        {s.title} ({s.terms?.length || 0} từ)
      </option>
    ))}
  </select>
        </div>
      </div>

      {!activeSet ? null : activeStudyMode === 'menu' ? (
        /* MODE SELECTION CARDS */
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-8 rounded-3xl shadow-xl">
            <h2 className="text-2xl sm:text-3xl font-black">{activeSet.title}</h2>
            <p className="text-indigo-100 text-sm mt-2 max-w-2xl">
              {activeSet.description || 'Hãy chọn một chế độ bên dưới để bắt đầu luyện tập từ vựng!'}
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs bg-white/20 w-fit px-3 py-1 rounded-full font-medium">
              <Sparkles className="w-3.5 h-3.5" /> Tổng số: {activeSet.terms?.length || 0} từ vựng
            </div>
          </div>

          {!studentName.trim() && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Hãy nhập <strong>Tên Học Sinh</strong> ở góc trên để kết quả của bạn được lưu vào Bảng Xếp Hạng!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Flashcard Mode */}
            <StudyCard
              title="Thẻ Ghi Nhớ (Flashcards)"
              desc="Lật thẻ học từ vựng, nghe phát âm chuẩn và tự kiểm tra trí nhớ."
              icon={<RotateCw className="w-8 h-8 text-indigo-500" />}
              color="border-indigo-100 hover:border-indigo-300 bg-white"
              onClick={() => setActiveStudyMode('flashcards')}
            />

            {/* 2. Multiple Choice Quiz */}
            <StudyCard
              title="Trắc Nghiệm Nhanh"
              desc="Chọn đáp án đúng trong 4 phương án. Kiểm tra phản xạ từ vựng."
              icon={<CheckCircle className="w-8 h-8 text-emerald-500" />}
              color="border-emerald-100 hover:border-emerald-300 bg-white"
              onClick={() => setActiveStudyMode('quiz')}
            />

            {/* 3. Matching Game */}
            <StudyCard
              title="Trò Chơi Nối Từ"
              desc="Ghép nhanh các cặp Từ và Nghĩa tương ứng trước khi hết thời gian."
              icon={<Grid className="w-8 h-8 text-amber-500" />}
              color="border-amber-100 hover:border-amber-300 bg-white"
              onClick={() => setActiveStudyMode('matching')}
            />

            {/* 4. Spelling Practice */}
            <StudyCard
              title="Luyện Gõ Chính Tả"
              desc="Lắng nghe âm thanh từ vựng và gõ lại thật chính xác từng ký tự."
              icon={<Volume2 className="w-8 h-8 text-rose-500" />}
              color="border-rose-100 hover:border-rose-300 bg-white"
              onClick={() => setActiveStudyMode('spelling')}
            />
          </div>
        </div>
      ) : activeStudyMode === 'flashcards' ? (
        <FlashcardMode activeSet={activeSet} onBack={() => setActiveStudyMode('menu')} />
      ) : activeStudyMode === 'quiz' ? (
        <QuizMode activeSet={activeSet} onFinish={handleSaveScore} onBack={() => setActiveStudyMode('menu')} />
      ) : activeStudyMode === 'matching' ? (
        <MatchingMode activeSet={activeSet} onFinish={handleSaveScore} onBack={() => setActiveStudyMode('menu')} />
      ) : activeStudyMode === 'spelling' ? (
        <SpellingMode activeSet={activeSet} onFinish={handleSaveScore} onBack={() => setActiveStudyMode('menu')} />
      ) : activeStudyMode === 'completed' && latestScoreData ? (
        <CompletionScreen scoreData={latestScoreData} onRestart={() => setActiveStudyMode('menu')} />
      ) : null}
    </div>
  );
}

function StudyCard({ title, desc, icon, color, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`p-6 rounded-2xl border-2 shadow-sm hover:shadow-md transition cursor-pointer flex items-start gap-4 group ${color}`}
    >
      <div className="p-3 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition">{title}</h3>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">{desc}</p>
      </div>
    </div>
  );
}

function FlashcardMode({ activeSet, onBack }) {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const terms = activeSet.terms || [];
  const current = terms[index];

  const handleNext = () => {
    setIsFlipped(false);
    setIndex((prev) => (prev + 1) % terms.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setIndex((prev) => (prev - 1 + terms.length) % terms.length);
  };

  if (terms.length === 0) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <span className="text-xs font-bold text-slate-400">
          Thẻ {index + 1} / {terms.length}
        </span>
      </div>

      {/* Main Flashcard Card */}
      <div 
        onClick={() => {
          setIsFlipped(!isFlipped);
          playAudioFeedback('flip');
        }}
        className="h-80 bg-white rounded-3xl border-2 border-slate-200 shadow-xl cursor-pointer p-8 flex flex-col justify-between items-center text-center transition-all transform hover:border-indigo-300 relative group select-none"
      >
        <div className="w-full flex justify-between items-center text-xs text-slate-400">
          <span>{isFlipped ? "ĐỊNH NGHĨA" : "TỪ VỰNG"}</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              speakWord(current.term);
            }} 
            className="p-2 hover:bg-slate-100 rounded-full text-indigo-600 transition"
            title="Nghe phát âm"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        <div className="my-auto">
          {!isFlipped ? (
            <h2 className="text-3xl sm:text-4xl font-black text-slate-800">{current.term}</h2>
          ) : (
            <div className="space-y-2">
              <h3 className="text-2xl sm:text-3xl font-extrabold text-indigo-600">{current.definition}</h3>
              {current.example && (
                <p className="text-xs sm:text-sm text-slate-500 italic">"{current.example}"</p>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 font-medium">
          Chạm vào thẻ để {isFlipped ? "xem Từ" : "lật mặt Nghĩa"}
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center gap-4">
        <button
          onClick={handlePrev}
          className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
        >
          Trước
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition"
        >
          Tiếp Theo
        </button>
      </div>
    </div>
  );
}

function QuizMode({ activeSet, onFinish, onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [options, setOptions] = useState([]);
  const [startTime] = useState(Date.now());

  const terms = activeSet.terms || [];
  const currentTerm = terms[currentIndex];

  useEffect(() => {
    if (!currentTerm) return;

    // Generate 4 options (1 correct, 3 distractors)
    const distractors = terms
      .filter(t => t.id !== currentTerm.id)
      .map(t => t.definition)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    const allOptions = [currentTerm.definition, ...distractors].sort(() => 0.5 - Math.random());
    setOptions(allOptions);
    setSelectedOption(null);
    setIsAnswered(false);
  }, [currentIndex, activeSet]);

  const handleSelectOption = (opt) => {
    if (isAnswered) return;
    setSelectedOption(opt);
    setIsAnswered(true);

    const isCorrect = opt === currentTerm.definition;
    if (isCorrect) {
      playAudioFeedback('correct');
      setScore(prev => prev + 1);
    } else {
      playAudioFeedback('incorrect');
    }

    setTimeout(() => {
      if (currentIndex + 1 < terms.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        const timeSeconds = Math.round((Date.now() - startTime) / 1000);
        onFinish({
          mode: 'quiz',
          score: score + (isCorrect ? 1 : 0),
          total: terms.length,
          timeSeconds
        });
      }
    }, 1200);
  };

  if (!currentTerm) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Bỏ cuộc
        </button>
        <div className="w-1/3 bg-slate-200 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / terms.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-500">{currentIndex + 1} / {terms.length}</span>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-md text-center space-y-4">
        <span className="text-xs font-extrabold tracking-wider text-indigo-500 uppercase">Chọn Nghĩa Đúng</span>
        <h2 className="text-3xl font-black text-slate-800 flex items-center justify-center gap-2">
          {currentTerm.term}
          <button 
            onClick={() => speakWord(currentTerm.term)}
            className="text-slate-400 hover:text-indigo-600 transition"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {options.map((opt, idx) => {
          let btnStyle = "bg-white border-slate-200 hover:border-indigo-300 text-slate-700";
          if (isAnswered) {
            if (opt === currentTerm.definition) {
              btnStyle = "bg-emerald-500 border-emerald-500 text-white shadow-lg";
            } else if (opt === selectedOption) {
              btnStyle = "bg-rose-500 border-rose-500 text-white";
            } else {
              btnStyle = "bg-slate-100 border-slate-200 text-slate-400 opacity-60";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectOption(opt)}
              disabled={isAnswered}
              className={`w-full p-4 rounded-2xl border-2 font-bold text-base text-left transition flex justify-between items-center ${btnStyle}`}
            >
              <span>{opt}</span>
              {isAnswered && opt === currentTerm.definition && <Check className="w-5 h-5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchingMode({ activeSet, onFinish, onBack }) {
  const [cards, setCards] = useState([]);
  const [selectedFirst, setSelectedFirst] = useState(null);
  const [matchedIds, setMatchedIds] = useState([]);
  const [startTime] = useState(Date.now());

  const terms = activeSet.terms || [];

  useEffect(() => {
    // Take maximum 6 terms for matching grid
    const sampleTerms = terms.slice(0, 8);
    const termCards = sampleTerms.map(t => ({ id: `term-${t.id}`, termId: t.id, text: t.term, type: 'term' }));
    const defCards = sampleTerms.map(t => ({ id: `def-${t.id}`, termId: t.id, text: t.definition, type: 'def' }));

    const shuffled = [...termCards, ...defCards].sort(() => 0.5 - Math.random());
    setCards(shuffled);
  }, [activeSet]);

  const handleCardClick = (card) => {
    if (matchedIds.includes(card.termId)) return;
    if (selectedFirst?.id === card.id) return;

    if (!selectedFirst) {
      setSelectedFirst(card);
      playAudioFeedback('flip');
      return;
    }

    // Check Match
    if (selectedFirst.termId === card.termId && selectedFirst.type !== card.type) {
      playAudioFeedback('correct');
      const newMatched = [...matchedIds, card.termId];
      setMatchedIds(newMatched);
      setSelectedFirst(null);

      // Check Completion
      if (newMatched.length === Math.min(terms.length, 8)) {
        const timeSeconds = Math.round((Date.now() - startTime) / 1000);
        setTimeout(() => {
          onFinish({
            mode: 'matching',
            score: newMatched.length,
            total: newMatched.length,
            timeSeconds
          });
        }, 500);
      }
    } else {
      playAudioFeedback('incorrect');
      setSelectedFirst(card);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Bỏ cuộc
        </button>
        <span className="text-xs font-bold text-slate-500">
          Đã ghép: {matchedIds.length} / {Math.min(terms.length, 8)}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((card) => {
          const isMatched = matchedIds.includes(card.termId);
          const isSelected = selectedFirst?.id === card.id;

          if (isMatched) {
            return (
              <div key={card.id} className="h-24 bg-slate-100 rounded-2xl border border-slate-200 opacity-20 flex items-center justify-center p-2 text-center">
                <Check className="w-6 h-6 text-emerald-500" />
              </div>
            );
          }

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`h-24 p-3 rounded-2xl border-2 font-bold text-xs sm:text-sm shadow-sm transition flex items-center justify-center text-center ${
                isSelected 
                  ? 'bg-indigo-600 border-indigo-600 text-white scale-105 shadow-md' 
                  : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-800'
              }`}
            >
              {card.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SpellingMode({ activeSet, onFinish, onBack }) {
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [startTime] = useState(Date.now());

  const terms = activeSet.terms || [];
  const currentTerm = terms[index];

  useEffect(() => {
    if (currentTerm) {
      speakWord(currentTerm.term);
    }
  }, [index]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || feedback) return;

    const isCorrect = input.trim().toLowerCase() === currentTerm.term.trim().toLowerCase();
    
    if (isCorrect) {
      playAudioFeedback('correct');
      setFeedback('correct');
      setScore(prev => prev + 1);
    } else {
      playAudioFeedback('incorrect');
      setFeedback('incorrect');
    }

    setTimeout(() => {
      setFeedback(null);
      setInput('');
      if (index + 1 < terms.length) {
        setIndex(prev => prev + 1);
      } else {
        const timeSeconds = Math.round((Date.now() - startTime) / 1000);
        onFinish({
          mode: 'spelling',
          score: score + (isCorrect ? 1 : 0),
          total: terms.length,
          timeSeconds
        });
      }
    }, 1500);
  };

  if (!currentTerm) return null;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Bỏ cuộc
        </button>
        <span className="text-xs font-bold text-slate-500">{index + 1} / {terms.length}</span>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-md text-center space-y-4">
        <button
          onClick={() => speakWord(currentTerm.term)}
          className="p-4 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition inline-flex"
        >
          <Volume2 className="w-8 h-8" />
        </button>
        <div>
          <p className="text-xs text-slate-400 uppercase font-bold">Nghĩa của từ:</p>
          <p className="text-lg font-bold text-slate-800 mt-1">{currentTerm.definition}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          autoFocus
          placeholder="Gõ từ Tiếng Anh tương ứng..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!!feedback}
          className="w-full p-4 rounded-2xl border-2 border-slate-300 focus:border-indigo-500 text-center text-xl font-bold outline-none transition"
        />

        {feedback === 'correct' && (
          <div className="p-3 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-center text-sm">
            ✓ Chính xác! Rất tốt.
          </div>
        )}

        {feedback === 'incorrect' && (
          <div className="p-3 bg-rose-100 text-rose-800 font-bold rounded-xl text-center text-sm">
            ✗ Sai rồi! Đáp án đúng: <span className="underline">{currentTerm.term}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!input.trim() || !!feedback}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold transition shadow-md"
        >
          Kiểm Tra
        </button>
      </form>
    </div>
  );
}

function CompletionScreen({ scoreData, onRestart }) {
  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-6 animate-fadeIn relative">
      <Confetti />

      <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
        <Trophy className="w-10 h-10" />
      </div>

      <div>
        <h2 className="text-2xl font-black text-slate-800">Hoàn Thành Bài Học!</h2>
        <p className="text-slate-500 text-xs mt-1">Kết quả của bạn đã được ghi nhận thành công.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div>
          <span className="text-xs text-slate-400 font-medium">Điểm số</span>
          <p className="text-2xl font-black text-indigo-600">{scoreData.score} / {scoreData.total}</p>
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium">Thời gian</span>
          <p className="text-2xl font-black text-slate-700">{scoreData.timeSeconds}s</p>
        </div>
      </div>

      <button
        onClick={onRestart}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-4 h-4" /> Tiếp Tục Luyện Tập
      </button>
    </div>
  );
}