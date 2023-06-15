import Command from './index.js';
import AuthStateCli from '../auth/state/cli.js';
import { SpinnerType } from '../io/state.js';

class Delete extends Command {
  override _command() {
    return 'delete';
  }

  override _description() {
    return 'Delete all files created by this app';
  }

  override _handler() {
    return async () => {
      this._guardSpkg(async ({ db, io }) => {
        if (io.promptYN('Are you sure you want to delete all files created by this app?')) {
          if (AuthStateCli.deleteEnv()) io.print('Deleted session file');
          if (await db.purge()) {
            io.print('Deleted database file');
          } else {
            io.print('No database file found to delete');
          }
          io.spinner('delete', '');
          io.spinner('delete', 'Delete completed', SpinnerType.SUCCEED);
        } else {
          io.print('Aborted');
        }
      });
    };
  }
}

export default Delete;
