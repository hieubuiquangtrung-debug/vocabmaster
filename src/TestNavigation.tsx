import {useState} from 'react';
type Props = {done:boolean[]; prefix:string; kinds?:string[]; onSubmit:()=>void; disabled?:boolean; submitted?:boolean};
export default function TestNavigation({done,prefix,kinds,onSubmit,disabled=false,submitted=false}:Props){
 const [open,setOpen]=useState(false);
 const count=done.filter(Boolean).length;
 return <aside className="vm-test-nav">
 <button type="button" className="vm-nav-toggle" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>☷ Câu hỏi · {count}/{done.length}</button>
 <div className={'vm-nav-body '+(open?'is-open':'')}>
 <div className="vm-nav-heading"><b>Tiến độ</b><strong>{count}/{done.length}</strong></div>
 <progress aria-label="Tiến độ bài làm" value={count} max={done.length||1}/>
 <div className="vm-nav-grid">{done.map((d,i)=><button type="button" key={i} data-kind={kinds?.[i]||'default'} className={d?'answered':''} aria-label={`Câu ${i+1}${d?', đã hoàn thành':', chưa hoàn thành'}`} onClick={()=>{document.getElementById(prefix+i)?.scrollIntoView({behavior:'smooth',block:'start'});setOpen(false);}}>{i+1}</button>)}</div>
 <div className="vm-nav-legend"><span><i className="vm-legend-done"/> Đã làm <b>{count}</b></span><span><i/> Chưa xong <b>{done.length-count}</b></span></div>
 </div>
 {!submitted&&<div className="vm-test-submit"><button type="button" disabled={disabled} onClick={()=>{if(count===done.length||window.confirm(`Còn ${done.length-count} câu chưa hoàn thành. Bạn muốn nộp bài?`))onSubmit();}}><span aria-hidden="true">✓</span> {disabled?'Đang lưu…':'Nộp bài'}</button></div>}
 </aside>;
}
