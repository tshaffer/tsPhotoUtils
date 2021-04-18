import path from 'path';
import { isNil, isNumber, isObject, isString } from 'lodash';
import isomorphicPath from 'isomorphic-path';
import { 
  GoogleMediaItem, 
  GoogleMediaMetadata, 
  IdToGoogleMediaItemArray, 
  IdToGoogleMediaItems, 
  IdToMatchedMediaItem, 
  IdToMediaItem, 
  IdToStringArray, 
  LegacyMediaItem, 
  MatchFileNameResults, 
  MatchToDateTimeResults, 
  MediaItem
 } from '../types';
import { getJsonFromFile, retrieveExifData, roundToNearestTenth } from '../utils';
import { tsPhotoUtilsConfiguration } from '../config';
import { Tags } from 'exiftool-vendored';
import connectDB from '../config/db';
import { getAllLegacyMediaItems } from '../controllers';
import { getAddedGoogleMediaItems } from './googleJobs';

interface TakeoutFilesByTimeOfDay {
  dt: number;
  takeoutFilePaths: string[];
}

type IdToTakeoutFilesByTimeOfDay = {
  [key: string]: TakeoutFilesByTimeOfDay;
}

interface FirstPassResults {
  matchedGoogleMediaItems: IdToMatchedMediaItem;
  unmatchedGoogleMediaItems: IdToGoogleMediaItems;
  googleMediaItemsToMultipleTakeoutFiles: IdToStringArray;
}
interface SecondPassResults {
  unmatchedGoogleMediaItems: GoogleMediaItem[];
}
interface ThirdPassResults {
  remainingUnmatchedMediaItemsNoFileNameMatches: MediaItem[];
  remainingUnmatchedMediaItemsMultipleFileNameMatches: MediaItem[];
}


export const migrateAndUpdate = async (): Promise<void> => {
  /*
      iterate through each item in existing db
        get google id
          does item exist in updated googleMediaItemsById?
          no, skip it
        copy unchanged properties from existing db
          id, baseUrl, fileName, filePath, productUrl, mimeType, creationTime, imageWidth, imageHeight
          ?? check to see if filePath is correct and clear if not?
        get associated takeout file to add new properties if possible
          gpsPosition
          orientation??
          description
  */

  // build list of existing media items to migrate
  let itemsToMigrate: IdToMediaItem = await getItemsToMigrate();

  // add new items from google
  itemsToMigrate = await mergeAddedGoogleMediaItems(itemsToMigrate);
  
  // match with takeoutFiles
  const matchedMediaItems: IdToMatchedMediaItem = await getMatchingTakeoutFiles(itemsToMigrate);
  console.log(matchedMediaItems);
  console.log('complete');
}

const mergeAddedGoogleMediaItems = async (itemsToMigrate: IdToMediaItem): Promise<IdToMediaItem> => {

  const addedGoogleMediaItems: GoogleMediaItem[] = await getAddedGoogleMediaItems();
  for (const googleMediaItem of addedGoogleMediaItems) {

    let creationTime: Date;
    let width: number;
    let height: number;
  
    const mediaMetadata: GoogleMediaMetadata = googleMediaItem.mediaMetadata;
    if (!isNil(mediaMetadata)) {
      creationTime = mediaMetadata.creationTime;
      try {
        width = parseInt(mediaMetadata.width, 10);
        height = parseInt(mediaMetadata.height, 10);  
      } catch (e: any) {
        console.log('parseInt failure');
      }
    }

    const mediaItem: MediaItem = {
      googleId: googleMediaItem.id,
      fileName: googleMediaItem.filename,
      filePath: null,  // null or empty or ??
      googleUrl: googleMediaItem.productUrl,
      mimeType: googleMediaItem.mimeType,
      creationTime,
      width,
      height,
      description: '',
    }

    if (itemsToMigrate.hasOwnProperty(googleMediaItem.id)) {
      debugger;
    }
    itemsToMigrate[googleMediaItem.id] = mediaItem;
  }

  return itemsToMigrate;
}

const getItemsToMigrate = async (): Promise<IdToMediaItem> => {

  const itemsToMigrate: IdToMediaItem = {};

  const googleMediaItemsById: IdToGoogleMediaItemArray = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.GOOGLE_MEDIA_ITEMS_BY_ID));

  await connectDB();
  const legacyMediaItems: LegacyMediaItem[] = await getAllLegacyMediaItems();

  for (const legacyMediaItem of legacyMediaItems) {
    if (googleMediaItemsById.hasOwnProperty(legacyMediaItem.id)) {

      // TEDTODO - validate that all properties in googleMediaItem match properties in legacyMediaItem
      const mediaItem: MediaItem = {
        googleId: legacyMediaItem.id,
        fileName: legacyMediaItem.fileName,
        filePath: legacyMediaItem.filePath,  // null or empty or ??
        googleUrl: legacyMediaItem.productUrl,
        mimeType: legacyMediaItem.mimeType,
        creationTime: legacyMediaItem.creationTime,
        width: legacyMediaItem.width,
        height: legacyMediaItem.height,
        description: '',
      }

      itemsToMigrate[mediaItem.googleId] = mediaItem;
    }
  }

  return itemsToMigrate;
}

const getMatchingTakeoutFiles = async (mediaItemsToMigrate: IdToMediaItem): Promise<IdToMatchedMediaItem> => {

  const takeoutFilesByFileName: IdToStringArray = await getJsonFromFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.TAKEOUT_FILES_BY_FILE_NAME));

  trimUnimportantMediaItems(mediaItemsToMigrate);

  const matchFileNameResults: MatchFileNameResults = await matchToFileNames(mediaItemsToMigrate, takeoutFilesByFileName);
  const { matchedMediaItems, unmatchedMediaItems, mediaItemsToMultipleTakeoutFiles } = matchFileNameResults;

  const matchToDateTimeResults: MatchToDateTimeResults = await matchToDateTime(matchedMediaItems, unmatchedMediaItems);
  const stillUnmatchedMediaItems = matchToDateTimeResults.unmatchedMediaItems;

  const thirdPassResults: ThirdPassResults = await matchPhotosToTakeoutPhotos_3(
    takeoutFilesByFileName, matchedMediaItems, stillUnmatchedMediaItems);
  const { remainingUnmatchedMediaItemsNoFileNameMatches, remainingUnmatchedMediaItemsMultipleFileNameMatches } = thirdPassResults;

  const mediaItemsWhereAtLeastOneTakeoutFileHasGps: IdToMediaItem = await matchPhotosToTakeoutPhotos_4(takeoutFilesByFileName, remainingUnmatchedMediaItemsMultipleFileNameMatches);

  await matchPhotosToTakeoutPhotos_5(takeoutFilesByFileName, matchedMediaItems, mediaItemsWhereAtLeastOneTakeoutFileHasGps);

  matchPhotosToTakeoutPhotos_6(takeoutFilesByFileName, matchedMediaItems, remainingUnmatchedMediaItemsNoFileNameMatches);

  return matchedMediaItems;
}

