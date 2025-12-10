/**
 * Conversation persistence layer
 */

import clientPromise from './mongodb.js';
import { createInitialState } from './narrative.js';

const DB_NAME = 'drift';
const COLLECTION = 'conversations';

/**
 * Get or create a conversation by session ID
 */
export async function getConversation(sessionId) {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    let conversation = await collection.findOne({ sessionId });

    if (!conversation) {
        conversation = {
            sessionId,
            messages: [],
            gameState: createInitialState(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await collection.insertOne(conversation);
    }

    return conversation;
}

/**
 * Add a message to a conversation
 */
export async function addMessage(sessionId, role, content) {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    const message = {
        role,
        content,
        timestamp: new Date(),
    };

    await collection.updateOne(
        { sessionId },
        {
            $push: { messages: message },
            $set: { updatedAt: new Date() }
        },
        { upsert: true }
    );

    return message;
}

/**
 * Get messages for API (just role and content, no timestamps)
 */
export async function getMessagesForAPI(sessionId) {
    const conversation = await getConversation(sessionId);
    return conversation.messages.map(m => ({
        role: m.role,
        content: m.content
    }));
}

/**
 * Update game state
 */
export async function updateGameState(sessionId, gameState) {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    await collection.updateOne(
        { sessionId },
        {
            $set: {
                gameState,
                updatedAt: new Date()
            }
        }
    );
}

/**
 * Get game state for a session
 */
export async function getGameState(sessionId) {
    const conversation = await getConversation(sessionId);
    return conversation.gameState || createInitialState();
}
