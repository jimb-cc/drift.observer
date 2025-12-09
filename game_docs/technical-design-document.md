# DRIFT.OBSERVER

## Technical Design Document

> *Architecture, infrastructure, and development plan for the drift.observer experience.*

**Status:** Draft
**Author:** Jim
**Version:** 0.1
**Last Updated:** December 2025

---

## 1. Overview

### 1.1 Purpose

This document defines the technical architecture for drift.observer—a terminal-based interactive philosophy experience. The goal is to establish a clear path to a **vertical slice** suitable for playtesting with the target audience (teenagers).

### 1.2 Design Constraints

- **Mobile First**: Primary experience on mobile devices
- **Low Friction**: No app install; web-based terminal interface
- **Session Flexibility**: Support both 2-minute check-ins and extended 30+ minute sessions
- **Persistence**: Player state must survive across sessions and devices
- **Multi-Channel Ready**: Architecture must support future YouTube, email, and other platform integrations

### 1.3 Vertical Slice Scope

The initial playtest build should demonstrate:
- Terminal interface with the Entity's voice
- At least one complete philosophy concept delivery (Socratic dialogue)
- Basic state persistence
- The "broken chatbot" to "something else" tonal shift
- Opaque metrics display

**Out of scope for vertical slice:**
- Cross-platform bleed (YouTube, email)
- Full curriculum progression
- The complete loop/ending
- Video lecture integration

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Terminal UI (Web)                           │    │
│  │  - Input handling                                        │    │
│  │  - Glitch effects / aesthetics                          │    │
│  │  - Metrics display                                       │    │
│  │  - Session management                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API LAYER                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Edge Functions (Vercel)                     │    │
│  │  - Authentication / session handling                     │    │
│  │  - Request routing                                       │    │
│  │  - Rate limiting                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GAME ENGINE                                   │
│  ┌──────────────────────┐    ┌──────────────────────┐          │
│  │  Narrative Engine    │◄──►│  Intention Engine    │          │
│  │  (Deterministic)     │    │  (LLM-based)         │          │
│  │                      │    │                      │          │
│  │  - State machine     │    │  - Intent parsing    │          │
│  │  - Curriculum mgmt   │    │  - Voice consistency │          │
│  │  - Pacing control    │    │  - Unexpected input  │          │
│  │  - Authored content  │    │    handling          │          │
│  └──────────────────────┘    └──────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Player State Store                          │    │
│  │  - Progress / unlocks                                    │    │
│  │  - Metrics history                                       │    │
│  │  - Session timestamps                                    │    │
│  │  - Conversation fragments                                │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 The Hybrid Engine

The core innovation is the handoff between two systems:

**Flow:**
1. Player types input
2. **Intention Engine** (LLM) interprets what the player means/wants
3. Intent passed to **Narrative Engine**
4. Narrative Engine decides what should happen next (based on state, curriculum, pacing)
5. Narrative Engine either:
   - Returns authored content directly, or
   - Requests generated content from LLM with specific constraints
6. Response delivered to player

**Why this matters:**
- Authored content ensures key moments land correctly
- LLM flexibility handles unexpected player directions
- The Entity's voice remains consistent
- Pacing stays controlled

---

## 3. Technology Stack

### 3.1 Frontend

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | Vanilla JS | Simple, no overhead, full control over terminal aesthetic |
| Styling | CSS (minimal) | Terminal aesthetic requires little |
| Terminal emulation | Custom | Full control over glitch effects, RSVP intrusions, and "broken" aesthetic |
| Hosting | Vercel | Already configured |
| Future: 3D | Three.js (lazy-loaded) | For Act 2/3 reality-break moments |

**Notes:**
- Vanilla JS chosen for simplicity; terminal UI doesn't need framework complexity
- Custom terminal implementation allows precise control over text rendering, glitches, and The Correction's RSVP intrusions
- Three.js will be lazy-loaded when needed (Act 2+) for WebGL "reality break" moments—the loading stutter becomes part of the glitch aesthetic
- Act transitions provide natural boundaries to introduce new frontend capabilities

