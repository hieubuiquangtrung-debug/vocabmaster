import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

export type ArcadeCloudProfile = {
  avatar:string; accessory:string; pet:string; petName:string;
  xp:number; food:number; fed:number; awards:string[]; claims:string[];
  coins?:number; inventory?:string[]; room?:string; updatedAt?:number;
};
const localKey=(code:string)=>`vm_arcade_player_v1_${encodeURIComponent(code.trim())}`;
const isObject=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const valid=(v:unknown):v is ArcadeCloudProfile=>isObject(v)&&typeof v.avatar==='string'&&typeof v.pet==='string'&&typeof v.xp==='number'&&Number.isFinite(v.xp)&&Array.isArray(v.claims);
const readLocal=(code:string):ArcadeCloudProfile|null=>{try{const data:unknown=JSON.parse(localStorage.getItem(localKey(code))||'null');return valid(data)?data:null;}catch{return null;}};
const saveLocal=(code:string,data:ArcadeCloudProfile)=>{localStorage.setItem(localKey(code),JSON.stringify(data));window.dispatchEvent(new CustomEvent('vm-arcade-player-update',{detail:code}));};
const refFor=(db:Firestore,appId:string,code:string)=>doc(db,'artifacts',appId,'public','data','arcade_profiles',encodeURIComponent(code.trim()));
// Last-write-wins for avatar/pet selections; XP and claims are merged monotonically.
function merge(a:ArcadeCloudProfile,b:ArcadeCloudProfile):ArcadeCloudProfile {
 const newer=Number(a.updatedAt||0)>=Number(b.updatedAt||0)?a:b;
 const claims=Array.from(new Set([...a.claims,...b.claims])).slice(-500);
 return {...newer,inventory:Array.from(new Set([...(a.inventory||[]),...(b.inventory||[])])),coins:Math.max(0,Number(newer.coins)||0),xp:Math.max(a.xp,b.xp),fed:Math.max(a.fed,b.fed),awards:Array.from(new Set([...a.awards,...b.awards])),claims,updatedAt:Math.max(Number(a.updatedAt||0),Number(b.updatedAt||0))};
}
export async function pullArcadeProfile(db:Firestore,appId:string,code:string):Promise<void>{
 const snapshot=await getDoc(refFor(db,appId,code));const local=readLocal(code);
 if(snapshot.exists()){
  const remote:unknown=snapshot.data().profile;
  if(!valid(remote))throw new Error('Invalid cloud profile');
  const combined=local?merge(local,remote):remote;
  saveLocal(code,combined);
  if(JSON.stringify(combined)!==JSON.stringify(remote))await setDoc(refFor(db,appId,code),{profile:combined,updatedAt:new Date().toISOString()});
 }else if(local){await setDoc(refFor(db,appId,code),{profile:local,updatedAt:new Date().toISOString()});}
}
export async function pushArcadeProfile(db:Firestore,appId:string,code:string):Promise<void>{
 const local=readLocal(code);if(!local)return;
 const ref=refFor(db,appId,code);const snap=await getDoc(ref);
 const remote:unknown=snap.exists()?snap.data().profile:null;
 const combined=valid(remote)?merge(local,remote):local;
 if(JSON.stringify(local)!==JSON.stringify(combined))saveLocal(code,combined);
 await setDoc(ref,{profile:combined,updatedAt:new Date().toISOString()});
}
