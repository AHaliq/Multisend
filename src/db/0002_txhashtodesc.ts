import { Tx } from './schema.js';
import DbState from './state.js';

/**
 * This migration sets the auth cipher in the database
 * @param db
 * @param signer
 */
const migration = async (db: DbState) => {
  console.log('Running migration 2');
  const data = await db.chain();
  db.setData({
    ...data,
    txs: data.txs.map(
      tx =>
        ({
          id: tx.id,
          callId: tx.callId,
          walletId: tx.walletId,
          desc: tx.hash,
          status: tx.status,
          timestamp: tx.timestamp,
        } as Tx),
    ),
  });
  db.setMigration(2);
  await db.write();
  return db;
};

export default migration;
