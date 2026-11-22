import { playArcadeSound, soundEnabled, setSoundEnabled } from './ArcadeSound';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import { makeQuestion, clean } from './arcade-question-engine';
import './arcade-mini-games.css';
type Term={id?:string;term:string;meaning?:string;definition?:string;example?:string};
type SetData={id:string;title:string;terms?:Term[]};
type Game='builder'|'fishing'|'memory'|'runner';
type Props={activeSet:SetData;studentCode:string;onBack:()=>void;onFinish:(score:{mode:string;score:number;total:number})=>void;onOpenLegacy:(mode:'treasure-hunt'|'word-cafe'|'nomnom')=>void};
const games:{id:Game;emoji:string;title:string;desc:string}[]=[{id:'builder',emoji:'🔤',title:'Word Builder',desc:'Sắp xếp chữ cái thành từ'},{id:'fishing',emoji:'🎣',title:'Word Fishing',desc:'Câu đúng từ theo nghĩa'},{id:'memory',emoji:'🃏',title:'Memory Flip',desc:'Lật thẻ tìm cặp từ và nghĩa'},{id:'runner',emoji:'🏃',title:'Sentence Runner',desc:'Chọn từ phù hợp với câu'}];
function shuffle<T,>(items:T[]):T[]{const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
function meaning(t:Term){return String(t.meaning||t.definition||'').trim();}

export function ArcadeMiniGames({activeSet,onBack,onFinish,onOpenLegacy}:Props){
 const terms:Term[]=useMemo(()=>activeSet.terms?.filter(t=>t.term?.trim()&&meaning(t))||[],[activeSet]);
 const [muted,setMuted]=useState(!soundEnabled());
 const [game,setGame]=useState<Game|null>(null);const [round,setRound]=useState<Term[]>([]);const [index,setIndex]=useState(0);const [correct,setCorrect]=useState(0);const [answer,setAnswer]=useState('');const [checked,setChecked]=useState(false);const [done,setDone]=useState(false);const [selected,setSelected]=useState<number[]>([]);const [matched,setMatched]=useState<number[]>([]);const [deck,setDeck]=useState<{pair:number;side:'word'|'meaning';text:string}[]>([]);
 const [choices,setChoices]=useState<string[]>([]);
 const [cast,setCast]=useState(false); const [stride,setStride]=useState(0);
 const [hookPosition,setHookPosition]=useState<{x:number;y:number}|null>(null);
 const [dragging,setDragging]=useState(false);
 const sceneRef=useRef<HTMLDivElement|null>(null);
 const [fishPhase,setFishPhase]=useState<'idle'|'dropping'|'hooked'|'lifting'|'bucket'|'miss'>('idle');
 const [fishTarget,setFishTarget]=useState(''); const [bucket,setBucket]=useState(0);
 const [rank,setRank]=useState(1); const [runnerResult,setRunnerResult]=useState<'correct'|'wrong'|null>(null);
 const timers=useRef<ReturnType<typeof setTimeout>[]>([]);
 const choosingRef=useRef(false);
 const schedule=(fn:()=>void,ms:number)=>{const id=setTimeout(fn,ms);timers.current.push(id);};
 useEffect(()=>()=>{timers.current.forEach(clearTimeout);timers.current=[];},[]);
 const clearAnimations=()=>{timers.current.forEach(clearTimeout);timers.current=[];};
 const current=round[index];
 const question=useMemo(()=>current?makeQuestion(current,terms):null,[current,terms]);
 const scrambled=useMemo(()=>shuffleLetters(current?.term||''),[current]);const [placed,setPlaced]=useState<number[]>([]);
 const start=(type:Game)=>{clearAnimations();setFishPhase('idle');setFishTarget('');setBucket(0);setRank(1);setRunnerResult(null);const unique=shuffle(terms.filter((t,i,a)=>a.findIndex(x=>x.term.toLowerCase()===t.term.toLowerCase())===i));const list=unique.slice(0,type==='memory'?Math.min(5,unique.length):Math.min(10,unique.length));choosingRef.current=false;setGame(type);setPlaced([]);setCast(false);setStride(0);setHookPosition(null);setDragging(false);setRound(list);setIndex(0);setCorrect(0);setAnswer('');setChecked(false);setDone(false);setSelected([]);setMatched([]);setDeck(type==='memory'?shuffle(list.flatMap((t,i)=>[{pair:i,side:'word' as const,text:t.term},{pair:i,side:'meaning' as const,text:meaning(t)}])):[]);setChoices(list[0]?makeQuestion(list[0],terms).choices:[]);};
 const finish=(score:number,total:number)=>{playArcadeSound('win');setDone(true);if(game)onFinish({mode:`arcade-${game}`,score,total});};
 const next=(value:boolean)=>{choosingRef.current=false;clearAnimations();setFishPhase('idle');setFishTarget('');setRunnerResult(null);const updated=correct+(value?1:0);setCorrect(updated);if(index+1>=round.length){finish(updated,round.length);return;}const at=index+1;setCast(false);setHookPosition(null);setDragging(false);setIndex(at);setPlaced([]);setAnswer('');setChecked(false);setChoices(makeQuestion(round[at],terms).choices);};
 const check=()=>{if(!current||checked)return;playArcadeSound(clean(answer.replace(/\s/g,''))===clean(current.term.replace(/\s/g,''))?'correct':'wrong');setChecked(true);};const tileAnswer=placed.map(i=>scrambled[i]).join('');const placeTile=(i:number)=>{if(checked||placed.includes(i))return;const nextTiles=[...placed,i];setPlaced(nextTiles);setAnswer(nextTiles.map(at=>scrambled[at]).join(''));};const removeTile=()=>{if(checked)return;const nextTiles=placed.slice(0,-1);setPlaced(nextTiles);setAnswer(nextTiles.map(at=>scrambled[at]).join(''));};
 const choose=(value:string)=>{
  if(checked||cast||choosingRef.current)return;choosingRef.current=true;setAnswer(value);playArcadeSound(clean(value)===clean(current.term)?'correct':'wrong');
  if(game==='fishing'){
   const caught=clean(value)===clean(current.term);
   setCast(true);setFishTarget(value);setFishPhase('dropping');
   schedule(()=>setFishPhase('hooked'),650);
   schedule(()=>setFishPhase('lifting'),1200);
   schedule(()=>{setFishPhase(caught?'bucket':'miss');if(caught)setBucket(n=>n+1);},1900);
   schedule(()=>{setChecked(true);setCast(false);},2450);
  }else if(game==='runner'){
   const right=value.trim().toLowerCase()===current.term.trim().toLowerCase();
   setCast(true);setRunnerResult(right?'correct':'wrong');
   if(right){setStride(v=>v+1);setRank(v=>v+1);}
   schedule(()=>{setChecked(true);setCast(false);},950);
  }else{setChecked(true);}
 };
 const pointerMove=(e:ReactPointerEvent<HTMLDivElement>)=>{if(!dragging||!sceneRef.current)return;const rect=sceneRef.current.getBoundingClientRect();setHookPosition({x:Math.max(5,Math.min(95,(e.clientX-rect.left)/rect.width*100)),y:Math.max(5,Math.min(85,(e.clientY-rect.top)/rect.height*100))});};
 const pointerDown=(e:ReactPointerEvent<HTMLDivElement>)=>{if(cast||checked||fishPhase!=='idle')return;setDragging(true);e.currentTarget.setPointerCapture(e.pointerId);pointerMoveFromEvent(e);};
 const pointerMoveFromEvent=(e:ReactPointerEvent<HTMLDivElement>)=>{if(!sceneRef.current)return;const rect=sceneRef.current.getBoundingClientRect();setHookPosition({x:Math.max(5,Math.min(95,(e.clientX-rect.left)/rect.width*100)),y:Math.max(5,Math.min(85,(e.clientY-rect.top)/rect.height*100))});};
 const pointerUp=(e:ReactPointerEvent<HTMLDivElement>)=>{if(!dragging)return;setDragging(false);const hit=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLButtonElement>('[data-fish-answer]');if(hit?.dataset.fishAnswer){choose(hit.dataset.fishAnswer);return;}const buttons=Array.from(sceneRef.current?.querySelectorAll<HTMLButtonElement>('[data-fish-answer]')||[]);const closest=buttons.map(el=>{const r=el.getBoundingClientRect();return {el,d:Math.hypot(e.clientX-(r.left+r.width/2),e.clientY-(r.top+r.height/2))};}).sort((a,b)=>a.d-b.d)[0];if(closest&&closest.d<75)choose(closest.el.dataset.fishAnswer||'');};
 const flip=(at:number)=>{if(selected.includes(at)||matched.includes(at)||selected.length>=2)return;const nextSelection=[...selected,at];setSelected(nextSelection);if(nextSelection.length===2){const a=deck[nextSelection[0]],b=deck[nextSelection[1]];if(a.pair===b.pair&&a.side!==b.side){playArcadeSound('correct');const updated=[...matched,...nextSelection];setMatched(updated);setSelected([]);if(updated.length===deck.length)finish(round.length,round.length);}else{playArcadeSound('wrong');window.setTimeout(()=>setSelected(old=>old.length===2&&old[0]===nextSelection[0]&&old[1]===nextSelection[1]?[]:old),750);}}};
 const valid=terms.length>=2;
 return <section className="vm-mini"><div className="vm-mini-top"><button type="button" onClick={onBack}>← Vocabulary Practice</button><span>🎮 ARCADE MINI-GAMES</span><button type="button" onClick={()=>setMuted(v=>{setSoundEnabled(v);return !v;})}>{muted?"🔇 Bật âm":"🔊 Tắt âm"}</button></div><h2>🎲 Mini-game Playground</h2><p className="vm-mini-desc">Bộ từ: <b>{activeSet.title}</b> · {terms.length} từ có nghĩa</p>
 {!game?<><div className="vm-mini-grid">{[{mode:'treasure-hunt' as const,emoji:'🗺️',title:'Treasure Hunt',desc:'Săn kho báu trên đảo'},{mode:'word-cafe' as const,emoji:'☕',title:'Word Café',desc:'Phục vụ khách hàng'},{mode:'nomnom' as const,emoji:'👾',title:'NomNom',desc:'Cho quái vật ăn từ'}].map(g=><button type="button" key={g.mode} onClick={()=>onOpenLegacy(g.mode)}><span>{g.emoji}</span><strong>{g.title}</strong><small>{g.desc}</small></button>)}{games.map(g=><button type="button" key={g.id} disabled={!valid} onClick={()=>start(g.id)}><span>{g.emoji}</span><strong>{g.title}</strong><small>{g.desc}</small></button>)}</div>{!valid&&<p role="alert">Cần ít nhất 2 từ vựng có nghĩa để chơi mini-games.</p>}</>:<div className="vm-mini-board"><div className="vm-mini-status"><button type="button" onClick={()=>setGame(null)}>← Chọn trò chơi</button><strong>{games.find(g=>g.id===game)?.emoji} {games.find(g=>g.id===game)?.title}</strong><span>{done?'Hoàn thành':game==='memory'?`${matched.length/2}/${round.length} cặp`:`${index+1}/${round.length}`}</span></div>
 {done?<div className="vm-mini-result"><span>🏆</span><h3>Hoàn thành rồi!</h3><p>{game==='memory'?`Bạn đã ghép đúng ${round.length} cặp!`:game==='fishing'?`🪣 Bạn câu được ${bucket} con cá! · ${correct}/${round.length} câu đúng · ${Math.round(correct/round.length*100)}% chính xác`:game==='runner'?`🏁 TOP ${1+round.length-correct} / ${round.length+1} · ${correct}/${round.length} câu đúng`:`Bạn trả lời đúng ${correct}/${round.length} câu.`}</p><small>Kết quả đã gửi đến hệ thống lưu điểm như các trò chơi hiện có. XP chỉ được cộng cho lần đầu của mỗi trò chơi/bộ từ trong ngày.</small><div><button type="button" onClick={()=>start(game)}>🔄 Chơi lại</button><button type="button" onClick={()=>setGame(null)}>🎲 Chọn trò khác</button></div></div>:
 game==='memory'?<><p className="vm-mini-prompt">Tìm đúng cặp từ tiếng Anh và nghĩa của nó!</p><div className="vm-mini-memory">{deck.map((card,i)=><button type="button" key={i} className={matched.includes(i)?'matched':selected.includes(i)?'revealed':''} disabled={matched.includes(i)} onClick={()=>flip(i)}>{matched.includes(i)?'✓':selected.includes(i)?card.text:'❔'}</button>)}</div></>:
 <><div className="vm-mini-question"><span>{game==='builder'?'🔤':game==='fishing'?'🎣':'🏃'}</span><p>{game==='builder'?`Sắp xếp chữ cái để viết từ có nghĩa: “${meaning(current)}”`:game==='fishing'?`Câu từ có nghĩa: “${meaning(current)}”`:question?.prompt || 'Chọn đáp án đúng'}</p></div>
 {game==='fishing'&&<div ref={sceneRef} className={`vm-fish-game phase-${fishPhase}${dragging?' is-dragging':''}`} aria-label="Hồ câu cá tương tác" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={()=>setDragging(false)}>
  <div className="vm-fish-landscape"><span>☀️</span><span>☁️</span><span>⛰️</span><span>🌳</span></div>
  <div className="vm-fish-person">🧑‍🎣</div>
  <div className="vm-fish-pole"/><div className="vm-fish-line"><span>🪝</span></div>{hookPosition&&fishPhase==='idle'&&<div className="vm-fish-drag-hook" style={{left:`${hookPosition.x}%`,top:`${hookPosition.y}%`}}>🪝</div>}
  <div className="vm-fish-water"><span className="vm-fish-ripple">〰️　〰️　〰️</span>
   {choices.map((c,i)=><button type="button" key={c} data-fish-answer={c} className={`vm-fish-swimmer fish-${i} ${fishTarget===c?'is-target':''}`} style={{'--fish-i':i} as CSSProperties} disabled={cast||checked} onClick={()=>choose(c)} aria-label={`Câu cá ${c}`}><span className="vm-fish-icon">🐟</span><strong>{c}</strong></button>)}
  </div>
  <div className="vm-fish-bucket" aria-live="polite"><span>🪣</span><strong>{bucket} cá</strong></div>
  <div className="vm-fish-scene-hint">{fishPhase==='idle'?'Kéo lưỡi câu đến con cá đúng rồi thả tay (hoặc chạm vào cá)':fishPhase==='dropping'?'🎣 Đang thả câu...':fishPhase==='hooked'?'🐟 Cá đã cắn câu!':fishPhase==='lifting'?'⬆️ Đang kéo cá lên...':fishPhase==='bucket'?'✨ Cá vào xô!':'💦 Cá tuột khỏi lưỡi câu!'}</div>
 </div>}
 {game==='runner'&&<div className="vm-race-game" aria-label="Đường đua với các vận động viên"><div className="vm-race-head"><span>🏁 ĐƯỜNG ĐUA</span><strong>Vị trí {round.length+1-rank}/{round.length+1}</strong></div><div className="vm-race-track" style={{'--race-progress':`${Math.round((index+(checked?1:0))/Math.max(1,round.length)*100)}%`} as CSSProperties}>
 {Array.from({length:round.length+1},(_,i)=>{const position=i+1;const myPosition=round.length+1-rank;const isMe=position===myPosition;const rivalId=position<myPosition?position:position-1;return <div key={i} className={`vm-race-lane ${isMe?'is-player':''}`}><span className="vm-race-number">{position}</span><span className={`vm-race-athlete ${isMe?'vm-race-me':''}`} style={{left:`${Math.min(80,18+((round.length+1-position)*4)+stride*1.5)}%`}}>{isMe?'🏃‍♂️':rivalId%2?'🏃‍♀️':'🏃'}</span><span className="vm-race-name">{isMe?'BẠN':`Đối thủ ${rivalId}`}</span></div>;})}
 </div><div className="vm-race-progress"><span style={{width:`${Math.round((index+(checked?1:0))/Math.max(1,round.length)*100)}%`}}/></div><p className="vm-race-hint">{runnerResult==='correct'?'⚡ Chính xác! Bạn vượt lên một vị trí!':runnerResult==='wrong'?'💪 Chưa đúng! Giữ nguyên vị trí.':`Trả lời đúng để vượt đối thủ · ${round.length-index} câu còn lại`}</p></div>}
 {game==='builder'?<><div className="vm-builder-answer" aria-live="polite"><strong>{tileAnswer||'Chạm vào chữ cái để ghép từ'}</strong><button type="button" disabled={checked||placed.length===0} onClick={removeTile}>↩ Xóa chữ cuối</button><button type="button" disabled={checked||placed.length===0} onClick={()=>{setPlaced([]);setAnswer('');}}>↺ Xóa hết</button></div><div className="vm-mini-letters">{scrambled.map((l,i)=><button type="button" key={`${index}-${i}`} disabled={checked||placed.includes(i)} onClick={()=>placeTile(i)} aria-label={`Chọn chữ ${l}`}>{placed.includes(i)?'·':l}</button>)}</div><p className="vm-builder-hint">Có chữ gây nhiễu. Không hiển thị số chữ cái của đáp án.</p><button type="button" className="vm-mini-primary" disabled={!answer.trim()||checked} onClick={check}>Kiểm tra</button></>:<div className={`vm-mini-choices${game==='fishing'?' vm-fish-hidden-choices':''}`}>{choices.map(c=><button type="button" key={c} disabled={checked||cast} className={checked&&c===current.term?'correct':checked&&c===answer?'wrong':''} onClick={()=>choose(c)}>{c}</button>)}</div>}
 {checked&&<div className="vm-mini-feedback" role="status"><b>{clean(answer.replace(/\s/g,''))===clean(current.term.replace(/\s/g,''))?'✨ Chính xác!':'💡 Đáp án đúng: '+current.term}</b><button type="button" onClick={()=>next(clean(answer.replace(/\s/g,''))===clean(current.term.replace(/\s/g,'')))}>{index+1===round.length?'Xem kết quả':'Tiếp theo →'}</button></div>}</>}
 </div>}
 </section>;
}
function shuffleLetters(word:string){return shuffle([...word.replace(/\s/g,'').split(''),...shuffle('abcdefgilmnoprst'.split('')).slice(0,3)]);}