const matchToFileNames = async (
  mediaItemById: IdToMediaItem,
  takeoutFilesByFileName: IdToStringArray)
  : Promise<MatchFileNameResults> => {

  const matchedMediaItems: IdToMatchedMediaItem = {};
  const unmatchedMediaItems: IdToMediaItem = {};
  const mediaItemsToMultipleTakeoutFiles: IdToStringArray = {};

  let mediaItemsCount = 0;

  for (const key in mediaItemById) {
    if (Object.prototype.hasOwnProperty.call(mediaItemById, key)) {
      const mediaItem: MediaItem = mediaItemById[key];
      mediaItemsCount++;
      if (takeoutFilesByFileName.hasOwnProperty(mediaItem.fileName)) {
        const takeoutFilePaths: string[] = takeoutFilesByFileName[mediaItem.fileName];
        if (takeoutFilePaths.length === 1) {
          matchedMediaItems[mediaItem.googleId] = {
            takeoutFilePath: takeoutFilePaths[0],
            mediaItem
          };
        } else {
          mediaItemsToMultipleTakeoutFiles[mediaItem.googleId] = takeoutFilePaths;
          unmatchedMediaItems[mediaItem.googleId] = mediaItemById[mediaItem.googleId];
        }
      } else {
        unmatchedMediaItems[mediaItem.googleId] = mediaItemById[mediaItem.googleId];
      }
    }
  }
  console.log(mediaItemsCount + '\tNumber of mediaItems to match');

  const results: MatchFileNameResults = {
    matchedMediaItems,
    unmatchedMediaItems,
    mediaItemsToMultipleTakeoutFiles
  };
  return results;
}

const matchToDateTime = async (
  matchedMediaItems: IdToMatchedMediaItem,
  unmatchedMediaItems: IdToMediaItem): Promise<MatchToDateTimeResults> => {

  const takeoutFilesByCreateDate: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByCreateDate.json');
  const takeoutFilesByDateTimeOriginal: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByDateTimeOriginal.json');
  const takeoutFilesByModifyDate: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByModifyDate.json');

  const takeoutFilesByCreateDateTimeOfDay: IdToTakeoutFilesByTimeOfDay = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByCreateDateTimeOfDay.json');
  const takeoutFilesByDateTimeOriginalTimeOfDay: IdToTakeoutFilesByTimeOfDay = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByDateTimeOriginalTimeOfDay.json');
  const takeoutFilesByModifyDateTimeOfDay: IdToTakeoutFilesByTimeOfDay = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByModifyDateTimeOfDay.json');

  let matchedTakeoutFiles: string[] = [];
  const stillUnmatchedMediaItems: MediaItem[] = [];

  for (const key in unmatchedMediaItems) {
    if (Object.prototype.hasOwnProperty.call(unmatchedMediaItems, key)) {
      const unmatchedMediaItem: MediaItem = unmatchedMediaItems[key];
      matchedTakeoutFiles = getTakeoutFileWithMatchingNameAndDate(
        unmatchedMediaItem,
        [],
        takeoutFilesByCreateDate,
        takeoutFilesByDateTimeOriginal,
        takeoutFilesByModifyDate,
      );
      if (matchedTakeoutFiles.length === 0) {

        // there is no takeout file with a date/time match

        // see if there is a no time zone date/time match
        const matchedNoTimeZoneFiles = getTakeoutFilesWithMatchingNoTimeZoneDateTime(
          unmatchedMediaItem,
          takeoutFilesByCreateDateTimeOfDay,
          takeoutFilesByDateTimeOriginalTimeOfDay,
          takeoutFilesByModifyDateTimeOfDay,
        );

        if (matchedNoTimeZoneFiles.length > 0) {

          matchedMediaItems[unmatchedMediaItem.googleId] = {
            // pick the first one - need to ensure that this will always work
            takeoutFilePath: matchedNoTimeZoneFiles[0],
            mediaItem: unmatchedMediaItem
          };
        } else {
          stillUnmatchedMediaItems.push(unmatchedMediaItem);
        }

      } else if (matchedTakeoutFiles.length === 1) {

        // single date match between a previous unmatched item and a takeout item
        matchedMediaItems[unmatchedMediaItem.googleId] = {
          takeoutFilePath: matchedTakeoutFiles[0],
          mediaItem: unmatchedMediaItem
        };

      } else {

        // check the order of the next two tests...

        // see if there is a no time zone date/time match
        const matchedNoTimeZoneFiles = getTakeoutFilesWithMatchingNoTimeZoneDateTime(
          unmatchedMediaItem,
          takeoutFilesByCreateDateTimeOfDay,
          takeoutFilesByDateTimeOriginalTimeOfDay,
          takeoutFilesByModifyDateTimeOfDay,
        );
        if (matchedNoTimeZoneFiles.length > 0) {
          matchedMediaItems[unmatchedMediaItem.googleId] = {
            // pick the first one - need to ensure that this will always work
            takeoutFilePath: matchedNoTimeZoneFiles[0],
            mediaItem: unmatchedMediaItem
          };
        } else {

          // search for matching takeout item, based on exif tags
          const matchedTakeoutFile: string = await getTagsMatch(unmatchedMediaItem, matchedTakeoutFiles);
          if (matchedTakeoutFile !== '') {
            matchedMediaItems[unmatchedMediaItem.googleId] = {
              takeoutFilePath: matchedTakeoutFile,
              mediaItem: unmatchedMediaItem
            };
          } else {
            stillUnmatchedMediaItems.push(unmatchedMediaItem);
          }
        }
      }
    }
  }

  const results: MatchToDateTimeResults = {
    unmatchedMediaItems: stillUnmatchedMediaItems
  };
  return results;
}

