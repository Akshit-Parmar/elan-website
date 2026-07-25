-- Élan 2026 — portal seed (0003_portal_seed.sql)
-- Announcement + the REAL Day 1/Day 2 schedule migrated out of the (now removed)
-- public schedule.html into the protected portal_schedule_items table. Edit freely.

insert into public.portal_announcements (title, body, is_published) values
  ('Portal is live', 'Your Élan 2026 participant portal is now active. Your ticket, schedule, and official updates will appear here.', true);

insert into public.portal_schedule_items (day, start_time, title, description, location, category, is_published) values
  (1, '08:30', 'Registration and Delegation Check-in', 'Students, teachers, guests, and school coordinators report at the Élan registration desk, collect passes, and receive event guidance.', 'Registration Foyer', 'Networking', true),
  (1, '09:15', 'Opening Ceremony', 'The official launch of Élan 2026 with the event reveal, welcome address, delegation introduction, and school spirit opening.', 'Main Stage', 'Flagship Moments', true),
  (1, '10:00', 'Mixed-School Icebreaker', 'A structured interaction block designed to help students connect beyond their own schools before the flagship simulation begins.', 'Networking Lounge', 'Networking', true),
  (1, '10:45', 'Crisis Command: Initial Briefing', 'Teams receive the fictional country profile, emergency trigger, role responsibilities, available resources, and first intelligence packet. The day ends with each team submitting its Initial Response Brief.', 'Crisis Command Hall', 'Flagship Moments', true),
  (1, '11:30', 'Crisis Command: Council Strategy Rooms', 'Teams split into cabinet-style councils and begin building their national response through role planning, resource choices, and first policy priorities.', 'Breakout Rooms', 'Flagship Moments', true),
  (1, '12:45', 'Guest Conversation: Youth, Leadership and Ambition', 'An invited guest or mentor shares practical insight on confidence, communication, and leadership under pressure.', 'Main Stage', 'Guest Sessions', true),
  (1, '13:30', 'Lunch and Delegation Exchange', 'Students connect informally, meet other school delegations, and prepare for the next crisis update.', 'Experience Zone', 'Networking', true),
  (1, '14:30', 'Crisis Command: Escalation One', 'New information changes the situation. Teams must adapt their first response, handle public pressure, and revise priorities.', 'Crisis Command Hall', 'Flagship Moments', true),
  (1, '16:00', 'Performance Showcase Round 1', 'Music, dance, drama, spoken word, and school performance slots bring the festival side of Élan to life.', 'Main Stage', 'Performances', true),
  (1, '17:15', 'Crisis Command: Press Room Drill', 'Media and PR leads prepare public statements while teams defend their choices through controlled questioning and rapid response.', 'Media Room', 'Flagship Moments', true),
  (1, '18:05', 'Initial Response Brief Submission', 'Before Day 1 closes, each council submits its first action plan covering immediate priorities, resource allocation, public communication, and the opening 24-hour response. This brief becomes the baseline for Day 2 consequences and judging.', 'Submission Desk', 'Flagship Moments', true),
  (1, '18:30', 'Cultural Night and Open Mic', 'The evening celebration with performances, open-mic energy, school spirit, music, community, and premium festival atmosphere.', 'Main Stage', 'Cultural Events', true),
  (1, '20:15', 'Day 1 Closing Circle', 'A soft close with reminders for Day 2, confirmation that Initial Response Briefs have been submitted, informal reflection, team coordination, and departure guidance.', 'Courtyard', 'Networking', true),
  (2, '08:30', 'Arrival and Team Reset', 'Participants return, reconnect with teams, confirm schedules, and prepare for the final day of Crisis Command.', 'Registration Foyer', 'Networking', true),
  (2, '09:00', 'Crisis Command: Escalation Two', 'The crisis deepens. Teams face consequences from their Day 1 Initial Response Brief, new stakeholder pressure, and final strategic constraints.', 'Crisis Command Hall', 'Flagship Moments', true),
  (2, '10:30', 'Final Response Preparation', 'Teams convert their strategy into a clear final plan covering policy, finance, diplomacy, public communication, and implementation.', 'Breakout Rooms', 'Flagship Moments', true),
  (2, '12:00', 'Strategy Submission', 'Teams submit their final response brief and prepare for the panel round. Top teams are shortlisted for final presentation.', 'Submission Desk', 'Flagship Moments', true),
  (2, '12:45', 'Lunch and Media Moments', 'Delegations connect, capture official media moments, and prepare for the final stage block.', 'Experience Zone', 'Networking', true),
  (2, '14:00', 'Crisis Command Finals', 'Shortlisted teams present their response, defend choices, answer questions, and demonstrate leadership under pressure.', 'Main Stage', 'Flagship Moments', true),
  (2, '15:45', 'Grand Performance Showcase', 'Final stage performances and school showcase moments bring the event energy back to the audience.', 'Main Stage', 'Performances', true),
  (2, '16:30', 'Élan Networking Forum', 'A structured closing interaction block for students to meet peers, exchange contacts, and reflect on the experience.', 'Networking Lounge', 'Networking', true),
  (2, '17:15', 'Awards: Crisis Command and Élan 2026', 'Recognition for Best Crisis Response, Best Strategy, Outstanding Leadership, Best Speaker, delegation awards, and participation certificates.', 'Main Stage', 'Flagship Moments', true),
  (2, '18:15', 'Closing Jam', 'A final music and community moment before the official farewell.', 'Main Stage', 'Cultural Events', true),
  (2, '18:45', 'Closing Ceremony and Farewell', 'The formal end of Élan 2026 with final remarks, delegation send-off, and event close.', 'Main Stage', 'Flagship Moments', true);
