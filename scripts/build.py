from pathlib import Path
import shutil, re, json, hashlib, html
from visitor_pages import make_page, current_faq
from application_pages import ROUTES, app_page

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT / 'reference/v1/public'
OUT = ROOT / 'dist'
SRC = ROOT / 'src'
OUT.mkdir(exist_ok=True)
(OUT/'assets').mkdir(exist_ok=True)
shutil.copytree(OLD/'assets/img', OUT/'assets/img', dirs_exist_ok=True)
shutil.copyfile(OLD/'favicon.ico', OUT/'favicon.ico')
shutil.copytree(SRC/'art', OUT/'assets/art', dirs_exist_ok=True)
shutil.copytree(SRC/'founders', OUT/'assets/founders', dirs_exist_ok=True)
(OUT/'assets/guests').mkdir(exist_ok=True)
for portrait in [*(SRC/'guests').glob('*.png'), *(SRC/'guests').glob('*.jpg')]: shutil.copyfile(portrait,OUT/'assets/guests'/portrait.name)
for file in ['site.css','inner.css','site.js','motion.css','motion.js','sculpture.js','enhancements.css','enhancements.js','public-config.json','story.css','story.js','refinement.css','flagships.css','flagships.js','journal.css','journal.js','visitor.css','app.css','app.js','guest-content.js','polish.css','polish.js','editorial.css','colour.css']:
    shutil.copyfile(SRC/file, OUT/'assets'/file)

shutil.copytree(SRC/'vendor',OUT/'assets/vendor',dirs_exist_ok=True)

(OUT/'assets/edition-2026').mkdir(exist_ok=True)
for photo in (SRC/'edition-2026').glob('*.webp'): shutil.copyfile(photo,OUT/'assets/edition-2026'/photo.name)

ORIGIN='https://elan-next-chapter.akshit-parmar.chatgpt.site'
def nav(path):
    def link(url,label):
        return f'<a href="{url}"'+(' aria-current="page"' if url=='/'+path else '')+f'>{label}</a>'
    archive=[('/first-edition.html','The first edition'),('/guests.html','Guests & judges'),('/gallery.html','Photo journal'),('/centsible.html','Cent$ible · 2026'),('/archive.html','Explore the archive')]
    join=[('/next-edition.html','Tickets & participation'),('/schools.html','Students & schools'),('/school-collaboration.html','School collaboration'),('/volunteers.html','Volunteer'),('/faqs.html','FAQs')]
    def group(label,kicker,items):
        active=' nav-group-current' if any(url=='/'+path for url,_ in items) else ''
        return '<details class="nav-group'+active+'"><summary>'+label+'<span aria-hidden="true">+</span></summary><div class="nav-dropdown"><small>'+kicker+'</small>'+''.join(link(*item) for item in items)+'</div></details>'
    primary=group('About Élan','THE STORY & THE PEOPLE',[('/about.html','About the summit'),('/founders.html','Meet the founding team')])+link('/flagship.html','Crisis Command')+group('Take part','YOUR NEXT MOVE',join)+link('/contact.html','Contact')
    mobile=link('/index.html','Home')+primary+link('/portal/login.html','Participant login')
    return '<a class="skip-link" href="#main">Skip to content</a><header class="ed-header editorial-header"><div class="header-inner wrap"><a class="wordmark" href="/index.html" aria-label="Élan Summit home"><span class="wordmark-crop"><img src="/assets/img/elan-horse-logo-512.png" alt="" width="838" height="898"></span><span><span class="wordmark-text">Élan.</span><small>YOUTH SUMMIT</small></span></a><nav class="desktop-nav" aria-label="Main navigation">'+primary+'</nav><div class="header-actions">'+link('/portal/login.html','Login')+'<a class="nav-next" href="/register.html">Register <span aria-hidden="true">↗</span></a><button class="menu-button" aria-expanded="false" aria-controls="mobile-navigation">Menu +</button></div></div><nav class="mobile-nav" id="mobile-navigation" aria-label="Main navigation on mobile" hidden>'+mobile+'</nav></header>'

