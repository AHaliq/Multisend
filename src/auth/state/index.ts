import AppSigner from '../index.js';

/* eslint-disable class-methods-use-this */
class AuthState {
  static VIRTUAL_ERR = 'Must be implemented in inheriting class';

  _signer: AppSigner | null = null;

  constructor() {
    this._signer = null;
  }

  async _auth(): Promise<AppSigner | null> {
    throw new Error(AuthState.VIRTUAL_ERR);
    return Promise.resolve(null);
  }

  async unauth() {
    throw new Error(AuthState.VIRTUAL_ERR);
    return false;
  }

  /**
   * @returns true if not authenticated
   */
  notAuthed() {
    return this._signer === null;
  }

  isAuthed() {
    return !this.notAuthed();
  }

  /**
   * Attempts to authenticate if not authenticated before running callback
   * @param callback
   * @returns
   */
  async authGuard(callback: (signer: AppSigner) => void | Promise<void>) {
    if (this.notAuthed()) {
      this._signer = await this._auth();
    }
    if (this._signer === null) throw new Error('Failed to authenticate');
    return callback(this._signer);
  }

  getSigner() {
    return this._signer;
  }
}

export default AuthState;
