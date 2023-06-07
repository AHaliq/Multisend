import { getDb } from './utils.js';
import { getSigner } from '../auth/index.js';

const migration = async () => {
  await getDb({
    auth: '', migration: 0, network: [], wallets: [], calls: [], tx: [],
  }).write();
  // create tables

  await getSigner(true).setDbCipher();
  // set cipher for auth
};

export default migration;
