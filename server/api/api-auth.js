const dbUtil = require("../database/database-util")
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");

module.exports = {
    initialize : (app) => {
        require("dotenv").config({ path: path.resolve(__dirname, '../.env') });
        const SECRET_KEY = process.env.JWT_SECRET_KEY;

        /*
        Endpoint: POST /api/auth/login
        Description: Attempts to log a user in with the given credentials
        and gives a new token if successful
        Authentication: None

        Expected request body: {username, password}
        Status codes and responses:
        200 - OK 
            {message, token, id}
        401 - Incorrect credentials
            {message}
        500 - Server error
            {message}
        */
        app.post("/api/auth/login", async (req, res) => {
            try {     
                if (!(req.body.username && req.body.password)) {
                    return res.status(400).send({message : "Not all info provided"});
                }

                let user = await dbUtil.getDocument("users", {username : req.body.username});

                if (user && user.password && bcrypt.compareSync(req.body.password, user.password)) {
                    let token = jwt.sign({id : user._id}, SECRET_KEY, {expiresIn : "1h"});
                    let stringID = user._id.toString();

                    res.status(200).send({message : "Login successful!", token, id : stringID});
                } else {
                    res.status(401).send({message : "Username or password was incorrect"});
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({message : "Server error"});
            }
        });

        console.log("Auth API routes initialized");
    }
}