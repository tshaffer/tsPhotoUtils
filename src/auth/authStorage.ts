import * as fs from 'fs-extra';
import path from 'path';

export class AuthStorage {

  storeToken(token: any) {
      const storedToken = {
          token,
          tokenCreatedAt: Date.now()
      };

      const filePath = this._getTokenFilePath();
      fs.writeFileSync(filePath, JSON.stringify(storedToken, null, 4));

      return storedToken;
  }

  loadToken() {
      let token = null;

      let data = '';
      const filePath = this._getTokenFilePath();
      if (fs.existsSync(filePath)) {
          data += fs.readFileSync(filePath).toString();

          try {
              token = JSON.parse(data);
          } catch (err) {
              console.log(err);
              token = null;
          }
      }

      const isTokenValid = !!token && !!token.token &&
          !!token.token.expires_in && !!token.token.access_token;

      if (isTokenValid) {
          return token;
      }

      return null;
  }

  _getTokenFilePath() {
      return path.join(__dirname, 'secrets/token.json');
  }
}

