import fs from 'fs';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const DBNAME = 'db.json';

const dbExists = () => fs.existsSync(DBNAME);

const getDb = async (read = true, defaultData = {}) => {
  const adapter = new JSONFile(DBNAME);
  const db = new Low(adapter, defaultData);
  if (read) await db.read();
  return db;
};

const getWalletsAtCallId = async (callId) => {
  const db = await getDb();
  const wallets = db.data?.wallets ?? [];
  if (callId === undefined) return wallets;
  const calls = db.data?.calls ?? [];

  const callWallets = calls.filter((c) => c.callId === callId).map((c) => c.walletId);
  return wallets.filter((w) => callWallets.includes(w.walletId));
};

const getWallets = async ({ role, callId, address } = {}) => {
  const wallets = await getWalletsAtCallId(callId);
  if (role === undefined && address === undefined) return wallets;
  const w2 = wallets.filter(
    (w) => (role === undefined || w.role === role)
    && (address === undefined || w.address.toLowerCase() === address.toLowerCase()),
  );
  return w2;
};

export {
  dbExists, getDb, getWalletsAtCallId, getWallets,
};
