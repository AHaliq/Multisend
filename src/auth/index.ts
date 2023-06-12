import CryptoJS from 'crypto-js';
import { Wallet } from 'ethers';
import { Wallet as WalletEntry } from '../db/schema.js';

class AppSigner {
  #key:string;

  constructor(key:string) {
    this.#key = key;
  }

  sign(msg:string) {
    return CryptoJS.AES.encrypt(msg, this.#key).toString();
  }

  decrypt(cipher:string) {
    return CryptoJS.AES.decrypt(cipher, this.#key).toString(CryptoJS.enc.Utf8);
  }

  verify(msg:string, cipher:string) {
    return msg === this.decrypt(cipher);
  }

  verifyAuthCipher(cipher: string) {
    return this.verify(this.#key, cipher);
  }

  genAuthCipher() {
    return this.sign(this.#key);
  }

  async verifyWalletEntry(wallet: WalletEntry) {
    try {
      const { address, pk } = wallet;
      return await new Wallet(pk).getAddress() === address;
    } catch {
      return false;
    }
  }
}

export default AppSigner;
