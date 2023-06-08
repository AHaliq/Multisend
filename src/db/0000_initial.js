import { getDb } from './utils.js';

const migration = async (signer) => {
  const db = await getDb();
  db.data = {
    auth: '', migration: 0, network: [], wallets: [], calls: [], tx: [],
  };
  await signer.setDbCipher();
  // set cipher for auth and write to db
};

export default migration;
