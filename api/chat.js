/**
 * drift.observer Chat API
 *
 * Handles conversation with the Entity via Claude Haiku.
 * Integrates with narrative engine for game state and triggers.
 */

import { addMessage, getMessagesForAPI, getGameState, updateGameState } from '../lib/conversations.js';
import { detectTriggers, applyTriggers, getSystemPrompt, NARRATIVE_BEATS } from '../lib/narrative.js';

export default async function handler(request, response) {
    // Only allow POST
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { sessionId, message } = request.body;

        if (!sessionId || !message) {
            return response.status(400).json({ error: 'sessionId and message required' });
        }

        // Get current game state
        let gameState = await getGameState(sessionId);

        // Detect narrative triggers in player message
        const messages = await getMessagesForAPI(sessionId);
        const triggers = detectTriggers(message, messages, gameState);

        // Check for narrative beat override (e.g., name reveal)
        let narrativeBeat = null;
        for (const trigger of triggers) {
            if (trigger.type === 'NARRATIVE_BEAT') {
                narrativeBeat = NARRATIVE_BEATS[trigger.beat];
            }
        }

        // Apply triggers to update game state
        if (triggers.length > 0) {
            gameState = applyTriggers(gameState, triggers);
            await updateGameState(sessionId, gameState);
        }

        // Store user message
        await addMessage(sessionId, 'user', message);

        let reply;

        if (narrativeBeat && narrativeBeat.entityResponse) {
            // Use scripted narrative beat response
            reply = narrativeBeat.entityResponse;

            // Store the scripted response
            await addMessage(sessionId, 'assistant', reply);

            // If there's a follow-up, we'll send it after a delay (handled client-side)
            if (narrativeBeat.followUp) {
                return response.status(200).json({
                    reply,
                    followUp: narrativeBeat.followUp,
                    gameState: {
                        act: gameState.act,
                        flags: gameState.flags,
                    },
                });
            }
        } else {
            // Get LLM response with appropriate system prompt
            const systemPrompt = getSystemPrompt(gameState);
            const updatedMessages = await getMessagesForAPI(sessionId);

            const anthropicKey = process.env.ANTHROPIC_API_KEY;
            if (!anthropicKey) {
                return response.status(500).json({ error: 'API key not configured' });
            }

            const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 256,
                    system: systemPrompt,
                    messages: updatedMessages,
                }),
            });

            if (!anthropicResponse.ok) {
                const error = await anthropicResponse.text();
                console.error('Anthropic API error:', error);
                return response.status(502).json({ error: 'Failed to get response' });
            }

            const data = await anthropicResponse.json();
            reply = data.content[0]?.text || '';

            // Store entity response
            await addMessage(sessionId, 'assistant', reply);
        }

        return response.status(200).json({
            reply,
            gameState: {
                act: gameState.act,
                flags: gameState.flags,
            },
        });

    } catch (error) {
        console.error('Chat API error:', error);
        return response.status(500).json({ error: 'Internal server error' });
    }
}
