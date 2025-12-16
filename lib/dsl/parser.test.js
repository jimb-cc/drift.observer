/**
 * Parser Tests
 *
 * Run with: node lib/dsl/parser.test.js
 */

const { parseDSL, validateAST, NodeType } = require('./parser');

// Simple test framework
let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (err) {
        console.log(`✗ ${name}`);
        console.log(`  ${err.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

// Tests

test('parses empty chapter', () => {
    const ast = parseDSL(`
:::chapter{id="test" title="Test Chapter"}
:::
    `);
    assert(ast.chapters.length === 1);
    assertEqual(ast.chapters[0].id, 'test');
    assertEqual(ast.chapters[0].title, 'Test Chapter');
});

test('parses chapter with objective and test', () => {
    const ast = parseDSL(`
:::chapter{id="ch1" title="First"}
  @objective: Learn something
  @test: Player demonstrates understanding
:::
    `);
    assertEqual(ast.chapters[0].objective, 'Learn something');
    assertEqual(ast.chapters[0].test, 'Player demonstrates understanding');
});

test('parses beat with speaker lines', () => {
    const ast = parseDSL(`
:::chapter{id="ch1"}
  :::beat{id="opening"}
    **Entity:** Hello there
    **Entity:** How are you?
  :::
:::
    `);
    const beat = ast.chapters[0].children[0];
    assertEqual(beat.type, NodeType.BEAT);
    assertEqual(beat.id, 'opening');
    assertEqual(beat.children.length, 2);
    assertEqual(beat.children[0].speaker, 'entity');
    assertEqual(beat.children[0].text, 'Hello there');
});

test('parses inline tags', () => {
    const ast = parseDSL(`
:::chapter{id="ch1"}
  :::beat{id="test"}
    **Entity:** Wait
    <pause>
    **Entity:** Something is happening
    <glitch>
  :::
:::
    `);
    const beat = ast.chapters[0].children[0];
    assertEqual(beat.children[1].type, NodeType.PAUSE);
    assertEqual(beat.children[3].type, NodeType.GLITCH);
});

test('parses metric adjustments', () => {
    const ast = parseDSL(`
:::chapter{id="ch1"}
  :::beat{id="test"}
    <signal-coherence delta="+0.1"/>
    <correction-pressure delta="-0.05"/>
  :::
:::
    `);
    const beat = ast.chapters[0].children[0];
    assertEqual(beat.children[0].type, NodeType.METRIC);
    assertEqual(beat.children[0].metric, 'signal-coherence');
    assertEqual(beat.children[0].delta, '+0.1');
});

test('parses prompt with ideals and responses', () => {
    const ast = parseDSL(`
:::chapter{id="ch1"}
  :::prompt{id="who-are-you"}
    **Entity:** Who are you?

    @ideal: Player questions what "who" means
    @ideal{path="name"}: Player gives name but notes inadequacy
    @near: Player gives just their name
    @fail: Player refuses

    :::response{match="ideal" path="name"}
      **Entity:** Interesting response
    :::

    :::response{match="near"}
      **Entity:** I see
    :::
  :::
:::
    `);
    const prompt = ast.chapters[0].children[0];
    assertEqual(prompt.type, NodeType.PROMPT);
    assertEqual(prompt.id, 'who-are-you');
    assertEqual(prompt.ideals.length, 2);
    assertEqual(prompt.ideals[0].criteria, 'Player questions what "who" means');
    assertEqual(prompt.ideals[1].path, 'name');
    assertEqual(prompt.nears.length, 1);
    assertEqual(prompt.fails.length, 1);
    assertEqual(prompt.responses.length, 2);
    assertEqual(prompt.responses[0].match, 'ideal');
    assertEqual(prompt.responses[0].path, 'name');
});

test('parses capture directive', () => {
    const ast = parseDSL(`
:::chapter{id="ch1"}
  :::prompt{id="name"}
    **Entity:** What is your name?
    @capture: player_name
    @ideal: Any name given

    :::response{match="ideal"}
      **Entity:** Hello
    :::
  :::
:::
    `);
    const prompt = ast.chapters[0].children[0];
    assertEqual(prompt.capture, 'player_name');
});

test('parses transition tag', () => {
    const ast = parseDSL(`
:::chapter{id="ch1"}
  :::checkpoint{}
    **Entity:** Moving on
    <transition to="ch2"/>
  :::
:::
    `);
    const checkpoint = ast.chapters[0].children[0];
    assertEqual(checkpoint.type, NodeType.CHECKPOINT);
    const transition = checkpoint.children[1];
    assertEqual(transition.type, NodeType.TRANSITION);
    assertEqual(transition.to, 'ch2');
});

test('validates missing prompt ideals', () => {
    const ast = parseDSL(`
:::chapter{id="ch1"}
  :::prompt{id="broken"}
    **Entity:** Question?
    :::response{match="ideal"}
      **Entity:** Response
    :::
  :::
:::
    `);
    const errors = validateAST(ast);
    assert(errors.length > 0, 'Should have validation errors');
    assert(errors.some(e => e.message.includes('no @ideal')));
});

test('validates missing responses', () => {
    const ast = parseDSL(`
:::chapter{id="ch1"}
  :::prompt{id="broken"}
    **Entity:** Question?
    @ideal: Some criteria
  :::
:::
    `);
    const errors = validateAST(ast);
    assert(errors.length > 0, 'Should have validation errors');
    assert(errors.some(e => e.message.includes('no response')));
});

test('parses multiple chapters', () => {
    const ast = parseDSL(`
:::chapter{id="ch1" title="First"}
:::

:::chapter{id="ch2" title="Second"}
:::
    `);
    assertEqual(ast.chapters.length, 2);
    assertEqual(ast.chapters[0].id, 'ch1');
    assertEqual(ast.chapters[1].id, 'ch2');
});

test('handles text content', () => {
    const ast = parseDSL(`
:::chapter{id="ch1"}
  :::beat{id="test"}
    **Entity:** First line
    continuing on the next line
  :::
:::
    `);
    const beat = ast.chapters[0].children[0];
    assertEqual(beat.children.length, 2);
    assertEqual(beat.children[1].type, NodeType.TEXT);
    assertEqual(beat.children[1].value, 'continuing on the next line');
});

// Summary
console.log('');
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
