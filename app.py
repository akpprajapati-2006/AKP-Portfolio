"""Akash Kumar Prajapati - Portfolio backend (Flask + SQLite).
Run:  python app.py   ->  http://127.0.0.1:5000
"""
import os, re, sqlite3, smtplib, time
from collections import defaultdict
from email.message import EmailMessage
from pathlib import Path
from flask import Flask, jsonify, render_template, request, send_from_directory

BASE = Path(__file__).resolve().parent
DB_PATH = BASE / "messages.db"

# ---- tiny .env loader (no extra package needed) ----
env_file = BASE / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024

# ---- EDIT YOUR REAL DETAILS HERE ----
PROFILE = {
    "name": "Akash Kumar Prajapati",
    "short": "AKASH",
    "degree": "B.Tech CSE",
    "college": "RIMT University",
    "location": "Mandi Gobindgarh, Punjab",
    "tagline": "Building digital solutions, exploring cloud, AI and cybersecurity, and creating projects that make an impact.",
    "email": "akashprajapati2006@gmail.com",           # verify
    "github": "https://github.com/akpprajapati-2006",  # verify
    "linkedin": "https://linkedin.com/in/akash-prajapati",  # verify
    "roles": ["CSE Student", "Cloud Explorer", "Cybersecurity Learner", "Unity Game Developer"],
}
PROJECTS = [
    {"id": 1, "title": "AKP CloudVault", "subtitle": "Personal Cloud Storage",
     "desc": "A personal cloud storage web app to upload, store and manage files securely.",
     "tags": ["Flask", "Supabase", "PostgreSQL"], "cats": ["web", "cloud"], "icon": "☁️",
     "grad": ["#1d4ed8", "#22d3ee"], "image": "", "link": ""},
    {"id": 2, "title": "Payroll Management System", "subtitle": "Employee & Salary Management",
     "desc": "Manage employees and salary records with a relational database backend.",
     "tags": ["Flask", "MySQL", "AWS"], "cats": ["web", "cloud"], "icon": "📊",
     "grad": ["#4338ca", "#38bdf8"], "image": "", "link": ""},
    {"id": 3, "title": "SIH Cybersecurity Project", "subtitle": "AI-Driven Network Security Compliance Auditor",
     "desc": "Network security auditing project that checks compliance using AI-based analysis.",
     "tags": ["AI", "Cybersecurity", "Python"], "cats": ["security"], "icon": "🛡️",
     "grad": ["#0e7490", "#6366f1"], "image": "", "link": ""},
    {"id": 4, "title": "Unity 3D Car Racing Game", "subtitle": "3D Racing Game",
     "desc": "A 3D racing game with WheelCollider car physics, drifting and engine sound.",
     "tags": ["Unity", "C#", "3D Models"], "cats": ["game"], "icon": "🏎️",
     "grad": ["#7c3aed", "#22d3ee"], "image": "", "link": ""},
]
SKILLS = {
    "Programming": [["Python", "Py", "#3b82f6", "Scripting and Flask apps"], ["Java", "Jv", "#ef4444", "Core OOP concepts"],
                    ["C++", "C+", "#38bdf8", "DSA and fundamentals"], ["HTML", "H5", "#f97316", "Page structure"],
                    ["CSS", "C3", "#3b82f6", "Layouts, animation, UI"], ["JavaScript", "JS", "#facc15", "Web interactivity"]],
    "Backend & Database": [["Flask", "Fl", "#94a3b8", "Python web framework"], ["MySQL", "My", "#0ea5e9", "Relational database"],
                           ["PostgreSQL", "Pg", "#6366f1", "Relational database"], ["Supabase", "Sb", "#22c55e", "Backend as a service"]],
    "Cloud & DevOps": [["AWS", "AW", "#f59e0b", "Learning cloud services"], ["Git/GitHub", "Gt", "#f43f5e", "Version control"],
                       ["Docker", "Dk", "#38bdf8", "Currently learning"]],
    "Other Interests": [["AI/ML", "AI", "#a78bfa", "Exploring"], ["Cybersecurity", "Cy", "#22d3ee", "Network security"],
                        ["Unity", "Un", "#e2e8f0", "3D game development"], ["Data Analytics", "DA", "#fb7185", "Exploring"]],
}

# ---- database ----
def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with db() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS messages(
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT, message TEXT,
            ip TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP)""")

# ---- very small rate limiter: 5 messages / 10 min / IP ----
_hits = defaultdict(list)
def limited(ip):
    now = time.time()
    _hits[ip] = [t for t in _hits[ip] if now - t < 600]
    if len(_hits[ip]) >= 5:
        return True
    _hits[ip].append(now)
    return False

def send_mail(name, email, message):
    host, user, pwd, to = (os.environ.get(k) for k in ("SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_TO"))
    if not (host and user and pwd and to):
        return False
    msg = EmailMessage()
    msg["Subject"] = f"Portfolio message from {name}"
    msg["From"], msg["To"], msg["Reply-To"] = user, to, email
    msg.set_content(f"From: {name} <{email}>\n\n{message}")
    with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", 587)), timeout=10) as s:
        s.starttls(); s.login(user, pwd); s.send_message(msg)
    return True

# ---- routes ----
@app.get("/")
def index():
    has_resume = (BASE / "static" / "files" / "resume.pdf").exists()
    return render_template("index.html", p=PROFILE, has_resume=has_resume)

@app.get("/resume")
def resume():
    return send_from_directory(BASE / "static" / "files", "resume.pdf", as_attachment=True,
                               download_name="Akash_Kumar_Prajapati_Resume.pdf")

@app.get("/api/projects")
def api_projects():
    items = []
    for p in PROJECTS:  # use real screenshot only if the file exists
        q = dict(p)
        if q["image"] and not (BASE / "static" / "images" / q["image"]).exists():
            q["image"] = ""
        items.append(q)
    return jsonify(items)

@app.get("/api/skills")
def api_skills():
    return jsonify(SKILLS)

@app.post("/api/contact")
def api_contact():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    message = str(data.get("message", "")).strip()
    errors = {}
    if not 2 <= len(name) <= 80: errors["name"] = "Please enter your name (2-80 characters)."
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email) or len(email) > 120: errors["email"] = "Enter a valid email."
    if not 10 <= len(message) <= 2000: errors["message"] = "Message must be 10-2000 characters."
    if errors:
        return jsonify(ok=False, errors=errors), 400
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "?").split(",")[0].strip()
    if limited(ip):
        return jsonify(ok=False, error="Too many messages. Please try again later."), 429
    with db() as c:
        c.execute("INSERT INTO messages(name,email,message,ip) VALUES(?,?,?,?)", (name, email, message, ip))
    mailed = False
    try:
        mailed = send_mail(name, email, message)
    except Exception as exc:  # message is already saved, so do not fail the user
        app.logger.warning("Email failed: %s", exc)
    return jsonify(ok=True, emailed=mailed)

init_db()
if __name__ == "__main__":
    app.run(debug=True, port=int(os.environ.get("PORT", 5000)))
