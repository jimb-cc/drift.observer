/**
 * Narrative Engine (ESM)
 *
 * Self-contained module for the DSL-driven narrative system.
 * Combines parser, runtime, and evaluator for serverless deployment.
 */

// ============================================================================
// NODE TYPES
// ============================================================================

export const NodeType = {
    CHAPTER: 'chapter',
    BEAT: 'beat',
    PROMPT: 'prompt',
    RESPONSE: 'response',
    CHECKPOINT: 'checkpoint',
    TEXT: 'text',
    SPEAKER_LINE: 'speaker_line',
    PAUSE: 'pause',
    GLITCH: 'glitch',
    METRIC: 'metric',
    TRANSITION: 'transition',
    SFX: 'sfx',
};

// ============================================================================
// PARSER
// ============================================================================

const TokenType = {
    BLOCK_START: 'BLOCK_START',
    BLOCK_END: 'BLOCK_END',
    DIRECTIVE: 'DIRECTIVE',
    INLINE_TAG: 'INLINE_TAG',
    TEXT: 'TEXT',
    SPEAKER: 'SPEAKER',
    NEWLINE: 'NEWLINE',
    EOF: 'EOF',
};

function parseAttrs(attrString) {
    const attrs = {};
    if (!attrString) return attrs;
    const pattern = /(\w+)=["']([^"']*)["']/g;
    let match;
    while ((match = pattern.exec(attrString)) !== null) {
        attrs[match[1]] = match[2];
    }
    return attrs;
}

function matchAllTags(line) {
    // Extract inline tags from a line using matchAll
    const tagPattern = /<(\w+[-\w]*)(?:\s+([^/>]*))?\s*\/?>/g;
    return [...line.matchAll(tagPattern)];
}

function tokenize(source) {
    const tokens = [];
    const lines = source.split('\n');

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        const trimmed = line.trim();

        if (!trimmed) {
            tokens.push({ type: TokenType.NEWLINE, line: lineNum + 1 });
            continue;
        }

        const blockStartMatch = trimmed.match(/^:::(\w+)(?:\{([^}]*)\})?$/);
        if (blockStartMatch) {
            tokens.push({
                type: TokenType.BLOCK_START,
                name: blockStartMatch[1],
                attrs: parseAttrs(blockStartMatch[2] || ''),
                line: lineNum + 1,
            });
            continue;
        }

        if (trimmed === ':::') {
            tokens.push({ type: TokenType.BLOCK_END, line: lineNum + 1 });
            continue;
        }

        const directiveMatch = trimmed.match(/^@(\w+)(?:\{([^}]*)\})?:\s*(.*)$/);
        if (directiveMatch) {
            tokens.push({
                type: TokenType.DIRECTIVE,
                name: directiveMatch[1],
                attrs: parseAttrs(directiveMatch[2] || ''),
                value: directiveMatch[3],
                line: lineNum + 1,
            });
            continue;
        }

        const speakerMatch = trimmed.match(/^\*\*(\w+):\*\*\s*(.*)$/);
        if (speakerMatch) {
            tokens.push({
                type: TokenType.SPEAKER,
                speaker: speakerMatch[1].toLowerCase(),
                text: speakerMatch[2],
                line: lineNum + 1,
            });
            continue;
        }

        // Inline tags using matchAll
        const tagMatches = matchAllTags(trimmed);
        let lastIndex = 0;

        for (const match of tagMatches) {
            if (match.index > lastIndex) {
                const text = trimmed.slice(lastIndex, match.index).trim();
                if (text) tokens.push({ type: TokenType.TEXT, value: text, line: lineNum + 1 });
            }
            tokens.push({
                type: TokenType.INLINE_TAG,
                name: match[1],
                attrs: parseAttrs(match[2] || ''),
                line: lineNum + 1,
            });
            lastIndex = match.index + match[0].length;
        }

        if (lastIndex < trimmed.length) {
            const text = trimmed.slice(lastIndex).trim();
            if (text) tokens.push({ type: TokenType.TEXT, value: text, line: lineNum + 1 });
        }
    }

    tokens.push({ type: TokenType.EOF });
    return tokens;
}

