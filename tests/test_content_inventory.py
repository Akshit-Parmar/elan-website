import sys, tempfile, re, json, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from content_inventory import prepare_content
class ContentInventoryTests(unittest.TestCase):
 def test_annotations_do_not_add_elements_or_change_original_text(self):
  original='<html><body><header><nav><button>About Élan</button><a href="/contact.html">Contact</a></nav></header><main><h1>Élan<br><em>Summit.</em></h1><a class="chapter-next" href="#next">EXPLORE THE SUMMIT <span>↓</span></a><form><label>Your name<input name="full_name"></label><button>Send</button></form></main><footer><p>Stay curious.</p></footer><script>const value="Do not annotate";</script></body></html>'
  with tempfile.TemporaryDirectory() as d:
   out=Path(d);(out/'assets').mkdir();(out/'index.html').write_text(original)
   prepare_content(out);annotated=(out/'index.html').read_text()
   clean=re.sub(r' data-content-key="[a-f0-9]{32}"','',annotated)
   clean=re.sub(r'<!--(?:elan-copy:[a-f0-9]{32}|/elan-copy)-->','',clean)
   self.assertEqual(clean,original)
   self.assertEqual(len(re.findall(r'<span\b',annotated)),1)
   fields=json.loads((out/'assets/content-inventory.json').read_text());values={x['text'] for x in fields}
   for label in ['About Élan','Contact','Your name','Send','Stay curious.','EXPLORE THE SUMMIT','Élan']:
    self.assertIn(label,values)
   self.assertNotIn('Do not annotate',values)
if __name__=='__main__':unittest.main()
