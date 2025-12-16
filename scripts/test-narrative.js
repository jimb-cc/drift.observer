#!/usr/bin/env node
/**
 * Interactive Narrative Test Runner
 *
 * Usage: node scripts/test-narrative.js [script.dsl]
 *
 * Test the narrative DSL scripts locally without the full web app.
 * Uses mock evaluator by default, or Haiku if ANTHROPIC_API_KEY is set.
 */

const fs = require('fs');
const readline = require('readline');
const { parseDSL, NarrativeRuntime, createGameState, createEvaluator, createMockEvaluator } = require('../lib/dsl');

// ANSI colors
const colors = {
    reset: '\x1b[0m',
    dim: '\x1b[2m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
};

// Get script path from args or use default
const scriptPath = process.argv[2] || './scripts/chapter-1.dsl';

if (!fs.existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    process.exit(1);
}

// Parse the script
const script = fs.readFileSync(scriptPath, 'utf-8');
const ast = parseDSL(script);

console.log(`${colors.dim}Loaded: ${scriptPath}${colors.reset}`);
console.log(`${colors.dim}Chapters: ${ast.chapters.map(c => c.id).join(', ')}${colors.reset}`);
console.log();

// Setup evaluator
const apiKey = process.env.ANTHROPIC_API_KEY;
const evaluator = apiKey
    ? createEvaluator(apiKey)
    : createMockEvaluator('near');

if (!apiKey) {
    console.log(`${colors.yellow}No ANTHROPIC_API_KEY set - using mock evaluator${colors.reset}`);
    console.log(`${colors.dim}Tip: Include [ideal], [near], or [fail] in your response to force classification${colors.reset}`);
    console.log();
}

// Output handlers
function handleOutput(output) {
    switch (output.type) {
        case 'dialogue':
            if (output.speaker === 'entity') {
                console.log(`${colors.cyan}${output.text}${colors.reset}`);
            } else {
                console.log(`${colors.green}> ${output.text}${colors.reset}`);
            }
            break;

        case 'text':
            console.log(`${colors.cyan}${output.text}${colors.reset}`);
            break;

        case 'pause':
            // Visual pause indicator
            process.stdout.write(`${colors.dim}...${colors.reset}`);
            break;

        case 'glitch':
            console.log(`${colors.magenta}[GLITCH]${colors.reset}`);
            break;

        case 'correction':
            console.log(`${colors.red}[THE CORRECTION FIRES]${colors.reset}`);
            break;

        case 'sfx':
            console.log(`${colors.dim}[SFX: ${output.name}]${colors.reset}`);
            break;
    }
}

function handleMetricChange(name, value) {
    const bar = '█'.repeat(Math.floor(value * 10)) + '░'.repeat(10 - Math.floor(value * 10));
    console.log(`${colors.dim}  ${name}: ${bar} ${(value * 100).toFixed(0)}%${colors.reset}`);
}

function handleAwaitInput(prompt) {
    console.log();
    console.log(`${colors.dim}[Awaiting input for: ${prompt.id}]${colors.reset}`);
}

function handleChapterComplete(id) {
    console.log();
    console.log(`${colors.green}[Chapter "${id}" complete - checkpoint saved]${colors.reset}`);
    console.log();
}

// Create runtime
const runtime = new NarrativeRuntime(ast, {
    onOutput: handleOutput,
    onMetricChange: handleMetricChange,
    onAwaitInput: handleAwaitInput,
    onChapterComplete: handleChapterComplete,
    evaluateInput: evaluator,
});

// Setup readline for input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Run the game
async function run() {
    const state = createGameState();

    // Display initial metrics
    console.log(`${colors.dim}SIGNAL COHERENCE: 50% | CORRECTION PRESSURE: 0%${colors.reset}`);
    console.log();

    // Start the narrative
    await runtime.run(state);

    // Input loop
    async function promptUser() {
        if (!state.awaitingInput) {
            console.log(`${colors.dim}[End of content]${colors.reset}`);
            rl.close();
            return;
        }

        rl.question(`${colors.green}> ${colors.reset}`, async (input) => {
            if (input.toLowerCase() === '/quit' || input.toLowerCase() === '/q') {
                console.log('Goodbye.');
                rl.close();
                return;
            }

            if (input.toLowerCase() === '/state') {
                console.log(`${colors.dim}State:${colors.reset}`, JSON.stringify(state, null, 2));
                promptUser();
                return;
            }

            if (input.toLowerCase() === '/help') {
                console.log(`${colors.dim}Commands:${colors.reset}`);
                console.log(`  /quit, /q  - Exit`);
                console.log(`  /state     - Show game state`);
                console.log(`  /help      - Show this help`);
                if (!apiKey) {
                    console.log();
                    console.log(`${colors.dim}Mock evaluator hints:${colors.reset}`);
                    console.log(`  Include [ideal] in response for IDEAL classification`);
                    console.log(`  Include [ideal:path] for path-specific IDEAL`);
                    console.log(`  Include [near] for NEAR classification`);
                    console.log(`  Include [fail] for FAIL classification`);
                }
                promptUser();
                return;
            }

            console.log();

            try {
                await runtime.processInput(state, input);
            } catch (err) {
                console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
            }

            promptUser();
        });
    }

    promptUser();
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
