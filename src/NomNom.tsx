import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Volume2, RotateCcw, Trophy, Heart, Check, X, BookOpen, Languages, Keyboard, Sparkles, Share2 } from 'lucide-react';

type Term = {
  id?: string;
  term: string;
  meaning?: string;
  definition?: string;
  image?: string;
  imageUrl?: string;
};

type Props = {
  activeSet: { id?: string; name?: string; title?: string; terms?: Term[] };
  onBack: () => void;
  onFinish: (data: { mode: string; score: number; total: number; timeSeconds: number }) => void;
};

type PlayMode = 'meaning-to-word' | 'word-to-meaning' | 'spelling';
type Feedback = 'correct' | 'wrong' | '';

const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
const meaningOf = (term: Term) => (term.meaning || term.definition || '').trim();
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const MODE_INFO: { id: PlayMode; title: string; description: string; icon: typeof Languages }[] = [
  { id: 'meaning-to-word', title: 'Chọn từ tiếng Anh theo nghĩa', description: 'Đọc nghĩa tiếng Việt rồi chọn từ tiếng Anh phù hợp.', icon: Languages },
  { id: 'word-to-meaning', title: 'Chọn nghĩa của từ tiếng Anh', description: 'Xem từ tiếng Anh rồi chọn nghĩa chính xác.', icon: BookOpen },
  { id: 'spelling', title: 'Tự gõ từ tiếng Anh', description: 'Đọc nghĩa và tự viết từ tiếng Anh bằng bàn phím.', icon: Keyboard },
];

