"""Build the original Élan sharing card from vector layout and the existing logo."""
from pathlib import Path
import base64,cairosvg
root=Path(__file__).resolve().parents[1]
logo=base64.b64encode((root/'reference/v1/public/assets/img/elan-horse-logo-512.png').read_bytes()).decode()
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#17263b"/>
<rect x="38" y="38" width="1124" height="554" fill="none" stroke="#b69b80" stroke-width="1"/>
<path d="M898 592V249a114 114 0 0 1 228 0v343" fill="#57190f"/>
<path d="M882 592V249a130 130 0 0 1 260 0v343" fill="none" stroke="#baa38c" stroke-width="2"/>
<text x="78" y="116" font-family="DejaVu Sans" font-size="16" letter-spacing="5" fill="#cfb79c">STUDENT LEADERSHIP · CREATIVITY · CONNECTION</text>
<text x="72" y="302" font-family="Liberation Serif" font-size="122" fill="#eadbca">Élan Summit.</text>
<text x="79" y="386" font-family="Liberation Serif" font-size="52" font-style="italic" fill="#eadbca">Make your move.</text>
<line x1="80" y1="471" x2="800" y2="471" stroke="#8b7868"/>
<text x="80" y="532" font-family="DejaVu Sans" font-size="21" fill="#eadbca">elansummit.com</text>
<image x="914" y="292" width="196" height="245" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,{logo}"/>
</svg>'''
(root/'src/social/elan-share-2026-11.svg').write_text(svg)
cairosvg.svg2png(bytestring=svg.encode(),write_to=str(root/'src/social/elan-share-2026-11.png'))
