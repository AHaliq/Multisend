import fs from 'fs';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

/**
 * Filename of the database
 */
const DBNAME = 'db.json';

/**
 * @returns {boolean} true if db exists
 */
const dbExists = () => fs.existsSync(DBNAME);

/**
 * Returns a lowdb instance
 * @param {boolean} read if true will load the database
 * @param {object} defaultData used by initial migration
 * @returns
 */
const getDb = async (read = true, defaultData = {}) => {
  const adapter = new JSONFile(DBNAME);
  const db = new Low(adapter, defaultData);
  if (read) await db.read();
  return db;
};

/**
 * Retrieve wallets from the database with optional callId filter
 * @param {number} callId
 * @returns
 */
const getWalletsAtCallId = async (callId) => {
  const db = await getDb();
  const { wallets, calls } = db.data;
  if (callId === undefined) return wallets;

  const callWallets = calls.filter((c) => c.callId === callId).map((c) => c.id);
  return wallets.filter((w) => callWallets.includes(w.id));
};

/**
 * Retrieve wallets from the database
 * @param {{number, number, string}} param0 filter arguments of role, callId, and address
 * @returns {array<wallet>} wallets
 */
const getWallets = async ({ role, callId, address } = {}) => {
  const wallets = await getWalletsAtCallId(callId);
  if (role === undefined && address === undefined) return wallets;
  const w2 = wallets.filter(
    (w) => (role === undefined || w.role === role)
    && (address === undefined || w.address.toLowerCase() === address.toLowerCase()),
  );
  return w2;
};

/**
 * Get the largest number in the given array of objects for the given key
 * @param {array} objs
 * @param {string} key
 * @returns
 */
const getLargest = (objs, key) => objs.reduce((acc, obj) => Math.max(acc, obj[key]), 0);

export {
  dbExists, getDb, getWalletsAtCallId, getWallets, getLargest,
};
