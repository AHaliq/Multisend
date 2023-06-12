import AppSigner from '../auth/index.js';
import DbState from './state.js';

/**
 * This migration sets the auth cipher in the database
 * @param db
 * @param signer
 */
const migration = async (db:DbState, signer:AppSigner) => {
  db.setAuth(signer.genAuthCipher());
  return db;
};

export default migration;
