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
  MONGO_URI: string;
  MONGO_URI_OLD: string;
  DATA_DIR: string;
  GOOGLE_MEDIA_ITEMS_BY_ID: string;
  OLD_GOOGLE_MEDIA_ITEMS_BY_ID: string;
}
