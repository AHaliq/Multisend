import Command from './index.js';
import AuthStateCli from '../auth/state/cli.js';

class Logout extends Command {
  override _command() {
    return 'logout';
  }

  override _description() {
    return 'Log out by deleting the session file';
  }

  override _handler() {
    return () => {
      this._guardSpkg();
      this._appState?.io?.print(AuthStateCli.deleteEnv() ? 'Logged out successfully' : 'Already logged out');
    };
  }
}

export default Logout;
