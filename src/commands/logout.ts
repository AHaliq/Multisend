import Command, { StatesForHandler } from './index.js';
import AuthStateCli from '../auth/state/cli.js';

class Logout extends Command {
  override _command() {
    return 'logout';
  }

  override _description() {
    return 'Log out by deleting the session file';
  }

  override async _handler({ io }: StatesForHandler) {
    io.print(
      AuthStateCli.deleteEnv()
        ? 'Logged out successfully'
        : 'Already logged out',
    );
  }
}

export default Logout;
