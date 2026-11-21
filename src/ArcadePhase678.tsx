import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, onSnapshot } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export type VMScore = { setId: string; setTitle: string; mode: string; percentage: number; at: string };
export type VMAssignment = { id: string; title: string; setId: string; setTitle: string; targetClass: string; targetCode: string; dueDate: string; createdAt: string };
const scoreKey = (code: string) => `vm_mastery_v1_${encodeURIComponent(code.trim())}`;
export function recordVMScore(code: string, item: VMScore) {
  if (!code.trim()) return;
  try {
    const old = JSON.parse(localStorage.getItem(scoreKey(code)) || '[]') as VMScore[];
    const safe = Array.isArray(old) ? old : [];
    localStorage.setItem(scoreKey(code), JSON.stringify([...safe, item].slice(-250)));
    window.dispatchEvent(new Event('vm-mastery-updated'));
  } catch { /* Storage unavailable */ }
}
export function useVMMastery(code: string) {
  const [scores, setScores] = useState<VMScore[]>([]);
  useEffect(() => {
    const read = () => { try { const v: unknown = JSON.parse(localStorage.getItem(scoreKey(code)) || '[]'); setScores(Array.isArray(v) ? v.filter((x): x is VMScore => !!x && typeof x === 'object' && typeof x.percentage === 'number' && typeof x.setId === 'string') : []); } catch { setScores([]); } };
    read(); window.addEventListener('vm-mastery-updated', read); window.addEventListener('storage', read);
    return () => { window.removeEventListener('vm-mastery-updated', read); window.removeEventListener('storage', read); };
  }, [code]);
  return useMemo(() => {
    const bySet = new Map<string, VMScore[]>();
    scores.forEach(s => bySet.set(s.setId, [...(bySet.get(s.setId) || []), s]));
    return [...bySet.entries()].map(([id, attempts]) => {
      const latest = attempts[attempts.length - 1];
      const best = Math.max(...attempts.map(a => a.percentage));
      return { id, title: latest.setTitle, latest: latest.percentage, best, attempts: attempts.length, status: latest.percentage >= 85 ? 'Thành thạo' : latest.percentage >= 60 ? 'Đang tiến bộ' : 'Cần ôn thêm' };
    }).sort((a,b) => a.latest - b.latest);
  }, [scores]);
}
const assignmentCollection = (db: Firestore, appId: string) => collection(db, 'artifacts', appId, 'public', 'data', 'arcade_assignments');
export function useVMAssignments(db: Firestore, appId: string, enabled: boolean) {
  const [items, setItems] = useState<VMAssignment[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!enabled) { setItems([]); return; }
    return onSnapshot(assignmentCollection(db, appId), snapshot => {
      setItems(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as VMAssignment)).sort((a,b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
      setError('');
    }, () => setError('Không thể đọc bài giao. Kiểm tra Firebase Rules.'));
  }, [db, appId, enabled]);
  return { items, error };
}
export function VMAssignmentTeacher({db, appId, sets}: {db: Firestore; appId: string; sets: Array<{id:string; title:string}>}) {
  const [setId, setSetId] = useState(''); const [title, setTitle] = useState('');
  const [targetClass, setTargetClass] = useState(''); const [targetCode, setTargetCode] = useState('');
  const [dueDate, setDueDate] = useState(''); const [message, setMessage] = useState(''); const [saving, setSaving] = useState(false);
  const {items, error} = useVMAssignments(db, appId, true);
  const save = async () => {
    const selected = sets.find(s => s.id === setId);
    if (!selected) { setMessage('Hãy chọn bộ từ trước.'); return; }
    if (!targetClass.trim() && !targetCode.trim()) { setMessage('Nhập lớp hoặc mã học sinh để tránh giao bài cho toàn trường.'); return; }
    setSaving(true); setMessage('');
    try { await addDoc(assignmentCollection(db, appId), { title: title.trim() || `Ôn tập ${selected.title}`, setId, setTitle: selected.title, targetClass: targetClass.trim(), targetCode: targetCode.trim(), dueDate, createdAt: new Date().toISOString() }); setMessage('Đã tạo bài giao trên Firebase.'); setTitle(''); }
    catch { setMessage('Không lưu được. Kiểm tra quyền ghi Firebase Rules.'); }
    finally { setSaving(false); }
  };
  return <section style={{padding:20,margin:'16px 0',background:'#f4f7ff',borderRadius:20,border:'1px solid #dbeafe'}}>
    <h3 style={{fontWeight:800,fontSize:20}}>📚 Teacher Assignment · Giao bài</h3>
    <p style={{fontSize:13,margin:'6px 0 14px'}}>Giao bài theo lớp hoặc mã học sinh. Lớp phải khớp với thông tin lớp đã xác nhận.</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
      <select aria-label="Bộ từ" value={setId} onChange={e=>setSetId(e.target.value)} style={{padding:10,borderRadius:10}}><option value="">Chọn bộ từ</option>{sets.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select>
      <input aria-label="Tên bài giao" placeholder="Tên bài giao (tùy chọn)" value={title} onChange={e=>setTitle(e.target.value)} style={{padding:10,borderRadius:10}}/>
      <input aria-label="Lớp" placeholder="Lớp (ví dụ 3A1)" value={targetClass} onChange={e=>setTargetClass(e.target.value)} style={{padding:10,borderRadius:10}}/>
      <input aria-label="Mã học sinh" placeholder="Mã học sinh (tùy chọn)" value={targetCode} onChange={e=>setTargetCode(e.target.value)} style={{padding:10,borderRadius:10}}/>
      <input aria-label="Hạn hoàn thành" type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={{padding:10,borderRadius:10}}/>
    </div>
    <button type="button" disabled={saving} onClick={save} style={{marginTop:12,padding:'10px 18px',borderRadius:12,background:'#4f46e5',color:'white',fontWeight:700}}>{saving?'Đang lưu…':'➕ Giao bài'}</button>
    {message && <p role="status" style={{marginTop:8}}>{message}</p>}{error && <p role="alert">{error}</p>}
    <h4 style={{fontWeight:700,marginTop:16}}>Bài đã giao ({items.length})</h4>
    {items.slice(0,12).map(a=><div key={a.id} style={{padding:10,borderBottom:'1px solid #ddd'}}><strong>{a.title}</strong> · {a.setTitle} · {a.targetCode ? `Mã ${a.targetCode}` : `Lớp ${a.targetClass}`} {a.dueDate && `· Hạn ${a.dueDate}`}</div>)}
    <p style={{fontSize:12,marginTop:10}}>Theo dõi hoàn thành tự động và thống kê theo từng bài giao cần bước liên kết kết quả với assignmentId; phiên bản này hiển thị danh sách bài giao và kết quả luyện tập theo bộ từ riêng biệt.</p>
  </section>;
}
export function VMStudentProgress({db, appId, studentCode, studentClass, onVocabulary}: {db:Firestore; appId:string; studentCode:string; studentClass:string; onVocabulary:()=>void}) {
  const mastery = useVMMastery(studentCode);
  const {items,error} = useVMAssignments(db,appId,!!studentCode);
  const assigned = items.filter(a => a.targetCode ? a.targetCode.trim().toLowerCase() === studentCode.trim().toLowerCase() : a.targetClass.trim().toLowerCase() === studentClass.trim().toLowerCase());
  const weak = mastery.filter(s => s.latest < 85);
  const panel: React.CSSProperties = {padding:20,background:'linear-gradient(135deg,#f0f9ff,#faf5ff)',border:'1px solid #dbeafe',borderRadius:20,marginTop:18};
  return <div>
    <section style={panel}><h3 style={{fontWeight:800,fontSize:20}}>🏅 Vocabulary Mastery</h3><p style={{fontSize:13}}>Tiến độ theo bộ từ, tính từ các lượt luyện tập mới trên thiết bị này (không phải độ thành thạo từng từ).</p>
      {mastery.length===0?<p style={{marginTop:12}}>Chưa có dữ liệu. Hãy hoàn thành một hoạt động Vocabulary!</p>: mastery.map(s=><div key={s.id} style={{marginTop:12}}><strong>{s.title}</strong><span style={{float:'right'}}>{s.latest}% · {s.status}</span><div style={{height:9,borderRadius:9,background:'#dbeafe',overflow:'hidden',clear:'both'}}><div style={{height:'100%',width:`${Math.min(100,Math.max(0,s.latest))}%`,background:s.latest>=85?'#10b981':s.latest>=60?'#818cf8':'#f59e0b'}}/></div><small>Điểm tốt nhất: {s.best}% · {s.attempts} lượt</small></div>)}
    </section>
    <section style={panel}><h3 style={{fontWeight:800,fontSize:20}}>🧠 Smart Review Engine</h3>{weak.length?<><p>Bạn có thể ôn lại những bộ từ có kết quả dưới 85%:</p>{weak.slice(0,3).map(s=><p key={s.id}>🔁 {s.title} · {s.latest}%</p>)}</>:<p>{mastery.length?'🎉 Các bộ từ đã luyện gần đây đều đạt từ 85% trở lên!':'Hoàn thành một lượt luyện tập để nhận gợi ý dựa trên điểm số.'}</p>}<button type="button" onClick={onVocabulary} style={{marginTop:10,padding:'10px 16px',background:'#4f46e5',color:'#fff',borderRadius:12}}>Mở Vocabulary Practice →</button></section>
    <section style={panel}><h3 style={{fontWeight:800,fontSize:20}}>📋 Bài giáo viên giao ({assigned.length})</h3>{error&&<p role="alert">{error}</p>}{assigned.length===0?<p>Hiện chưa có bài giao phù hợp.</p>:assigned.map(a=><div key={a.id} style={{padding:'12px 0',borderBottom:'1px solid #ddd'}}><strong>{a.title}</strong><p>{a.setTitle}{a.dueDate && ` · Hạn ${a.dueDate}`}</p><button type="button" onClick={onVocabulary} style={{fontWeight:700,color:'#4338ca'}}>Đi đến Vocabulary →</button></div>)}<small>Chọn đúng bộ từ trong Vocabulary Practice để làm bài. Chưa tự đánh dấu hoàn thành bài giao.</small></section>
  </div>;
}
