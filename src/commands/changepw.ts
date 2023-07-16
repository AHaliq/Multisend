import AppSigner from '../auth/index.js';
import AuthStateCli from '../auth/state/cli.js';
import Command, { StatesForHandler } from './index.js';

class ChangePw extends Command {
  override _command() {
    return 'changepw';
  }

  override _description() {
    return 'Change password';
  }

  override async _handler({ io, db }: StatesForHandler) {
    let pw;
    while (pw === undefined || pw === '') {
      pw = io.prompt('Enter new password', true);
      if (pw === undefined || pw === '') {
        io.print('Password cannot be empty');
      }
    }
    // get new password from user

    const newSigner = new AppSigner(pw);
    // create new signer with new password

    this._appState?.db.updateWalletsNewPassword(newSigner);
    // update all wallets with new password

    this._appState?.db.setAuth(newSigner.genAuthCipher());
    // update auth cipher in db

    AuthStateCli.writeEnv(pw);
    // update .env file with new password

    db.write();
    io.print('Password changed successfully');
  }
}

export default ChangePw;
