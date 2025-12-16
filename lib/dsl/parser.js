/**
 * Narrative DSL Parser
 *
 * Parses the drift.observer narrative markup format into
 * a structured AST that the narrative engine can run.
 *
 * Syntax overview:
 *   :::block{attr="value"}
 *     content
 *   :::
 *
 *   @directive: value
 *   @directive{path="x"}: value
 *
 *   <inline-tag attr="value"/>
 *   <inline-tag>
 */

/**
 * Token types produced by the lexer
 */
const TokenType = {
    BLOCK_START: 'BLOCK_START',       // :::name{attrs}
    BLOCK_END: 'BLOCK_END',           // :::
    DIRECTIVE: 'DIRECTIVE',           // @name{attrs}: value
    INLINE_TAG: 'INLINE_TAG',         // <name attr="val"/>
    TEXT: 'TEXT',                     // Plain text content
    SPEAKER: 'SPEAKER',               // **Entity:** or **Player:**
    NEWLINE: 'NEWLINE',
    EOF: 'EOF',
};

/**
 * Tokenize the DSL source into tokens
 */
function tokenize(source) {
    const tokens = [];
    const lines = source.split('\n');

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
            tokens.push({ type: TokenType.NEWLINE, line: lineNum + 1 });
            continue;
        }

        // Block start: :::name{attrs}
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

        // Block end: :::
        if (trimmed === ':::') {
            tokens.push({ type: TokenType.BLOCK_END, line: lineNum + 1 });
            continue;
        }

        // Directive: @name{attrs}: value
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

        // Speaker line: **Entity:** or **Player:**
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

        // Line might contain inline tags mixed with text
        tokenizeLine(trimmed, lineNum + 1, tokens);
    }

    tokens.push({ type: TokenType.EOF });
    return tokens;
}

/**
 * Tokenize a line that may contain inline tags
 */
function tokenizeLine(line, lineNum, tokens) {
    // Match inline tags: <name attr="val"/> or <name>
    const tagPattern = /<(\w+[-\w]*)(?:\s+([^/>]*))?\s*\/?>/g;
    let lastIndex = 0;
    let match;

    while ((match = tagPattern.exec(line)) !== null) {
        // Text before the tag
        if (match.index > lastIndex) {
            const text = line.slice(lastIndex, match.index).trim();
            if (text) {
                tokens.push({ type: TokenType.TEXT, value: text, line: lineNum });
            }
        }

        // The tag itself
        tokens.push({
            type: TokenType.INLINE_TAG,
            name: match[1],
            attrs: parseAttrs(match[2] || ''),
            line: lineNum,
        });

        lastIndex = match.index + match[0].length;
    }

    // Remaining text after last tag
    if (lastIndex < line.length) {
        const text = line.slice(lastIndex).trim();
        if (text) {
            tokens.push({ type: TokenType.TEXT, value: text, line: lineNum });
        }
    }
}

/**
 * Parse attribute string into object
 * e.g., 'id="foo" value="bar"' -> { id: 'foo', value: 'bar' }
 */
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

/**
 * AST Node types
 */
