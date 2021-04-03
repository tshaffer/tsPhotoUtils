import fs from 'fs';

interface MatchedPhoto {
  imageFilePath: string;
  exactMatch: boolean;
}

type IdToMatchedPhotoArray = {
  [key: string]: MatchedPhoto[]
}

export const getJsonFromFile = async (filePath: string): Promise<any> => {
  const readFileStream: fs.ReadStream = openReadStream(filePath);
  const fileContents: string = await readStream(readFileStream);
  // const jsonObject: IdToMatchedPhotoArray = JSON.parse(fileContents);
  const jsonObject: any = JSON.parse(fileContents);
  return jsonObject;
}

const openReadStream = (filePath: string): fs.ReadStream => {
  let readStream = fs.createReadStream(filePath);
  return readStream;
}

export const readStream = async (stream: fs.ReadStream): Promise<string> => {

  return new Promise((resolve, reject) => {

    let str = '';
    stream.on('data', (data) => {
      str += data.toString();
    });

    stream.on('end', () => {
      return resolve(str);
    });

  })
}

export const openWriteStream = (filePath: string): fs.WriteStream => {
  let writeStream = fs.createWriteStream(filePath);
  return writeStream;
}

export const writeToWriteStream = (stream: fs.WriteStream, chunk: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    stream.write(chunk, () => {
      stream.write('\n', () => {
        return resolve();
      });
    });
  })
}

export const closeStream = (stream: fs.WriteStream): Promise<void> => {
  return new Promise((resolve, reject) => {
    stream.end(() => {
      return resolve();
    });
  })
}


