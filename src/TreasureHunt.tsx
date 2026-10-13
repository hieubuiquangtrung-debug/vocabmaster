import { useMemo, useState } from 'react';
import { ArrowLeft, Compass, Crown, Gem, Heart, Map, RotateCcw, Shield, Sparkles, Star, Trophy, Users, Volume2 } from 'lucide-react';

type VocabTerm = {
  id?: string | number;
  word?: string;
  term?: string;
  meaning?: string;
  definition?: string;
  example?: string;
  imageUrl?: string;
  image?: string;
};

type TreasureHuntProps = {
  activeSet: { id?: string; title?: string; description?: string; terms?: VocabTerm[] };
  onBack: () => void;
  onFinish?: (scoreData: { mode: string; score: number; total: number; percentage: number; timeSeconds: number }) => void;
};

type Question = { word: string; meaning: string; options: string[]; answer: string; example?: string; image?: string };

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

function buildQuestions(terms: VocabTerm[]): Question[] {
  const clean = terms
    .map((t) => ({
      word: String(t.word || t.term || '').trim(),
      meaning: String(t.meaning || t.definition || '').trim(),
      example: String(t.example || '').trim(),
      image: String(t.imageUrl || t.image || '').trim(),
    }))
    .filter((t) => t.word);

  return shuffle(clean).map((term) => {
    const distractors = shuffle(clean.filter((other) => other.word !== term.word)).slice(0, 3).map((t) => t.word);
    return {
      word: term.word,
      meaning: term.meaning || term.example || 'Choose the correct vocabulary word.',
      example: term.example,
      image: term.image,
      options: shuffle([term.word, ...distractors]),
      answer: term.word,
    };
  });
}

const teamPalette = [
  { name: 'Đội Rồng Lửa', color: 'from-orange-500 to-rose-500', light: 'bg-orange-50 border-orange-200 text-orange-700', emoji: '🐉' },
  { name: 'Đội Sói Băng', color: 'from-sky-500 to-blue-600', light: 'bg-sky-50 border-sky-200 text-sky-700', emoji: '🐺' },
  { name: 'Đội Phượng Hoàng', color: 'from-violet-500 to-fuchsia-500', light: 'bg-violet-50 border-violet-200 text-violet-700', emoji: '🦄' },
  { name: 'Đội Rùa Vàng', color: 'from-emerald-500 to-teal-500', light: 'bg-emerald-50 border-emerald-200 text-emerald-700', emoji: '🐢' },
];

