"""Genera un HTML autónomo. Solo biblioteca estándar; no instala dependencias."""
from pathlib import Path
import base64
import re
root = Path(__file__).resolve().parent
template = root / 'index.template.html'
if not template.exists():
    template.write_text((root / 'index.html').read_text(encoding='utf-8'), encoding='utf-8')
html = template.read_text(encoding='utf-8')
def embed_image(match):
    path = root / match.group(1)
    mime = 'image/png' if path.suffix.lower() == '.png' else 'image/jpeg'
    return 'src="data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode('ascii')+'"'
html = re.sub(r'src="(assets/images/[^"\s]+\.(?:png|jpg|jpeg))"', embed_image, html)
css = (root / 'styles.css').read_text(encoding='utf-8').replace("@import url('');", '')
def embed_font(match):
    path = root / match.group(1)
    mime = 'font/woff2' if path.suffix == '.woff2' else 'font/ttf'
    return "url('data:"+mime+";base64,"+base64.b64encode(path.read_bytes()).decode('ascii')+"')"
css = re.sub(r"url\('([^']+\.(?:woff2|ttf))'\)", embed_font, css)
engine = (root / 'engine.js').read_text(encoding='utf-8')
app = (root / 'app.js').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>'+css+'</style>')
html = html.replace('<script src="engine.js"></script>', '<script id="projectData" type="application/json">null</script><script>'+engine+'</script>')
html = html.replace('<script src="app.js"></script>', '<script>'+app+'</script>')
(root / 'index.html').write_text(html, encoding='utf-8')
# El sitio publicado (Render) sirve la raíz del repositorio: el simulador va también en ../index.html.
(root.parent / 'index.html').write_text(html, encoding='utf-8')
print('HTML autónomo generado:', root / 'index.html')
