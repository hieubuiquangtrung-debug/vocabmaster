import { useEffect, useState } from 'react';
import './arcade-rewards.css';

type Profile = { avatar: string; accessory: string; pet: string; petName: string; xp: number; food: number; fed: number; awards: string[]; claims: string[] };
const AVATARS = ['🦊','🐱','🐰','🐻','🐼','🐸','🐧','🦄'];
const ACCESSORIES = ['✨','🎀','👑','🧢','🌈','⭐'];
const PETS = ['🐣','🐶','🐹','🐲'];
const initial = (): Profile => ({avatar:'🦊',accessory:'✨',pet:'🐣',petName:'Buddy',xp:0,food:0,fed:0,awards:[],claims:[]});
const key = (code:string) => `vm_arcade_player_v1_${encodeURIComponent(code.trim())}`;
function read(code:string):Profile { try { const raw = JSON.parse(localStorage.getItem(key(code)) || 'null') as Partial<Profile>|null; const def=initial(); return raw && typeof raw==='object' ? {...def,...raw, xp:Number(raw.xp)||0,food:Number(raw.food)||0,fed:Number(raw.fed)||0,awards:Array.isArray(raw.awards)?raw.awards:[],claims:Array.isArray(raw.claims)?raw.claims:[]} : def; } catch {return initial();} }
function write(code:string, profile:Profile) { try {localStorage.setItem(key(code),JSON.stringify(profile));window.dispatchEvent(new CustomEvent('vm-arcade-player-update',{detail:code}));}catch {/* browser storage blocked */} }
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
 write(code,{...profile,xp,food:profile.food+1,awards,claims:[...profile.claims.slice(-249),claim]});
}
const levelFromXP=(xp:number)=>Math.floor(Math.sqrt(xp/50))+1;
export function ArcadePlayerHub({studentCode}:{studentCode:string}) {
 const [profile,setProfile]=useState<Profile>(()=>read(studentCode));
 const [tab,setTab]=useState<'avatar'|'pet'>('avatar');
 const [notice,setNotice]=useState('');
 useEffect(()=>{const refresh=()=>setProfile(read(studentCode));refresh();window.addEventListener('vm-arcade-player-update',refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener('vm-arcade-player-update',refresh);window.removeEventListener('storage',refresh);};},[studentCode]);
 const update=(change:Partial<Profile>)=>{const next={...read(studentCode),...change};setProfile(next);write(studentCode,next);};
 const level=levelFromXP(profile.xp);const nextXP=50*level*level;const prevXP=50*(level-1)*(level-1);const progress=Math.min(100,Math.round((profile.xp-prevXP)/(nextXP-prevXP)*100));
 return <section className="vm-player" aria-label="Avatar, XP và thú cưng">
  <div className="vm-player-top"><div><span className="vm-player-eyebrow">✨ MY LITTLE ARCADE</span><h3>Nhân vật của bạn</h3><p>Chơi, học và chăm sóc người bạn nhỏ!</p></div><div className="vm-player-level"><b>⭐ Level {level}</b><small>{profile.xp} XP</small><div className="vm-player-meter"><span style={{width:`${progress}%`}}/></div><small>Còn {nextXP-profile.xp} XP để lên cấp</small></div></div>
  <div className="vm-player-columns"><div className="vm-player-avatar-card"><div className="vm-player-character"><span className="vm-player-accessory">{profile.accessory}</span><span className="vm-player-avatar">{profile.avatar}</span></div><div className="vm-player-tabs"><button type="button" className={tab==='avatar'?'selected':''} onClick={()=>setTab('avatar')}>🎨 Avatar Studio</button><button type="button" className={tab==='pet'?'selected':''} onClick={()=>setTab('pet')}>🐾 My Pet</button></div>
   {tab==='avatar'?<><p className="vm-player-hint">Chọn nhân vật yêu thích</p><div className="vm-player-options">{AVATARS.map(a=><button key={a} type="button" aria-label={`Chọn avatar ${a}`} aria-pressed={profile.avatar===a} className={profile.avatar===a?'selected':''} onClick={()=>update({avatar:a})}>{a}</button>)}</div><p className="vm-player-hint">Phụ kiện</p><div className="vm-player-options">{ACCESSORIES.map(a=><button key={a} type="button" aria-label={`Chọn phụ kiện ${a}`} aria-pressed={profile.accessory===a} className={profile.accessory===a?'selected':''} onClick={()=>update({accessory:a})}>{a}</button>)}</div></>:<><p className="vm-player-hint">Chọn thú cưng</p><div className="vm-player-options">{PETS.map(p=><button key={p} type="button" aria-label={`Chọn thú cưng ${p}`} aria-pressed={profile.pet===p} className={profile.pet===p?'selected':''} onClick={()=>update({pet:p})}>{p}</button>)}</div><label className="vm-player-name">Tên thú cưng <input maxLength={18} value={profile.petName} onChange={e=>update({petName:e.target.value})}/></label></>}
  </div><div className="vm-player-pet-card"><span className="vm-player-eyebrow">🐾 MY STUDY PET</span><div className="vm-player-pet-emoji">{profile.pet}</div><h4>{profile.petName || 'Buddy'}</h4><p>🥕 Thức ăn: <strong>{profile.food}</strong> · Đã cho ăn: {profile.fed}</p><button type="button" disabled={profile.food<1} onClick={()=>{if(profile.food<1)return;update({food:profile.food-1,fed:profile.fed+1});setNotice('Yummy! Thú cưng vui lắm! 💖');}}>🥕 Cho ăn</button><small>{notice || 'Hoàn thành hoạt động có chấm điểm để nhận thức ăn và XP (tối đa một lần mỗi hoạt động/ngày).'}</small></div></div>
  <div className="vm-player-badges"><strong>🏅 Huy hiệu</strong><span className={profile.awards.includes('first50')?'earned':''}>🌟 50 XP</span><span className={profile.awards.includes('level3')?'earned':''}>🚀 200 XP</span><span className={profile.awards.includes('perfect')?'earned':''}>💯 Perfect Score</span></div>
  <small className="vm-player-storage">Tiến độ Avatar, XP và Pet hiện được lưu trên trình duyệt này theo mã học sinh; chưa đồng bộ Firebase.</small>
 </section>;
}
