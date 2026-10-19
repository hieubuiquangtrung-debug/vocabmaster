import { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { BookOpen, Plus, Copy, Pencil, Trash2, Share2, Eye, ArrowLeft, Save, CheckCircle2 } from 'lucide-react';

type Question = { id: string; type: string; prompt: string; options: string[]; answer: string; acceptedAnswers: string[]; explanation: string; hint: string; correctionRequired?: boolean };
type Pack = { id: string; title: string; stage: string; topic: string; recap: string; recapImageUrl: string; recapPdfUrl: string; recapLinks: string; questions: Question[]; status: 'draft'|'published'; updatedAt?: number };
const blankQuestion = (): Question => ({ id: crypto.randomUUID(), type: 'mcq', prompt: '', options: ['', '', '', ''], answer: '', acceptedAnswers: [], explanation: '', hint: '' });
const blankPack = (): Omit<Pack, 'id'> => ({ title: '', stage: 'Stage 1', topic: '', recap: '', recapImageUrl: '', recapPdfUrl: '', recapLinks: '', questions: [blankQuestion()], status: 'draft' });
const stages = ['Stage 1','Stage 2','Stage 3','Stage 4','Stage 5'];

export default function GrammarPractice({ db, appId, teacher = false, studentStages = [], studentCode = '', studentName = '', studentClass = '', onBack }: any) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [selectedPackId, setSelectedPackId] = useState('');
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStage, setFilterStage] = useState('All stages');
  const [filterStatus, setFilterStatus] = useState('all');
  const [notice, setNotice] = useState('');
  const [grammarResults, setGrammarResults] = useState<any[]>([]);
  const sharedLinkHandled = useRef(false);
  const packsRef = collection(db, 'artifacts', appId, 'public', 'data', 'grammar_packs');
  useEffect(() => {
    // Students query only published packs so Firestore Rules can safely allow published content.
    const packsQuery = teacher ? packsRef : query(packsRef, where('status', '==', 'published'));
    return onSnapshot(packsQuery, snap => setPacks(snap.docs.map(d => ({ ...(d.data() as any), id: d.id }))), err => { console.error('Grammar packs load error:', err); setNotice(`Không tải được Grammar Packs: ${err.code || err.message || 'Kiểm tra quyền Firestore.'}`); });
  }, [db, appId, teacher]);
  useEffect(() => { if (!teacher) return; return onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'grammar_results'), snap => setGrammarResults(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })).sort((a,b) => String(b.createdAt||'').localeCompare(String(a.createdAt||'')))), err => console.error('Grammar results load error', err)); }, [teacher, db, appId]);
  useEffect(() => {
  if (teacher || !studentCode.trim()) return;

  const loadStudentResults = async () => {
    try {
      const resultsQuery = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'grammar_results'),
        where('studentCode', '==', studentCode.trim())
      );

      const snapshot = await getDocs(resultsQuery);

      setGrammarResults(
        snapshot.docs
          .map(d => ({ id: d.id, ...(d.data() as any) }))
          .sort((a, b) =>
            String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
          )
      );
    } catch (error) {
      console.error('Student grammar history load error:', error);
      setNotice('Không tải được lịch sử làm bài. Vui lòng thử tải lại trang.');
    }
  };

  loadStudentResults();
}, [teacher, studentCode, db, appId]);
  const visiblePacks = useMemo(() => teacher ? packs.filter(p => (filterStage === 'All stages' || p.stage === filterStage) && (filterStatus === 'all' || p.status === filterStatus)) : packs.filter(p => p.status === 'published' && (studentStages || []).includes(p.stage)), [packs, teacher, filterStage, filterStatus, studentStages]);
  useEffect(() => { if (teacher || sharedLinkHandled.current) return; const sharedId = new URLSearchParams(window.location.search).get('grammar'); if (sharedId && visiblePacks.some(p => p.id === sharedId)) { setSelectedPackId(sharedId); sharedLinkHandled.current = true; } }, [visiblePacks, teacher]);
  const selected = visiblePacks.find(p => p.id === selectedPackId) || packs.find(p => p.id === selectedPackId);
  const beginNew = () => { setEditing({ ...blankPack(), id: '' }); setSelectedPackId(''); setNotice(''); };
  const beginEdit = (p: Pack) => { setEditing({ ...p, questions: (p.questions || []).map(q => ({ ...blankQuestion(), ...q, options: q.options || ['', '', '', ''], acceptedAnswers: q.acceptedAnswers || [] })) }); setNotice(''); };
  const savePack = async (publish?: boolean) => {
    if (!editing?.title?.trim() || !editing?.topic?.trim()) return setNotice('Vui lòng nhập tên bộ bài và Unit/Topic.');
    if (!(editing.questions || []).length || editing.questions.some((q: Question) => !q.prompt.trim() || !q.answer.trim())) return setNotice('Mỗi câu hỏi cần có nội dung và đáp án đúng.');
    if (editing.questions.some((q: Question) => q.type === 'mcq' && q.options.filter(Boolean).length < 3)) return setNotice('Câu Multiple choice cần ít nhất 3 lựa chọn.');
    if (editing.questions.some((q: Question) => q.type === 'findmistakes' && q.options.filter(Boolean).length !== 3)) return setNotice('Câu Find the mistakes cần đúng 3 lựa chọn.');
    setSaving(true);
    try {
      const { id: editingId, ...packFields } = editing;
      const payload = { ...packFields, title: editing.title.trim(), topic: editing.topic.trim(), status: publish ? 'published' : editing.status, updatedAt: Date.now(), questions: editing.questions.map((q: Question) => ({ ...q, options: q.type === 'mcq' ? q.options.slice(0,4) : q.options, acceptedAnswers: q.type === 'gapfill' ? [q.answer, ...(q.acceptedAnswers || [])].map((a: string) => a.trim()).filter(Boolean) : q.acceptedAnswers })) };
      if (editingId) await setDoc(doc(packsRef, editingId), payload); else { const ref = await addDoc(packsRef, payload); setSelectedPackId(ref.id); }
      setEditing(null); setNotice(publish ? 'Đã lưu và xuất bản bộ bài.' : 'Đã lưu bản nháp.');
    } catch (e) { console.error(e); setNotice('Lưu thất bại. Kiểm tra quyền Firestore và kết nối.'); } finally { setSaving(false); }
  };
  const duplicatePack = async (p: Pack, stage = p.stage) => {
    try { const { id, ...copy } = p; const ref = await addDoc(packsRef, { ...copy, stage, title: `${p.title} (Copy)`, status: 'draft', updatedAt: Date.now() }); setNotice(`Đã tạo bản sao độc lập cho ${stage}.`); setEditing({ ...copy, id: ref.id, stage, title: `${p.title} (Copy)`, status: 'draft' }); } catch (e) { console.error(e); setNotice('Không thể sao chép bộ bài.'); }
  };
  const removePack = async (p: Pack) => { if (!window.confirm(`Xóa bộ bài “${p.title}”?`)) return; try { await deleteDoc(doc(packsRef,p.id)); if (selectedPackId === p.id) setSelectedPackId(''); setNotice('Đã xóa bộ bài.'); } catch(e:any) { console.error('Grammar pack delete error:', e); setNotice(`Không thể xóa bộ bài (${e?.code || e?.message || 'lỗi không xác định'}). Kiểm tra quyền giáo viên trong Firestore Rules.`); } };
  const sharePack = async (p: Pack) => { const url = new URL(window.location.href); url.searchParams.set('grammar',p.id); url.searchParams.delete('set'); try { await navigator.clipboard.writeText(url.toString()); setNotice('Đã sao chép link bộ Grammar Practice.'); } catch { setNotice(url.toString()); } };
  const submitAnswers = async () => {
    if (!selected || !studentCode) { setNotice('Hãy xác nhận mã học sinh trước khi nộp bài.'); return; }
    const missingFalseCorrection = selected.questions.some(q => q.type === 'truefalse' && String(answers[q.id] || '').toLowerCase() === 'false' && !String(answers[`${q.id}_correction`] || '').trim());
    if (missingFalseCorrection) { setNotice('Với câu chọn False, em cần viết lại câu cho đúng trước khi nộp.'); return; }
    const details = selected.questions.map((q) => { const answer = String(answers[q.id] || '').trim(); const accepted = (q.type === 'gapfill' ? (q.acceptedAnswers || [q.answer]) : [q.answer]).map(x => String(x).trim().toLowerCase()); const auto = ['mcq','truefalse','gapfill'].includes(q.type); const correct = auto ? accepted.includes(answer.toLowerCase()) : null; return { questionId: q.id, prompt: q.prompt, studentAnswer: answer, correction: answers[`${q.id}_correction`] || answers[`${q.id}_rewrite`] || '', correctAnswer: q.answer, isCorrect: correct, explanation: q.explanation || '', type: q.type }; });
    const graded = details.filter(x => x.isCorrect !== null); const correct = graded.filter(x => x.isCorrect).length; const total = graded.length;
    setSaving(true);
    try { await addDoc(collection(db,'artifacts',appId,'public','data','grammar_results'), { packId:selected.id, packTitle:selected.title, stage:selected.stage, studentCode, studentName, studentClass, answers:details, score:correct, autoGradedTotal:total, percentage:total ? Math.round(correct/total*100) : null, requiresTeacherReview:details.some(x => x.isCorrect === null), createdAt:new Date().toISOString() }); setSubmitted(true); setNotice('Đã nộp bài và lưu kết quả. Các câu tự luận cần giáo viên xem lại.'); } catch(e:any) { console.error('Grammar result save error:', e); setNotice(`Chưa lưu được kết quả (${e?.code || e?.message || 'lỗi không xác định'}). Em có thể thử nộp lại; câu trả lời vẫn được giữ.`); } finally { setSaving(false); }
  };
  const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400';
  if (selected && !teacher) return <section className="space-y-5 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center justify-between gap-3"><button onClick={() => {sharedLinkHandled.current = true; const url = new URL(window.location.href); url.searchParams.delete('grammar'); window.history.replaceState({}, '', url.toString()); setSelectedPackId('');setAnswers({});setSubmitted(false);setNotice('');}} className="inline-flex items-center gap-2 text-sm font-bold text-violet-700"><ArrowLeft size={16}/> Danh sách bài</button><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{selected.stage}</span></div><div><h2 className="text-2xl font-black text-slate-800">{selected.title}</h2><p className="mt-1 text-sm text-slate-500">{selected.topic}</p></div>
    {(selected.recap || selected.recapImageUrl || selected.recapPdfUrl || selected.recapLinks) && <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4"><h3 className="mb-2 font-extrabold text-sky-900">📘 Language Recap</h3><div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{selected.recap}</div>{selected.recapImageUrl && <img src={selected.recapImageUrl} alt="Language recap" className="mt-3 max-h-96 rounded-xl object-contain"/>}{selected.recapPdfUrl && <a className="mt-3 block font-bold text-violet-700 underline" href={selected.recapPdfUrl} target="_blank" rel="noreferrer">Mở / tải PDF tài liệu</a>}{selected.recapLinks && selected.recapLinks.split('\n').filter(Boolean).map((url,i)=><a key={i} href={url} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-sky-700 underline">Tài liệu tham khảo {i+1}: {url}</a>)}</div>}
    {selected.questions.map((q,i)=><div key={q.id} className="rounded-2xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wide text-violet-600">Question {i+1} · {({mcq:'Multiple choice',truefalse:'True / False',findmistakes:'Find the mistakes',gapfill:'Gap-fill',correction:'Written correction'} as any)[q.type] || q.type}</p><p className="mt-2 font-bold text-slate-800">{q.prompt}</p>{q.hint && !submitted && <p className="mt-2 text-sm text-amber-700">💡 Hint: {q.hint}</p>}{q.type === 'mcq' ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{q.options.filter(Boolean).map((opt,j)=><button key={j} disabled={submitted} onClick={()=>setAnswers(a=>({...a,[q.id]:opt}))} className={`rounded-xl border p-3 text-left text-sm ${answers[q.id]===opt?'border-violet-500 bg-violet-50':'border-slate-200 hover:bg-slate-50'}`}>{String.fromCharCode(65+j)}. {opt}</button>)}</div> : q.type === 'truefalse' ? <><div className="mt-3 flex gap-2">{['True','False'].map(v=><button key={v} disabled={submitted} onClick={()=>setAnswers(a=>({...a,[q.id]:v}))} className={`rounded-xl border px-5 py-2 ${answers[q.id]===v?'border-violet-500 bg-violet-50':'border-slate-200'}`}>{v}</button>)}</div>{answers[q.id]==='False' && <label className="mt-3 block text-sm font-semibold">Correct the false sentence<textarea disabled={submitted} className={`${field} mt-1`} rows={2} value={answers[`${q.id}_correction`]||''} onChange={e=>setAnswers(a=>({...a,[`${q.id}_correction`]:e.target.value}))} placeholder="Write the correct sentence…"/></label>}</> : q.type === 'findmistakes' ? <><div className="mt-3 grid gap-2 sm:grid-cols-3">{q.options.filter(Boolean).map((opt,j)=><button key={j} disabled={submitted} onClick={()=>setAnswers(a=>({...a,[q.id]:`Option ${String.fromCharCode(65+j)}: ${opt}`}))} className={`rounded-xl border p-3 text-left text-sm ${answers[q.id]===`Option ${String.fromCharCode(65+j)}: ${opt}`?'border-violet-500 bg-violet-50':'border-slate-200'}`}>{String.fromCharCode(65+j)}. {opt}</button>)}</div><label className="mt-3 block text-sm font-semibold">Rewrite the sentence correctly<textarea disabled={submitted} className={`${field} mt-1`} rows={2} value={(answers[`${q.id}_rewrite`]||'')} onChange={e=>setAnswers(a=>({...a,[`${q.id}_rewrite`]:e.target.value}))}/></label></> : <textarea disabled={submitted} className={`${field} mt-3`} rows={2} placeholder={q.type==='gapfill'?'Type the missing word or phrase…':'Write your correction…'} value={answers[q.id]||''} onChange={e=>setAnswers(a=>({...a,[q.id]:e.target.value}))}/>}{submitted && <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm"><p><b>Your answer:</b> {answers[q.id] || 'No answer'}{q.type==='findmistakes' && answers[`${q.id}_rewrite`] ? ` — Correction: ${answers[`${q.id}_rewrite`]}`:''}</p>{['mcq','truefalse','gapfill'].includes(q.type) ? <p className={((q.type==='gapfill'?(q.acceptedAnswers||[q.answer]):[q.answer]).some(a=>a.toLowerCase()===String(answers[q.id]||'').trim().toLowerCase()))?'text-emerald-700':'text-rose-700'}><b>Correct answer:</b> {q.answer}</p> : <p className="text-amber-700">Câu trả lời cần giáo viên xem lại.</p>}{q.explanation && <p className="mt-1">{q.explanation}</p>}</div>}</div>)}{!submitted ? <button disabled={saving} onClick={submitAnswers} className="rounded-xl bg-violet-600 px-5 py-3 font-bold text-white hover:bg-violet-700">{saving ? 'Đang lưu kết quả…' : 'Nộp bài'}</button> : <div className="rounded-2xl bg-emerald-50 p-4 font-bold text-emerald-800">Đã hoàn thành phần luyện tập. Điểm tự chấm: {selected.questions.filter(q=>['mcq','truefalse','gapfill'].includes(q.type)).length ? Math.round(selected.questions.filter(q=>['mcq','truefalse','gapfill'].includes(q.type) && (q.type==='gapfill'?(q.acceptedAnswers||[q.answer]):[q.answer]).some(a=>a.toLowerCase()===String(answers[q.id]||'').trim().toLowerCase())).length / selected.questions.filter(q=>['mcq','truefalse','gapfill'].includes(q.type)).length*100):'—'}% (chưa tính câu cần giáo viên chấm).</div>}{notice && <p className="text-sm text-slate-500">{notice}</p>}</section>;
  if (!teacher && !selectedPackId) return (
    <section className="relative isolate space-y-6 overflow-hidden rounded-[2rem] border border-violet-100 bg-white p-4 shadow-xl shadow-violet-100/60 sm:p-7">
      <div className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-500 p-5 text-white shadow-lg shadow-violet-200 sm:p-7">
        <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-12 right-24 h-28 w-28 rounded-full bg-pink-300/20" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-3xl shadow-inner ring-1 ring-white/30">✏️</div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-violet-100">THINK · PRACTISE · SHINE</p>
            <h2 className="mt-1 text-2xl font-black sm:text-3xl">Grammar Adventure! 🌈</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/90">Chọn thử thách phù hợp với Stage của em, luyện từng câu và tiến bộ mỗi ngày nhé!</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-white/20 px-3 py-1.5 ring-1 ring-white/20">🎯 Luyện tập</span>
              <span className="rounded-full bg-white/20 px-3 py-1.5 ring-1 ring-white/20">⭐ Chinh phục ngữ pháp</span>
              <span className="rounded-full bg-white/20 px-3 py-1.5 ring-1 ring-white/20">🏆 Theo dõi tiến bộ</span>
            </div>
          </div>
        </div>
      </div>

      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-extrabold text-violet-700 transition hover:bg-violet-100"
        >
          <ArrowLeft size={16} />
          Quay lại
        </button>
      )}

      {/* 1. Danh sách bài luyện tập */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-800 sm:text-2xl">🚀 Chọn thử thách của em</h3>
            <p className="mt-1 text-sm text-slate-500">Mỗi bài là một bước tiến mới!</p>
          </div>
          <span className="shrink-0 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-700">
            {visiblePacks.length} bài
          </span>
        </div>

        {studentStages.length === 0 ? (
          <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Tài khoản này chưa được gán Stage. Hãy nhờ giáo viên cập nhật danh sách học sinh.
          </div>
        ) : null}

        {visiblePacks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <BookOpen className="mx-auto mb-3 text-violet-300" size={36} />
            <p className="font-bold text-slate-700">Chưa có bài luyện tập.</p>
            <p className="mt-1 text-sm text-slate-500">
              Giáo viên sẽ thêm bài phù hợp với Stage của em tại đây.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visiblePacks.map((p, index) => {
              const themes = [
                { card: 'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 hover:border-violet-400', badge: 'bg-violet-100 text-violet-700', icon: 'bg-violet-100 text-violet-700', button: 'bg-violet-600 hover:bg-violet-700' },
                { card: 'border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 hover:border-sky-400', badge: 'bg-sky-100 text-sky-700', icon: 'bg-sky-100 text-sky-700', button: 'bg-sky-600 hover:bg-sky-700' },
                { card: 'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 hover:border-amber-400', badge: 'bg-amber-100 text-amber-800', icon: 'bg-amber-100 text-amber-700', button: 'bg-orange-500 hover:bg-orange-600' },
                { card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 hover:border-emerald-400', badge: 'bg-emerald-100 text-emerald-700', icon: 'bg-emerald-100 text-emerald-700', button: 'bg-emerald-600 hover:bg-emerald-700' },
              ];
              const theme = themes[index % themes.length];
              return <article
                key={p.id}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:p-5 ${theme.card}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-extrabold ${theme.badge}`}>
                    {p.stage}
                  </span>
                  <span className="text-xs text-slate-400">{p.questions?.length || 0} câu hỏi</span>
                </div>
                <div className={`mt-4 flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${theme.icon}`}>{['🧩', '🚀', '🌟', '🎯'][index % 4]}</div>
                <h4 className="mt-3 text-lg font-black text-slate-800">{p.title}</h4>
                <p className="mt-1 flex-1 text-sm leading-5 text-slate-500">{p.topic}</p>
                <button
                  onClick={() => {
                    setSelectedPackId(p.id);
                    setAnswers({});
                    setSubmitted(false);
                    setNotice('');
                  }}
                  className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-extrabold text-white shadow-sm transition ${theme.button}`}
                >
                  <BookOpen size={17} />
                  Bắt đầu luyện tập <ArrowLeft size={16} className="rotate-180" />
                </button>
              </article>;
            })}
          </div>
        )}
      </div>

      {/* 2. Lịch sử làm bài - thu gọn mặc định */}
      <details className="group rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-fuchsia-50/80 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl p-4 transition hover:bg-slate-100 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <BookOpen size={22} />
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-slate-800">Lịch sử làm bài</h3>
              <p className="mt-1 text-sm text-slate-500">
                {grammarResults.length > 0
                  ? `${grammarResults.length} lần làm bài · Nhấn để xem`
                  : 'Xem lại kết quả sau khi luyện tập'}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-sm font-bold text-violet-700 group-open:hidden">Xem lịch sử ↓</span>
          <span className="hidden shrink-0 text-sm font-bold text-violet-700 group-open:inline">Thu gọn ↑</span>
        </summary>

        <div className="space-y-3 border-t border-slate-200 p-3 sm:p-4">
          {grammarResults.length === 0 ? (
            <p className="rounded-xl bg-white p-4 text-sm text-slate-500">
              Chưa có kết quả. Sau khi hoàn thành bài Grammar Practice, kết quả sẽ xuất hiện tại đây.
            </p>
          ) : (
            grammarResults.map(result => (
              <article key={result.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-800">{result.packTitle || 'Grammar Practice'}</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      {result.stage || '—'} ·{' '}
                      {result.createdAt ? new Date(result.createdAt).toLocaleString('vi-VN') : 'Không rõ ngày làm'}
                    </p>
                    {result.requiresTeacherReview && (
                      <p className="mt-1 text-xs text-amber-700">Một số câu cần giáo viên chấm.</p>
                    )}
                  </div>
                  <div className="shrink-0 sm:text-right">
                    <p className="text-xs text-slate-500">Điểm tự chấm</p>
                    <p className="text-xl font-black text-violet-700">
                      {result.percentage == null ? '—' : `${result.percentage}%`}
                    </p>
                  </div>
                </div>

                <details className="mt-3 border-t border-slate-100 pt-3">
                  <summary className="cursor-pointer text-sm font-bold text-violet-700">Xem chi tiết câu trả lời</summary>
                  <div className="mt-3 space-y-3">
                    {(result.answers || []).map((answer: any, index: number) => (
                      <div
                        key={`${result.id}-${answer.questionId || index}`}
                        className="rounded-lg bg-slate-50 p-3 text-sm"
                      >
                        <p className="font-semibold">Câu {index + 1}: {answer.prompt}</p>
                        <p className="mt-1">Câu trả lời của em: {answer.studentAnswer || 'Chưa trả lời'}</p>
                        {answer.correction && <p>Phần sửa câu: {answer.correction}</p>}
                        <p>Đáp án: {answer.correctAnswer || 'Giáo viên chấm'}</p>
                        {answer.isCorrect === true && <p className="text-emerald-700">Đúng</p>}
                        {answer.isCorrect === false && <p className="text-rose-700">Chưa đúng</p>}
                        {answer.explanation && <p className="mt-1 text-slate-600">Giải thích: {answer.explanation}</p>}
                      </div>
                    ))}
                  </div>
                </details>
              </article>
            ))
          )}
        </div>
      </details>
    </section>
  );

  if (teacher && editing) return <section className="space-y-5 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-black text-slate-800">{editing.id?'Chỉnh sửa Grammar Pack':'Tạo Grammar Pack'}</h2><p className="text-sm text-slate-500">Thông tin, tài liệu ôn tập và câu hỏi</p></div><button onClick={()=>setEditing(null)} className="text-sm font-bold text-slate-500">Đóng</button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Tên bộ bài<input className={`${field} mt-1`} value={editing.title} onChange={e=>setEditing((p:any)=>({...p,title:e.target.value}))} placeholder="e.g. Past Simple Practice"/></label><label className="text-sm font-bold">Stage<select className={`${field} mt-1`} value={editing.stage} onChange={e=>setEditing((p:any)=>({...p,stage:e.target.value}))}>{stages.map(s=><option key={s}>{s}</option>)}</select></label><label className="text-sm font-bold sm:col-span-2">Unit / Topic<input className={`${field} mt-1`} value={editing.topic} onChange={e=>setEditing((p:any)=>({...p,topic:e.target.value}))} placeholder="Unit 2 · Past Simple"/></label></div><div className="rounded-2xl bg-sky-50 p-4"><h3 className="mb-3 font-extrabold text-sky-900">📘 Language Recap</h3><label className="block text-sm font-bold">Nội dung ôn tập (hỗ trợ xuống dòng)<textarea className={`${field} mt-1`} rows={5} value={editing.recap} onChange={e=>setEditing((p:any)=>({...p,recap:e.target.value}))} placeholder="Grammar rules, examples, notes…"/></label><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Link ảnh JPG / PNG / WebP<input className={`${field} mt-1`} value={editing.recapImageUrl} onChange={e=>setEditing((p:any)=>({...p,recapImageUrl:e.target.value}))} placeholder="https://…"/></label><label className="text-sm font-bold">Link PDF<input className={`${field} mt-1`} value={editing.recapPdfUrl} onChange={e=>setEditing((p:any)=>({...p,recapPdfUrl:e.target.value}))} placeholder="https://…pdf"/></label></div><label className="mt-3 block text-sm font-bold">Link tài liệu ngoài (mỗi link một dòng)<textarea className={`${field} mt-1`} rows={2} value={editing.recapLinks} onChange={e=>setEditing((p:any)=>({...p,recapLinks:e.target.value}))} placeholder="https://…"/></label></div><div className="flex items-center justify-between"><h3 className="text-lg font-black">Questions ({editing.questions.length})</h3><button onClick={()=>setEditing((p:any)=>({...p,questions:[...p.questions,blankQuestion()]}))} className="inline-flex items-center gap-1 rounded-xl bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700"><Plus size={16}/> Thêm câu</button></div>{editing.questions.map((q:Question,i:number)=><div key={q.id} className="space-y-3 rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between"><b>Question {i+1}</b><button onClick={()=>setEditing((p:any)=>({...p,questions:p.questions.filter((x:Question)=>x.id!==q.id)}))} className="text-rose-600"><Trash2 size={16}/></button></div><select className={field} value={q.type} onChange={e=>setEditing((p:any)=>({...p,questions:p.questions.map((x:Question)=>x.id===q.id?{...x,type:e.target.value}:x)}))}><option value="mcq">Multiple choice (3–4 options)</option><option value="truefalse">True / False</option><option value="findmistakes">Find the mistakes (choose + rewrite)</option><option value="gapfill">Gap-fill (multiple accepted answers)</option><option value="correction">Written correction (teacher review)</option></select><textarea className={field} rows={2} value={q.prompt} onChange={e=>setEditing((p:any)=>({...p,questions:p.questions.map((x:Question)=>x.id===q.id?{...x,prompt:e.target.value}:x)}))} placeholder="Question / sentence"/><div className="grid gap-2 sm:grid-cols-2">{(q.type==='mcq'||q.type==='findmistakes') && q.options.map((opt,j)=><input key={j} className={field} value={opt} onChange={e=>setEditing((p:any)=>({...p,questions:p.questions.map((x:Question)=>x.id===q.id?{...x,options:x.options.map((v,k)=>k===j?e.target.value:v)}:x)}))} placeholder={`Option ${String.fromCharCode(65+j)}${q.type==='findmistakes'&&j===3?' (optional)':''}`}/>)}</div><div className="grid gap-2 sm:grid-cols-2"><label className="text-sm font-bold">Đáp án đúng<input className={`${field} mt-1`} value={q.answer} onChange={e=>setEditing((p:any)=>({...p,questions:p.questions.map((x:Question)=>x.id===q.id?{...x,answer:e.target.value}:x)}))} placeholder={q.type==='truefalse'?'True or False':'Answer / wrong option'}/></label>{q.type==='gapfill' && <label className="text-sm font-bold">Đáp án chấp nhận thêm<input className={`${field} mt-1`} value={(q.acceptedAnswers||[]).join(' | ')} onChange={e=>setEditing((p:any)=>({...p,questions:p.questions.map((x:Question)=>x.id===q.id?{...x,acceptedAnswers:e.target.value.split('|').map(v=>v.trim()).filter(Boolean)}:x)}))} placeholder="colour | color"/></label>}</div><input className={field} value={q.hint} onChange={e=>setEditing((p:any)=>({...p,questions:p.questions.map((x:Question)=>x.id===q.id?{...x,hint:e.target.value}:x)}))} placeholder="Hint (optional)"/><textarea className={field} rows={2} value={q.explanation} onChange={e=>setEditing((p:any)=>({...p,questions:p.questions.map((x:Question)=>x.id===q.id?{...x,explanation:e.target.value}:x)}))} placeholder="Explanation / feedback (optional)"/></div>)}<div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4"><button disabled={saving} onClick={()=>savePack(false)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 font-bold"><Save size={16}/> Lưu bản nháp</button><button disabled={saving} onClick={()=>savePack(true)} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 font-bold text-white"><CheckCircle2 size={16}/> Lưu & xuất bản</button><button onClick={()=>setEditing(null)} className="rounded-xl px-4 py-2.5 font-bold text-slate-500">Hủy</button></div>{notice&&<p className="text-sm text-slate-600">{notice}</p>}</section>;
  return <section className="space-y-5 rounded-3xl border border-violet-100 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-extrabold uppercase tracking-widest text-violet-600">VocabMaster · Grammar Studio</div><h2 className="mt-1 text-2xl font-black text-slate-800">{teacher?'Quản lý Grammar Practice':'Grammar Practice'}</h2><p className="mt-1 text-sm text-slate-500">{teacher?'Tạo bộ bài theo Stage, thêm Language Recap và quản lý xuất bản.':'Chọn bộ bài ngữ pháp theo Stage được phân công.'}</p></div>{teacher ? <button onClick={beginNew} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-bold text-white"><Plus size={17}/> Tạo Grammar Pack</button> : onBack && <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"><ArrowLeft size={16}/> Quay lại</button>}</div>{notice && <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-800">{notice}</p>}{teacher && <div className="flex flex-wrap gap-3"><select className={`${field} max-w-xs`} value={filterStage} onChange={e=>setFilterStage(e.target.value)}><option>All stages</option>{stages.map(s=><option key={s}>{s}</option>)}</select><select className={`${field} max-w-xs`} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option></select></div>}{!teacher && studentStages.length===0 && <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Tài khoản này chưa được gán Stage. Hãy nhờ giáo viên cập nhật danh sách học sinh.</div>}<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visiblePacks.map(p=><article key={p.id} className="rounded-2xl border border-slate-200 p-5 transition hover:border-violet-300 hover:shadow-sm"><div className="flex items-start justify-between gap-2"><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-extrabold text-violet-700">{p.stage}</span>{teacher&&<span className={`rounded-full px-2 py-1 text-xs font-bold ${p.status==='published'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{p.status==='published'?'Published':'Draft'}</span>}</div><h3 className="mt-3 text-lg font-black text-slate-800">{p.title}</h3><p className="mt-1 text-sm text-slate-500">{p.topic}</p><p className="mt-3 text-xs text-slate-400">{p.questions?.length||0} câu hỏi · Cập nhật {p.updatedAt?new Date(p.updatedAt).toLocaleDateString('vi-VN'):'—'}</p><div className="mt-4 flex flex-wrap gap-2">{teacher?<><button onClick={()=>beginEdit(p)} className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-3 py-2 text-sm font-bold text-violet-700"><Pencil size={14}/> Sửa</button><button onClick={()=>duplicatePack(p)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold"><Copy size={14}/> Nhân bản</button><button onClick={()=>sharePack(p)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold"><Share2 size={14}/> Link</button><button onClick={()=>removePack(p)} className="rounded-lg px-2 py-2 text-rose-600" title="Xóa"><Trash2 size={15}/></button>{p.status==='published'&&<button onClick={()=>setDoc(doc(packsRef,p.id),{...p,status:'draft',updatedAt:Date.now()})} className="rounded-lg border px-3 py-2 text-sm font-bold">Unpublish</button>}</>:<button onClick={()=>{setSelectedPackId(p.id);setAnswers({});setSubmitted(false);setNotice('');}} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 font-bold text-white"><Eye size={16}/> Mở bài luyện tập</button>}</div></article>)}</div>{visiblePacks.length===0&&<div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center"><BookOpen className="mx-auto mb-3 text-violet-300" size={36}/><p className="font-bold text-slate-700">{teacher?'Chưa có Grammar Pack phù hợp.':'Chưa có bài Grammar Practice được xuất bản cho Stage của em.'}</p><p className="mt-1 text-sm text-slate-500">{teacher?'Tạo bộ bài đầu tiên để bắt đầu.':'Giáo viên sẽ thêm bài luyện tập tại đây.'}</p></div>}{teacher && <div className="mt-8 rounded-2xl border border-slate-200 p-5"><h3 className="text-lg font-black text-slate-800">Kết quả Grammar Practice</h3><p className="mt-1 text-sm text-slate-500">{grammarResults.length} lượt nộp bài · câu tự luận được đánh dấu cần xem lại</p>{grammarResults.length===0?<p className="mt-4 text-sm text-slate-500">Chưa có học sinh nộp bài.</p>:<div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-2">Học sinh</th><th className="p-2">Stage</th><th className="p-2">Bộ bài</th><th className="p-2">Điểm tự chấm</th><th className="p-2">Ngày nộp</th><th className="p-2">Ghi chú</th></tr></thead><tbody>{grammarResults.map(r=><tr key={r.id} className="border-b border-slate-100"><td className="p-2 font-semibold">{r.studentName||r.studentCode||'—'}</td><td className="p-2">{r.stage}</td><td className="p-2">{r.packTitle}</td><td className="p-2">{r.percentage==null?'—':`${r.percentage}%`}</td><td className="p-2">{r.createdAt?new Date(r.createdAt).toLocaleDateString('vi-VN'):'—'}</td><td className="p-2">{r.requiresTeacherReview?'Cần chấm tự luận':'Đã tự chấm'}</td></tr>)}</tbody></table></div>}</div>}</section>;
}
