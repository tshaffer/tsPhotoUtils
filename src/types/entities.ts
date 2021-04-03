export interface LegacyMediaItem {
  _id: any;
  id: string;
  baseUrl: string;
  fileName: string;
  downloaded: boolean;
  filePath: string;
  productUrl: string;
  mimeType: string;
  creationTime: Date;
  width: number;
  height: number;
}

// export interface DbMediaItem {
//   fileName: string;
//   filePath?:string;
//   title?:string;
//   description?:string;
//   mimeType?:string;
//   width?:number;
//   height?:number;
//   creationDate?:Date;
//   dateTimeOriginal?:Date;
//   modifyDate?:string;
//   gpsLatitude?:number;
//   gpsLongitude?:number;
// }

export interface MediaItem {
  googleId: string;
  fileName: string;
  filePath: string;
  googleUrl: string;
  mimeType: string;
  creationTime: Date;
  width: number;
  height: number;
  orientation?: number;
  description: string;
  gpsPosition?: string;
}

