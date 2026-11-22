import { useEffect, useState } from 'react';
import './arcade-rewards.css';
import type { Firestore } from 'firebase/firestore';
import { pullArcadeProfile, pushArcadeProfile } from './ArcadeCloudSync';

type Profile = { avatar: string; accessory: string; pet: string; petName: string; xp: number; food: number; fed: number; awards: string[]; claims: string[]; coins?: number; inventory?: string[]; room?: string; updatedAt?: number };
const AVATARS = ['🦊','🐱','🐰','🐻','🐼','🐸','🐧','🦄'];
const ACCESSORIES = ['✨','🎀','👑','🧢','🌈','⭐'];
const PETS = ['🐣','🐶','🐹','🐲'];
const initial = (): Profile => ({avatar:'🦊',accessory:'✨',pet:'🐣',petName:'Buddy',xp:0,food:0,fed:0,awards:[],claims:[],coins:0,inventory:[],room:'🌿'});
const key = (code:string) => `vm_arcade_player_v1_${encodeURIComponent(code.trim())}`;
function read(code:string):Profile { try { const raw = JSON.parse(localStorage.getItem(key(code)) || 'null') as Partial<Profile>|null; const def=initial(); return raw && typeof raw==='object' ? {...def,...raw, xp:Number(raw.xp)||0,food:Number(raw.food)||0,fed:Number(raw.fed)||0,awards:Array.isArray(raw.awards)?raw.awards:[],claims:Array.isArray(raw.claims)?raw.claims:[],coins:Math.max(0,Number(raw.coins)||0),inventory:Array.isArray(raw.inventory)?raw.inventory:[],room:typeof raw.room==='string'?raw.room:'🌿'} : def; } catch {return initial();} }
function write(code:string, profile:Profile) { try {localStorage.setItem(key(code),JSON.stringify({...profile,updatedAt:Date.now()}));window.dispatchEvent(new CustomEvent('vm-arcade-player-update',{detail:code}));}catch {/* browser storage blocked */} }
export function awardPracticeXP(code:string,setId:string,mode:string,score:number,total:number) {
 if(!code.trim() || total<=0 || !Number.isFinite(score) || !Number.isFinite(total))return;
 const percent=Math.max(0,Math.min(100,Math.round(score/total*100)));
 // Limit repeat rewards per activity/set/day to prevent infinite farming.
 const day=new Date().toLocaleDateString('en-CA'); const claim=`${day}:${setId}:${mode}`;
 const profile=read(code);if(profile.claims.includes(claim))return;
 const gain=10+Math.round(percent/10);const xp=profile.xp+gain;
 const awards=[...profile.awards];
 if(xp>=50&&!awards.includes('first50'))awards.push('first50');
 if(xp>=200&&!awards.includes('level3'))awards.push('level3');
 if(percent===100&&!awards.includes('perfect'))awards.push('perfect');
 write(code,{...profile,xp,food:profile.food+1,coins:(profile.coins||0)+Math.max(1,Math.round(percent/20)),awards,claims:[...profile.claims.slice(-249),claim]});
}
const levelFromXP=(xp:number)=>Math.floor(Math.sqrt(xp/50))+1;
export function ArcadePlayerHub({studentCode}:{studentCode:string}) {
 const [profile,setProfile]=useState<Profile>(()=>read(studentCode));
 const [tab,setTab]=useState<'avatar'|'pet'|'shop'|'room'>('avatar');
 const [notice,setNotice]=useState('');
 const [equipped,setEquipped]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem(`vm_arcade_equipped_${encodeURIComponent(studentCode.trim())}`)||'[]')}catch{return []}});

 useEffect(()=>{const refresh=()=>setProfile(read(studentCode));refresh();window.addEventListener('vm-arcade-player-update',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('vm-arcade-player-update',refresh);window.removeEventListener('storage',refresh);};},[studentCode]);
 useEffect(()=>{setEquipped((()=>{try{return JSON.parse(localStorage.getItem(`vm_arcade_equipped_${encodeURIComponent(studentCode.trim())}`)||'[]')}catch{return []}})());},[studentCode]);
 const update=(change:Partial<Profile>)=>{const next={...read(studentCode),...change};setProfile(next);write(studentCode,next);};
 const items=[{id:'🎩',price:12},{id:'🕶️',price:10},{id:'🧸',price:8},{id:'🎈',price:6},{id:'🪴',price:9},{id:'🛋️',price:15}];const owned=profile.inventory||[];const buy=(id:string,price:number)=>{if(owned.includes(id)){setNotice('Bạn đã có vật phẩm này!');return;}if((profile.coins||0)<price){setNotice('Bạn chưa đủ xu!');return;}update({coins:(profile.coins||0)-price,inventory:[...owned,id]});setNotice(`Đã mở khóa ${id}!`);}; const level=levelFromXP(profile.xp);const nextXP=50*level*level;const prevXP=50*(level-1)*(level-1);const progress=Math.min(100,Math.round((profile.xp-prevXP)/(nextXP-prevXP)*100));
 const decor=['🧸','🎈','🪴','🛋️'];
 const toggleDecor=(id:string)=>{const next=equipped.includes(id)?equipped.filter(x=>x!==id):[...equipped,id];setEquipped(next);try{localStorage.setItem(`vm_arcade_equipped_${encodeURIComponent(studentCode.trim())}`,JSON.stringify(next))}catch{/* no storage */}};
 const scenes:Record<string,{label:string,cls:string}>={'🌿':{label:'Khu vườn',cls:'garden'},'🌸':{label:'Vườn hoa',cls:'flowers'},'🌊':{label:'Bãi biển',cls:'beach'},'🌙':{label:'Đêm sao',cls:'night'}};
 return <section className="vm-player vm-player-v2" aria-label="Avatar, XP và thú cưng">
  <div className="vm-player-top"><div><span className="vm-player-eyebrow">✨ MY LITTLE ARCADE</span><h3>Thế giới nhỏ của bạn</h3><p>Tùy chỉnh nhân vật, sưu tập quà và chăm sóc thú cưng!</p></div><div className="vm-player-level"><b>⭐ Level {level}</b><small>{profile.xp} XP · 🪙 {profile.coins||0} xu</small><div className="vm-player-meter"><span style={{width:`${progress}%`}}/></div><small>Còn {nextXP-profile.xp} XP để lên cấp</small></div></div>
  <div className="vm-player-tabs vm-player-main-tabs" role="tablist" aria-label="Khu vực Arcade">{([{id:'avatar',label:'🎨 Avatar Studio'},{id:'pet',label:'🐾 My Pet'},{id:'shop',label:'🎁 Rewards Shop'},{id:'room',label:'🏡 My Pet World'}] as const).map(t=><button key={t.id} role="tab" aria-selected={tab===t.id} type="button" className={tab===t.id?'selected':''} onClick={()=>{setTab(t.id);setNotice('')}}>{t.label}</button>)}</div>
  {tab==='avatar'&&<div className="vm-world-grid"><div className="vm-world-stage avatar-stage"><span className="vm-stage-spark">✦ ✨ ✦</span><span className="vm-stage-character">{profile.avatar}</span><span className="vm-stage-accessory">{profile.accessory}</span><h4>My Avatar</h4><p>Nhân vật đồng hành cùng em trong Arcade</p></div><div className="vm-world-controls"><h4>Chọn nhân vật</h4><div className="vm-player-options">{AVATARS.map(a=><button key={a} type="button" aria-label={`Chọn avatar ${a}`} aria-pressed={profile.avatar===a} className={profile.avatar===a?'selected':''} onClick={()=>update({avatar:a})}>{a}</button>)}</div><h4>Phụ kiện</h4><div className="vm-player-options">{ACCESSORIES.map(a=><button key={a} type="button" aria-label={`Chọn phụ kiện ${a}`} aria-pressed={profile.accessory===a} className={profile.accessory===a?'selected':''} onClick={()=>update({accessory:a})}>{a}</button>)}</div>{owned.filter(x=>['🎩','🕶️'].includes(x)).length>0&&<><h4>Phụ kiện đã mua</h4><div className="vm-player-options">{owned.filter(x=>['🎩','🕶️'].includes(x)).map(x=><button key={x} className={profile.accessory===x?'selected':''} onClick={()=>update({accessory:x})}>{x}</button>)}</div></>}</div></div>}
  {tab==='pet'&&<div className="vm-world-grid"><div className="vm-world-stage pet-stage"><span className="vm-stage-spark">💖 ✨</span><span className="vm-stage-character">{profile.pet}</span><h4>{profile.petName||'Buddy'}</h4><p>🥕 Thức ăn: {profile.food} · Đã cho ăn: {profile.fed}</p><button className="vm-primary-action" type="button" disabled={profile.food<1} onClick={()=>{update({food:profile.food-1,fed:profile.fed+1});setNotice('Yummy! Thú cưng vui lắm! 💖')}}>🥕 Cho ăn</button></div><div className="vm-world-controls"><h4>Chọn thú cưng</h4><div className="vm-player-options">{PETS.map(x=><button key={x} className={profile.pet===x?'selected':''} onClick={()=>update({pet:x})}>{x}</button>)}</div><label className="vm-player-name">Tên thú cưng<input maxLength={18} value={profile.petName} onChange={e=>update({petName:e.target.value})}/></label><p>Hoàn thành các hoạt động có chấm điểm để nhận XP, xu và thức ăn.</p><button type="button" className="vm-secondary-action" onClick={()=>setTab('room')}>🏡 Đến Pet World →</button></div></div>}
  {tab==='shop'&&<div className="vm-shop-panel"><div className="vm-shop-heading"><div><h4>🎁 Rewards Shop</h4><p>Hoàn thành bài học để kiếm xu và mở khóa vật phẩm.</p></div><strong>🪙 {profile.coins||0} xu</strong></div><div className="vm-shop-grid">{items.map(item=>{const has=owned.includes(item.id);const name=({'🎩':'Mũ thời trang','🕶️':'Kính mát','🧸':'Gấu bông','🎈':'Bóng bay','🪴':'Chậu cây','🛋️':'Ghế sofa'} as Record<string,string>)[item.id];return <div className="vm-shop-item" key={item.id}><span className="vm-shop-emoji">{item.id}</span><strong>{name}</strong><small>{['🎩','🕶️'].includes(item.id)?'Avatar Studio':'Pet World'}</small><button type="button" disabled={has||(profile.coins||0)<item.price} onClick={()=>buy(item.id,item.price)}>{has?'✓ Đã sở hữu':`🪙 ${item.price} · Mua`}</button></div>})}</div></div>}
  {tab==='room'&&<div className="vm-room-panel"><div className="vm-room-heading"><div><h4>🏡 My Pet World</h4><p>Trang trí căn phòng theo phong cách riêng của em.</p></div><button className="vm-secondary-action" type="button" onClick={()=>setTab('shop')}>🎁 Đến Shop</button></div><div className={`vm-room-scene ${scenes[profile.room||'🌿']?.cls||'garden'}`}><div className="vm-room-sky">{profile.room==='🌙'?'🌙 ⭐ ✨':profile.room==='🌊'?'☀️ ☁️':'☀️ ☁️ 🦋'}</div><div className="vm-room-pet">{profile.pet}</div><div className="vm-room-name">{profile.petName||'Buddy'}</div><div className="vm-room-decor">{equipped.filter(x=>owned.includes(x)).map((x,i)=><span key={`${x}-${i}`}>{x}</span>)}</div><div className="vm-room-ground"/></div><div className="vm-room-settings"><div><h4>Chọn khung cảnh</h4><div className="vm-player-options">{Object.entries(scenes).map(([emoji,scene])=><button key={emoji} className={profile.room===emoji?'selected':''} onClick={()=>update({room:emoji})} title={scene.label}>{emoji}<small>{scene.label}</small></button>)}</div></div><div><h4>Đặt đồ trang trí</h4><p>Chạm để đặt hoặc cất đồ đã mua.</p><div className="vm-player-options">{decor.map(x=><button key={x} disabled={!owned.includes(x)} className={equipped.includes(x)?'selected':''} onClick={()=>toggleDecor(x)} title={owned.includes(x)?'Bật / tắt trang trí':'Mua tại Shop'}>{x}<small>{!owned.includes(x)?'🔒':equipped.includes(x)?'Đang đặt':'Đặt vào'}</small></button>)}</div></div></div></div>}
  {notice&&<p role="status" className="vm-player-hint vm-player-notice">{notice}</p>}<div className="vm-player-badges"><strong>🏅 Huy hiệu</strong><span className={profile.awards.includes('first50')?'earned':''}>🌟 50 XP</span><span className={profile.awards.includes('level3')?'earned':''}>🚀 200 XP</span><span className={profile.awards.includes('perfect')?'earned':''}>💯 Perfect Score</span></div>

 </section>;
}

