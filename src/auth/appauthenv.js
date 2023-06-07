import fs from 'fs';
import dotenv from 'dotenv';
import AppAuth from './appauth.js';

class AppAuthEnv extends AppAuth {
  constructor(argv = null) {
    if (argv === null) AppAuthEnv.envExists();
    const { plaintext, password } = argv ?? {};
    const pt = plaintext ?? process.env.PLAINTEXT;
    const pw = password ?? process.env.PASSWORD;
    if (pt === undefined || pw === undefined) throw new Error('No defaults provided and .env not found or malformed');
    super(pt, pw);
  }

  createEnv() {
    fs.writeFileSync('.env', `PLAINTEXT=${this.plaintext}\nPASSWORD=${this.password}`);
  }

  static envExists() {
    if (fs.existsSync('.env')) {
      dotenv.config();
      return process.env.PLAINTEXT !== undefined && process.env.PASSWORD !== undefined;
    }
    return false;
  }

  static deleteEnv() {
    fs.unlinkSync('.env');
  }
}

export default AppAuthEnv;
