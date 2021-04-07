import mongoose from 'mongoose';

export let legacyConnection: mongoose.Connection;
export let connection: mongoose.Connection;

import { tsPhotoUtilsConfiguration } from './config';

async function connectDB() {
  console.log('legacy uri is:');
  console.log(tsPhotoUtilsConfiguration.mongoUriOld);
  legacyConnection = await mongoose.createConnection(tsPhotoUtilsConfiguration.mongoUriOld, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  }); 
  console.log(`MongoDB old db connected`);

  console.log('new uri is:');
  console.log(tsPhotoUtilsConfiguration.mongoUri);
  connection = await mongoose.createConnection(tsPhotoUtilsConfiguration.mongoUri, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  }); 
  console.log(`MongoDB new db connected`);

  mongoose.Promise = global.Promise;
};

export default connectDB;
