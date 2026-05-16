# Prospering Citizen Homecare — Web Deployment

## Folder structure

```
ProsperingCitizenWeb/
├── index.html                  ← copy your file here (step 1)
├── netlify.toml                ← build config + /api/chat redirect
├── netlify/functions/
│   └── chat.js                 ← serverless proxy (API key stays server-side)
├── setup.ps1                   ← run once to patch the fetch URL (step 2)
├── .gitignore
├── .env.example
└── README.md
```

---

## Deploy in 5 steps

### Step 1 — Save index.html here

Copy your `index.html` into `C:\Users\Fitsum\Desktop\ProsperingCitizenWeb\`

### Step 2 — Patch the API URL

Open PowerShell in this folder and run:

```powershell
.\setup.ps1
```

Changes `fetch('https://api.anthropic.com/v1/messages'` → `fetch('/api/chat'`
so your Anthropic API key is never exposed in the browser.

### Step 3 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial deploy — Prospering Citizen Homecare"
# Create a repo at github.com named: prospering-citizen-web
git remote add origin https://github.com/YOUR_USERNAME/prospering-citizen-web.git
git branch -M main
git push -u origin main
```

### Step 4 — Deploy to Netlify

1. Go to https://app.netlify.com → **Add new site → Import an existing project**
2. Connect GitHub, select `prospering-citizen-web`
3. Build settings are auto-detected from `netlify.toml` (publish dir: `.`)
4. Click **Deploy site** — live URL in ~60 seconds

### Step 5 — Add your Anthropic API key

Netlify Dashboard → **Site settings → Environment variables → Add variable**

```
Key:   ANTHROPIC_API_KEY
Value: sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
```

Then: **Deploys → Trigger deploy → Deploy site**

Test: open your live URL, click the chat bubble, ask "What services do you offer?"
Clara should respond within 2 seconds.

---

## Local testing (optional)

```bash
npm install -g netlify-cli
cp .env.example .env
# edit .env — add your real API key
netlify dev
# open http://localhost:8888
```

---

## Next phases (from Implementation Guide)

| Phase | Feature | When |
|-------|---------|------|
| 2 | Real auth (Supabase) — replace demo123 | Day 2–3 |
| 3 | Live database — replace hardcoded data | Week 2 |
| 4 | Mobile caregiver app + GPS EVV clock-in | Week 3 |
| 5 | Real invoices + PDF generation | Week 4 |
