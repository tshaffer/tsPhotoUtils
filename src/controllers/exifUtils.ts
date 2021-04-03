import {
  exiftool,
  Tags
} from 'exiftool-vendored';

export const getExifData = async (filePath: string): Promise<any> => {
  const tags: Tags = await exiftool.read(filePath);
  return tags;
};
