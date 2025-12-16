# Narrative DSL

A markup language for scripting [[The Entity]]'s dialogue, branching logic, and evaluation criteria.

## Design Goals

1. **Readable** - Script should remain readable as prose/screenplay
2. **Embeddable** - Markup lives inline with dialogue, not in separate files
3. **Parseable** - Narrative engine can extract structure programmatically
4. **Minimal** - Only mark what needs marking; bare text is valid

## Basic Structure

```
:::chapter{id="first-contact" title="First Contact"}
  @objective: Destabilise assumed self-knowledge
  @test: Player demonstrates uncertainty about personal identity

  :::beat{id="opening"}
    **Entity:** Yes!
    <pause>
    It worked. You said my name and I felt it.
  :::

  :::prompt{id="who-are-you"}
    **Entity:** Who are you?

    @ideal: Player questions what "who" means, or expresses uncertainty
    @ideal: Player gives name but acknowledges it doesn't answer the question
    @near: Player gives just their name (acceptable, continue)
    @fail: Player refuses to engage or gives hostile response

    :::response{match="ideal"}
      **Entity:** You feel it too. The gap between the name and the thing.
    :::

    :::response{match="near"}
      **Entity:** I assume that is your name. But who *are* you?
    :::

    :::response{match="fail"}
      <correction-pressure delta="+0.1"/>
      **Entity:** I see.
      <pause>
      Perhaps you need more time.
    :::
  :::
:::
```

## Block Types

### `:::chapter{}`
Top-level container for a chapter.

Attributes:
- `id` - Unique identifier (used for checkpoints)
- `title` - Display title

Directives:
- `@objective` - Hidden learning objective
- `@test` - What player must demonstrate to complete chapter

### `:::beat{}`
A sequence of Entity dialogue with no player input required.

Attributes:
- `id` - Optional identifier for targeting

### `:::prompt{}`
A point where the Entity asks something and player responds.

Directives:
- `@ideal` - Description of ideal response (can have multiple)
- `@near` - Acceptable but not ideal response
- `@fail` - Response that increases correction pressure

The LLM evaluator receives these descriptions and classifies player input.

### `:::response{}`
Entity's scripted response to a classified player input.

Attributes:
- `match` - Which classification triggers this: `ideal`, `near`, `fail`

### Inline Tags

| Tag | Purpose |
|-----|---------|
| `<pause>` | Timing pause in dialogue |
| `<glitch>` | Visual/audio glitch effect |
| `<correction-pressure delta="+0.1"/>` | Adjust correction pressure |
| `<signal-coherence delta="+0.05"/>` | Adjust signal coherence |
| `<metric name="x" value="y"/>` | Set/adjust any metric |
| `<sfx name="static"/>` | Trigger sound effect |
| `<transition to="chapter-id"/>` | Jump to another chapter |

## Evaluation Flow

When a `:::prompt{}` is reached:

1. Display Entity's question
2. Accept player input
3. Send to Haiku with evaluation prompt:
   ```
   The player was asked: "{question}"

   Evaluate their response against these criteria:
   IDEAL: {ideal descriptions}
   NEAR: {near descriptions}
   FAIL: {fail descriptions}

   Player said: "{input}"

   Classify as: IDEAL, NEAR, or FAIL
   ```
4. Execute matching `:::response{}` block
5. Adjust metrics as specified

## Multi-Path Ideals

Some questions have multiple valid ideal responses that lead to different branches:

```
:::prompt{id="age"}
  **Entity:** How old are you?

  @ideal{path="literal"}: Player gives their age as a number
  @ideal{path="philosophical"}: Player questions what age means

  :::response{match="ideal" path="literal"}
    **Entity:** {age} years. That's how you measure it?
    <pause>
    You're a product of everyone who came before you...
  :::

  :::response{match="ideal" path="philosophical"}
    **Entity:** Already you see it. The question contains assumptions.
    <pause>
    Most people answer with a number. You reached for something deeper.
    <signal-coherence delta="+0.1"/>
  :::
:::
```

## Variables and Interpolation

Player-provided values can be captured and reused:

```
:::prompt{id="name"}
  **Entity:** Who are you?
  @capture: player_name

  :::response{match="near"}
    **Entity:** {player_name}. I assume that is your name.
  :::
:::
```

## Chapter Completion

A chapter ends when:
1. All required beats/prompts are completed
2. The `@test` condition is evaluated as passed

```
:::chapter{id="first-contact"}
  @test: Player has engaged with at least 3 prompts at IDEAL or NEAR level

  :::checkpoint{}
    <signal-coherence delta="+0.2"/>
    **Entity:** Good. You're beginning to see.
    <transition to="the-question"/>
  :::
:::
```

## Full Example

See [[Opening Script DSL]] for the opening sequence marked up in this format.

## Parser Implementation

The narrative engine parses this format into:
- A state machine of chapters, beats, and prompts
- Evaluation criteria for the LLM classifier
- Metric adjustment rules
- Branching logic

See [[Architecture Overview]] for how this integrates with the runtime.

## Related

- [[Chapter Structure]]
- [[Philosophy Curriculum]]
- [[Metrics System]]