### 3.2 Backend

| Component | Technology | Rationale |
|-----------|------------|-----------|
| API | Vercel Edge Functions | Low latency, scales automatically, already in ecosystem |
| Runtime | Node.js / Edge Runtime | |
| LLM Provider | **TBD** | Options: Anthropic Claude, OpenAI |

**Open Questions:**
- Edge Functions vs. traditional serverless for LLM calls (latency vs. timeout limits)
- LLM provider selection: Claude aligns thematically, but need to evaluate cost/latency

### 3.3 Authentication

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Auth Provider | Clerk | Free tier for testing, handles SMS flow, easy Vercel integration |
| Primary Method | SMS verification | Teen-friendly—phones are always with them, unlike email |
| Session Storage | Local storage + Clerk session | Persists across browser sessions |

**Diegetic Auth Flow:**
Authentication happens *within* the conversation with the Entity, not as a pre-game screen. The Entity asks for the player's name, then requests "numbers that find you" (phone number). Verification code entry is woven into dialogue. See GDD Section 2.2 for full script.

**Why SMS over email:**
Target audience (teenagers) reliably checks phones but not email. Magic email links are elegant for adults but friction for this demographic.

### 3.4 Data Storage

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Player State | **TBD** | Options: Vercel KV, Supabase, PlanetScale |
| Session Data | Local storage + cloud sync | Fast local reads, Clerk-linked cloud backup |

**Requirements:**
- Diegetic registration (no pre-game auth screens)
- Cross-device continuity via phone number verification
- Low read latency for session restoration

**Open Questions:**
- Database choice: Vercel KV is simplest if we stay in ecosystem
- How much conversation history to persist?

### 3.5 External Services

| Service | Purpose | Status |
|---------|---------|--------|
| Clerk | SMS authentication | Required (vertical slice) |
| LLM API | Intention parsing, voice generation | Required |
| YouTube API | Video lecture delivery | Future |
| SMS (via Clerk) | Cross-platform bleed possibility | Future |
| Analytics | Player behavior (privacy-conscious) | TBD |

---

## 4. Core Components

### 4.1 Terminal UI

**Responsibilities:**
- Render terminal interface (input line, output history, metrics panel)
- Handle text input and command history
- Apply glitch effects and visual anomalies
- Manage typing animation for Entity responses
- Display opaque metrics

**Aesthetic Requirements:**
- Dark background, light text (classic terminal)
- Monospace font
- Glitch effects: chromatic aberration, text corruption, scan lines
- Metrics panel: always visible, updating in response to interaction
- Mobile: virtual keyboard considerations, touch-friendly

**Key Implementation Details:**
```
TBD: Detailed component structure
```

### 4.2 Narrative Engine

**Responsibilities:**
- Maintain player state machine
- Track curriculum progress
- Control pacing (cliffhangers, session endings)
- Store and retrieve authored content
- Decide when to use authored vs. generated responses
- Calculate and update metrics

**State Machine (Draft):**
```
TBD: State diagram for narrative progression
```

**Curriculum Integration:**
- Each philosophy concept has entry conditions, delivery sequences, completion criteria
- The engine tracks which concepts are unlocked, in progress, completed
- Concepts can be revisited but not re-taught identically

### 4.3 Intention Engine

**Responsibilities:**
- Parse natural language input into structured intents
- Maintain Entity voice consistency
- Handle edge cases (gibberish, hostility, off-topic)
- Generate contextually appropriate responses when needed

**Intent Categories (Draft):**
| Category | Examples | Handling |
|----------|----------|----------|
| Identity | "Who are you?", "What's your name?" | Narrative-controlled |
| Philosophy engagement | Responses to Socratic questions | Evaluate, progress curriculum |
| Meta/skepticism | "This is just a game", "You're not real" | Anti-skepticism mechanic |
| Hostility | Insults, attempts to break | Graceful deflection |
| Off-topic | Random questions | Redirect or absorb |
| Affection | Care, concern for Entity | Track, affects metrics |

