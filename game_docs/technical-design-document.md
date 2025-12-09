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
| LLM Provider | Anthropic Claude | Thematic alignment (fourth wall buckles), excellent instruction-following |
| LLM Models | Haiku for intent parsing, Sonnet for voice generation | Cost optimization—use smallest appropriate model |

**Notes:**
- Haiku handles intent classification and simple parsing (fast, cheap)
- Sonnet for generating Leandra's voice when authored content doesn't cover the situation
- Potential internal sponsorship may reduce/eliminate LLM costs—revisit later
- For vertical slice: accept downtime if any stack component is unavailable (no graceful degradation yet)

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
| Player State | MongoDB Atlas | Flexible document model, familiar territory |
| Session Data | Local storage + MongoDB sync | Fast local reads, cloud backup via Clerk user ID |

**Requirements:**
- Diegetic registration (no pre-game auth screens)
- Cross-device continuity via phone number verification
- Low read latency for session restoration

**Conversation History:**

Two distinct layers:

| Layer | What | Purpose |
|-------|------|---------|
| Operational Log | Full transcript | Debugging, tuning, analytics (controlled by logging verbosity) |
| Leandra's Memory | Key moments + last 10 exchanges | What she can actually "remember" and reference |

**Leandra's Memory Model:**
- **Recent context**: Last 10 player inputs and her responses (sliding window)
- **Key moments**: Narrative-significant exchanges flagged in GDD scripts (e.g., name given, philosophy breakthroughs, emotional beats)
- Imperfect memory is thematically appropriate—she experiences time non-linearly

Key moments are defined per-script in the GDD with a `[MEMORY: key_name]` tag.

### 3.5 External Services

