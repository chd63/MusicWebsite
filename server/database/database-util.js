// General functions for database access
// - Database connection
// - CRUD Operations

const path = require("path");
const fs = require('fs');
require("dotenv").config({ path: path.resolve(__dirname, '../.env') });
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');

const DB_URI = process.env.DB_URI;
const DB_NAME = process.env.DB_NAME;

/*
Functions
*/
module.exports = {
    /*
    Database connection function, returns resulting client object given a connection url
    */
    connectToMongo : async () => {
        return await MongoClient.connect(DB_URI);
        
    },


    /*
    Performs functionality on a given collection defined by the given callback function,
    which takes the collection object as a parameter. Returns the result of the callback function
    or throws an error if something goes wrong
    */
    performOperation: async (collectionName, callback) => {
        let client;

        try {
            client = await module.exports.connectToMongo();
            const db = client.db(DB_NAME);

            const collection = await db.collection(collectionName, { strict: true });

            return await callback(collection);
        } catch (error) {
            console.error(error); // Log the error for debugging purposes
            throw error;
        } finally {
            if (client) {
                await client.close(); // Ensure the client is properly closed after operation
            }
        }
    },

    /*
    Creates a document in a collection given an object with values, returns the
    inserted ID, or throws an error if unable to insert
    */
    createDocument : async (collectionName, toInsert) => {
        return await module.exports.performOperation(collectionName, async (collection) => {
            let result = await collection.insertOne(toInsert);
            return result.insertedId;
        });
    },

    /* 
    Retrieves a single document in a collection with a filter object and returns
    the found object, returns null if not found. Assumes the given ID is already an ObjectId
    object
    */
    getDocument : async (collectionName, filter, projection = null) => {
        return await module.exports.performOperation(collectionName, async (collection) => {
            return await collection.findOne(filter, projection);
        });
    },

    /* 
    Retrieves documents in a collection with a given filter object and returns
    an array of the found documents
    */
    getDocuments : async (collectionName, filter, projection = null) => {
        return await module.exports.performOperation(collectionName, async (collection) => {
            return await collection.find(filter, projection).toArray();
        });
    },

    /* 
    Updates a single document in a collection with a certain ID given an update object, 
    returns the result object. Assumes the given ID is already an
    ObjectId object
    */
    updateDocument : async (collectionName, filter, update) => {
        return await module.exports.performOperation(collectionName, async (collection) => {
            return await collection.updateOne(filter, update);
        });
    },

    /* 
    Updates documents in a collection with a given filter object and an update 
    object, returns the result object
    */
    updateDocuments : async (collectionName, filter, update) => {
        return await module.exports.performOperation(collectionName, async (collection) => {
            return await collection.updateMany(filter, update);
        });
    },

    /*
    Deletes a single document in a collection with a certain ID, and returns
    the result object. Assumes the given ID is already an ObjectId object
    */
    deleteDocument : async (collectionName, filter) => {
        return await module.exports.performOperation(collectionName, async (collection) => {
            return await collection.deleteOne(filter);
        })
    },

    /*
    Deletes documents in a collection with a given filter object, and returns
    the result object
    */
    deleteDocuments : async (collectionName, filter) => {
        return await module.exports.performOperation(collectionName, async (collection) => {
            return await collection.deleteMany(filter);
        })
    },


    /*
    Creates a document in a collection given an object with values, returns the
    inserted ID, or throws an error if unable to insert.
    Also uploads an MP3 file to GridFS.
    */
    createMp3Document: async (collectionName, toInsert, filePath) => {
        const client = await module.exports.connectToMongo();
        const db = client.db(DB_NAME);
        const bucket = new GridFSBucket(db, { bucketName: 'songs' }); // GridFS bucket for MP3 files
    
    
        if (filePath) 
        {
            const uploadStream = bucket.openUploadStream(toInsert.title + '.mp3', {
                metadata: {
                    title: toInsert.title,
                    description: toInsert.description,
                    filename: toInsert.filename || (toInsert.title + '.mp3') ,
                    user: toInsert.userId
                }
            });

            const fileStream = fs.createReadStream(filePath);
    
            // Upload MP3 file to GridFS
            await new Promise((resolve, reject) => {
                fileStream.pipe(uploadStream)
                    .on('error', (error) => {
                        reject(error); // Throw error if upload fails
                    })
                    .on('finish', () => {
                        toInsert.songId = uploadStream.id; // Store the GridFS file ID in the metadata
                        resolve();
                    });
            });
        }
    
        // Insert song metadata (including songId) into the collection
        const collection = db.collection(collectionName);
        let result = await collection.insertOne(toInsert);
        await client.close();
        return result.insertedId;
    },


    /*
    Gets all of the song ids in an array
    */
    getAllSongIds: async () => {
        const client = await module.exports.connectToMongo();
        const database = client.db('musicWebsite');
        const songsCollection = database.collection('songs.files');
    
        // Find only the _id field
        const songs = await songsCollection.find({}, { projection: { _id: 1 } }).toArray();
        
        // Extract and return the IDs in an array
        return songs.map(songs => songs._id);
    },

    /*
    This retrieves the song metadata for a specific songId from GridFS.
    */
    getSongMetadataById: async (songId) => {
        const client = await module.exports.connectToMongo();
        const db = client.db(DB_NAME);
    
        try {
            // Ensure songId is correctly converted to ObjectId
            const songObjectId = new ObjectId(songId);
    
            // First, fetch the `songId` from the `songs` collection
            const songRecord = await db.collection('songs').findOne({ songId: songObjectId });
    
            if (!songRecord) {
                console.error(`Song with songId ${songId} not found in 'songs' collection.`);
                throw new Error('Song not found in songs collection.');
            }
    
            // Use the `_id` from GridFS (stored as `songId` in the `songs` collection)
            const gridFsObjectId = songRecord.songId;
    
            // Fetch metadata from GridFS
            const songMetadata = await db.collection('songs.files').findOne({ _id: gridFsObjectId });
    
            if (!songMetadata) {
                console.error(`Metadata for song with ID ${gridFsObjectId} not found in GridFS.`);
                throw new Error('Song metadata not found in GridFS.');
            }
    
            return songMetadata;
        } catch (error) {
            console.error('Error retrieving song metadata by ID:', error);
            throw new Error('Error retrieving song metadata by ID');
        } finally {
            await client.close();
        }
    }
            
}