import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import Logout from './commands/logout.js';
import AppState from './state/index.js';
import Command from './commands/index.js';

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

  const cmds : Command[] = [new Logout(s)];
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
