/**
 * Input Evaluator
 *
 * Uses Claude Haiku to classify player input against
 * the ideal/near/fail criteria defined in prompts.
 */

/**
 * Create an evaluator function that uses the Anthropic API
 */
function createEvaluator(apiKey) {
    return async function evaluateInput(input, prompt, state) {
        // Build the evaluation prompt
        const evalPrompt = buildEvaluationPrompt(input, prompt, state);

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
                    system: EVALUATOR_SYSTEM_PROMPT,
                    messages: [{ role: 'user', content: evalPrompt }],
                }),
            });

            if (!response.ok) {
                console.error('Evaluator API error:', await response.text());
                // Fall back to 'near' on API errors
                return { classification: 'near', path: null };
            }

            const data = await response.json();
            const result = data.content[0]?.text || '';

            return parseEvaluationResult(result, prompt);

        } catch (error) {
            console.error('Evaluator error:', error);
            return { classification: 'near', path: null };
        }
    };
}

/**
 * System prompt for the evaluator
 */
const EVALUATOR_SYSTEM_PROMPT = `You are an input classifier for an interactive narrative game.

Your job is to classify player responses against given criteria.

You must respond with EXACTLY one of these formats:
- IDEAL (if the response matches an ideal criterion)
- IDEAL:path_name (if a specific ideal path matches)
- NEAR (if the response is acceptable but not ideal)
- FAIL (if the response is dismissive, hostile, or refuses engagement)

Be generous - if the player is engaging thoughtfully, lean toward IDEAL or NEAR.
Only classify as FAIL for truly disengaged or hostile responses.

Respond with ONLY the classification. No explanation.`;

/**
 * Build the evaluation prompt from prompt data
 */
function buildEvaluationPrompt(input, prompt, state) {
    let evalPrompt = '';

    // Add context if provided
    if (prompt.context) {
        evalPrompt += `Context: ${prompt.context}\n\n`;
    }

    // Add the question that was asked
    const questionText = prompt.question
        .filter(n => n.type === 'speaker_line' && n.speaker === 'entity')
        .map(n => n.text)
        .join(' ');

    if (questionText) {
        evalPrompt += `The Entity asked: "${questionText}"\n\n`;
    }

    // Add criteria
    evalPrompt += 'Classification criteria:\n\n';

    for (const ideal of prompt.ideals) {
        if (ideal.path) {
            evalPrompt += `IDEAL:${ideal.path} - ${ideal.criteria}\n`;
        } else {
            evalPrompt += `IDEAL - ${ideal.criteria}\n`;
        }
    }

    for (const near of prompt.nears) {
        evalPrompt += `NEAR - ${near.criteria}\n`;
    }

    for (const fail of prompt.fails) {
        evalPrompt += `FAIL - ${fail.criteria}\n`;
    }

    // Add any captured variables for context
    if (Object.keys(state.variables).length > 0) {
        evalPrompt += '\nPrevious information gathered:\n';
        for (const [key, value] of Object.entries(state.variables)) {
            evalPrompt += `- ${key}: ${value}\n`;
        }
    }

    evalPrompt += `\nPlayer's response: "${input}"\n`;
    evalPrompt += '\nClassification:';

    return evalPrompt;
}

/**
 * Parse the evaluation result from Haiku's response
 */
function parseEvaluationResult(result, prompt) {
    const cleaned = result.trim().toUpperCase();

    // Check for path-specific ideal
    if (cleaned.startsWith('IDEAL:')) {
        const path = cleaned.slice(6).trim().toLowerCase();
        // Verify this path exists
        const matchingIdeal = prompt.ideals.find(i => i.path?.toLowerCase() === path);
        if (matchingIdeal) {
            return { classification: 'ideal', path: matchingIdeal.path };
        }
        // Fall back to generic ideal if path not found
        return { classification: 'ideal', path: null };
    }

    // Check for simple classifications
    if (cleaned.startsWith('IDEAL')) {
        return { classification: 'ideal', path: null };
    }

    if (cleaned.startsWith('FAIL')) {
        return { classification: 'fail', path: null };
    }

    // Default to near
    return { classification: 'near', path: null };
}

/**
 * Create a mock evaluator for testing (no API calls)
 */
function createMockEvaluator(defaultClassification = 'near') {
    return async function mockEvaluate(input, prompt, state) {
        // Simple keyword matching for testing
        const lowerInput = input.toLowerCase();

        // Check for explicit test markers
        if (lowerInput.includes('[ideal]')) {
            const pathMatch = lowerInput.match(/\[ideal:(\w+)\]/);
            return {
                classification: 'ideal',
                path: pathMatch ? pathMatch[1] : null
            };
        }

        if (lowerInput.includes('[near]')) {
            return { classification: 'near', path: null };
        }

        if (lowerInput.includes('[fail]')) {
            return { classification: 'fail', path: null };
        }

        return { classification: defaultClassification, path: null };
    };
}

// Exports
module.exports = {
    createEvaluator,
    createMockEvaluator,
    buildEvaluationPrompt,
    parseEvaluationResult,
    EVALUATOR_SYSTEM_PROMPT,
};
