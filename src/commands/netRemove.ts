import { Argv } from 'yargs';
import Command, { StatesForHandler } from './index.js';
import { SpinnerType } from '../io/state.js';

class NetworkRemove extends Command {
  override _command() {
    return 'nrm [alias]';
  }

  override _description() {
    return 'Remove a network from the db';
  }

  override _builder() {
    return async (args: Argv) =>
      args.positional('alias', {
        type: 'string',
        describe: 'Exact alias of the network',
      });
  }

  override async _handler({ args, io, db }: StatesForHandler) {
    const alias = args.alias as string | undefined;
    if (alias === undefined) {
      io.err('NetworkRemove: Alias must be provided');
      return;
    }
    // validate alias

    if (!(await db.removeNetwork(alias))) {
      io.err(`NetworkRemove: No network registered with alias "${alias}"`);
      return;
    }
    io.spinner('nrm', 'Successfully removed network', SpinnerType.SUCCEED);
    db.write();
  }
}

export default NetworkRemove;
