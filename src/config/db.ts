import mongoose from 'mongoose';

export let legacyConnection: mongoose.Connection;
export let connection: mongoose.Connection;

async function connectDB() {
  console.log('uri is:');
  console.log(process.env.MONGO_URI);
  legacyConnection = await mongoose.createConnection(process.env.MONGO_URI_OLD_DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  }); 
  console.log(`MongoDB old db connected`);

  connection = await mongoose.createConnection(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  }); 
  console.log(`MongoDB new db connected`);

  mongoose.Promise = global.Promise;
};

export default connectDB;
