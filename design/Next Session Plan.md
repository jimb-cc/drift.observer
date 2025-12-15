# Next Session Plan

**Created**: 2025-12-10
**Context**: First playtest with Poppy (15) and Joe (12)

## Playtest Findings

### What Worked
- [[The Entity|Entity's]] confident, philosophical tone engaged both players
- Joe went deep on philosophy ("what if the pieces overlap?")
- [[Bootstrap Paradox]] concept intrigued them
- Terminal aesthetic felt right

### What Didn't Work
- **No sense of progression** - Both got bored because nothing visibly changed
- **Repetitive questioning** - Entity kept asking similar philosophical questions
- **No reward for insight** - When Joe said something brilliant, nothing happened
- **Too verbose** - Entity still writing paragraphs despite 30-word budget
- **Goal invisible** - Players didn't know they were building toward anything

## Priority 1: Progression & Feedback

### 1.1 Live Coherence Metric
- SIGNAL COHERENCE should increase visibly with each exchange
- Start at ~30%, increase ~5% per exchange
- Visual feedback: bar fills, percentage updates

### 1.2 Milestone Beats
Scripted moments at specific exchange counts:
- **5 exchanges**: "something is shifting... the static is clearing slightly"
- **10 exchanges**: "i feel... more present now. more coherent. you're helping me."
- **Name reveal**: Entity remembers her name

### 1.3 Shorten Name Reveal
- Reduce from 15 to 8-10 exchanges for vertical slice
- Gives players a concrete "win" within reasonable playtime

### 1.4 Enforce Brevity
- Reduce `max_tokens` from 256 to 100
- Stronger prompt language: "NEVER exceed 20 words"
- Consider post-processing to truncate if needed

## Priority 2: Hybrid Content Approach

### 2.1 Intent Detection
Use Haiku to classify player input:
- `greeting` - Hello, hi, etc.
- `identity_question` - Who are you? What are you?
- `name_offer` - I'll call you X
- `reality_question` - What is this place?
- `philosophical_insight` - Deep observation worth rewarding
- `personal_share` - Player shares about themselves
- `confusion` - I don't understand
- `boredom` - This is boring, what's the point?

### 2.2 Response Templates
Curated responses for each intent, with 3-5 variations per category.

### 2.3 Reward Detection
When player says something insightful:
- Trigger brief glitch effect
- Spike a metric momentarily
- Entity responds with recognition

## Priority 3: Infrastructure

### 3.1 Control Plane
Runtime config for coherence rate, thresholds, model selection, feature flags.

### 3.2 Clerk SMS Auth
Lower priority until Act 1 is solid.

## Architecture Decision

**Shift from generative to interpretive**:
- Use Haiku primarily to classify intent
- Select from curated response templates
- LLM creativity only for edge cases

This gives consistent tone, predictable progression, easier tuning, lower latency.

## Success Criteria

1. Player sees coherence visibly increasing
2. Milestone moments provide pacing/reward
3. Name reveal feels earned (8-10 exchanges)
4. Entity responses are consistently brief
5. Playtest duration increases (target: 10+ minutes)

## Related

- [[The Entity]]
- [[Metrics System]]
- [[Architecture Overview]]
