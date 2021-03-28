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

export interface MediaItem {
  googleId: string;
  fileName: string;
  filePath: string;
  productUrl: string;
  mimeType: string;
  creationTime: Date;
  width: number;
  height: number;
  orientation: number;
  description: string;
  gpsPosition: string;
}

