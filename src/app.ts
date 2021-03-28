import dotenv from 'dotenv';
import connectDB from './config/db';
import { getMediaItemByName } from './controllers/dbInterface';

async function main() {

  console.log('main invoked');

  dotenv.config({ path: './/src/config/config.env' });

  // connect to db
  await connectDB();

  getMediaItemByName('flibbet');
}

main();

