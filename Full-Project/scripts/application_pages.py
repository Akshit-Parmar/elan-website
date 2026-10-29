from html import escape
ROUTES={
 'portal/login.html':('login','Your next chapter.','Sign in or create your Élan account.'),
 'portal/set-password.html':('password','Make it yours.','Choose a new password for your account.'),
 'portal/link-expired.html':('login','Let’s get you back.','Request a new confirmation or password recovery email.'),
 'portal/dashboard.html':('dashboard','Your Élan.','Registrations, updates and everything you need for the summit.'),
 'portal/ticket.html':('dashboard','Your registrations.','Your registration reference, participants and payment status.'),
 'portal/announcements.html':('dashboard','News from the team.','Your registrations and the latest published announcements.'),
 'portal/portal-schedule.html':('schedule','Know your next move.','The published programme for your edition.'),
 'portal/participant-guide.html':('guide','Before you arrive.','Prepare for your Crisis Command experience.'),
 'portal/index.html':('dashboard','Your Élan.','Registrations, updates and everything you need for the summit.'),
 'portal/profile.html':('profile','A little about you.','Keep your contact details up to date.'),
 'portal/tickets.html':('dashboard','Your registrations.','View your delegates, payment status and admission details.'),
 'portal/schedule.html':('schedule','Know your next move.','The published programme for your edition.'),
 'portal/flagship.html':('dashboard','Ready for the council.','Find your Crisis Command allocations in your registration below.'),
 'portal/report.html':('submissions','Put your thinking forward.','Submit your reports and download your previous submissions.'),
 'portal/help-desk.html':('support','A person, when you need one.','Send a question and follow the team’s reply here.'),
 'register.html':('register','Take your place.','Individual registration and school delegations for the next edition.'),
 'pay.html':('dashboard','Your registration.','Review payment and confirmation status in your account.'),
 'admin.html':('admin','Behind the scenes.','The Élan organiser workspace.'),
}
def app_page(mode,title,description):
 return f'''<main id="main" class="app-shell wrap" data-app="{mode}"><header class="app-heading"><p class="section-label">ÉLAN / {'ORGANISER WORKSPACE' if mode=='admin' else 'YOUR ACCOUNT'}</p><h1>{escape(title)}</h1><p>{escape(description)}</p></header><nav class="app-nav" aria-label="Account navigation"><a href="/portal/index.html">Overview</a><a href="/register.html">Register</a><a href="/portal/profile.html">Profile</a><a href="/portal/schedule.html">Programme</a><a href="/portal/report.html">Submissions</a><a href="/portal/help-desk.html">Help desk</a><a id="admin-link" href="/admin.html" hidden>Organiser workspace</a><button id="sign-out" hidden>Sign out</button></nav><p id="app-status" role="status" aria-live="polite">Loading your workspace…</p><div id="app-content"></div></main>'''
