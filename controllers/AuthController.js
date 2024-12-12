const crypto = require('crypto'); // For hashing passwords
const { v4: uuidv4 } = require('uuid'); // For generating random tokens
const redis = require('redis');
const redisClient = redis.createClient();
const { MongoClient } = require('mongodb');
const dbClient = require('../utils/db');


// Database connection (update with your MongoDB URI and database name)
const mongoClient = new MongoClient(`mongodb://${dbClient.host}:${dbClient.port}`, { useUnifiedTopology: true });let db;

mongoClient.connect()
    .then(client => {
        db = client.db(dbClient.database); // Replace with your database name
        console.log('Connected to MongoDB');
    })
    .catch(err => console.error('Failed to connect to MongoDB:', err));

// Utility function to parse Basic Auth header
const parseAuthorizationHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return null;
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [email, password] = credentials.split(':');
    return { email, password };
};

class AuthController {

    static async getConnect(req, res) {
        const authHeader = req.headers.authorization;
        const credentials = parseAuthorizationHeader(authHeader);
        console.log(credentials)
        if (!credentials) {
            return res.status(401).send('Unauthorized');
        }

        const { email, password } = credentials;

        // Hash the provided password
        const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

        try {
            // Find the user in the database
            const user = await db.collection('users').findOne({ email, password: hashedPassword });
            if (!user) {
                return res.status(401).send('Unauthorized');
            }

            // Generate a random token
            const token = uuidv4();

            // Store the token in Redis with a 24-hour expiration
            const redisKey = `auth_${token}`;
            redisClient.setex(redisKey, 86400, user._id.toString(), (err) => {
                if (err) {
                    return res.status(500).send('Internal Server Error');
                }

                // Return the token
                res.status(200).json({ token });
            });
        } catch (dbError) {
            console.error('Database error:', dbError);
            res.status(500).send('Internal Server Error');
        }
    }

    static async getDisconnect(req, res) {
        const token = req.headers['x-token']; // Retrieve the token from the X-Token header

        if (!token) {
            return res.status(401).send('Unauthorized');
        }

        const redisKey = `auth_${token}`;

        // Check if the token exists in Redis
        redisClient.get(redisKey, (err, userId) => {
            if (err || !userId) {
                return res.status(401).send('Unauthorized');
            }

            // Delete the token from Redis
            redisClient.del(redisKey, (delErr) => {
                if (delErr) {
                    return res.status(500).send('Internal Server Error');
                }

                // Successfully logged out
                return res.status(204).send();
            });
        });
    }
}

module.exports = AuthController;