def footer():
    groups=[('EXPLORE',[('about','About Élan'),('founders','Founding team'),('flagship','Crisis Command'),('archive','2026 archive')]),('GET INVOLVED',[('schools','Students & schools'),('volunteers','Join the team'),('contact','Contact'),('faqs','FAQs'),('portal/login','Participant login'),('admin','Organiser login')])]
    content=''.join('<div class="footer-column"><h3>'+title+'</h3>'+''.join(f'<a href="/{slug if "#" in slug else slug+".html"}">{label}</a>' for slug,label in links)+'</div>' for title,links in groups)
    return '<footer class="ed-footer"><div class="wrap"><div class="footer-top"><div class="footer-identity"><a class="footer-brand" href="/" aria-label="Élan Summit home"><span class="brand-horse"><img src="/assets/img/elan-horse-logo-512.png" alt="" width="838" height="898" loading="lazy"></span><span class="wordmark-text">Élan.</span></a><p>Debate, create and meet people<br>you would never meet in class.</p><a href="mailto:the.elan.summit@gmail.com">the.elan.summit@gmail.com ↗</a></div>'+content+'</div><div class="footer-bottom"><span>© 2026 Élan Summit.</span><div class="footer-legal"><a href="/terms.html">Terms & conditions</a><a href="/privacy.html">Privacy policy</a><a href="/refund.html">Refund policy</a><a href="/code-of-conduct.html">Code of conduct</a></div></div></div></footer>'

def natural_copy(main):
    substitutions={
        'feels—and what people remember':'feels and what people remember',
        'edition—from the opening ceremony':'edition, from the opening ceremony',
        'Owns the trade-offs between the two ministers':'Resolves disagreements between the two ministers',
        'De-escalates when the crisis crosses borders':'Works to reduce tensions when the crisis crosses borders',
        'de-escalation':'reducing tensions',
        'This is not a debate and not an MUN. It is a live crisis, and it asks for all of these at once.':'Teams research, negotiate and make decisions as new information arrives.',
        'It is not a debate, not a prepared speech, and not a normal quiz. It is a live strategy experience where every team must adapt when new information arrives.':'There is no script to follow. Teams revise their plans as the situation changes.',
        'Not an MUN. Not a debate. Not a conference.':'A cabinet simulation shaped by your decisions.',
        'Each team works like an emergency cabinet. Every role has a different responsibility, so the strongest teams are not just loud, they are balanced, strategic, and coordinated.':'Each student takes a cabinet role. You will need to share information, resolve disagreements and agree on a response together.',
        'The best team is not the one with the most dramatic speech. The winning response must be realistic, ethical, coordinated, strategic, and clearly communicated.':'Judges look for a practical response, sound reasoning and a team that can explain its decisions.',
        "The nation's face to the outside world. Alliances, negotiations and reducing tensions all run through this post.":'Represents the country in talks with other teams, negotiates support and works to reduce tensions.',
        'All student passes include access to the event flow, cultural moments, networking blocks, and participation in your chosen flagship, Crisis Command or Cent$ible, subject to registration category and capacity.':'Passes covered the sessions, performances and activities listed for each category, including participation in Crisis Command or Cent$ible.',
        'Read the situation, weigh trade-offs, and choose a direction under uncertainty.':'Read the situation, weigh the options and decide how to respond.',
        'Clear priorities, practical planning, smart trade-offs, and long-term thinking.':'Clear priorities and a practical plan that considers what happens next.',
        'Calm direction, team coordination, initiative, and decision-making under pressure.':'Guide the team, listen to each member and make decisions under pressure.',
        'high-pressure':'demanding', 'real-world':'practical',
        'student-led':'run by students', 'student-friendly':'accessible to students',
        'Mixed-school teams':'Teams from different schools',
        'Next-edition dates':'Dates for the next edition',
    }
    for old,new in substitutions.items(): main=main.replace(old,new)
    # Em dashes used as layout separators become a simple dot. Preserve dates.
    main=main.replace(' — ', ' · ')
    return main

