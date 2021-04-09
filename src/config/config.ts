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
        GOOGLE_MEDIA_ITEMS_BY_ID: parsedConfig.GOOGLE_MEDIA_ITEMS_BY_ID,
        OLD_GOOGLE_MEDIA_ITEMS_BY_ID: parsedConfig.OLD_GOOGLE_MEDIA_ITEMS_BY_ID,
        ADDED_GOOGLE_MEDIA_ITEMS: parsedConfig.ADDED_GOOGLE_MEDIA_ITEMS,
      };
      console.log(tsPhotoUtilsConfiguration);
    }
  }
  catch (err) {
    console.log('Dotenv config error: ' + err.message);
  }
};
