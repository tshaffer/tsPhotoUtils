import * as mongoose from 'mongoose';
import { legacyConnection } from '../config';

const Schema = mongoose.Schema;

const LegacyMediaitemSchema = new Schema(
  {
      id: {type: String, required: true, unique: true},
      baseUrl: {type: String, required: true},
      fileName: {type: String, required: true},
      downloaded: {type: Boolean, default: false},
      filePath: {type: String, default: ''},
      productUrl: {type: String},
      mimeType: {type: String},
      creationTime: {type: Date},
      imageWidth: {type: Number},
      imageHeight: {type: Number},
  }
);

export const getLegacyMediaitemModel = () => {
  const legacyMediaItemModel = legacyConnection.model('mediaitem', LegacyMediaitemSchema);
  return legacyMediaItemModel;
}

export default LegacyMediaitemSchema;
