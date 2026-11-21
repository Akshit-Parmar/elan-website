export const applicationMessages={
  "new": "Thank you for applying to the Élan Summit 2027 organising committee. We have received your application. You can follow its progress here.",
  "under_review": "Your application is now under review. Our team is looking through your answers and department preferences. We will update you when there is a decision or a next step.",
  "shortlisted": "You have been shortlisted for the Élan Summit 2027 organising committee. We would like to take your application forward. Interview details or further instructions will appear here once confirmed. You do not need to submit another application.",
  "interview": "We would like to invite you to an interview for the Élan Summit 2027 organising committee. Choose a suitable time from the available slots using the booking link below. Please book with the same name and email address you used in your application.",
  "waitlisted": "Your application is on the waiting list. We have not confirmed an organising role for you at this stage. If a suitable place becomes available, we will update you here and by email.",
  "selected": "You have been selected for the Élan Summit 2027 organising committee. Your confirmed department and onboarding details will be shared with you. Open the organiser workspace once your assigned access is active.",
  "not_selected": "Thank you for the time and effort you put into your application. We will not be taking it forward for the Élan Summit 2027 organising committee. We appreciate your interest in being part of the team."
};
export const isAutomaticMessage=value=>Object.values(applicationMessages).includes(value);
export const interviewBookingURL="https://calendar.app.google/b2bKN2LUkKdZ4sQY7";

export function applicantStageMessage(a){
 const legacy='Your application has reached the interview stage. Once your invitation is published, your interview time and joining instructions will appear here. Please confirm your attendance when those details are available.';
 const automatic=!a.message||isAutomaticMessage(a.message)||a.message===legacy;
 if(!automatic)return a.message;
 if(a.stage==='interview'&&a.interview_at)return 'Your interview is scheduled. Review the time and joining instructions below, then confirm that the recorded details work for you.';
 return applicationMessages[a.stage]||'';
}
