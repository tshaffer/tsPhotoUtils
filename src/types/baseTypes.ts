import { Tags } from "exiftool-vendored"

export type IdToAnyArray = {
  [key: string]: any[]
}

export type IdToStringArray = {
  [key: string]: string[]
}

export type IdToString = {
  [key: string]: string
}

export interface FilePathToExifTags {
  [key: string]: Tags;
}

export enum Jobs {
  BuildGoogleMediaItemsById = 'BuildGoogleMediaItemsById',
  GetAddedGoogleMediaItems = 'GetAddedGoogleMediaItems',
  GetRemovedGoogleMediaItems = 'GetRemovedGoogleMediaItems',
  GetGpsDataFromTakeoutFiles = 'GetGpsDataFromTakeoutFiles',
  BuildTakeoutFileMaps = 'BuildTakeoutFileMaps',
  BuildMetadataFileMap = 'BuildMetadataFileMap',
  CompareGPSTags = 'CompareGPSTags',
  CheckMetadataInNewFiles = 'CheckMetadataInNewFiles',
  Db = 'Db',
  TestJob = 'TestJob',
}

export interface TsPhotoUtilsConfiguration {
  MONGO_URI: string;
  MONGO_URI_OLD: string;
  DATA_DIR: string;
  MEDIA_ITEMS_DIR: string;
  GOOGLE_MEDIA_ITEMS_BY_ID: string;
  OLD_GOOGLE_MEDIA_ITEMS_BY_ID: string;
  ADDED_GOOGLE_MEDIA_ITEMS: string;
  TAKEOUT_FILES_BY_FILE_NAME:  string;
  TAKEOUT_FILES_BY_CREATE_DATE:  string;
  TAKEOUT_FILES_BY_DATE_TIME_ORIGINAL:  string;
  TAKEOUT_FILES_BY_MODIFY_DATE:  string;
  TAKEOUT_FILES_BY_IMAGE_DIMENSIONS:  string;
  FILE_PATHS_TO_EXIF_TAGS: string;
  METADATA_FILE_PATH_BY_TAKEOUT_FILE_PATH: string;
}