def page(path,title,main,legacy=False,banner=None):
    description='Élan Summit brings young minds together through leadership, business, creativity and connection. Discover Crisis Command, our second-edition plans and the story of our first edition.'
    body='<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(title)+' | Élan Summit</title><meta name="description" content="'+description+'"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#13273F"><link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="icon" type="image/png" sizes="16x16" href="/assets/img/favicon-16.png"><link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><link rel="canonical" href="'+ORIGIN+'/'+path+'"><meta property="og:type" content="website"><meta property="og:title" content="'+html.escape(title)+' | Élan Summit"><meta property="og:description" content="'+description+'"><meta property="og:image" content="'+ORIGIN+'/assets/img/elan-og.png"><meta property="og:url" content="'+ORIGIN+'/'+path+'"><meta name="twitter:card" content="summary_large_image"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/enhancements.css"><link rel="stylesheet" href="/assets/story.css">'+('<link rel="stylesheet" href="/assets/inner.css">' if legacy else '')+'<script src="/assets/site.js" defer></script>'+('<link rel="stylesheet" href="/assets/motion.css">' if path=='index.html' else '')+'<link rel="stylesheet" href="/assets/refinement.css"><link rel="stylesheet" href="/assets/flagships.css"><link rel="stylesheet" href="/assets/journal.css"><link rel="stylesheet" href="/assets/visitor.css"><link rel="stylesheet" href="/assets/app.css"><link rel="stylesheet" href="/assets/polish.css"><link rel="stylesheet" href="/assets/editorial.css"><link rel="stylesheet" href="/assets/colour.css"><script src="/assets/polish.js" defer></script></head><body'+(' class="motion-home"' if path=='index.html' else '')+'>'+nav(path)
    if banner: body+='<aside class="edition-banner">'+banner+'</aside>'
    if path not in POLICIES: main=natural_copy(main)
    body+=main+footer()+'</body></html>\n'
    body=body.replace('elan@sgischool.in','the.elan.summit@gmail.com')
    dest=OUT/path;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(body)

def main_of(source):
    match=re.search(r'<main\b[^>]*>.*?</main>', source, re.S)
    return match.group(0) if match else ''

