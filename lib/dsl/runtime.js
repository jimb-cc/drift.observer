/**
 * Narrative Runtime Engine
 *
 * Executes the parsed DSL AST, managing game state,
 * player input evaluation, and dialogue progression.
 */

const { NodeType } = require('./parser');

/**
 * Create initial game state for a new session
 */
function createGameState(chapterId = null) {
    return {
        // Current position in narrative
        currentChapter: chapterId,
        currentNodeIndex: 0,
        awaitingInput: false,
        currentPrompt: null,

        // Metrics
        signalCoherence: 0.5,
        correctionPressure: 0.0,

        // Variables captured from player input
        variables: {},

        // Progress tracking
        completedChapters: [],
        promptResults: {},  // { promptId: 'ideal' | 'near' | 'fail' }

        // Timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Runtime engine class
 */
class NarrativeRuntime {
    constructor(ast, options = {}) {
        this.ast = ast;
        this.chapters = {};

        // Build chapter lookup
        for (const chapter of ast.chapters) {
            this.chapters[chapter.id] = chapter;
        }

        // Optional callbacks
        this.onOutput = options.onOutput || (() => {});
        this.onMetricChange = options.onMetricChange || (() => {});
        this.onAwaitInput = options.onAwaitInput || (() => {});
        this.onChapterComplete = options.onChapterComplete || (() => {});
        this.evaluateInput = options.evaluateInput || defaultEvaluator;
    }

    /**
     * Start or resume a game session
     */
    async run(state) {
        if (!state.currentChapter) {
            // Start from first chapter
            state.currentChapter = this.ast.chapters[0]?.id;
            state.currentNodeIndex = 0;
        }

        const chapter = this.chapters[state.currentChapter];
        if (!chapter) {
            throw new Error(`Chapter not found: ${state.currentChapter}`);
        }

        // Resume from current position
        await this.executeFromIndex(chapter, state);

        return state;
    }

    /**
     * Process player input when awaiting
     */
    async processInput(state, input) {
        if (!state.awaitingInput || !state.currentPrompt) {
            throw new Error('Not awaiting input');
        }

        const chapter = this.chapters[state.currentChapter];
        const prompt = state.currentPrompt;

        // Evaluate input against criteria
        const result = await this.evaluateInput(input, prompt, state);

        // Store result
        state.promptResults[prompt.id] = result.classification;

        // Capture variable if specified
        if (prompt.capture) {
            state.variables[prompt.capture] = input;
        }

        // Find matching response
        const response = this.findResponse(prompt, result.classification, result.path);

        // Clear awaiting state
        state.awaitingInput = false;
        state.currentPrompt = null;

        // Execute response if found
        if (response) {
            await this.executeNodes(response.children, state);
        }

        // Continue with remaining nodes
        state.currentNodeIndex++;
        await this.executeFromIndex(chapter, state);

        state.updatedAt = new Date().toISOString();
        return state;
    }

    /**
     * Find the appropriate response block for a classification
     */
    findResponse(prompt, classification, path = null) {
        // First try to find exact match with path
        if (path) {
            const exactMatch = prompt.responses.find(
                r => r.match === classification && r.path === path
            );
            if (exactMatch) return exactMatch;
        }

        // Fall back to classification without path
        return prompt.responses.find(
            r => r.match === classification && !r.path
        );
    }

    /**
     * Execute nodes starting from current index
     */
    async executeFromIndex(chapter, state) {
        const nodes = chapter.children;

        while (state.currentNodeIndex < nodes.length) {
            const node = nodes[state.currentNodeIndex];
            const shouldContinue = await this.executeNode(node, state);

            if (!shouldContinue) {
                // Execution paused (awaiting input or transition)
                return;
            }

            state.currentNodeIndex++;
        }

        // Reached end of chapter - check for checkpoint
        const hasCheckpoint = nodes.some(n => n.type === NodeType.CHECKPOINT);
        if (!hasCheckpoint) {
            // Auto-complete chapter
            await this.completeChapter(state);
        }
    }

    /**
     * Execute a single node
     * Returns true to continue, false to pause
     */
    async executeNode(node, state) {
        switch (node.type) {
            case NodeType.BEAT:
                await this.executeBeat(node, state);
                return true;

            case NodeType.PROMPT:
                await this.executePrompt(node, state);
                return false;  // Pause for input

            case NodeType.CHECKPOINT:
                await this.executeCheckpoint(node, state);
                return true;

            case NodeType.SPEAKER_LINE:
                await this.executeSpeakerLine(node, state);
                return true;

            case NodeType.TEXT:
                await this.executeText(node, state);
                return true;

            case NodeType.PAUSE:
                await this.onOutput({ type: 'pause' });
                return true;

            case NodeType.GLITCH:
                await this.onOutput({ type: 'glitch' });
                return true;

            case NodeType.METRIC:
                this.applyMetric(node, state);
                return true;

            case NodeType.TRANSITION:
                await this.executeTransition(node, state);
                return false;  // Pause for transition

            case NodeType.SFX:
                await this.onOutput({ type: 'sfx', name: node.name });
                return true;

            default:
                return true;
        }
    }

    /**
     * Execute a beat (sequence of content)
     */
    async executeBeat(beat, state) {
        await this.executeNodes(beat.children, state);
    }

    /**
     * Execute a list of nodes sequentially
     */
    async executeNodes(nodes, state) {
        for (const node of nodes) {
            await this.executeNode(node, state);
        }
    }

    /**
     * Execute a prompt (question requiring player input)
     */
    async executePrompt(prompt, state) {
        // Output the question content
        for (const node of prompt.question) {
            await this.executeNode(node, state);
        }

        // Set awaiting state
        state.awaitingInput = true;
        state.currentPrompt = prompt;

        // Notify that we're waiting for input
        await this.onAwaitInput(prompt);
    }

    /**
     * Execute a checkpoint (save point)
     */
    async executeCheckpoint(checkpoint, state) {
        // Execute checkpoint content
        await this.executeNodes(checkpoint.children, state);

        // Mark chapter complete
        await this.completeChapter(state);
    }

    /**
     * Execute a speaker line
     */
    async executeSpeakerLine(node, state) {
        const text = this.interpolate(node.text, state.variables);
        await this.onOutput({
            type: 'dialogue',
            speaker: node.speaker,
            text: text,
        });
    }

    /**
     * Execute plain text
     */
    async executeText(node, state) {
        const text = this.interpolate(node.value, state.variables);
        await this.onOutput({
            type: 'text',
            text: text,
        });
    }

    /**
     * Execute a transition to another chapter
     */
    async executeTransition(node, state) {
        const targetChapter = this.chapters[node.to];
        if (!targetChapter) {
            throw new Error(`Transition target not found: ${node.to}`);
        }

        state.currentChapter = node.to;
        state.currentNodeIndex = 0;

        // Continue with new chapter
        await this.executeFromIndex(targetChapter, state);
    }

    /**
     * Apply a metric change
     */
    applyMetric(node, state) {
        const metricName = this.normalizeMetricName(node.metric);

        if (node.delta) {
            const delta = parseFloat(node.delta);
            state[metricName] = Math.max(0, Math.min(1, state[metricName] + delta));
        } else if (node.value !== undefined) {
            state[metricName] = parseFloat(node.value);
        }

        this.onMetricChange(metricName, state[metricName]);

        // Check for correction threshold
        if (metricName === 'correctionPressure' && state.correctionPressure >= 1.0) {
            this.triggerCorrection(state);
        }
    }

    /**
     * Normalize metric names to camelCase state keys
     */
    normalizeMetricName(name) {
        const map = {
            'signal-coherence': 'signalCoherence',
            'correction-pressure': 'correctionPressure',
        };
        return map[name] || name;
    }

    /**
     * Complete current chapter
     */
    async completeChapter(state) {
        if (!state.completedChapters.includes(state.currentChapter)) {
            state.completedChapters.push(state.currentChapter);
        }
        await this.onChapterComplete(state.currentChapter);
    }

    /**
     * Trigger the Correction event
     */
    triggerCorrection(state) {
        // This will be handled by the game controller
        // For now, emit an event
        this.onOutput({ type: 'correction' });
    }

    /**
     * Interpolate variables in text
     * e.g., "Hello {player_name}" -> "Hello Jim"
     */
    interpolate(text, variables) {
        if (!text) return text;
        return text.replace(/\{(\w+)\}/g, (match, varName) => {
            return variables[varName] !== undefined ? variables[varName] : match;
        });
    }

    /**
     * Get the current chapter's metadata
     */
    getCurrentChapterInfo(state) {
        const chapter = this.chapters[state.currentChapter];
        if (!chapter) return null;

        return {
            id: chapter.id,
            title: chapter.title,
            objective: chapter.objective,
            test: chapter.test,
        };
    }

    /**
     * Reset to a specific chapter (for correction recovery)
     */
    resetToChapter(state, chapterId) {
        if (!this.chapters[chapterId]) {
            throw new Error(`Chapter not found: ${chapterId}`);
        }

        state.currentChapter = chapterId;
        state.currentNodeIndex = 0;
        state.awaitingInput = false;
        state.currentPrompt = null;
        state.correctionPressure = 0;
        state.updatedAt = new Date().toISOString();

        return state;
    }

    /**
     * Get last completed chapter (for checkpoint restart)
     */
    getLastCheckpoint(state) {
        if (state.completedChapters.length === 0) {
            return this.ast.chapters[0]?.id || null;
        }
        return state.completedChapters[state.completedChapters.length - 1];
    }
}

/**
 * Default input evaluator (placeholder - will be replaced with LLM)
 */
async function defaultEvaluator(input, prompt, state) {
    // Simple keyword matching as placeholder
    // Real implementation will use Haiku
    const lowerInput = input.toLowerCase();

    // Check fail conditions first
    for (const fail of prompt.fails) {
        if (matchesCriteria(lowerInput, fail.criteria)) {
            return { classification: 'fail', path: fail.path };
        }
    }

    // Check ideal conditions
    for (const ideal of prompt.ideals) {
        if (matchesCriteria(lowerInput, ideal.criteria)) {
            return { classification: 'ideal', path: ideal.path };
        }
    }

    // Check near conditions
    for (const near of prompt.nears) {
        if (matchesCriteria(lowerInput, near.criteria)) {
            return { classification: 'near', path: near.path };
        }
    }

    // Default to near if nothing matches
    return { classification: 'near', path: null };
}

/**
 * Simple keyword matching for default evaluator
 */
function matchesCriteria(input, criteria) {
    // Very basic - extract keywords from criteria and check if any appear in input
    const keywords = criteria.toLowerCase().match(/\b\w{4,}\b/g) || [];
    return keywords.some(kw => input.includes(kw));
}

// Exports
module.exports = {
    NarrativeRuntime,
    createGameState,
};
