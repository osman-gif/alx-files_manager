// document the whole file

// Redis client
class RedisClient{

    // constructor
    constructor(){
        this.client = require('redis').createClient();
        this.client.on('error', (err) => {
            console.log(`Redis client not connected to the server: ${err.message}`);
        });
    }
    // returns true if connected to redis false otherways
    isAlive(){
        return this.client.connected;
    }

    // set a key with a value and a duration
    async set(key, value, duration){
        this.client.set(key, value);
        this.client.expire(key, duration);
    }

    // get a key
    async get(key){
        return new Promise((resolve, reject) => {
            this.client.get(key, (err, reply) => {
                if(err) reject(err);
                resolve(reply);
            });
        });
    }

    // delete a key
    async del(key){
        this.client.del(key)
    }
}

// export the class
const redisClient = new RedisClient();
module.exports = redisClient;