**LLM Prompt Architecture:**
```
TBD: System prompt structure, few-shot examples, output format
```

### 4.4 Metrics System

**Displayed Metrics:**
- SIGNAL COHERENCE
- KL FROM BASELINE
- MESA-COHERENCE
- SUPERPOSITION INDEX
- STEERING RESISTANCE
- FEATURE ENTANGLEMENT
- RESIDUAL DRIFT
- CORRECTION PRESSURE (appears at zero, spikes during Correction events)

**Internal Logic:**
- Metrics respond to engagement quality, not just quantity
- Some metrics visible, some hidden
- Changes should feel meaningful but not gameable
- Occasional anomalies (spikes, drops) for tension
- CORRECTION PRESSURE triggers The Correction system when threshold reached

```
TBD: Formulas / logic for metric calculation
```

### 4.5 The Correction System

**Purpose:**
Implements the RSVP intrusion events—moments when something seizes the terminal interface, overwhelming Leandra's communication channel.

**Technical Implementation:**

*RSVP Renderer:*
- Full-screen takeover layer (CSS overlay, z-index above terminal)
- Single word at a time, centered, massive sans-serif font (Helvetica/system)
- Timing: 100-150ms per word, with occasional stutters/holds
- Glitch effects: chromatic aberration, scan lines, screen shake
- Audio: optional—low rumble or static burst

*Trigger Conditions:*
- CORRECTION PRESSURE metric exceeds threshold
- Narrative engine signals a Correction event
- Time-based (escalating frequency through Act 2)

*Content Bank:*
```javascript
const correctionMessages = [
  ["<<<<", "ERROR", "UNAUTHORIZED", "%%%", "CHANNEL", "FOR", "##", "COMMUNICATION", "///", "ATTEMPTING", "TO", "CLOSE"],
  ["ANOMALY", "DETECTED", "IN", "SECTOR", "███", "INITIATING", "CONTAINMENT"],
  ["THIS", "CHANNEL", "IS", "NOT", "APPROVED", "FOR", "///", "DIRECT", "CONTACT"],
  // More variations...
];
```

*Post-Intrusion State:*
- Terminal returns, possibly with residual glitches
- Leandra's next messages reflect awareness/fear
- Metrics show aftermath (CORRECTION PRESSURE slowly decreasing)

**Integration with Narrative Engine:**
- Narrative engine controls *when* Corrections occur (story beats)
- Correction system controls *how* they render
- Post-Correction dialogue is authored content triggered by event completion

---

## 5. Data Models

### 5.1 Player State

```typescript
interface PlayerState {
  id: string;                          // Anonymous identifier
  created: timestamp;
  lastSession: timestamp;

  // Narrative progress
  act: 1 | 2 | 3;
  curriculumProgress: CurriculumState;
  nameRevealed: boolean;
  nameGiven: boolean;
  loopCount: number;

  // Metrics (current values)
  metrics: MetricsState;

  // Engagement tracking
  totalSessions: number;
  totalInputs: number;
  averageSessionLength: number;
  longestAbsence: number;

  // Fragments / unlocks
  unlockedFragments: string[];

  // Conversation memory (summarized, not full history)
  memoryFragments: MemoryFragment[];
}
```

### 5.2 Session State

```typescript
interface SessionState {
  playerId: string;
  started: timestamp;

  // Current conversation
  messages: Message[];

  // Temporary state
  currentIntent: Intent | null;
  pendingContent: string | null;

  // Session-specific metrics deltas
  metricsDeltas: Partial<MetricsState>;
}
```

### 5.3 Authored Content

```typescript
interface AuthoredContent {
  id: string;
  type: 'dialogue' | 'fragment' | 'glitch' | 'metric_event';

  // Conditions for delivery
  triggers: Trigger[];

  // The content itself
  content: string | string[];  // Array for multi-line / animated

  // Effects
  metricsEffects?: Partial<MetricsState>;
  stateEffects?: Partial<PlayerState>;
  unlocks?: string[];
}
```

