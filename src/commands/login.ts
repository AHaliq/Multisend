import Command from './index.js';

class Login extends Command {
  override _command() {
    return 'login';
  }

  override _description() {
    return 'Log in by creating or reading a session file';
  }

  override _handler() {
    return async () => {
      this._guardSpkg(async () => {
        this._appState?.io.print('Logged in successfully');
        await this._appState?.db.write();
      });
    };
  }
}

export default Login;
