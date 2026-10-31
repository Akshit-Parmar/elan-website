"""Search metadata for the public Cloudflare site. No invented event details."""
import html,json
from xml.etree import ElementTree as ET
ORIGIN='https://elansummit.com'
DESCRIPTIONS={
'index.html':'Élan Summit brings students together for Crisis Command, creative activities and new connections. Meet the team and explore plans for the next edition.',
'about.html':'Learn how Élan Summit began and what students can experience through its cabinet simulation, creative activities and school community.',
'founders.html':'Meet Akshit Parmar, founder of Élan Summit, and co-founders Sakshi Baldawa, Prachi Belagali and Jacinth Jebaraj.',
'flagship.html':'Explore Crisis Command at Élan Summit: cabinet roles, crisis scenarios, team decisions and judging. The page documents the 2026 format.',
'next-edition.html':'Follow plans for the next Élan Summit, featuring Crisis Command. Dates, venue, eligibility and registration details will be announced when confirmed.',
'schools.html':'Discuss bringing a school delegation to Élan Summit. Share your group size, coordinator details and questions with the organising team.',
'school-collaboration.html':'Explore how your school can help organise Élan Summit through outreach, coordination, logistics or student leadership.',
'volunteers.html':'Join the conversation about volunteering at Élan Summit. Tell the team about your interests, skills and availability.',
'contact.html':'Contact the Élan Summit team about school participation, volunteering, partnerships or the first edition. Find the director’s contact details here.',
'faqs.html':'Answers to questions about the next Élan Summit, Crisis Command, school participation, volunteering and registration announcements.',
'archive.html':'Explore the Élan Summit 2026 archive: photographs, guests, competitions, programme and original event details from 5 and 6 September in Mulshi, Pune.',
'first-edition.html':'Revisit Élan Summit 2026 through photographs of the opening ceremony, committee sessions, DJ night, closing ceremony and felicitations.',
'guests.html':'Meet the guests, judges and school leaders associated with Élan Summit’s first edition in September 2026.',
'gallery.html':'Browse photographs of the Élan Summit venue and explore the photo story of its first edition at SGIS Pune Campus, Mulshi.',
'partners.html':'Meet the organisations and collaborating schools associated with the first edition of Élan Summit.',
'centsible.html':'Explore Cent$ible, the business competition from Élan Summit 2026. This archived event will not continue in the second edition.',
'event-details.html':'Original dates, venue and practical information for Élan Summit 2026 at SGIS Pune Campus, Mulshi. Archived first-edition information.',
'event-flow.html':'Explore the activities and experience planned for Élan Summit 2026, preserved as part of the first-edition archive.',
'schedule.html':'View the original programme for Élan Summit on 5 and 6 September 2026, including ceremonies, competition sessions and activities.',
'tickets.html':'View archived pass categories and prices for Élan Summit 2026. Registration is closed; these are not prices for the next edition.',
'faqs-2026.html':'Read the original questions and answers for Élan Summit 2026. These archived arrangements do not apply to the next edition.',
'terms.html':'Read the terms and conditions published for Élan Summit 2026, including participation and registration requirements.',
'privacy.html':'Read Élan Summit’s privacy policy and information about the handling of participant and visitor details.',
'refund.html':'Read the refund policy published for Élan Summit 2026. Refer to the applicable edition’s terms before making a payment.',
'code-of-conduct.html':'Read the Élan Summit code of conduct for participants and the event community.',
}
TITLES={'index.html':'Élan Summit | Student Leadership & Crisis Command','founders.html':'Founder & Co-founders | Élan Summit','archive.html':'2026 Archive | Élan Summit','first-edition.html':'Élan Summit 2026 in Pictures','next-edition.html':'Next Edition & Registration Updates | Élan Summit','tickets.html':'2026 Passes & Prices (Archived) | Élan Summit','schedule.html':'2026 Programme (Archived) | Élan Summit'}
def canonical(path):
    return ORIGIN+('/' if path=='index.html' else '/'+path.removesuffix('.html'))
