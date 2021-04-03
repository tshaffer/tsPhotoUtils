import * as mongoose from 'mongoose';
import { connection } from '../config';

const Schema = mongoose.Schema;

const MediaitemSchema = new Schema(
  {
      googleId: {type: String, required: true, unique: true},
      fileName: {type: String, required: true},
      filePath: {type: String, default: ''},
      productUrl: {type: String},
      mimeType: {type: String},
      creationTime: {type: Date},
      width: {type: Number},
      height: {type: Number},
      orientation: {type: Number, default: 0},
      description: {type: String, default: ''},
      gpsPosition: {type: String, default: ''}
  }
);

export const getMediaitemModel = () => {
  const mediaItemModel = connection.model('mediaitem', MediaitemSchema);
  return mediaItemModel;
}

export default MediaitemSchema;
