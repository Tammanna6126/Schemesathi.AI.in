# SchemeSaathi AI

SchemeSaathi is a responsive frontend and FastAPI + SQLite MVP for discovering Indian government schemes in plain language. The frontend works with local fallback data, and calls the API when it is running.

## Run locally

Start the API in one terminal:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
python -m uvicorn backend.main:app --reload
```

Then serve the static files in a second terminal:

```powershell
node -e "const http=require('http'),fs=require('fs');http.createServer((q,r)=>{const f=q.url==='/'?'index.html':q.url.slice(1);if(!fs.existsSync(f)){r.statusCode=404;return r.end('not found')}r.writeHead(200);fs.createReadStream(f).pipe(r)}).listen(4173)"
```

Open `http://localhost:4173`. API docs are available at `http://127.0.0.1:8000/docs`.

## Included MVP flows

- English, Kannada, and Hindi UI text switching
- Natural-language scheme query with API-backed matching and local fallback
- Optional profile form for more personal matches; the homepage is open without a login gate
- Profession-aware profile matching for students, farmers, vendors, entrepreneurs, workers, and parents
- Potential-match cards with eligibility, document, and official-source details
- AI assistant/chat affordance with a demo response
- Responsive layouts for mobile, tablet, and desktop

Eligibility is intentionally labelled as potential and the UI points users to the official source for confirmation.

Real SMS setup is documented in `backend/README.md` for a future secured deployment. The current frontend intentionally does not block browsing behind login. SQLite is used for MVP profile persistence; PostgreSQL can replace it behind the same API boundary.
