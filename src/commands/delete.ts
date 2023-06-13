import Command from './index.js';
import AuthStateCli from '../auth/state/cli.js';

class Delete extends Command {
  override _command() {
    return 'delete';
  }

  override _description() {
    return 'Delete all files created by this app';
  }

  override _handler() {
    return async () => {
      this._guardSpkg();
      await this._appState?.auth.authGuard(async () => {
        const response = this._appState?.io?.prompt('Are you sure you want to delete all files created by this app? (y/n) ') ?? 'n';
        if (/(Y|y).*/i.test(response)) {
          if (AuthStateCli.deleteEnv()) this._appState?.io?.print('Deleted session file');
          if (await this._appState?.db.purge()) {
            this._appState?.io?.print('Deleted database file');
          } else {
            this._appState?.io?.print('No database file found to delete');
          }
        } else {
          this._appState?.io?.print('Aborted');
        }
      });
    };
  }
}

export default Delete;
