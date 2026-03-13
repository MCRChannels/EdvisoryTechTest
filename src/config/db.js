const { MongoClient } = require("mongodb");

let database = null;

async function connectDB() {
  try {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();
    
    // success
    database = client.db();
    console.log("Connected to MongoDB: " + database.databaseName);
    
    return database;
  } catch (error) {
    console.log("Failed to connect to MongoDB: " + error);
    throw error;
  }
}

function getDB() {
  // fail if no db
  if (database == null) {
    throw new Error("Not Connected to Database Right now");
  }
  return database;
}

module.exports = { connectDB, getDB };
