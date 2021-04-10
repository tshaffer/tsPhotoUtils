import * as dotenv from 'dotenv';
import { isNil } from 'lodash';
import { TsPhotoUtilsConfiguration } from '../types';

export let tsPhotoUtilsConfiguration: TsPhotoUtilsConfiguration;

export const readConfig = (pathToConfigFile: string): void => {

  try {
    const configOutput: dotenv.DotenvConfigOutput = dotenv.config({ path: pathToConfigFile });
    const parsedConfig: dotenv.DotenvParseOutput | undefined = configOutput.parsed;

    if (!isNil(parsedConfig)) {
      tsPhotoUtilsConfiguration = {
        MONGO_URI: parsedConfig.MONGO_URI,
        MONGO_URI_OLD: parsedConfig.MONGO_URI_OLD_DB,
        DATA_DIR: parsedConfig.DATA_DIR,
        MEDIA_ITEMS_DIR: parsedConfig.MEDIA_ITEMS_DIR,
        GOOGLE_MEDIA_ITEMS_BY_ID: parsedConfig.GOOGLE_MEDIA_ITEMS_BY_ID,
        OLD_GOOGLE_MEDIA_ITEMS_BY_ID: parsedConfig.OLD_GOOGLE_MEDIA_ITEMS_BY_ID,
        ADDED_GOOGLE_MEDIA_ITEMS: parsedConfig.ADDED_GOOGLE_MEDIA_ITEMS,
        TAKEOUT_FILES_BY_FILE_NAME: parsedConfig.TAKEOUT_FILES_BY_FILE_NAME,
        TAKEOUT_FILES_BY_CREATE_DATE: parsedConfig.TAKEOUT_FILES_BY_CREATE_DATE,
        TAKEOUT_FILES_BY_DATE_TIME_ORIGINAL: parsedConfig.TAKEOUT_FILES_BY_DATE_TIME_ORIGINAL,
        TAKEOUT_FILES_BY_MODIFY_DATE: parsedConfig.TAKEOUT_FILES_BY_MODIFY_DATE,
        TAKEOUT_FILES_BY_IMAGE_DIMENSIONS: parsedConfig.TAKEOUT_FILES_BY_IMAGE_DIMENSIONS,

      };
      console.log(tsPhotoUtilsConfiguration);
    }
  }
  catch (err) {
    console.log('Dotenv config error: ' + err.message);
  }
};