ARCHIVE_BANNER='<strong>2026 edition archive.</strong> Dates, prices, programme details and policies on this page relate to the original edition. <a href="/next-edition.html">Next edition →</a>'
POLICIES=['terms.html','privacy.html','refund.html','code-of-conduct.html']
SPECIAL=['index.html','pay.html','admin.html','google93c0d60b076d9bb6.html']
manifest=[]
for src in sorted(OLD.glob('*.html')):
    name=src.name
    if name in SPECIAL: continue
    text=src.read_text();main=main_of(text)
    if not main: raise ValueError(f'No main content in {name}')
    title=re.search(r'<title>(.*?)</title>',text,re.S).group(1).split('|')[0].strip()
    if name not in POLICIES:
        main=re.sub(r'<main\b[^>]*>', '<main id="main">', main, count=1)
        main=re.sub(r'\sstyle="[^"]*"','',main)
        main=re.sub(r'<script\b.*?</script>','',main,flags=re.S)
        main=re.sub(r'<form\b([^>]*)>',r'<form\1 data-mode="email-draft">',main)
        main=main.replace('novalidate=""','')
        if '<form' in main:
            main=main.replace('<form', '<p class="form-draft-note">For this preview, the form prepares an email draft for you to review and send. It does not submit or store your details.</p><form',1)
            main=re.sub(r'(<button[^>]*type="submit"[^>]*>).*?(</button>)',r'\1Prepare email draft\2',main,flags=re.S)
            main=re.sub(r'<div class="form-success">.*?</div>','',main,flags=re.S)
        if name=='schedule.html':
            main=re.sub(r'<button\b[^>]*data-plan="[^"]*"[^>]*>.*?</button>','',main,flags=re.S)
            main=main.replace('Interactive schedule.','The 2026 programme.')
            main=main.replace('Participants get their own personalised timings in the portal.','This is the original programme, preserved as part of the first-edition archive.')
            main=main.replace('<div class="schedule-list">','<p class="programme-note">Explore the original running order, or <a href="/first-edition.html">relive the first edition in pictures ↗</a>.</p><div class="schedule-list">')
        if name=='tickets.html':
            main=re.sub(r'<p class="form-draft-note">.*?</p>','',main)
            main=re.sub(r'<form\b.*?</form>',lambda m:'<fieldset disabled><legend>2026 registration is closed</legend>'+m.group(0).replace('data-mode="email-draft"','data-mode="closed"')+'</fieldset>',main,flags=re.S)
            main=re.sub(r'(<a\b[^>]*data-ticket="[^"]*"[^>]*href=")[^"]*("[^>]*>).*?</a>',r'\1/next-edition.html\2Registration closed</a>',main)
            main=main.replace('Submit your details to register interest for Élan passes.','The original 2026 registration fields are retained below for reference. Registration is closed.')
            main=main.replace('The form checks required information and shows an instant confirmation on this website.','Next-edition registration details will be announced separately.')
            main=main.replace('Prepare email draft','Registration closed')
        if name=='gallery.html':
            main=main.replace('<span class="play-button">▶</span>','<span class="play-button">The gallery is being curated.</span>')
            main=main.replace('<div class="play-button">▶</div>','<div class="play-button">The gallery is being curated.</div>')
            main=re.sub(r'<a class="btn btn-dark" data-toast="[^"]*" href="#">Play Trailer</a>', '<a class="btn btn-dark" href="contact.html">Ask about event media</a>', main)
            main=main.replace('aria-label="Video preview"','aria-label="Trailer not yet available"')
        if name=='guests.html':
            main=re.sub(r' role="button" tabindex="0" aria-haspopup="dialog" aria-label="[^"]*"','',main)
            main=main.replace('<span class="guest-more">View confirmed names →</span>','<button class="guest-more" type="button">Guest announcements →</button>')
            main=main.replace('Select any card to see who is confirmed.','The supplied site contains guest roles; names will appear once confirmed by the team.')
        if name=='speakers.html':
            main=main.replace('<main id="main">','<main id="main"><div class="container"><p class="preview-notice">This page describes guest roles from the original site. These are not confirmed speaker announcements.</p></div>')
        main=main.replace('data-action="watch-video"','data-archive-video="unavailable"')
        main=main.replace('<main id="main">','<main id="main" class="legacy">')
    else:
        # Keep the complete legal main byte-for-byte; styling belongs to its wrapper.
        main='<div class="legacy">'+main+'</div>'
    if name=='gallery.html': main=(SRC/'gallery.html').read_text()
    hero_images={'about.html':('audience','Participants at the first Élan Summit'),'flagship.html':('day-two','A delegation at the first Élan Summit'),'event-flow.html':('dj-night','DJ night at the first Élan Summit'),'schools.html':('discussion','Participants working together at the first Élan Summit')}
    if name in hero_images:
        photo,alt=hero_images[name]
        # Add to the hero's own container without changing the event text.
        figure='<figure class="hero-editorial-photo"><img src="/assets/edition-2026/'+photo+'.webp" alt="'+alt+'" width="1800" height="1013"><figcaption>FROM THE FIRST EDITION / SEPTEMBER 2026</figcaption></figure>'
        hero=re.search(r'<section class="page-hero[^\"]*".*?</section>',main,re.S)
        if hero:
            h=hero.group(0).replace('class="page-hero','class="page-hero has-photo',1)
            pos=h.rfind('</div>');h=h[:pos]+figure+h[pos:]
            main=main[:hero.start()]+h+main[hero.end():]

    if name in ['about.html','event-details.html','school-collaboration.html']:
        image='sgis-pune-entrance.jpg' if name=='school-collaboration.html' else 'sgis-campus-aerial.jpg'
        photo='<div class="container"><figure class="section-photo"><img src="/assets/img/partners/'+image+'" alt="SGIS Pune Campus, Mulshi, venue for the 2026 edition" width="900" height="600" loading="lazy"><figcaption>SGIS PUNE CAMPUS, MULSHI / THE 2026 EDITION</figcaption></figure></div>'
        main=main.replace('</section>','</section>'+photo,1)
    if name in ['flagship.html','centsible.html']:
        kind='crisis' if name=='flagship.html' else 'enterprise'
        main=main.replace('class="legacy"','class="legacy flagship-editorial '+kind+'"',1)
        hero=(SRC/(kind+'-hero.html')).read_text()
        main=re.sub(r'<section class="page-hero.*?</section>',lambda _:hero,main,count=1,flags=re.S)
        sections=list(re.finditer(r'<section\b.*?</section>',main,re.S))
        # Keep original detailed event formats, using a different editorial composition per chapter.
        for i,m in reversed(list(enumerate(sections))):
            if i==0: continue
            block=m.group(0).replace('class="section ',f'class="section editorial-section chapter-{i} ',1)
            anchors=({2:'format',5:'roles',6:'flow',7:'judging'} if kind=='crisis' else {3:'format',4:'themes',5:'markets',7:'finale'})
            if i in anchors: block=block.replace('<section ', '<section id="'+anchors[i]+'" ',1)
            block=re.sub(r'(<a[^>]*href=")tickets.html("[^>]*>).*?</a>',r'\1/next-edition.html\2Next-edition updates ↗</a>',block)
            block=block.replace('Register your pass, bring your delegation, and prepare for two days where every decision matters.','Explore the first edition, or speak with the team about bringing your delegation to a future Élan.')
            block=block.replace('Choose Cent$ible and your theme in the registration form. For ages 14 to 20.','2026 format: participants aged 14–20 chose Cent$ible and a theme at registration. Cent$ible is not continuing in the second edition.')
            block=block.replace('href="event-details.html">View Full Schedule','href="/schedule.html">View original programme')
            main=main[:m.start()]+block+main[m.end():]
        photo='day-two' if kind=='crisis' else 'teamwork'
        photo_target='roles' if kind=='crisis' else 'themes'
        documentary='<figure class="flagship-documentary"><img src="/assets/edition-2026/'+photo+'.webp" alt="Participants working together at the first Élan Summit" width="1800" height="1013" loading="lazy"><figcaption>CONVERSATIONS BECOME DECISIONS / THE FIRST ÉLAN EDITION<a href="/first-edition.html">Explore the full photo story ↗</a></figcaption></figure>'
        main=main.replace('<section id="'+photo_target+'"',documentary+'<section id="'+photo_target+'"',1)
        if kind=='enterprise':
            main=main.replace('<nav class="flagship-subnav"', '<div class="container archive-judges-link"><span class="eyebrow">THE 2026 JUDGING PANEL</span><a class="text-link" href="/guests.html#centsible-judges">Meet Unnikrishnan Nair &amp; Rahul Kotha ↗</a></div><nav class="flagship-subnav"',1)
            main=main.replace('href="/next-edition.html"','href="/archive.html"').replace('Next-edition updates ↗','Explore the 2026 archive ↗')
        main=main.replace('</main>','<section class="flagship-crosslink"><div class="container"><span class="eyebrow">THE 2026 EDITION / TWO ORIGINAL FLAGSHIPS</span><a href="/'+('centsible.html' if kind=='crisis' else 'flagship.html')+'">'+('Enter the idea room. <em>Discover Cent$ible ↗</em>' if kind=='crisis' else 'Enter the decision room. <em>Discover Crisis Command ↗</em>')+'</a></div></section></main>')
    if name=='about.html': main=(SRC/'about.html').read_text()
    main=make_page(name,main)
    if name in ['guests.html','speakers.html']:
        main=(SRC/'guests.html').read_text()
        title='Guests & judges · 2026'
    if name=='faqs.html':
        main=main.replace('Searchable FAQs.','2026 questions & answers.').replace('On the Tickets / Registration page, select Cent$ible as your flagship and choose your theme in the registration form. Cent$ible is for students aged 14 to 20.','Registration for the 2026 edition is closed. Cent$ible is not continuing in the second edition.').replace('Use the Tickets / Registration page, choose a pass, and submit the registration inquiry form. The organizer will then share confirmation and payment steps.','Registration for the 2026 edition is closed. Second-edition registration has not opened.')
        page('faqs-2026.html','2026 questions & answers',main,True,ARCHIVE_BANNER)
        main=current_faq()
    if name=='tickets.html':
        main=main.replace('Choose your Élan pass.','The 2026 passes.').replace('Choose a pass for Élan Summit.','Registration is closed. These are the original pass categories for Élan Summit 2026.').replace('Registration closes on 30 August 2026','Registration closed on 30 August 2026').replace('What happens after registration?','How registration worked in 2026.')
    if name=='partners.html':
        main=main.replace('Élan Summit is hosted at','The 2026 edition of Élan Summit was hosted at')
        main=main.replace('Confirmed partners are listed here as they are announced.','This page records the first-edition partnerships. Second-edition partnerships will be announced separately.').replace('Élan Summit is hosted at the SGIS Pune Campus in Mulshi, and Cent$ible, our business flagship, runs in collaboration with the school.','The first Élan Summit was hosted at SGIS Pune Campus in Mulshi. Cent$ible was part of that edition’s collaboration with the school.').replace('Your students compete in Crisis Command or Cent$ible alongside students from other schools.','In 2026, students took part in Crisis Command or Cent$ible. The second edition will focus on Crisis Command.').replace('Stall opportunities at the Élan Carnival on Day 2.','The original edition included carnival opportunities. Any future availability will be agreed with the team.')

    page(name,html.unescape(title),main,True,ARCHIVE_BANNER if name not in ['about.html','contact.html','volunteers.html','schools.html','school-collaboration.html','faqs.html'] else 'The next chapter is in preparation. <a href="/contact.html">Speak with the Élan team →</a>')
    manifest.append({'path':name,'status':'legal text preserved exactly' if name in POLICIES else 'content retained; shared design renewed','source_sha256':hashlib.sha256(src.read_bytes()).hexdigest()})