export default function NomNom({ activeSet, onBack, onFinish }: Props) {
  const terms = useMemo(() => {
    const seen = new Set<string>();
    return (activeSet?.terms || []).filter(t => {
      const key = normalize(t.term || '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [activeSet]);

  const [mode, setMode] = useState<PlayMode | null>(null);
  const [queue, setQueue] = useState<Term[]>([]);
  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(5);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [mastered, setMastered] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<Feedback>('');
  const [selected, setSelected] = useState('');
  const [ended, setEnded] = useState(false);
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [saved, setSaved] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const startGame = (selectedMode: PlayMode, retryWrong = false) => {
    const pool = retryWrong ? terms.filter(t => wrong.includes(t.term)) : shuffle(terms);
    setMode(selectedMode);
    setQueue(pool);
    setIndex(0);
    setLives(5);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setMastered([]);
    if (!retryWrong) setWrong([]);
    setInput('');
    setFeedback('');
    setSelected('');
    setEnded(false);
    setSaved(false);
    setStarted(true);
    setStartedAt(Date.now());
  };

  useEffect(() => {
    setMode(null);
    setQueue([]);
    setIndex(0);
    setLives(5);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setMastered([]);
    setWrong([]);
    setInput('');
    setFeedback('');
    setSelected('');
    setEnded(false);
    setStarted(false);
    setSaved(false);
  }, [activeSet?.id]);

  const current = queue[index];
  const maxScore = queue.length * 10;
  const progress = queue.length ? (Math.min(index + (feedback ? 1 : 0), queue.length) / queue.length) * 100 : 0;

  const choices = useMemo(() => {
    if (!current) return [];
    if (mode === 'meaning-to-word') {
      const distractors = terms.filter(t => normalize(t.term) !== normalize(current.term));
      return shuffle([current, ...shuffle(distractors).slice(0, Math.min(3, terms.length - 1))]);
    }
    if (mode === 'word-to-meaning') {
      const targetMeaning = normalize(meaningOf(current));
      const distractors = terms.filter(t => normalize(t.term) !== normalize(current.term) && normalize(meaningOf(t)) && normalize(meaningOf(t)) !== targetMeaning);
      const unique = new Map<string, Term>();
      for (const t of shuffle(distractors)) {
        const key = normalize(meaningOf(t));
        if (key && !unique.has(key)) unique.set(key, t);
      }
      return shuffle([current, ...Array.from(unique.values()).slice(0, Math.min(3, terms.length - 1))]);
    }
    return [];
  }, [current, mode, terms]);

  useEffect(() => {
    if (!ended || saved || !mode) return;
    onFinish({ mode: 'nomnom', score, total: maxScore, timeSeconds: Math.round((Date.now() - startedAt) / 1000) });
    setSaved(true);
  }, [ended, saved, onFinish, score, maxScore, startedAt, mode]);

  const speak = (word: string) => {
    if (!soundEnabled || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const shareResult = async () => {
    const text = `Nom Nom – ${activeSet.name || activeSet.title || 'Bộ từ vựng'}\nĐiểm: ${score}\nĐã thuộc: ${mastered.length}/${queue.length} từ\nCombo cao nhất: x${maxCombo}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Kết quả Nom Nom', text });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        window.alert('Đã sao chép kết quả để chia sẻ!');
      } else {
        window.prompt('Sao chép kết quả này:', text);
      }
    } catch {
      // Người dùng có thể đóng hộp thoại chia sẻ; không cần báo lỗi.
    }
  };

  const advance = (correct: boolean, chosenValue: string) => {
    if (!current || feedback || ended) return;
    setSelected(chosenValue);
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo(prev => Math.max(prev, nextCombo));
      setScore(prev => prev + 10);
      setMastered(prev => prev.includes(current.term) ? prev : [...prev, current.term]);
    } else {
      setCombo(0);
      setLives(prev => Math.max(0, prev - 1));
      setWrong(prev => prev.includes(current.term) ? prev : [...prev, current.term]);
    }

    window.setTimeout(() => {
      const nextLives = lives - (correct ? 0 : 1);
      const nextIndex = index + 1;
      setFeedback('');
      setSelected('');
      setInput('');
      if (nextLives <= 0 || nextIndex >= queue.length) {
        setEnded(true);
        return;
      }
      setIndex(nextIndex);
    }, 700);
  };

  const handleChoice = (term: Term) => {
    if (!current || !mode) return;
    const correct = mode === 'meaning-to-word'
      ? normalize(term.term) === normalize(current.term)
      : normalize(meaningOf(term)) !== '' && normalize(meaningOf(term)) === normalize(meaningOf(current));
    advance(correct, mode === 'meaning-to-word' ? term.term : meaningOf(term));
  };

  const handleSpelling = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!current) return;
    advance(normalize(input) === normalize(current.term), input);
  };

  if (!terms.length) {
    return <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><div className="mb-3 text-5xl">👾</div><h2 className="text-xl font-extrabold text-slate-800">Bộ từ vựng chưa có từ nào</h2><p className="mt-2 text-slate-500">Hãy thêm từ và nghĩa trước khi chơi Nom Nom nhé.</p><button onClick={onBack} className="mt-5 rounded-xl bg-violet-600 px-5 py-3 font-bold text-white">Quay lại menu</button></div>;
  }

  if (!started || !mode) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 text-slate-800">
        <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <button onClick={onBack} className="flex items-center gap-2 rounded-xl px-2 py-2 font-bold text-slate-500 hover:bg-slate-50"><ArrowLeft size={18} /> Quay lại</button>
          <div className="text-center sm:text-left"><p className="text-lg font-black">Nom Nom</p><p className="text-xs text-slate-500">{activeSet.name || activeSet.title || 'Bộ từ vựng'}</p></div>
          <span className="text-4xl">👾</span>
        </header>
        <section className="rounded-[28px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-5 sm:p-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-extrabold text-violet-700"><Sparkles size={16} /> Chọn cách chơi</div>
            <h2 className="text-3xl font-black sm:text-4xl">Nom muốn học từ nào?</h2>
            <p className="mt-3 text-slate-500">Chọn một chế độ chơi. Mỗi từ chỉ xuất hiện một lần trong lượt chơi này.</p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {MODE_INFO.map(({ id, title, description, icon: Icon }) => (
              <button key={id} onClick={() => startGame(id)} className="group flex min-h-52 flex-col items-center rounded-3xl border-2 border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:border-violet-400 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-violet-100">
                <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white"><Icon size={30} /></span>
                <span className="text-lg font-black">{title}</span>
                <span className="mt-2 text-sm leading-6 text-slate-500">{description}</span>
                <span className="mt-auto pt-4 text-sm font-extrabold text-violet-600">Chơi ngay →</span>
              </button>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">❤️ Bạn có 5 mạng. Mỗi câu đúng +10 điểm; trả lời sai sẽ mất một mạng.</p>
        </section>
      </div>
    );
  }

  if (ended || !current) {
    const finishedSuccessfully = lives > 0;
    const reviewedTerms = queue.length ? queue : terms;
    return (
      <div className="mx-auto max-w-6xl py-2 text-slate-800">
        <header className="mb-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <button onClick={onBack} className="flex items-center gap-2 rounded-xl px-2 py-2 font-bold text-slate-500 transition hover:bg-slate-50"><ArrowLeft size={18} /> Thoát</button>
          <div className="min-w-0 flex-1 px-3"><p className="text-lg font-black">Nom Nom</p><p className="truncate text-sm text-slate-500">{activeSet.name || activeSet.title || 'Bộ từ vựng'}</p></div>
          <div className="hidden items-center gap-1 sm:flex" aria-label={`${lives} mạng còn lại`}>{Array.from({ length: 5 }, (_, i) => <Heart key={i} size={20} fill={i < lives ? 'currentColor' : 'none'} className={i < lives ? 'text-rose-500' : 'text-slate-300'} />)}</div>
          <div className="ml-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-extrabold"><Trophy size={17} className="mr-1 inline text-slate-500" /><span className="text-slate-500">Điểm </span><span className="text-violet-600">{score}</span></div>
          <div className="hidden rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-bold sm:block"><span className="text-slate-500">Đã thuộc </span><span className="text-slate-900">{mastered.length}/{queue.length}</span></div>
        </header>

        <section className="grid items-start gap-5 lg:grid-cols-[minmax(220px,0.65fr)_minmax(0,1.6fr)]">
          <div className="flex flex-col items-center px-3 py-8 text-center lg:sticky lg:top-8">
            <div className={`mb-5 flex h-44 w-44 items-center justify-center rounded-full text-8xl sm:h-52 sm:w-52 ${finishedSuccessfully ? 'bg-emerald-50' : 'bg-rose-50'}`} aria-hidden="true">{finishedSuccessfully ? '👾🎉' : '👾😢'}</div>
            <p className="text-lg font-semibold italic text-slate-500">{finishedSuccessfully ? 'Nom no bụng rồi, cảm ơn bạn!' : 'Nom dỗi rồi, đi ăn chỗ khác đây...'}</p>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 sm:p-8">
            <div className="text-center">
              <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${finishedSuccessfully ? 'bg-amber-100 text-amber-500' : 'bg-rose-50 text-rose-500'}`}>
                {finishedSuccessfully ? <Trophy size={34} /> : <span className="text-3xl">☹</span>}
              </div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">{finishedSuccessfully ? 'Hoàn Thành Bài Học!' : 'Nom dỗi bỏ đi rồi'}</h2>
              <p className="mt-2 text-base text-slate-500 sm:text-lg">{finishedSuccessfully ? 'Kết quả của bạn đã được ghi nhận thành công.' : `Bạn đã trả lời đúng ${mastered.length}/${queue.length} từ. Ôn lại rồi thử tiếp nhé.`}</p>
              <p className="mt-3 inline-flex rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">{MODE_INFO.find(m => m.id === mode)?.title}</p>
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
              <div className="p-1 text-center"><p className="text-sm font-semibold text-slate-400">Điểm</p><p className="mt-1 text-2xl font-black text-violet-600 sm:text-3xl">{score}</p></div>
              <div className="p-1 text-center"><p className="text-sm font-semibold text-slate-400">Đã thuộc</p><p className="mt-1 text-2xl font-black text-emerald-600 sm:text-3xl">{mastered.length}<span className="text-base font-bold text-slate-400">/{queue.length}</span></p></div>
              <div className="p-1 text-center"><p className="text-sm font-semibold text-slate-400">Combo cao nhất</p><p className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl">×{maxCombo}</p></div>
            </div>

            <div className="mt-5 max-h-[330px] overflow-y-auto rounded-2xl border border-slate-200">
              {reviewedTerms.map(term => {
                const isMastered = mastered.includes(term.term);
                const isWrong = wrong.includes(term.term);
                return <div key={term.term} className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 last:border-b-0 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <button onClick={() => speak(term.term)} title="Nghe phát âm" className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-violet-50 hover:text-violet-600"><Volume2 size={20} /></button>
                    <div className="min-w-0"><p className="break-words font-extrabold text-slate-800">{term.term}</p><p className="mt-0.5 break-words text-sm text-slate-500">{meaningOf(term) || 'Chưa có nghĩa'}</p></div>
                  </div>
                  <span className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-bold sm:text-sm ${isMastered ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : isWrong ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>{isMastered ? 'Đã thuộc' : isWrong ? 'Cần ôn' : 'Chưa trả lời'}</span>
                </div>;
              })}
            </div>
            <p className="mt-4 text-center text-sm text-slate-500">Từ bạn trả lời sai sẽ được Nom gọi lại trong lần chơi sau.</p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <button onClick={() => { setStarted(false); setEnded(false); setMode(null); setQueue([]); setIndex(0); setFeedback(''); setSelected(''); }} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-300 bg-violet-100 px-5 py-3.5 font-extrabold text-violet-700 transition hover:bg-violet-200"><RotateCcw size={19} /> Thực đơn mới</button>
              {wrong.length > 0 && <button onClick={() => mode && startGame(mode, true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 font-extrabold text-slate-700 transition hover:bg-slate-100"><BookOpen size={19} /> Ôn lại {wrong.length} từ khó</button>}
              <button onClick={shareResult} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 font-extrabold text-slate-700 transition hover:bg-slate-100"><Share2 size={19} /> Chia sẻ</button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const isMeaningToWord = mode === 'meaning-to-word';
  const prompt = isMeaningToWord || mode === 'spelling' ? meaningOf(current) : current.term;

  return (
    <div className="mx-auto max-w-6xl space-y-4 text-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button onClick={() => { setStarted(false); setMode(null); }} className="flex items-center gap-2 rounded-xl px-2 py-2 font-bold text-slate-500 hover:bg-slate-50"><ArrowLeft size={18} /> Đổi chế độ</button>
        <div className="min-w-[130px] flex-1 text-center sm:text-left"><p className="text-lg font-black">Nom Nom</p><p className="text-xs text-slate-500">{activeSet.name || activeSet.title || 'Bộ từ vựng'} · {MODE_INFO.find(m => m.id === mode)?.title}</p></div>
        <button onClick={() => setSoundEnabled(v => !v)} className="rounded-full bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700">{soundEnabled ? '🔊 Âm thanh bật' : '🔇 Âm thanh tắt'}</button>
        <div className="flex items-center gap-1 rounded-full bg-rose-50 px-3 py-2 text-rose-500" aria-label={`${lives} mạng còn lại`}>{Array.from({ length: 5 }, (_, i) => <Heart key={i} size={17} fill={i < lives ? 'currentColor' : 'none'} className={i < lives ? '' : 'text-slate-300'} />)}</div>
        <div className="rounded-xl bg-amber-50 px-3 py-2 font-extrabold text-amber-700"><Trophy size={17} className="mr-1 inline" />{score}</div>
      </header>

      <div className="h-2.5 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-violet-500 transition-all duration-300" style={{ width: `${progress}%` }} /></div>

      <section className="rounded-[28px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-4 sm:p-7">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
          <div className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl text-7xl transition-transform sm:h-28 sm:w-28 ${feedback === 'correct' ? 'scale-105 bg-emerald-100' : feedback === 'wrong' ? 'animate-pulse bg-rose-100' : 'bg-violet-100'}`} aria-label="Nom, quái vật háu ăn">{feedback === 'correct' ? '👾😋' : feedback === 'wrong' ? '👾😵' : '👾'}</div>
          <div className="flex min-h-36 w-full flex-col justify-center rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-violet-700">Câu {index + 1}/{queue.length}</span><span className="text-xs font-semibold text-slate-400">{Math.round(progress)}% hoàn thành</span></div>
            <p className="mt-3 text-sm font-medium text-slate-500">{mode === 'meaning-to-word' ? 'Nom muốn ăn từ tiếng Anh nào?' : mode === 'word-to-meaning' ? 'Nghĩa của từ này là gì?' : 'Gõ từ tiếng Anh tương ứng với nghĩa này'}</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">{prompt || 'Từ này chưa có nghĩa'}</h2>
            {mode !== 'meaning-to-word' && <button onClick={() => speak(current.term)} className="mt-2 inline-flex items-center gap-2 self-start text-sm font-bold text-violet-600 hover:text-violet-800"><Volume2 size={17} /> Nghe phát âm</button>}
          </div>
        </div>

        {feedback && <div className={`mt-4 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-center font-extrabold ${feedback === 'correct' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{feedback === 'correct' ? <><Check size={19} /> Chính xác! Nom rất vui!</> : <><X size={19} /> Chưa đúng! Đáp án: {current.term}{meaningOf(current) ? ` — ${meaningOf(current)}` : ''}</>}</div>}

        {mode !== 'spelling' ? <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {choices.map((term, i) => {
            const label = isMeaningToWord ? term.term : meaningOf(term) || 'Chưa có nghĩa';
            const correctChoice = isMeaningToWord ? normalize(term.term) === normalize(current.term) : normalize(meaningOf(term)) !== '' && normalize(meaningOf(term)) === normalize(meaningOf(current));
            const chosen = selected === (isMeaningToWord ? term.term : meaningOf(term));
            const revealCorrect = !!feedback && correctChoice;
            const revealWrong = !!feedback && chosen && feedback === 'wrong';
            return <button key={`${term.term}-${i}`} disabled={!!feedback} onClick={() => handleChoice(term)} className={`relative min-h-20 rounded-2xl border-2 p-4 text-base font-extrabold transition sm:min-h-24 ${revealCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : revealWrong ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50'} disabled:cursor-default`}><span>{label}</span>{revealCorrect && <Check size={18} className="absolute right-3 top-3 text-emerald-600" />}{revealWrong && <X size={18} className="absolute right-3 top-3 text-rose-600" />}</button>;
          })}
        </div> : <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={handleSpelling}><input value={input} onChange={e => setInput(e.target.value)} disabled={!!feedback} autoComplete="off" placeholder="Gõ từ tiếng Anh..." className="min-w-0 flex-1 rounded-2xl border-2 border-slate-200 bg-white p-4 text-lg font-bold outline-none focus:border-violet-500"/><button type="submit" disabled={!input.trim() || !!feedback} className="rounded-2xl bg-violet-600 px-7 py-4 font-extrabold text-white transition hover:bg-violet-700 disabled:opacity-50">Kiểm tra</button></form>}
      </section>
      <p className="text-center text-sm text-slate-500">Mỗi từ xuất hiện một lần trong chế độ đã chọn. Trả lời đúng +10 điểm; sai sẽ mất một mạng.</p>
    </div>
  );
}
