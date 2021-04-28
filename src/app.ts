import args from 'command-line-args';
import dotenv from 'dotenv';
import { LegacyMediaItem, MediaItem } from 'entities';
import connectDB from './config/db';
import { addMediaItemToDb, getAllLegacyMediaItems } from './controllers/dbInterface';
import { GoogleMediaItem, IdToAnyArray, IdToGoogleMediaItems, IdToMatchedGoogleMediaItem, Jobs, MatchedGoogleMediaItem } from './types';
import { closeStream, getJsonFromFile, openWriteStream, writeJsonToFile, writeToWriteStream } from './utils';

import * as nodeDir from 'node-dir';
import path from 'path';

import {
  Tags
} from 'exiftool-vendored';
import { getAllMediaItemsFromGoogle, getExifData } from './controllers';
import { isNil } from 'lodash';
import { AuthService } from './auth';
import { getAuthService } from './controllers/googlePhotosService';
import {
  buildGoogleMediaItemsById,
  getAddedGoogleMediaItems,
  getRemovedGoogleMediaItems,
  buildTakeoutFileMaps,
  buildMetadataFileMap,
  compareGPSTags,
  migrateAndUpdate,
  getAddedDbMediaItems,
  getRemovedDbMediaItems,
} from './jobs';
import { readConfig } from './config';
import { checkMetadataInNewFiles } from './jobs/stats';
// import commandLineArgs from 'command-line-args';

interface FilePathToExifTags {
  [key: string]: Tags;
}

readConfig('/Users/tedshaffer/Documents/Projects/tsPhotoUtils/src/config/config.env');

const optionDefinitions = [
  { name: 'job', alias: 'j', type: String },
]
const commandLineArgs = require('command-line-args')
const options = commandLineArgs(optionDefinitions)
console.log(options);

// const readFilePathsToExifTags = async () => {
//   filePathsToExifTags = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/tsPhotoUtils/data/filePathsToExifTags.json');
// }

// const writeFilePathsToExifTags = async (filePath: string) => {
//   const filePathsToExifTagsStream: any = openWriteStream(filePath);
//   const filePathsToExifTagsAsStr = JSON.stringify(filePathsToExifTags);
//   await writeToWriteStream(filePathsToExifTagsStream, filePathsToExifTagsAsStr);
//   await closeStream(filePathsToExifTagsStream);
// }

const newDbFromOldDbAndTakeout = async (): Promise<any> => {

  // connect to db
  await connectDB();

  // // load existing exif tags
  // readFilePathsToExifTags();

  // const legacyMediaItems: LegacyMediaItem[] = await getAllLegacyMediaItems();
  // const matchedGoogleMediaItems: IdToMatchedGoogleMediaItem = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/tsPhotoUtils/data/matchedGoogleMediaItems.json');
  // // const filePathsToExifTags: FilePathToExifTags = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/filePathsToExifTags.json');

  // // populate new db
  // // iterate through the items in the legacy db
  // for (const legacyMediaItem of legacyMediaItems) {

  //   const mediaItem: MediaItem = {
  //     googleId: legacyMediaItem.id,
  //     fileName: legacyMediaItem.fileName,
  //     filePath: legacyMediaItem.filePath,
  //     googleUrl: legacyMediaItem.productUrl,
  //     mimeType: legacyMediaItem.mimeType,
  //     creationTime: legacyMediaItem.creationTime,
  //     width: legacyMediaItem.width,
  //     height: legacyMediaItem.height,
  //     description: '',
  //   };

  //   // get googleId corresponding to the media item from the db
  //   const googleId = legacyMediaItem.id;

  //   // is there a match with a takeout file?
  //   if (matchedGoogleMediaItems.hasOwnProperty(googleId)) {

  //     // matched takeout file
  //     const googleMediaItem: MatchedGoogleMediaItem = matchedGoogleMediaItems[googleId];
  //     const { takeoutFilePath } = googleMediaItem;

  //     let gpsPosition = null;

  //     // get tags for takeout file
  //     const tags: Tags = await retrieveExifData(takeoutFilePath);
  //     if (!isNil(tags.GPSPosition)) {
  //       mediaItem.gpsPosition = tags.GPSPosition;
  //     } else if (!isNil(tags.GPSAltitude) && (!isNil(tags.GPSLongitude))) {
  //       debugger;
  //     }
  //   }

  //   await addMediaItemToDb(mediaItem)
  // }

  console.log('all done');
  // await writeFilePathsToExifTags('/Users/tedshaffer/Documents/Projects/tsPhotoUtils/data/filePathsToExifTags.json');

}

