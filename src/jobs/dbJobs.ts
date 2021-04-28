import {
  LegacyMediaItem,
  MediaItem,
} from '../types';

import {
  getAllLegacyMediaItems,
  getAllMediaItems,
} from '../controllers';
import connectDB from '../config/db';

export const getAddedDbMediaItems = async () => {

  const addedDbMediaItems: MediaItem[] = [];

  const legacyMediaItemsById: any = {};

  await connectDB();

  const legacyMediaItems: LegacyMediaItem[] = await getAllLegacyMediaItems();
  for (const legacyMediaItem of legacyMediaItems) {
    legacyMediaItemsById[legacyMediaItem.id] = legacyMediaItem;
  }
  const mediaItems: MediaItem[] = await getAllMediaItems();
  for (const mediaItem of mediaItems) {
    if (!legacyMediaItemsById.hasOwnProperty(mediaItem.googleId)) {
      addedDbMediaItems.push(mediaItem);
    }
  }

  console.log('number of added db media items');
  console.log(addedDbMediaItems.length);
  console.log(addedDbMediaItems);
}

export const getRemovedDbMediaItems = async () => {

  const removedDbMediaItems: LegacyMediaItem[] = [];

  const mediaItemsById: any = {};

  await connectDB();

  const mediaItems: MediaItem[] = await getAllMediaItems();
  for (const mediaItem of mediaItems) {
    mediaItemsById[mediaItem.googleId] = mediaItem;
  }
  const legacyMediaItems: LegacyMediaItem[] = await getAllLegacyMediaItems();
  for (const legacyMediaItem of legacyMediaItems) {
    if (!mediaItemsById.hasOwnProperty(legacyMediaItem.id)) {
      removedDbMediaItems.push(legacyMediaItem);
    }
  }

  console.log('number of removed db media items');
  console.log(removedDbMediaItems.length);
  console.log(removedDbMediaItems);

  console.log('job complete');
}