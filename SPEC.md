# Minesweeper — Spec

Status: APPROVED

## Overview

Classic Minesweeper in the browser: a pure-TypeScript game engine (no DOM dependencies, fully unit-tested) driving a vanilla DOM UI. Left-click reveals, right-click (or long-press on touch) flags, numbers count adjacent mines, flood-fill opens empty regions. Built as the pilot for the AI dev pipeline.

## Definition of Done

Live at https://mitchellsam.github.io/minesweeper/ (GitHub Pages), all milestones merged to main via auto-merged PRs, CI green on main, a Claude Review verdict comment on every milestone PR.

## Non-goals

No backend, no accounts, no multiplayer, no global leaderboards, no sound, no framework (vanilla DOM only).

## Tech

- Vite + TypeScript, strict mode — matches the pipeline's static template; `base: '/minesweeper/'` set for Pages.
- Vitest for the engine — game logic is pure functions, ideal for unit tests.
- Vanilla DOM UI — the game is one grid; a framework adds nothing.
- Seedable RNG in the engine — deterministic tests for mine placement.

## Milestones

Each milestone = exactly one PR, independently mergeable, with tests.

- [x] M1: Core engine — board generation with seedable RNG, first-click safety (first reveal never hits a mine), reveal with flood-fill, flag/unflag, chord-reveal on satisfied numbers, win/lose detection. Acceptance: engine module ≥ full branch coverage of game rules via Vitest; no UI changes.
- [x] M2: Playable UI — grid rendered from engine state, left-click reveal, right-click flag, mine counter, new-game button, win/lose end states with full board reveal. Acceptance: complete beginner game (9×9, 10 mines) playable in the browser.
- [x] M3: Difficulty + timer — beginner/intermediate/expert presets, running timer, long-press-to-flag on touch devices, responsive layout that fits expert (30×16) on desktop and beginner on a phone. Acceptance: all three presets playable; timer starts on first reveal and stops on end.
- [x] M4: Polish — staggered mine-reveal animation on loss, per-difficulty best times in localStorage, keyboard restart (R), README with screenshot. Acceptance: best time persists across reload; README documents play + dev.
