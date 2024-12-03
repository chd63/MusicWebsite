const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');
const api = require("./api/api-main");
const {connectToMongo} = require("./database/database-util");

require("dotenv").config({ path: path.resolve(__dirname, './.env') });
port = 5000;
//const port = process.env.SERVER_PORT;

// Enable CORS for all origins
app.use(cors());

// Make app able to parse JSON
app.use(express.json());

// Serve the static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Test database connection
console.log("Testing database connection...");


connectToMongo()
    .then(client => {
        console.log("Connected to database!");
        client.close();
        
        /* If all is good with the database, initialize the server and run it */

        // Initialize API routes
        console.log("\nInitializing API...");
        api.initialize(app);

        // For any other route, serve the React app
        app.get('*', (req, res) => {
            res.sendFile(path.join(path.join(__dirname, '../frontend/build'), 'index.html'));
        });

        // Start server
        app.listen(port, '0.0.0.0', () => {
            console.log(`\nServer running on port ${port}`);
        });
    })
    .catch(error => {
        console.error("Error connecting to database:", error);
        throw error;
    });