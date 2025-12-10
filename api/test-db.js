/**
 * MongoDB connection test
 */

import { MongoClient } from 'mongodb';

export default async function handler(request, response) {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        return response.status(500).json({
            success: false,
            error: 'MONGODB_URI not configured'
        });
    }

    let client;
    try {
        client = new MongoClient(uri);
        await client.connect();

        const db = client.db('drift');

        // Write a test document
        const testCollection = db.collection('test');
        const testDoc = {
            type: 'connection_test',
            timestamp: new Date(),
            message: 'Hello from drift.observer API'
        };

        const result = await testCollection.insertOne(testDoc);

        return response.status(200).json({
            success: true,
            message: 'MongoDB connected successfully',
            insertedId: result.insertedId
        });

    } catch (error) {
        console.error('MongoDB connection error:', error);
        return response.status(500).json({
            success: false,
            error: error.message
        });
    } finally {
        if (client) {
            await client.close();
        }
    }
}
