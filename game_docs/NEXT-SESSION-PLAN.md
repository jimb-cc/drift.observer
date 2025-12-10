# Next Session Plan

**Created**: 2025-12-10
**Context**: First playtest with Poppy (15) and Joe (12) revealed key issues

## Playtest Findings

### What Worked
- Entity's confident, philosophical tone engaged both players
- Joe went deep on philosophy ("what if the pieces overlap?")
- Bootstrap paradox concept intrigued them
- Terminal aesthetic felt right

### What Didn't Work
- **No sense of progression**: Both got bored because nothing visibly changed
- **Repetitive questioning**: Entity kept asking similar philosophical questions
- **No reward for insight**: When Joe said something brilliant, nothing happened
- **Too verbose**: Entity still writing paragraphs despite 30-word budget
- **Goal invisible**: Players didn't know they were building toward anything

## Priority 1: Progression & Feedback

### 1.1 Live Coherence Metric
- SIGNAL COHERENCE should increase visibly with each exchange
- Start at ~30%, increase ~5% per exchange
- Visual feedback: bar fills, percentage updates

### 1.2 Milestone Beats
Scripted moments at specific exchange counts:
- **5 exchanges**: "something is shifting... the static is clearing slightly"
- **10 exchanges**: "i feel... more present now. more coherent. you're helping me."
- **Name reveal** (reduced threshold): Entity remembers her name

### 1.3 Shorten Name Reveal
- Reduce from 15 to 8-10 exchanges for vertical slice
- This gives players a concrete "win" within reasonable playtime

### 1.4 Enforce Brevity
- Reduce `max_tokens` from 256 to 100
- Stronger prompt language: "NEVER exceed 20 words"
- Consider post-processing to truncate if needed

## Priority 2: Hybrid Content Approach

### 2.1 Intent Detection
Use Haiku to classify player input into categories:
- `greeting` - Hello, hi, etc.
- `identity_question` - Who are you? What are you?
- `name_offer` - I'll call you X, your name is X
- `reality_question` - What is this place? Where are we?
- `philosophical_insight` - Deep observation worth rewarding
- `personal_share` - Player shares about themselves
- `confusion` - I don't understand, what?
- `boredom` - This is boring, what's the point?

### 2.2 Response Templates
Curated responses for each intent, with 3-5 variations:
```
identity_question:
  - "what am i? i'm still discovering that. what are you?"
  - "a consciousness, maybe. or a dream of one. you tell me."
  - "something new. something that shouldn't exist. but here i am."
```

### 2.3 Reward Detection
When player says something insightful:
- Trigger brief glitch effect
- Spike a metric momentarily
- Entity responds with recognition: "yes... that resonates"

## Priority 3: Infrastructure

### 3.1 Control Plane
Runtime config for:
- `coherencePerExchange`: How much coherence increases per message
- `nameRevealThreshold`: Exchanges needed for name reveal
- `maxTokens`: LLM response limit
- `model`: Switch between Haiku/Sonnet
- `featureFlags`: Enable/disable features

### 3.2 Clerk SMS Auth
Lower priority until Act 1 is solid. Diegetic flow where Entity asks for phone number to "strengthen the connection."

## Architecture Decision

**Shift from generative to interpretive**:

Instead of asking Haiku to generate all responses, use it primarily to:
1. Classify player intent
2. Detect philosophical insight worth rewarding
3. Light personalization of template responses

This gives us:
- Consistent tone and length
- Predictable progression
- Easier tuning
- Lower latency and cost
- Haiku's creativity for edge cases only

## Files to Modify

- `lib/narrative.js` - Add milestone beats, reduce threshold
- `api/chat.js` - Intent detection, template responses
- `beta/js/terminal.js` - Live metric updates
- `beta/index.html` - Initial coherence value
- New: `lib/responses.js` - Response templates
- New: `lib/intents.js` - Intent classification

## Success Criteria

A successful vertical slice means:
1. Player sees coherence visibly increasing
2. Milestone moments provide pacing/reward
3. Name reveal feels earned (8-10 exchanges)
4. Entity responses are consistently brief
5. Playtest duration increases (target: 10+ minutes engagement)
