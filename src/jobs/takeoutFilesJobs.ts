import { isNil, isNumber, isString } from 'lodash';
import path from 'path';
import isomorphicPath from 'isomorphic-path';
import {
  Tags
} from 'exiftool-vendored';

import { getExifData } from '../controllers';
import { getDateTimeSinceZero, getImageFilePaths, getJsonFilePaths, getJsonFromFile, writeJsonToFile } from '../utils';
import { IdToString, IdToStringArray } from '../types';
import { tsPhotoUtilsConfiguration } from '../config';

interface FilePathToExifTags {
  [key: string]: Tags;
}
let filePathsToExifTags: FilePathToExifTags = {};

export const compareGPSTags = async () => {

  let bothHaveGpsCount = 0;
  let takeoutHasGpsCount = 0;
  let metadataHasGpsCount = 0;
  let neitherHaveGpsCount = 0;

  const filePathsToExifTags: FilePathToExifTags = await getJsonFromFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.FILE_PATHS_TO_EXIF_TAGS));
  const metadataFilePathByTakeoutFilePath: IdToString = await getJsonFromFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.METADATA_FILE_PATH_BY_TAKEOUT_FILE_PATH));

  for (const filePath in filePathsToExifTags) {
    if (Object.prototype.hasOwnProperty.call(filePathsToExifTags, filePath)) {
      if (metadataFilePathByTakeoutFilePath.hasOwnProperty(filePath)) {
        const takeoutFileTags: Tags = filePathsToExifTags[filePath];
        const metadataFilePath: string = metadataFilePathByTakeoutFilePath[filePath];
        const metadata: any = await getJsonFromFile(metadataFilePath);

        // if (!isNil(metadata.geoData.latitude) && metadata.geoData.latitude === 0) {
        //   debugger;
        // }

        if (!isNil(takeoutFileTags.GPSLatitude)) {
          if (!isNil(metadata.geoData.latitude) && metadata.geoData.latitude !== 0) {
            bothHaveGpsCount++;
          } else {
            takeoutHasGpsCount++;
          }
        } else {
          if (isNil(metadata.geoData.latitude) || metadata.geoData.latitude === 0) {
            neitherHaveGpsCount++;
          } else {
            metadataHasGpsCount++;
          }
        }
      }
    }
  }

  console.log('bothHaveGpsCount', bothHaveGpsCount);
  console.log('takeoutHasGpsCount', takeoutHasGpsCount);
  console.log('metadataHasGpsCount', metadataHasGpsCount);
  console.log('neitherHaveGpsCount', neitherHaveGpsCount);
}

export const buildMetadataFileMap = async () => {

  const metadataFilePathByTakeoutFilePath: IdToString = {};

  let foundMatchingMetadataFiles = 0;
  let missingMatchingMetadataFiles = 0;

  const metadataFilePaths: string[] = await getJsonFilePaths(tsPhotoUtilsConfiguration.MEDIA_ITEMS_DIR);
  const metadataFilePathsByFilePath: any = {};
  for (const metadataFilePath of metadataFilePaths) {

    const indexOfGooglePhotos = metadataFilePath.lastIndexOf('Google Photos');
    const indexOfUniqueFilePath = indexOfGooglePhotos + 14;
    const uniqueFilePath = metadataFilePath.substring(indexOfUniqueFilePath);

    metadataFilePathsByFilePath[uniqueFilePath] = {
      uniqueFilePath,
      metadataFilePath,
    };
  }

  const takeoutFilesByFileName: IdToStringArray = await getJsonFromFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.TAKEOUT_FILES_BY_FILE_NAME));

  for (const key in takeoutFilesByFileName) {
    if (Object.prototype.hasOwnProperty.call(takeoutFilesByFileName, key)) {
      const takeoutFilePaths: string[] = takeoutFilesByFileName[key];
      for (const takeoutFilePath of takeoutFilePaths) {

        const indexOfGooglePhotos = takeoutFilePath.lastIndexOf('Google Photos');
        const indexOfUniqueFilePath = indexOfGooglePhotos + 14;
        const uniqueFilePath = takeoutFilePath.substring(indexOfUniqueFilePath);

        const takeoutMetadataFilePath = uniqueFilePath + '.json';
        if (metadataFilePathsByFilePath.hasOwnProperty(takeoutMetadataFilePath)) {
          foundMatchingMetadataFiles++;
          const element = metadataFilePathsByFilePath[takeoutMetadataFilePath];
          metadataFilePathByTakeoutFilePath[takeoutFilePath] = element.metadataFilePath;
        } else {
          missingMatchingMetadataFiles++;
        }
      }
    }
  }

  await writeJsonToFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.METADATA_FILE_PATH_BY_TAKEOUT_FILE_PATH),
    metadataFilePathByTakeoutFilePath);
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