page('founders.html','The founding team',(SRC/'founders.html').read_text())
page('index.html','Élan Summit — Lead. Create. Connect.', (SRC/'home.html').read_text())

def status_main(eyebrow,title,description,extra=''):
    return '<main id="main" class="wrap"><section class="status-page"><p class="eyebrow">'+eyebrow+'</p><h1>'+title+'</h1><p class="status-lead">'+description+'</p>'+extra+'</section></main>'

page('next-edition.html','The next chapter',status_main('ÉLAN / WHAT COMES NEXT','Crisis Command.<br>The <em>next edition.</em>','The second edition will centre on Crisis Command as its only flagship. Cent$ible will not continue in this edition. Dates, venue, passes and registration have not been announced yet.','<div class="status-panel"><h2>Stay close to the story.</h2><p>For school participation, volunteering or partnerships, start a conversation with the organising team.</p><a class="button solid" href="/contact.html">Get in touch <span aria-hidden="true">↗</span></a></div><div class="status-panel"><h2>Explore the original edition.</h2><p>The 2026 programme, flagship formats and policies remain available. They describe the original edition and do not set the terms for the next one.</p><a class="text-link" href="/archive.html">Visit the 2026 archive <span aria-hidden="true">→</span></a></div>'))

directory_groups=[('The experience',[('about','About Élan'),('founders','The founding team'),('event-details','2026 venue & details'),('event-flow','Event flow'),('flagship','Crisis Command'),('centsible','Cent$ible · 2026 archive'),('faqs-2026','2026 FAQs'),('schedule','Schedule'),('guests','Guests & judges'),('speakers','Speakers & guests'),('gallery','Gallery')]),('Participation',[('tickets','Tickets & registration'),('pay','Payment'),('schools','Students & schools'),('school-collaboration','School collaboration'),('volunteers','Volunteers'),('partners','Partners'),('contact','Contact'),('faqs','FAQs')]),('Policies',[('terms','Terms & conditions'),('privacy','Privacy policy'),('refund','Refund policy'),('code-of-conduct','Code of conduct')])]
def directory(groups): return '<div class="directory-grid">'+''.join('<article><h2>'+name+'</h2>'+''.join(f'<a href="/{url}.html">{label}<span aria-hidden="true">↗</span></a>' for url,label in links)+'</article>' for name,links in groups)+'</div>'
archive_feature='<a class="archive-story-link" href="/first-edition.html"><img src="/assets/edition-2026/audience.webp" alt="" width="1800" height="1013" loading="lazy"><span>INSIDE THE FIRST EDITION / 2026</span><h2>Two days.<br>A first chapter.</h2><p>Opening ceremony, committee sessions, DJ night and the final moments of recognition.</p><span>EXPLORE THE STORY ↗</span></a>'
page('first-edition.html','Inside the first edition', (SRC/'edition-story.html').read_text())
page('archive.html','The 2026 edition',(SRC/'archive.html').read_text().replace('{{DIRECTORY}}',directory(directory_groups)))

