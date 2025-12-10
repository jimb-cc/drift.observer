/**
 * MongoDB connection utility
 * Reuses connection across requests in serverless environment
 */

import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

let client;
let clientPromise;

if (!uri) {
    throw new Error('MONGODB_URI environment variable not set');
}

if (process.env.NODE_ENV === 'development') {
    // In development, use a global variable to preserve connection across hot reloads
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // In production, create a new client
    client = new MongoClient(uri);
    clientPromise = client.connect();
}

export default clientPromise;