| Service | Purpose | Status |
|---------|---------|--------|
| Clerk | SMS authentication | Required (vertical slice) |
| Anthropic API | Intent parsing (Haiku), voice generation (Sonnet) | Required |
| YouTube API | Video lecture delivery (Jim's videos) | Future |
| SMS (via Clerk) | Cross-platform bleed possibility | Future |
| Text-to-Speech | Leandra speaking audibly (world-breaking moment only) | Future, optional |
| Analytics | Player behavior (privacy-conscious) | TBD |

**Note on Audio:**
Leandra communicates through text only. She does not speak audibly—this is core to the terminal aesthetic and her nature. However, a brief moment where she *does* speak (perhaps a single word, perhaps at a critical narrative beat) could serve as a world-breaking moment similar to the WebGL shift. This would be deeply unsettling precisely because the player has learned she doesn't have a voice.

### 3.6 Control Plane

A live game control plane for runtime configuration, monitoring, and debugging.

**Core Capabilities:**

| Feature | Purpose | Scope |
|---------|---------|-------|
| Logging Verbosity | Control detail level of conversation/event logs | Global, per-segment, per-player |
| Feature Flags | Enable/disable features without deploy | Global |
| Narrative Overrides | Force narrative state for testing | Per-player |
| Metrics Tuning | Adjust metric calculation parameters | Global |
| LLM Parameters | Temperature, model selection, prompt variants | Global |
| Rate Limits | Adjust interaction throttling | Global, per-segment |

**Logging Levels:**
```
OFF     - No logging
ERROR   - Errors only
WARN    - Errors + warnings
INFO    - Standard operational logging
DEBUG   - Detailed conversation flow
TRACE   - Full LLM prompts/responses, state transitions
```

**Future Segmentation (Post-Vertical Slice):**
- Cohort-based configuration (beta testers, age groups, etc.)
- A/B testing for narrative variants
- Per-player overrides for debugging specific issues

**Implementation:**
- MongoDB collection for control plane state
- Admin UI (simple, possibly just a protected route initially)
- Client polls for config on session start and periodically
- Changes take effect without redeploy

**Vertical Slice Scope:**
- Global logging verbosity toggle
- Basic feature flags
- Simple admin interface (authenticated, not pretty)

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
  id: string;                          // Clerk user ID
  playerName: string;                  // What they told Leandra to call them
  created: timestamp;
  lastSession: timestamp;

  // Narrative progress
  act: 1 | 2 | 3;
  curriculumProgress: CurriculumState;
  nameRevealed: boolean;               // Leandra has disclosed her name
  nameGiven: boolean;                  // Player has given the name back
  loopCount: number;                   // Times they've completed the loop

  // Metrics (current values)
  metrics: MetricsState;

  // Engagement tracking
  totalSessions: number;
  totalInputs: number;
  averageSessionLength: number;
  longestAbsence: number;              // For "crack healing" mechanic

  // Fragments / unlocks
  unlockedFragments: string[];

  // Leandra's memory
  keyMoments: KeyMoment[];             // Narrative-significant exchanges (flagged in GDD)
  recentExchanges: Exchange[];         // Last 10 inputs/responses (sliding window)
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

**Goal:** Playable terminal with diegetic auth and basic Entity interaction

| Task | Description | Dependencies |
|------|-------------|--------------|
| 1.1 | Terminal UI scaffold | None |
| 1.2 | Basic input/output loop | 1.1 |
| 1.3 | Glitch effect system | 1.1 |
| 1.4 | Metrics display (static) | 1.1 |
| 1.5 | API endpoint scaffold | None |
| 1.6 | MongoDB Atlas setup | None |
| 1.7 | Clerk SMS auth integration | 1.5 |
| 1.8 | Diegetic auth flow (in-conversation registration) | 1.2, 1.7 |
| 1.9 | Player state persistence | 1.6, 1.7 |
| 1.10 | Control plane (logging, feature flags, admin UI) | 1.5, 1.6 |
| 1.11 | LLM integration (Anthropic Claude) | 1.5 |
| 1.12 | Entity voice prompt engineering | 1.11 |
| 1.13 | Narrative engine scaffold | 1.5, 1.9 |
| 1.14 | First philosophy concept (Identity) | 1.12, 1.13 |

**Deliverable:** A playable experience where a player can:
- Open the terminal
- Register via diegetic SMS auth (phone number woven into conversation)
- Interact with the Entity
- Experience the "broken chatbot" opening
- Engage with at least one Socratic dialogue
- See metrics respond (even if logic is simple)
- Return later and have state remembered
- Admin can adjust logging verbosity and feature flags via control plane

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

### 7.1 Identity & Persistence — RESOLVED

- ~~How do we identify anonymous players across sessions?~~ → Clerk SMS auth, diegetic flow
- ~~Device fingerprinting: privacy implications?~~ → Not needed, using phone number
- ~~Optional account creation: when to offer?~~ → Required as part of first conversation
- ~~Cross-device play: necessary for vertical slice?~~ → Yes, via phone number verification

### 7.2 LLM Integration — RESOLVED

- ~~Which provider?~~ → Anthropic Claude (Haiku for intent, Sonnet for voice)
- Cost management: caching strategies? Response length limits? → **Still open**
- Latency targets: what's acceptable for terminal "typing" feel? → **Still open**
- ~~Fallback behavior if LLM unavailable?~~ → Accept downtime for vertical slice

### 7.3 Content Authoring — RESOLVED

- ~~Format for authored content~~ → YAML files in repo (`game_docs/scripts/`)
- Tooling for writing/testing dialogue branches? → **Still open** (nice-to-have)
- ~~Version control for narrative content?~~ → Git, deployed with the app

**Authoring Workflow:**
1. Write/edit in a spell-check-friendly environment (Google Docs, Notion, etc.)
2. Export/copy to YAML files in repo
3. Commit and deploy—content ships with the app
4. No MongoDB for content; keeps it simple

### 7.4 Metrics & Balance — OPEN

- How to make metrics feel meaningful without being gameable?
- What hidden state affects visible metrics?
- How to tune without extensive playtesting? → Control plane will help here

### 7.5 Environments — RESOLVED

**Vertical Slice Phase:**

| Environment | URL | Purpose |
|-------------|-----|---------|
| Production (landing) | drift.observer | Current holding page, public |
| Beta | drift.observer/beta | Active development/testing |

- Beta path protected from indexing via `robots.txt` and `<meta name="robots" content="noindex, nofollow">`
- Both environments deploy from same Vercel project
- Landing page remains at root; app builds to `/beta`

**Future (Post-Vertical Slice):**

| Environment | URL | Purpose |
|-------------|-----|---------|
| Production | drift.observer | Live game |
| Staging | beta.drift.observer | Pre-release testing |
| Dev | localhost / preview URLs | Development |

- Staging will need proper access control (Clerk can gate by allowed phone numbers or add password protection)
- Separate MongoDB databases per environment
- Consider Vercel preview deployments for PR reviews

---

## 8. Security Considerations

- **Prompt injection**: Player input goes to LLM—must sanitize/constrain
- **Rate limiting**: Prevent abuse of LLM endpoints
- **Data privacy**: Minimal data collection, clear on what's stored
- **Content moderation**: Handle inappropriate player inputs gracefully
- **Beta access**: noindex/nofollow for now; proper auth gating for future staging environment

---

## 9. Cost Projections

### 9.1 Infrastructure

| Service | Estimated Cost | Notes |
|---------|---------------|-------|
| Vercel Hosting | Free tier initially | May need Pro for traffic |
| MongoDB Atlas | Free tier (512MB) | Sufficient for vertical slice |
| Clerk | Free tier (100 SMS/month) | Sufficient for playtesting |
| Anthropic API | TBD | Primary cost driver; potential internal sponsorship |

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
