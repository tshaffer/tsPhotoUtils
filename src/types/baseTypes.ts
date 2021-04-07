export type IdToAnyArray = {
  [key: string]: any[]
}

export enum Jobs {
  BuildGoogleMediaItemsById = 'BuildGoogleMediaItemsById',
  GetAddedGoogleMediaItems = 'GetAddedGoogleMediaItems',
  GetRemovedGoogleMediaItems = 'GetRemovedGoogleMediaItems',
  GetGpsDataFromTakeoutFiles = 'GetGpsDataFromTakeoutFiles',
  Db = 'Db',
}

export interface TsPhotoUtilsConfiguration {
  mongoUri: string;
  mongoUriOld: string;
  dataDir: string;
}
