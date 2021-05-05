export type IdToGoogleMediaItems = {
  [key: string]: GoogleMediaItem[]
}

export type IdToMatchedGoogleMediaItem = {
  [key: string]: MatchedGoogleMediaItem;
}

export interface MatchedGoogleMediaItem {
  takeoutFilePath: string;
  googleMediaItem: GoogleMediaItem;
}

export type IdToGoogleMediaItem = {
  [key: string]: GoogleMediaItem
}

export type IdToGoogleMediaItemArray = {
  [key: string]: GoogleMediaItem[]
}

export interface GoogleMediaItemsByIdInstance {
  creationDate: string;   // ISO date as string
  googleMediaItemsById: IdToGoogleMediaItemArray;
}

export interface GoogleMediaItem {
  id: string;
  filename: string;
  mimeType: string;
  baseUrl: string;
  productUrl: string;
  mediaMetadata: GoogleMediaMetadata;
}

export interface GoogleMediaMetadata {
  creationTime: Date; // or string?
  height: string;
  width: string;
  photo: GooglePhoto;
}

export interface GooglePhoto {
  apertureFNumber: number;
  cameraMake: string;
  cameraModel: string;
  focalLength: number;
  isoEquivalent: number;
}
