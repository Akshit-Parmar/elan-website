const clean=v=>String(v||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const stamp=v=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export function interviewCalendar({id,interview_at,duration_minutes=30,instructions=''}){
 if(!Number.isFinite(Date.parse(interview_at))||!Number.isInteger(duration_minutes)||duration_minutes<5||duration_minutes>180)throw Error('Interview details unavailable');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Elan Summit//Interviews//EN','BEGIN:VEVENT','UID:'+clean(id)+'@elansummit.com','DTSTAMP:'+stamp(Date.now()),'DTSTART:'+stamp(interview_at),'DTEND:'+stamp(Date.parse(interview_at)+duration_minutes*60000),'SUMMARY:Élan OC interview','DESCRIPTION:'+clean(instructions),'END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
export function downloadInterview(a){const url=URL.createObjectURL(new Blob([interviewCalendar(a)],{type:'text/calendar;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='Elan-interview.ics';link.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
