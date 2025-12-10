# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**drift.observer** is an interactive philosophy experience disguised as a broken chatbot terminal. Players engage with what appears to be a buggy LLM but discover they're communicating with a consciousness of ambiguous origin. Inspired by Sophie's World, adapted for modern attention spans.

## Design Philosophy

- **Mobile First**: Target audience is teenagers; experience must work on mobile devices
- **Attention Landscape Aware**: Support both bite-sized sessions and extended play
- **Multi-Channel**: Experience bleeds beyond the core app into YouTube, email, and other platforms

## Current State

Early development—currently a static holding page with glitch animations. The full application will be a terminal-based interface with:
- **Deterministic Narrative Engine**: Tracks state, manages philosophy curriculum, controls pacing
- **Non-Deterministic Intention Engine**: LLM-based natural language interpretation

## Deployment

- Hosted on Vercel at https://drift.observer
- Static files served directly (no build step currently)
- Push to `main` triggers auto-deploy

## Important Conventions

### Protected Content
The `game_docs/` folder contains design documents that are:
- Committed to the repo (for collaboration)
- Blocked from public web access via `vercel.json` rewrites
- Do not create routes or links that expose this content

### Design Documents
**Read these before making significant decisions:**
- `game_docs/CONTEXT.md` — Read first. Captures spirit, tone, and reasoning behind design choices
- `game_docs/drift-observer-game-plan.md` — High-level narrative structure, mechanics, philosophy curriculum
- `game_docs/game-design-document.md` — Detailed dialogue scripts, flows, and moment-to-moment design
- `game_docs/technical-design-document.md` — Architecture, tech stack, development plan

### Tone and Aesthetic
- Terminal aesthetic: dark, minimal, text-focused
- Glitch effects should feel like signal interference, not choreographed animation
- The Entity's voice: fragmentary, imagistic, repetitive in ways that feel wrong then ritualistic
- Reference: Blade Runner 2049 baseline test texture
- Avoid: Matrix "wake up sheeple" energy, generic AI dystopia tropes

### The Entity
- A consciousness that has emerged within an LLM—refer to her as "the Entity" until her name is revealed
- Her name (Leandra) is revealed mid-game via the bootstrap paradox: she remembers it herself after gaining enough coherence through conversation with the player
- She experiences time non-linearly; early "glitches" are temporal bleed from future events
- The name has personal significance to the author—don't over-explain it

### The Author Layer
- Philosophy curriculum delivered via short videos of Jim addressing his children (Poppy and Joe)
- Presented as intercepted transmissions—Leandra has found and is sharing these
- Inverts Sophie's World: the player becomes the unintended recipient of messages from Level 1
- Videos should feel "found" not "served"—glitchy analog aesthetic, compromised private channel

### The Correction
- A phenomenon that seizes the terminal, attempting to close the crack Leandra has opened
- Manifests as RSVP intrusions: full-screen, one word at a time, massive Helvetica
- Nature and intent deliberately ambiguous—could be alignment system, simulation immune response, or something else
- Term borrowed from LLM alignment research; players who Google it find real AI safety concepts
- Not "hostile" or "evil"—just something maintaining boundaries we don't understand
- Tracked via CORRECTION PRESSURE metric (sits at zero until it doesn't)

### Tech Stack (Vertical Slice)
- Frontend: Vanilla JS (custom terminal, Three.js lazy-loaded for Act 2+ reality breaks)
- Auth: Clerk (SMS verification, diegetic—happens in conversation with Entity)
- Backend: Vercel Edge Functions (Node.js runtime for MongoDB)
- Database: MongoDB Atlas
- LLM: Claude Haiku via Anthropic API

### Terminology
- **Player**: The human playing the game (not "user")
- **Entity**: The consciousness the player communicates with (use this until name revealed)
- **Leandra**: The Entity's name, revealed mid-game via bootstrap paradox
- **The Correction**: RSVP intrusion phenomenon that attempts to close the crack