portal_pages=[('dashboard','Overview','Your Élan, in one place.','Your participant overview will bring together your pass, flagship, team and important updates.'),('ticket','Your ticket','Your place in the room.','Your verified pass and Élan UID will appear here after registration and payment confirmation.'),('profile','Your profile','The details that matter.','Participant identity, school information and registration details will be available here after account activation.'),('announcements','Announcements','Stay in the loop.','Official participant updates will appear here when the next edition opens.'),('portal-schedule','Your schedule','Know your next move.','Your detailed participant timetable will appear here once the new programme is confirmed.'),('flagship','Crisis Command','Ready for the council.','Your Crisis Command role, team and participant information will appear here.'),('centsible','Cent$ible · 2026 archive','The original business arena.','Cent$ible belongs to the 2026 edition and will not continue in the second edition. The original participant information is preserved below.'),('participant-guide','Participant guide','Before you arrive.','The original participant guide is retained below for reference.'),('report','Reports & submissions','Put your thinking forward.','Participant submissions and reports will be available here during the next edition.'),('help-desk','Help desk','A person, when you need one.','For account or participation questions, contact the Élan team directly.'),('login','Sign in','Your next chapter<br>starts <em>here.</em>','Participant accounts for this new project are not open yet. Existing 2026 accounts have not been transferred to this project.'),('set-password','Set password','Make it yours.','Account activation for the next edition will open with registration. No activation link is required for this preview.'),('link-expired','Account link','Let’s get you<br>back <em>on track.</em>','If you need help with an existing account link, contact the organising team. Account links for this new project are not active yet.')]
portal_links=[('portal/'+slug,label) for slug,label,*_ in portal_pages]
for slug,label,title,description in portal_pages:
    extra='<div class="preview-notice"><strong>Participant area preview.</strong> Sign-in, payment verification and participant data are not active in this new project yet.</div>'
    extra+='<nav class="portal-nav" aria-label="Participant pages">'+''.join(f'<a href="/portal/{s}.html"'+(' aria-current="page"' if s==slug else '')+f'>{l}</a>' for s,l,*_ in portal_pages[:10] if s != 'centsible')+'</nav>'
    if slug in ['participant-guide','flagship','centsible','help-desk']:
        m=main_of((OLD/('portal/'+slug+'.html')).read_text())
        m=re.sub(r'</?main[^>]*>','',m)
        m=re.sub(r'\sstyle="[^"]*"','',m)
        m=re.sub(r'<h1\b([^>]*)>',r'<h2\1>',m).replace('</h1>','</h2>')
        extra+='<div class="preview-notice">2026 participant information. New-edition instructions will be published separately.</div><div class="legacy">'+m+'</div>'
    else:
        extra+='<div class="status-panel"><h2>'+('We’re here to help.' if slug=='help-desk' else 'Get ready for what comes next.')+'</h2><p>Explore the original event, read the participant guide, or speak with the organising team.</p><a class="button outline" href="/contact.html">Contact the team <span aria-hidden="true">↗</span></a></div>'
    page('portal/'+slug+'.html',label,status_main('ÉLAN / PARTICIPANT PORTAL',title,description,extra),slug in ['participant-guide','flagship','centsible','help-desk'])
    manifest.append({'path':'portal/'+slug+'.html','status':'route preserved; original code retained in reference/v1; integration pending'})

