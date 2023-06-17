import AppSigner from '../auth/index.js';
import AppState from '../state/index.js';
import migration0 from './0000_initial.js';
import migration1 from './0001_networks.js';
import DbState from './state.js';

type Migration = (db:DbState, signer:AppSigner) => Promise<DbState>;

const migration = async (state: AppState, signer: AppSigner, migrationNumber = 0) => {
  const ms: Migration[] = [migration0, migration1];
  ms.splice(0, migrationNumber);
  ms.reduce(async (db : Promise<DbState>, m) => m(await db, signer), Promise.resolve(state.db));
};

export default migration;
