import isomorphicPath from 'isomorphic-path';
import {
  GoogleMediaItem,
  IdToAnyArray,
  IdToGoogleMediaItemArray,
} from '../types';
import { AuthService } from '../auth';
import {
  getAllMediaItemsFromGoogle,
  getAuthService,
} from '../controllers';
import { getJsonFromFile, writeJsonToFile } from '../utils';
import { isNil } from 'lodash';
import { tsPhotoUtilsConfiguration } from '../config';

let authService: AuthService;

export const buildGoogleMediaItemsById = async () => {

  if (isNil(authService)) {
    authService = await getAuthService();
  }
  const googleMediaItems: GoogleMediaItem[] = await getAllMediaItemsFromGoogle(authService);
  console.log(googleMediaItems);

  const googleMediaItemsById: IdToGoogleMediaItemArray = {};
  for (const googleMediaItem of googleMediaItems) {
    if (!googleMediaItemsById.hasOwnProperty(googleMediaItem.id)) {
      googleMediaItemsById[googleMediaItem.id] = [];
    }
    googleMediaItemsById[googleMediaItem.id].push(googleMediaItem);
  }

  // const filePath = isomorphicPath.join(dirPath, photoInCollection.id + '.jpg');

  const success: boolean = await writeJsonToFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.GOOGLE_MEDIA_ITEMS_BY_ID),
    googleMediaItemsById
  );
  console.log(success);
}

export const getAddedGoogleMediaItems = async () => {

  const googleMediaItemsById: IdToGoogleMediaItemArray = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.GOOGLE_MEDIA_ITEMS_BY_ID));
  const oldGoogleMediaItemsById: IdToGoogleMediaItemArray = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.OLD_GOOGLE_MEDIA_ITEMS_BY_ID));

  for (const googleMediaItemId in googleMediaItemsById) {
    if (Object.prototype.hasOwnProperty.call(googleMediaItemsById, googleMediaItemId)) {
      // const googleMediaItems: GoogleMediaItem[] = googleMediaItemsById[googleMediaItemId];
      if (!Object.prototype.hasOwnProperty.call(oldGoogleMediaItemsById, googleMediaItemId)) {
        console.log('added google media item(s) with id ' + googleMediaItemId);
      }
    }
  }
}

export const getRemovedGoogleMediaItems = async () => {

  const googleMediaItemsById: IdToGoogleMediaItemArray = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.GOOGLE_MEDIA_ITEMS_BY_ID));
  const oldGoogleMediaItemsById: IdToGoogleMediaItemArray = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.OLD_GOOGLE_MEDIA_ITEMS_BY_ID));

  for (const googleMediaItemId in oldGoogleMediaItemsById) {
    if (Object.prototype.hasOwnProperty.call(oldGoogleMediaItemsById, googleMediaItemId)) {
      // const oldGoogleMediaItems: GoogleMediaItem[] = oldGoogleMediaItemsById[googleMediaItemId];
      if (!Object.prototype.hasOwnProperty.call(googleMediaItemsById, googleMediaItemId)) {
        console.log('removed google media item(s) with id ' + googleMediaItemId);
      }
    }
  }
}