const matchPhotosToTakeoutPhotos_3 = async (
  takeoutFilesByFileName: IdToStringArray,
  matchedMediaItems: IdToMatchedMediaItem,
  stillUnmatchedMediaItems: MediaItem[]): Promise<ThirdPassResults> => {

  const remainingUnmatchedMediaItems: MediaItem[] = [];
  const remainingUnmatchedMediaItemsMultipleFileNameMatches: MediaItem[] = [];
  const remainingUnmatchedMediaItemsNoFileNameMatches: MediaItem[] = [];

  for (const stillUnmatchedMediaItem of stillUnmatchedMediaItems) {
    const fileName = stillUnmatchedMediaItem.fileName;
    if (takeoutFilesByFileName.hasOwnProperty(fileName)) {
      const takeoutFilePaths: string[] = takeoutFilesByFileName[fileName];
      if (takeoutFilePaths.length > 1) {
        remainingUnmatchedMediaItems.push(stillUnmatchedMediaItem);
        remainingUnmatchedMediaItemsMultipleFileNameMatches.push(stillUnmatchedMediaItem);
      } else {
        debugger;
      }
    } else {
      const truncatedFileNameMatches: string[] = getTruncatedFileNameMatches(takeoutFilesByFileName, fileName);
      if (truncatedFileNameMatches.length > 0) {
        matchedMediaItems[stillUnmatchedMediaItem.googleId] = {
          takeoutFilePath: truncatedFileNameMatches[0],
          mediaItem: stillUnmatchedMediaItem
        };
      } else {
        remainingUnmatchedMediaItems.push(stillUnmatchedMediaItem);
        remainingUnmatchedMediaItemsNoFileNameMatches.push(stillUnmatchedMediaItem);
      }
    }
  }

  const results: ThirdPassResults = {
    remainingUnmatchedMediaItemsNoFileNameMatches,
    remainingUnmatchedMediaItemsMultipleFileNameMatches,
  };

  return results;
}

const matchPhotosToTakeoutPhotos_4 = async (
  takeoutFilesByFileName: IdToStringArray,
  remainingUnmatchedMediaItemsMultipleFileNameMatches: MediaItem[],
): Promise<IdToMediaItem> => {

  let filesWithGPSAndDateData = 0;
  let filesWithGPSButNoDateCount = 0;
  const mediaItemsWithGPSButNoDateFile: MediaItem[] = [];
  const filesWithGPSButNoDate: string[] = [];
  const mediaItemsWithOnlyOneThatHasNoDateTime: MediaItem[] = [];
  const filesThatAreOnlyOneWithNoDateTime: string[] = [];
  const filesWithNoDateTimeHaveGPS: boolean[] = [];
  let filesWithNoDateTimeHaveGPSCount = 0;
  let fileWithNoDateTime;

  let filesWithNoDateTimeCount = 0;
  let filesWithMultipleDateTimeCount = 0;
  let filesWithZeroDateTimeCount = 0;

  let atLeastOneTakeoutFileHasGpsForMediaItemCount = 0;
  const mediaItemsWhereAtLeastOneTakeoutFileHasGps: IdToMediaItem = {};

  for (const mediaItem of remainingUnmatchedMediaItemsMultipleFileNameMatches) {
    const takeoutFilesWithSameFileName: string[] = takeoutFilesByFileName[mediaItem.fileName];
    let filesWithNoDateTime = 0;
    let fileWithNoDateTimeHasGPS = false;
    let oneOfTakeoutFilesHasGps = false;
    for (const takeoutFilePath of takeoutFilesWithSameFileName) {
      const exifData: Tags = await retrieveExifData(takeoutFilePath);
      if (!isNil(exifData.GPSLatitude)) {
        oneOfTakeoutFilesHasGps = true;
      }
      if (isNil(exifData.CreateDate) && isNil(exifData.DateTimeOriginal) && isNil(exifData.ModifyDate)) {
        filesWithNoDateTime++;
        fileWithNoDateTimeHasGPS = !isNil(exifData.GPSLatitude);
        fileWithNoDateTime = takeoutFilePath;
        if (!isNil(exifData.GPSLatitude)) {
          mediaItemsWithGPSButNoDateFile.push(mediaItem);
          filesWithGPSButNoDate.push(takeoutFilePath);
          filesWithGPSButNoDateCount++;
        }
      } else if (!isNil(exifData.GPSLatitude)) {
        filesWithGPSAndDateData++;
      }
    }
    if (filesWithNoDateTime === 1) {
      mediaItemsWithOnlyOneThatHasNoDateTime.push(mediaItem);
      filesThatAreOnlyOneWithNoDateTime.push(fileWithNoDateTime);
      filesWithNoDateTimeHaveGPS.push(fileWithNoDateTimeHasGPS);
      if (fileWithNoDateTimeHasGPS) {
        filesWithNoDateTimeHaveGPSCount++;
      }
      filesWithNoDateTimeCount++;
    } else if (filesWithNoDateTime === 0) {
      filesWithZeroDateTimeCount++;
    } else {
      filesWithMultipleDateTimeCount++;
    }

    if (oneOfTakeoutFilesHasGps) {
      atLeastOneTakeoutFileHasGpsForMediaItemCount++;
      mediaItemsWhereAtLeastOneTakeoutFileHasGps[mediaItem.googleId] = mediaItem;
    }
  }

  return mediaItemsWhereAtLeastOneTakeoutFileHasGps;
}

const matchPhotosToTakeoutPhotos_5 = async (
  takeoutFilesByFileName: IdToStringArray,
  matchedMediaItems: IdToMatchedMediaItem,
  mediaItemsWhereAtLeastOneTakeoutFileHasGps: IdToMediaItem,
): Promise<void> => {

  for (const key in mediaItemsWhereAtLeastOneTakeoutFileHasGps) {
    if (Object.prototype.hasOwnProperty.call(mediaItemsWhereAtLeastOneTakeoutFileHasGps, key)) {
      const mediaItem: MediaItem = mediaItemsWhereAtLeastOneTakeoutFileHasGps[key];
      if (takeoutFilesByFileName.hasOwnProperty(mediaItem.fileName)) {
        const takeoutFilePaths: string[] = takeoutFilesByFileName[mediaItem.fileName];
        for (const takeoutFilePath of takeoutFilePaths) {
          const exifData: Tags = await retrieveExifData(takeoutFilePath);
          if (!isNil(exifData.GPSLatitude)) {
            const hasDateTime: boolean = !isNil(exifData.CreateDate) || !isNil(exifData.DateTimeOriginal) || !isNil(exifData.ModifyDate);
            if (!hasDateTime) {
              matchedMediaItems[key] = {
                takeoutFilePath,
                mediaItem,
              };
            }
          }
        }
      }
      else {
        debugger;
      }
    }
  }
}

