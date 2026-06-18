# Psihologie Quiz

A study app for the psychology license exam (Facultatea de Psihologie și Științele
Educației Brașov, 2026). Progressive Web App — installs to a phone home screen,
works offline, no app store needed.

- **964 questions** across 5 chapters, in three formats: single answer
  (*răspuns unic*), multiple answers (*răspuns multiplu*), and true/false.
- Instant right/wrong feedback, missed-question review, per-chapter progress,
  light/dark theme. All progress is stored on-device (localStorage).

## Project layout

```
psihologie-quiz/
├─ extract_questions.py      # parses the source PDF → quiz-app/src/data/questions.json
└─ quiz-app/                 # the web app (React + Vite) — this is what gets deployed
   ├─ src/
   └─ dist/                  # production build output (generated)
```

## Develop locally

```bash
cd quiz-app
npm install
npm run dev        # http://localhost:5173
```

## Build for production

```bash
cd quiz-app
npm run build      # outputs to quiz-app/dist
```

## Deployment

Hosted on Cloudflare Pages.
- **Root directory:** `quiz-app`
- **Build command:** `npm run build`
- **Build output directory:** `dist`

## Regenerate questions (if the PDF changes)

```bash
python extract_questions.py
```
