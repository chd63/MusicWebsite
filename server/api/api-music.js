const express = require('express');
const multer = require('multer');
const path = require('path');
const { ObjectId } = require('mongodb');
const fs = require('fs');
const { GridFSBucket } = require('mongodb');
const dbUtil = require("../database/database-util");
const { MongoClient } = require("mongodb");

require("dotenv").config({ path: path.resolve(__dirname, '../.env') });

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(null, false);
            return cb(new Error('Only audio files are allowed'));
        }
    }
});

const DB_URI = process.env.DB_URI;

module.exports = {
    initialize : (app) => {

        /*
        Endpoint: POST /api/songs/create
        Description: Creates a new song for a user and responds with the song ID if successful
        */
        app.post("/api/songs/create", upload.single('selectedFile'), async (req, res) => {
            console.log('Received request to upload song');
            console.log('Body:', req.body);
            console.log('File:', req.file);

            if (!req.body.id || !req.body.songTitle || !req.body.songDescription) {
                console.log("Not all values provided in body: " + req.body);
                return res.status(401).send({ message: "Missing required value(s)" });
            }

            const filePath = req.file.path;
            const songId = new ObjectId().toString();

            const songDocument = {
                songId: songId,
                userId: req.body.id,
                title: req.body.songTitle,
                description: req.body.songDescription,
            };

            try {
                const insertedId = await dbUtil.createMp3Document('songs', songDocument, filePath);
                console.log(`Song inserted with ID: ${insertedId}`);
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting temporary file:', err);
                    else console.log('Temporary file deleted successfully');
                });
            } catch (error) {
                console.error("Error uploading song:", error);
                fs.unlink(filePath, (err) => {
                    if (err) console.error('Error deleting temporary file:', err);
                    else console.log('Temporary file deleted successfully');
                });
            }

            return res.status(201).send({ message: "Song successfully created!" });
        });

        /*
        Endpoint: GET /api/songs/random
        Description: Retrieves a random song from all songs and streams it to the client
        */
        app.get("/api/songs/random", async (req, res) => {
            try {
                const client = await MongoClient.connect(DB_URI);
                const db = client.db('yousound');
                const songIds = await dbUtil.getAllSongIds(); 
                const bucket = new GridFSBucket(db, { bucketName: 'songs' });

                if (!songIds || songIds.length === 0) {
                    return res.status(404).send({ message: "No song IDs found" });
                }

                const randomIndex = Math.floor(Math.random() * songIds.length);
                const randomSong = songIds[randomIndex];
                const songMetadata = await dbUtil.getSongMetadataById(randomSong);

                res.set({
                    'Content-Type': 'audio/mpeg',
                    'Content-Disposition': `attachment; filename="song-${randomSong}.mp3"`,
                    'X-Song-Title': songMetadata.metadata.title,
                    'X-Song-Description': songMetadata.metadata.description,
                    'Access-Control-Expose-Headers': 'X-Song-Title, X-Song-Description',
                });

                const stream = bucket.openDownloadStream(randomSong);
                stream.pipe(res);
            } catch (error) {
                console.error(error);
                return res.status(500).send({ message: "Server Error" });
            }
        });

        /*
        Endpoint: GET /api/songs/streamSongById
        Description: Will stream a song requested from the client        
        */
        app.get("/api/songs/streamSongById", async (req, res) => {
            try {
                const { songId } = req.query;
        
                // Validate that songId is provided
                if (!songId) {
                    return res.status(400).send({ message: "Song ID is required" });
                }
        
                // Connect to MongoDB
                const client = await dbUtil.connectToMongo();
                const db = client.db(process.env.DB_NAME);
                const bucket = new GridFSBucket(db, { bucketName: 'songs' });
        
                // Check if the song exists in the database
                const songExists = await db.collection('songs.files').findOne({ _id: new ObjectId(songId) });
                if (!songExists) {
                    return res.status(404).send({ message: "Song not found" });
                }
        
                // Set appropriate headers for audio streaming
                res.set({
                    'Content-Type': 'audio/mpeg',
                    'Content-Disposition': `inline; filename="song-${songId}.mp3"`,
                });
        
                // Stream the song to the client
                const stream = bucket.openDownloadStream(new ObjectId(songId));
                stream.pipe(res);
        
                // Handle stream errors
                stream.on('error', (err) => {
                    console.error('Error streaming song:', err);
                    res.status(500).send({ message: "Error streaming song" });
                });
        
            } catch (error) {
                console.error("Error retrieving song:", error);
                res.status(500).send({ message: "Server Error" });
            }
        });

        /*
        Endpoint: GET /api/songs/homepagesongs
        Description: Will get 10 songs for the user to be able to 
        select for the homepage
        */
        app.post("/api/songs/homepagesongs", async (req, res) => {
            try {

                const userSongs = await dbUtil.getDocuments('songs', {}, { _id: 1, songId: 1,title: 1, description: 1 });

                if (!userSongs || userSongs.length === 0) {
                    return res.status(404).send({ message: "No songs found" });
                }
        
                // Send back song data to the client
                return res.status(200).json({
                    message: "Success",
                    songs: userSongs.map(song => ({
                        songId: song._id,
                        streamId: song.songId,
                        title: song.title,
                        description: song.description,
                    }))
                });
                
            } catch (error) {
                console.error(error);
                return res.status(500).send({ message: "Server Error" });
            }
        });

        /*
        Endpoint: GET /api/songs/usersongs
        Description: Will retreave song data in a list of 10 based on the user 
        id
        */
        app.post("/api/songs/usersongs", async (req, res) => {
            try {
                const userId = req.body.id;

                if (!userId) {
                    return res.status(400).send({ message: "User ID is required" });
                }

                const userSongs = await dbUtil.getDocuments('songs', { userId: userId }, { _id: 1, songId: 1, title: 1, description: 1 });

                if (!userSongs || userSongs.length === 0) {
                    return res.status(404).send({ message: "No songs found for this user" });
                }
        
                // Send back song data to the client
                return res.status(200).json({
                    message: "Success",
                    songs: userSongs.map(song => ({
                        songId: song._id,
                        streamId: song.songId,
                        title: song.title,
                        description: song.description,
                    }))
                });
                
            } catch (error) {
                console.error(error);
                return res.status(500).send({ message: "Server Error" });
            }
        });

        /*
        Endpoint: GET /api/search
        Description: Retrieves a random song from all songs and streams it to the client
        */
        app.get("/api/search", async (req, res) => {
            const { q } = req.query;

            try {

                if (!q || q.trim() === "") {
                    return res.status(400).send({ message: "Nothing was searched" });
                }

                const searchWords = q.split(" ").map(word => word.trim()).filter(Boolean);

                const searchRegex = searchWords.map(word => new RegExp(word, "i")); // "i" for case-insensitive

                const userSongs = await dbUtil.getDocuments(
                    "songs",
                    {
                        $or: [
                            { title: { $in: searchRegex } },
                            { description: { $in: searchRegex } }
                        ]
                    },
                    { _id: 1, songId: 1, title: 1, description: 1 }
                );

                //const userSongs = await dbUtil.getDocuments('songs', {}, { _id: 1, songId: 1,title: 1, description: 1 });

                if (!userSongs || userSongs.length === 0) {
                    return res.status(404).send({ message: "No songs found" });
                }

                // get songs in which words match within title
                
        
                // Send back song data to the client
                return res.status(200).json({
                    message: "Success",
                    songs: userSongs.map(song => ({
                        songId: song._id,
                        streamId: song.songId,
                        title: song.title,
                        description: song.description,
                    }))
                });
                
            } catch (error) {
                console.error(error);
                return res.status(500).send({ message: "Server Error" });
            }
        });

        /*
        Endpoint: POST /api/songs/getsonginfo
        Description: Gets the information of a song based off of it ids
        */

        app.post("/api/songs/getsonginfo", async (req, res) => {
            const { songId } = req.body;
            try {

                if (!songId) {
                    return res.status(400).send({ message: "Song ID is required" });
                }

                const songObjectId = new ObjectId(songId);

                const songInfo = await dbUtil.getDocument(
                    'songs',
                    { songId: songObjectId }, 
                    { projection: { _id: 0, title: 1, description: 1 } } 
                );

                if (!songInfo) {
                    return res.status(404).send({ message: "Song not found" });
                }
        
                // Send back song data to the client
                return res.status(200).json({
                    message: "Success",
                    song: {
                        songId,
                        ...songInfo
                    }
                });
                
            } catch (error) {
                console.error(error);
                return res.status(500).send({ message: "Server Error" });
            }
        });

        /*
        Endpoint: POST /api/songs/createplaylist
        Description: Will create a playlist, the playlist will have an id, a user id that it is
        associated with, as well as a name, and a list (empty at first) of song ids
        */
        app.post("/api/songs/createplaylist", async (req, res) => {
            console.log('Received request to create playlist');
            console.log('Body:', req.body);
        
            const playlistName = req.body.name;
        
            // Check if required values are provided
            if (!playlistName) {
                console.log("Not all values provided in body: " + req.body);
                return res.status(400).send({
                    message: "Playlist name is required"
                });
            }
        
            if (!req.body.userId) {
                return res.status(401).send({
                    message: "User not authenticated"
                });
            }
        
            const userId = req.body.userId;
        
            const playlistData = {
                userId: userId,
                name: playlistName,
                songIds: []  // Empty list of song IDs to start with
            };
        
            try {
                // Create the playlist document in the database
                let result = await dbUtil.createDocument("playlists", playlistData);
        
                console.log("Playlist successfully created with ID " + result);
        
                // Return the response with the new playlist details
                return res.status(201).send({
                    message: "Playlist successfully created!",
                    new_id: result
                });
            } catch (error) {
                console.error("Error creating playlist:", error);
        
                // Handle duplicate key or other database-related errors
                if (error.code === 11000) {
                    // Handle duplicate key error
                    if (error.keyPattern && error.keyPattern.name) {
                        return res.status(400).send({
                            message: "Playlist name already in use"
                        });
                    } else {
                        return res.status(500).send({
                            message: "Server Error"
                        });
                    }
                } else {
                    return res.status(500).send({
                        message: "Server Error"
                    });
                }
            }
        });

        /*
        Endpoint: GET /api/songs/userplaylists
        Description: Will retrieve playlist data for a user, based on the user ID.
        */
        app.post("/api/songs/userplaylists", async (req, res) => {
            try {
                console.log('Body:', req.body);
                const userId = req.body.id;

                if (!userId) {
                    return res.status(400).send({ message: "User ID is required" });
                }

                // Get all playlists for the user
                const userPlaylists = await dbUtil.getDocuments('playlists', { userId: userId }, { _id: 1, name: 1, songIds: 1 });

                if (!userPlaylists || userPlaylists.length === 0) {
                    return res.status(404).send({ message: "No playlists found for this user" });
                }

                // Send back playlist data to the client
                return res.status(200).json({
                    message: "Success",
                    playlists: userPlaylists.map(playlist => ({
                        playlistId: playlist._id.toString(),
                        name: playlist.name,
                        songIds: playlist.songIds, // This will return the list of song IDs associated with the playlist
                    }))
                });
                
            } catch (error) {
                console.error(error);
                return res.status(500).send({ message: "Server Error" });
            }
        });

        /*
        Endpoint: POST /api/songs/addsongtoplaylist
        Description: Adds a songId to a user's playlist. Requires playlistId and songId.
        */
        app.post("/api/songs/addsongtoplaylist", async (req, res) => {
            try {
                console.log('Body:', req.body);
                const userId = req.body.userId;
                const playlistId = req.body.playlistId;
                const songId = req.body.songId;
        
                if (!userId || !playlistId || !songId) {
                    return res.status(400).send({ message: "User ID, Playlist ID, and Song ID are required" });
                }
        
                // Use `new` to instantiate ObjectId
                const playlistObjectId = new ObjectId(playlistId); // Correct way to instantiate ObjectId
        
                // Find the playlist by ID for the user
                const playlists = await dbUtil.getDocuments('playlists', { _id: playlistObjectId, userId: userId });
        
                if (!Array.isArray(playlists) || playlists.length === 0) {
                    return res.status(404).send({ message: "Playlist not found for this user" });
                }
        
                const playlist = playlists[0]; // Assuming there is only one playlist found
        
                // Now add the songId to the playlist's songIds array
                const updatedPlaylist = await dbUtil.updateDocument(
                    'playlists',
                    { _id: playlistObjectId, userId: userId },
                    { $addToSet: { songIds: songId } } // Add songId to songIds array, ensuring no duplicates
                );
        
                // Check if the playlist was updated (modifiedCount will be 0 if song was already in the playlist)
                if (updatedPlaylist.modifiedCount === 0) {
                    return res.status(200).json({
                        message: "Song is already in the playlist",
                        playlistId: playlistId,
                        songId: songId,
                    });
                }
        
                // Return a success message along with the updated playlist data
                return res.status(200).json({
                    message: "Song added to playlist successfully",
                    playlistId: playlistId,
                    songId: songId,
                });
        
            } catch (error) {
                console.error(error);
                return res.status(500).send({ message: "Server Error" });
            }
        });



        console.log("Songs API routes initialized");
    }
}