const matchPhotosToTakeoutPhotos_6 = (
  takeoutFilesByFileName: IdToStringArray,
  matchedMediaItems: IdToMatchedMediaItem,
  remainingUnmatchedMediaItemsNoFileNameMatches: MediaItem[],
) => {
  for (const mediaItem of remainingUnmatchedMediaItemsNoFileNameMatches) {
    const fileName = mediaItem.fileName;
    const fileExtension: string = path.extname(fileName);

    const filePathWithoutExtension = fileName.split('.').slice(0, -1).join('.');

    const filePathWithUpperCaseExtension = filePathWithoutExtension + fileExtension.toUpperCase();
    if (takeoutFilesByFileName.hasOwnProperty(filePathWithUpperCaseExtension)) {
      matchedMediaItems[mediaItem.googleId] = {
        takeoutFilePath: filePathWithUpperCaseExtension,
        mediaItem,
      };
    }

    const filePathWithLowerCaseExtension = filePathWithoutExtension + fileExtension.toLowerCase();
    if (takeoutFilesByFileName.hasOwnProperty(filePathWithLowerCaseExtension)) {
      matchedMediaItems[mediaItem.googleId] = {
        takeoutFilePath: filePathWithLowerCaseExtension,
        mediaItem,
      };
    }
  }
}



const trimUnimportantMediaItems = async (mediaItemsToMigrate: IdToMediaItem) => {

  const unusedExtension: string[] = ['.mov', '.mp4', '.bmp', '.mpg', '.nef'];

  for (const key in mediaItemsToMigrate) {
    if (Object.prototype.hasOwnProperty.call(mediaItemsToMigrate, key)) {
      const mediaItem: MediaItem = mediaItemsToMigrate[key];
      const fileName = mediaItem.fileName;
      if (unusedExtension.some(substring => fileName.includes(substring))) {
        delete mediaItemsToMigrate[key];
      } else if (fileName.includes('Scan')) {
        delete mediaItemsToMigrate[key];
      }
    }
  }
}



// const matchMediaItems = async (): Promise<void> => {

//   const googleMediaItemsById: IdToGoogleMediaItemArray = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.GOOGLE_MEDIA_ITEMS_BY_ID));

//   const takeoutFilesByFileName: IdToStringArray = await getJsonFromFile(
//     isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.TAKEOUT_FILES_BY_FILE_NAME));

//   // trimUnimportantMediaItems(googleMediaItemsById);

//   const firstPassResults: FirstPassResults = await matchGooglePhotosToTakeoutPhotos_1(googleMediaItemsById, takeoutFilesByFileName);
//   const { matchedGoogleMediaItems, unmatchedGoogleMediaItems, googleMediaItemsToMultipleTakeoutFiles } = firstPassResults;

//   const secondPassResults: SecondPassResults = await matchGooglePhotosToTakeoutPhotos_2(matchedGoogleMediaItems, unmatchedGoogleMediaItems);
//   const stillUnmatchedGoogleMediaItems = secondPassResults.unmatchedGoogleMediaItems;

//   const thirdPassResults: ThirdPassResults = await matchGooglePhotosToTakeoutPhotos_3(takeoutFilesByFileName, matchedGoogleMediaItems, stillUnmatchedGoogleMediaItems);

//   const googleMediaItemsWhereAtLeastOneTakeoutFileHasGps: IdToGoogleMediaItem = await matchGooglePhotosToTakeoutPhotos_4(takeoutFilesByFileName, thirdPassResults.remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches);

//   await matchGooglePhotosToTakeoutPhotos_5(takeoutFilesByFileName, matchedGoogleMediaItems, googleMediaItemsWhereAtLeastOneTakeoutFileHasGps);

//   matchGooglePhotosToTakeoutPhotos_6(takeoutFilesByFileName, matchedGoogleMediaItems, thirdPassResults.remainingUnmatchedGoogleMediaItemsNoFileNameMatches);

//   await matchUnmatchedFiles();

//   // await getExifDataByGoogleIdForGoogleMediaItemsWithMultipleFileNameMatchesAndGpsData();

// }

// const matchGooglePhotosToTakeoutPhotos_1 = async (
//   googleMediaItemsById: IdToGoogleMediaItems,
//   takeoutFilesByFileName: IdToStringArray)
//   : Promise<FirstPassResults> => {

//   const matchedGoogleMediaItems: IdToMatchedGoogleMediaItem = {};
//   const unmatchedGoogleMediaItems: IdToGoogleMediaItems = {};
//   const googleMediaItemsToMultipleTakeoutFiles: IdToStringArray = {};

//   for (const key in googleMediaItemsById) {
//     if (Object.prototype.hasOwnProperty.call(googleMediaItemsById, key)) {
//       const googleMediaItems: GoogleMediaItem[] = googleMediaItemsById[key];
//       for (const googleMediaItem of googleMediaItems) {
//         if (takeoutFilesByFileName.hasOwnProperty(googleMediaItem.filename)) {
//           const takeoutFilePaths: string[] = takeoutFilesByFileName[googleMediaItem.filename];
//           if (takeoutFilePaths.length === 1) {
//             matchedGoogleMediaItems[googleMediaItem.id] = {
//               takeoutFilePath: takeoutFilePaths[0],
//               googleMediaItem
//             };
//           } else {
//             googleMediaItemsToMultipleTakeoutFiles[googleMediaItem.id] = takeoutFilePaths;
//             unmatchedGoogleMediaItems[googleMediaItem.id] = googleMediaItemsById[googleMediaItem.id];
//           }
//         } else {
//           unmatchedGoogleMediaItems[googleMediaItem.id] = googleMediaItemsById[googleMediaItem.id];
//         }
//       }
//     }
//   }
//   const results: FirstPassResults = {
//     matchedGoogleMediaItems,
//     unmatchedGoogleMediaItems,
//     googleMediaItemsToMultipleTakeoutFiles
//   };
//   return results;
// }


