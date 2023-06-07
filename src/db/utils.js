import fs from 'fs';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const DBNAME = 'db.json';

const dbExists = () => fs.existsSync(DBNAME);

const getDb = (defaultData = {}) => {
  const adapter = new JSONFile(DBNAME);
  const db = new Low(adapter, defaultData);
  return db;
};

export {
  dbExists, getDb,
};
