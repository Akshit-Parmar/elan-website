from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import webbrowser
root = Path(__file__).resolve().parent / 'Full-Project' / 'dist'
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(root)))
url = 'http://127.0.0.1:%s' % server.server_port
print('Elan Summit is running at ' + url)
print('Keep this window open while browsing. Close it or press Ctrl+C to stop.')
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
