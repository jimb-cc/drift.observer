/**
 * Narrative API
 *
 * Serves the DSL-driven narrative experience.
 * Handles session state, input evaluation, and dialogue progression.
 */

import { getSessionData, updateSessionData } from '../lib/conversations.js';
import { parseDSL, NarrativeRuntime, createGameState, createEvaluator } from '../lib/narrative-engine.js';
import { CHAPTER_1_SCRIPT } from '../lib/chapter-scripts.js';

// Cache parsed scripts
let scriptCache = null;

function loadScripts() {
    if (scriptCache) return scriptCache;
    scriptCache = parseDSL(CHAPTER_1_SCRIPT);
    return scriptCache;
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { sessionId, action, input } = request.body;

        if (!sessionId) {
            return response.status(400).json({ error: 'sessionId required' });
        }

        const ast = loadScripts();

        let state = await getSessionData(sessionId, 'narrativeState');
        if (!state) {
            state = createGameState();
        }

        const outputs = [];

        const runtime = new NarrativeRuntime(ast, {
            onOutput: (output) => outputs.push(output),
            onMetricChange: (name, value) => outputs.push({ type: 'metric', name, value }),
            onAwaitInput: (prompt) => outputs.push({ type: 'await', promptId: prompt.id }),
            onChapterComplete: (id) => outputs.push({ type: 'chapter_complete', id }),
            evaluateInput: createEvaluator(process.env.ANTHROPIC_API_KEY),
        });

        if (action === 'start' || action === 'resume') {
            await runtime.run(state);
        } else if (action === 'input' && input !== undefined) {
            if (!state.awaitingInput) {
                return response.status(400).json({ error: 'Not awaiting input' });
            }
            await runtime.processInput(state, input);
        } else {
            return response.status(400).json({ error: 'Invalid action' });
        }

        await updateSessionData(sessionId, 'narrativeState', state);

        return response.status(200).json({
            outputs,
            state: {
                signalCoherence: state.signalCoherence,
                correctionPressure: state.correctionPressure,
                currentChapter: state.currentChapter,
                awaitingInput: state.awaitingInput,
                completedChapters: state.completedChapters,
            },
        });

    } catch (error) {
        console.error('Narrative API error:', error);
        return response.status(500).json({ error: 'Internal server error', details: error.message });
    }
}
