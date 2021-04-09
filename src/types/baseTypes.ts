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
  GOOGLE_MEDIA_ITEMS_BY_ID: string;
  OLD_GOOGLE_MEDIA_ITEMS_BY_ID: string;
}
