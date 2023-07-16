import { Argv } from 'yargs';
import Command, { StatesForHandler } from './index.js';
import { objsToTableStr } from './utils.js';

class NetworkQuery extends Command {
  override _command() {
    return 'nls';
  }

  override _description() {
    return 'Get registered network info in the db';
  }

  override _builder() {
    return async (args: Argv) =>
      args
        .option('alias', {
          alias: 'a',
          type: 'string',
          describe: 'Alias of the network',
        })
        .option('rpc', {
          alias: 'r',
          type: 'string',
          describe: 'RPC url of the network',
        });
  }

  override async _handler({ args, io, db }: StatesForHandler) {
    const alias = args.alias as string | undefined;
    const rpc = args.rpc as string | undefined;
    const filterObj: { alias?: string; rpc?: string } = {};
    if (alias !== undefined) filterObj.alias = alias;
    if (rpc !== undefined) filterObj.rpc = rpc;
    const ns = await db.getNetworks(filterObj);
    if (ns.length === 0) {
      io.print(
        alias === undefined
          ? 'No networks registered'
          : `No network registered with alias "${alias}"`,
      );
      return;
    }
    const str = objsToTableStr(ns);
    io.print(str);
  }
}

export default NetworkQuery;