def metadata(path,title):
    indexable=path in DESCRIPTIONS
    description=DESCRIPTIONS.get(path,'Secure account access for Élan Summit participants and authorised organisers.')
    title=TITLES.get(path,title.removesuffix(' | Élan Summit')+' | Élan Summit')
    url=canonical(path)
    robots='index,follow,max-image-preview:large' if indexable else 'noindex,follow'
    return title,description,url,robots

def structured_data(path,title,description):
    if path not in DESCRIPTIONS:return ''
    url=canonical(path)
    org={'@type':'Organization','@id':ORIGIN+'/#organization','name':'Élan Summit','alternateName':'Elan Summit','url':ORIGIN+'/','logo':ORIGIN+'/assets/img/elan-horse-logo-512.png','email':'the.elan.summit@gmail.com'}
    website={'@type':'WebSite','@id':ORIGIN+'/#website','url':ORIGIN+'/','name':'Élan Summit','alternateName':'Elan Summit','inLanguage':'en-IN','publisher':{'@id':org['@id']}}
    page={'@type':'AboutPage' if path in ['about.html','founders.html'] else 'ContactPage' if path=='contact.html' else 'CollectionPage' if path in ['archive.html','gallery.html','guests.html'] else 'WebPage','@id':url+'#webpage','url':url,'name':title,'description':description,'inLanguage':'en-IN','isPartOf':{'@id':website['@id']}}
    graph=[org,website,page]
    if path!='index.html':
        graph.append({'@type':'BreadcrumbList','@id':url+'#breadcrumb','itemListElement':[{'@type':'ListItem','position':1,'name':'Élan Summit','item':ORIGIN+'/'},{'@type':'ListItem','position':2,'name':title.removesuffix(' | Élan Summit'),'item':url}]})
        page['breadcrumb']={'@id':url+'#breadcrumb'}
    return '<script type="application/ld+json">'+json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False).replace('<','\\u003c')+'</script>'

def write_search_files(out):
    ns='http://www.sitemaps.org/schemas/sitemap/0.9';ET.register_namespace('',ns)
    root=ET.Element('{'+ns+'}urlset')
    for path in sorted(DESCRIPTIONS):
        if not (out/path).exists():raise ValueError('Missing sitemap page: '+path)
        entry=ET.SubElement(root,'{'+ns+'}url');ET.SubElement(entry,'{'+ns+'}loc').text=canonical(path)
    ET.indent(root);ET.ElementTree(root).write(out/'sitemap.xml',encoding='utf-8',xml_declaration=True)
    (out/'robots.txt').write_text('User-agent: *\nAllow: /\n\n# Search discovery is enabled. Model training remains disabled.\nUser-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: GPTBot\nDisallow: /\n\nSitemap: '+ORIGIN+'/sitemap.xml\n')
    (out/'llms.txt').write_text('# Élan Summit\n\n> A student summit built around leadership, creative activities and meeting people from other schools.\n\nThe first edition took place on 5 and 6 September 2026 at SGIS Pune Campus, Mulshi, Pune. The next edition will feature Crisis Command. Its dates, venue, eligibility and prices have not been announced. Archived 2026 prices and rules must not be presented as current registration details.\n\n## Official pages\n\n'+''.join('- ['+TITLES.get(p,p.removesuffix('.html').replace('-',' ').title())+']('+canonical(p)+'): '+DESCRIPTIONS[p]+'\n' for p in ['index.html','about.html','next-edition.html','flagship.html','founders.html','contact.html','archive.html','first-edition.html','guests.html','faqs.html'])+'\n## Accounts\n\nParticipant and organiser pages require appropriate account access and are not public reference sources.\n')
    private=['/portal/*','/admin','/admin.html','/pay','/pay.html','/register','/register.html','/speakers','/speakers.html','/site-directory','/site-directory.html']
    (out/'_headers').write_text('\n\n'.join(p+'\n  X-Robots-Tag: noindex, follow' for p in private)+'\n\n/llms.txt\n  Content-Type: text/plain; charset=utf-8\n')
