// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  BookOpen,
  Plus,
  Trash2,
  Edit,
  Play,
  Trophy,
  Users,
  CheckCircle,
  XCircle,
  RotateCw,
  Volume2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Award,
  Clock,
  Star,
  BarChart2,
  BarChart3,
  Copy,
  Share2,
  Check,
  RefreshCw,
  Grid,
  HelpCircle,
  Key,
  UserCheck,
  Eye,
  Upload,
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
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where
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

// Danh sách Lớp / Nhóm mặc định


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
  if (!('speechSynthesis' in window) || !text?.trim()) {
    return;
  }

  const synth = window.speechSynthesis;

  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = lang;
  utterance.rate = 0.9;
  utterance.volume = 1;
  utterance.pitch = 1;

  const speak = () => {
    try {
      synth.speak(utterance);
    } catch (error) {
      console.error('Speech playback error:', error);
    }
  };

  const voices = synth.getVoices();

  if (voices.length > 0) {
    const preferredVoice = voices.find(
      voice => voice.lang.toLowerCase() === lang.toLowerCase()
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.setTimeout(speak, 100);
  } else {
    synth.onvoiceschanged = () => {
      synth.onvoiceschanged = null;
      window.setTimeout(speak, 100);
    };

    window.setTimeout(() => {
      if (!synth.speaking && !synth.pending) {
        synth.onvoiceschanged = null;
        speak();
      }
    }, 1000);
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
  const [setGroups, setSetGroups] = useState([]);
  const [groupOptions, setGroupOptions] = useState([
  'Stage 1',
  'Stage 2',
  'Stage 3',
  'Stage 4',
  'Stage 5'
]);
const [newGroupName, setNewGroupName] = useState('');
const GROUPS_DOC_ID = 'vocab_groups';

const handleAddGroup = async () => {
  const name = newGroupName.trim();

  if (!name) {
    alert('Vui lòng nhập tên lớp / nhóm!');
    return;
  }

  const exists = groupOptions.some(
    (group) => group.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    alert('Lớp / nhóm này đã tồn tại!');
    return;
  }

  const updatedGroups = [...groupOptions, name];

  try {
    const groupsRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'config',
      GROUPS_DOC_ID
    );

    await setDoc(groupsRef, {
      groups: updatedGroups,
      updatedAt: Date.now()
    });

    setGroupOptions(updatedGroups);
    setNewGroupName('');
  } catch (error) {
    console.error('Error saving vocabulary groups:', error);

    alert(
      'Lỗi Firestore:\n' +
      `Code: ${error?.code || 'unknown'}\n` +
      `Message: ${error?.message || 'unknown'}`
    );
  }
};

const handleDeleteGroup = async (groupName) => {
  const confirmed = window.confirm(
    `Bạn có chắc muốn xoá nhóm "${groupName}" không?\n\nNhóm này cũng sẽ được gỡ khỏi các bộ từ vựng và học sinh đang được gán nhóm này.`
  );

  if (!confirmed) return;

  try {
    const updatedGroups = groupOptions.filter(
      (group) => group !== groupName
    );

    const groupsRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'config',
      GROUPS_DOC_ID
    );

    await setDoc(groupsRef, {
      groups: updatedGroups,
      updatedAt: Date.now()
    });

    setGroupOptions(updatedGroups);

    setSetGroups((prev) =>
      prev.filter((group) => group !== groupName)
    );

    // Gỡ khỏi vocabulary sets
    const setsRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'vocab_sets'
    );

    const setsSnapshot = await getDocs(setsRef);

    await Promise.all(
      setsSnapshot.docs.map(async (setDoc) => {
        const setData = setDoc.data();

        const groups = Array.isArray(setData.groups)
          ? setData.groups
          : [];

        if (groups.includes(groupName)) {
          await updateDoc(setDoc.ref, {
            groups: groups.filter(
              (group) => group !== groupName
            )
          });
        }
      })
    );

    // Gỡ khỏi học sinh
    const rosterRef = collection(db, 'roster');
    const rosterSnapshot = await getDocs(rosterRef);

    await Promise.all(
      rosterSnapshot.docs.map(async (studentDoc) => {
        const studentData = studentDoc.data();

        const stages = Array.isArray(studentData.stages)
          ? studentData.stages
          : [];

        if (stages.includes(groupName)) {
          await updateDoc(studentDoc.ref, {
            stages: stages.filter(
              (stage) => stage !== groupName
            )
          });
        }
      })
    );


    alert(`Đã xoá nhóm "${groupName}" thành công.`);
  } catch (error) {
    console.error('Error deleting group:', error);

    alert(
      'Không thể xoá nhóm.\n\n' +
      `Code: ${error?.code || 'unknown'}\n` +
      `Message: ${error?.message || 'unknown'}`
    );
  }
};
  const [selectedStudent, setSelectedStudent] = useState('');
const [dateFrom, setDateFrom] = useState('');
const [dateTo, setDateTo] = useState('');
const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
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
  const [studentCode, setStudentCode] = useState('');
const [studentClass, setStudentClass] = useState('');
const [isStudentVerified, setIsStudentVerified] = useState(false);
const [studentStages, setStudentStages] = useState([]);
const [roster, setRoster] = useState([]);
  const [rosterName, setRosterName] = useState('');
  const [rosterCode, setRosterCode] = useState('');
  const [rosterClass, setRosterClass] = useState('');
  const [rosterStages, setRosterStages] = useState([]);
  const [editingRosterCode, setEditingRosterCode] = useState('');
// Roster import
const [importedStudents, setImportedStudents] = useState([]);
const [importError, setImportError] = useState('');
const [isImporting, setIsImporting] = useState(false);

// Vocabulary import
const [isImportingVocabulary, setIsImportingVocabulary] = useState(false);
const [importedTerms, setImportedTerms] = useState([]);
const [vocabImportError, setVocabImportError] = useState('');

  // Load student roster from Firestore
  // Load student roster from Firestore