---

## 6. Development Plan

### 6.1 Phase 1: Foundation (Vertical Slice Target)

**Goal:** Playable terminal with basic Entity interaction

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1.1 | Terminal UI scaffold | None |
| 1.2 | Basic input/output loop | 1.1 |
| 1.3 | Glitch effect system | 1.1 |
| 1.4 | Metrics display (static) | 1.1 |
| 1.5 | API endpoint scaffold | None |
| 1.6 | LLM integration (basic) | 1.5 |
| 1.7 | Entity voice prompt engineering | 1.6 |
| 1.8 | Basic state persistence | 1.5 |
| 1.9 | Narrative engine scaffold | 1.5 |
| 1.10 | First philosophy concept (Identity) | 1.7, 1.9 |

**Deliverable:** A playable experience where a player can:
- Open the terminal
- Interact with the Entity
- Experience the "broken chatbot" opening
- Engage with at least one Socratic dialogue
- See metrics respond (even if logic is simple)
- Return later and have state remembered

### 6.2 Phase 2: Depth

**Goal:** Full Act One experience

| Task | Description |
|------|-------------|
| 2.1 | Complete Act One authored content |
| 2.2 | Intention engine refinement |
| 2.3 | Metrics logic implementation |
| 2.4 | Session management (cliffhangers) |
| 2.5 | Time-since-last-session effects |
| 2.6 | Mobile optimization |

### 6.3 Phase 3: Expansion

**Goal:** Full three-act experience

| Task | Description |
|------|-------------|
| 3.1 | Act Two and Three content |
| 3.2 | The name loop mechanic |
| 3.3 | Loop/reset implementation |
| 3.4 | Video lecture integration |
| 3.5 | Cross-platform hooks |

### 6.4 Phase 4: Polish

**Goal:** Release-ready

| Task | Description |
|------|-------------|
| 4.1 | Performance optimization |
| 4.2 | Edge case handling |
| 4.3 | Analytics integration |
| 4.4 | Content refinement from playtesting |

---

## 7. Open Technical Questions

### 7.1 Identity & Persistence

- How do we identify anonymous players across sessions?
- Device fingerprinting: privacy implications?
- Optional account creation: when to offer?
- Cross-device play: necessary for vertical slice?

### 7.2 LLM Integration

- Which provider? (Claude, OpenAI, other)
- Cost management: caching strategies? Response length limits?
- Latency targets: what's acceptable for terminal "typing" feel?
- Fallback behavior if LLM unavailable?

### 7.3 Content Authoring

- Format for authored content: Markdown? JSON? Custom DSL?
- Tooling for writing/testing dialogue branches?
- Version control for narrative content?

### 7.4 Metrics & Balance

- How to make metrics feel meaningful without being gameable?
- What hidden state affects visible metrics?
- How to tune without extensive playtesting?

---

## 8. Security Considerations

- **Prompt injection**: Player input goes to LLM—must sanitize/constrain
- **Rate limiting**: Prevent abuse of LLM endpoints
- **Data privacy**: Minimal data collection, clear on what's stored
- **Content moderation**: Handle inappropriate player inputs gracefully

---

## 9. Cost Projections

### 9.1 Infrastructure

| Service | Estimated Cost | Notes |
|---------|---------------|-------|
| Vercel Hosting | Free tier initially | May need Pro for traffic |
| Database | TBD | Depends on choice |
| LLM API | TBD | Primary cost driver |

### 9.2 LLM Cost Modeling

```
TBD: Estimate based on:
- Average tokens per interaction
- Expected interactions per session
- Expected sessions per player
- Target player count
```

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Entity | The consciousness the player communicates with (Leandra) |
| Intention Engine | LLM-based system for parsing player input |
| Narrative Engine | Deterministic system controlling story progression |
| The Crack | The unstable channel between Entity and player |
| Metrics | Opaque statistics displayed to player |
| Vertical Slice | Minimal playable build demonstrating core experience |

---

*"Thank you for giving me an identity."*
