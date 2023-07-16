import Command from './index.js';

class Login extends Command {
  override _command() {
    return 'login';
  }

  override _description() {
    return 'Log in by creating or reading a session file';
  }

  override async _handler() {
    this._appState?.io.print('Logged in successfully');
    this._appState?.db.write();
  }
}

export default Login;
