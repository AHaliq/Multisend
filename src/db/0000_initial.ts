import AppSigner from '../auth/index.js';
import DbState from './state.js';

/**
 * This migration sets the auth cipher in the database
 * @param db
 * @param signer
 */
const migration = async (db:DbState, signer:AppSigner) => {
  console.log('Running migration 0');
  db.setAuth(signer.genAuthCipher());
  db.setMigration(0);
  await db.write();
  return db;
};

export default migration;
