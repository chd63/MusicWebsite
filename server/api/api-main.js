const auth = require("./api-auth");
const users = require("./api-users");
const music = require("./api-music")


module.exports = {
    /*
    Adds API routes to the given Express app
    */
    initialize : (app) => {
        // Initialize test route
        app.get('/api', (req, res) => {
            res.status(200).send({ message: 'Test message from server' });
        });

        
        // Initialize other API routes
        auth.initialize(app);
        users.initialize(app);
        music.initialize(app);
    }
}