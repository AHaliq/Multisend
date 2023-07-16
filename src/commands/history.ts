import { Argv } from 'yargs';
import Command, { StatesForHandler } from './index.js';
import { objsToTableStr } from './utils.js';

class History extends Command {
  override _command() {
    return 'cls';
  }

  override _description() {
    return 'View history of top level calls made';
  }

  override _builder() {
    return async (args: Argv) =>
      args
        .option('all', {
          alias: 'a',
          type: 'boolean',
          default: false,
          describe: 'Show all call ids',
        })
        .option('cid', {
          alias: 'c',
          type: 'number',
          describe: 'Show transaction details of the call id',
        });
  }

  override async _handler({ args, db, io }: StatesForHandler) {
    const cid = (args.cid as number) ?? (await db.getLargestCallid());
    const all = (args.all as boolean) ?? false;
    if (all) {
      const cs = await db.getCalls(undefined, true);
      const str = objsToTableStr(cs);
      io.print(str);
      return;
    }
    const cs = await db.getCalls(cid, true);
    const ts = await db.getTxs(cid, true);
    const str1 = objsToTableStr(cs);
    const str2 = objsToTableStr(ts);
    io.print(str1);
    io.print(str2);
  }
}

export default History;
