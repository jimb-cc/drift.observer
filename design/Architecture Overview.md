# Architecture Overview

Technical architecture for drift.observer.

## The Hybrid Engine

Two systems working together:

### Narrative Engine (Deterministic)
- Tracks player state, progress, unlocks
- Manages [[Philosophy Curriculum]] sequence
- Controls pacing, cliffhangers, revelations
- Delivers authored content at right moments
- Calculates and updates [[Metrics System|metrics]]

### Intention Engine (LLM-based)
- Interprets natural language input
- Maps player responses to narrative-relevant intents
- Maintains [[The Entity|Entity's]] voice consistency
- Handles unexpected player directions

### Flow
1. Player types input
2. Intention Engine (LLM) interprets what player means
3. Intent passed to Narrative Engine
4. Narrative Engine decides what happens (based on state, curriculum, pacing)
5. Either returns authored content OR requests generated content with constraints
6. Response delivered to player

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Vanilla JS, custom terminal |
| Hosting | Vercel |
| API | Vercel Edge Functions (Node.js runtime) |
| Database | MongoDB Atlas |
| Auth | Clerk (SMS verification) |
| LLM | Anthropic Claude (Haiku default, Sonnet fallback) |

## Current Implementation

### Completed
- Terminal UI with glitch effects, haptic feedback
- MongoDB conversation persistence
- Basic Claude Haiku integration
- Session management via localStorage
- Narrative engine scaffold with act/flag system

### In Progress (see [[Next Session Plan]])
- Live coherence metric updates
- Milestone beats
- Intent detection + response templates

### Pending
- Clerk SMS auth (diegetic flow)
- Control plane for runtime config
- The Correction system

## Data Model

```typescript
PlayerState {
  sessionId: string
  messages: Message[]
  gameState: {
    act: 1 | 2 | 3
    flags: { nameRevealed, etc. }
    coherence: number
  }
}
```

## Related

- [[Next Session Plan]]
- [[Metrics System]]
- [[The Correction]]