export const buildTakeoutFileMaps = async () => {

  const takeoutFilesByFileName: IdToStringArray = {};
  const takeoutFilesByCreateDate: IdToStringArray = {};
  const takeoutFilesByDateTimeOriginal: IdToStringArray = {};
  const takeoutFilesByModifyDate: IdToStringArray = {};
  const takeoutFilesByImageDimensions: IdToStringArray = {};

  const filePaths: string[] = getImageFilePaths(tsPhotoUtilsConfiguration.MEDIA_ITEMS_DIR);

  let fileCount = 0;

  for (let filePath of filePaths) {

    const exifData: Tags = await retrieveExifData(filePath);

    addTakeoutFileByFileName(takeoutFilesByFileName, filePath, exifData.FileName);
    addTakeoutFileByDate(takeoutFilesByCreateDate, filePath, exifData.CreateDate);
    addTakeoutFileByDate(takeoutFilesByDateTimeOriginal, filePath, exifData.DateTimeOriginal);
    addTakeoutFileByDate(takeoutFilesByModifyDate, filePath, exifData.ModifyDate);
    addTakeoutFileByImageDimensions(takeoutFilesByImageDimensions, filePath, exifData.ImageWidth, exifData.ImageHeight);

    /* 
      also could consider
        camera / photo specific exif data

      available in accompanying json file
        creationTime
        modificationTime
        photoTakenTime

    */
    fileCount++;

    if ((fileCount % 100) === 0) {
      console.log('fileCount = ', fileCount);
    }
  }

  await writeJsonToFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.TAKEOUT_FILES_BY_FILE_NAME),
    takeoutFilesByFileName);
  await writeJsonToFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.TAKEOUT_FILES_BY_CREATE_DATE),
    takeoutFilesByCreateDate);
  await writeJsonToFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.TAKEOUT_FILES_BY_DATE_TIME_ORIGINAL),
    takeoutFilesByDateTimeOriginal);
  await writeJsonToFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.TAKEOUT_FILES_BY_MODIFY_DATE),
    takeoutFilesByModifyDate);
  await writeJsonToFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.TAKEOUT_FILES_BY_IMAGE_DIMENSIONS),
    takeoutFilesByImageDimensions);
  await writeJsonToFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.FILE_PATHS_TO_EXIF_TAGS),
    filePathsToExifTags);
}

const addTakeoutFileByFileName = (takeoutFilesByFileName: IdToStringArray, filePath: string, fileName: string) => {
  if (isString(fileName)) {
    if (!takeoutFilesByFileName.hasOwnProperty(fileName)) {
      takeoutFilesByFileName[fileName] = [];
    }
    takeoutFilesByFileName[fileName].push(filePath);
  } else {
    debugger;
  }
}

const addTakeoutFileByDate = (takeoutFilesByDate: IdToStringArray, filePath: string, dt: any) => {
  const ts: number = getDateTimeSinceZero(dt);
  if (ts > 0) {
    const tsKey = ts.toString();
    if (!takeoutFilesByDate.hasOwnProperty(tsKey)) {
      takeoutFilesByDate[tsKey] = [];
    }
    takeoutFilesByDate[tsKey].push(filePath);
  }
}

const addTakeoutFileByImageDimensions = (takeoutFilesByDimensions: IdToStringArray, filePath: string, imageWidth: number, imageHeight: number) => {
  if (isNumber(imageWidth) && isNumber(imageHeight)) {
    const key: string = imageWidth.toString() + '-' + imageHeight.toString();
    if (!takeoutFilesByDimensions.hasOwnProperty(key)) {
      takeoutFilesByDimensions[key] = [];
    }
    takeoutFilesByDimensions[key].push(filePath);
  }
}

export const testJob0 = async () => {

  let foundMatchingMetadataFiles = 0;
  let missingMatchingMetadataFiles = 0;
  const duplicateFileNames: string[] = [];

  // const imageFilePaths: string[] = getImageFilePaths(tsPhotoUtilsConfiguration.MEDIA_ITEMS_DIR);

  const jsonFilePaths: string[] = await getJsonFilePaths(tsPhotoUtilsConfiguration.MEDIA_ITEMS_DIR);
  const jsonFilePathsByFileName: any = {};
  for (const jsonFilePath of jsonFilePaths) {
    const fileName = path.basename(jsonFilePath);
    // const jsonFileName = fileName + '.json';
    if (jsonFilePathsByFileName.hasOwnProperty(fileName)) {
      duplicateFileNames.push(fileName);
    } else {
      jsonFilePathsByFileName[fileName] = jsonFilePath;
    }
  }

  const takeoutFilesByFileName = await getJsonFromFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.TAKEOUT_FILES_BY_FILE_NAME));

  for (const takeoutFileName in takeoutFilesByFileName) {
    if (Object.prototype.hasOwnProperty.call(takeoutFilesByFileName, takeoutFileName)) {
      const takeoutMetadataFileName = takeoutFileName + '.json';
      if (jsonFilePathsByFileName.hasOwnProperty(takeoutMetadataFileName)) {
        foundMatchingMetadataFiles++;
      } else {
        missingMatchingMetadataFiles++;
      }
    }
  }

  console.log('foundMatchingMetadataFiles', foundMatchingMetadataFiles);
  console.log('missingMatchingMetadataFiles', missingMatchingMetadataFiles);
  console.log('duplicateFileNamesCount', duplicateFileNames.length);
  console.log('duplicateFileNames', duplicateFileNames);
}