export function parseDSL(source) {
    const tokens = tokenize(source);
    let pos = 0;

    function current() { return tokens[pos] || { type: TokenType.EOF }; }
    function advance() { return tokens[pos++]; }
    function skipNewlines() { while (current().type === TokenType.NEWLINE) advance(); }

    function parseChapter() {
        const token = advance();
        const chapter = {
            type: NodeType.CHAPTER,
            id: token.attrs.id,
            title: token.attrs.title,
            objective: null,
            test: null,
            children: [],
            line: token.line,
        };

        skipNewlines();
        while (current().type !== TokenType.BLOCK_END && current().type !== TokenType.EOF) {
            const node = parseNode();
            if (node) {
                if (node.type === 'directive') {
                    if (node.name === 'objective') chapter.objective = node.value;
                    else if (node.name === 'test') chapter.test = node.value;
                } else {
                    chapter.children.push(node);
                }
            }
            skipNewlines();
        }
        if (current().type === TokenType.BLOCK_END) advance();
        return chapter;
    }

    function parseNode() {
        skipNewlines();
        const token = current();

        if (token.type === TokenType.BLOCK_START) return parseBlock();
        if (token.type === TokenType.DIRECTIVE) return parseDirective();
        if (token.type === TokenType.SPEAKER) {
            advance();
            return { type: NodeType.SPEAKER_LINE, speaker: token.speaker, text: token.text, line: token.line };
        }
        if (token.type === TokenType.INLINE_TAG) return parseInlineTag();
        if (token.type === TokenType.TEXT) {
            advance();
            return { type: NodeType.TEXT, value: token.value, line: token.line };
        }
        return null;
    }

    function parseBlock() {
        const token = advance();
        const block = { type: token.name, id: token.attrs.id, children: [], line: token.line };

        if (token.name === 'prompt') {
            block.type = NodeType.PROMPT;
            block.question = [];
            block.ideals = [];
            block.nears = [];
            block.fails = [];
            block.capture = null;
            block.context = null;
            block.responses = [];
        } else if (token.name === 'response') {
            block.type = NodeType.RESPONSE;
            block.match = token.attrs.match;
            block.path = token.attrs.path || null;
        } else if (token.name === 'beat') {
            block.type = NodeType.BEAT;
        } else if (token.name === 'checkpoint') {
            block.type = NodeType.CHECKPOINT;
        }

        skipNewlines();
        while (current().type !== TokenType.BLOCK_END && current().type !== TokenType.EOF) {
            const node = parseNode();
            if (node) {
                if (block.type === NodeType.PROMPT) {
                    if (node.type === 'directive') {
                        if (node.name === 'ideal') block.ideals.push({ path: node.attrs.path || null, criteria: node.value });
                        else if (node.name === 'near') block.nears.push({ path: node.attrs.path || null, criteria: node.value });
                        else if (node.name === 'fail') block.fails.push({ path: node.attrs.path || null, criteria: node.value });
                        else if (node.name === 'capture') block.capture = node.value;
                        else if (node.name === 'context') block.context = node.value;
                    } else if (node.type === NodeType.RESPONSE) {
                        block.responses.push(node);
                    } else {
                        block.question.push(node);
                    }
                } else if (node.type !== 'directive') {
                    block.children.push(node);
                }
            }
            skipNewlines();
        }
        if (current().type === TokenType.BLOCK_END) advance();
        return block;
    }

    function parseDirective() {
        const token = advance();
        return { type: 'directive', name: token.name, attrs: token.attrs, value: token.value, line: token.line };
    }

    function parseInlineTag() {
        const token = advance();
        switch (token.name) {
            case 'pause': return { type: NodeType.PAUSE, line: token.line };
            case 'glitch': return { type: NodeType.GLITCH, line: token.line };
            case 'correction-pressure':
            case 'signal-coherence':
                return { type: NodeType.METRIC, metric: token.name, delta: token.attrs.delta, line: token.line };
            case 'transition':
                return { type: NodeType.TRANSITION, to: token.attrs.to, line: token.line };
            case 'sfx':
                return { type: NodeType.SFX, name: token.attrs.name, line: token.line };
            default:
                return { type: 'inline_tag', name: token.name, attrs: token.attrs, line: token.line };
        }
    }

    const chapters = [];
    skipNewlines();
    while (current().type !== TokenType.EOF) {
        if (current().type === TokenType.BLOCK_START && current().name === 'chapter') {
            chapters.push(parseChapter());
        } else {
            advance();
        }
        skipNewlines();
    }

    return { chapters };
}

// ============================================================================
// RUNTIME
// ============================================================================

