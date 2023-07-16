import AuthStateCli from '../auth/state/cli.js';
import AuthState from '../auth/state/index.js';
import IOState from '../io/state.js';
import DbState from '../db/state.js';
import AppSigner from '../auth/index.js';

type GuardCallback = ({
  db,
  signer,
  io,
}: {
  db: DbState;
  signer: AppSigner;
  io: IOState;
}) => void | Promise<void>;
class AppState {
  db: DbState;

  auth: AuthState;

  io: IOState;

  constructor(db?: DbState, auth?: AuthState, io?: IOState) {
    this.io = io || new IOState();
    this.auth = auth || new AuthStateCli(this);
    this.db = db || new DbState(this);
  }

  guard(callback: GuardCallback) {
    return this.auth.authGuard(signer => {
      callback({ db: this.db, signer, io: this.io });
    });
  }
}
export default AppState;
export { GuardCallback };
