// Synthesized sound: no downloaded assets, safe when autoplay is blocked.
type SoundKind='correct'|'wrong'|'win'|'tap';
const KEY='vm_arcade_sound_v1';
export function soundEnabled(){try{return localStorage.getItem(KEY)!=='off';}catch{return true;}}
export function setSoundEnabled(value:boolean){try{localStorage.setItem(KEY,value?'on':'off');}catch{/* ignore */}window.dispatchEvent(new Event('vm-arcade-sound-change'));}
let ctx:AudioContext|null=null;
export function playArcadeSound(kind:SoundKind){if(!soundEnabled()||typeof window==='undefined')return;try{const AC=window.AudioContext;if(!AC)return;ctx ||= new AC();if(ctx.state==='suspended')void ctx.resume();const tones=kind==='correct'?[523,659,784]:kind==='wrong'?[230,185]:kind==='win'?[523,659,784,1046]:[440];tones.forEach((frequency,i)=>{const oscillator=ctx!.createOscillator();const gain=ctx!.createGain();const at=ctx!.currentTime+i*.105;oscillator.type=kind==='wrong'?'triangle':'sine';oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.085,at+.015);gain.gain.exponentialRampToValueAtTime(.0001,at+.15);oscillator.connect(gain).connect(ctx!.destination);oscillator.start(at);oscillator.stop(at+.17);});}catch{/* audio unavailable */}}
