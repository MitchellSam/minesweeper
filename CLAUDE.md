# CLAUDE.md

## Project

Classic Minesweeper in the browser: pure-TypeScript game engine + vanilla DOM UI, built with Vite and deployed to GitHub Pages. Pilot project for the AI dev pipeline.

Type: static. Spec lives in SPEC.md — it is the source of truth for scope and the definition of done.

## Pipeline

This repo is wired into the AI dev pipeline (see ~/Code/PIPELINE.md):

- All work happens on milestone branches and merges to `main` via PR.
- CI (`ci.yml`) must be green; PRs auto-merge (`gh pr merge --auto --squash`) once CI passes and the Claude Review comment is not a `VERDICT: BLOCK`.
- Never push directly to `main`. Never commit `.env`/secrets (a global hook also blocks this).
- Merges to main deploy to GitHub Pages automatically.

## Commands

- `npm run dev` — local dev server
- `npm test` — tests (Vitest)
- `npm run lint` / `npm run typecheck` / `npm run build`
