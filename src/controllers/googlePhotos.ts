import * as path from 'path';
import * as fse from 'fs-extra';

import { GoogleMediaItem, MediaItem } from '../types';

import { AuthService } from '../auth/authService';
import request from 'request';

import { isArray, isNil } from 'lodash';
import { fsCreateNestedDirectory, fsLocalFolderExists } from '../utils';
export const GooglePhotoAPIs = {
  mediaItems: 'https://photoslibrary.googleapis.com/v1/mediaItems',
  albums: 'https://photoslibrary.googleapis.com/v1/albums',
  BATCH_GET_LIMIT: 49
};
import { tsPhotoUtilsConfiguration } from '../config';
import { updateMediaItemInDb } from './dbInterface';

export const getAllMediaItemsFromGoogle = async (authService: AuthService, nextPageToken: any = null): Promise<GoogleMediaItem[]> => {

  const googleMediaItems: GoogleMediaItem[] = [];

  let url = GooglePhotoAPIs.mediaItems;

  do {

    if (nextPageToken != null) {
      url = `${GooglePhotoAPIs.mediaItems}?pageToken=${nextPageToken}`;
    }

    try {

      const response: any = await getRequest(authService, url);

      console.log(response);

      if (!isNil(response)) {
        if (isArray(response.mediaItems)) {
          response.mediaItems.forEach((mediaItem: GoogleMediaItem) => {
            googleMediaItems.push(mediaItem);
          });
        }
        else {
          console.log('response.mediaItems is not array');
        }
        nextPageToken = response.nextPageToken;
      }
      else {
        console.log('response is nil');
      }

      console.log('number of googleMediaItems: ' + googleMediaItems.length);

    } catch (err) {
      nextPageToken = null;
    }

  } while (nextPageToken != null);

  return googleMediaItems;
};

const getRequest = async (authService: AuthService, url: string) => {

  const headers = await getHeaders(authService);

  return new Promise((resolve, reject) => {
    request(url, { headers }, (err, resp, body) => {
      if (err) {
        return reject(`Error when GET ${url} ${err}`);
      }
      try {
        body = JSON.parse(body);
      } catch (err) {
        return reject(`Error parsing response body ${err}`);
      }
      if (!!body.error) {
        const { code, message, status } = body.error;
        return reject(`Error _getRequest ${url} ${code} ${message} ${status}`);
      }
      resolve(body);
    });
  });
};

const getHeaders = async (authService: AuthService) => {
  const authToken = await authService.getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken.access_token}`
  };
};

export const downloadMediaItems = async (authService: AuthService, googleMediaItemGroups:  GoogleMediaItem[][]): Promise<any> => {

  for (const mediaItemGroup of googleMediaItemGroups) {
    for (const googleMediaItem of mediaItemGroup) {

      const mediaItem: MediaItem = {
        googleId: googleMediaItem.id,
        fileName: googleMediaItem.filename,
        filePath: '',
        baseUrl: googleMediaItem.baseUrl,
        productUrl: googleMediaItem.productUrl,
        mimeType: googleMediaItem.mimeType,
        creationTime: googleMediaItem.mediaMetadata.creationTime,
        width: parseInt(googleMediaItem.mediaMetadata.width, 10),
        height: parseInt(googleMediaItem.mediaMetadata.height, 10),
        description: '',
      }
      const retVal: any = await (downloadMediaItem(authService, mediaItem));
      console.log(retVal);
      if (retVal.valid) {
        // googleMediaItem.filePath = retVal.where;
        // await updateMediaItemInDb(googleMediaItem);
      } else {
        debugger;
      }
    }
  }
};

const downloadMediaItem = async (authService: AuthService, mediaItem: MediaItem): Promise<any> => {

  const fileSuffix = path.extname(mediaItem.fileName);
  const fileName = mediaItem.googleId + fileSuffix;

  const baseDir: string = await getShardedDirectory(false, mediaItem.googleId);
  const where = path.join(baseDir, fileName);

  const stream = await createDownloadStream(authService, mediaItem);
  return new Promise((resolve, reject) => {
    stream.pipe(fse.createWriteStream(where)
      .on('close', () => {
        // this._setFileTimestamp(where, mediaItem);
        resolve({ valid: true, where, mediaItem });
      }))
      .on('error', (err: any) => {
        resolve({ valid: false, where, mediaItem });
      });
  });
};

const createDownloadStream = async (authService: AuthService, mediaItem: MediaItem) => {
  const headers = await getHeaders(authService);
  const url: string = await createDownloadUrl(mediaItem);

  return request(url, { headers });
};


const createDownloadUrl = async (mediaItem: MediaItem) => {

  let downloadParams = '';

  const { width, height } = mediaItem;

  if (isNil(width) || isNil(height)) {
    debugger;
  }

  // TEDTODO
  // if ((mediaItem.mediaMetadata as any).video) {
  //   downloadParams += 'dv';
  // }

  // if (mediaItem.mediaMetadata.photo) {
  //   const { width, height } = mediaItem.mediaMetadata;
  //   downloadParams += `w${width}-h${height}`;
  // }

  downloadParams += `w${width}-h${height}`;
  return `${mediaItem.baseUrl}=${downloadParams}`;
};

let shardedDirectoryExistsByPath: any = {};

export const getShardedDirectory = async (useCache: boolean, photoId: string): Promise<string> => {
  const numChars = photoId.length;
  const targetDirectory = path.join(
    tsPhotoUtilsConfiguration.MEDIA_ITEMS_DIR,
    photoId.charAt(numChars - 2),
    photoId.charAt(numChars - 1),
  );

  if (useCache && shardedDirectoryExistsByPath.hasOwnProperty(targetDirectory)) {
    return Promise.resolve(targetDirectory);
  }
  return fsLocalFolderExists(targetDirectory)
    .then((dirExists: boolean) => {
      shardedDirectoryExistsByPath[targetDirectory] = true;
      if (dirExists) {
        return Promise.resolve(targetDirectory);
      }
      else {
        return fsCreateNestedDirectory(targetDirectory)
          .then(() => {
            return Promise.resolve(targetDirectory);
          });
      }
    })
    .catch((err: Error) => {
      console.log(err);
      return Promise.reject();
    });
};


export const downloadMediaItemsMetadata = async (authService: AuthService, mediaItemIds: string[]): Promise<GoogleMediaItem[]> => {

  let url = `${GooglePhotoAPIs.mediaItems}:batchGet?`;

  mediaItemIds.forEach((mediaItemId: any) => {
    url += `mediaItemIds=${mediaItemId}&`;
  });

  const result: any = await getRequest(authService, url);

  const mediaItemResults: any[] = result.mediaItemResults;
  const googleMediaItems: GoogleMediaItem[] = mediaItemResults.map((mediaItemResult: any) => {
    return mediaItemResult.mediaItem;
  });

  return googleMediaItems;
};

