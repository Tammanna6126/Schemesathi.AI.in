# SchemeSaathi backend

Minimal FastAPI API with SQLite persistence (Python's built-in `sqlite3`).

## Run locally

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.main:app --reload
```

The API is available at `http://127.0.0.1:8000`; interactive docs are at
`/docs`. Set `SCHEMESAATHI_DB` to use a different SQLite file.

## Endpoints

- `GET /health`
- `GET /schemes?q=student&profession=student`
- `POST /auth/request-otp` with `{"phone":"9876543210"}`
- `POST /auth/verify-otp` with `{"phone":"9876543210","otp":"123456"}`
- `GET /profile` and `PUT /profile` with `Authorization: Bearer <access_token>`

## Real SMS setup (Twilio Verify)

Set these environment variables before starting the API:

```powershell
$env:TWILIO_ACCOUNT_SID = "AC..."
$env:TWILIO_AUTH_TOKEN = "..."
$env:TWILIO_VERIFY_SERVICE_SID = "VA..."
$env:SCHEMESAATHI_TOKEN_SECRET = "use-a-long-random-secret"
python -m uvicorn backend.main:app --reload
```

The frontend then sends a real SMS to the submitted Indian mobile number and
verifies the code through Twilio Verify. `SCHEMESAATHI_DEMO_OTP=true` is
available only for local development and enables the clearly marked OTP
`123456`; it is disabled by default.