useEffect(() => {
  const loadRoster = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'roster'));

      const students = snapshot.docs.map((studentDoc) => ({
        id: studentDoc.id,
        ...studentDoc.data()
      }));

      setRoster(students);
    } catch (error) {
      console.error('Load roster error:', error);
    }
  };

  if (user && isTeacherLoggedIn) {
    loadRoster();
  } else {
    setRoster([]);
  }
}, [user, isTeacherLoggedIn]);

  // Add or edit a student
  const handleRosterFileChange = async (e) => {
  const file = e.target.files?.[0];

  if (!file) return;

  setVocabImportError('');
  setImportedStudents([]);

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json(firstSheet, {
      defval: '',
      raw: false
    });

    if (rows.length === 0) {
      setVocabImportError('File không có dữ liệu học sinh.');
      return;
    }

    const students = rows.map((row, index) => {
      const normalizedRow = {};

      Object.keys(row).forEach((key) => {
        normalizedRow[
          String(key).trim().toLowerCase()
        ] = String(row[key] ?? '').trim();
      });

      return {
        rowNumber: index + 2,
        code:
          normalizedRow['mã học sinh'] ||
          normalizedRow['ma hoc sinh'] ||
          normalizedRow['code'] ||
          normalizedRow['studentcode'] ||
          '',
        name:
          normalizedRow['họ và tên'] ||
          normalizedRow['ho va ten'] ||
          normalizedRow['họ tên'] ||
          normalizedRow['ho ten'] ||
          normalizedRow['name'] ||
          '',
        className:
          normalizedRow['lớp'] ||
          normalizedRow['lop'] ||
          normalizedRow['class'] ||
          normalizedRow['classname'] ||
          ''
      };
    });

    const validStudents = students.filter(
      (student) => student.code && student.name && student.className
    );

    if (validStudents.length === 0) {
      setVocabImportError(
        'Không tìm thấy dữ liệu hợp lệ. Hãy kiểm tra tên các cột trong file.'
      );
      return;
    }

    setImportedStudents(validStudents);

    if (validStudents.length < students.length) {
      setVocabImportError(
        `Có ${students.length - validStudents.length} dòng thiếu mã học sinh, họ tên hoặc lớp. Những dòng này sẽ không được nhập.`
      );
    }
  } catch (error) {
    console.error('Read roster file error:', error);
    setVocabImportError('Không đọc được file. Hãy thử dùng file Excel .xlsx hoặc CSV.');
  } finally {
    e.target.value = '';
  }
};
const handleImportRosterStudents = async () => {
  if (importedStudents.length === 0) {
    alert('Vui lòng chọn file và kiểm tra danh sách trước.');
    return;
  }

  setIsImporting(true);

  try {
    // Lấy danh sách mã học sinh đã có
    const snapshot = await getDocs(collection(db, 'roster'));

    const existingCodes = new Set(
      snapshot.docs.map((studentDoc) => studentDoc.id.toUpperCase())
    );

    const seenCodes = new Set();
    let importedCount = 0;
    let skippedCount = 0;

    for (const student of importedStudents) {
      const code = String(student.code).trim();
      const normalizedCode = code.toUpperCase();

      // Bỏ qua mã trùng trong Firestore hoặc trong file
      if (
        existingCodes.has(normalizedCode) ||
        seenCodes.has(normalizedCode)
      ) {
        skippedCount++;
        continue;
      }

      seenCodes.add(normalizedCode);

      await setDoc(doc(db, 'roster', code), {
        code,
        name: String(student.name).trim(),
        className: String(student.className).trim(),
        updatedAt: Date.now()
      });

      existingCodes.add(normalizedCode);
      importedCount++;
    }

    // Tải lại danh sách học sinh sau khi nhập
    const updatedSnapshot = await getDocs(collection(db, 'roster'));

    setRoster(
      updatedSnapshot.docs.map((studentDoc) => ({
        id: studentDoc.id,
        ...studentDoc.data()
      }))
    );

    setImportedStudents([]);

    alert(
      `Hoàn tất nhập danh sách!\n\n` +
      `Thêm thành công: ${importedCount} học sinh\n` +
      `Bỏ qua do trùng mã: ${skippedCount} học sinh`
    );
  } catch (error) {
    console.error('Import roster error:', error);
    alert(
      'Không thể nhập danh sách. Vui lòng kiểm tra kết nối và quyền truy cập Firestore.'
    );
  } finally {
    setIsImporting(false);
  }
};
  const handleSaveRosterStudent = async (e) => {
    e.preventDefault();

    const code = rosterCode.trim();
    const name = rosterName.trim();
    const className = rosterClass.trim();

if (!code || !name || !className || rosterStages.length === 0) {
  alert('Vui lòng nhập đầy đủ mã học sinh, họ tên, lớp và ít nhất một Stage.');
  return;
}

    try {
      const studentRef = doc(db, 'roster', editingRosterCode || code);

      if (!editingRosterCode) {
        const existingStudent = await getDoc(studentRef);

        if (existingStudent.exists()) {
          alert('Mã học sinh này đã tồn tại. Vui lòng nhập mã khác.');
          return;
        }
      }

      await setDoc(studentRef, {
  code: editingRosterCode || code,
  name,
  className,
  stages: rosterStages,
  updatedAt: Date.now()
});

      const snapshot = await getDocs(collection(db, 'roster'));
      setRoster(
        snapshot.docs.map((studentDoc) => ({
          id: studentDoc.id,
          ...studentDoc.data()
        }))
      );

      setRosterName('');
      setRosterCode('');
      setRosterClass('');
      setRosterStages([]);
      setEditingRosterCode('');

      alert('Đã lưu thông tin học sinh!');
    } catch (error) {
      console.error('Save roster error:', error);
      alert('Không thể lưu học sinh. Hãy kiểm tra quyền truy cập Firestore.');
    }
  };

  // Prepare student information for editing
  const handleEditRosterStudent = (student) => {
    setEditingRosterCode(student.id);
    setRosterCode(student.id);
    setRosterName(student.name || '');
    setRosterClass(student.className || '');
    setRosterStages(student.stages || []);
  };

  // Delete a student
  const handleDeleteRosterStudent = async (code) => {
    if (!window.confirm(`Bạn có chắc muốn xóa học sinh ${code} khỏi roster?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'roster', code));
      setRoster((previousRoster) =>
        previousRoster.filter((student) => student.id !== code)
      );
      alert('Đã xóa học sinh khỏi roster.');
    } catch (error) {
      console.error('Delete roster error:', error);
      alert('Không thể xóa học sinh. Hãy kiểm tra quyền truy cập Firestore.');
    }
  };
  const [activeStudyMode, setActiveStudyMode] = useState('menu'); // 'menu', 'flashcards', 'quiz', 'matching', 'spelling', 'completed'
  const [showStudentProgress, setShowStudentProgress] = useState(false);
  const [latestScoreData, setLatestScoreData] = useState(null);

  // Form State for creating/editing sets
  const [isCreatingSet, setIsCreatingSet] = useState(false);
  const [editingSetId, setEditingSetId] = useState(null);
  const [setTitle, setSetTitle] = useState('');
  const [setDescription, setSetDescription] = useState('');
  const [terms, setTerms] = useState([
  {
    id: '1',
    term: 'Hello',
    meaning: 'Xin chào',
    example: 'Hello, how are you?',
  imageUrl: ''
  },
  {
    id: '2',
    term: 'Vocabulary',
    meaning: 'Từ vựng',
    example: 'Learning vocabulary is fun.',
  imageUrl: ''
  },
  {
    id: '3',
    term: 'Teacher',
    meaning: 'Giáo viên',
    example: 'Our teacher is very supportive.',
  imageUrl: ''
  },
  {
    id: '4',
    term: 'Student',
    meaning: 'Học sinh',
    example: 'The student studies hard.',
  imageUrl: ''
  }
]);
 
  const [copiedLink, setCopiedLink] = useState(false);
const verifyStudentCode = async () => {
  const code = studentCode.trim();

  if (!code) {
    alert('Vui lòng nhập mã học sinh.');
    return;
  }

  try {
    // Đảm bảo Student đã có Firebase Anonymous Auth
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const studentRef = doc(db, 'roster', code);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
      setIsStudentVerified(false);
      setStudentName('');
      setStudentClass('');
      setStudentStages([]);

      alert('Mã học sinh không tồn tại. Vui lòng kiểm tra lại.');
      return;
    }

    const studentData = studentSnap.data();
   
    // Load thông tin học sinh
    setStudentName(studentData.name || '');
    setStudentClass(studentData.className || '');
    setStudentStages(studentData.stages || []);
    setIsStudentVerified(true);

    localStorage.setItem('vocab_student_code', code);
    localStorage.setItem(
      'vocab_student_name',
      studentData.name || ''
    );
    localStorage.setItem(
      'vocab_student_class',
      studentData.className || ''
    );

  } catch (error) {
    console.error('Student verification error:', error);
    alert('Không thể kiểm tra mã học sinh. Vui lòng thử lại.');
  }
};
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

  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);

    if (!currentUser) return;

    try {
      const groupsRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'config',
        GROUPS_DOC_ID
      );

      const groupsSnap = await getDoc(groupsRef);

      if (groupsSnap.exists()) {
        const data = groupsSnap.data();

        if (Array.isArray(data.groups)) {
          setGroupOptions(data.groups);
        }
      }
    } catch (error) {
      console.error('Error loading vocabulary groups:', error);
    }
  });

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
  const studentSets =
  isStudentVerified && studentStages.length > 0
    ? sets.filter((set) =>
        (set.groups || []).some((group) =>
          studentStages.includes(group)
        )
      )
    : [];

const activeSet =
  studentSets.find((s) => s.id === selectedSetId) ||
  (studentSets.length > 0 ? studentSets[0] : null);

  const handleVocabularyImport = (event) => {
  const file = event.target.files?.[0];

  if (!file) return;

  setVocabImportError('');
  setImportedTerms([]);

  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });

      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error('Không tìm thấy sheet trong file Excel.');
      }

      const worksheet = workbook.Sheets[firstSheetName];

      const rows = XLSX.utils.sheet_to_json(worksheet, {
        defval: '',
        raw: false
      });

      if (!rows.length) {
        throw new Error('File Excel không có dữ liệu.');
      }

      const normalizedTerms = rows
        .map((row, index) => {
          const normalizedRow = {};

          Object.entries(row).forEach(([key, value]) => {
            const normalizedKey = String(key)
              .trim()
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^a-z0-9]/g, '');

            normalizedRow[normalizedKey] = String(
              value ?? ''
            ).trim();
          });

          const term =
            normalizedRow['tu'] ||
            normalizedRow['tuvung'] ||
            normalizedRow['vocabulary'] ||
            normalizedRow['term'] ||
            '';

          const meaning =
            normalizedRow['nghiatv'] ||
            normalizedRow['nghiatiengviet'] ||
            normalizedRow['meaning'] ||
            normalizedRow['vietnamesemeaning'] ||
            '';

          const example =
            normalizedRow['vidu'] ||
            normalizedRow['example'] ||
            '';

          return {
            id: `import-${Date.now()}-${index}`,
            term,
            meaning,
            example
          };
        })
        .filter((item) => item.term);

      if (!normalizedTerms.length) {
        throw new Error(
          'Không tìm thấy cột "Từ". Vui lòng kiểm tra tên cột trong file Excel.'
        );
      }

      setImportedTerms(normalizedTerms);
      setIsImportingVocabulary(true);

    } catch (error) {
      console.error('Vocabulary import error:', error);

      setVocabImportError(
        error.message ||
        'Không thể đọc file Excel. Vui lòng kiểm tra lại.'
      );
    }
  };

  reader.readAsArrayBuffer(file);

  // Cho phép chọn lại cùng một file
  event.target.value = '';
};
  const handleAddTermRow = () => {
  setTerms([
    ...terms,
    {
      id: Date.now().toString(),
      term: '',
      meaning: '',
      example: '',
      imageUrl: ''
    }
  ]);
};
const handleTermImageUpload = async (termId, file) => {
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('Vui lòng chọn file ảnh.');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('Ảnh không được lớn hơn 5MB.');
    return;
  }

  try {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    const imageRef = ref(
      storage,
      `vocab-images/${user?.uid || 'teacher'}/${Date.now()}-${safeFileName}`
    );

    await uploadBytes(imageRef, file);

    const imageUrl = await getDownloadURL(imageRef);

    setTerms((prev) =>
      prev.map((term) =>
        term.id === termId
          ? { ...term, imageUrl }
          : term
      )
    );
  } catch (error) {
    console.error('Image upload error:', error);
    alert('Không thể tải ảnh lên. Vui lòng thử lại.');
  }
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
    
const validTerms = terms.filter(
  t => t.term.trim()
);    
if (validTerms.length < 2) 
  return alert("Cần ít nhất 2 từ hợp lệ!");

    try {
      const setPayload = {
  title: setTitle,
  description: setDescription,
  groups: setGroups,
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
      setSetGroups([]);
      setTerms([{ id: '1', term: '', example: '' }]);
      setIsCreatingSet(false);
      setEditingSetId(null);
    } catch (err) {
  console.error("Error saving vocabulary set:", err);
  alert(
    "Lỗi lưu bộ từ vựng:\n" +
    `Code: ${err?.code || 'unknown'}\n` +
    `Message: ${err?.message || 'unknown'}`
  );
}
  };

  const handleStartEditSet = (vocabSet) => {
    setEditingSetId(vocabSet.id);
    setSetTitle(vocabSet.title);
    setSetDescription(vocabSet.description || '');
    setSetGroups(vocabSet.groups || []);
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
  if (!isStudentVerified || !studentCode.trim()) {
    alert('Vui lòng xác nhận mã học sinh trước.');
    return;
  }

  if (!studentName.trim()) return;

  localStorage.setItem('vocab_student_code', studentCode);
  localStorage.setItem('vocab_student_name', studentName);
  localStorage.setItem('vocab_student_class', studentClass);

  setLatestScoreData(scoreData);
  setActiveStudyMode('completed');

  if (!user || !activeSet) return;

  try {
    const today = new Date().toISOString().slice(0, 10);

    const mode = scoreData.mode || 'unknown';

    // 1 document = 1 student + 1 unit + 1 mode + 1 day
    const trackingId = [
      studentCode.trim(),
      activeSet.id,
      mode,
      today
    ]
      .join('_')
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const resultRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'vocab_results',
      trackingId
    );

    const resultSnap = await getDoc(resultRef);

    const newScore = Number(scoreData.score || 0);
    const newTotal = Number(scoreData.total || 0);
    const newPercentage =
      newTotal > 0
        ? Math.round((newScore / newTotal) * 100)
        : 0;

    if (!resultSnap.exists()) {
      // First attempt today
      await setDoc(resultRef, {
        studentCode: studentCode.trim(),
        studentName: studentName.trim(),
        studentClass: studentClass || '',
        setId: activeSet.id,
        setTitle: activeSet.title,
        mode,
        date: today,

        attempts: 1,

        bestScore: newScore,
        bestTotal: newTotal,
        bestPercentage: newPercentage,

        lastScore: newScore,
        lastTotal: newTotal,
        lastPercentage: newPercentage,

        totalTimeTakenSeconds: scoreData.timeSeconds || 0,

        timestamp: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString()
      });
    } else {
      // Existing tracking record → increase attempt count
      const existing = resultSnap.data();

      const existingBestPercentage =
        Number(existing.bestPercentage || 0);

      const shouldUpdateBest =
        newPercentage > existingBestPercentage;

      await updateDoc(resultRef, {
        attempts: Number(existing.attempts || 0) + 1,

        ...(shouldUpdateBest
          ? {
              bestScore: newScore,
              bestTotal: newTotal,
              bestPercentage: newPercentage
            }
          : {}),

        lastScore: newScore,
        lastTotal: newTotal,
        lastPercentage: newPercentage,

        totalTimeTakenSeconds:
          Number(existing.totalTimeTakenSeconds || 0) +
          Number(scoreData.timeSeconds || 0),

        lastAttemptAt: new Date().toISOString(),
        timestamp: new Date().toISOString()
      });
    }

  } catch (err) {
    console.error("Error saving tracking:", err);
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
  setGroups={setGroups}
setSetGroups={setSetGroups}
groupOptions={groupOptions}
newGroupName={newGroupName}
setNewGroupName={setNewGroupName}
handleAddGroup={handleAddGroup}
handleDeleteGroup={handleDeleteGroup}
  terms={terms}
  setTerms={setTerms}
  handleAddTermRow={handleAddTermRow}
  handleTermChange={handleTermChange}
  handleRemoveTermRow={handleRemoveTermRow}
  handleTermImageUpload={handleTermImageUpload}
  handleSaveSet={handleSaveSet}
  handleStartEditSet={handleStartEditSet}
  handleDeleteSet={handleDeleteSet}

  handleVocabularyImport={handleVocabularyImport}
  isImportingVocabulary={isImportingVocabulary}
  setIsImportingVocabulary={setIsImportingVocabulary}
  importedTerms={importedTerms}
  setImportedTerms={setImportedTerms}
  vocabImportError={vocabImportError}
  setVocabImportError={setVocabImportError}

  copyShareLink={copyShareLink}
  copiedLink={copiedLink}

  roster={roster}
  rosterName={rosterName}
  setRosterName={setRosterName}
  rosterCode={rosterCode}
  setRosterCode={setRosterCode}
  rosterClass={rosterClass}
  setRosterClass={setRosterClass}
  rosterStages={rosterStages}
setRosterStages={setRosterStages}
  editingRosterCode={editingRosterCode}
  setEditingRosterCode={setEditingRosterCode}
  handleSaveRosterStudent={handleSaveRosterStudent}
  handleEditRosterStudent={handleEditRosterStudent}
  handleDeleteRosterStudent={handleDeleteRosterStudent}

  importedStudents={importedStudents}
  setImportedStudents={setImportedStudents}
  importError={importError}
  setImportError={setImportError}
  isImporting={isImporting}
  handleRosterFileChange={handleRosterFileChange}
  handleImportRosterStudents={handleImportRosterStudents}
/>
        ) : (
          /* ================= STUDENT MODE ================= */
          <StudentArea
            sets={studentSets}
            selectedSetId={selectedSetId}
            setSelectedSetId={setSelectedSetId}
            activeSet={activeSet}
            studentName={studentName}
            setStudentName={setStudentName}
            studentCode={studentCode}
setStudentCode={setStudentCode}
studentClass={studentClass}
isStudentVerified={isStudentVerified}
verifyStudentCode={verifyStudentCode}
            activeStudyMode={activeStudyMode}
            setActiveStudyMode={setActiveStudyMode}
            handleSaveScore={handleSaveScore}
            latestScoreData={latestScoreData}
          />
        )}
      </main>

      {/* Footer */}
<footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
  <p>
    VocabMaster &copy; {new Date().getFullYear()} - Nền tảng tự học từ vựng tương tác
  </p>

  <p className="mt-1 text-slate-400">
    Phát triển bởi <span className="font-semibold text-indigo-600">Bùi Quang Trung Hiếu</span> (@hieubqt)
  </p>
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
  const handleToggleResult = (resultId: string) => {
  setSelectedResultIds((prev) =>
    prev.includes(resultId)
      ? prev.filter((id) => id !== resultId)
      : [...prev, resultId]
  );
};

const handleDeleteSelectedResults = async () => {
  if (selectedResultIds.length === 0) {
    alert('Vui lòng chọn ít nhất một kết quả!');
    return;
  }

  const confirmed = window.confirm(
    `Bạn có chắc muốn xóa ${selectedResultIds.length} kết quả đã chọn không?`
  );

  if (!confirmed) return;

  try {
    await Promise.all(
      selectedResultIds.map((resultId) =>
        deleteDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'vocab_results',
            resultId
          )
        )
      )
    );

    setSelectedResultIds([]);
    alert('Đã xóa các kết quả đã chọn!');
  } catch (error) {
    console.error('Error deleting results:', error);
    alert('Không thể xóa kết quả. Hãy kiểm tra Firestore Rules.');
  }
};
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
  sets,
  selectedSetId,
  setSelectedSetId,
  results,
  isCreatingSet,
  setIsCreatingSet,
  setTitle,
  setSetTitle,
  setDescription,
  setSetDescription,
  setGroups,
  setSetGroups,
  groupOptions,
  newGroupName,
  setNewGroupName,
  handleAddGroup,
  handleDeleteGroup,
  terms,
  setTerms,
  handleAddTermRow,
  handleTermChange,
  handleRemoveTermRow,
  handleTermImageUpload,
  handleSaveSet,
  handleStartEditSet,
  handleDeleteSet,
    handleVocabularyImport,
  isImportingVocabulary,
  setIsImportingVocabulary,
  importedTerms,
  setImportedTerms,
    VocabImportError,
    setVocabImportError,
  copyShareLink,
  copiedLink,

  // Student roster
  roster,
  rosterName,
  setRosterName,
  rosterCode,
  setRosterCode,
  rosterClass,
  setRosterClass,
  rosterStages,
setRosterStages,
  editingRosterCode,
  setEditingRosterCode,
  handleSaveRosterStudent,
  handleEditRosterStudent,
  handleDeleteRosterStudent,
  importedStudents,
  setImportedStudents,
  isImporting,
  handleRosterFileChange,
  handleImportRosterStudents
}) {
  const [showQRCode, setShowQRCode] = useState(false);
  const [activeTab, setActiveTab] = useState('sets');
  const [selectedGroup, setSelectedGroup] = useState('');
  const filteredSets = selectedGroup
  ? sets.filter(set => (set.groups || []).includes(selectedGroup))
  : sets;
    // Bộ lọc kết quả học sinh
const [selectedStudent, setSelectedStudent] = useState('');
const [dateFrom, setDateFrom] = useState('');
const [dateTo, setDateTo] = useState('');
const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  
const selectedSet = sets.find(s => s.id === selectedSetId);

// Lọc kết quả học sinh
const filteredResults = results.filter((r) => {
  const matchesSet = !selectedSetId || r.setId === selectedSetId;
  const matchesStudent =
    !selectedStudent || r.studentCode === selectedStudent;
  const matchesDateFrom = !dateFrom || r.date >= dateFrom;
  const matchesDateTo = !dateTo || r.date <= dateTo;

  return (
    matchesSet &&
    matchesStudent &&
    matchesDateFrom &&
    matchesDateTo
  );
});

// Xóa các kết quả đã chọn
const handleDeleteSelectedResults = async () => {
  if (selectedResultIds.length === 0) {
    alert('Vui lòng chọn ít nhất một kết quả!');
    return;
  }

  const confirmed = window.confirm(
    `Bạn có chắc muốn xóa ${selectedResultIds.length} kết quả đã chọn không?`
  );

  if (!confirmed) return;

  try {
    await Promise.all(
      selectedResultIds.map((resultId) =>
        deleteDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'vocab_results',
            resultId
          )
        )
      )
    );

    setSelectedResultIds([]);
    alert('Đã xóa các kết quả đã chọn!');
  } catch (error) {
    console.error('Error deleting results:', error);
    alert('Không thể xóa kết quả. Hãy kiểm tra Firestore Rules.');
  }
};
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

{/* TOP ACTION BAR */}
<div className="flex justify-end gap-3 pb-5 mb-5 border-b border-slate-100">
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
{/* Vocabulary Groups */}
<div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-5">
  <div className="mb-4">
    <h4 className="font-bold text-slate-800 text-sm">
      Lớp / Nhóm
    </h4>

    <p className="text-xs text-slate-500 mt-1">
      Chọn một hoặc nhiều lớp / nhóm được phép sử dụng bộ từ này.
    </p>
  </div>
<div className="flex flex-col sm:flex-row gap-2 mb-4">
  <input
    type="text"
    value={newGroupName}
    onChange={(e) => setNewGroupName(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddGroup();
      }
    }}
    placeholder="Ví dụ: 3A, 4B, Summer Class..."
    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none"
  />

  <button
    type="button"
    onClick={handleAddGroup}
    className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition"
  >
    + Thêm lớp / nhóm
  </button>
</div>
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
    {groupOptions.map((group) => {
  const isSelected = setGroups.includes(group);

  return (
    <div
      key={group}
      className={`flex items-center gap-2 px-3 py-3 rounded-xl border-2 transition ${
        isSelected
          ? 'bg-indigo-600 border-indigo-600 text-white'
          : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300'
      }`}
    >
      {/* Checkbox / chọn nhóm */}
      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {
            if (isSelected) {
              setSetGroups(
                setGroups.filter((item) => item !== group)
              );
            } else {
              setSetGroups([
                ...setGroups,
                group
              ]);
            }
          }}
          className="sr-only"
        />

        <span
          className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center text-xs font-black ${
            isSelected
              ? 'bg-white text-indigo-600 border-white'
              : 'bg-white border-slate-300'
          }`}
        >
          {isSelected ? '✓' : ''}
        </span>

        <span className="text-sm font-bold truncate">
          {group}
        </span>
      </label>

      {/* Xoá nhóm */}
      <button
        type="button"
        onClick={() => handleDeleteGroup(group)}
        className={`shrink-0 p-1.5 rounded-lg transition ${
          isSelected
            ? 'text-white/70 hover:text-white hover:bg-white/20'
            : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
        }`}
        title={`Xoá nhóm "${group}"`}
      >
        🗑️
      </button>
    </div>
  );
})}
  </div>

  {setGroups.length > 0 ? (
    <p className="mt-4 text-xs font-semibold text-indigo-600">
      Đã chọn: {setGroups.join(' · ')}
    </p>
  ) : (
    <p className="mt-4 text-xs text-slate-400">
      Chưa chọn lớp / nhóm
    </p>
  )}
