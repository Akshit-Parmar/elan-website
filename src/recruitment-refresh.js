// Fetch and apply are separated so a user who starts typing mid-request is protected.
export function recruitmentRefresh({current,blocked,revision,fetchData,apply,note,interval=60000}){
 let running=false;
 async function refresh(manual=false){
  if(!current()){clearInterval(timer);return;}
  if(running)return;
  if(blocked()){note('Live updates paused while you have unsaved changes or a save is in progress.');return;}
  const before=revision();running=true;
  try{const data=await fetchData();if(!current())return;if(blocked()||before!==revision()){note('New data is available. Finish saving your review, then refresh.');return;}await apply(data);if(current())note('Updated '+new Date().toLocaleTimeString()+'. Checks for changes every minute.');}
  catch{if(current())note('Could not refresh. Your current information and unsaved work are still here. Try Refresh now.');}
  finally{running=false;}
 }
 const timer=setInterval(()=>{if(!current()){clearInterval(timer);return;}if(typeof document==='undefined'||!document.hidden)refresh();},interval);timer.unref?.();
 return {refresh,stop:()=>clearInterval(timer)};
}
