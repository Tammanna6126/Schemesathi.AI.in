"""Minimal FastAPI backend for SchemeSaathi.

The OTP in this demo is intentionally fixed to 123456. Replace it with an
SMS provider and a real user/session store before deploying to production.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import sqlite3
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


DATABASE_PATH = Path(os.getenv("SCHEMESAATHI_DB", Path(__file__).with_name("schemesaathi.db")))
TOKEN_SECRET = os.getenv("SCHEMESAATHI_TOKEN_SECRET", "change-this-demo-secret").encode()
DEMO_OTP = "123456"
DEMO_MODE = os.getenv("SCHEMESAATHI_DEMO_OTP", "false").lower() == "true"
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_VERIFY_SERVICE_SID = os.getenv("TWILIO_VERIFY_SERVICE_SID")

app = FastAPI(title="SchemeSaathi API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:4173", "http://localhost:4173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


SCHEMES = [
    {"id": "farmer", "title": "PM-KISAN", "category": "Farming · Central Government", "roles": ["farmer"], "keywords": "farmer farming agriculture crop kisan loan", "symbol": "✺", "tone": "green", "fit": "87% potential fit", "summary": "Income support for eligible landholding farmer families.", "eligibility": ["Landholding farmer families with cultivable land"], "documents": ["Aadhaar card", "Land ownership records", "Bank account details"], "source": "pmkisan.gov.in"},
    {"id": "mudra", "title": "Pradhan Mantri MUDRA Yojana", "category": "Business · Central Government", "roles": ["entrepreneur", "worker", "self-employed"], "keywords": "business entrepreneur startup shop enterprise loan", "symbol": "↗", "tone": "orange", "fit": "94% potential fit", "summary": "Loans for small businesses and aspiring entrepreneurs.", "eligibility": ["Micro business owners and aspiring entrepreneurs"], "documents": ["Aadhaar and PAN", "Business address proof", "Bank statements"], "source": "mudra.org.in"},
    {"id": "education", "title": "National Scholarship Portal", "category": "Education · Central Government", "roles": ["student", "parent"], "keywords": "education study college school scholarship fees", "symbol": "◎", "tone": "blue", "fit": "98% potential fit", "summary": "Scholarship support for eligible students continuing their studies.", "eligibility": ["Students enrolled in a recognised school, college or university"], "documents": ["Aadhaar card", "Income / caste certificate", "Bank account details"], "source": "scholarships.gov.in"},
    {"id": "worker", "title": "e-Shram", "category": "Employment · Central Government", "roles": ["worker", "street-vendor"], "keywords": "worker labour unorganised employment social security", "symbol": "◌", "tone": "green", "fit": "90% potential fit", "summary": "Registration and social-security support for unorganised workers.", "eligibility": ["Unorganised workers aged 16–59"], "documents": ["Aadhaar card", "Mobile number", "Bank account details"], "source": "eshram.gov.in"},
    {"id": "maternity", "title": "PM Matru Vandana Yojana", "category": "Family · Central Government", "roles": ["parent"], "keywords": "parent maternity pregnancy mother family benefit", "symbol": "♡", "tone": "orange", "fit": "88% potential fit", "summary": "Maternity benefit support for eligible pregnant and lactating women.", "eligibility": ["Eligible pregnant and lactating women under current scheme rules"], "documents": ["Aadhaar card", "MCP card", "Bank account details"], "source": "pmmvy.wcd.gov.in"},
]


class OTPRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=15)


class OTPVerification(OTPRequest):
    otp: str = Field(min_length=6, max_length=6)


class Profile(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    profession: str = Field(min_length=1, max_length=80)
    state: str = Field(min_length=1, max_length=80)
    gender: str = Field(min_length=1, max_length=40)
    age: int | None = Field(default=None, ge=0, le=130)


def get_connection() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute(
        """CREATE TABLE IF NOT EXISTS profiles (
            phone TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            profession TEXT NOT NULL,
            state TEXT NOT NULL,
            gender TEXT NOT NULL DEFAULT 'prefer-not-to-say',
            age INTEGER,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    columns = {row[1] for row in connection.execute("PRAGMA table_info(profiles)").fetchall()}
    if "gender" not in columns:
        connection.execute("ALTER TABLE profiles ADD COLUMN gender TEXT NOT NULL DEFAULT 'prefer-not-to-say'")
    connection.commit()
    return connection


def normalise_phone(phone: str) -> str:
    digits = "".join(character for character in phone if character.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if len(digits) != 10:
        raise HTTPException(status_code=422, detail="phone must contain 10 digits")
    return digits


def twilio_configured() -> bool:
    return all((TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID))


def twilio_request(phone: str, action: str, otp: str | None = None) -> dict[str, Any]:
    if not twilio_configured():
        raise HTTPException(
            status_code=503,
            detail="SMS OTP is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.",
        )
    endpoint = (
        f"https://verify.twilio.com/v2/Services/{TWILIO_VERIFY_SERVICE_SID}/Verifications"
        if action == "send"
        else f"https://verify.twilio.com/v2/Services/{TWILIO_VERIFY_SERVICE_SID}/VerificationCheck"
    )
    fields = {"To": f"+91{phone}", "Channel": "sms"} if action == "send" else {"To": f"+91{phone}", "Code": otp or ""}
    request = urllib.request.Request(
        endpoint,
        data=urllib.parse.urlencode(fields).encode(),
        headers={"Authorization": "Basic " + base64.b64encode(f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()).decode()},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=12) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise HTTPException(status_code=502, detail=f"SMS provider rejected the request: {detail[:300]}") from error
    except urllib.error.URLError as error:
        raise HTTPException(status_code=502, detail="SMS provider is unreachable") from error


def make_token(phone: str) -> str:
    payload = f"{phone}:{int(time.time())}"
    signature = hmac.new(TOKEN_SECRET, payload.encode(), hashlib.sha256).hexdigest()
    encoded = base64.urlsafe_b64encode(f"{payload}:{signature}".encode()).decode().rstrip("=")
    return encoded


def phone_from_token(token: str) -> str:
    try:
        decoded = base64.urlsafe_b64decode(token + "=" * (-len(token) % 4)).decode()
        phone, issued_at, signature = decoded.rsplit(":", 2)
        expected = hmac.new(TOKEN_SECRET, f"{phone}:{issued_at}".encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError
        if int(time.time()) - int(issued_at) > 86400:
            raise ValueError
        return normalise_phone(phone)
    except (ValueError, TypeError, UnicodeDecodeError):
        raise HTTPException(status_code=401, detail="invalid or expired token")


def current_phone(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")
    return phone_from_token(authorization.split(" ", 1)[1].strip())


@app.on_event("startup")
def initialise_database() -> None:
    connection = get_connection()
    connection.close()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/schemes")
def list_schemes(
    q: str | None = Query(default=None, description="Search name, description, or category"),
    search: str | None = Query(default=None, description="Alias for q"),
    profession: str | None = Query(default=None),
) -> dict[str, Any]:
    search_term = (search or q).strip().lower() if (search or q) else None
    search_tokens = [token for token in (search_term or "").split() if len(token) > 2]
    selected_profession = profession.strip().lower() if profession else None
    results = [
        scheme
        for scheme in SCHEMES
        if (not search_tokens or any(token in json.dumps(scheme).lower() for token in search_tokens))
        and (not selected_profession or selected_profession in scheme["roles"])
    ]
    return {"count": len(results), "schemes": results}


@app.post("/auth/request-otp")
def request_otp(request: OTPRequest) -> dict[str, Any]:
    phone = normalise_phone(request.phone)
    if DEMO_MODE:
        return {"message": "Demo OTP generated.", "demo": True, "demo_otp": DEMO_OTP}
    twilio_request(phone, "send")
    return {"message": "OTP sent by SMS.", "demo": False}


@app.post("/auth/verify-otp")
def verify_otp(request: OTPVerification) -> dict[str, Any]:
    phone = normalise_phone(request.phone)
    if DEMO_MODE:
        valid = hmac.compare_digest(request.otp, DEMO_OTP)
    else:
        result = twilio_request(phone, "verify", request.otp)
        valid = result.get("status") == "approved"
    if not valid:
        raise HTTPException(status_code=401, detail="invalid or expired OTP")
    return {"access_token": make_token(phone), "token_type": "bearer", "demo": DEMO_MODE}


@app.get("/profile")
def get_profile(phone: str = Depends(current_phone)) -> dict[str, Any]:
    connection = get_connection()
    row = connection.execute(
        "SELECT phone, name, profession, state, gender, age, updated_at FROM profiles WHERE phone = ?",
        (phone,),
    ).fetchone()
    connection.close()
    if row is None:
        raise HTTPException(status_code=404, detail="profile not found")
    return dict(row)


@app.put("/profile")
@app.post("/profile")
def save_profile(profile: Profile, phone: str = Depends(current_phone)) -> dict[str, Any]:
    connection = get_connection()
    connection.execute(
        """INSERT INTO profiles (phone, name, profession, state, gender, age)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(phone) DO UPDATE SET name=excluded.name,
        profession=excluded.profession, state=excluded.state, gender=excluded.gender, age=excluded.age,
        updated_at=CURRENT_TIMESTAMP""",
        (phone, profile.name, profile.profession, profile.state, profile.gender, profile.age),
    )
    connection.commit()
    row = connection.execute(
        "SELECT phone, name, profession, state, gender, age, updated_at FROM profiles WHERE phone = ?",
        (phone,),
    ).fetchone()
    connection.close()
    return dict(row)
