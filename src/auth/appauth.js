import cryptojs from 'crypto-js';
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
    const db = getDb();
    await db.read();
    return this.verify(this.plaintext, db.data.auth);
  }

  async setDbCipher() {
    const db = getDb();
    db.data.auth = this.sign(this.plaintext);
    await db.write();
  }

  compare({ plaintext, password }) {
    return this.plaintext === plaintext && this.password === password;
  }
}

export default AppAuth;
