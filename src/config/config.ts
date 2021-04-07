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
        mongoUri: parsedConfig.MONGO_URI,
        mongoUriOld: parsedConfig.MONGO_URI_OLD_DB,
        dataDir: parsedConfig.DATA_DIR,
      };
      console.log(tsPhotoUtilsConfiguration);
    }
  }
  catch (err) {
    console.log('Dotenv config error: ' + err.message);
  }
};