// const matchGooglePhotosToTakeoutPhotos_2 = async (
//   matchedGoogleMediaItems: IdToMatchedGoogleMediaItem,
//   unmatchedGoogleMediaItems: IdToGoogleMediaItems): Promise<SecondPassResults> => {

//   const takeoutFilesByCreateDate: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByCreateDate.json');
//   const takeoutFilesByDateTimeOriginal: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByDateTimeOriginal.json');
//   const takeoutFilesByModifyDate: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByModifyDate.json');

//   const takeoutFilesByCreateDateTimeOfDay: IdToTakeoutFilesByTimeOfDay = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByCreateDateTimeOfDay.json');
//   const takeoutFilesByDateTimeOriginalTimeOfDay: IdToTakeoutFilesByTimeOfDay = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByDateTimeOriginalTimeOfDay.json');
//   const takeoutFilesByModifyDateTimeOfDay: IdToTakeoutFilesByTimeOfDay = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByModifyDateTimeOfDay.json');

//   let matchedTakeoutFiles: string[] = [];
//   const stillUnmatchedGoogleMediaItems: GoogleMediaItem[] = [];

//   for (const key in unmatchedGoogleMediaItems) {
//     if (Object.prototype.hasOwnProperty.call(unmatchedGoogleMediaItems, key)) {
//       const unmatchedGoogleMediaItemsList: GoogleMediaItem[] = unmatchedGoogleMediaItems[key];
//       for (const unmatchedGoogleMediaItem of unmatchedGoogleMediaItemsList) {
//         matchedTakeoutFiles = getTakeoutFileWithMatchingNameAndDate(
//           unmatchedGoogleMediaItem,
//           [],
//           takeoutFilesByCreateDate,
//           takeoutFilesByDateTimeOriginal,
//           takeoutFilesByModifyDate,
//         );
//         if (matchedTakeoutFiles.length === 0) {

//           // there is no takeout file with a date/time match

//           // see if there is a no time zone date/time match
//           const matchedNoTimeZoneFiles = getTakeoutFilesWithMatchingNoTimeZoneDateTime(
//             unmatchedGoogleMediaItem,
//             takeoutFilesByCreateDateTimeOfDay,
//             takeoutFilesByDateTimeOriginalTimeOfDay,
//             takeoutFilesByModifyDateTimeOfDay,
//           );

//           if (matchedNoTimeZoneFiles.length > 0) {

//             matchedGoogleMediaItems[unmatchedGoogleMediaItem.id] = {
//               // pick the first one - need to ensure that this will always work
//               takeoutFilePath: matchedNoTimeZoneFiles[0],
//               googleMediaItem: unmatchedGoogleMediaItem
//             };
//           } else {
//             stillUnmatchedGoogleMediaItems.push(unmatchedGoogleMediaItem);
//           }

//         } else if (matchedTakeoutFiles.length === 1) {

//           // single date match between a previous unmatched item and a takeout item
//           matchedGoogleMediaItems[unmatchedGoogleMediaItem.id] = {
//             takeoutFilePath: matchedTakeoutFiles[0],
//             googleMediaItem: unmatchedGoogleMediaItem
//           };

//         } else {

//           // check the order of the next two tests...

//           // see if there is a no time zone date/time match
//           const matchedNoTimeZoneFiles = getTakeoutFilesWithMatchingNoTimeZoneDateTime(
//             unmatchedGoogleMediaItem,
//             takeoutFilesByCreateDateTimeOfDay,
//             takeoutFilesByDateTimeOriginalTimeOfDay,
//             takeoutFilesByModifyDateTimeOfDay,
//           );
//           if (matchedNoTimeZoneFiles.length > 0) {
//             matchedGoogleMediaItems[unmatchedGoogleMediaItem.id] = {
//               // pick the first one - need to ensure that this will always work
//               takeoutFilePath: matchedNoTimeZoneFiles[0],
//               googleMediaItem: unmatchedGoogleMediaItem
//             };
//           } else {

//             // search for matching takeout item, based on exif tags
//             const matchedTakeoutFile: string = await getTagsMatch(unmatchedGoogleMediaItem, matchedTakeoutFiles);
//             if (matchedTakeoutFile !== '') {
//               matchedGoogleMediaItems[unmatchedGoogleMediaItem.id] = {
//                 takeoutFilePath: matchedTakeoutFile,
//                 googleMediaItem: unmatchedGoogleMediaItem
//               };
//             } else {
//               stillUnmatchedGoogleMediaItems.push(unmatchedGoogleMediaItem);
//             }
//           }
//         }
//       }
//     }
//   }

//   const results: SecondPassResults = {
//     unmatchedGoogleMediaItems: stillUnmatchedGoogleMediaItems
//   };
//   return results;
// }

// const matchGooglePhotosToTakeoutPhotos_3 = async (
//   takeoutFilesByFileName: IdToStringArray,
//   matchedGoogleMediaItems: IdToMatchedGoogleMediaItem,
//   stillUnmatchedGoogleMediaItems: GoogleMediaItem[]): Promise<ThirdPassResults> => {

//   const remainingUnmatchedGoogleMediaItems: GoogleMediaItem[] = [];
//   const remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches: GoogleMediaItem[] = [];
//   const remainingUnmatchedGoogleMediaItemsNoFileNameMatches: GoogleMediaItem[] = [];

//   for (const stillUnmatchedGoogleMediaItem of stillUnmatchedGoogleMediaItems) {
//     const fileName = stillUnmatchedGoogleMediaItem.filename;
//     if (takeoutFilesByFileName.hasOwnProperty(fileName)) {
//       const takeoutFilePaths: string[] = takeoutFilesByFileName[fileName];
//       if (takeoutFilePaths.length > 1) {
//         remainingUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
//         remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches.push(stillUnmatchedGoogleMediaItem);
//       } else {
//         debugger;
//       }
//     } else {
//       const truncatedFileNameMatches: string[] = getTruncatedFileNameMatches(takeoutFilesByFileName, fileName);
//       if (truncatedFileNameMatches.length > 0) {
//         matchedGoogleMediaItems[stillUnmatchedGoogleMediaItem.id] = {
//           takeoutFilePath: truncatedFileNameMatches[0],
//           googleMediaItem: stillUnmatchedGoogleMediaItem
//         };
//       } else {
//         remainingUnmatchedGoogleMediaItems.push(stillUnmatchedGoogleMediaItem);
//         remainingUnmatchedGoogleMediaItemsNoFileNameMatches.push(stillUnmatchedGoogleMediaItem);
//       }
//     }
//   }

