"""Stable editable leaf text; exclude forms, navigation, legal and account pages."""
import re, html, hashlib, json
PAGES={'about.html','founders.html','flagship.html','schools.html','school-collaboration.html','volunteers.html','contact.html','faqs.html','first-edition.html','archive.html','next-edition.html'}
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
        for i,original in enumerate(protected):main=main.replace(f'<!--CONTENT-HOLD-{i}-->',original)
        path.write_text(text[:match.start()]+main+text[match.end():])
    (out/'assets/content-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False))
    return len(inventory)
