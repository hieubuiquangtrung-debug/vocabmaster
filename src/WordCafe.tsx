import { useMemo, useState } from 'react';
import { ArrowLeft, ChefHat, Coffee, Heart, RotateCcw, Sparkles, Star, Trophy, Volume2 } from 'lucide-react';

type CafeTerm = {
  id?: string | number;
  word?: string;
  term?: string;
  meaning?: string;
  definition?: string;
  vietnamese?: string;
  example?: string;
  imageUrl?: string;
  image?: string;
};
type CafeQuestion = { word: string; meaning: string; example: string; image: string; options: string[] };
type WordCafeProps = {
  activeSet: { id?: string; title?: string; terms?: CafeTerm[] };
  onBack: () => void;
  onFinish?: (scoreData: { mode: string; score: number; total: number; percentage: number; timeSeconds: number }) => void;
};

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);
function makeQuestions(terms: CafeTerm[]): CafeQuestion[] {
  const clean = terms.map((item) => ({
    word: String(item.word || item.term || '').trim(),
    meaning: String(item.meaning || item.definition || item.vietnamese || '').trim(),
    example: String(item.example || '').trim(),
    image: String(item.imageUrl || item.image || '').trim(),
  })).filter((item) => item.word);
  return shuffle(clean).map((item) => {
    const wrong = shuffle(clean.filter((candidate) => candidate.word !== item.word)).slice(0, 3).map((candidate) => candidate.word);
    return { ...item, meaning: item.meaning || item.example || 'Choose the correct word for this order.', options: shuffle([item.word, ...wrong]) };
  });
}
const teams = [
  { name: 'Đội Dâu Tây', emoji: '🍓', badge: 'bg-rose-100 text-rose-700 border-rose-200' },
  { name: 'Đội Matcha', emoji: '🍵', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { name: 'Đội Mochi', emoji: '🍡', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
  { name: 'Đội Bánh Mây', emoji: '🧁', badge: 'bg-sky-100 text-sky-700 border-sky-200' },
];

export default function WordCafe({ activeSet, onBack, onFinish }: WordCafeProps) {
  const questions = useMemo(() => makeQuestions(activeSet?.terms || []), [activeSet?.id, activeSet?.terms]);
  const [screen, setScreen] = useState<'setup' | 'playing' | 'results'>('setup');
  const [playMode, setPlayMode] = useState<'solo' | 'teams'>('solo');
  const [teamCount, setTeamCount] = useState(2);
  const [roundCount, setRoundCount] = useState(Math.min(10, questions.length));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [soloScore, setSoloScore] = useState(0);
  const [teamScores, setTeamScores] = useState<number[]>([0, 0, 0, 0]);
  const [teamTurn, setTeamTurn] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  const rounds = Math.min(Math.max(1, roundCount || 1), questions.length);
  const question = questions[questionIndex];
  const currentTeam = teams[teamTurn % teamCount];
  const isLast = questionIndex + 1 >= rounds;

  const startGame = () => {
    setQuestionIndex(0); setSelected(''); setRevealed(false); setSoloScore(0); setTeamScores([0, 0, 0, 0]);
    setTeamTurn(0); setStreak(0); setBestStreak(0); setCorrectCount(0); setStartedAt(Date.now()); setFinishedAt(null); setScreen('playing');
  };
  const chooseAnswer = (answer: string) => {
    if (revealed || !question) return;
    setSelected(answer); setRevealed(true);
    if (answer === question.word) {
      setCorrectCount((count) => count + 1);
      if (playMode === 'solo') setSoloScore((score) => score + 10 + Math.min(streak, 5) * 2);
      else setTeamScores((scores) => scores.map((score, index) => index === teamTurn ? score + 10 : score));
      setStreak((value) => { const next = value + 1; setBestStreak((best) => Math.max(best, next)); return next; });
    } else setStreak(0);
  };
  const nextQuestion = () => {
    if (isLast) { setFinishedAt(Date.now()); setScreen('results'); return; }
    setQuestionIndex((index) => index + 1); setSelected(''); setRevealed(false);
    if (playMode === 'teams') setTeamTurn((turn) => (turn + 1) % teamCount);
  };
  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-US'; utterance.rate = 0.85; window.speechSynthesis.speak(utterance);
    }
  };
  const elapsed = Math.max(0, Math.round(((finishedAt || Date.now()) - (startedAt || Date.now())) / 1000));

  if (!questions.length) return <div className="mx-auto max-w-3xl rounded-[2rem] border border-pink-200 bg-pink-50 p-8 text-center"><div className="text-6xl">🧁</div><h2 className="mt-3 text-2xl font-black text-rose-900">Quán chưa có nguyên liệu!</h2><p className="mt-2 text-rose-800">Bộ từ vựng này chưa có từ hợp lệ. Hãy kiểm tra wordlist rồi quay lại nhé.</p><button onClick={onBack} className="mt-5 rounded-2xl bg-rose-500 px-5 py-3 font-bold text-white">Quay lại bài học</button></div>;

  return <div className="mx-auto w-full max-w-6xl space-y-5 pb-6 text-slate-800">
    <header className="relative isolate overflow-hidden rounded-[2rem] border border-pink-100 bg-gradient-to-br from-rose-100 via-orange-50 to-violet-100 p-5 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -right-5 -top-8 text-[7rem] opacity-20 sm:text-[10rem]">🧁</div><div className="pointer-events-none absolute bottom-0 right-1/4 text-5xl opacity-40">🍓</div>
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3"><button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-white bg-white/80 px-3 py-2 text-sm font-bold text-rose-800 hover:bg-white"><ArrowLeft size={17}/> Thoát game</button><span className="rounded-full border border-white bg-white/80 px-3 py-2 text-xs font-black tracking-wider text-rose-700">☁️ LITTLE WORD CAFÉ</span></div>
      <div className="relative z-10 mt-5 grid items-center gap-5 md:grid-cols-[1.2fr_0.8fr]"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-rose-500">VOCABMASTER · LEARN & PLAY</p><h1 className="mt-2 text-3xl font-black leading-tight text-rose-950 sm:text-5xl">Word Café <span className="inline-block animate-bounce">☕</span></h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-rose-900 sm:text-base">Nhận order, tìm đúng từ vựng và phục vụ những vị khách đáng yêu! Hôm nay chúng ta luyện: <strong>{activeSet?.title || 'Vocabulary Menu'}</strong>.</p><div className="mt-4 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/80 px-3 py-2 text-rose-700">🍰 Đơn hàng từ vựng</span><span className="rounded-full bg-white/80 px-3 py-2 text-violet-700">⭐ Điểm thưởng</span><span className="rounded-full bg-white/80 px-3 py-2 text-emerald-700">👩‍🍳 Chơi theo đội</span></div></div>
      <div className="relative mx-auto flex h-44 w-full max-w-sm items-center justify-center sm:h-52"><div className="absolute h-36 w-64 rounded-[2rem] border-4 border-white/80 bg-gradient-to-br from-rose-200 via-orange-100 to-violet-200 shadow-inner sm:h-40 sm:w-72"/><div className="absolute left-[14%] top-[10%] text-3xl">☁️</div><div className="absolute right-[15%] top-[10%] text-3xl">✨</div><div className="relative z-10 text-7xl drop-shadow-sm sm:text-8xl">🧑🏻‍🍳</div><div className="absolute bottom-1 right-[15%] animate-bounce text-4xl">🧁</div><div className="absolute bottom-3 left-[13%] text-3xl">🍓</div></div></div>
    </header>

    {screen === 'setup' && <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]"><section className="rounded-[2rem] border border-pink-100 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-100 text-2xl">📝</div><div><h2 className="text-xl font-black">Chuẩn bị order</h2><p className="text-sm text-slate-500">Chọn cách chơi và số đơn hàng.</p></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => setPlayMode('solo')} className={`rounded-2xl border-2 p-4 text-left transition ${playMode === 'solo' ? 'border-rose-400 bg-rose-50 ring-2 ring-rose-100' : 'border-slate-200 hover:border-rose-200'}`}><div className="text-3xl">🧑‍🍳</div><p className="mt-2 font-black">Tự chơi</p><p className="mt-1 text-sm text-slate-500">Phục vụ khách và tích điểm của bạn.</p></button><button onClick={() => setPlayMode('teams')} className={`rounded-2xl border-2 p-4 text-left transition ${playMode === 'teams' ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 hover:border-violet-200'}`}><div className="text-3xl">👯</div><p className="mt-2 font-black">Thi đua trên lớp</p><p className="mt-1 text-sm text-slate-500">Các đội luân phiên nhận order.</p></button></div>
      {playMode === 'teams' && <div className="mt-5"><label className="mb-2 block text-sm font-bold">Số đội</label><div className="grid grid-cols-3 gap-2">{[2,3,4].map((count) => <button key={count} onClick={() => setTeamCount(count)} className={`rounded-xl border-2 px-3 py-2.5 font-black ${teamCount === count ? 'border-violet-400 bg-violet-50 text-violet-800' : 'border-slate-200'}`}>{count} đội</button>)}</div></div>}
      <div className="mt-5"><label className="mb-2 block text-sm font-bold">Số đơn hàng</label><div className="grid grid-cols-3 gap-2">{[5,10,15].map((count) => <button key={count} disabled={questions.length < count} onClick={() => setRoundCount(count)} className={`rounded-xl border-2 px-3 py-2.5 font-black disabled:cursor-not-allowed disabled:opacity-35 ${roundCount === count ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200'}`}>{count} câu</button>)}</div><p className="mt-2 text-xs text-slate-500">Bộ từ có {questions.length} từ. Nếu có ít hơn 5 từ, game sẽ dùng số từ hiện có.</p></div>
      <button onClick={startGame} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 px-5 py-4 font-black text-white shadow-md transition hover:brightness-105"><Coffee size={19}/> Mở quán thôi!</button></section>
      <aside className="rounded-[2rem] border border-amber-100 bg-gradient-to-br from-amber-50 to-pink-50 p-5 sm:p-7"><div className="text-5xl">🍓</div><h2 className="mt-3 text-xl font-black">Menu hôm nay</h2><p className="mt-1 text-sm text-slate-600">{activeSet?.title || 'Bộ từ vựng của bạn'}</p><div className="mt-4 space-y-3">{[{emoji:'🥐',title:'Đọc gợi ý',desc:'Xem nghĩa hoặc câu ví dụ.'},{emoji:'🔎',title:'Chọn từ đúng',desc:'Mỗi đáp án đúng được 10 điểm.'},{emoji:'💗',title:'Giữ streak',desc:'Trả lời liên tiếp để tạo combo.'}].map((item) => <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-white bg-white/80 p-3"><span className="text-2xl">{item.emoji}</span><div><p className="font-extrabold">{item.title}</p><p className="text-sm text-slate-500">{item.desc}</p></div></div>)}</div><p className="mt-4 text-xs leading-relaxed text-slate-500">Mẹo: nhấn biểu tượng loa trong màn chơi để nghe phát âm tiếng Anh.</p></aside></div>}

    {screen === 'playing' && question && <section className="overflow-hidden rounded-[2rem] border border-pink-100 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-pink-100 bg-rose-50/70 p-4 sm:p-5"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">{playMode === 'solo' ? '🧑‍🍳' : currentTeam.emoji}</div><div><p className="text-xs font-black uppercase tracking-wider text-rose-500">{playMode === 'solo' ? 'CHEF CHALLENGE' : `LƯỢT CỦA ${currentTeam.name.toUpperCase()}`}</p><p className="font-black">Order {questionIndex + 1} / {rounds}</p></div></div><div className="flex items-center gap-2 rounded-full border border-white bg-white px-3 py-2 text-sm font-black text-amber-700"><Star size={16} className="fill-amber-300 text-amber-400"/>{playMode === 'solo' ? soloScore : teamScores[teamTurn]} điểm</div></div>
      <div className="h-2 bg-rose-100"><div className="h-full rounded-r-full bg-gradient-to-r from-rose-400 to-violet-400 transition-all" style={{width: `${((questionIndex + 1) / rounds) * 100}%`}}/></div>
      {playMode === 'teams' && <div className="grid grid-cols-2 gap-2 p-4 pb-0 sm:grid-cols-4">{teams.slice(0,teamCount).map((team,index)=><div key={team.name} className={`rounded-xl border p-2 text-center ${index === teamTurn ? team.badge + ' ring-2 ring-white' : 'border-slate-100 bg-slate-50 text-slate-500'}`}><div className="text-xl">{team.emoji}</div><p className="truncate text-xs font-bold">{team.name}</p><p className="text-sm font-black">{teamScores[index]} đ</p></div>)}</div>}
      <div className="p-4 sm:p-7"><div className="mx-auto max-w-3xl rounded-[1.75rem] border border-amber-100 bg-gradient-to-br from-amber-50 via-white to-pink-50 p-5 text-center sm:p-8"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.5rem] border-4 border-white bg-white text-5xl shadow-sm">{question.image ? <img src={question.image} alt={question.word} className="h-full w-full rounded-2xl object-cover"/> : '🧾'}</div><p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-rose-500">A CUSTOMER SAYS…</p><h2 className="mt-2 text-xl font-black leading-relaxed sm:text-2xl">Từ nào phù hợp với order này?</h2><p className="mx-auto mt-3 max-w-xl text-lg font-bold leading-relaxed text-violet-900 sm:text-xl">“{question.meaning}”</p>{question.example && question.example !== question.meaning && <p className="mt-3 text-sm italic text-slate-500">Ví dụ: {question.example}</p>}</div>
      <div className="mt-5 grid grid-cols-2 gap-3">{question.options.map((option,index)=>{const isCorrect=option===question.word;const isSelected=option===selected;let style='border-slate-200 bg-white text-slate-800 hover:border-rose-300 hover:bg-rose-50';if(revealed&&isCorrect)style='border-emerald-300 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100';else if(revealed&&isSelected)style='border-rose-300 bg-rose-50 text-rose-800';return <button key={`${questionIndex}-${option}`} disabled={revealed} onClick={()=>chooseAnswer(option)} className={`min-h-16 rounded-2xl border-2 p-3 text-left font-extrabold transition sm:min-h-20 sm:p-4 ${style} disabled:cursor-default`}><span className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 text-xs font-black">{String.fromCharCode(65+index)}</span><span className="break-words text-sm sm:text-base">{option}</span>{revealed&&isCorrect&&<span className="ml-2">✓</span>}</button>})}</div>
      {revealed && <div className={`mt-4 rounded-2xl border p-4 ${selected===question.word?'border-emerald-200 bg-emerald-50':'border-amber-200 bg-amber-50'}`}><div className="flex items-start gap-3"><div className="text-2xl">{selected===question.word?'🎉':'💗'}</div><div className="min-w-0 flex-1"><p className="font-black">{selected===question.word?'Order hoàn thành! Tuyệt vời!':`Gần đúng rồi! Đáp án là “${question.word}”.`}</p><p className="mt-1 text-sm text-slate-600">{selected===question.word?'Bạn nhận điểm thưởng. Vị khách đang rất vui!':'Đừng lo nhé, mình học thêm một từ mới nào.'}</p></div><button onClick={()=>speak(question.word)} title="Nghe phát âm" className="rounded-xl bg-white p-2.5 text-rose-600 shadow-sm"><Volume2 size={19}/></button></div></div>}
      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button onClick={()=>setScreen('setup')} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Tạm dừng</button><button disabled={!revealed} onClick={nextQuestion} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-400 to-pink-500 px-5 py-3 font-black text-white shadow-md hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40">{isLast?'Tính tiền & xem kết quả':'Nhận order tiếp theo'} <span>→</span></button></div></div></section>}

    {screen === 'results' && <section className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-pink-100 bg-white shadow-lg"><div className="relative overflow-hidden bg-gradient-to-br from-rose-300 via-pink-300 to-violet-300 px-5 py-8 text-center sm:px-10 sm:py-10"><div className="absolute left-8 top-8 animate-pulse text-3xl">✨</div><div className="absolute right-8 top-12 animate-bounce text-3xl">🍓</div><div className="text-6xl">{playMode==='solo'?'🏆':'🎉'}</div><p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-rose-900/60">CAFÉ CLOSED FOR TODAY</p><h2 className="mt-2 text-3xl font-black text-rose-950 sm:text-4xl">{playMode==='solo'?'Barista xuất sắc!':'Ca làm việc kết thúc!'}</h2><p className="mt-2 text-rose-950/75">Cảm ơn bạn đã phục vụ các vị khách hôm nay.</p></div><div className="p-5 sm:p-8">{playMode==='solo'?<div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-amber-50 p-4 text-center"><Star className="mx-auto text-amber-500"/><p className="mt-2 text-2xl font-black">{soloScore}</p><p className="text-xs font-bold text-slate-500">Điểm thưởng</p></div><div className="rounded-2xl bg-emerald-50 p-4 text-center"><Heart className="mx-auto text-emerald-500"/><p className="mt-2 text-2xl font-black">{correctCount}/{rounds}</p><p className="text-xs font-bold text-slate-500">Order đúng</p></div><div className="col-span-2 rounded-2xl bg-violet-50 p-4 text-center sm:col-span-1"><Sparkles className="mx-auto text-violet-500"/><p className="mt-2 text-2xl font-black">{bestStreak}</p><p className="text-xs font-bold text-slate-500">Combo tốt nhất</p></div></div>:<div className="space-y-3">{teams.slice(0,teamCount).map((team,index)=>({...team,score:teamScores[index]})).sort((a,b)=>b.score-a.score).map((team,index)=><div key={team.name} className={`flex items-center gap-3 rounded-2xl border p-4 ${index===0?'border-amber-300 bg-amber-50':'border-slate-200 bg-slate-50'}`}><div className="text-3xl">{index===0?'👑':team.emoji}</div><div className="min-w-0 flex-1"><p className="font-black">{index===0?'🥇 ':`${index+1}. `}{team.name}</p><p className="text-xs text-slate-500">{index===0?'Quán quân của ca hôm nay!':'Cảm ơn đội đã tham gia!'}</p></div><p className="text-xl font-black">{team.score} <span className="text-xs">điểm</span></p></div>)}</div>}<div className="mt-5 rounded-2xl border border-pink-100 bg-pink-50 p-4"><p className="flex items-center gap-2 font-black text-rose-900"><ChefHat size={18}/> Huy hiệu hôm nay</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-rose-800">☕ Barista chăm chỉ</span>{bestStreak>=3&&<span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-violet-800">✨ Combo Master</span>}{correctCount>=Math.ceil(rounds*.8)&&<span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">🍰 Siêu phục vụ</span>}</div></div><div className="mt-6 flex flex-col gap-3 sm:flex-row">{playMode==='solo'&&onFinish&&<button onClick={()=>onFinish({mode:'word-cafe',score:correctCount*10,total:rounds*10,percentage:rounds?Math.round(correctCount/rounds*100):0,timeSeconds:elapsed})} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white hover:bg-emerald-700"><Trophy size={18}/> Lưu điểm cá nhân</button>}<button onClick={startGame} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-3 font-black text-white hover:bg-rose-600"><RotateCcw size={18}/> Chơi lại</button><button onClick={onBack} className="flex-1 rounded-xl border border-slate-200 px-5 py-3 font-black text-slate-700 hover:bg-slate-50">Quay về bài học</button></div><p className="mt-4 text-center text-xs leading-relaxed text-slate-400">{playMode==='teams'?'Điểm đội được tính trên thiết bị đang chơi, chưa đồng bộ trực tiếp giữa nhiều thiết bị.':`Thời gian: ${elapsed} giây. Kết quả cá nhân gửi qua luồng lưu điểm hiện có.`}</p></div></section>}
  </div>;
}