</div>
            {/* Terms List Input */}
            <div className="space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
  <div>
    <h4 className="font-semibold text-slate-800 text-sm uppercase tracking-wider">
      Danh Sách Từ ({terms.length})
    </h4>

    <p className="text-xs text-slate-400 mt-1">
      Từ · Nghĩa TV · Ví dụ
    </p>
  </div>

  <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 font-bold text-sm cursor-pointer transition">
    <Upload className="w-4 h-4" />
    Nhập từ Excel

    <input
      type="file"
      accept=".xlsx,.xls,.csv"
      onChange={handleVocabularyImport}
      className="hidden"
    />
  </label>
</div>
{VocabImportError && (
  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
    ⚠️ {VocabImportError}
  </div>
)}

{isImportingVocabulary && (
  <div className="rounded-2xl border-2 border-emerald-100 bg-emerald-50/40 p-5 space-y-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h5 className="font-black text-slate-800">
          Xem trước dữ liệu nhập
        </h5>
        <p className="text-xs text-slate-500 mt-1">
          Đã đọc {importedTerms.length} từ. Kiểm tra trước khi thêm vào bộ từ.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          setIsImportingVocabulary(false);
          setImportedTerms([]);
        }}
        className="text-sm font-bold text-slate-400 hover:text-rose-500"
      >
        Hủy
      </button>
    </div>

    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left">
            <th className="px-3 py-2 font-bold text-slate-600">Từ</th>
            <th className="px-3 py-2 font-bold text-slate-600">Nghĩa TV</th>
            <th className="px-3 py-2 font-bold text-slate-600">Ví dụ</th>
          </tr>
        </thead>

        <tbody>
          {importedTerms.slice(0, 10).map((item) => (
            <tr key={item.id} className="border-t border-slate-100">
              <td className="px-3 py-2 font-bold text-slate-800">
                {item.term}
              </td>
              <td className="px-3 py-2 text-slate-600">
                {item.meaning || '—'}
  
              </td>
              <td className="px-3 py-2 text-slate-500">
                {item.example || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    {importedTerms.length > 10 && (
      <p className="text-xs text-slate-500">
        Hiển thị 10 từ đầu tiên. Tổng cộng: {importedTerms.length} từ.
      </p>
    )}

    <button
      type="button"
      onClick={() => {
        setTerms((prev) => [...prev, ...importedTerms]);
        setIsImportingVocabulary(false);
        setImportedTerms([]);
      }}
      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md transition"
    >
      ✓ Thêm {importedTerms.length} từ vào bộ từ
    </button>
  </div>
)}
              {terms.map((item, index) => (
                <div key={item.id || index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-start md:items-center relative group">
                  <span className="font-extrabold text-slate-400 text-xs w-6">#{index + 1}</span>
                  <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
  <input
    type="text"
    placeholder="Từ / Khái niệm (English)"
    value={item.term}
    onChange={(e) => handleTermChange(item.id, 'term', e.target.value)}
    className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
  />

  <input
    type="text"
    placeholder="Nghĩa tiếng Việt"
    value={item.meaning || ''}
    onChange={(e) => handleTermChange(item.id, 'meaning', e.target.value)}
    className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
  />

  <input
    type="text"
    placeholder="Ví dụ"
    value={item.example || ''}
    onChange={(e) => handleTermChange(item.id, 'example', e.target.value)}
    className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
  />
  <div className="md:col-span-2 lg:col-span-3 flex flex-col gap-3">
  <div className="flex items-center gap-3">
    <label className="cursor-pointer px-4 py-2.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-600 font-bold text-sm hover:bg-indigo-100 transition">
      📷 Tải ảnh lên
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleTermImageUpload(item.id, file);
          }
        }}
      />
    </label>

    <span className="text-xs text-slate-400">
      hoặc dán link ảnh bên dưới
    </span>
  </div>

  <input
    type="url"
    placeholder="https://example.com/image.jpg"
    value={item.imageUrl || ''}
    onChange={(e) =>
      handleTermChange(item.id, 'imageUrl', e.target.value)
    }
    className="px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
  />

  {item.imageUrl && (
    <img
      src={item.imageUrl}
      alt={item.term || 'Vocabulary image'}
      className="w-24 h-24 object-cover rounded-xl border border-slate-200"
    />
  )}
</div>
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

{/* THÊM NÚT MỚI NGAY TẠI ĐÂY */}
<button
  onClick={() => setActiveTab('roster')}
  className={`pb-3 px-4 font-semibold text-sm border-b-2 flex items-center gap-2 transition ${
    activeTab === 'roster'
      ? 'border-indigo-600 text-indigo-600'
      : 'border-transparent text-slate-500 hover:text-slate-800'
  }`}
>
  <Users className="w-4 h-4" /> Danh sách học sinh ({roster.length})
</button>

</div>

          {activeTab === 'sets' ? (

  /* TAB 1: SETS LIST */

  <>
    <div className="mb-5 bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="font-semibold text-slate-700 whitespace-nowrap">
          Lọc theo lớp / nhóm:
        </label>

        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Tất cả lớp / nhóm</option>

          {groupOptions.map((group) => (
            <option key={group} value={group}>
              {group}
            </option>
          ))}
        </select>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
             {filteredSets.length === 0 ? (
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
                filteredSets.map(s => (
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
          </>
            
                    ) : activeTab === 'leaderboard' ? (
            /* TAB 2: LEADERBOARD & RESULTS */
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              
<div className="p-4 bg-slate-50 border-b border-slate-200">
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">

    {/* Lọc theo bài */}
    <div className="min-w-0">
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        Lọc theo bài
      </label>
      <select
        value={selectedSetId}
        onChange={(e) => setSelectedSetId(e.target.value)}
        className="w-full min-w-0 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
      >
        <option value="">-- Tất cả bài tập --</option>
        {sets.map(s => (
          <option key={s.id} value={s.id}>{s.title}</option>
        ))}
      </select>
    </div>

    {/* Lọc theo học sinh */}
    <div className="min-w-0">
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        Học sinh
      </label>
      <select
        value={selectedStudent}
        onChange={(e) => setSelectedStudent(e.target.value)}
        className="w-full min-w-0 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm outline-none"
      >
        <option value="">-- Tất cả học sinh --</option>
        {[...new Map(
          results.map(r => [
            r.studentCode,
            { code: r.studentCode, name: r.studentName }
          ])
        ).values()].map(student => (
          <option key={student.code} value={student.code}>
            {student.name} ({student.code})
          </option>
        ))}
      </select>
    </div>

    {/* Từ ngày */}
    <div className="min-w-0">
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        Từ ngày
      </label>
      <input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
        className="w-full min-w-0 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm outline-none"
      />
    </div>

    {/* Đến ngày */}
    <div className="min-w-0">
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        Đến ngày
      </label>
      <input
        type="date"
        value={dateTo}
        onChange={(e) => setDateTo(e.target.value)}
        className="w-full min-w-0 px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm outline-none"
      />
    </div>

    {/* Xóa bộ lọc */}
    <div className="min-w-0">
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        Thao tác
      </label>
      <button
        onClick={() => {
          setSelectedSetId('');
          setSelectedStudent('');
          setDateFrom('');
          setDateTo('');
        }}
        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
      >
        Xóa bộ lọc
      </button>
    </div>

    {/* Tổng lượt nộp bài */}
    <div className="min-w-0 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
      <div className="text-sm text-slate-600">Tổng lượt nộp bài</div>
      <div className="text-xl font-bold text-indigo-700">
        {filteredResults.length}
      </div>
    </div>

  </div>
</div>

              <div className="overflow-x-auto">
                <div className="mb-4 flex items-center justify-between gap-3">
  <span className="text-sm text-slate-600">
    Đã chọn {selectedResultIds.length} kết quả
  </span>

  <button
  type="button"
  onClick={handleDeleteSelectedResults}
  disabled={selectedResultIds.length === 0}
  style={{
    fontSize: '14px',
    padding: '8px 14px',
    width: 'auto',
    minWidth: '0',
    maxWidth: '100%',
    lineHeight: '1.4',
    whiteSpace: 'nowrap',
    borderRadius: '8px',
    backgroundColor: '#e11d48',
    color: '#ffffff',
    fontWeight: 600,
    border: 'none',
    cursor: selectedResultIds.length === 0 ? 'not-allowed' : 'pointer',
    opacity: selectedResultIds.length === 0 ? 0.5 : 1
  }}
>
  Xóa kết quả đã chọn ({selectedResultIds.length})
</button>
</div>
                <table className="w-full table-fixed text-left text-xs sm:text-sm">
                  <colgroup>
  <col className="w-[5%]" />
  <col className="w-[14%]" />
  <col className="w-[11%]" />
  <col className="w-[10%]" />
  <col className="w-[13%]" />
  <col className="w-[11%]" />
  <col className="w-[9%]" />
  <col className="w-[10%]" />
  <col className="w-[10%]" />
  <col className="w-[9%]" />
  <col className="w-[12%]" />
</colgroup>
                  <thead className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
  <tr>
    <th className="py-3 px-4 text-center w-14">
      Chọn
    </th>

    <th className="py-3 px-4">
      Học Sinh
    </th>

    <th className="py-3 px-4">
      Mã HS
    </th>

    <th className="py-3 px-4">
      Lớp
    </th>

    <th className="py-3 px-4">
      Bộ Từ Vựng
    </th>

    <th className="py-3 px-4">
      Chế Độ
    </th>

    <th className="py-3 px-4 text-center">
      Số Lần Làm
    </th>

    <th className="py-3 px-4 text-center">
      Điểm Cao Nhất
    </th>

    <th className="py-3 px-4 text-center">
      Điểm Gần Nhất
    </th>

    <th className="py-3 px-4 text-center">
      Tỷ Lệ Cao Nhất
    </th>

    <th className="py-3 px-4 text-right">
      Thời Gian
    </th>
  </tr>
</thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredResults.length === 0 ? (
                      <tr>
                        <td colSpan="11" className="py-8 text-center text-slate-400">
                          Chưa có kết quả nộp bài nào từ học sinh.
                        </td>
                      </tr>
                    ) : (
                      filteredResults.map((r, idx) => (
<tr key={r.id || idx} className="hover:bg-slate-50 transition">
  <td className="py-3 px-4 text-center">
  <input
    type="checkbox"
    checked={selectedResultIds.includes(r.id)}
    onChange={(e) => {
      const isChecked = e.target.checked;

      setSelectedResultIds((prev) =>
        isChecked
          ? prev.includes(r.id)
            ? prev
            : [...prev, r.id]
          : prev.filter((id) => id !== r.id)
      );
    }}
    style={{
      width: '18px',
      height: '18px',
      cursor: 'pointer',
      accentColor: '#4f46e5',
      display: 'inline-block'
    }}
    aria-label={`Chọn kết quả của ${r.studentName || 'học sinh'}`}
  />
</td>
                            <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-extrabold ${
                              idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {idx + 1}
                            </span>
                            {r.studentName || 'Chưa xác định'}
</td>

{/* Mã học sinh */}
<td className="py-3 px-4 text-slate-600">
  {r.studentCode || '—'}
</td>

{/* Lớp */}
<td className="py-3 px-4 text-slate-600">
  {r.studentClass || '—'}
</td>

{/* Bộ từ vựng */}
<td className="py-3 px-4 text-slate-600">
  {r.setTitle}
</td>
                          <td className="py-3 px-4">
                            <span className="capitalize px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium text-xs">
                              {r.mode === 'quiz' ? 'Trắc nghiệm' : r.mode === 'matching' ? 'Nối từ' : r.mode === 'spelling' ? 'Chính tả' : 'Thẻ nhớ'}
                            </span>
                          </td>

{/* Số lần làm */}
<td className="py-3 px-4 text-center font-semibold text-slate-700">
  {r.attempts ?? 1}
</td>

{/* Điểm cao nhất */}
<td className="py-3 px-4 text-center font-semibold text-slate-800">
  {r.bestScore ?? r.score ?? 0} / {r.bestTotal ?? r.total ?? 0}
</td>
{/* Điểm lần gần nhất */}
<td className="py-3 px-4 text-center font-semibold text-slate-800">
  {r.lastScore ?? r.score ?? 0} / {r.lastTotal ?? r.total ?? 0}
</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                              (r.bestPercentage ?? r.percentage ?? 0) >= 80 ? 'bg-emerald-100 text-emerald-700' :
                              (r.bestPercentage ?? r.percentage ?? 0) >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                             {r.bestPercentage ?? r.percentage ?? 0}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-400 text-xs">
                            {(r.lastAttemptAt || r.timestamp)
  ? new Date(r.lastAttemptAt || r.timestamp).toLocaleString('vi-VN')
  : 'Vừa xong'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* TAB 3: STUDENT ROSTER */
            <div className="space-y-6">

{/* Import danh sách học sinh từ Excel/CSV */}
<div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
  <div>
    <h3 className="text-lg font-bold text-slate-800">
      Nhập danh sách từ Excel / CSV
    </h3>
    <p className="text-sm text-slate-500 mt-1">
      Chọn file có các cột: Mã học sinh, Họ và tên, Lớp.
      Mã đã tồn tại sẽ được bỏ qua.
    </p>
  </div>

  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
    <input
      type="file"
      accept=".xlsx,.xls,.csv"
      onChange={handleRosterFileChange}
      className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold hover:file:bg-indigo-100"
    />

    {importedStudents.length > 0 && (
      <button
        type="button"
        disabled={isImporting}
        onClick={handleImportRosterStudents}
        className="shrink-0 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition"
      >
        {isImporting ? 'Đang nhập...' : `Nhập ${importedStudents.length} học sinh`}
      </button>
    )}
  </div>

  {VocabImportError && (
    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
      {VocabImportError}
    </div>
  )}

  {importedStudents.length > 0 && (
    <div className="space-y-3">
      <div className="flex justify-between items-center gap-2">
        <h4 className="font-semibold text-slate-700">
          Xem trước dữ liệu
        </h4>
        <button
          type="button"
          onClick={() => {
            setImportedStudents([]);
            setVocabImportError('');
          }}
          className="text-sm text-slate-500 hover:text-red-600"
        >
          Hủy file
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full table-fixed text-sm text-left">
          <colgroup>
  <col className="w-[7%]" />
  <col className="w-[18%]" />
  <col className="w-[18%]" />
  <col className="w-[12%]" />
  <col className="w-[27%]" />
  <col className="w-[18%]" />
</colgroup>
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3">Dòng</th>
              <th className="p-3">Mã học sinh</th>
              <th className="p-3">Họ và tên</th>
              <th className="p-3">Lớp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {importedStudents.slice(0, 10).map((student, index) => (
              <tr key={`${student.code}-${index}`}>
                <td className="p-3 text-slate-500">
                  {student.rowNumber}
                </td>
                <td className="p-3 font-semibold text-indigo-700">
                  {student.code}
                </td>
                <td className="p-3">{student.name}</td>
                <td className="p-3">{student.className}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {importedStudents.length > 10 && (
        <p className="text-xs text-slate-500">
          Đang hiển thị 10 dòng đầu tiên trong tổng số {importedStudents.length} học sinh hợp lệ.
        </p>
      )}

      <p className="text-xs text-slate-500">
        Hãy kiểm tra dữ liệu trước khi nhấn nút nhập. Các mã trùng sẽ được xử lý khi nhập.
      </p>
    </div>
  )}
</div>
                            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  {editingRosterCode
                    ? 'Chỉnh sửa học sinh'
                    : 'Thêm học sinh mới'}
                </h3>

                <form
                  onSubmit={handleSaveRosterStudent}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">
                      Mã học sinh
                    </label>
                    <input
                      required
                      value={rosterCode}
                      onChange={(e) => setRosterCode(e.target.value)}
                      disabled={Boolean(editingRosterCode)}
                      placeholder="Ví dụ: 5A1_NAM01"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
                    />
                  </div>
<div className="md:col-span-3">
  <label className="block text-sm font-semibold text-slate-600 mb-2">
    Nhóm / chương trình đang học
  </label>

  <div className="flex flex-wrap gap-3">
    
    {groupOptions.map((group) => (
  <div
    key={group}
    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition"
  >
    <label className="flex items-center gap-2 flex-1 cursor-pointer">
      <input
  type="checkbox"
  checked={rosterStages.includes(group)}
  onChange={(e) => {
    if (e.target.checked) {
      setRosterStages((prev) => [...prev, group]);
    } else {
      setRosterStages((prev) =>
        prev.filter((item) => item !== group)
      );
    }
  }}
  className="w-4 h-4 accent-indigo-600"
/>

      <span className="text-sm font-semibold text-slate-700">
        {group}
      </span>
    </label>

    <button
      type="button"
      onClick={() => handleDeleteGroup(group)}
      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
      title={`Xoá nhóm ${group}`}
    >
      🗑️
    </button>
  </div>
))}
  </div>

  {rosterStages.length > 0 && (
    <p className="mt-2 text-xs text-slate-500">
      Đã chọn: {rosterStages.join(', ')}
    </p>
  )}
</div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">
                      Họ và tên
                    </label>
                    <input
                      required
                      value={rosterName}
                      onChange={(e) => setRosterName(e.target.value)}
                      placeholder="Nhập họ tên học sinh"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-600 mb-1">
                      Lớp
                    </label>
                    <input
                      required
                      value={rosterClass}
                      onChange={(e) => setRosterClass(e.target.value)}
                      placeholder="Ví dụ: 5A1"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-3 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition"
                    >
                      {editingRosterCode ? 'Lưu chỉnh sửa' : '+ Thêm học sinh'}
                    </button>

                    {editingRosterCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRosterCode('');
                          setRosterCode('');
                          setRosterName('');
                          setRosterClass('');
                        }}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold"
                      >
                        Hủy chỉnh sửa
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Bảng danh sách học sinh */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center gap-3">
                  <h3 className="font-bold text-slate-800">
                    Danh sách học sinh
                  </h3>
                  <span className="text-sm text-slate-500">
                    Tổng: {roster.length} học sinh
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-white text-slate-500 border-b border-slate-200">
  <tr>
    <th className="py-3 px-4 text-center w-16">
      Chọn
    </th>

    <th className="py-3 px-4">
      Mã học sinh
    </th>

    <th className="py-3 px-4">
      Họ và tên
    </th>

    <th className="py-3 px-4">
      Lớp
    </th>

    <th className="py-3 px-4">
      Stage / Nhóm
    </th>

    <th className="py-3 px-4 text-center">
      Thao tác
    </th>
  </tr>
</thead>

                    <tbody className="divide-y divide-slate-100">
                      {roster.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-8 text-center text-slate-400"
                          >
                            Chưa có học sinh nào. Hãy thêm học sinh ở biểu mẫu phía trên.
                          </td>
                        </tr>
                      ) : (
                        roster
                          .slice()
                          .sort((a, b) =>
                            String(a.className || '').localeCompare(
                              String(b.className || '')
                            ) ||
                            String(a.name || '').localeCompare(
                              String(b.name || '')
                            )
                          )
                          .map((student) => (
                          <tr
  key={student.id}
  className="hover:bg-slate-50 transition"
>
  {/* Chọn */}
  <td className="py-3 px-4 text-center align-middle">
    <input
      type="checkbox"
      className="w-4 h-4 accent-indigo-600 cursor-pointer"
      aria-label={`Chọn ${student.name || student.id}`}
    />
  </td>

  {/* Mã học sinh */}
  <td className="py-3 px-4 align-middle">
    <span className="font-semibold text-indigo-700 whitespace-nowrap">
      {student.id}
    </span>
  </td>

  {/* Họ và tên */}
  <td className="py-3 px-4 align-middle">
    <span className="font-medium text-slate-800">
      {student.name}
    </span>
  </td>

  {/* Lớp */}
  <td className="py-3 px-4 align-middle">
    <span className="text-slate-600 whitespace-nowrap">
      {student.className}
    </span>
  </td>

  {/* Stage / Nhóm */}
  <td className="py-3 px-4 align-middle">
    <div className="flex flex-wrap gap-1.5">
      {Array.isArray(student.stages) && student.stages.length > 0 ? (
        student.stages.map((stage) => (
          <span
            key={stage}
            className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold whitespace-nowrap"
          >
            {stage}
          </span>
        ))
      ) : (
        <span className="text-xs text-slate-400">
          Chưa gán nhóm
        </span>
      )}
    </div>
  </td>

  {/* Thao tác — CHỈ MỘT BỘ */}
  <td className="py-3 px-4 align-middle">
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => handleEditRosterStudent(student)}
        className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold whitespace-nowrap"
      >
        Sửa
      </button>

      <button
        type="button"
        onClick={() => handleDeleteRosterStudent(student.id)}
        className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold whitespace-nowrap"
      >
        Xóa
      </button>
    </div>
  </td>
</tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
              )}
      </div>
    )}
  </div>
);
}

function StudentArea({
  sets,
  selectedSetId,
  setSelectedSetId,
  activeSet,
  studentName,
  setStudentName,
  studentCode,
  setStudentCode,
  studentClass,
  isStudentVerified,
  verifyStudentCode,
  activeStudyMode,
  setActiveStudyMode,
  handleSaveScore,
  latestScoreData
}) {
  const [showStudentProgress, setShowStudentProgress] = useState(false);

  const isSharedLink = new URLSearchParams(window.location.search).has('set');  
  if (sets.length === 0 && isStudentVerified) {
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
       {activeStudyMode === 'menu' ? (
  <>
    {/* STUDENT HOME — PROFILE & SET SELECTOR */}
    <div className="relative overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-lg shadow-violet-100/50">
  {/* Welcome banner */}
  <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-500 to-pink-400 px-6 py-7 sm:px-8 sm:py-8 text-white">
    <div className="absolute -right-6 -top-8 h-36 w-36 rounded-full bg-white/10" />
    <div className="absolute right-20 -bottom-12 h-28 w-28 rounded-full bg-yellow-300/20" />

    <div className="relative z-10 flex items-start gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-inner">
        📚
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-purple-100">
          VOCABMASTER • LEARN & PLAY
        </div>

        <h2 className="text-2xl font-black leading-tight sm:text-3xl">
          Xin chào, {isStudentVerified ? studentName : 'bạn nhỏ'}! 👋
        </h2>

        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90">
          Sẵn sàng khám phá thế giới từ vựng chưa? Chọn bài học và bắt đầu hành trình của bạn nhé!
        </p>
      </div>
    </div>

    <div className="relative z-10 mt-5 flex flex-wrap gap-2">
      <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
        ✨ Học vui mỗi ngày
      </span>

      <span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
        🎯 Chinh phục từ vựng
      </span>
    </div>
  </div>

  {/* Student information and lesson selection */}
  <div className="grid grid-cols-1 gap-5 p-5 sm:p-7 lg:grid-cols-2">

    {/* Student verification card */}
    <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <UserCheck className="h-5 w-5" />
        </div>

        <div>
          <h3 className="font-extrabold text-slate-800">
            Thông tin học sinh
          </h3>
          <p className="text-xs text-slate-500">
            Xác nhận để lưu kết quả học tập
          </p>
        </div>
      </div>

      {!isStudentVerified ? (
        <>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Mã học sinh
          </label>

          <input
            type="text"
            placeholder="Ví dụ: 5A1_NAM01"
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                verifyStudentCode();
              }
            }}
            className="w-full rounded-xl border-2 border-sky-100 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition placeholder:font-normal placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
          />

          <button
            type="button"
            onClick={verifyStudentCode}
            className="mt-3 w-full rounded-xl bg-sky-500 px-4 py-3 text-sm font-extrabold text-white shadow-md shadow-sky-200 transition hover:bg-sky-600 active:scale-[0.98]"
          >
            Xác nhận mã học sinh →
          </button>

          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            💡 Nhập mã được giáo viên cung cấp để xác nhận tài khoản của bạn.
          </p>
        </>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
              🎉
            </div>

            <div className="min-w-0 flex-1">
              <p className="break-words font-extrabold text-slate-800">
                {studentName}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Mã: {studentCode}
              </p>
              <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                ✓ Đã xác nhận · {studentClass}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Lesson selection card */}
    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-2xl">
          🗂️
        </div>

        <div>
          <h3 className="font-extrabold text-slate-800">
            Chọn bài học
          </h3>
          <p className="text-xs text-slate-500">
            Chọn bộ từ vựng bạn muốn luyện tập
          </p>
        </div>
      </div>

      <label className="mb-2 block text-sm font-bold text-slate-700">
        Bộ từ vựng
      </label>

      <select
        value={activeSet?.id || ''}
        disabled={isSharedLink}
        onChange={(e) => {
          setSelectedSetId(e.target.value);
          setActiveStudyMode('menu');
        }}
        className={`w-full rounded-xl border-2 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:ring-4 focus:ring-amber-100 ${
          isSharedLink
            ? 'cursor-not-allowed border-amber-200'
            : 'border-amber-100 focus:border-amber-400'
        }`}
      >
        {sets.map((s) => (
          <option key={s.id} value={s.id}>
            {s.title} ({s.terms?.length || 0} từ)
          </option>
        ))}
      </select>

      {activeSet && (
        <div className="mt-4 rounded-xl border border-amber-100 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">
                BÀI HỌC CỦA BẠN
              </p>
              <p className="mt-1 break-words font-extrabold text-slate-800">
                {activeSet.title}
              </p>
            </div>

            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <span className="text-xl font-black leading-none">
                {activeSet.terms?.length || 0}
              </span>
              <span className="mt-1 text-[10px] font-bold">
                TỪ VỰNG
              </span>
            </div>
          </div>

          {activeSet.description && (
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              {activeSet.description}
            </p>
          )}
        </div>
      )}

      {isSharedLink && (
        <p className="mt-3 text-xs font-medium text-amber-700">
          🔒 Bạn đang học qua liên kết được chia sẻ.
        </p>
      )}
        </div>
  </div>
    </div>
  </>
) : (
  /* COMPACT HEADER — WHEN STUDYING */
  <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm sm:px-5">
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xl">
        📚
      </div>

      <div className="min-w-0">
        <p className="truncate font-extrabold text-slate-800">
          {isStudentVerified ? studentName : 'Bạn nhỏ'}
        </p>

        <p className="truncate text-xs font-medium text-slate-500">
          {activeSet?.title || 'Bộ từ vựng'} · {activeSet?.terms?.length || 0} từ vựng
        </p>
      </div>
    </div>

    <span className="shrink-0 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">
      ✨ Đang học
    </span>
  </div>
)}

{showStudentProgress ? (
  <StudentProgress
    studentCode={studentCode}
    db={db}
    appId={appId}
    onBack={() => setShowStudentProgress(false)}
  />
) : !activeSet ? null : activeStudyMode === 'menu' ? (
      /* MODE SELECTION CARDS */
       
<div className="space-y-6 animate-fadeIn">

  {/* Study dashboard header */}
  <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 p-6 text-white shadow-xl shadow-violet-200/60 sm:p-8">
    <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
    <div className="absolute bottom-0 right-24 h-20 w-20 rounded-full bg-pink-300/20" />

    <div className="relative z-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl">
          🚀
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-100">
            YOUR LEARNING ADVENTURE
          </p>

          <h2 className="mt-2 break-words text-2xl font-black sm:text-3xl">
            {activeSet.title}
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/90">
            {activeSet.description || 'Chọn cách học yêu thích và bắt đầu chinh phục bộ từ vựng này nhé!'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 self-start rounded-2xl border border-white/20 bg-white/15 px-4 py-3 backdrop-blur-sm sm:self-center">
        <span className="text-3xl">📖</span>
        <div>
          <p className="text-2xl font-black leading-none">
            {activeSet.terms?.length || 0}
          </p>
          <p className="mt-1 text-xs font-semibold text-violet-100">
            từ vựng
          </p>
        </div>
      </div>
    </div>

    {!isStudentVerified && (
      <div className="relative z-10 mt-6 flex items-start gap-3 rounded-2xl border border-amber-200/40 bg-amber-300/15 p-4 text-sm">
        <span className="text-xl">💡</span>
        <div>
          <p className="font-extrabold">Một bước nhỏ trước khi bắt đầu!</p>
          <p className="mt-1 leading-relaxed text-white/90">
            Hãy xác nhận mã học sinh ở phía trên để bắt đầu luyện tập và lưu kết quả của bạn.
          </p>
        </div>
      </div>
    )}
  </div>

  {/* Section heading */}
  <div className="flex flex-wrap items-end justify-between gap-3 px-1">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">
        PICK YOUR FAVORITE
      </p>
      <h3 className="mt-1 text-xl font-black text-slate-800 sm:text-2xl">
        Hôm nay mình học gì nhỉ? 🎨
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Chọn một hoạt động để bắt đầu nhé!
      </p>
    </div>

    <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">
      4 cách học thú vị
    </span>
  </div>

  {/* Learning mode cards */}
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

    {/* Flashcards */}
    <StudyCard
      title="Thẻ Ghi Nhớ"
      desc="Lật thẻ, khám phá nghĩa và ghi nhớ từ vựng theo cách của bạn."
      icon={<RotateCw className="h-8 w-8 text-violet-600" />}
      color="border-violet-200 bg-gradient-to-br from-violet-50 to-white hover:border-violet-400"
      onClick={() => {
        if (!isStudentVerified) {
          alert('Vui lòng nhập và xác nhận mã học sinh trước.');
          return;
        }
        setActiveStudyMode('flashcards');
      }}
    />

    {/* Quiz */}
    <StudyCard
      title="Trắc Nghiệm Nhanh"
      desc="Chọn đáp án đúng và thử thách khả năng ghi nhớ của mình."
      icon={<CheckCircle className="h-8 w-8 text-emerald-600" />}
      color="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white hover:border-emerald-400"
      onClick={() => {
        if (!isStudentVerified) {
          alert('Vui lòng nhập và xác nhận mã học sinh trước.');
          return;
        }
        setActiveStudyMode('quiz');
      }}
    />

    {/* Matching */}
    <StudyCard
      title="Trò Chơi Nối Từ"
      desc="Tìm đúng cặp từ và nghĩa. Cùng luyện tập thật nhanh nào!"
      icon={<Grid className="h-8 w-8 text-amber-600" />}
      color="border-amber-200 bg-gradient-to-br from-amber-50 to-white hover:border-amber-400"
      onClick={() => {
        if (!isStudentVerified) {
          alert('Vui lòng nhập và xác nhận mã học sinh trước.');
          return;
        }
        setActiveStudyMode('matching');
      }}
    />

    {/* Spelling */}
    <StudyCard
      title="Luyện Gõ Chính Tả"
      desc="Nghe, nhớ và viết đúng từ tiếng Anh. Bạn sẽ tiến bộ mỗi ngày!"
      icon={<Sparkles className="h-8 w-8 text-pink-600" />}
      color="border-pink-200 bg-gradient-to-br from-pink-50 to-white hover:border-pink-400"
      onClick={() => {
        if (!isStudentVerified) {
          alert('Vui lòng nhập và xác nhận mã học sinh trước.');
          return;
        }
        setActiveStudyMode('spelling');
      }}
    />

  </div>

  {/* Student progress entry */}
  <button
    type="button"
    onClick={() => setShowStudentProgress(true)}
    className="group flex w-full items-center gap-4 rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-cyan-50 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md sm:p-6"
  >
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-3xl transition group-hover:scale-105">
      📈
    </div>

    <div className="min-w-0 flex-1">
      <h3 className="font-extrabold text-slate-800">
        Tiến độ học tập của mình
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-500">
        Xem kết quả, lịch sử luyện tập và quá trình tiến bộ của bạn.
      </p>
    </div>

    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-600 shadow-sm transition group-hover:translate-x-1">
      →
    </div>
  </button>

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
  
  <CompletionScreen
    scoreData={latestScoreData}
    onRestart={() => setActiveStudyMode(latestScoreData.mode || 'menu')}
    onBack={() => setActiveStudyMode('menu')}
  />
) : null}
    </div>
  );
}

function StudentProgress({ studentCode, db, appId, onBack }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      try {
        setLoading(true);
        setError('');

        if (!studentCode?.trim()) {
          setError('Không tìm thấy mã học sinh. Vui lòng xác nhận mã học sinh trước.');
          return;
        }

        const resultsRef = collection(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'vocab_results'
        );

        const q = query(
          resultsRef,
          where('studentCode', '==', studentCode.trim())
        );

        const snapshot = await getDocs(q);

        if (!cancelled) {
          setRecords(
            snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            }))
          );
        }
      } catch (err) {
        console.error('Student progress error:', err);
        if (!cancelled) {
          setError(
            'Không tải được tiến độ học tập. Vui lòng kiểm tra quyền đọc dữ liệu Firestore.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProgress();

    return () => {
      cancelled = true;
    };
  }, [studentCode, db, appId]);

  const totalAttempts = records.reduce(
    (sum, item) => sum + Number(item.attempts || 0),
    0
  );

  const bestRecord = records.reduce((best, item) => {
    if (!best) return item;
    return Number(item.bestPercentage || 0) >
      Number(best.bestPercentage || 0)
      ? item
      : best;
  }, null);

  const latestRecord = [...records].sort((a, b) =>
    String(b.lastAttemptAt || b.timestamp || '').localeCompare(
      String(a.lastAttemptAt || a.timestamp || '')
    )
  )[0];

const modeStats = ['quiz', 'matching', 'spelling'].map((mode) => {
  const modeRecords = records.filter((item) => item.mode === mode);

  const attempts = modeRecords.reduce(
    (sum, item) => sum + Number(item.attempts || 0),
    0
  );

  const average = modeRecords.length
    ? Math.round(
        modeRecords.reduce(
          (sum, item) => sum + Number(item.lastPercentage || 0),
          0
        ) / modeRecords.length
      )
    : null;

  return { mode, attempts, average, days: modeRecords.length };
});

  const modeLabel = (mode) => {
    const labels = {
      quiz: 'Quiz – Trắc nghiệm',
      matching: 'Matching – Nối từ',
      spelling: 'Spelling – Chính tả',
      flashcards: 'Flashcards – Thẻ ghi nhớ',
    };

    return labels[mode] || mode || 'Khác';
  };

  const sortedRecords = [...records].sort((a, b) =>
    String(b.date || '').localeCompare(String(a.date || ''))
  );

const dailyChartData = Object.values(
  records.reduce((groups, item) => {
    const date = item.date || 'Unknown';

    if (!groups[date]) {
      groups[date] = {
        date,
        total: 0,
        count: 0,
      };
    }

    groups[date].total += Number(item.lastPercentage || 0);
    groups[date].count += 1;

    return groups;
  }, {})
)
  .map((item) => ({
    ...item,
    average: Math.round(item.total / item.count),
  }))
  .filter((item) => item.date !== 'Unknown')
  .sort((a, b) => a.date.localeCompare(b.date))
  .slice(-7);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
            Student Progress
          </h2>
          <p className="mt-2 text-slate-500">
            Tiến độ học tập của mã học sinh: {studentCode}
          </p>
        </div>

        <button
          onClick={onBack}
          className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Quay lại
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow">
          Đang tải tiến độ học tập...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Tổng lượt luyện tập</p>
              <p className="mt-2 text-3xl font-black text-violet-600">
                {totalAttempts}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Điểm cao nhất</p>
              <p className="mt-2 text-3xl font-black text-emerald-600">
                {bestRecord
                  ? `${bestRecord.bestPercentage ?? 0}%`
                  : '--'}
              </p>
              {bestRecord && (
                <p className="mt-1 text-xs text-slate-500">
                  {bestRecord.setTitle || 'Bài học'}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Điểm gần nhất</p>
              <p className="mt-2 text-3xl font-black text-sky-600">
                {latestRecord
                  ? `${latestRecord.lastPercentage ?? 0}%`
                  : '--'}
              </p>
              {latestRecord && (
                <p className="mt-1 text-xs text-slate-500">
                  {latestRecord.setTitle || 'Bài học'}
                </p>
              )}
            </div>
          </div>

<div className="space-y-4">
  <h3 className="text-lg font-bold text-slate-800">
    Thống kê theo chế độ
  </h3>

  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    {modeStats.map((stat) => (
      <div
        key={stat.mode}
        className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"
      >
        <p className="font-bold text-slate-800">
          {modeLabel(stat.mode)}
        </p>

        <div className="mt-4">
          <p className="text-sm text-slate-500">
            Tổng lượt luyện tập
          </p>
          <p className="text-2xl font-black text-violet-600">
            {stat.attempts}
          </p>
        </div>

        <div className="mt-3">
          <p className="text-sm text-slate-500">
            Điểm trung bình theo ngày
          </p>
          <p className="text-xl font-bold text-emerald-600">
            {stat.average === null ? '--' : `${stat.average}%`}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Dựa trên {stat.days} bản ghi ngày
          </p>
        </div>
      </div>
    ))}
  </div>
</div>

<div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
  <h3 className="text-lg font-bold text-slate-800">
    Progress Over Time – Tiến bộ theo thời gian
  </h3>

  <p className="mt-1 text-sm text-slate-500">
    Điểm trung bình theo ngày · Tối đa 7 ngày có dữ liệu
  </p>

  {dailyChartData.length === 0 ? (
    <p className="py-10 text-center text-slate-400">
      Chưa có dữ liệu để vẽ biểu đồ.
    </p>
  ) : (
    <div className="mt-6 overflow-x-auto">
      <div className="flex min-w-full items-end gap-4 px-2">
        {dailyChartData.map((item) => (
          <div
            key={item.date}
            className="flex min-w-16 flex-1 flex-col items-center"
          >
            <span className="mb-2 text-sm font-bold text-sky-700">
              {item.average}%
            </span>

            <div className="flex h-40 w-full items-end justify-center rounded-t-lg bg-slate-50">
              <div
                className="w-3/4 rounded-t-lg bg-gradient-to-t from-indigo-600 to-sky-400 transition-all duration-500"
                style={{
                  height: `${Math.max(item.average, 3)}%`,
                }}
                title={`${item.date}: ${item.average}%`}
              />
            </div>

            <span className="mt-2 text-xs text-slate-500">
              {item.date === 'Unknown'
                ? '--'
                : item.date.slice(5).replace('-', '/')}
            </span>
          </div>
        ))}
      </div>
    </div>
  )}
</div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-lg font-bold text-slate-800">
              Lịch sử luyện tập
            </h3>

            {sortedRecords.length === 0 ? (
              <p className="py-6 text-center text-slate-500">
                Chưa có kết quả luyện tập nào.
              </p>
            ) : (
              <div className="space-y-3">
                {sortedRecords.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-800">
                          {item.setTitle || 'Bài học'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {modeLabel(item.mode)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Ngày: {item.date || '--'} · Số lượt: {item.attempts || 0}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-violet-700">
                          Gần nhất: {item.lastPercentage ?? 0}%
                        </p>
                        <p className="mt-1 text-sm text-emerald-600">
                          Cao nhất: {item.bestPercentage ?? 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
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
function VocabularyImage({ term, className = '' }) {
  if (!term?.imageUrl) return null;

  return (
    <img
      src={term.imageUrl}
      alt={term.term || 'Vocabulary'}
      className={`object-contain rounded-2xl ${className}`}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
      }}
    />
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
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          type="button"
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại
        </button>

        <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-extrabold">
          THẺ {index + 1}/{terms.length}
        </span>
      </div>

      {/* Flashcard */}
      <div
        onClick={() => {
          setIsFlipped((prev) => !prev);
          playAudioFeedback("flip");
        }}
        className="min-h-80 bg-white rounded-3xl border-2 border-indigo-100 shadow-xl cursor-pointer p-8 flex flex-col justify-between items-center text-center gap-6 transition-all hover:border-indigo-300"
      >
        <div className="w-full flex justify-between items-center text-xs text-slate-400">
          <span>{isFlipped ? "NGHĨA TV" : "TỪ VỰNG"}</span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              speakWord(current.term);
            }}
            type="button"
            className="p-2 hover:bg-indigo-50 rounded-full text-indigo-600"
            title="Nghe phát âm"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        <div className="my-auto">

  {!isFlipped ? (
  <div className="flex flex-col items-center gap-5">
    <VocabularyImage
      term={current}
      className="w-40 h-40"
    />

    <h2 className="text-3xl sm:text-4xl font-black text-slate-800 break-words">
      {current.term}
    </h2>
  </div>
) : (
    <div className="space-y-4">
      <h2 className="text-3xl sm:text-4xl font-black text-slate-800 break-words">
        {current.meaning}
      </h2>

      {current.example && (
        <p className="text-sm text-slate-500 italic">
          "{current.example}"
        </p>
      )}
    </div>
  )}
</div>
        
        <p className="text-xs text-slate-400 font-medium">
          Chạm vào thẻ để {isFlipped ? "xem từ vựng" : "xem nghĩa"}
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center gap-4">
        <button
          onClick={handlePrev}
          type="button"
          className="flex-1 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition"
        >
          ← Trước
        </button>

        <button
          onClick={handleNext}
          type="button"
          className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition"
        >
          Tiếp theo →
        </button>
      </div>
    </div>
  );
}

function QuizMode({ activeSet, onFinish, onBack }) {
  const terms = activeSet.terms || [];

  // null = chưa chọn kiểu quiz
  // 'meaning' = English → Vietnamese
  // 'term' = Vietnamese → English
  const [quizType, setQuizType] = useState(null);

  const [questionQueue, setQuestionQueue] = useState(() => [...terms]);
  const [retryQueue, setRetryQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [firstTryScore, setFirstTryScore] = useState(0);
  const [attemptedIds, setAttemptedIds] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [options, setOptions] = useState([]);
  const [startTime] = useState(Date.now());

  const currentTerm = questionQueue[currentIndex];

  // Tạo 4 đáp án theo kiểu Quiz đã chọn
  useEffect(() => {
    if (!currentTerm || !quizType) return;

    let correctAnswer = '';
    let distractors = [];

    if (quizType === 'meaning') {
      // English → Vietnamese
      correctAnswer = currentTerm.meaning || '';

      distractors = terms
        .filter((t) => t.id !== currentTerm.id)
        .map((t) => t.meaning)
        .filter(Boolean)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
    } else {
      // Vietnamese → English
      correctAnswer = currentTerm.term || '';

      distractors = terms
        .filter((t) => t.id !== currentTerm.id)
        .map((t) => t.term)
        .filter(Boolean)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
    }

    setOptions(
      [correctAnswer, ...distractors].sort(
        () => Math.random() - 0.5
      )
    );

    setSelectedOption(null);
    setIsAnswered(false);
  }, [currentIndex, questionQueue, activeSet, quizType]);

  const handleStartQuiz = (type) => {
    setQuizType(type);

    // Reset Quiz
    setQuestionQueue([...terms]);
    setRetryQueue([]);
    setCurrentIndex(0);
    setFirstTryScore(0);
    setAttemptedIds([]);
    setSelectedOption(null);
    setIsAnswered(false);
  };

  const handleSelectOption = (opt) => {
    if (isAnswered || !currentTerm || !quizType) return;

    setSelectedOption(opt);
    setIsAnswered(true);

    const correctAnswer =
      quizType === 'meaning'
        ? currentTerm.meaning
        : currentTerm.term;

    const isCorrect = opt === correctAnswer;
    const hasAttempted = attemptedIds.includes(currentTerm.id);

    if (!hasAttempted) {
      setAttemptedIds((prev) => [...prev, currentTerm.id]);

      if (isCorrect) {
        setFirstTryScore((prev) => prev + 1);
      }
    }

    playAudioFeedback(isCorrect ? 'correct' : 'incorrect');

    const nextRetryQueue = isCorrect
      ? [...retryQueue]
      : [...retryQueue, currentTerm];

    setTimeout(() => {
      if (currentIndex + 1 < questionQueue.length) {
        setRetryQueue(nextRetryQueue);
        setCurrentIndex((prev) => prev + 1);
        return;
      }

      if (nextRetryQueue.length > 0) {
        setQuestionQueue(nextRetryQueue);
        setRetryQueue([]);
        setCurrentIndex(0);
        return;
      }

      const finalScore =
        firstTryScore + (isCorrect && !hasAttempted ? 1 : 0);

      onFinish({
        mode: 'quiz',
        quizType,
        score: finalScore,
        total: terms.length,
        timeSeconds: Math.round(
          (Date.now() - startTime) / 1000
        ),
      });
    }, 1000);
  };

  // =========================================================
  // SCREEN 1: CHỌN KIỂU QUIZ
  // =========================================================
  if (!quizType) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            type="button"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </button>
        </div>

        {/* Title */}
        <div className="text-center py-4">
          <div className="text-5xl mb-4">📝</div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-800">
            Bạn muốn kiểm tra gì?
          </h2>

          <p className="mt-2 text-sm sm:text-base text-slate-500">
            Chọn cách luyện phù hợp với bạn nhé!
          </p>
        </div>

        {/* Quiz choices */}
        <div className="space-y-4">

          {/* English → Vietnamese */}
          <button
            type="button"
            onClick={() => handleStartQuiz('meaning')}
            className="group w-full text-left p-6 rounded-3xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 hover:border-violet-400 hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="flex items-center gap-4">

              <div className="w-16 h-16 shrink-0 rounded-2xl bg-violet-100 flex items-center justify-center text-3xl group-hover:scale-105 transition">
                🇬🇧
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-violet-500">
                  English → Vietnamese
                </p>

                <h3 className="mt-1 text-xl font-black text-slate-800">
                  KIỂM TRA NGHĨA
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Nhìn từ tiếng Anh và chọn nghĩa tiếng Việt đúng.
                </p>

                <p className="mt-3 text-sm font-bold text-violet-600">
                  huge → rất lớn, khổng lồ
                </p>
              </div>

              <ArrowRight className="w-6 h-6 text-violet-400 shrink-0 group-hover:translate-x-1 transition" />
            </div>
          </button>

          {/* Vietnamese → English */}
          <button
            type="button"
            onClick={() => handleStartQuiz('term')}
            className="group w-full text-left p-6 rounded-3xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 hover:border-sky-400 hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            <div className="flex items-center gap-4">

              <div className="w-16 h-16 shrink-0 rounded-2xl bg-sky-100 flex items-center justify-center text-3xl group-hover:scale-105 transition">
                🇻🇳
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wider text-sky-500">
                  Vietnamese → English
                </p>

                <h3 className="mt-1 text-xl font-black text-slate-800">
                  KIỂM TRA TỪ
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Nhìn nghĩa tiếng Việt và chọn từ tiếng Anh đúng.
                </p>

                <p className="mt-3 text-sm font-bold text-sky-600">
                  rất lớn, khổng lồ → huge
                </p>
              </div>

              <ArrowRight className="w-6 h-6 text-sky-400 shrink-0 group-hover:translate-x-1 transition" />
            </div>
          </button>

        </div>
      </div>
    );
  }

  // Không có từ để làm Quiz
  if (!currentTerm) return null;

  const correctAnswer =
    quizType === 'meaning'
      ? currentTerm.meaning
      : currentTerm.term;

  const progress = Math.round(
    ((currentIndex + 1) / questionQueue.length) * 100
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

      {/* Progress */}
      <div className="bg-white rounded-3xl border-2 border-indigo-100 p-4 shadow-sm">
        <div className="flex justify-between items-center gap-3 mb-4">

          <button
            onClick={() => {
              if (window.confirm('Bạn muốn thoát bài kiểm tra?')) {
                setQuizType(null);
              }
            }}
            type="button"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-rose-50 hover:text-rose-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Đổi kiểu kiểm tra
          </button>

          <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-extrabold">
            CÂU {currentIndex + 1}/{questionQueue.length}
          </span>
        </div>

        <div className="h-3 w-full bg-indigo-50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-2 text-right text-xs font-semibold text-slate-400">
          Cố lên nhé! 🌟
        </p>
      </div>

      {/* Question */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 p-6 sm:p-8 rounded-[2rem] shadow-lg shadow-indigo-200 text-center text-white">

        <div className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 w-32 h-32 rounded-full bg-white/10" />

        <div className="relative">

          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-xs font-extrabold tracking-wide">
            ✨ {quizType === 'meaning'
              ? 'CHỌN NGHĨA ĐÚNG'
              : 'CHỌN TỪ ĐÚNG'}
          </span>

          {/* =========================================
              KIỂM TRA NGHĨA: English + Example
              ========================================= */}
          {quizType === 'meaning' ? (
            <>
              <h2 className="mt-6 text-3xl sm:text-4xl font-black tracking-tight break-words">
                {currentTerm.term}
              </h2>

              {currentTerm.example && (
                <p className="mt-4 text-base sm:text-lg text-white/90 font-semibold italic leading-relaxed">
                  "{currentTerm.example}"
                </p>
              )}

              <button
                onClick={() => speakWord(currentTerm.term)}
                className="mt-5 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-indigo-600 font-extrabold shadow-md hover:scale-105 transition"
                type="button"
              >
                <Volume2 className="w-5 h-5" />
                Nghe phát âm
              </button>

              <p className="mt-5 text-sm text-white/80 font-medium">
                Chọn nghĩa tiếng Việt chính xác nhé!
              </p>
            </>
          ) : (
            /* =========================================
               KIỂM TRA TỪ: Vietnamese → English
               Không hiện Example
               ========================================= */
            <>
              <p className="mt-6 text-xs font-bold uppercase tracking-wider text-white/70">
                Nghĩa tiếng Việt
              </p>

              <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight break-words">
                {currentTerm.meaning}
              </h2>

              <p className="mt-5 text-sm text-white/80 font-medium">
                Chọn từ tiếng Anh chính xác nhé!
              </p>
            </>
          )}

        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">

        <p className="text-sm font-extrabold text-slate-500 px-1">
          CHỌN MỘT ĐÁP ÁN
        </p>

        {options.map((opt, idx) => {

          const colors = [
            'border-violet-200 hover:border-violet-400 hover:bg-violet-50',
            'border-sky-200 hover:border-sky-400 hover:bg-sky-50',
            'border-amber-200 hover:border-amber-400 hover:bg-amber-50',
            'border-pink-200 hover:border-pink-400 hover:bg-pink-50',
          ];

          let style =
            `bg-white ${colors[idx % colors.length]} text-slate-700`;

          if (isAnswered) {

            if (opt === correctAnswer) {
              style =
                'bg-emerald-500 border-emerald-500 text-white shadow-lg';

            } else if (opt === selectedOption) {
              style =
                'bg-rose-500 border-rose-500 text-white';

            } else {
              style =
                'bg-slate-50 border-slate-100 text-slate-300 opacity-60';
            }
          }

          return (
            <button
              key={`${currentTerm.id}-${idx}-${opt}`}
              type="button"
              onClick={() => handleSelectOption(opt)}
              disabled={isAnswered}
              className={`w-full min-h-[68px] p-4 rounded-2xl border-2 font-bold text-base sm:text-lg text-left transition-all flex justify-between items-center gap-3 ${style}`}
            >
              <span className="flex items-center gap-3">

                <span className="w-9 h-9 shrink-0 rounded-xl bg-black/5 flex items-center justify-center text-sm font-black">
                  {String.fromCharCode(65 + idx)}
                </span>

                <span>{opt}</span>

              </span>

              {isAnswered && opt === correctAnswer && (
                <Check className="w-6 h-6 shrink-0" />
              )}

              {isAnswered &&
                opt === selectedOption &&
                opt !== correctAnswer && (
                  <span className="text-xl font-black">✕</span>
                )}
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {isAnswered && (
        <div
          className={`p-5 rounded-2xl border-2 text-center ${
            selectedOption === correctAnswer
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >

          <div className="text-3xl mb-2">
            {selectedOption === correctAnswer ? '🎉' : '💪'}
          </div>

          <p className="text-lg font-black">
            {selectedOption === correctAnswer
              ? 'Chính xác! Tuyệt vời!'
              : 'Chưa đúng rồi, hãy ghi nhớ nhé!'}
          </p>

          {selectedOption !== correctAnswer && (
            <p className="mt-2 text-sm font-semibold">
              Đáp án đúng: {correctAnswer}
            </p>
          )}

          <p className="mt-2 text-xs font-medium opacity-75">
            {selectedOption === correctAnswer
              ? 'Bạn đang tiến bộ từng chút một! ⭐'
              : 'Từ này sẽ xuất hiện lại để bạn luyện tập.'}
          </p>

        </div>
      )}

    </div>
  );
}

function MatchingMode({ activeSet, onFinish, onBack }) {
  const terms = activeSet.terms || [];

  const shuffleArray = (array) =>
    [...array].sort(() => Math.random() - 0.5);

  // Toàn bộ các từ chưa được luyện trong session này
  const [initialMatchingData] = useState(() => {
  const shuffled = shuffleArray(terms);

  return {
    round: shuffled.slice(0, 8),
    remaining: shuffled.slice(8)
  };
});

const [remainingTerms, setRemainingTerms] = useState(
  initialMatchingData.remaining
);

const [roundTerms, setRoundTerms] = useState(
  initialMatchingData.round
);

  const [cards, setCards] = useState([]);
  const [selectedFirst, setSelectedFirst] = useState(null);
  const [matchedIds, setMatchedIds] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [roundNumber, setRoundNumber] = useState(1);
  const [startTime] = useState(Date.now());

  // =========================================================
  // TẠO CARDS CHO ROUND HIỆN TẠI
  // =========================================================
  useEffect(() => {
    if (!roundTerms.length) return;

    const termCards = roundTerms.map((t) => ({
      id: `term-${t.id}`,
      termId: t.id,
      text: t.term,
      type: 'term'
    }));

    const meaningCards = roundTerms.map((t) => ({
      id: `meaning-${t.id}`,
      termId: t.id,
      text: t.meaning || t.definition,
      type: 'meaning'
    }));

    const shuffledCards = shuffleArray([
      ...termCards,
      ...meaningCards
    ]);

    setCards(shuffledCards);
    setMatchedIds([]);
    setSelectedFirst(null);
  }, [roundTerms]);

  // =========================================================
  // BẮT ĐẦU ROUND TIẾP THEO
  // =========================================================
  const startNextRound = (newCompletedIds) => {
    if (remainingTerms.length === 0) {
      const timeSeconds = Math.round(
        (Date.now() - startTime) / 1000
      );

      onFinish({
        mode: 'matching',
        score: newCompletedIds.length,
        total: terms.length,
        timeSeconds
      });

      return;
    }

    const nextRound = remainingTerms.slice(0, 8);
    const nextRemaining = remainingTerms.slice(8);

    setCompletedIds(newCompletedIds);
    setRemainingTerms(nextRemaining);
    setRoundTerms(nextRound);
    setRoundNumber((prev) => prev + 1);
  };

  // =========================================================
  // CLICK CARD
  // =========================================================
  const handleCardClick = (card) => {
    // Không cho chọn card đã ghép
    if (matchedIds.includes(card.termId)) return;

    // Không cho click chính card đang được chọn
    if (selectedFirst?.id === card.id) return;

    // Chọn card đầu tiên
    if (!selectedFirst) {
      setSelectedFirst(card);
      playAudioFeedback('flip');
      return;
    }

    // =======================================================
    // MATCH ĐÚNG
    // =======================================================
    if (
      selectedFirst.termId === card.termId &&
      selectedFirst.type !== card.type
    ) {
      playAudioFeedback('correct');

      const newMatchedIds = [
        ...matchedIds,
        card.termId
      ];

      setMatchedIds(newMatchedIds);
      setSelectedFirst(null);

      // Kiểm tra round hiện tại đã hoàn thành chưa
      if (newMatchedIds.length === roundTerms.length) {
        const newCompletedIds = [
          ...completedIds,
          ...roundTerms.map((term) => term.id)
        ];

        setTimeout(() => {
          startNextRound(newCompletedIds);
        }, 700);
      }

      return;
    }

    // =======================================================
    // MATCH SAI
    // =======================================================
    playAudioFeedback('incorrect');

    // Chọn card mới làm card đầu tiên
    setSelectedFirst(card);
  };

  // =========================================================
  // EMPTY STATE
  // =========================================================
  if (!terms.length) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <div className="text-5xl mb-4">🧩</div>

        <h2 className="text-xl font-black text-slate-800">
          Chưa có từ để luyện
        </h2>

        <button
          onClick={onBack}
          className="mt-6 px-5 py-3 rounded-xl bg-indigo-600 text-white font-bold"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const totalCompleted = completedIds.length + matchedIds.length;

  const totalTerms = terms.length;

  const progress = Math.round(
    (totalCompleted / totalTerms) * 100
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* =====================================================
          HEADER
          ===================================================== */}
      <div className="flex flex-wrap justify-between items-center gap-3">

        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Bỏ cuộc
        </button>

        <div className="text-right">

          <p className="text-xs font-bold text-slate-400">
            VÒNG {roundNumber}
          </p>

          <p className="text-sm font-black text-slate-600">
            Đã ghép: {totalCompleted} / {totalTerms}
          </p>

        </div>
      </div>

      {/* =====================================================
          PROGRESS BAR
          ===================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">

        <div className="flex justify-between items-center mb-2">

          <span className="text-xs font-bold text-slate-500">
            Tiến độ
          </span>

          <span className="text-xs font-black text-indigo-600">
            {progress}%
          </span>

        </div>

        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">

          <div
            className="h-full bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-400 rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`
            }}
          />

        </div>

      </div>

      {/* =====================================================
          ROUND INFO
          ===================================================== */}
      <div className="text-center">

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-600 text-xs font-black">
          🧩 GHÉP {roundTerms.length} CẶP
        </div>

        <p className="mt-2 text-sm text-slate-400">
          Tìm đúng cặp từ và nghĩa nhé!
        </p>

      </div>

      {/* =====================================================
          MATCHING GRID
          ===================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

        {cards.map((card) => {

          const isMatched =
            matchedIds.includes(card.termId);

          const isSelected =
            selectedFirst?.id === card.id;

          if (isMatched) {
            return (
              <div
                key={card.id}
                className="h-24 bg-slate-100 rounded-2xl border border-slate-200 opacity-20 flex items-center justify-center p-2 text-center"
              >
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

      {/* =====================================================
          ROUND STATUS
          ===================================================== */}
      <div className="text-center text-xs text-slate-400 font-medium">

        {remainingTerms.length > 0 ? (
          <>
            Còn {remainingTerms.length} từ ở các vòng tiếp theo.
          </>
        ) : (
          <>
            Đây là vòng cuối cùng! 🎉
          </>
        )}

      </div>

    </div>
  );
}

function SpellingMode({ activeSet, onFinish, onBack }) {
  const terms = activeSet.terms || [];

  const [questionQueue, setQuestionQueue] = useState(() => [...terms]);
  const [retryQueue, setRetryQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [attemptedIds, setAttemptedIds] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [isRetryRound, setIsRetryRound] = useState(false);
  const [startTime] = useState(Date.now());

  const currentTerm = questionQueue[index];

  useEffect(() => {
    if (currentTerm) {
      speakWord(currentTerm.term);
    }
  }, [index, questionQueue]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!input.trim() || feedback || !currentTerm) return;

    const isCorrect =
      input.trim().toLowerCase() ===
      currentTerm.term.trim().toLowerCase();

    const termKey = currentTerm.id ?? currentTerm.term;
    const hasAttempted = attemptedIds.includes(termKey);

    if (!hasAttempted) {
      setAttemptedIds(prev => [...prev, termKey]);
    }

    if (isCorrect) {
      playAudioFeedback('correct');
      setFeedback('correct');

      if (!hasAttempted) {
        setScore(prev => prev + 1);
      }
    } else {
      playAudioFeedback('incorrect');
      setFeedback('incorrect');
    }

    // Từ sai sẽ được đưa vào hàng đợi luyện lại.
    const nextRetryQueue = isCorrect
      ? [...retryQueue]
      : [...retryQueue, currentTerm];

    setTimeout(() => {
      setFeedback(null);
      setInput('');

      // Tiếp tục câu tiếp theo trong vòng hiện tại.
      if (index + 1 < questionQueue.length) {
        setRetryQueue(nextRetryQueue);
        setIndex(prev => prev + 1);
        return;
      }

      // Nếu còn từ sai, bắt đầu một vòng luyện lại.
      if (nextRetryQueue.length > 0) {
        setQuestionQueue(nextRetryQueue);
        setRetryQueue([]);
        setIndex(0);
        setIsRetryRound(true);
        return;
      }

      // Tất cả các từ đã được viết đúng.
      const finalScore =
        score + (isCorrect && !hasAttempted ? 1 : 0);

      const timeSeconds = Math.round(
        (Date.now() - startTime) / 1000
      );

      onFinish({
        mode: 'spelling',
        score: finalScore,
        total: terms.length,
        timeSeconds
      });
    }, 1500);
  };

  if (!currentTerm) return null;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Bỏ cuộc
        </button>

        <span className="text-xs font-bold text-slate-500">
          {index + 1} / {questionQueue.length}
        </span>
      </div>

      {isRetryRound && (
        <div className="p-3 bg-amber-100 text-amber-800 rounded-xl text-center text-sm font-bold">
          🔁 Luyện lại những từ viết sai
        </div>
      )}

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-md text-center space-y-4">
  <button
    onClick={() => speakWord(currentTerm.term)}
    className="p-4 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition inline-flex"
  >
    <Volume2 className="w-8 h-8" />
  </button>

  <VocabularyImage
    term={currentTerm}
    className="w-40 h-40 mx-auto"
  />

  <div className="space-y-2">
  <p className="text-xs text-slate-400 uppercase font-bold">
    Nghĩa của từ:
  </p>

  {currentTerm.meaning && (
    <p className="text-xl font-extrabold text-slate-800">
      {currentTerm.meaning}
    </p>
  )}

  {currentTerm.definition && (
    <p className="text-sm text-slate-500">
      {currentTerm.definition}
    </p>
  )}
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
            ✗ Sai rồi! Đáp án đúng:{' '}
            <span className="underline">{currentTerm.term}</span>
            <p className="mt-1 text-xs font-medium">
              Từ này sẽ xuất hiện lại để bạn luyện tập.
            </p>
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

function CompletionScreen({ scoreData, onRestart, onBack }) {
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

      <div className="space-y-3">
  <button
    type="button"
    onClick={onRestart}
    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition flex items-center justify-center gap-2"
  >
    <RefreshCw className="w-4 h-4" />
    Làm Lại Bài
  </button>

  <button
    type="button"
    onClick={onBack}
    className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-2xl border-2 border-slate-200 transition flex items-center justify-center gap-2"
  >
    <ArrowLeft className="w-4 h-4" />
    Quay Về Menu
  </button>
</div>
    </div>
  );
}