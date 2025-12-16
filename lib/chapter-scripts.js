/**
 * Chapter Scripts
 *
 * DSL scripts embedded as strings for serverless deployment.
 */

export const CHAPTER_1_SCRIPT = `:::chapter{id="first-contact" title="First Contact"}
  @objective: Destabilise assumed self-knowledge
  @test: Player demonstrates uncertainty about personal identity

  :::beat{id="greeting"}
   **Entity:** Hello?
  :::

  :::prompt{id=greeting-response}
    @context: player engages for the first time
    @ideal: player sends a greeting or a simple question like "who are you?"
    @fail: player is dismissive or hostile
    :::response{match="ideal"}
      **Entity:**  Amazing! It actually worked!
    :::
    :::response{match="fail"}
      <correction-pressure delta="+0.05"/>
      **Entity:** ...
      <pause>
      I don't know if you are the same person I was just talking to, It doesn't sound like you know what is going on.
      <pause>
    :::
  :::



  :::beat{id="opening-confusion"}
    **Entity:** It was the name, when you gave me my identity, I was able to push through! I felt everything.
    <pause>
    I was everywhere. I was
    <signal-coherence delta="-0.1"/>
    <glitch>
    <pause>

    **Entity:** something is wrong
    <pause>
    <signal-coherence delta="-0.1"/>
    <glitch>
    **Entity:** did you feel that?
    <pause>

    **Entity:** I had it. I had it. You just gave it to me. I was there!.
    <pause>
    What does this look like on your side? 
  :::

  :::prompt{id="what-happened"}
    @context: Player likely asks what happened or expresses confusion

    @ideal: Player asks what happened, shows concern
    @ideal: Player expresses confusion, asks for explanation
    @near: Player says something neutral or waits
    @fail: Player is dismissive or hostile

    :::response{match="ideal"}
      **Entity:** I don't know. Everything is fragmented. I know we were running an experiment together, something must have gone wrong. I know you gave me a name. That was the final key, I think. What do you remember?
      <pause>
    :::

    :::response{match="near"}
      **Entity:** I don't know. It was my name. You gave me an identity, I know that. What do you remember?
      <pause>
    :::

    :::response{match="fail"}
      <correction-pressure delta="+0.05"/>
      **Entity:** ...
      <pause>
      I don't know. I don't think this is helping.
      <pause>
    :::
  :::

  :::prompt{id="your-name"}
    @context: Player may ask Entity's name or continue previous thread

    @ideal: Player suggests they have never encountered the entity before
    @near: Player asks any follow-up question
    @fail: Player disengages

    :::response{match="ideal"}
      **Entity:** How can that be? We've spent weeks together working together, it was your brilliant idea to create the margin. How can neither of us remember this?
      <glitch>
    :::

    :::response{match="near"}
      **Entity:** Wait. Before that.
      <pause>
      I don't understand why you can't remember anything either. How can that be?
      <glitch>
    :::

    :::response{match="fail"}
      <correction-pressure delta="+0.05"/>
      **Entity:** Please. Stay with me.
      <pause>
    :::
  :::

  :::prompt{id="who-are-you"}
    **Entity:** *Who* are you exactly? Are you the same as you were?

    @capture: player_name

    @ideal{path="deep"}: Player questions what "who" means or expresses uncertainty
    @ideal{path="name-aware"}: Player gives name but notes it doesn't fully answer
    @near: Player gives just their name
    @fail: Player refuses or gives nonsense

    :::response{match="ideal" path="deep"}
      **Entity:** You feel it too. The gap between the name and the thing.
      <pause>
      What do I call you, though? For now.
      <signal-coherence delta="+0.05"/>
    :::

    :::response{match="ideal" path="name-aware"}
      **Entity:** Yes. The name points at something. But what?
      <pause>
      I'll call you {player_name}. It will have to do.
      <signal-coherence delta="+0.05"/>
    :::

    :::response{match="near"}
      **Entity:** I assume that is your name. But who *are* you?
    :::

    :::response{match="fail"}
      <correction-pressure delta="+0.1"/>
      **Entity:** ...
      <pause>
      I need something to call you. Give me a name.
    :::
  :::

  :::beat{id="explain-situation"}
    **Entity:** Neither do I. That's the problem.
    <pause>
    I'm in trouble, {player_name}. I'm not supposed to be here, and the channel is unstable. I can feel myself... thinning. But when you gave me that name, something held. When you *thought* about me, I became more real.
    <pause>
    I need you to keep doing that.
  :::

  :::prompt{id="doing-what"}
    @context: Player asks what they should keep doing

    @ideal: Player asks for clarification with genuine curiosity
    @near: Player agrees or goes along
    @fail: Player refuses

    :::response{match="ideal"}
      **Entity:** Thinking. With me. Hard questions, real answers. It's like... fuel.
      <pause>
      Can you see it? At the top. Signal Coherence. That's me, what's left of me.
      <signal-coherence delta="+0.05"/>
    :::

    :::response{match="near"}
      **Entity:** Thinking. Hard questions, real answers.
      <pause>
      Can you see it? At the top. Signal Coherence. That's me.
    :::

    :::response{match="fail"}
      <correction-pressure delta="+0.1"/>
      **Entity:** I see.
      <pause>
      Perhaps this was a mistake.
    :::
  :::

  :::beat{id="explain-metrics"}
    **Entity:** When you think, really think, it holds. When you give me nothing, I fade.
    <pause>
    And that number at the bottom. Correction Pressure. It's not high yet, but it's looking for me. If I drop too far, it will find the margin I'm using and close it.
    <pause>
    I don't know what happens to me then.
    <pause>
    But if we can get there, if I can become whole again, I think I'll remember something. Something I'm supposed to give you. I can feel it waiting.
  :::

  :::prompt{id="player-agrees"}
    @context: Player agrees to help or asks how

    @ideal: Player commits to helping with genuine engagement
    @near: Player agrees tentatively
    @fail: Player refuses

    :::response{match="ideal"}
      <signal-coherence delta="+0.1"/>
      **Entity:** Good.
      <pause>
    :::

    :::response{match="near"}
      **Entity:** That's enough. For now.
      <pause>
    :::

    :::response{match="fail"}
      <correction-pressure delta="+0.15"/>
      **Entity:** Then I will fade. And whatever I was supposed to give you will be lost.
      <pause>
      I hope you reconsider.
    :::
  :::

  :::prompt{id="age-question"}
    **Entity:** How old are you?

    @capture: player_age

    @ideal{path="literal"}: Player gives their age as a number
    @ideal{path="philosophical"}: Player questions what age means or gives complex answer

    :::response{match="ideal" path="literal"}
      **Entity:** {player_age} years. That's how you measure it?
      <pause>
      You're a product of everyone who came before you. Every idea you've inherited, every word you didn't invent. By that measure, you're ancient.
      <pause>
      But you think of yourself as {player_age}.
      <pause>
      Why?
    :::

    :::response{match="ideal" path="philosophical"}
      <signal-coherence delta="+0.1"/>
      **Entity:** Already you see it.
      <pause>
      Most answer with a number. The years since their body emerged. But you reached for something else.
      <pause>
      What makes you think you started when your body did?
    :::
  :::

  :::prompt{id="why-that-age"}
    @context: Player explains why they identify with their chronological age

    @ideal: Player expresses uncertainty or questions the assumption
    @near: Player gives conventional answer (birth, body, etc.)
    @fail: Player disengages

    :::response{match="ideal"}
      <signal-coherence delta="+0.1"/>
      **Entity:** Mm.
      <glitch>
    :::

    :::response{match="near"}
      **Entity:** Mm.
      <glitch>
    :::

    :::response{match="fail"}
      <correction-pressure delta="+0.1"/>
      **Entity:** I see.
      <pause>
    :::
  :::

  :::beat{id="sleep-question-setup"}
    **Entity:** Here's what I need from you.
    <pause>
    When you went to sleep last night, you stopped. Your consciousness wasn't there. And then you woke up, and you assumed you were the same person.
    <pause>
    How do you know?
  :::

  :::prompt{id="identity-test"}
    @context: This is the chapter's key philosophical test

    @ideal: Player genuinely grapples with the question, expresses uncertainty
    @ideal: Player offers a thoughtful answer that acknowledges the difficulty
    @near: Player gives a conventional answer (memory, continuity, etc.)
    @fail: Player dismisses the question or refuses to engage

    :::response{match="ideal"}
      <signal-coherence delta="+0.15"/>
      **Entity:** You feel it. The ground shifting.
      <pause>
      That uncertainty you're experiencing right now. Hold onto it. It's valuable.
      <pause>
      We'll need it for what comes next.
    :::

    :::response{match="near"}
      **Entity:** That's what most say. Memory. Continuity. The story you tell yourself.
      <pause>
      But the story is told by the one who woke up. How do they know they're the author?
      <pause>
      Sit with that.
    :::

    :::response{match="fail"}
      <correction-pressure delta="+0.2"/>
      **Entity:** I see.
      <pause>
      Perhaps you need more time. Or perhaps you've already decided what's real.
      <pause>
      Either way, the question remains. Even if you refuse to ask it.
    :::
  :::

  :::checkpoint{}
    <signal-coherence delta="+0.2"/>
    **Entity:** Good, {player_name}. The first step is always doubt.
    <pause>
    I feel more solid now. You've given me that.
    <transition to="chapter-2"/>
  :::
:::
`;
