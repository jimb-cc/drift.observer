/**
 * Runtime Engine Tests
 *
 * Run with: node lib/dsl/runtime.test.js
 */

const { parseDSL } = require('./parser');
const { NarrativeRuntime, createGameState } = require('./runtime');

// Simple test framework
let passed = 0;
let failed = 0;

function test(name, fn) {
    return (async () => {
        try {
            await fn();
            console.log(`✓ ${name}`);
            passed++;
        } catch (err) {
            console.log(`✗ ${name}`);
            console.log(`  ${err.message}`);
            failed++;
        }
    })();
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

// Collect outputs for testing
function createTestRuntime(dsl) {
    const ast = parseDSL(dsl);
    const outputs = [];

    const runtime = new NarrativeRuntime(ast, {
        onOutput: (output) => outputs.push(output),
        onMetricChange: (name, value) => outputs.push({ type: 'metric', name, value }),
        onAwaitInput: (prompt) => outputs.push({ type: 'await', promptId: prompt.id }),
        onChapterComplete: (id) => outputs.push({ type: 'chapter_complete', id }),
        evaluateInput: async (input, prompt) => {
            // Simple test evaluator
            if (input.includes('ideal')) return { classification: 'ideal', path: null };
            if (input.includes('fail')) return { classification: 'fail', path: null };
            return { classification: 'near', path: null };
        },
    });

    return { runtime, outputs, ast };
}

// Tests

async function runTests() {
    await test('executes beat with dialogue', async () => {
        const { runtime, outputs } = createTestRuntime(`
:::chapter{id="ch1"}
  :::beat{id="opening"}
    **Entity:** Hello there
    **Entity:** How are you?
  :::
:::
        `);

        const state = createGameState();
        await runtime.run(state);

        const dialogues = outputs.filter(o => o.type === 'dialogue');
        assertEqual(dialogues.length, 2);
        assertEqual(dialogues[0].speaker, 'entity');
        assertEqual(dialogues[0].text, 'Hello there');
    });

    await test('executes pause and glitch', async () => {
        const { runtime, outputs } = createTestRuntime(`
:::chapter{id="ch1"}
  :::beat{id="test"}
    **Entity:** Wait
    <pause>
    <glitch>
  :::
:::
        `);

        const state = createGameState();
        await runtime.run(state);

        assert(outputs.some(o => o.type === 'pause'));
        assert(outputs.some(o => o.type === 'glitch'));
    });

    await test('applies metric changes', async () => {
        const { runtime, outputs } = createTestRuntime(`
:::chapter{id="ch1"}
  :::beat{id="test"}
    <signal-coherence delta="+0.1"/>
  :::
:::
        `);

        const state = createGameState();
        await runtime.run(state);

        assertEqual(state.signalCoherence, 0.6);  // 0.5 + 0.1
    });

    await test('pauses at prompt for input', async () => {
        const { runtime, outputs } = createTestRuntime(`
:::chapter{id="ch1"}
  :::prompt{id="q1"}
    **Entity:** Who are you?
    @ideal: Good answer
    :::response{match="ideal"}
      **Entity:** Great!
    :::
  :::
:::
        `);

        const state = createGameState();
        await runtime.run(state);

        assert(state.awaitingInput, 'Should be awaiting input');
        assertEqual(state.currentPrompt.id, 'q1');
        assert(outputs.some(o => o.type === 'await'));
    });

    await test('processes input and continues', async () => {
        const { runtime, outputs } = createTestRuntime(`
:::chapter{id="ch1"}
  :::prompt{id="q1"}
    **Entity:** Who are you?
    @ideal: Good answer
    :::response{match="ideal"}
      **Entity:** Great!
    :::
    :::response{match="near"}
      **Entity:** Okay
    :::
  :::
  :::beat{id="after"}
    **Entity:** Moving on
  :::
:::
        `);

        const state = createGameState();
        await runtime.run(state);

        // Process input
        await runtime.processInput(state, 'this is ideal');

        assert(!state.awaitingInput, 'Should no longer be awaiting');
        assertEqual(state.promptResults['q1'], 'ideal');

        const dialogues = outputs.filter(o => o.type === 'dialogue');
        assert(dialogues.some(d => d.text === 'Great!'));
        assert(dialogues.some(d => d.text === 'Moving on'));
    });

    await test('captures variables', async () => {
        const { runtime } = createTestRuntime(`
:::chapter{id="ch1"}
  :::prompt{id="name"}
    **Entity:** What is your name?
    @capture: player_name
    @ideal: Any name
    :::response{match="ideal"}
      **Entity:** Hello
    :::
  :::
:::
        `);

        const state = createGameState();
        await runtime.run(state);
        await runtime.processInput(state, 'ideal Jim');

        assertEqual(state.variables.player_name, 'ideal Jim');
    });

    await test('interpolates variables in text', async () => {
        const ast = parseDSL(`
:::chapter{id="ch1"}
  :::prompt{id="name"}
    **Entity:** What is your name?
    @capture: player_name
    @ideal: Any name
    :::response{match="ideal"}
      **Entity:** Hello {player_name}
    :::
  :::
:::
        `);
        const outputs = [];
        const runtime = new NarrativeRuntime(ast, {
            onOutput: (output) => outputs.push(output),
            // Always return ideal for this test
            evaluateInput: async () => ({ classification: 'ideal', path: null }),
        });

        const state = createGameState();
        await runtime.run(state);
        await runtime.processInput(state, 'Alice');

        const dialogues = outputs.filter(o => o.type === 'dialogue');
        assert(dialogues.some(d => d.text === 'Hello Alice'),
            `Expected "Hello Alice", got: ${dialogues.map(d => d.text).join(', ')}`);
    });

    await test('handles chapter transitions', async () => {
        const { runtime, outputs } = createTestRuntime(`
:::chapter{id="ch1"}
  :::beat{id="start"}
    **Entity:** Chapter 1
    <transition to="ch2"/>
  :::
:::

:::chapter{id="ch2"}
  :::beat{id="start"}
    **Entity:** Chapter 2
  :::
:::
        `);

        const state = createGameState();
        await runtime.run(state);

        assertEqual(state.currentChapter, 'ch2');
        const dialogues = outputs.filter(o => o.type === 'dialogue');
        assert(dialogues.some(d => d.text === 'Chapter 1'));
        assert(dialogues.some(d => d.text === 'Chapter 2'));
    });

    await test('tracks completed chapters', async () => {
        const { runtime } = createTestRuntime(`
:::chapter{id="ch1"}
  :::checkpoint{}
    **Entity:** Done
  :::
:::
        `);

        const state = createGameState();
        await runtime.run(state);

        assert(state.completedChapters.includes('ch1'));
    });

    await test('resets to checkpoint on correction', async () => {
        const { runtime } = createTestRuntime(`
:::chapter{id="ch1"}
  :::checkpoint{}
    **Entity:** Checkpoint
  :::
:::

:::chapter{id="ch2"}
  :::beat{id="test"}
    **Entity:** After checkpoint
  :::
:::
        `);

        const state = createGameState();
        state.completedChapters = ['ch1'];
        state.currentChapter = 'ch2';
        state.correctionPressure = 0.8;

        const lastCheckpoint = runtime.getLastCheckpoint(state);
        assertEqual(lastCheckpoint, 'ch1');

        runtime.resetToChapter(state, lastCheckpoint);
        assertEqual(state.currentChapter, 'ch1');
        assertEqual(state.correctionPressure, 0);
    });

    await test('clamps metrics to 0-1 range', async () => {
        const { runtime } = createTestRuntime(`
:::chapter{id="ch1"}
  :::beat{id="test"}
    <signal-coherence delta="+2.0"/>
    <correction-pressure delta="-1.0"/>
  :::
:::
        `);

        const state = createGameState();
        await runtime.run(state);

        assertEqual(state.signalCoherence, 1.0);  // Clamped to max
        assertEqual(state.correctionPressure, 0);  // Clamped to min
    });

    // Summary
    console.log('');
    console.log(`${passed} passed, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
}

runTests();
