alter table public.elan_media drop constraint elan_media_category_check;
alter table public.elan_media add constraint elan_media_category_check check (category in ('Venue','Opening Ceremony','Day 1 Committee Sessions','DJ Night','Day 2 Committee Sessions','Closing Ceremony','Felicitations','Crisis Command','Cent$ible','Stage','People'));
