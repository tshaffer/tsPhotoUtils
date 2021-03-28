import { LegacyMediaItem } from 'entities';
import { getLegacyMediaitemModel } from '../models/LegacyMediaitem';

export const getMediaItemByName = async(fileName: string) => {

  const model = getLegacyMediaitemModel();
  
  const records: any[] = [];
  const documents: any = await (model as any).find({ fileName: 'IMG_4726.PNG' }).exec();
  for (const document of documents) {
    records.push(document.toObject());
  }
  console.log('records');
  console.log(records);
  return records;

}

export const getAllLegacyMediaItems = async() => {

  const legacyMediaItemModel = getLegacyMediaitemModel();
  
  const records: LegacyMediaItem[] = [];
  const documents: any = await (legacyMediaItemModel as any).find().exec();
  for (const document of documents) {
    records.push(document.toObject() as LegacyMediaItem);
  }
  console.log('records');
  console.log(records);
  return records;
}


