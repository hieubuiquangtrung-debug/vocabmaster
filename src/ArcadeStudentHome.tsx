import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, BookOpen, Brain, Gamepad2, Rocket, ShieldCheck, Sparkles, Star, Target, CheckCircle2, Circle, Compass, Layers3 } from 'lucide-react';
import './arcade.css';
import { ArcadePlayerHub } from './ArcadeRewards';

type ArcadeStudentHomeProps = {
  studentName: string;
  studentClass: string;
  isStudentVerified: boolean;
  onVocabulary: () => void;
  onGrammar: () => void;
  verification: ReactNode;
  studentCode?: string;
  availableSetCount?: number;
  activeSetTitle?: string;
};

const DAILY_GOALS = [
  { id: 'flashcards', emoji: '🃏', label: 'Ôn lại từ bằng Flashcards' },
  { id: 'quiz', emoji: '📝', label: 'Luyện một lượt Quiz' },
  { id: 'grammar', emoji: '🧠', label: 'Ôn một chủ điểm Grammar' },
] as const;
const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
export default function ArcadeStudentHome({studentName, studentClass, isStudentVerified, onVocabulary, onGrammar, verification, studentCode, availableSetCount, activeSetTitle}: ArcadeStudentHomeProps) {
  const [launch, setLaunch] = useState<'vocabulary' | 'grammar' | null>(null);
  const [surprise, setSurprise] = useState(false);
  const [goals, setGoals] = useState<string[]>([]);
  const goalsKey = isStudentVerified && studentCode?.trim()
    ? `vm_arcade_daily_v1_${encodeURIComponent(studentCode.trim())}_${localDate()}` : null;
  useEffect(() => {
    if (!goalsKey) { setGoals([]); return; }
    try {
      const value: unknown = JSON.parse(localStorage.getItem(goalsKey) || '[]');
      setGoals(Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && DAILY_GOALS.some(g => g.id === v)) : []);
    } catch { setGoals([]); }
  }, [goalsKey]);
  const toggleGoal = (id: string) => {
    if (!goalsKey) return;
    setGoals(prev => {
      const next = prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id];
      try { localStorage.setItem(goalsKey, JSON.stringify(next)); } catch { /* Storage can be unavailable */ }
      return next;
    });
  };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const enter = (destination: 'vocabulary' | 'grammar') => {
    if (launch) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) { (destination === 'vocabulary' ? onVocabulary : onGrammar)(); return; }
    setLaunch(destination);
    timer.current = setTimeout(() => {
      timer.current = null;
      (destination === 'vocabulary' ? onVocabulary : onGrammar)();
      setLaunch(null);
    }, 480);
  };
  return <div className={`vm-arcade space-y-6${launch ? ' vm-arcade-launching' : ''}`}>
    <section className="vm-arcade-hero" aria-labelledby="vm-arcade-title">
      <div className="vm-arcade-spark vm-arcade-spark-one" aria-hidden="true">✦</div>
      <div className="vm-arcade-spark vm-arcade-spark-two" aria-hidden="true">✧</div>
      <div className="vm-arcade-spark vm-arcade-spark-three" aria-hidden="true">✦</div>
      <div className="vm-arcade-meteor vm-arcade-meteor-one" aria-hidden="true" />
      <div className="vm-arcade-meteor vm-arcade-meteor-two" aria-hidden="true" />
      <div className="vm-arcade-hero-content">
        <span className="vm-arcade-eyebrow"><Gamepad2 size={17}/> VOCABMASTER · GAME ARCADE</span>
        <p className="vm-arcade-kicker">READY, PLAYER ONE?</p>
        <h2 id="vm-arcade-title" className="vm-arcade-title">Học tiếng Anh.<span>Chơi thật vui!</span></h2>
        <p className="vm-arcade-intro">Xin chào, <strong>{isStudentVerified ? studentName : 'nhà thám hiểm nhỏ'}</strong>! Hãy khám phá từ vựng, chinh phục ngữ pháp và mở khóa những thử thách thú vị.</p>
        <div className="vm-arcade-profile">
          <span><Star size={16} aria-hidden="true"/> {isStudentVerified ? studentName : 'Chưa xác nhận'}</span>
          <span><ShieldCheck size={16} aria-hidden="true"/> {isStudentVerified ? studentClass : 'Nhập mã học sinh để bắt đầu'}</span>
        </div>
      </div>
      <div className="vm-emoji-scene" aria-label="Vũ trụ tương tác">
        <div className="vm-emoji-orbit-track vm-emoji-orbit-track-outer">
          <span className="vm-emoji-orbit-path" />
          <button type="button" className="vm-emoji-orbit-node vm-emoji-orbit-node-planet" onClick={() => enter('vocabulary')} title="Đến Vocabulary Practice" aria-label="Đến Vocabulary Practice"><span>🪐</span></button>
          <span className="vm-emoji-orbit-node vm-emoji-orbit-node-ufo" aria-hidden="true"><span>🛸</span></span>
          <span className="vm-emoji-orbit-node vm-emoji-orbit-node-gem" aria-hidden="true"><span>💎</span></span>
        </div>
        <div className="vm-emoji-orbit-track vm-emoji-orbit-track-inner">
          <span className="vm-emoji-orbit-path" />
          <button type="button" className="vm-emoji-orbit-node vm-emoji-orbit-node-star" onClick={() => enter('grammar')} title="Đến Grammar Practice" aria-label="Đến Grammar Practice"><span>🌟</span></button>
          <span className="vm-emoji-orbit-node vm-emoji-orbit-node-game" aria-hidden="true"><span>🎮</span></span>
        </div>
        <button type="button" className="vm-emoji-orbit-center" onClick={() => setSurprise(v => !v)} title="Chạm vào tên lửa!" aria-label="Chạm vào tên lửa để nhận lời chào">🚀</button>
        {surprise && <div className="vm-arcade-rocket-message" role="status">✨ Ready for adventure? ✨</div>}
        <span className="vm-emoji-scene-spark vm-emoji-scene-spark-a">✨</span>
        <span className="vm-emoji-scene-spark vm-emoji-scene-spark-b">✦</span>
      </div>
    </section>

    {!isStudentVerified && <section className="vm-arcade-verify" aria-label="Xác nhận học sinh">{verification}</section>}
    {isStudentVerified && <div className="vm-arcade-ready"><Sparkles size={19} aria-hidden="true"/><div><strong>Đã sẵn sàng!</strong><p>Chọn một khu vực bên dưới để bắt đầu hành trình học tập.</p></div></div>}

    <div className="vm-arcade-section-heading"><div><span className="vm-arcade-label">CHOOSE YOUR ADVENTURE</span><h3>Bạn muốn chơi gì hôm nay?</h3></div><span className="vm-arcade-counter">2 khu vực</span></div>
    <section className="vm-arcade-cards" aria-label="Chọn hoạt động học tập">
      <article className="vm-arcade-card vm-arcade-card-vocab"><div className="vm-arcade-card-art vm-arcade-card-art-vocab" aria-hidden="true"><span className="vm-arcade-illustration-main">📚</span><span>✨</span><i className="vm-arcade-card-mini vm-arcade-card-mini-a">🔤</i><i className="vm-arcade-card-mini vm-arcade-card-mini-b">⭐</i></div><span className="vm-arcade-card-tag"><BookOpen size={15}/> WORD EXPLORER</span><h4>Vocabulary<br/>Practice</h4><p>Flashcards, Quiz, Matching, Spelling và các trò chơi NomNom, Treasure Hunt, Word Café.</p><div className="vm-arcade-pills"><span>🃏 Flashcards</span><span>🧩 Matching</span><span>👾 Mini Games</span></div><button type="button" onClick={() => enter('vocabulary')} className="vm-arcade-button vm-arcade-button-purple">Khám phá từ vựng <ArrowRight size={20}/></button></article>
      <article className="vm-arcade-card vm-arcade-card-grammar"><div className="vm-arcade-card-art vm-arcade-card-art-grammar" aria-hidden="true"><span className="vm-arcade-illustration-main">🧠</span><span>⚡</span><i className="vm-arcade-card-mini vm-arcade-card-mini-a">📝</i><i className="vm-arcade-card-mini vm-arcade-card-mini-b">💡</i></div><span className="vm-arcade-card-tag"><Brain size={15}/> GRAMMAR HERO</span><h4>Grammar<br/>Practice</h4><p>Học Language Recap, luyện tập cấu trúc và thử sức với các bài kiểm tra ngữ pháp.</p><div className="vm-arcade-pills"><span>📖 Recap</span><span>✏️ Practice</span><span>🏆 Results</span></div><button type="button" onClick={() => enter('grammar')} className="vm-arcade-button vm-arcade-button-blue">Khám phá ngữ pháp <ArrowRight size={20}/></button></article>
    </section>
    {isStudentVerified && studentCode && <ArcadePlayerHub studentCode={studentCode} />}
    {isStudentVerified && <section className="vm-arcade-dashboard" aria-label="Góc học tập của bạn">
      <div className="vm-arcade-dashboard-header">
        <div><span className="vm-arcade-label">YOUR PLAYER HUB</span><h3>🎯 Góc học tập của bạn</h3><p>Chọn mục tiêu hôm nay và tiếp tục khám phá!</p></div>
        <span className="vm-arcade-player-chip">👋 {studentName}</span>
      </div>
      <div className="vm-arcade-dashboard-grid">
        <article className="vm-arcade-dash-panel vm-arcade-dash-continue">
          <span className="vm-arcade-dash-kicker"><Compass size={16}/> QUICK START</span>
          <h4>🚀 Tiếp tục khám phá</h4>
          <p>{activeSetTitle ? `Bộ từ đang chọn: ${activeSetTitle}` : 'Mở Vocabulary Practice để chọn bộ từ và hoạt động.'}</p>
          {typeof availableSetCount === 'number' && <span className="vm-arcade-set-count"><Layers3 size={15}/> {availableSetCount} bộ từ có thể học</span>}
          <button type="button" className="vm-arcade-dash-action" onClick={() => enter('vocabulary')}>Mở Vocabulary Practice <ArrowRight size={17}/></button>
          <small>Bạn có thể tiếp tục bài đang dở từ menu hoạt động nếu có bản lưu.</small>
        </article>
        <article className="vm-arcade-dash-panel vm-arcade-dash-missions">
          <div className="vm-arcade-missions-head"><span className="vm-arcade-dash-kicker"><Target size={16}/> DAILY MISSIONS</span><span>{goals.length}/{DAILY_GOALS.length}</span></div>
          <h4>🌟 Nhiệm vụ hôm nay</h4>
          <div className="vm-arcade-goal-track" role="progressbar" aria-label="Mục tiêu đã tự đánh dấu" aria-valuenow={goals.length} aria-valuemin={0} aria-valuemax={DAILY_GOALS.length}><span style={{width:`${goals.length/DAILY_GOALS.length*100}%`}}/></div>
          <p className="vm-arcade-goal-hint">Đây là checklist tự đánh dấu, chưa tự chấm theo kết quả trò chơi.</p>
          <div className="vm-arcade-goal-list">
            {DAILY_GOALS.map(goal => <button type="button" key={goal.id} aria-pressed={goals.includes(goal.id)} className={`vm-arcade-goal ${goals.includes(goal.id)?'vm-arcade-goal-done':''}`} onClick={()=>toggleGoal(goal.id)}>
              {goals.includes(goal.id)?<CheckCircle2 size={20}/>:<Circle size={20}/>}
              <span>{goal.emoji} {goal.label}</span>
            </button>)}
          </div>
          {goals.length === DAILY_GOALS.length && <div className="vm-arcade-goal-success" role="status">🏆 Hoàn thành cả 3 mục tiêu hôm nay!</div>}
        </article>
      </div>
    </section>}


    {launch && <div className="vm-arcade-transition" role="status" aria-live="polite"><span className="vm-arcade-transition-rocket" aria-hidden="true">🚀</span><strong>{launch === 'vocabulary' ? 'Đang đến Vocabulary...' : 'Đang đến Grammar...'}</strong></div>}
    <div className="vm-arcade-footer"><Rocket size={18}/><span>Every word is a new adventure. Keep learning, keep growing!</span></div>
  </div>;
}
