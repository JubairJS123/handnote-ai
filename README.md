# HandNote AI — GitHub/Render Server

This is the server-ready package for HandNote AI.

## Files to upload to GitHub

Upload these:
- `server.mjs`
- `package.json`
- `.gitignore`
- `.env.example`
- the `public` folder (containing `index.html`)

## Important security rule

DO NOT upload your real `.env` file or API key to GitHub.

## Local test

1. Install Node.js.
2. Open a terminal in this folder.
3. Run `npm install`
4. Copy `.env.example` to `.env`
5. Put your real API key in `.env`
6. Run `npm start`
7. Open `http://localhost:3000`

## Render

Create a Web Service from this GitHub repository.
- Build command: `npm install`
- Start command: `npm start`
- Add `OPENAI_API_KEY` as a Render environment variable.
- Do not commit the API key to GitHub.

The frontend is served by the same Node server, so the browser can call `/api/chat` without the “Failed to fetch” problem caused by opening the HTML file directly.

Before public launch, add authentication, server-side usage limits, database storage, payment verification, rate limiting, logging, and privacy/security controls.
