import fs from 'fs';
import dotenv from 'dotenv';
import AppAuth from './index.js';
import AppSigner from '../index.js';
import DbState from '../../db/state.js';
import appPaths from '../../state/path.js';
import AppState from '../../state/index.js';

class AuthStateCli extends AppAuth {
  /** filename of the env file */
  static ENVNAME = appPaths('config', '.env');

  #state: AppState;

  constructor(state: AppState) {
    super();
    this.#state = state;
  }

  static envExists() {
    return fs.existsSync(AuthStateCli.ENVNAME);
  }

  static deleteEnv() {
    if (AuthStateCli.envExists()) {
      fs.unlinkSync(AuthStateCli.ENVNAME);
      return true;
    }
    return false;
  }

  /**
   * Requests password from user and authenticate with db's auth cipher
   * @override
   */
  override async #auth() : Promise<AppSigner> {
    let pw:string | undefined;
    let cipher: string;

    if (AuthStateCli.envExists()) {
      dotenv.config({ path: AuthStateCli.ENVNAME });
      pw = process.env.PASSWORD;
    }
    // try load password from .env file

    if (pw === undefined) {
      pw = this.#state.io.prompt('Create password', true);
    }
    // prompt user for password if not found in .env file

    const signer = new AppSigner(pw);
    // create signer from password

    if (DbState.dbExists()) {
      cipher = await this.#state.db.getAuth();
    } else {
      throw new Error('authentication requires database entry "auth" to exist');
    }
    // get auth cipher from db

    if (signer.verifyAuthCipher(cipher)) {
      fs.writeFileSync(AuthStateCli.ENVNAME, `PASSWORD=${pw}`);
      return signer;
    }
    // verify auth cipher

    this.#state.io.err('Password failed authentication');
    return this.#auth();
    // if auth fails, try again
  }

  /**
   * Deletes .env file
   * @override
   * @returns
   */
  override async unauth() {
    if (AuthStateCli.deleteEnv()) {
      this.#state.io.print('Successfully logged out');
    } else {
      this.#state.io.print('Already logged out');
    }
    this._signer = null;
    return false;
  }
}

export default AuthStateCli;
