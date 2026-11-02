"""Create smaller display copies without modifying original media."""
from pathlib import Path
import re, hashlib, json
try:
    from PIL import Image, ImageOps
except ImportError:
    Image=ImageOps=None

def prepare_images(out):
    cache={}
    folder=out/'assets/responsive';folder.mkdir(exist_ok=True)
    manifest=folder/'manifest.json'
    stored=json.loads(manifest.read_text()) if manifest.exists() else {}
    def rewrite(m):
        tag=m.group();match=re.search(r'\bsrc="(/assets/(?:edition-2026|guests|founders)/[^"?]+)"',tag)
        if not match or 'srcset=' in tag:return tag
        src=match[1];path=out/src.lstrip('/')
        if not path.exists():return tag
        if src not in cache:
            digest=hashlib.sha256(path.read_bytes()).hexdigest()
            if stored.get(src,{}).get('digest')==digest:
                cache[src]=stored[src]['data']
            elif Image is None:return tag
        if src not in cache:
            with Image.open(path) as original:
                im=ImageOps.exif_transpose(original).convert('RGB');w,h=im.size
                key=hashlib.sha256(path.read_bytes()).hexdigest()[:16];variants=[]
                for size in (480,960):
                    if w<=size:continue
                    dest=folder/f'{key}-{size}.webp'
                    im.resize((size,round(h*size/w)),Image.Resampling.LANCZOS).save(dest,'WEBP',quality=84)
                    variants.append(f'/assets/responsive/{dest.name} {size}w')
                variants.append(f'{src} {w}w');cache[src]=(w,h,variants)
                stored[src]={'digest':digest,'data':cache[src]}
        w,h,variants=cache[src]
        for attr in ('width','height'):tag=re.sub(r'\s'+attr+r'="[^"]*"','',tag)
        extra=f' width="{w}" height="{h}" decoding="async"'
        if len(variants)>1:extra+=' srcset="'+', '.join(variants)+'" sizes="(max-width: 600px) 100vw, (max-width: 1100px) 60vw, 900px"'
        return tag.replace('<img','<img'+extra,1)
    for path in out.rglob('*.html'):path.write_text(re.sub(r'<img\b[^>]*>',rewrite,path.read_text()))
    manifest.write_text(json.dumps(stored))
    print(f'Prepared responsive copies for {len(cache)} photos.')
