import cryptojs from 'crypto-js';
import { Wallet } from 'ethers';
import { getDb } from '../db/utils.js';

class AppAuth {
  constructor(plaintext, password) {
    this.plaintext = plaintext;
    this.password = password;
  }

  sign(message) {
    return cryptojs.AES.encrypt(message, this.password).toString();
  }

  read(signature) {
    return cryptojs.AES.decrypt(signature, this.password).toString(cryptojs.enc.Utf8);
  }

  verify(message, signature) {
    return this.read(signature) === message;
  }

  async verifyDbCipher() {
    const db = await getDb();
    return this.verify(this.plaintext, db.data.auth);
  }

  async setDbCipher() {
    const db = await getDb();
    db.data.auth = this.sign(this.plaintext);
    await db.write();
  }

  async verifyWallet(w, unencrypted = false) {
    try {
      return await new Wallet(unencrypted ? w.pk : this.read(w.pk)).getAddress() === w.address;
    } catch {
      return false;
    }
  }

  compare({ plaintext, password }) {
    return this.plaintext === plaintext && this.password === password;
  }
}

export default AppAuth;

// TODO combine plaintext and password into one argument
// TODO move login logic as a util
// TODO call util login on every command if not logged in
