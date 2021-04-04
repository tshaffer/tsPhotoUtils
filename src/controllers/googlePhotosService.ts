import { AuthService } from '../auth';
import { AuthStorage } from '../auth';
import { isNil } from 'lodash';

let authService: any = null;
const photosApiReadOnlyScope = 'https://www.googleapis.com/auth/photoslibrary.readonly';

export const getAuthService = async () => {

  if (!isNil(authService)) {
    return authService;
  }

  // setup authorization
  const authStorage = new AuthStorage();
  authService = new AuthService(authStorage);

  // authenticate with google
  const scopes = [photosApiReadOnlyScope];
  await authService.authenticate(scopes);

  return authService;
}