//   const results: ThirdPassResults = {
//     remainingUnmatchedGoogleMediaItemsNoFileNameMatches,
//     remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches,
//   };

//   return results;
// }

// const matchGooglePhotosToTakeoutPhotos_4 = async (
//   takeoutFilesByFileName: IdToStringArray,
//   remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches: GoogleMediaItem[],
// ): Promise<IdToGoogleMediaItem> => {

//   let filesWithGPSAndDateData = 0;
//   let filesWithGPSButNoDateCount = 0;
//   const googleItemsWithGPSButNoDateFile: GoogleMediaItem[] = [];
//   const filesWithGPSButNoDate: string[] = [];
//   const googleItemsWithOnlyOneThatHasNoDateTime: GoogleMediaItem[] = [];
//   const filesThatAreOnlyOneWithNoDateTime: string[] = [];
//   const filesWithNoDateTimeHaveGPS: boolean[] = [];
//   let filesWithNoDateTimeHaveGPSCount = 0;
//   let fileWithNoDateTime;

//   let filesWithNoDateTimeCount = 0;
//   let filesWithMultipleDateTimeCount = 0;
//   let filesWithZeroDateTimeCount = 0;

//   let atLeastOneTakeoutFileHasGpsForGoogleMediaItemCount = 0;
//   const googleMediaItemsWhereAtLeastOneTakeoutFileHasGps: IdToGoogleMediaItem = {};

//   for (const googleMediaItem of remainingUnmatchedGoogleMediaItemsMultipleFileNameMatches) {
//     const takeoutFilesWithSameFileName: string[] = takeoutFilesByFileName[googleMediaItem.filename];
//     let filesWithNoDateTime = 0;
//     let fileWithNoDateTimeHasGPS = false;
//     let oneOfTakeoutFilesHasGps = false;
//     for (const takeoutFilePath of takeoutFilesWithSameFileName) {
//       const exifData: Tags = await retrieveExifData(takeoutFilePath);
//       if (!isNil(exifData.GPSLatitude)) {
//         oneOfTakeoutFilesHasGps = true;
//       }
//       if (isNil(exifData.CreateDate) && isNil(exifData.DateTimeOriginal) && isNil(exifData.ModifyDate)) {
//         filesWithNoDateTime++;
//         fileWithNoDateTimeHasGPS = !isNil(exifData.GPSLatitude);
//         fileWithNoDateTime = takeoutFilePath;
//         if (!isNil(exifData.GPSLatitude)) {
//           googleItemsWithGPSButNoDateFile.push(googleMediaItem);
//           filesWithGPSButNoDate.push(takeoutFilePath);
//           filesWithGPSButNoDateCount++;
//         }
//       } else if (!isNil(exifData.GPSLatitude)) {
//         filesWithGPSAndDateData++;
//       }
//     }
//     if (filesWithNoDateTime === 1) {
//       googleItemsWithOnlyOneThatHasNoDateTime.push(googleMediaItem);
//       filesThatAreOnlyOneWithNoDateTime.push(fileWithNoDateTime);
//       filesWithNoDateTimeHaveGPS.push(fileWithNoDateTimeHasGPS);
//       if (fileWithNoDateTimeHasGPS) {
//         filesWithNoDateTimeHaveGPSCount++;
//       }
//       filesWithNoDateTimeCount++;
//     } else if (filesWithNoDateTime === 0) {
//       filesWithZeroDateTimeCount++;
//     } else {
//       filesWithMultipleDateTimeCount++;
//     }

//     if (oneOfTakeoutFilesHasGps) {
//       atLeastOneTakeoutFileHasGpsForGoogleMediaItemCount++;
//       googleMediaItemsWhereAtLeastOneTakeoutFileHasGps[googleMediaItem.id] = googleMediaItem;
//     }
//   }

//   return googleMediaItemsWhereAtLeastOneTakeoutFileHasGps;
// }

// const matchGooglePhotosToTakeoutPhotos_5 = async (
//   takeoutFilesByFileName: IdToStringArray,
//   matchedGoogleMediaItems: IdToMatchedGoogleMediaItem,
//   googleMediaItemsWhereAtLeastOneTakeoutFileHasGps: IdToGoogleMediaItem,
// ): Promise<void> => {

//   for (const key in googleMediaItemsWhereAtLeastOneTakeoutFileHasGps) {
//     if (Object.prototype.hasOwnProperty.call(googleMediaItemsWhereAtLeastOneTakeoutFileHasGps, key)) {
//       const googleMediaItem: GoogleMediaItem = googleMediaItemsWhereAtLeastOneTakeoutFileHasGps[key];
//       if (takeoutFilesByFileName.hasOwnProperty(googleMediaItem.filename)) {
//         const takeoutFilePaths: string[] = takeoutFilesByFileName[googleMediaItem.filename];
//         for (const takeoutFilePath of takeoutFilePaths) {
//           const exifData: Tags = await retrieveExifData(takeoutFilePath);
//           if (!isNil(exifData.GPSLatitude)) {
//             const hasDateTime: boolean = !isNil(exifData.CreateDate) || !isNil(exifData.DateTimeOriginal) || !isNil(exifData.ModifyDate);
//             if (!hasDateTime) {
//               matchedGoogleMediaItems[key] = {
//                 takeoutFilePath,
//                 googleMediaItem,
//               };
//             }
//           }
//         }
//       }
//       else {
//         debugger;
//       }
//     }
//   }
// }

// const matchGooglePhotosToTakeoutPhotos_6 = (
//   takeoutFilesByFileName: IdToStringArray,
//   matchedGoogleMediaItems: IdToMatchedGoogleMediaItem,
//   remainingUnmatchedGoogleMediaItemsNoFileNameMatches: any,
// ) => {
//   for (const googleMediaItem of remainingUnmatchedGoogleMediaItemsNoFileNameMatches) {
//     const fileName = googleMediaItem.filename;
//     const fileExtension: string = path.extname(fileName);

