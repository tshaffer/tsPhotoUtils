import { LegacyMediaItem, MediaItem } from 'entities';
import {
  getLegacyMediaitemModel,
  getMediaitemModel,
} from '../models';

export const getAllLegacyMediaItems = async (): Promise<LegacyMediaItem[]> => {

  const legacyMediaItemModel = getLegacyMediaitemModel();

  const records: LegacyMediaItem[] = [];
  // const documents: any = await (legacyMediaItemModel as any).find().limit(100).exec();
  const documents: any = await (legacyMediaItemModel as any).find().exec();
  for (const document of documents) {
    const legacyMediaItem: LegacyMediaItem = document.toObject() as LegacyMediaItem;
    legacyMediaItem._id = document._id.toString();
    records.push(legacyMediaItem);
  }
  console.log('records');
  console.log(records);
  return records;
}


export const getAllMediaItems = async (): Promise<MediaItem[]> => {

  const mediaItemModel = getMediaitemModel();

  const records: MediaItem[] = [];
  // const documents: any = await (mediaItemModel as any).find().limit(100).exec();
  const documents: any = await (mediaItemModel as any).find().exec();
  for (const document of documents) {
    const mediaItem: MediaItem = document.toObject() as MediaItem;
    mediaItem.googleId = document.googleId.toString();
    records.push(mediaItem);
  }
  console.log('records');
  console.log(records);
  return records;
}


export const addMediaItemToDb = async (mediaItem: MediaItem): Promise<any> => {

  const mediaItemModel = getMediaitemModel();

  try {
    return mediaItemModel.collection.insertOne(mediaItem)
    .then((retVal: any) => {
      const dbRecordId: string = retVal.insertedId._id.toString();
      return;
    })
    .catch( (error: any) => {
      console.log('db add error: ', error);
      if (error.code === 11000) {
        return;
      } else {
        debugger;
      }
    });
  } catch(error: any) {
    debugger;
  }
};

export const updateMediaItemInDb = async (mediaItem: MediaItem): Promise<any> => {
  const mediaItemModel = getMediaitemModel();
  const filter = { googleId: mediaItem.googleId };
  const update = { filePath: mediaItem.filePath };
  const updatedDoc = await mediaItemModel.findOneAndUpdate(filter, update, {
    new: true,
  });
};
