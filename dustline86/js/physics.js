// Physics-facing utilities. The actual tire integration lives in Car so it can
// remain reusable by AI/ghost cars later. This module handles timing and surface data.
export function formatTime(seconds){
  if(!Number.isFinite(seconds))return "--:--.---";
  const m=Math.floor(seconds/60),s=seconds-m*60;
  return `${String(m).padStart(2,"0")}:${s.toFixed(3).padStart(6,"0")}`;
}
export function wrap01(x){return ((x%1)+1)%1}
export function crossedFinish(prevProgress,nextProgress){
  return prevProgress>.82 && nextProgress<.18;
}
export function crossedLapForward(prevProgress,nextProgress){
  return prevProgress>.92 && nextProgress<.08;
}