//     const filePathWithoutExtension = fileName.split('.').slice(0, -1).join('.');

//     const filePathWithUpperCaseExtension = filePathWithoutExtension + fileExtension.toUpperCase();
//     if (takeoutFilesByFileName.hasOwnProperty(filePathWithUpperCaseExtension)) {
//       matchedGoogleMediaItems[googleMediaItem.id] = {
//         takeoutFilePath: filePathWithUpperCaseExtension,
//         googleMediaItem,
//       };
//     }

//     const filePathWithLowerCaseExtension = filePathWithoutExtension + fileExtension.toLowerCase();
//     if (takeoutFilesByFileName.hasOwnProperty(filePathWithLowerCaseExtension)) {
//       matchedGoogleMediaItems[googleMediaItem.id] = {
//         takeoutFilePath: filePathWithLowerCaseExtension,
//         googleMediaItem,
//       };
//     }
//   }
// }

// const matchUnmatchedFiles = async () => {

//   const remainingUnmatchedGoogleMediaItemsNoFileNameMatchesAny: any = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/remainingUnmatchedGoogleMediaItemsNoFileNameMatches.json');
//   const remainingUnmatchedGoogleMediaItemsNoFileNameMatches: GoogleMediaItem[] = remainingUnmatchedGoogleMediaItemsNoFileNameMatchesAny.items;
//   const takeoutFilesByFileName: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByFileName.json');

//   for (const googleMediaItem of remainingUnmatchedGoogleMediaItemsNoFileNameMatches) {
//     const fileName = googleMediaItem.filename;
//     const fileExtension: string = path.extname(fileName);

//     const filePathWithoutExtension = fileName.split('.').slice(0, -1).join('.');

//     const filePathWithUpperCaseExtension = filePathWithoutExtension + fileExtension.toUpperCase();
//     if (takeoutFilesByFileName.hasOwnProperty(filePathWithUpperCaseExtension)) {
//       debugger;
//     }
//     const filePathWithLowerCaseExtension = filePathWithoutExtension + fileExtension.toLowerCase();
//     if (takeoutFilesByFileName.hasOwnProperty(filePathWithLowerCaseExtension)) {
//       debugger;
//     }
//   }

//   debugger;
// }

// const getExifDataByGoogleIdForGoogleMediaItemsWithMultipleFileNameMatchesAndGpsData = async () => {

//   const exifDataWithGPSByGoogleId: IdToExifData = {};
//   const hasDateTimeWithGPSByGoogleId: IdToBools = {};

//   const googleMediaItemsWhereAtLeastOneTakeoutFileHasGps: IdToGoogleMediaItem = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/googleMediaItemsWhereAtLeastOneTakeoutFileHasGps.json');
//   const takeoutFilesByFileName: IdToStringArray = await getJsonFromFile('/Users/tedshaffer/Documents/Projects/importFromTakeout/testResults/takeoutFilesByFileName.json');

//   for (const key in googleMediaItemsWhereAtLeastOneTakeoutFileHasGps) {
//     if (Object.prototype.hasOwnProperty.call(googleMediaItemsWhereAtLeastOneTakeoutFileHasGps, key)) {
//       const googleMediaItem: GoogleMediaItem = googleMediaItemsWhereAtLeastOneTakeoutFileHasGps[key];
//       if (takeoutFilesByFileName.hasOwnProperty(googleMediaItem.filename)) {
//         const takeoutFilePaths: string[] = takeoutFilesByFileName[googleMediaItem.filename];
//         for (const takeoutFilePath of takeoutFilePaths) {
//           const exifData: Tags = await getExifData(takeoutFilePath);
//           if (!isNil(exifData.GPSLatitude)) {
//             if (!exifDataWithGPSByGoogleId.hasOwnProperty(googleMediaItem.id)) {
//               exifDataWithGPSByGoogleId[googleMediaItem.id] = [];
//             }
//             exifDataWithGPSByGoogleId[googleMediaItem.id].push(exifData);

//             const hasDateTime: boolean = !isNil(exifData.CreateDate) || !isNil(exifData.DateTimeOriginal) || !isNil(exifData.ModifyDate);

//             if (!hasDateTimeWithGPSByGoogleId.hasOwnProperty(googleMediaItem.id)) {
//               hasDateTimeWithGPSByGoogleId[googleMediaItem.id] = [];
//             }
//             hasDateTimeWithGPSByGoogleId[googleMediaItem.id].push(hasDateTime);

//           }
//         }
//       }
//       else {
//         debugger;
//       }
//     }
//   }

//   console.log(exifDataWithGPSByGoogleId);

//   debugger;
// }


const getTakeoutFileWithMatchingNameAndDate = (
  mediaItem: MediaItem,
  takeoutFilePaths: string[],
  takeoutFilesByCreateDate: any,
  takeoutFilesByDateTimeOriginal: any,
  takeoutFilesByModifyDate: any,
): string[] => {

  let allMatchingDateTakeoutFiles: string[] = [];

  const creationTimeKey = Date.parse(mediaItem.creationTime as unknown as string).toString();

  let matchingDateTakeoutFiles: string[] = getTakeoutFilesMatchingGoogleDate(takeoutFilesByCreateDate, creationTimeKey, takeoutFilePaths);

  // TEDTODO - better way to make clone?
  allMatchingDateTakeoutFiles = matchingDateTakeoutFiles.concat([]);

  if (matchingDateTakeoutFiles.length !== 1) {
    if (matchingDateTakeoutFiles.length === 0) {
      matchingDateTakeoutFiles = getTakeoutFilesMatchingGoogleDate(takeoutFilesByDateTimeOriginal, creationTimeKey, takeoutFilePaths);
      allMatchingDateTakeoutFiles = addUniqueFiles(allMatchingDateTakeoutFiles, matchingDateTakeoutFiles);
      if (matchingDateTakeoutFiles.length !== 1) {
        if (matchingDateTakeoutFiles.length === 0) {
          matchingDateTakeoutFiles = getTakeoutFilesMatchingGoogleDate(takeoutFilesByModifyDate, creationTimeKey, takeoutFilePaths);
          allMatchingDateTakeoutFiles = addUniqueFiles(allMatchingDateTakeoutFiles, matchingDateTakeoutFiles);
        }
      }
    }
  }

  return allMatchingDateTakeoutFiles;
  // if (matchingDateTakeoutFiles.length === 1) {
  //   return matchingDateTakeoutFiles[0];
  // }

  // return '';
}

