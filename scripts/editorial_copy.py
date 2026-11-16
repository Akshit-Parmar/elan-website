"""Copy corrections for inherited archive pages; preserve original source and policy text."""
import re

COPY = {
 'event-details.html': [
  ('A focused two-day weekend experience with arrival, stage sessions, competitions, networking, cultural energy, and recognition.','Two days of competition sessions, ceremonies, performances and social activities.'),
  ('Main reporting will be coordinated through the Élan registration desk, with stage, delegation, supporter, and volunteer zones clearly marked.','The venue for the first Élan Summit.'),
  ('A premium student event setting with school-friendly coordination and access planning for local and visiting delegations.','The first edition took place at the Mulshi campus.'),
  ('The main events','The 2026 competitions'),
  ('Crisis Command and Cent$ible sit at the centre of Élan. The event is not only performances and networking. Its main competitive experiences are its two flagships.','The first edition featured two competitions: Crisis Command and Cent$ible.'),
  ('mixed-school teams lead a fictional nation','teams represent a nation'),
  ('A premium interschool experience.','The first-edition format.'),
  ('Élan combines creativity, performance, leadership, school spirit, networking, guest sessions, competitions, volunteer coordination, and flagship moments into one polished event experience.','The 2026 programme combined the two competitions with opening and closing ceremonies, performances and social activities.'),
  ('Who should attend?','Who the event was designed for'),
  ('What the experience includes.','Original pass information.'),
  ('Each pass is designed to include the core student experience while keeping school coordination clear and credible.','The archived pass categories record the original inclusions. They do not describe tickets for the next edition.'),
  ('Clear, safe, and coordinated.','Original entry instructions.'),
 ],
 'centsible.html': [
  ('Compete. Collaborate. Create the business leaders of tomorrow.','Brand building and financial strategy.'),
  ('Build, adapt, pitch, and dominate.','Develop a brand. Present your strategy.'),
  ('BRAND बनाओ is where you create a real startup and pitch it under pressure, with your idea evolving across three rounds the way it draws on Shark Tank, a startup expo, and live business decisions.','In BRAND बनाओ, teams developed a business concept, presented a founder pitch and responded to a crisis tailored to their proposal. The top three teams qualified for the Boardroom Finale.'),
  ('Risk everything and survive the chaos.','Manage a portfolio in a simulated market.'),
  ('NOTE नीति is a live financial simulation where you trade, negotiate, ride out crashes, and make risky calls under pressure, working with real market situations instead of textbook problems.','NOTE नीति combined a simulated trading round with a physical coin-based investment round. Teams managed their capital as the conditions changed.'),
  ('Real business skills, under pressure.','Skills used in the competition.'),
  ('Cent$ible sits between the classroom and the real business world, and it leans on the same skills a founder, a marketer, or an investor uses every day.','The rounds asked teams to apply business concepts through financial decisions, brand proposals and presentations.'),
  ('Turn ideas into ventures and defend them.','Develop a business proposal and explain how it works.'),
  ('Influence an audience and own a narrative.','Define a target customer and a marketing approach.'),
  ('Present, persuade, and pivot on your feet.','Present a proposal and revise it when conditions change.'),
  ('The challenge is built to separate a team that knows business concepts from a team that can actually think like business leaders.','Finalists had to support their recommendation with reasoning and answer questions from the panel.'),
 ],
 'tickets.html': [
  ('All student passes include access to the event flow, cultural moments, networking blocks, and participation in your chosen flagship, Crisis Command or Cent$ible, subject to registration category and capacity.','The original passes covered participation in one of the two competitions and the shared event programme, subject to the pass category.'),
  ('Registration closed on 30 August 2026, or earlier if capacity is reached.','The published registration deadline was 30 August 2026, subject to capacity.'),
  ('A clear path from payment to portal.','The original registration process.'),
  ('Registration is only the start. Here is exactly what happens once you pay, and how your access unlocks.','The steps below describe registration for the 2026 edition. They are retained for reference.'),
  ('Everything unlocks','Participant access'),
 ],
 'partners.html': [
  ('Élan is built with schools, institutions and organisations who believe students should be given real rooms to lead, compete and perform in.','Schools, institutions and organisations that supported the first Élan Summit.'),
  ('and Cent$ible, our business flagship, runs in collaboration with the school.','and the school collaborated on Cent$ible, the first edition’s business competition.'),
  ('where Élan Summit is hosted','where the first Élan Summit took place'),
  ('Announced as they are confirmed.','Partnership updates.'),
  ('Partner schools and organisations appear here once agreements are finalised.','Future partnerships will be listed once confirmed.'),
  ('Your school is credited on the website, in event materials and at the venue across both days.','School credit and event visibility are agreed with the organising team for each collaboration.'),
  ('Support a room full of ambition.','Discuss a partnership.'),
  ('Élan brings students from many schools into one venue for two days. Partners engage with that audience directly, in a premium setting.','Contact the team about sponsorship or a collaboration for the next edition. The scope, costs and agreed recognition are discussed individually.'),
  ('Meaningful presence across the event, materials and the website.','Discuss recognition on the website, event materials and relevant communications.'),
  ('A presence at the venue across both days of the summit.','Any on-site involvement depends on the confirmed venue and programme.'),
  ('Built around you','Agreed scope'),
  ('Partnerships are arranged directly with the organising team, around what you actually want.','Responsibilities, deliverables and recognition are agreed before a partnership is confirmed.'),
 ],
 'faqs-2026.html': [
  ('Élan is a premium interschool event experience built around creativity, performance, leadership, school spirit, networking, community, and its two flagships, the crisis simulation Crisis Command and the business arena Cent$ible.','The 2026 summit combined Crisis Command and Cent$ible with performances, social activities and opening and closing ceremonies.'),
  ('fictional country','country in a crisis simulation'),
  ('Élan is planned at SGIS Pune Campus, Mulshi, Pune, Maharashtra. Venue access, reporting gates, and room allocations will be shared with confirmed students and school coordinators.','The 2026 edition took place at SGIS Pune Campus, Mulshi, Pune, Maharashtra. This is not a venue announcement for the next edition.'),
  ('Standard student and delegation passes include access to event-day refreshments. Premium and VIP passes include enhanced hospitality where available.','For the original pass categories and inclusions, see the 2026 passes page. These arrangements do not apply to the next edition.'),
 ],
}

def refine_copy(path,main):
    for before,after in COPY.get(path,[]):
        # Match visible phrases split by emphasis tags while retaining surrounding markup.
        if before in main:
            main=main.replace(before,after)
        else:
            def replace_element(match):
                visible=re.sub(r'\s+',' ',re.sub('<[^>]+>',' ',match.group(2))).strip()
                return match.group(1)+after+match.group(3) if visible==before else match.group(0)
            main=re.sub(r'(<(?:p|h[1-6])\b[^>]*>)(.*?)(</(?:p|h[1-6])>)',replace_element,main,flags=re.S)
    return main
