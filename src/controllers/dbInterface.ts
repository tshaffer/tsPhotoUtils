import { LegacyMediaItem, MediaItem } from 'entities';
import {
  getLegacyMediaitemModel,
  getMediaitemModel,
} from '../models';

// export const getMediaItemByName = async(fileName: string) => {

//   const model = getLegacyMediaitemModel();

//   const records: any[] = [];
//   const documents: any = await (model as any).find({ fileName: 'IMG_4726.PNG' }).exec();
//   for (const document of documents) {
//     records.push(document.toObject());
//   }
//   console.log('records');
//   console.log(records);
//   return records;

// }

export const getAllLegacyMediaItems = async (): Promise<LegacyMediaItem[]> => {

  const legacyMediaItemModel = getLegacyMediaitemModel();

  const records: LegacyMediaItem[] = [];
  // const documents: any = await (legacyMediaItemModel as any).find().limit(100).exec();
  const documents: any = await (legacyMediaItemModel as any).find().exec();
  // const documents: any = await (legacyMediaItemModel as any).find({ fileName: 'IMG_4726.PNG' }).exec();
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
  // const documents: any = await (mediaItemModel as any).find({ fileName: 'IMG_4726.PNG' }).exec();
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

  // id: string;
  // baseUrl: string;
  // fileName: string;
  // downloaded: boolean;
  // filePath: string;
  // productUrl: string;
  // mimeType: string;
  // creationTime: Date;
  // width: number;
  // height: number;

  // fileName: string;
  // filePath: string;
  // googleUrl: string;
  // mimeType: string;
  // creationTime: Date;
  // width: number;
  // height: number;
  // orientation: number;
  // description: string;
  // gpsPosition: string;

  // const mediaItem: MediaItem = {
  //   googleId: mediaItem.id,
  //   fileName: mediaItem.fileName,
  //   filePath: mediaItem.filePath,
  //   googleUrl: mediaItem.productUrl,
  //   mimeType: mediaItem.mimeType,
  //   creationTime: mediaItem.creationTime,
  //   width: mediaItem.width,
  //   height: mediaItem.height,
  //   description: '',
  // };

  try {
    return mediaItemModel.collection.insertOne(mediaItem)
    .then((retVal: any) => {
      const dbRecordId: string = retVal.insertedId._id.toString();
      // return dbRecordId;
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
