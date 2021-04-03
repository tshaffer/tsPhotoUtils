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


export const addMediaItemToDb = async (legacyMediaItem: LegacyMediaItem): Promise<string> => {

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

  const mediaItem: MediaItem = {
    googleId: legacyMediaItem.id,
    fileName: legacyMediaItem.fileName,
    filePath: legacyMediaItem.filePath,
    googleUrl: legacyMediaItem.productUrl,
    mimeType: legacyMediaItem.mimeType,
    creationTime: legacyMediaItem.creationTime,
    width: legacyMediaItem.width,
    height: legacyMediaItem.height,
    description: '',
  };

  return mediaItemModel.collection.insertOne(mediaItem)
    .then((retVal: any) => {
      const dbRecordId: string = retVal.insertedId._id.toString();
      return dbRecordId;
    })
};
