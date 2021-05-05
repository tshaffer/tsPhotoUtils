import * as fs from 'fs-extra';
import isomorphicPath from 'isomorphic-path';
import {
  GoogleMediaItem,
  GoogleMediaItemsByIdInstance,
  IdToGoogleMediaItemArray,
  MediaItem,
} from '../types';
import { AuthService } from '../auth';
import {
  downloadMediaItems,
  downloadMediaItemsMetadata,
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

  const googleMediaItemsByIdInstance: GoogleMediaItemsByIdInstance = {
    creationDate: new Date().toISOString(),
    googleMediaItemsById,
  };

  await writeJsonToFile(
    isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.GOOGLE_MEDIA_ITEMS_BY_ID),
    googleMediaItemsByIdInstance
  );
}


export const getAddedGoogleMediaItems = async (): Promise<GoogleMediaItem[]> => {

  const addedGoogleMediaItems: GoogleMediaItem[] = [];

  const googleMediaItemsByIdInstance: GoogleMediaItemsByIdInstance = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.GOOGLE_MEDIA_ITEMS_BY_ID));
  const previousGoogleMediaItemsByIdInstance: GoogleMediaItemsByIdInstance = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.OLD_GOOGLE_MEDIA_ITEMS_BY_ID));

  const googleMediaItemsById: IdToGoogleMediaItemArray = googleMediaItemsByIdInstance.googleMediaItemsById;
  const previousGoogleMediaItemsById: IdToGoogleMediaItemArray = previousGoogleMediaItemsByIdInstance.googleMediaItemsById;

  for (const googleMediaItemId in googleMediaItemsById) {
    if (Object.prototype.hasOwnProperty.call(googleMediaItemsById, googleMediaItemId)) {
      if (!Object.prototype.hasOwnProperty.call(previousGoogleMediaItemsById, googleMediaItemId)) {
        addedGoogleMediaItems.push(googleMediaItemsById[googleMediaItemId][0]);
      }
    }
  }

  console.log('addedGoogleMediaItems');
  console.log(addedGoogleMediaItems);

  // await writeJsonToFile(
  //   isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.ADDED_GOOGLE_MEDIA_ITEMS),
  //   addedGoogleMediaItems
  // );

  return addedGoogleMediaItems;
}

export const getRemovedGoogleMediaItems = async () => {

  const removedGoogleMediaItems: GoogleMediaItem[] = [];

  const googleMediaItemsByIdInstance: GoogleMediaItemsByIdInstance = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.GOOGLE_MEDIA_ITEMS_BY_ID));
  const previousGoogleMediaItemsByIdInstance: GoogleMediaItemsByIdInstance = await getJsonFromFile(isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, tsPhotoUtilsConfiguration.OLD_GOOGLE_MEDIA_ITEMS_BY_ID));

  const googleMediaItemsById: IdToGoogleMediaItemArray = googleMediaItemsByIdInstance.googleMediaItemsById;
  const previousGoogleMediaItemsById: IdToGoogleMediaItemArray = previousGoogleMediaItemsByIdInstance.googleMediaItemsById;

  for (const googleMediaItemId in previousGoogleMediaItemsById) {
    if (Object.prototype.hasOwnProperty.call(previousGoogleMediaItemsById, googleMediaItemId)) {
      if (!Object.prototype.hasOwnProperty.call(googleMediaItemsById, googleMediaItemId)) {
        console.log('removed google media item(s) with id ' + googleMediaItemId);
        removedGoogleMediaItems.push(previousGoogleMediaItemsById[googleMediaItemId][0]);
      }
    }
  }

  console.log('removedGoogleMediaItems');
  console.log(removedGoogleMediaItems);

  // await writeJsonToFile(
  //   isomorphicPath.join(tsPhotoUtilsConfiguration.DATA_DIR, 'removedMediaItems.json'),
  //   removedGoogleMediaItems
  // );

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

  const mediaItemIds: string[] = mediaItems.map((mediaItem: MediaItem) => {
    return mediaItem.googleId;
  });

  const groups = createGroups(mediaItemIds, GooglePhotoAPIs.BATCH_GET_LIMIT);
  console.log(groups);

  // const groups: MediaItem[][] = createGroups(mediaItemsToDownload, GooglePhotoAPIs.BATCH_GET_LIMIT);
  // console.log(groups);

  if (isNil(authService)) {
    authService = await getAuthService();
  }

  const miniGroups = [groups[0]];
  const googleMediaItemGroups: GoogleMediaItem[][] = await Promise.all(miniGroups.map((sliceIds: any) => {
    return downloadMediaItemsMetadata(authService, sliceIds);
  }));

  // const googleMediaItemGroups: GoogleMediaItem[][] = await Promise.all(groups.map((sliceIds: any) => {
  //   return downloadMediaItemsMetadata(authService, sliceIds);
  // }));

  downloadMediaItems(authService, googleMediaItemGroups);

  return Promise.resolve();
}

// function createGroups(mediaItems: MediaItem[], groupSize: number): MediaItem[][] {

//   const groups: MediaItem[][] = [];

//   const numOfGroups = Math.ceil(mediaItems.length / groupSize);
//   for (let i = 0; i < numOfGroups; i++) {
//     const startIdx = i * groupSize;
//     const endIdx = i * groupSize + groupSize;

//     const subItems: MediaItem[] = mediaItems.slice(startIdx, endIdx);
//     groups.push(subItems);
//   }

//   return groups;
// }

export function createGroups(items: string[], groupSize: number): string[][] {
  
  const groups: string[][] = [];

  const numOfGroups = Math.ceil(items.length / groupSize);
  for (let i = 0; i < numOfGroups; i++) {
      const startIdx = i * groupSize;
      const endIdx = i * groupSize + groupSize;

      const subItems: string[] = items.slice(startIdx, endIdx);
      groups.push(subItems);
  }

  return groups;
}
