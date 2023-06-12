import AuthStateCli from '../auth/state/cli.js';
import AuthState from '../auth/state/index.js';
import IOState from '../io/state.js';
import DbState from '../db/state.js';

class AppState {
  db:DbState;

  auth:AuthState;

  io:IOState;

  constructor(db?:DbState, auth?:AuthState, io?:IOState) {
    this.io = io || new IOState();
    this.auth = auth || new AuthStateCli(this);
    this.db = db || new DbState(this);
  }
}
export default AppState;
