/**
 * Conversation persistence layer
 */

import clientPromise from './mongodb.js';

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
            createdAt: new Date(),
            updatedAt: new Date(),
            metadata: {
                act: 1,
                entityNameRevealed: false,
            }
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
 * Update conversation metadata
 */
export async function updateMetadata(sessionId, metadata) {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION);

    await collection.updateOne(
        { sessionId },
        {
            $set: {
                metadata,
                updatedAt: new Date()
            }
        }
    );
}
