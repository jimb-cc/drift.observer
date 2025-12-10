/**
 * Conversation viewer API
 * For reviewing player conversations
 */

import clientPromise from '../lib/mongodb.js';

export default async function handler(request, response) {
    // Only allow GET
    if (request.method !== 'GET') {
        return response.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const client = await clientPromise;
        const db = client.db('drift');
        const collection = db.collection('conversations');

        const { sessionId } = request.query;

        if (sessionId) {
            // Get specific conversation
            const conversation = await collection.findOne({ sessionId });
            if (!conversation) {
                return response.status(404).json({ error: 'Conversation not found' });
            }
            return response.status(200).json(conversation);
        }

        // List all conversations (most recent first)
        const conversations = await collection
            .find({})
            .sort({ updatedAt: -1 })
            .limit(50)
            .project({
                sessionId: 1,
                createdAt: 1,
                updatedAt: 1,
                messageCount: { $size: '$messages' },
            })
            .toArray();

        return response.status(200).json(conversations);

    } catch (error) {
        console.error('Conversations API error:', error);
        return response.status(500).json({ error: 'Internal server error' });
    }
}
