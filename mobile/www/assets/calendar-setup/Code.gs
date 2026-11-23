// Run in the Google account that owns the interview calendar.
// Enable the Advanced Google Calendar service before running setup.
function setupElanCalendar() {
 const p=PropertiesService.getScriptProperties();
 for(const k of ['ELAN_TOKEN','ELAN_CALENDAR','ELAN_TITLE'])if(!p.getProperty(k))throw new Error('Set '+k+' in Script Properties first.');
 Calendar.CalendarList.get(p.getProperty('ELAN_CALENDAR'));
 ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='syncElanCalendar').forEach(t=>ScriptApp.deleteTrigger(t));
 ScriptApp.newTrigger('syncElanCalendar').timeBased().everyMinutes(5).create();
 syncElanCalendar();
}
function syncElanCalendar(){
 const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
 try{
 const p=PropertiesService.getScriptProperties(),calendar=p.getProperty('ELAN_CALENDAR'),prefix=p.getProperty('ELAN_TITLE'),token=p.getProperty('ELAN_TOKEN');
 if(!calendar||!prefix||!token)throw new Error('Calendar setup is incomplete.');
 const request=event=>{const res=UrlFetchApp.fetch('https://aptaodflhiopzjibyyzn.supabase.co/rest/v1/rpc/elan_calendar_receive',{method:'post',contentType:'application/json',headers:{apikey:'sb_publishable_TzzdMGanAxC5O-5KceHlXg_pGUiu5tK'},payload:JSON.stringify({p_token:token,p_calendar:calendar,p_event:event}),muteHttpExceptions:true});if(res.getResponseCode()!==200)throw new Error('Élan sync failed (HTTP '+res.getResponseCode()+'). Check connection settings.');return JSON.parse(res.getContentText());};
 const options={maxResults:100,singleEvents:false,showDeleted:true};
 const sync=p.getProperty('ELAN_SYNC'),page=p.getProperty('ELAN_PAGE');
 if(sync)options.syncToken=sync;else{let since=p.getProperty('ELAN_SINCE');if(!since){since=new Date(Date.now()-86400000).toISOString();p.setProperty('ELAN_SINCE',since);}options.timeMin=since;}
 if(page)options.pageToken=page;
 let data;try{data=Calendar.Events.list(calendar,options);}catch(e){if(String(e).match(/410|sync token|full sync/i)){p.deleteProperty('ELAN_SYNC');p.deleteProperty('ELAN_PAGE');p.deleteProperty('ELAN_SINCE');return;}throw e;}
 for(const e of data.items||[]){if(e.recurrence)continue;if(e.status!=='cancelled'&&!String(e.summary||'').startsWith(prefix))continue;request({id:e.id,updated:e.updated||new Date().toISOString(),status:e.status,summary:e.summary,start:e.start,end:e.end,hangoutLink:e.hangoutLink,location:e.location,attendees:(e.attendees||[]).map(a=>({email:a.email,organizer:!!a.organizer}))});}
 if(data.nextPageToken)p.setProperty('ELAN_PAGE',data.nextPageToken);else{p.deleteProperty('ELAN_PAGE');if(data.nextSyncToken)p.setProperty('ELAN_SYNC',data.nextSyncToken);}
 request({type:'heartbeat'});
 }finally{lock.releaseLock();}
}
function stopElanCalendar(){ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='syncElanCalendar').forEach(t=>ScriptApp.deleteTrigger(t));}

// Retry attention items after correcting their booking or application in Élan.
function retryElanCalendar(){const p=PropertiesService.getScriptProperties();['ELAN_SYNC','ELAN_PAGE','ELAN_SINCE'].forEach(k=>p.deleteProperty(k));syncElanCalendar();}
