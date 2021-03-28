import { getLegacyMediaitemModel } from '../models/LegacyMediaitem';

export const getMediaItemByName = async(fileName: string) => {

  const model = getLegacyMediaitemModel();
  // 'IMG_4726.PNG';
  
  const records: any[] = [];
  const documents: any = await (model as any).find({ fileName: 'IMG_4726.PNG' }).exec();
  for (const document of documents) {
    records.push(document.toObject());
  }
  console.log('records');
  console.log(records);
  return records;

}