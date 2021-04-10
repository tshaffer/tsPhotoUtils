import fs from 'fs';
import path from 'path';
import * as nodeDir from 'node-dir';

const imageFileExtensions = ['.jpg', '.JPG', '.jpeg', '.JPEG', '.png', '.PNG', '.heic', '.HEIC'];

// interface MatchedPhoto {
//   imageFilePath: string;
//   exactMatch: boolean;
// }

// type IdToMatchedPhotoArray = {
//   [key: string]: MatchedPhoto[]
// }

const getFilesInDirectory = (rootDirPath: string): string[] => {
  return nodeDir.files(rootDirPath, { sync: true });
}

export const getJsonFilePaths = async (rootPath: string): Promise<string[]> => {
  return new Promise( (resolve, reject) => {
    nodeDir.readFiles(rootPath, {
    match: /.json$/,
    }, function(err, content, next) {
        if (err) throw err;
        // console.log('content:', content);
        next();
    },
    function(err, files){
        if (err) throw err;
        console.log('finished reading files:',files);
        return resolve(files);
    });
  });
}

export const getImageFilePaths = (rootPath: string): string[] => {
  const imageFiles: string[] = [];
  const files = getFilesInDirectory(rootPath);
  // TEDTODO - use regex?
  for (const file of files) {
    const extension: string = path.extname(file);
    if (imageFileExtensions.includes(extension)) {
      imageFiles.push(file);
    }
  }
  return imageFiles;
}


export const getJsonFromFile = async (filePath: string): Promise<any> => {
  const readFileStream: fs.ReadStream = openReadStream(filePath);
  const fileContents: string = await readStream(readFileStream);
  try {
    const jsonObject: any = JSON.parse(fileContents);
    return jsonObject;
  } catch (error: any) {
    return {};
  }
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

export const writeJsonToFile = async (filePath: string, jsonData: any): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const jsonContent = JSON.stringify(jsonData, null, 2);
    fs.writeFile(filePath, jsonContent, 'utf8', function (err) {
      if (err) {
        console.log("An error occured while writing JSON Object to File.");
        console.log(err);
        return reject(err);
      }

      console.log("JSON file has been saved.");
      return resolve(true);
    });
  })
}