/** Always-visible companion; owns the single cloud synchronization listener for the student. */
export function ArcadeCompanion({studentCode,db,appId,onOpenWorld}:{studentCode:string;db?:Firestore;appId?:string;onOpenWorld:()=>void}) {
 const [profile,setProfile]=useState<Profile>(()=>read(studentCode));
 const [status,setStatus]=useState<'connecting'|'synced'|'offline'|'denied'|'error'>('connecting');
 const [detail,setDetail]=useState('');
 useEffect(()=>{const refresh=()=>setProfile(read(studentCode));refresh();window.addEventListener('vm-arcade-player-update',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('vm-arcade-player-update',refresh);window.removeEventListener('storage',refresh)}},[studentCode]);
 useEffect(()=>{
  if(!db||!appId||!studentCode.trim())return;
  let disposed=false;let busy=false;let dirty=false;let retryTimer:ReturnType<typeof setTimeout>|undefined;let failures=0;
  const sync=async(initial=false)=>{
   if(busy){dirty=true;return;}busy=true;
   try {
    if(!navigator.onLine){setStatus('offline');return;}
    setStatus('connecting');
    if(initial)await pullArcadeProfile(db,appId,studentCode);
    else await pushArcadeProfile(db,appId,studentCode);
    if(!disposed){failures=0;setStatus('synced');setDetail('');}
   }catch(e:unknown){
    if(disposed)return;
    const code=typeof e==='object'&&e!==null&&'code'in e?String((e as {code:unknown}).code):'';
    const denied=code.includes('permission-denied')||code.includes('unauthenticated');
    setStatus(denied?'denied':navigator.onLine?'error':'offline');
    setDetail(denied?'Firebase từ chối quyền truy cập. Kiểm tra đăng nhập và Firestore Rules.':code||'Không thể đồng bộ lúc này');
    if(!denied){failures++;const delay=Math.min(60000,3000*2**Math.min(failures,4));retryTimer=setTimeout(()=>{if(!disposed)void sync()},delay);}
   }finally{busy=false;if(dirty&&!disposed){dirty=false;void sync();}}
  };
  const onUpdate=()=>{if(!disposed)void sync()};
  const onOnline=()=>{if(retryTimer)clearTimeout(retryTimer);void sync(true)};
  const onOffline=()=>setStatus('offline');
  window.addEventListener('vm-arcade-player-update',onUpdate);
  window.addEventListener('online',onOnline);window.addEventListener('offline',onOffline);
  void sync(true);
  return()=>{disposed=true;if(retryTimer)clearTimeout(retryTimer);window.removeEventListener('vm-arcade-player-update',onUpdate);window.removeEventListener('online',onOnline);window.removeEventListener('offline',onOffline)};
 },[db,appId,studentCode]);
 return <div className="vm-companion-wrap"><button type="button" className="vm-companion" onClick={onOpenWorld} title="Mở Thế giới nhỏ của bạn"><span className="vm-companion-avatar">{profile.avatar}<i>{profile.accessory}</i></span><span className="vm-companion-pet">{profile.pet}</span><span className="vm-companion-caption">⭐ {levelFromXP(profile.xp)} · 🪙 {profile.coins||0}</span></button><span className={`vm-companion-sync ${status}`} title={detail} aria-label={detail||'Trạng thái đồng bộ'}>{status==='synced'?'☁️':status==='connecting'?'↻':status==='offline'?'📴':status==='denied'?'🔒':'⚠️'}</span>{status==='denied'&&<small className="vm-companion-sync-help" title={detail}>Firebase cần cấp quyền</small>}</div>;
}
