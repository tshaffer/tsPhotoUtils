import dotenv from 'dotenv';
import { LegacyMediaItem, MediaItem } from 'entities';
import connectDB from './config/db';
import { addMediaItemToDb, getAllLegacyMediaItems } from './controllers/dbInterface';
import { GoogleMediaItem, IdToGoogleMediaItems, IdToMatchedGoogleMediaItem, MatchedGoogleMediaItem } from './types';
import { closeStream, getJsonFromFile, openWriteStream, writeToWriteStream } from './utils';

import {
  Tags
} from 'exiftool-vendored';
import { getExifData } from './controllers';
import { isNil } from 'lodash';

interface FilePathToExifTags {
  [key: string]: Tags;
}

let filePathsToExifTags: FilePathToExifTags = {};

const writeFilePathsToExifTags = async () => {
  const filePathsToExifTagsStream: any = openWriteStream('/Users/tedshaffer/Documents/Projects/tsPhotoUtils/data/filePathsToExifTags.json');
  const filePathsToExifTagsAsStr = JSON.stringify(filePathsToExifTags);
  writeToWriteStream(filePathsToExifTagsStream, filePathsToExifTagsAsStr);
  closeStream(filePathsToExifTagsStream);
}

const retrieveExifData = async (filePath: string): Promise<Tags> => {
  let exifData: Tags;
  if (filePathsToExifTags.hasOwnProperty(filePath)) {
    exifData = filePathsToExifTags[filePath];
  } else {
    exifData = await getExifData(filePath);
    filePathsToExifTags[filePath] = exifData;
  }
  return exifData;
}

async function main() {

  console.log('main invoked');

  dotenv.config({ path: './/src/config/config.env' });

  // connect to db
  await connectDB();

  const legacyMediaItems: LegacyMediaItem[] = await getAllLegacyMediaItems();
  const matchedGoogleMediaItems: IdToMatchedGoogleMediaItem = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/tsPhotoUtils/data/matchedGoogleMediaItems.json');
  // const filePathsToExifTags: FilePathToExifTags = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/filePathsToExifTags.json');

  // populate new db
  // iterate through the items in the legacy db
  for (const legacyMediaItem of legacyMediaItems) {

    const mediaItem: MediaItem = {
      googleId: legacyMediaItem.id,
      fileName: legacyMediaItem.fileName,
      filePath: legacyMediaItem.filePath,
      googleUrl: legacyMediaItem.productUrl,
      mimeType: legacyMediaItem.mimeType,
      creationTime: legacyMediaItem.creationTime,
      width: legacyMediaItem.width,
      height: legacyMediaItem.height,
      description: '',              
    };

    // get googleId corresponding to the media item from the db
    const googleId = legacyMediaItem.id;
    
    // is there a match with a takeout file?
    if (matchedGoogleMediaItems.hasOwnProperty(googleId)) {
      
      // matched takeout file
      const googleMediaItem: MatchedGoogleMediaItem = matchedGoogleMediaItems[googleId];
      const { takeoutFilePath } = googleMediaItem;
      
      let gpsPosition = null;

      // get tags for takeout file
      const tags: Tags = await retrieveExifData(takeoutFilePath);
      if (!isNil(tags.GPSPosition)) {
        mediaItem.gpsPosition = tags.GPSPosition;
      } else if (!isNil(tags.GPSAltitude) && (!isNil(tags.GPSLongitude))) {
        debugger;
      }
    }

    await addMediaItemToDb(mediaItem)
  }

  await writeFilePathsToExifTags();

  // const googleMediaItemsById: IdToGoogleMediaItems = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/googleMediaItemsById.json');

  // getMediaItemByName('flibbet');

  // for (const legacyMediaItem of legacyMediaItems) {
  //   addMediaItemToDb(legacyMediaItem);
  // }

  // let missingCount = 0;
  // for (const legacyMediaItem of legacyMediaItems) {
  //   const googleId = legacyMediaItem.id;
  //   if (!googleMediaItemsById.hasOwnProperty(googleId)) {
  //     missingCount++;
  //   }
  // }

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
  // console.log('googleMediaItemsById: ', Object.keys(googleMediaItemsById).length);
  // // console.log('dupCount: ', dupCount);
  // console.log('missingCount: ', missingCount);
}

main();

