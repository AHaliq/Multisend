import { getDb } from './utils.js';

const migration = async (signer) => {
  const db = await getDb();
  db.data = {
    auth: '', migration: 0, network: [], wallets: [], calls: [], tx: [],
  };
  await db.write();
  // setup tables
  await signer.setDbCipher();
  // set cipher for auth
};

export default migration;
