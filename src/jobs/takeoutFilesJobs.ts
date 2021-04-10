import { isNumber, isString } from 'lodash';
import path from 'path';
import isomorphicPath from 'isomorphic-path';
import {
  Tags
} from 'exiftool-vendored';

import { getExifData } from '../controllers';
import { getDateTimeSinceZero, getImageFilePaths, getJsonFilePaths, getJsonFromFile, writeJsonToFile } from '../utils';
import { IdToStringArray } from '../types';
import { tsPhotoUtilsConfiguration } from '../config';

export const buildTakeoutFileMaps = async () => {

  const takeoutFilesByFileName: IdToStringArray = {};
  const takeoutFilesByCreateDate: IdToStringArray = {};
  const takeoutFilesByDateTimeOriginal: IdToStringArray = {};
  const takeoutFilesByModifyDate: IdToStringArray = {};
  const takeoutFilesByImageDimensions: IdToStringArray = {};

  const filePaths: string[] = getImageFilePaths(tsPhotoUtilsConfiguration.MEDIA_ITEMS_DIR);

  let fileCount = 0;

  for (let filePath of filePaths) {

    const exifData: Tags = await getExifData(filePath);

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

export const testJob = async () => {

  const metadataFilePathByTakeoutFilePath: any = {};

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

  console.log('foundMatchingMetadataFiles', foundMatchingMetadataFiles);
  console.log('missingMatchingMetadataFiles', missingMatchingMetadataFiles);
  console.log(metadataFilePathByTakeoutFilePath);
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