export default function TreasureHunt({ activeSet, onBack, onFinish }: TreasureHuntProps) {
  const questions = useMemo(() => buildQuestions(activeSet?.terms || []), [activeSet?.id, activeSet?.terms]);
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
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [earned, setEarned] = useState<string[]>([]);

  const rounds = Math.min(Math.max(1, roundCount || 1), questions.length);
  const question = questions[questionIndex];
  const currentTeam = teamPalette[teamTurn % teamCount];
  const isLastQuestion = questionIndex + 1 >= rounds;

  const startGame = () => {
    setQuestionIndex(0);
    setSelected('');
    setRevealed(false);
    setSoloScore(0);
    setTeamScores([0, 0, 0, 0]);
    setTeamTurn(0);
    setStreak(0);
    setBestStreak(0);
    setEarned([]);
    setStartedAt(Date.now());
    setFinishedAt(null);
    setScreen('playing');
  };

  const chooseAnswer = (answer: string) => {
    if (revealed || !question) return;
    setSelected(answer);
    setRevealed(true);
    if (answer === question.answer) {
      setEarned((prev) => [...prev, question.word]);
      if (playMode === 'solo') setSoloScore((prev) => prev + 10 + Math.min(streak, 5) * 2);
      else setTeamScores((prev) => prev.map((score, i) => i === teamTurn ? score + 10 : score));
      setStreak((prev) => {
        const next = prev + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
    } else {
      setStreak(0);
    }
  };

  const nextQuestion = () => {
    if (isLastQuestion) {
      setFinishedAt(Date.now());
      setScreen('results');
      return;
    }
    setQuestionIndex((prev) => prev + 1);
    setSelected('');
    setRevealed(false);
    if (playMode === 'teams') setTeamTurn((prev) => (prev + 1) % teamCount);
  };

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  if (!questions.length) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-center sm:p-10">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-100 text-4xl">🗺️</div>
        <h2 className="text-2xl font-black text-slate-800">Chưa có từ vựng để khám phá!</h2>
        <p className="mt-2 text-slate-600">Bộ từ vựng này chưa có từ hợp lệ. Hãy kiểm tra danh sách từ trước khi bắt đầu.</p>
        <button onClick={onBack} className="mt-6 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-6">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-950 via-violet-900 to-fuchsia-800 p-5 text-white shadow-xl sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 rounded-full bg-fuchsia-400/20 blur-sm" />
        <div className="pointer-events-none absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-cyan-300/10 blur-sm" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-bold transition hover:bg-white/20"><ArrowLeft size={17} /> Thoát game</button>
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-violet-100"><Compass size={15} /> TREASURE ISLAND</div>
        </div>
        <div className="relative z-10 mt-5 grid gap-5 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">VOCABMASTER ADVENTURE</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Treasure Hunt <span className="inline-block animate-bounce">🗺️</span></h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-indigo-100">Khám phá hòn đảo bí ẩn, vượt thử thách từ vựng và mở khóa kho báu trong bộ từ: <strong className="text-white">{activeSet?.title || 'Vocabulary Quest'}</strong>.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-emerald-300/15 px-3 py-1.5 text-emerald-100">✨ Combo điểm thưởng</span><span className="rounded-full bg-amber-300/15 px-3 py-1.5 text-amber-100">💎 Kho báu bí mật</span><span className="rounded-full bg-pink-300/15 px-3 py-1.5 text-pink-100">🐲 Boss đảo</span></div>
          </div>
          <div className="relative mx-auto flex h-44 w-full max-w-sm items-center justify-center sm:h-52">
            <div className="absolute h-40 w-64 rotate-[-8deg] rounded-[48%] border-4 border-emerald-200/30 bg-gradient-to-br from-emerald-300 via-teal-400 to-cyan-500 shadow-[0_20px_45px_rgba(0,0,0,0.3)] sm:h-44 sm:w-72" />
            <div className="absolute left-[16%] top-[16%] text-3xl sm:text-4xl">🌴</div><div className="absolute right-[17%] top-[20%] text-3xl sm:text-4xl">🌴</div>
            <div className="absolute left-[40%] top-[14%] text-2xl">☁️</div><div className="absolute right-[32%] bottom-[17%] text-3xl">💎</div>
            <div className="relative z-10 mt-3 text-6xl drop-shadow-lg sm:text-7xl">🏴‍☠️</div>
            <div className="absolute bottom-1 right-[15%] animate-bounce text-3xl">🧰</div>
          </div>
        </div>
      </div>

      {screen === 'setup' && (
        <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl">🧭</div><div><h2 className="text-xl font-black text-slate-800">Chọn hành trình</h2><p className="text-sm text-slate-500">Chơi một mình hoặc thi đua theo đội.</p></div></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button onClick={() => setPlayMode('solo')} className={`rounded-2xl border-2 p-4 text-left transition ${playMode === 'solo' ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-100' : 'border-slate-200 hover:border-violet-200'}`}><div className="text-3xl">🧑‍🚀</div><p className="mt-2 font-black text-slate-800">Nhà thám hiểm cá nhân</p><p className="mt-1 text-sm text-slate-500">Tự vượt thử thách, tích điểm và lưu kết quả.</p></button>
              <button onClick={() => setPlayMode('teams')} className={`rounded-2xl border-2 p-4 text-left transition ${playMode === 'teams' ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-100' : 'border-slate-200 hover:border-orange-200'}`}><div className="text-3xl">🏆</div><p className="mt-2 font-black text-slate-800">Đại chiến đội nhóm</p><p className="mt-1 text-sm text-slate-500">Luân phiên trả lời trên cùng một màn hình lớp học.</p></button>
            </div>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <label className="flex items-center justify-between gap-3 text-sm font-bold text-slate-700"><span>🏝️ Số câu hỏi trong chuyến đi</span><span className="rounded-lg bg-white px-3 py-1.5 font-black text-violet-700 shadow-sm">{rounds} câu</span></label>
              <input type="range" min={Math.min(3, questions.length)} max={questions.length} value={Math.min(roundCount, questions.length)} onChange={(e) => setRoundCount(Number(e.target.value))} className="mt-3 w-full accent-violet-600" />
              <div className="mt-1 flex justify-between text-xs text-slate-500"><span>Chuyến ngắn</span><span>{questions.length} từ trong bộ</span></div>
            </div>
            {playMode === 'teams' && <div className="mt-4 rounded-2xl border border-orange-100 bg-orange-50/70 p-4"><div className="flex items-center gap-2 font-black text-slate-800"><Users size={18} /> Số đội tham gia</div><div className="mt-3 grid grid-cols-4 gap-2">{[2, 3, 4].map((n) => <button key={n} onClick={() => { setTeamCount(n); setTeamTurn(0); }} className={`rounded-xl border px-3 py-2 font-extrabold ${teamCount === n ? 'border-orange-500 bg-orange-500 text-white' : 'border-orange-200 bg-white text-orange-700'}`}>{n} đội</button>)}</div><p className="mt-3 text-xs leading-relaxed text-orange-800">Mỗi đội lần lượt trả lời một câu. Đúng được 10 điểm; đội có tổng điểm cao nhất thắng.</p></div>}
            <button onClick={startGame} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-4 text-base font-black text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl"><Compass size={20} /> Bắt đầu săn kho báu <span>🚀</span></button>
          </section>
          <aside className="space-y-4">
            <div className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 p-5 sm:p-6"><div className="flex items-center gap-2 text-emerald-800"><Map size={19} /><h3 className="font-black">Bản đồ hòn đảo</h3></div><div className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-200 via-emerald-200 to-lime-200 p-4"><div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-yellow-200/80"/><div className="relative grid grid-cols-3 gap-3 text-center">{['🌴','🪨','🦜','🛖','🐊','💎','🌋','🌉','🧰'].map((emoji, i) => <div key={i} className={`flex aspect-square items-center justify-center rounded-2xl border border-white/70 text-2xl shadow-sm sm:text-3xl ${i === 8 ? 'bg-amber-200' : 'bg-white/60'}`}>{emoji}</div>)}</div><div className="relative mt-3 rounded-xl bg-white/75 px-3 py-2 text-center text-xs font-bold text-emerald-900">9 địa điểm bí ẩn đang chờ bạn!</div></div></div>
            <div className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5"><div className="flex items-center gap-3"><div className="text-3xl">🐲</div><div><h3 className="font-black text-slate-800">Thử thách quái vật</h3><p className="mt-1 text-sm text-slate-600">Trả lời chính xác để thu thập ngọc và mở rương cuối hành trình.</p></div></div><div className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-800"><Shield size={15}/> Không mất điểm khi trả lời sai — hãy thử lại lần sau!</div></div>
          </aside>
        </div>
      )}

      {screen === 'playing' && question && (
        <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wider text-slate-500">Tiến trình</span><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{questionIndex + 1}/{rounds}</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 transition-all duration-500" style={{ width: `${((questionIndex + 1) / rounds) * 100}%` }}/></div><div className="mt-4 grid grid-cols-5 gap-2">{Array.from({ length: rounds }, (_, i) => <div key={i} className={`flex aspect-square items-center justify-center rounded-xl text-sm font-black ${i < questionIndex ? 'bg-emerald-100 text-emerald-700' : i === questionIndex ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>{i < questionIndex ? '✓' : i + 1}</div>)}</div></div>
            {playMode === 'solo' ? <div className="rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white shadow-lg"><div className="flex items-center justify-between"><span className="text-sm font-bold text-white/90">Kho báu đã tìm</span><Gem size={22}/></div><div className="mt-2 text-4xl font-black">{soloScore}<span className="ml-2 text-base">điểm</span></div><div className="mt-3 flex items-center gap-2 text-sm font-bold"><Star size={16} fill="currentColor"/> Chuỗi đúng: {streak}</div></div> : <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2 text-sm font-black text-slate-700"><Users size={18}/> Bảng điểm đội</div><div className="mt-3 space-y-2">{teamPalette.slice(0, teamCount).map((team, i) => <div key={team.name} className={`flex items-center justify-between rounded-xl border p-3 ${i === teamTurn ? team.light : 'border-slate-100 bg-slate-50 text-slate-600'}`}><span className="flex items-center gap-2 text-sm font-bold"><span>{team.emoji}</span>{team.name}{i === teamTurn && <span className="text-[10px] uppercase">Đang chơi</span>}</span><strong>{teamScores[i]} đ</strong></div>)}</div></div>}
            <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-4"><div className="flex items-center gap-2 font-black text-indigo-900"><Sparkles size={17}/> Mẹo nhà thám hiểm</div><p className="mt-2 text-sm leading-relaxed text-indigo-800">Đọc nghĩa thật kỹ. Bạn có thể nghe cách phát âm của đáp án đúng sau khi mở kết quả.</p></div>
          </aside>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full bg-cyan-100 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-cyan-800">🧩 Câu đố kho báu</span>{playMode === 'teams' && <span className={`rounded-full bg-gradient-to-r ${currentTeam.color} px-3 py-1.5 text-xs font-black text-white`}>{currentTeam.emoji} Lượt của {currentTeam.name}</span>}</div>
            <div className="mt-6 rounded-[1.5rem] bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 p-5 text-center sm:p-8"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">{questionIndex === rounds - 1 ? '🧰' : ['🗝️','🦜','🌴','🧭','💎'][questionIndex % 5]}</div><p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-violet-500">Find the hidden word</p><h2 className="mx-auto mt-3 max-w-2xl text-xl font-black leading-relaxed text-slate-800 sm:text-2xl">Từ nào phù hợp với nghĩa hoặc gợi ý dưới đây?</h2><p className="mx-auto mt-3 max-w-xl text-lg font-bold leading-relaxed text-indigo-900 sm:text-xl">“{question.meaning}”</p>{question.example && question.example !== question.meaning && <p className="mt-3 text-sm italic text-slate-500">Ví dụ: {question.example}</p>}</div>
            <div className="mt-5 grid grid-cols-2 gap-3">{question.options.map((option, i) => { const isCorrect = option === question.answer; const isSelected = option === selected; let style = 'border-slate-200 bg-white text-slate-800 hover:border-violet-300 hover:bg-violet-50'; if (revealed && isCorrect) style = 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100'; else if (revealed && isSelected) style = 'border-rose-300 bg-rose-50 text-rose-800'; return <button key={`${questionIndex}-${option}`} disabled={revealed} onClick={() => chooseAnswer(option)} className={`min-h-16 rounded-2xl border-2 p-3 text-left font-extrabold transition sm:min-h-20 sm:p-4 ${style} disabled:cursor-default`}><span className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 text-xs font-black">{String.fromCharCode(65 + i)}</span><span className="break-words text-sm sm:text-base">{option}</span>{revealed && isCorrect && <span className="ml-2">✓</span>}</button>; })}</div>
            {revealed && <div className={`mt-4 rounded-2xl border p-4 ${selected === question.answer ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><div className="flex items-start gap-3"><div className="text-2xl">{selected === question.answer ? '🎉' : '🧭'}</div><div className="min-w-0 flex-1"><p className={`font-black ${selected === question.answer ? 'text-emerald-800' : 'text-amber-900'}`}>{selected === question.answer ? 'Chính xác! Bạn tìm thấy ngọc rồi!' : `Chưa đúng! Đáp án là “${question.answer}”.`}</p><p className="mt-1 text-sm text-slate-600">{selected === question.answer ? 'Bạn nhận được điểm thưởng. Tiếp tục khám phá nhé!' : 'Đừng lo, mỗi câu hỏi là một cơ hội học thêm từ mới.'}</p></div><button onClick={() => speak(question.answer)} title="Nghe phát âm" className="rounded-xl bg-white p-2.5 text-violet-700 shadow-sm"><Volume2 size={19}/></button></div></div>}
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"><button onClick={() => { setScreen('setup'); }} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Tạm dừng</button><button disabled={!revealed} onClick={nextQuestion} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 font-black text-white shadow-md transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40">{isLastQuestion ? 'Mở kho báu cuối cùng' : 'Tiếp tục khám phá'} <span>→</span></button></div>
          </section>
        </div>
      )}

      {screen === 'results' && (
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-xl"><div className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 px-5 py-8 text-center text-white sm:px-10 sm:py-10"><div className="absolute left-8 top-8 animate-pulse text-3xl">✨</div><div className="absolute right-8 top-12 animate-bounce text-3xl">⭐</div><div className="text-6xl">{playMode === 'solo' ? '🏆' : '🎉'}</div><p className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-white/80">MISSION COMPLETE</p><h2 className="mt-2 text-3xl font-black sm:text-4xl">{playMode === 'solo' ? 'Nhà thám hiểm tài ba!' : 'Đội chiến thắng đã lộ diện!'}</h2><p className="mt-2 text-white/90">Bạn đã khám phá xong hòn đảo kho báu.</p></div><div className="p-5 sm:p-8">{playMode === 'solo' ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-amber-50 p-4 text-center"><Gem className="mx-auto text-amber-500"/><p className="mt-2 text-2xl font-black text-slate-800">{soloScore}</p><p className="text-xs font-bold text-slate-500">Điểm thưởng</p></div><div className="rounded-2xl bg-emerald-50 p-4 text-center"><Star className="mx-auto text-emerald-500"/><p className="mt-2 text-2xl font-black text-slate-800">{earned.length}/{rounds}</p><p className="text-xs font-bold text-slate-500">Câu đúng</p></div><div className="col-span-2 rounded-2xl bg-violet-50 p-4 text-center sm:col-span-1"><Heart className="mx-auto text-violet-500"/><p className="mt-2 text-2xl font-black text-slate-800">{bestStreak}</p><p className="text-xs font-bold text-slate-500">Combo tốt nhất</p></div></div> : <div className="space-y-3">{teamPalette.slice(0, teamCount).map((team, i) => ({ ...team, score: teamScores[i], index: i })).sort((a,b) => b.score-a.score).map((team, i) => <div key={team.name} className={`flex items-center gap-3 rounded-2xl border p-4 ${i === 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}><div className="text-3xl">{i === 0 ? '👑' : team.emoji}</div><div className="min-w-0 flex-1"><p className="font-black text-slate-800">{i === 0 ? '🥇 ' : `${i + 1}. `}{team.name}</p><p className="text-xs text-slate-500">{i === 0 ? 'Nhà vô địch hòn đảo!' : 'Cảm ơn đội đã tham gia!'}</p></div><p className="text-xl font-black text-slate-800">{team.score} <span className="text-xs">điểm</span></p></div>)}</div>}<div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="flex items-center gap-2 font-black text-emerald-900"><Crown size={18}/> Huy hiệu đã mở khóa</p><div className="mt-3 flex flex-wrap gap-2">{bestStreak >= 3 && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">🔥 Combo Master</span>}{earned.length >= Math.ceil(rounds * 0.8) && <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">💎 Thợ săn ngọc</span>}<span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">🗺️ Nhà thám hiểm</span></div></div><div className="mt-6 flex flex-col gap-3 sm:flex-row">{playMode === 'solo' && onFinish && <button onClick={() => onFinish({ mode: 'treasure-hunt', score: earned.length * 10, total: rounds * 10, percentage: rounds ? Math.round((earned.length / rounds) * 100) : 0, timeSeconds: Math.max(0, Math.round(((finishedAt || Date.now()) - (startedAt || Date.now())) / 1000)) })} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-black text-white hover:bg-emerald-700"><Trophy size={18}/> Lưu điểm cá nhân</button>}<button onClick={startGame} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-black text-white hover:bg-violet-700"><RotateCcw size={18}/> Chơi lại</button><button onClick={onBack} className="flex-1 rounded-xl border border-slate-200 px-5 py-3 font-black text-slate-700 hover:bg-slate-50">Quay về bài học</button></div><p className="mt-4 text-center text-xs leading-relaxed text-slate-400">{playMode === 'teams' ? 'Bảng điểm đội hiện được tính trên thiết bị đang chơi; chưa đồng bộ trực tiếp giữa nhiều thiết bị.' : `Thời gian: ${Math.max(0, Math.round(((finishedAt || Date.now()) - (startedAt || Date.now())) / 1000))} giây. Kết quả cá nhân được gửi qua hệ thống lưu điểm hiện có.`}</p></div></div>
      )}
    </div>
  );
}
