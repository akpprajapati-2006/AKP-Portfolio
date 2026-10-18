"""Akash Kumar Prajapati - Portfolio backend (Flask + Supabase PostgreSQL REST API).
Run:  python app.py   ->  http://127.0.0.1:5000
"""
import os, re, smtplib, time
import requests
from collections import defaultdict
from email.message import EmailMessage
from pathlib import Path
from flask import Flask, jsonify, render_template, request, send_from_directory

BASE = Path(__file__).resolve().parent

# ---- tiny .env loader (no extra package needed) ----
env_file = BASE / ".env"
if env_file.exists():
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

# Safe configuration: URL may have a project-specific default; secret key must come from env.
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://fxdgvrtpjuadswmyhpzw.supabase.co").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "user-files")
SUPABASE_TIMEOUT = 12

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
    "linkedin": "https://www.linkedin.com/in/akash-kumar-prajapati-58a76a371/",  # verify
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

# ---- Supabase database (PostgreSQL via REST API) ----
def supabase_headers(prefer=None):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY.")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers


def save_contact_message(name, email, message, ip):
    """Insert a contact-form message into the Supabase public.messages table."""
    url = f"{SUPABASE_URL}/rest/v1/messages"
    payload = {"name": name, "email": email, "message": message, "ip": ip}
    response = requests.post(
        url,
        headers=supabase_headers("return=minimal"),
        json=payload,
        timeout=SUPABASE_TIMEOUT,
    )
