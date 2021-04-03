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

const readFilePathsToExifTags = async () => {
  filePathsToExifTags = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/tsPhotoUtils/data/filePathsToExifTags.json');
}

const writeFilePathsToExifTags = async (filePath: string) => {
  const filePathsToExifTagsStream: any = openWriteStream(filePath);
  const filePathsToExifTagsAsStr = JSON.stringify(filePathsToExifTags);
  await writeToWriteStream(filePathsToExifTagsStream, filePathsToExifTagsAsStr);
  await closeStream(filePathsToExifTagsStream);
}

const retrieveExifData = async (filePath: string): Promise<Tags> => {
  let exifData: Tags;
  if (filePathsToExifTags.hasOwnProperty(filePath)) {
    exifData = filePathsToExifTags[filePath];
  } else {
    exifData = await getExifData(filePath);
    filePathsToExifTags[filePath] = exifData;
    // writeFilePathsToExifTags('/Users/tedshaffer/Documents/Projects/tsPhotoUtils/data/filePathsToExifTagsNew.json')
  }
  return exifData;
}

const newDbFromOldDbAndTakeout = async (): Promise<any> => {
  
  // connect to db
  await connectDB();

  // load existing exif tags
  readFilePathsToExifTags();

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

  console.log('all done');
  // await writeFilePathsToExifTags('/Users/tedshaffer/Documents/Projects/tsPhotoUtils/data/filePathsToExifTags.json');

}

async function main() {

  console.log('main invoked');

  dotenv.config({ path: './/src/config/config.env' });

  await newDbFromOldDbAndTakeout();

  // const matchedGoogleMediaItems: any = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/tsPhotoUtils/data/matchedGoogleMediaItems.json');
  // console.log(Object.keys(matchedGoogleMediaItems).length);
}

main();

