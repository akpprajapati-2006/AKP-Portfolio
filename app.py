
import os
import re
import time
import logging
from collections import defaultdict
from threading import Lock

import requests
from flask import (
    Flask,
    jsonify,
    request,
    render_template,
    send_from_directory,
)

app = Flask(__name__)

# --------------------------------------------------
# Configuration
# --------------------------------------------------

app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get(
    "SUPABASE_URL",
    "https://fxdgvrtpjuadswmyhpzw.supabase.co",
).rstrip("/")

# Set this in Render Environment Variables.
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZGd2cnRwanVhZHN3bXlocHp3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjMwMzQ2OCwiZXhwIjoyMTA3ODc5NDY4fQ.84iG8zbGy85Dulu95o6Puxe3kp5gYxryLNA_dukN6PY").strip()

SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "user-files")
SUPABASE_TIMEOUT = 12

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# --------------------------------------------------
# Portfolio data
# Keep your existing data here if you already have it.
# --------------------------------------------------

PROFILE = {
    "name": "Akash Kumar Prajapati",
    "title": "Computer Science Engineering Student",
    "bio": "Interested in Python, cloud computing, web development and AI.",
}

PROJECTS = [
    {
        "title": "AKP CloudVault",
        "description": "A personal cloud application for managing files.",
        "technologies": ["Python", "Flask", "Supabase"],
    },
    {
        "title": "Payroll Management System",
        "description": "A web application for payroll management.",
        "technologies": ["Python", "Flask", "SQL"],
    },
    {
        "title": "AI Network Security Auditor",
        "description": "A project concept for checking network security compliance.",
        "technologies": ["Python", "AI", "Cybersecurity"],
    },
    {
        "title": "Unity Car Racing Game",
        "description": "A 3D car simulation game built with Unity.",
        "technologies": ["Unity", "C#", "3D"],
    },
]

SKILLS = [
    {"name": "Python", "level": "Beginner"},
    {"name": "Java", "level": "Beginner"},
    {"name": "HTML", "level": "Learning"},
    {"name": "CSS", "level": "Learning"},
    {"name": "JavaScript", "level": "Learning"},
    {"name": "Cloud Computing", "level": "Learning"},
]

# --------------------------------------------------
# Supabase REST API
# --------------------------------------------------

def supabase_headers(prefer=None):
    if not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_KEY is not configured.")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

    if prefer:
        headers["Prefer"] = prefer

    return headers


def save_contact_message(name, email, message, ip=None):
    """Save a contact form message to public.messages."""

    url = f"{SUPABASE_URL}/rest/v1/messages"

    payload = {
        "name": name,
        "email": email,
        "message": message,
        "ip": ip,
    }

    response = requests.post(
        url,
        headers=supabase_headers("return=minimal"),
        json=payload,
        timeout=SUPABASE_TIMEOUT,
    )

    response.raise_for_status()
    return True


# --------------------------------------------------
# Basic in-memory rate limiter
# Note: counters reset when the service restarts.
# --------------------------------------------------

_rate_lock = Lock()
_rate_requests = defaultdict(list)


def rate_limited(ip, limit=10, window=60):
    now = time.time()

    with _rate_lock:
        recent = [
            timestamp
            for timestamp in _rate_requests[ip]
            if now - timestamp < window
        ]

        _rate_requests[ip] = recent

        if len(recent) >= limit:
            return True

        _rate_requests[ip].append(now)
        return False


# --------------------------------------------------
# Routes
# --------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "akp-portfolio-api",
    }), 200


@app.route("/", methods=["GET"])
def home():
    index_path = os.path.join(BASE_DIR, "index.html")

    if os.path.isfile(index_path):
        return send_from_directory(BASE_DIR, "index.html")

    template_path = os.path.join(BASE_DIR, "templates", "index.html")

    if os.path.isfile(template_path):
        return render_template(
            "index.html",
            profile=PROFILE,
            projects=PROJECTS,
            skills=SKILLS,
        )

    return jsonify({
        "message": "AKP Portfolio API is running.",
        "health": "/health",
        "projects": "/api/projects",
        "skills": "/api/skills",
    }), 200


@app.route("/resume", methods=["GET"])
def resume():
    # Put your resume PDF in a "static" directory.
    filename = os.environ.get("RESUME_FILENAME", "resume.pdf")
    static_dir = os.path.join(BASE_DIR, "static")
    resume_path = os.path.join(static_dir, filename)

    if os.path.isfile(resume_path):
        return send_from_directory(
            static_dir,
            filename,
            as_attachment=True,
        )

    return jsonify({
        "error": "Resume file not found.",
        "hint": "Place your PDF in the static folder or configure RESUME_FILENAME.",
    }), 404


@app.route("/api/projects", methods=["GET"])
def get_projects():
    return jsonify({
        "success": True,
        "count": len(PROJECTS),
        "projects": PROJECTS,
    }), 200


@app.route("/api/skills", methods=["GET"])
def get_skills():
    return jsonify({
        "success": True,
        "count": len(SKILLS),
        "skills": SKILLS,
    }), 200


@app.route("/api/contact", methods=["POST"])
def contact():
    ip = request.remote_addr or "unknown"

    if rate_limited(ip):
        return jsonify({
            "success": False,
            "error": "Too many requests. Please try again later.",
        }), 429

    if not request.is_json:
        return jsonify({
            "success": False,
            "error": "Send the request as JSON.",
        }), 415

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "error": "Invalid JSON body.",
        }), 400

    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip()
    message = str(data.get("message", "")).strip()

    if not name or not email or not message:
        return jsonify({
            "success": False,
            "error": "Name, email and message are required.",
        }), 400

    if len(name) > 100 or len(email) > 254 or len(message) > 5000:
        return jsonify({
            "success": False,
            "error": "One or more fields exceed the allowed length.",
        }), 400

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        return jsonify({
            "success": False,
            "error": "Please enter a valid email address.",
        }), 400

    try:
        save_contact_message(name, email, message, ip)

        return jsonify({
            "success": True,
            "message": "Your message was submitted successfully.",
        }), 201

    except requests.exceptions.Timeout:
        logger.warning("Supabase request timed out.")
        return jsonify({
            "success": False,
            "error": "Database request timed out. Please try again.",
        }), 504

    except requests.exceptions.HTTPError as exc:
        status_code = (
            exc.response.status_code
            if exc.response is not None
            else 502
        )

        # Keep provider details and secrets out of public responses.
        logger.error("Supabase returned HTTP status %s.", status_code)

        return jsonify({
            "success": False,
            "error": "Could not save your message. Please try again later.",
        }), 502

    except requests.exceptions.RequestException:
        logger.exception("Supabase connection failed.")
        return jsonify({
            "success": False,
            "error": "Could not connect to the database.",
        }), 502

    except RuntimeError:
        logger.exception("Supabase configuration is missing.")
        return jsonify({
            "success": False,
            "error": "Server database configuration is incomplete.",
        }), 500

    except Exception:
        logger.exception("Unexpected contact endpoint error.")
        return jsonify({
            "success": False,
            "error": "An unexpected server error occurred.",
        }), 500


@app.errorhandler(404)
def not_found(_error):
    return jsonify({
        "success": False,
        "error": "Route not found.",
    }), 404


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({
        "success": False,
        "error": "Request body is too large.",
    }), 413


@app.errorhandler(500)
def internal_error(_error):
    return jsonify({
        "success": False,
        "error": "Internal server error.",
    }), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