export function createGameState(chapterId = null) {
    return {
        currentChapter: chapterId,
        currentNodeIndex: 0,
        awaitingInput: false,
        currentPrompt: null,
        signalCoherence: 0.5,
        correctionPressure: 0.0,
        variables: {},
        completedChapters: [],
        promptResults: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

export class NarrativeRuntime {
    constructor(ast, options = {}) {
        this.ast = ast;
        this.chapters = {};
        for (const chapter of ast.chapters) {
            this.chapters[chapter.id] = chapter;
        }
        this.onOutput = options.onOutput || (() => {});
        this.onMetricChange = options.onMetricChange || (() => {});
        this.onAwaitInput = options.onAwaitInput || (() => {});
        this.onChapterComplete = options.onChapterComplete || (() => {});
        this.evaluateInput = options.evaluateInput || defaultEvaluator;
    }

    async run(state) {
        if (!state.currentChapter) {
            state.currentChapter = this.ast.chapters[0]?.id;
            state.currentNodeIndex = 0;
        }
        const chapter = this.chapters[state.currentChapter];
        if (!chapter) throw new Error(`Chapter not found: ${state.currentChapter}`);
        await this.runFromIndex(chapter, state);
        return state;
    }

    async processInput(state, input) {
        if (!state.awaitingInput || !state.currentPrompt) {
            throw new Error('Not awaiting input');
        }
        const chapter = this.chapters[state.currentChapter];
        const prompt = state.currentPrompt;
        const result = await this.evaluateInput(input, prompt, state);
        state.promptResults[prompt.id] = result.classification;
        // Use extracted value if available, otherwise fall back to raw input
        if (prompt.capture) {
            state.variables[prompt.capture] = result.extractedValue || input;
        }

        const response = this.findResponse(prompt, result.classification, result.path);
        state.awaitingInput = false;
        state.currentPrompt = null;

        if (response) await this.runNodes(response.children, state);
        state.currentNodeIndex++;
        await this.runFromIndex(chapter, state);
        state.updatedAt = new Date().toISOString();
        return state;
    }

    findResponse(prompt, classification, path = null) {
        if (path) {
            const found = prompt.responses.find(r => r.match === classification && r.path === path);
            if (found) return found;
        }
        return prompt.responses.find(r => r.match === classification && !r.path);
    }

    async runFromIndex(chapter, state) {
        const nodes = chapter.children;
        while (state.currentNodeIndex < nodes.length) {
            const node = nodes[state.currentNodeIndex];
            const shouldContinue = await this.runNode(node, state);
            if (!shouldContinue) return;
            state.currentNodeIndex++;
        }
        const hasCheckpoint = nodes.some(n => n.type === NodeType.CHECKPOINT);
        if (!hasCheckpoint) await this.completeChapter(state);
    }

    async runNode(node, state) {
        switch (node.type) {
            case NodeType.BEAT:
                await this.runNodes(node.children, state);
                return true;
            case NodeType.PROMPT:
                for (const n of node.question) await this.runNode(n, state);
                state.awaitingInput = true;
                state.currentPrompt = node;
                await this.onAwaitInput(node);
                return false;
            case NodeType.CHECKPOINT:
                await this.runNodes(node.children, state);
                await this.completeChapter(state);
                return true;
            case NodeType.SPEAKER_LINE:
                await this.onOutput({ type: 'dialogue', speaker: node.speaker, text: this.interpolate(node.text, state.variables) });
                return true;
            case NodeType.TEXT:
                await this.onOutput({ type: 'text', text: this.interpolate(node.value, state.variables) });
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
                state.currentChapter = node.to;
                state.currentNodeIndex = 0;
                const target = this.chapters[node.to];
                if (target) await this.runFromIndex(target, state);
                return false;
            case NodeType.SFX:
                await this.onOutput({ type: 'sfx', name: node.name });
                return true;
            default:
                return true;
        }
    }

    async runNodes(nodes, state) {
        for (const node of nodes) await this.runNode(node, state);
    }

    applyMetric(node, state) {
        const name = node.metric === 'signal-coherence' ? 'signalCoherence' :
                     node.metric === 'correction-pressure' ? 'correctionPressure' : node.metric;
        if (node.delta) {
            state[name] = Math.max(0, Math.min(1, state[name] + parseFloat(node.delta)));
        }
        this.onMetricChange(name, state[name]);
        if (name === 'correctionPressure' && state.correctionPressure >= 1.0) {
            this.onOutput({ type: 'correction' });
        }
    }

    async completeChapter(state) {
        if (!state.completedChapters.includes(state.currentChapter)) {
            state.completedChapters.push(state.currentChapter);
        }
        await this.onChapterComplete(state.currentChapter);
    }

    interpolate(text, variables) {
        if (!text) return text;
        return text.replace(/\{(\w+)\}/g, (m, v) => variables[v] !== undefined ? variables[v] : m);
    }
}

async function defaultEvaluator(input, prompt, state) {
    return { classification: 'near', path: null };
}

// ============================================================================
// EVALUATOR
// ============================================================================

export function createEvaluator(apiKey) {
    if (!apiKey) return defaultEvaluator;

    return async function(input, prompt, state) {
        // Check if we need to extract specific data (like a name)
        const needsExtraction = prompt.capture === 'player_name' || prompt.capture === 'player_age';

        let evalPrompt = '';
        if (prompt.context) evalPrompt += `Context: ${prompt.context}\n\n`;

        const questionText = prompt.question
            .filter(n => n.type === NodeType.SPEAKER_LINE && n.speaker === 'entity')
            .map(n => n.text).join(' ');
        if (questionText) evalPrompt += `The Entity asked: "${questionText}"\n\n`;

        evalPrompt += 'Classification criteria:\n\n';
        for (const ideal of prompt.ideals) {
            evalPrompt += ideal.path ? `IDEAL:${ideal.path} - ${ideal.criteria}\n` : `IDEAL - ${ideal.criteria}\n`;
        }
        for (const near of prompt.nears) evalPrompt += `NEAR - ${near.criteria}\n`;
        for (const fail of prompt.fails) evalPrompt += `FAIL - ${fail.criteria}\n`;
        evalPrompt += `\nPlayer's response: "${input}"\n`;

        // Add extraction instructions if needed
        if (prompt.capture === 'player_name') {
            evalPrompt += '\nAfter classification, also extract the player\'s name from their response. Format: CLASSIFICATION|extracted_name (e.g., "NEAR|Jim" or "IDEAL:deep|Sarah")';
        } else if (prompt.capture === 'player_age') {
            evalPrompt += '\nAfter classification, also extract the player\'s age if they gave a number. Format: CLASSIFICATION|extracted_age (e.g., "IDEAL:literal|42")';
        } else {
            evalPrompt += '\nClassification:';
        }

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 100,
                    system: needsExtraction
                        ? `You classify player responses and extract specific data. Respond in format: CLASSIFICATION|extracted_value (e.g., "NEAR|Jim"). Classification is IDEAL, IDEAL:path_name, NEAR, or FAIL. Be generous - lean toward IDEAL/NEAR for thoughtful engagement. For names, extract just the name (e.g., from "I'm Jim, nice to meet you" extract "Jim"). Capitalize names properly.`
                        : `You classify player responses. Respond with ONLY: IDEAL, IDEAL:path_name, NEAR, or FAIL. Be generous - lean toward IDEAL/NEAR for thoughtful engagement.`,
                    messages: [{ role: 'user', content: evalPrompt }],
                }),
            });

            if (!response.ok) return { classification: 'near', path: null, extractedValue: null };

            const data = await response.json();
            const rawResult = (data.content[0]?.text || '').trim();

            // Parse response - may include extracted value after |
            let result = rawResult.toUpperCase();
            let extractedValue = null;

            if (needsExtraction && rawResult.includes('|')) {
                const parts = rawResult.split('|');
                result = parts[0].trim().toUpperCase();
                extractedValue = parts[1]?.trim() || null;
                // Properly capitalize name
                if (extractedValue && prompt.capture === 'player_name') {
                    extractedValue = extractedValue.charAt(0).toUpperCase() + extractedValue.slice(1).toLowerCase();
                }
            }

            if (result.startsWith('IDEAL:')) {
                const path = result.slice(6).trim().toLowerCase();
                const matching = prompt.ideals.find(i => i.path?.toLowerCase() === path);
                return { classification: 'ideal', path: matching?.path || null, extractedValue };
            }
            if (result.startsWith('IDEAL')) return { classification: 'ideal', path: null, extractedValue };
            if (result.startsWith('FAIL')) return { classification: 'fail', path: null, extractedValue };
            return { classification: 'near', path: null, extractedValue };
        } catch (e) {
            console.error('Evaluator error:', e);
            return { classification: 'near', path: null, extractedValue: null };
        }
    };
}