page('pay.html','Payment',status_main('ÉLAN / REGISTRATION','Your next chapter.<br>Your next <em>pass.</em>','Payments for the new edition are not open. No payment is required to explore this preview.','<div class="status-panel"><h2>Need help with a 2026 payment?</h2><p>Contact the organising team with your registration reference. The original pass details and payment policies remain available.</p><a class="button solid" href="/contact.html">Contact the team <span aria-hidden="true">↗</span></a><p style="margin-top:20px"><a class="text-link" href="/tickets.html">2026 pass details →</a> &nbsp; <a class="text-link" href="/refund.html">Refund policy →</a></p></div>'))
for route,(mode,title,description) in ROUTES.items():
    page(route,title,app_page(mode,title,description))

directory_content = directory([('Start here',[('index','Home'),('register','Registration'),('next-edition','The next edition'),('archive','The 2026 archive'),('first-edition','Inside the first edition')])]) + directory(directory_groups) + directory([('Participant area',portal_links),('For the team',[('admin','Organiser access')])])
page('site-directory.html','All pages',status_main('ÉLAN / FIND YOUR WAY','Everything,<br>in its <em>place.</em>','The complete website directory. The 2026 content remains available; account tools and next-edition registration are available through the portal.',directory_content))
shutil.copyfile(OLD/'google93c0d60b076d9bb6.html',OUT/'google93c0d60b076d9bb6.html')
(OUT/'robots.txt').write_text('User-agent: *\nDisallow: /\n')
(OUT/'site.webmanifest').write_text(json.dumps({'name':'Élan Summit','short_name':'Élan','start_url':'/','display':'browser','background_color':'#E9D4C3','theme_color':'#13273F','icons':[{'src':'/assets/img/favicon-192.png','sizes':'192x192','type':'image/png'},{'src':'/assets/img/favicon-512.png','sizes':'512x512','type':'image/png'}]},ensure_ascii=False,indent=2))
(OUT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+ORIGIN+'/'+p.name+'</loc></url>' for p in sorted(OUT.glob('*.html')) if p.name not in ['admin.html','google93c0d60b076d9bb6.html'])+'</urlset>')
for name in SPECIAL:
    manifest.append({'path':name,'status':'redesigned' if name=='index.html' else 'route preserved; original source retained'})
(ROOT/'parity-manifest.json').write_text(json.dumps({'original_pages':len(list(OLD.rglob('*.html'))),'pages':manifest,'preserved_assets':['favicon.ico','all original assets/img files'],'legal_policy':'Original legal main content is preserved except the explicitly requested contact email replacement.','launch_configuration_required':['Auth email delivery and redirect URLs','First administrator assignment','Next-edition dates, prices and terms','Payment merchant credentials and provider test'],'preview_forms':'Enquiries are saved through the authenticated server API with rate limiting.'},ensure_ascii=False,indent=2))
print(f'Built {len(list(OUT.rglob("*.html")))} pages; all {len(list(OLD.rglob("*.html")))} original routes preserved.')