const findGPSInfoInTakeoutFiles = async () => {

  // const testPath = '/Volumes/SHAFFEROTO/takeout/unzipped/Takeout 1/Google Photos/Kathy New Zealand 2012/_DSC0477.JPG.json';
  // const jsonPhotoData = await getJsonFromFile(testPath);
  // debugger;

  let photoFileCount = 0;
  let jsonFileCount = 0;
  let filesWithGPS = 0;
  let filesWithoutGPS = 0;

  const rootDirPath = '/Volumes/SHAFFEROTO/takeout/unzipped';
  const files = nodeDir.files(rootDirPath, { sync: true });
  for (const file of files) {
    const extension: string = path.extname(file);
    if (extension.toLowerCase() === '.json') {
      jsonFileCount++;
      const jsonPhotoData = await getJsonFromFile(file);
      if (jsonPhotoData.hasOwnProperty('geoData') || jsonPhotoData.hasOwnProperty('geoDataExif')) {
        const geoData = jsonPhotoData['geoData'];
        const geoDataExif = jsonPhotoData['geoDataExif'];
        let isPhotoFile = false;
        if (!isNil(geoData)) {
          photoFileCount++;
          isPhotoFile = true
        } else if (!isNil(geoDataExif)) {
          photoFileCount++;
          isPhotoFile = true;
        }
        if (isPhotoFile) {
          if (!isNil(geoData) && !isNil(geoData.latitude) && geoData.latitude !== 0 && !isNil(geoData.longitude) && geoData.longitude !== 0) {
            filesWithGPS++;
          } else if (!isNil(geoDataExif) && !isNil(geoDataExif.latitude) && geoDataExif.latitude !== 0 && !isNil(geoDataExif.longitude) && geoDataExif.longitude !== 0) {
            filesWithGPS++;
          } else {
            filesWithoutGPS++;
          }
        }
      }
    }
  }

  console.log('jsonFileCount: ', jsonFileCount);
  console.log('photoMetadataFileCount: ', photoFileCount);
  console.log('filesWithGPS: ', filesWithGPS);
  console.log('filesWithoutGPS: ', filesWithoutGPS);
}

async function main() {

  console.log('main invoked');

  // dotenv.config({ path: './/src/config/config.env' });

  // argv is an array
  console.log(process.argv);

  console.log(options);

  switch (options.job) {
    case Jobs.BuildGoogleMediaItemsById:
      console.log('BuildGoogleMediaItemsById');
      await buildGoogleMediaItemsById();
      break;
    case Jobs.GetAddedDbMediaItems:
      console.log('GetAddedDbMediaItems');
      await getAddedDbMediaItems();
      break;
    case Jobs.GetRemovedDbMediaItems:
      console.log('GetRemovedDbMediaItems');
      await getRemovedDbMediaItems();
      break;
    case Jobs.GetAddedGoogleMediaItems:
      console.log('GetAddedGoogleMediaItems');
      await getAddedGoogleMediaItems();
      break;
    case Jobs.GetRemovedGoogleMediaItems:
      console.log('GetRemovedGoogleMediaItems');
      await getRemovedGoogleMediaItems();
      break;
    case Jobs.GetGpsDataFromTakeoutFiles:
      console.log('invoke GetGpsDataFromTakeoutFiles');
      break;
    case Jobs.Db:
      console.log('invoke newDbFromOldDbAndTakeout');
      newDbFromOldDbAndTakeout();
      break;
    case Jobs.BuildTakeoutFileMaps:
      console.log('BuildTakeoutFileMaps');
      await buildTakeoutFileMaps();
      break;
    case Jobs.BuildMetadataFileMap:
      console.log('TestJob');
      await buildMetadataFileMap();
      break;
    case Jobs.CompareGPSTags:
      console.log('CompareGPSTags');
      await compareGPSTags();
      break;
    case Jobs.CheckMetadataInNewFiles:
      console.log('CheckMetadataInNewFiles');
      await checkMetadataInNewFiles();
      break;
    case Jobs.MigrateAndUpdate:
      console.log('MigrateAndUpdate');
      await migrateAndUpdate();
      break;
    default:
      console.log(options.job + ' not supported.');
      break;
  }

  console.log('job complete');

  // const authService: AuthService = await getAuthService();
  // await getGooglePhotoInfo(authService);

  // await findGPSInfoInTakeoutFiles();

  // await newDbFromOldDbAndTakeout();

  // const matchedGoogleMediaItems: any = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/tsPhotoUtils/data/matchedGoogleMediaItems.json');
  // console.log(Object.keys(matchedGoogleMediaItems).length);
}

main();

