const crypto = require('crypto');
const { MongoClient } = require('mongodb');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis')
const mongoUrl = 'mongodb://'+dbClient.host+':'+dbClient.port;
const dbName = dbClient.database;



class UsersController {
    static async postNew(req, res) {
        const { email, password } = req.body;

        // Validate request
        if (!email) {
            return res.status(400).json({ error: 'Missing email' });
        }
        if (!password) {
            return res.status(400).json({ error: 'Missing password' });
        }

        try {
            const client = await MongoClient.connect(mongoUrl, { useUnifiedTopology: true });
            const db = client.db(dbName);
            const usersCollection = db.collection('users');

            // Check if the email already exists
            const existingUser = await usersCollection.findOne({ email });
            if (existingUser) {
                await client.close();
                return res.status(400).json({ error: 'Already exist' });
            }

            // Hash the password using SHA1
            const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

            // Insert the new user into the database
            const result = await usersCollection.insertOne({
                email,
                password: hashedPassword,
            });

            // Respond with the newly created user
            const newUser = {
                id: result.insertedId,
                email,
            };

            await client.close();
            return res.status(201).json(newUser);
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    static async getMe(req, res) {
        const token = req.headers['X-Token']; // Retrieve the token from the X-Token header

        if (!token) {
            return res.status(401).send('Unauthorized');
        }

        const redisKey = `auth_${token}`;

        // Check if the token exists in Redis
        redisClient.get(redisKey, async (err, userId) => {
            if (err || !userId) {
                return res.status(401).send('Unauthorized');
            }

            try {
                // Query the user from the database
                const user = await db.collection('users').findOne({ _id: parseInt(userId) });
                if (!user) {
                    console.log(err, '++++++++++++++++')
                    return res.status(401).send('Unauthorized');
                }

                // Return the user object (email and id only)
                res.status(200).json({ id: user._id, email: user.email });
            } catch (dbError) {
                console.error('Database error:', dbError);
                res.status(500).send('Internal Server Errssor');
            }
        });
    }
}

module.exports = UsersController;