const NodeType = {
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

/**
 * Parse tokens into an AST
 */
function parse(tokens) {
    let pos = 0;

    function current() {
        return tokens[pos] || { type: TokenType.EOF };
    }

    function advance() {
        return tokens[pos++];
    }

    function expect(type) {
        const token = current();
        if (token.type !== type) {
            throw new ParseError(`Expected ${type}, got ${token.type}`, token.line);
        }
        return advance();
    }

    function skipNewlines() {
        while (current().type === TokenType.NEWLINE) {
            advance();
        }
    }

    function parseChapter() {
        const token = expect(TokenType.BLOCK_START);
        if (token.name !== 'chapter') {
            throw new ParseError(`Expected chapter block, got ${token.name}`, token.line);
        }

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

        // Parse chapter contents
        while (current().type !== TokenType.BLOCK_END && current().type !== TokenType.EOF) {
            const node = parseNode();
            if (node) {
                // Handle chapter-level directives
                if (node.type === 'directive') {
                    if (node.name === 'objective') chapter.objective = node.value;
                    else if (node.name === 'test') chapter.test = node.value;
                } else {
                    chapter.children.push(node);
                }
            }
            skipNewlines();
        }

        if (current().type === TokenType.BLOCK_END) {
            advance();
        }

        return chapter;
    }

    function parseNode() {
        skipNewlines();
        const token = current();

        switch (token.type) {
            case TokenType.BLOCK_START:
                return parseBlock();
            case TokenType.DIRECTIVE:
                return parseDirective();
            case TokenType.SPEAKER:
                return parseSpeakerLine();
            case TokenType.INLINE_TAG:
                return parseInlineTag();
            case TokenType.TEXT:
                advance();
                return { type: NodeType.TEXT, value: token.value, line: token.line };
            default:
                return null;
        }
    }

    function parseBlock() {
        const token = advance();

        switch (token.name) {
            case 'beat':
                return parseBeat(token);
            case 'prompt':
                return parsePrompt(token);
            case 'response':
                return parseResponse(token);
            case 'checkpoint':
                return parseCheckpoint(token);
            default:
                throw new ParseError(`Unknown block type: ${token.name}`, token.line);
        }
    }

    function parseBeat(token) {
        const beat = {
            type: NodeType.BEAT,
            id: token.attrs.id,
            children: [],
            line: token.line,
        };

        skipNewlines();

        while (current().type !== TokenType.BLOCK_END && current().type !== TokenType.EOF) {
            const node = parseNode();
            if (node && node.type !== 'directive') {
                beat.children.push(node);
            }
            skipNewlines();
        }

        if (current().type === TokenType.BLOCK_END) advance();
        return beat;
    }

    function parsePrompt(token) {
        const prompt = {
            type: NodeType.PROMPT,
            id: token.attrs.id,
            question: [],       // Entity's question content
            ideals: [],         // Ideal answer criteria
            nears: [],          // Near-miss criteria
            fails: [],          // Fail criteria
            capture: null,      // Variable to capture
            context: null,      // Context hint for evaluator
            responses: [],      // Response blocks
            line: token.line,
        };

        skipNewlines();

        while (current().type !== TokenType.BLOCK_END && current().type !== TokenType.EOF) {
            const node = parseNode();
            if (node) {
                if (node.type === 'directive') {
                    handlePromptDirective(prompt, node);
                } else if (node.type === NodeType.RESPONSE) {
                    prompt.responses.push(node);
                } else {
                    prompt.question.push(node);
                }
            }
            skipNewlines();
        }

        if (current().type === TokenType.BLOCK_END) advance();
        return prompt;
    }

    function handlePromptDirective(prompt, directive) {
        switch (directive.name) {
            case 'ideal':
                prompt.ideals.push({
                    path: directive.attrs.path || null,
                    criteria: directive.value,
                });
                break;
            case 'near':
                prompt.nears.push({
                    path: directive.attrs.path || null,
                    criteria: directive.value,
                });
                break;
            case 'fail':
                prompt.fails.push({
                    path: directive.attrs.path || null,
                    criteria: directive.value,
                });
                break;
            case 'capture':
                prompt.capture = directive.value;
                break;
            case 'context':
                prompt.context = directive.value;
                break;
        }
    }

    function parseResponse(token) {
        const response = {
            type: NodeType.RESPONSE,
            match: token.attrs.match,       // 'ideal', 'near', 'fail'
            path: token.attrs.path || null, // Optional path for multi-branch
            children: [],
            line: token.line,
        };

        skipNewlines();

        while (current().type !== TokenType.BLOCK_END && current().type !== TokenType.EOF) {
            const node = parseNode();
            if (node && node.type !== 'directive') {
                response.children.push(node);
            }
            skipNewlines();
        }

        if (current().type === TokenType.BLOCK_END) advance();
        return response;
    }

    function parseCheckpoint(token) {
        const checkpoint = {
            type: NodeType.CHECKPOINT,
            children: [],
            line: token.line,
        };

        skipNewlines();

        while (current().type !== TokenType.BLOCK_END && current().type !== TokenType.EOF) {
            const node = parseNode();
            if (node && node.type !== 'directive') {
                checkpoint.children.push(node);
            }
            skipNewlines();
        }

        if (current().type === TokenType.BLOCK_END) advance();
        return checkpoint;
    }

    function parseDirective() {
        const token = advance();
        return {
            type: 'directive',
            name: token.name,
            attrs: token.attrs,
            value: token.value,
            line: token.line,
        };
    }

    function parseSpeakerLine() {
        const token = advance();
        return {
            type: NodeType.SPEAKER_LINE,
            speaker: token.speaker,
            text: token.text,
            line: token.line,
        };
    }

    function parseInlineTag() {
        const token = advance();

        switch (token.name) {
            case 'pause':
                return { type: NodeType.PAUSE, line: token.line };
            case 'glitch':
                return { type: NodeType.GLITCH, line: token.line };
            case 'correction-pressure':
            case 'signal-coherence':
                return {
                    type: NodeType.METRIC,
                    metric: token.name,
                    delta: token.attrs.delta,
                    line: token.line,
                };
            case 'metric':
                return {
                    type: NodeType.METRIC,
                    metric: token.attrs.name,
                    value: token.attrs.value,
                    delta: token.attrs.delta,
                    line: token.line,
                };
            case 'transition':
                return {
                    type: NodeType.TRANSITION,
                    to: token.attrs.to,
                    line: token.line,
                };
            case 'sfx':
                return {
                    type: NodeType.SFX,
                    name: token.attrs.name,
                    line: token.line,
                };
            default:
                // Unknown inline tag - return as generic
                return {
                    type: 'inline_tag',
                    name: token.name,
                    attrs: token.attrs,
                    line: token.line,
                };
        }
    }

    // Parse top-level: expect one or more chapters
    const chapters = [];
    skipNewlines();

    while (current().type !== TokenType.EOF) {
        if (current().type === TokenType.BLOCK_START && current().name === 'chapter') {
            chapters.push(parseChapter());
        } else {
            // Skip non-chapter content at top level (comments, etc.)
            advance();
        }
        skipNewlines();
    }

    return { chapters };
}

/**
 * Custom error class for parse errors
 */
class ParseError extends Error {
    constructor(message, line) {
        super(`Line ${line}: ${message}`);
        this.name = 'ParseError';
        this.line = line;
    }
}

/**
 * Main entry point: parse DSL source into AST
 */
function parseDSL(source) {
    const tokens = tokenize(source);
    return parse(tokens);
}

/**
 * Validate an AST for common issues
 */
function validateAST(ast) {
    const errors = [];
    const chapterIds = new Set();

    for (const chapter of ast.chapters) {
        // Check for duplicate chapter IDs
        if (chapterIds.has(chapter.id)) {
            errors.push({ line: chapter.line, message: `Duplicate chapter ID: ${chapter.id}` });
        }
        chapterIds.add(chapter.id);

        // Check chapter has required fields
        if (!chapter.id) {
            errors.push({ line: chapter.line, message: 'Chapter missing id attribute' });
        }

        // Validate prompts have at least one ideal
        validateChildren(chapter.children, errors);
    }

    return errors;
}

function validateChildren(children, errors) {
    for (const child of children) {
        if (child.type === NodeType.PROMPT) {
            if (child.ideals.length === 0) {
                errors.push({ line: child.line, message: `Prompt "${child.id}" has no @ideal criteria` });
            }
            if (child.responses.length === 0) {
                errors.push({ line: child.line, message: `Prompt "${child.id}" has no response blocks` });
            }
        }

        if (child.children) {
            validateChildren(child.children, errors);
        }
    }
}

// Exports
module.exports = {
    parseDSL,
    validateAST,
    tokenize,
    parse,
    ParseError,
    TokenType,
    NodeType,
};
