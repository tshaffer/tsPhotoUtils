import dotenv from 'dotenv';
import { LegacyMediaItem } from 'entities';
import connectDB from './config/db';
import { addMediaItemToDb, getAllLegacyMediaItems } from './controllers/dbInterface';
import { GoogleMediaItem, IdToGoogleMediaItems } from './types';
import { getJsonFromFile } from './utils';

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

  let missingCount = 0;
  for (const legacyMediaItem of legacyMediaItems) {
    const googleId = legacyMediaItem.id;
    if (!googleMediaItemsById.hasOwnProperty(googleId)) {
      missingCount++;
    }
  }
  // let dupCount = 0;
  // for (const key in googleMediaItemsById) {
  //   if (Object.prototype.hasOwnProperty.call(googleMediaItemsById, key)) {
  //     const googleMediaItems: GoogleMediaItem[] = googleMediaItemsById[key];
  //     if (googleMediaItems.length > 1) {
  //       dupCount++;
  //     }
  //   }
  // }

  // console.log('legacyMediaItems: ', legacyMediaItems.length);
  console.log('googleMediaItemsById: ', Object.keys(googleMediaItemsById).length);
  // console.log('dupCount: ', dupCount);
  console.log('missingCount: ', missingCount);
}

main();

