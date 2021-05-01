import * as fs from 'fs-extra';
import { MediaItem } from 'entities';
import connectDB from './config/db';
import { getAllMediaItems } from './controllers/dbInterface';
import { Jobs } from './types';

import { isNil } from 'lodash';
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
  downloadGooglePhotos,
} from './jobs';
import { readConfig } from './config';
import { checkMetadataInNewFiles } from './jobs/stats';

readConfig('/Users/tedshaffer/Documents/Projects/tsPhotoUtils/src/config/config.env');

const optionDefinitions = [
  { name: 'job', alias: 'j', type: String },
]
const commandLineArgs = require('command-line-args')
const options = commandLineArgs(optionDefinitions)
console.log(options);

const getMediaItemsOnLocalStorage = async () => {

  await connectDB();

  let filePathSpecifiedCount = 0;
  let fileExistsCount = 0;

  const mediaItems: MediaItem[] = await getAllMediaItems();
  for (const mediaItem of mediaItems) {
    const filePath = mediaItem.filePath;
    if (!isNil(filePath)) {
      if (filePath.length > 0) {
        filePathSpecifiedCount++;
        if (fs.existsSync(filePath)) {
          fileExistsCount++;
        }
      }
    }
  }

  console.log('Number of filePaths specified');
  console.log(filePathSpecifiedCount);
  console.log('Number of files that exist');
  console.log(fileExistsCount);
}

async function main() {

  console.log('main invoked');

  console.log(options);

  switch (options.job) {
    case Jobs.DownloadGooglePhotos:
      console.log('DownloadGooglePhotos');
      await downloadGooglePhotos();
      break;
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
    case Jobs.GetMediaItemsOnLocalStorage:
      console.log('GetMediaItemsOnLocalStorage');
      await getMediaItemsOnLocalStorage();
      break;
    case Jobs.GetGpsDataFromTakeoutFiles:
      console.log('invoke GetGpsDataFromTakeoutFiles');
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
}

main();

