import { isNil, isString } from 'lodash';

import {
  ExifDateTime,
} from 'exiftool-vendored';

export const getDateTimeSinceZero = (dt: any): number => {
  let ts = -1;
  try {
    if (!isNil(dt)) {
      if (isString(dt)) {
        ts = Date.parse(dt);
      } else {
        ts = Date.parse((dt as ExifDateTime).toISOString());
      }
    }
  } catch (error) {
    console.log('getDateTimeSinceZero error: ', error);
    console.log('dt: ', dt);
  }

  return ts;
}

export const roundToNearestTenth = (valIn: number): number => {
  return Math.round(valIn * 10) / 10;
}
