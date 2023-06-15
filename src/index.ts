import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import AppState from './state/index.js';
import Command from './commands/index.js';
import Logout from './commands/logout.js';
import Login from './commands/login.js';
import Delete from './commands/delete.js';
import ChangePw from './commands/changepw.js';
import Create from './commands/create.js';
import Register from './commands/register.js';
import Query from './commands/query.js';
import Verify from './commands/verify.js';
import Purge from './commands/purge.js';
import UpdateRole from './commands/updateRole.js';

type ExitCallback = () => void;
type ExitCallbackWrapper = { func: null | ExitCallback };
type StateGenerator = () => AppState;
type StatePkg = { genState: StateGenerator; onExit: ExitCallbackWrapper };

const multisend = (
  // ops = [],
  onExit:{func: null | ExitCallback } = { func: null },
) => {
  const genState:StateGenerator = () => new AppState();
  const s:StatePkg = { genState, onExit };
  // prepare state generator

  const cmds : Command[] = [
    new Login(s),
    new Logout(s),
    new Delete(s),
    new ChangePw(s),
    // auth
    new Create(s),
    new Register(s),
    new Query(s),
    new Verify(s),
    new Purge(s),
    new UpdateRole(s),
    // wallet
  ];
  cmds.reduce(
    (ya, cmd) => ya.command(cmd.gen()),
    yargs(hideBin(process.argv)),
  ).parse();
  // run cli app

  process.on('exit', () => {
    if (s.onExit.func !== null) s.onExit.func();
  });
  // run cleanup
};

export default multisend;
export { StatePkg };
