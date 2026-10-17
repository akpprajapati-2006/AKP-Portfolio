"""Creates a standalone index.html (no Flask needed) + static/js/data.js from app.py.
Run:  python build_static.py     then open index.html with Live Server or double-click.
Re-run it after editing PROFILE / PROJECTS / SKILLS in app.py."""
import json
from pathlib import Path
import app as m

BASE = Path(__file__).resolve().parent
fb = {"projects": m.PROJECTS, "skills": m.SKILLS, "email": m.PROFILE["email"]}
(BASE / "static/js/data.js").write_text("window.FALLBACK = " + json.dumps(fb, ensure_ascii=False, indent=1) + ";\n", encoding="utf-8")
has_resume = (BASE / "static/files/resume.pdf").exists()
with m.app.test_request_context("/"):
    html = m.render_template("index.html", p=m.PROFILE, has_resume=has_resume)
html = html.replace('"/static/', '"static/').replace('href="/resume"', 'href="static/files/resume.pdf"')
(BASE / "index.html").write_text(html, encoding="utf-8")
print("Done: index.html and static/js/data.js created")
