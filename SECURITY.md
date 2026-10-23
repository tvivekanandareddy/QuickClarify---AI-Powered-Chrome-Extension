# Security

QuickClarify is a local development application. Run its backend on `127.0.0.1`; do not expose it to the internet without adding authentication, rate limits, HTTPS, and a deployment security review.

## API keys

- Copy `.env.example` to `.env` and enter your own key only in `.env`.
- Never put a key in extension JavaScript, screenshots, issues, documentation, or commits.
- `.gitignore` excludes `.env` and its variants; do not override it with `git add --force`.
- Use an API project key with the permissions needed for Responses, and review account usage and billing regularly.
- If a key is exposed, revoke it in the provider dashboard and create a replacement. Removing a file from the latest commit does not remove secrets from Git history.

## User content

Live requests send the selected text and custom instructions to OpenAI. Avoid submitting content you are not allowed to share. AI answers and generated code need review before use. `store=False` does not guarantee that all provider-side retention is disabled.

## Reporting a vulnerability

Do not include credentials or sensitive user content in a public issue. For a sensitive report, use GitHub's private vulnerability reporting feature if it is enabled for this repository. If it is unavailable, open a minimal issue requesting a private reporting channel without publishing exploit details or secrets.
