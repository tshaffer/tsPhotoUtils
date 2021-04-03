import dotenv from 'dotenv';
import { LegacyMediaItem } from 'entities';
import connectDB from './config/db';
import { addMediaItemToDb, getAllLegacyMediaItems } from './controllers/dbInterface';
import { getJsonFromFile } from './utils';

export interface GoogleMediaMetadata {
  creationTime: Date; // or string?
  height: string;
  width: string;
  photo: GooglePhoto;
}

export interface GooglePhoto {
  apertureFNumber: number;
  cameraMake: string;
  cameraModel: string;
  focalLength: number;
  isoEquivalent: number;
}

export interface GoogleMediaItem {
  id: string;
  filename: string;
  mimeType: string;
  baseUrl: string;
  productUrl: string;
  mediaMetadata: GoogleMediaMetadata;
}

type IdToGoogleMediaItems = {
  [key: string]: GoogleMediaItem[]
}

async function main() {

  console.log('main invoked');

  dotenv.config({ path: './/src/config/config.env' });

  // connect to db
  await connectDB();

  // getMediaItemByName('flibbet');
  const legacyMediaItems: LegacyMediaItem[] = await getAllLegacyMediaItems();

  // for (const legacyMediaItem of legacyMediaItems) {
  //   addMediaItemToDb(legacyMediaItem);
  // }

  const googleMediaItemsById: IdToGoogleMediaItems = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/googleMediaItemsById.json');

  console.log('legacyMediaItems: ', legacyMediaItems.length);
  console.log('googleMediaItemsById: ', Object.keys(googleMediaItemsById).length);
  
}

main();

