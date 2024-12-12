
const {MongoClient} = require('mongodb');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 27017;
const files_manager = process.env.DB_DATABASE || 'files_manager';

class DBClient{
    
    
    // constructor
    constructor(host=DB_HOST, port=DB_PORT, database=files_manager){
        this.host = host;
        this.port = port;
        this.database = database;
    }
    //a function isAlive that returns true when the connection to MongoDB is a success otherwise, false

    isAlive() {
        // Create a new MongoClient
        try {
          
          const client = new MongoClient(`mongodb://${this.host}:${this.port}`, { useNewUrlParser: true, useUnifiedTopology: true });
          client.connect();
          return true;
        } catch (e) {
          return false;
        }
      }
      
      
    //a function nbUsers that returns the number of documents in the collection users
    async nbUsers(){
        
        const client = await MongoClient.connect(`mongodb://${this.host}:${this.port}`, {useNewUrlParser: true, useUnifiedTopology: true});
        const db = client.db(this.database);
        const users = db.collection('users');
        const count = await users.countDocuments();
        client.close();
        return count;
    }

    //a function nbFiles that returns the number of documents in the collection files
    async nbFiles(){
        // Create a new MongoClient
        const client = await MongoClient.connect(`mongodb://${this.host}:${this.port}`, {useNewUrlParser: true, useUnifiedTopology: true}, );
        const db = client.db(this.database);
        const files = db.collection('files');
        const count = await files.countDocuments();
        client.close();
        return count;
    }
}

// export the class
const client = MongoClient.connect(`mongodb://${DB_HOST}:${DB_PORT}`, {useNewUrlParser: true, useUnifiedTopology: true});
const dbClient = new DBClient();
module.exports = dbClient; 