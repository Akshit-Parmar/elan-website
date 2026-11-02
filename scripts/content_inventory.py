"""Stable editable leaf text; exclude forms, navigation, legal and account pages."""
import re, html, hashlib, json
PAGES={'centsible.html','partners.html','faqs-2026.html','index.html','tickets.html','gallery.html','guests.html','event-flow.html','event-details.html','schedule.html','about.html','founders.html','flagship.html','schools.html','school-collaboration.html','volunteers.html','contact.html','faqs.html','first-edition.html','archive.html','next-edition.html'}
def prepare_content(out):
    inventory=[]
    for name in sorted(PAGES):
        path=out/name
        if not path.exists():continue
        text=path.read_text(); match=re.search(r'<main\b[^>]*>.*?</main>',text,re.S)
        if not match:continue
        protected=[]
        def hold(m):protected.append(m.group());return f'<!--CONTENT-HOLD-{len(protected)-1}-->'
        main=re.sub(r'<(form|dialog|script|style|nav)\b.*?</\1>',hold,match.group(),flags=re.S)
        main=re.sub(r'<section\b[^>]*class="[^"]*guest-profile[^"]*"[^>]*>.*?</section>',hold,main,flags=re.S)
        seen=set()
        def leaf(m):
            tag,attrs,raw=m.groups();value=html.unescape(raw).strip()
            if len(value)<8 or 'aria-hidden="true"' in attrs:return m.group()
            href=re.search(r'\bhref="([^"]*)"',attrs) if tag=='a' else None
            href=html.unescape(href.group(1)) if href else None
            key=hashlib.sha256((name+'|'+tag+'|'+value+'|'+str(href)).encode()).hexdigest()[:32]
            if key not in seen:inventory.append(dict(key=key,page=name,tag=tag,text=value,href=href));seen.add(key)
            return f'<{tag}{attrs} data-content-key="{key}">{raw}</{tag}>'
        main=re.sub(r'<(h1|h2|h3|p|li|em|strong|a)(\s[^<>]*|)>([^<>]+)</\1>',leaf,main)
        # Expose mixed headings a text run at a time without flattening emphasis or links.
        stack=[];occurrences={}
        def mixed(m):
            token=m.group()
            if token.startswith('<!--'):return token
            if token.startswith('</'):
                tag=re.match(r'</(\w+)',token).group(1)
                for i in range(len(stack)-1,-1,-1):
                    if stack[i][0]==tag:del stack[i:];break
                return token
            if token.startswith('<'):
                found=re.match(r'<(\w+)\b',token)
                if found and found.group(1) not in {'img','br','hr','input','meta','link','source','wbr'}:
                    stack.append((found.group(1),token))
                return token
            value=html.unescape(token).strip()
            if not value or not any(t in {'h1','h2','h3','p','li','a','em','strong','figcaption'} for t,a in stack):return token
            if any('data-content-key=' in a or 'aria-hidden="true"' in a for t,a in stack):return token
            href=None
            for t,a in stack:
                if t=='a':
                    h=re.search(r'href="([^"]*)"',a);href=html.unescape(h.group(1)) if h else None
            seed=name+'|text-run|'+value+'|'+str(href);n=occurrences.get(seed,0);occurrences[seed]=n+1
            key=hashlib.sha256((seed+'|'+str(n)).encode()).hexdigest()[:32]
            inventory.append(dict(key=key,page=name,tag='span',text=value,href=href))
            lead=token[:len(token)-len(token.lstrip())];trail=token[len(token.rstrip()):]
            return lead+'<span data-content-key="'+key+'">'+token.strip()+'</span>'+trail
        main=re.sub(r'<!--[\s\S]*?-->|<[^>]+>|[^<]+',mixed,main)
        for i,original in enumerate(protected):main=main.replace(f'<!--CONTENT-HOLD-{i}-->',original)
        path.write_text(text[:match.start()]+main+text[match.end():])
    (out/'assets/content-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False))
    return len(inventory)
