import mongoose from 'mongoose';

export let legacyConnection: mongoose.Connection;
export let connection: mongoose.Connection;

import { tsPhotoUtilsConfiguration } from './config';

async function connectDB() {
  console.log('legacy uri is:');
  console.log(tsPhotoUtilsConfiguration.MONGO_URI_OLD);
  legacyConnection = await mongoose.createConnection(tsPhotoUtilsConfiguration.MONGO_URI_OLD, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  }); 
  console.log(`MongoDB old db connected`);

  console.log('new uri is:');
  console.log(tsPhotoUtilsConfiguration.MONGO_URI);
  connection = await mongoose.createConnection(tsPhotoUtilsConfiguration.MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  }); 
  console.log(`MongoDB new db connected`);

  mongoose.Promise = global.Promise;
};

export default connectDB;