const getTakeoutFilesMatchingGoogleDate = (
  takeoutFilesByDate: IdToStringArray,
  dt: string,
  takeoutFilePaths: string[]): string[] => {

  if (takeoutFilesByDate.hasOwnProperty(dt)) {
    let takeoutFilesWithSameNameAndDate: string[] = [];
    const takeoutFilesWithSameDate: string[] = takeoutFilesByDate[dt];
    if (takeoutFilePaths.length > 0) {
      for (const matchingTakeoutFile of takeoutFilesWithSameDate) {
        if (takeoutFilePaths.indexOf(matchingTakeoutFile) >= 0) {
          takeoutFilesWithSameNameAndDate.push(matchingTakeoutFile);
        }
      }
    } else {
      takeoutFilesWithSameNameAndDate = takeoutFilesWithSameDate.map((takeoutFileWithSameDate: string) => {
        return takeoutFileWithSameDate;
      })
    }
    return takeoutFilesWithSameNameAndDate;
  }

  return [];
}

const addUniqueFiles = (existingFilePaths: string[], newFilePaths: string[]): string[] => {

  const uniqueFilesMap: any = {};

  for (const existingFilePath of existingFilePaths) {
    if (!uniqueFilesMap.hasOwnProperty(existingFilePath)) {
      uniqueFilesMap[existingFilePath] = true;
    }
  }
  for (const newFilePath of newFilePaths) {
    if (!uniqueFilesMap.hasOwnProperty(newFilePath)) {
      uniqueFilesMap[newFilePath] = true;
    }
  }

  const uniqueFilePaths: string[] = [];
  for (const uniqueFilePath in uniqueFilesMap) {
    if (Object.prototype.hasOwnProperty.call(uniqueFilesMap, uniqueFilePath)) {
      uniqueFilePaths.push(uniqueFilePath);
    }
  }
  return uniqueFilePaths;
}

const getTakeoutFilesWithMatchingNoTimeZoneDateTime = (
  mediaItem: MediaItem,
  takeoutFilesByCreateDate: IdToTakeoutFilesByTimeOfDay,
  // TEDTODO - unused?
  takeoutFilesByDateTimeOriginal: IdToTakeoutFilesByTimeOfDay,
  takeoutFilesByModifyDate: IdToTakeoutFilesByTimeOfDay,
): string[] => {

  const googleDtNumber = Date.parse(mediaItem.creationTime as unknown as string);
  const googleDt: Date = new Date(googleDtNumber);
  googleDt.setDate(0);
  googleDt.setHours(0);

  const dtKey = Date.parse((new Date(googleDt)).toString());

  let takeoutFilesWithSameNameAndDate: string[] = [];

  if (takeoutFilesByCreateDate.hasOwnProperty(dtKey)) {

    const timeDelta = Math.abs(googleDtNumber - takeoutFilesByCreateDate[dtKey].dt);

    const takeoutFilesWithSameNoTimeZoneDate: string[] = takeoutFilesByCreateDate[dtKey].takeoutFilePaths;
    takeoutFilesWithSameNameAndDate = takeoutFilesWithSameNoTimeZoneDate.map((takeoutFileWithSameDate: string) => {
      return takeoutFileWithSameDate;
    })
  }

  return takeoutFilesWithSameNameAndDate;
}


const getTagsMatch = async (mediaItem: MediaItem, takeoutFiles: string[]): Promise<string> => {

  for (const takeoutFile of takeoutFiles) {
    const exifData: Tags = retrieveExifData(takeoutFile) as Tags;
    if (matchTags(mediaItem, exifData)) {
      return takeoutFile;
    }
  }

  return '';
}

const matchTags = (mediaItem: MediaItem, exifData: Tags): boolean => {

  if (isString(mediaItem.mimeType) && mediaItem.mimeType !== '') {
    if (isString(exifData.MIMEType)) {
      if (exifData.MIMEType.toLowerCase() !== mediaItem.mimeType.toLowerCase()) {
        return false;
      }
    }
  }

  if (isString(mediaItem.width) && isString(mediaItem.height)) {
    if (isNumber(exifData.ImageWidth) && isNumber(exifData.ImageHeight)) {
      if (Number(mediaItem.width) !== exifData.ImageWidth || Number(mediaItem.width) !== exifData.ImageWidth) {
        return false;
      }
    }
  }

  // TEDTODO
  // if (isObject(mediaMetadata.photo)) {

  //   const photoMetadata: GooglePhoto = mediaMetadata.photo;

  //   if (isNumber(photoMetadata.apertureFNumber)) {
  //     if (isNumber(exifData.Aperture) && roundToNearestTenth(exifData.Aperture) !== roundToNearestTenth(photoMetadata.apertureFNumber)) {
  //       return false;
  //     }
  //   }

  //   if (isString(photoMetadata.cameraMake)) {
  //     if (isString(exifData.Make) && exifData.Make !== photoMetadata.cameraMake) {
  //       return false;
  //     }
  //   }

  //   if (isString(photoMetadata.cameraModel)) {
  //     if (isString(exifData.Model) && exifData.Model !== photoMetadata.cameraModel) {
  //       return false;
  //     }
  //   }

  //   // if (isNumber(photoMetadata.focalLength)) {
  //   //   // exifData rounds it off
  //   // }

  //   if (isNumber(photoMetadata.isoEquivalent)) {
  //     if (isNumber(exifData.ISO) && exifData.ISO !== photoMetadata.isoEquivalent) {
  //       return false;
  //     }
  //   }
  // }

  return true;
}


const getTruncatedFileNameMatches = (filesByFileName: any, fileName: string): string[] => {
  const fileExtension: string = path.extname(fileName);
  let fileNameLength = fileName.length;
  while (fileNameLength > (1 + fileExtension.length)) {
    const truncatedFileName = fileName.substring(0, fileNameLength - fileExtension.length) + fileExtension;
    if (filesByFileName.hasOwnProperty(truncatedFileName)) {
      return filesByFileName[truncatedFileName];
    }
    fileNameLength--;
  }

  return [];
}

