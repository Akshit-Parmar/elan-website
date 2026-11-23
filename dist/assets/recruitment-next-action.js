export function nextAction(review={},now=Date.now()){
 const stage=review.stage||'new';
 if(stage==='interview'){
  if(review.interview_reply==='reschedule')return {title:'Arrange another time',text:'Read their request and coordinate the change through the original Calendar booking.'};
  if(!review.interview_published||!review.interview_at)return {title:'Check their booking',text:'The booking link has been sent. Check Calendar or the sync status before following up.'};
  if(Date.parse(review.interview_at)+(review.duration_minutes||30)*60000<=now)return {title:'Record interview feedback',text:'Record what happened and agree the next step. A passed time does not mean the interview took place.'};
  return {title:'Prepare for the interview',text:'Read the application, check joining details and agree who will lead the conversation.'};
 }
 return {new:{title:'Read and review',text:'Read their answers and record an initial assessment.'},under_review:{title:'Complete the review',text:'Check department feedback and decide whether to shortlist, invite or hold the application.'},shortlisted:{title:'Agree the next step',text:'If ready to interview, set the stage to Interview and save to send the booking link.'},waitlisted:{title:'Review available places',text:'Keep this application on hold until a suitable role becomes available.'},selected:{title:'Prepare their welcome',text:'Check their reporting person, responsibilities, first task and joining information.'},not_selected:{title:'Review the decision record',text:'The decision is recorded. Check email delivery if the applicant reports a missing update.'}}[stage]||{title:'Review application',text:'Check the current stage and any outstanding actions.'};
}
