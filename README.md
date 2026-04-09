<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1MoThE5dxr3NAaUFVImUWaDFDUBbYAsGU

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create a local env file (copy `.env.example` to `.env.local`) and fill in keys
3. Run the app:
   `npm run dev`

## Deployment environment variables

Set these environment variables in your deployment provider to enable Claude Sonnet 4.5 (or Google models):

- `AI_PROVIDER` — `anthropic` or `google` (set to `anthropic` to use Claude)
- `AI_MODEL` — `claude-sonnet-4.5` (or your preferred model)
- `ANTHROPIC_API_KEY` — your Anthropic/Claude API key (required when `AI_PROVIDER=anthropic`)
- `API_KEY` — your Google GenAI API key (required when `AI_PROVIDER=google`)

PowerShell quickset (session only):

```powershell
$env:AI_PROVIDER='anthropic'
$env:AI_MODEL='claude-sonnet-4.5'
$env:ANTHROPIC_API_KEY='your_anthropic_api_key_here'
npm run dev
```

Common hosts:

- Vercel / Netlify: set the environment variables in Project Settings → Environment Variables.
- Azure App Service: set Application Settings in the portal.
- Docker: pass env vars with `-e` or through an env file.

Security: never commit secrets. Keep `.env.local` in `.gitignore`.
