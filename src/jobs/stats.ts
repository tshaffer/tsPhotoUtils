import isomorphicPath from 'isomorphic-path';
import { FilePathToExifTags, GoogleMediaItem, IdToStringArray } from '../types';
import { getJsonFromFile } from '../utils';
import { tsPhotoUtilsConfiguration } from '../config';
import { Tags } from 'exiftool-vendored';
import { isNil } from 'lodash';


export const checkMetadataInNewFiles = async () => {

  let hasDateCount = 0;
  let hasNoDateCount = 0;

  let hasGpsDataCount = 0;
  let hasNoGpsDataCount = 0;

  const addedGoogleMediaItems: GoogleMediaItem[] = await getJsonFromFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.ADDED_GOOGLE_MEDIA_ITEMS));

  const takeoutFilesByFileName: IdToStringArray = await getJsonFromFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.TAKEOUT_FILES_BY_FILE_NAME));

  const filePathsToExifTags: FilePathToExifTags = await getJsonFromFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.FILE_PATHS_TO_EXIF_TAGS));

  for (const addedGoogleMediaItem of addedGoogleMediaItems) {
    let hasDate = false;
    let hasGpsData = false;
    const fileName = addedGoogleMediaItem.filename;
    if (takeoutFilesByFileName.hasOwnProperty(fileName)) {
      const takeoutFilePaths: string[] = takeoutFilesByFileName[fileName];
      for (const takeoutFilePath of takeoutFilePaths) {
        if (filePathsToExifTags.hasOwnProperty(takeoutFilePath)) {
          const exifTags: Tags = filePathsToExifTags[takeoutFilePath];
          hasDate = hasExifDate(exifTags);
          hasGpsData = hasExifGpsData(exifTags);
        }
      }
    } else {
      console.log(fileName);
      // debugger;
    }
    if (hasDate) {
      hasDateCount++;
    } else {
      hasNoDateCount++;
    }

    if (hasGpsData) {
      hasGpsDataCount++;
    } else {
      hasNoGpsDataCount++;
    }
  }

  console.log('New file count: ' + Object.keys(addedGoogleMediaItems).length);

  console.log('hasDateCount', hasDateCount);
  console.log('hasNoDateCount', hasNoDateCount);
  console.log('hasGpsDataCount', hasGpsDataCount);
  console.log('hasNoGpsDataCount', hasNoGpsDataCount);
}

const hasExifDate = (exifTags: Tags): boolean => {
  if (!isNil(exifTags.DateTimeOriginal)) {
    return true;
  } else if (!isNil(exifTags.ModifyDate)) {
    return true;
  } else if (!isNil(exifTags.CreateDate)) {
    return true;
  }
  return false;
}

const hasExifGpsData = (exifTags: Tags): boolean => {
  if (!isNil(exifTags.GPSPosition)) {
    return true;
  }
  return false;
}