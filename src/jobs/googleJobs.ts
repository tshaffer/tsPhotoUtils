import isomorphicPath from 'isomorphic-path';
import {
  GoogleMediaItem,
  IdToAnyArray,
} from '../types';
import { AuthService } from '../auth';
import {
  getAllMediaItemsFromGoogle,
  getAuthService,
} from '../controllers';
import { writeJsonToFile } from '../utils';
import { isNil } from 'lodash';

let authService: AuthService;

export const buildGoogleMediaItemsById = async () => {

  if (isNil(authService)) {
    authService = await getAuthService();
  }
  const googleMediaItems: GoogleMediaItem[] = await getAllMediaItemsFromGoogle(authService);
  console.log(googleMediaItems);

  const googleMediaItemsById: IdToAnyArray = {};
  for (const googleMediaItem of googleMediaItems) {
    if (!googleMediaItemsById.hasOwnProperty(googleMediaItem.id)) {
      googleMediaItemsById[googleMediaItem.id] = [];
    }
    googleMediaItemsById[googleMediaItem.id].push(googleMediaItem);
  }

  // const filePath = isomorphicPath.join(dirPath, photoInCollection.id + '.jpg');

  const success: boolean = await writeJsonToFile('/Users/tedshaffer/Pictures/ShafferPhotoData/googleItemsById.json', googleMediaItemsById);
  console.log(success);
}