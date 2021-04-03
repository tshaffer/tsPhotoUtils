import {
  exiftool,
  Tags
} from 'exiftool-vendored';

export const getExifData = async (filePath: string): Promise<any> => {
  try {
    const tags: Tags = await exiftool.read(filePath);
    return tags;  
  } catch (error: any) {
    console.log('getExifData failed on: ', filePath);
    debugger;
  }
};
