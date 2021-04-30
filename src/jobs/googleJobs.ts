import * as fs from 'fs-extra';
import isomorphicPath from 'isomorphic-path';
import {
  GoogleMediaItem,
  IdToGoogleMediaItemArray,
  MediaItem,
} from '../types';
import { AuthService } from '../auth';
import {
  downloadMediaItems,
  getAllMediaItems,
  getAllMediaItemsFromGoogle,
  getAuthService,
  GooglePhotoAPIs,
} from '../controllers';
import { getJsonFromFile, writeJsonToFile } from '../utils';
import { isNil } from 'lodash';
import { tsPhotoUtilsConfiguration } from '../config';
import connectDB from '../config/db';

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

  await writeJsonToFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.GOOGLE_MEDIA_ITEMS_BY_ID),
    googleMediaItemsById
  );
}


export const getAddedGoogleMediaItems = async (): Promise<GoogleMediaItem[]> => {

  const addedGoogleMediaItems: GoogleMediaItem[] = [];

  const googleMediaItemsById: IdToGoogleMediaItemArray = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.GOOGLE_MEDIA_ITEMS_BY_ID));
  const oldGoogleMediaItemsById: IdToGoogleMediaItemArray = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.OLD_GOOGLE_MEDIA_ITEMS_BY_ID));

  for (const googleMediaItemId in googleMediaItemsById) {
    if (Object.prototype.hasOwnProperty.call(googleMediaItemsById, googleMediaItemId)) {
      if (!Object.prototype.hasOwnProperty.call(oldGoogleMediaItemsById, googleMediaItemId)) {
        addedGoogleMediaItems.push(googleMediaItemsById[googleMediaItemId][0]);
      }
    }
  }

  // await writeJsonToFile(
  //   isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.ADDED_GOOGLE_MEDIA_ITEMS),
  //   addedGoogleMediaItems
  // );

  return addedGoogleMediaItems;
}

export const getRemovedGoogleMediaItems = async () => {

  const removedGoogleMediaItems: GoogleMediaItem[] = [];

  const googleMediaItemsById: IdToGoogleMediaItemArray = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.GOOGLE_MEDIA_ITEMS_BY_ID));
  const oldGoogleMediaItemsById: IdToGoogleMediaItemArray = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.OLD_GOOGLE_MEDIA_ITEMS_BY_ID));

  for (const googleMediaItemId in oldGoogleMediaItemsById) {
    if (Object.prototype.hasOwnProperty.call(oldGoogleMediaItemsById, googleMediaItemId)) {
      if (!Object.prototype.hasOwnProperty.call(googleMediaItemsById, googleMediaItemId)) {
        console.log('removed google media item(s) with id ' + googleMediaItemId);
        removedGoogleMediaItems.push(oldGoogleMediaItemsById[googleMediaItemId][0]);
      }
    }
  }

  await writeJsonToFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, 'removedMediaItems.json'),
    removedGoogleMediaItems
  );

}

export const downloadGooglePhotos = async () => {

  const mediaItemsToDownload: MediaItem[] = [];

  await connectDB();

  const mediaItems: MediaItem[] = await getAllMediaItems();
  for (const mediaItem of mediaItems) {
    const filePath = mediaItem.filePath;
    if (isNil(filePath) || filePath.length === 0 || (!fs.existsSync(filePath))) {
      mediaItemsToDownload.push(mediaItem);
    }
  }

  const groups = createGroups(mediaItemsToDownload, GooglePhotoAPIs.BATCH_GET_LIMIT);
  console.log(groups);

  if (isNil(authService)) {
    authService = await getAuthService();
  }

  downloadMediaItems(authService, groups);

  return Promise.resolve();
}

function createGroups(mediaItems: MediaItem[], groupSize: number): MediaItem[][] {

  const groups: MediaItem[][] = [];

  const numOfGroups = Math.ceil(mediaItems.length / groupSize);
  for (let i = 0; i < numOfGroups; i++) {
    const startIdx = i * groupSize;
    const endIdx = i * groupSize + groupSize;

    const subItems: MediaItem[] = mediaItems.slice(startIdx, endIdx);
    groups.push(subItems);
  }

  return groups;
}
