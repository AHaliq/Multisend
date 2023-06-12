import AppSigner from '../auth/index.js';
import AppState from '../state/index.js';
import migration0 from './0000_initial.js';

const migration = (state: AppState, signer: AppSigner, migrationNumber = 0) => {
  [migration0].splice(0, migrationNumber).forEach((m) => m(state.db, signer));
};

export default migration;
