import fs from 'fs';
import { ArgumentsCamelCase, Argv } from 'yargs';
import Command from './index.js';
import { getWalletFiltersOption, objsToTableStr, walletFiltersBuilder } from './utils.js';

class Query extends Command {
  override _command() {
    return 'wls';
  }

  override _description() {
    return 'Query wallet details';
  }

  override _builder() {
    return async (args: Argv) => walletFiltersBuilder(args)
      .option('pk', {
        type: 'boolean',
        default: false,
        describe: 'Show private key only',
      })
      .option('all', {
        type: 'boolean',
        default: false,
        describe: 'Show all wallet info if pk is true',
      })
      .option('pkAll', {
        type: 'boolean',
        default: false,
        describe: 'Show private key and all wallet info',
      })
      .option('out', {
        alias: 'o',
        type: 'string',
        default: undefined,
        describe: 'Output file',
      });
  }

  override _handler() {
    return async (args: ArgumentsCamelCase) => {
      this._guardSpkg(async ({ signer, io, db }) => {
        const pkAll = args.pkAll as boolean;
        const isPk = pkAll || args.pk as boolean;
        const isAll = pkAll || args.all as boolean;
        const out = args.out as string | undefined;
        const filter = getWalletFiltersOption(args);
        let str : string;
        const ws = (await db.getWallets(filter, signer) ?? []);
        if (isPk) {
          if (!isAll) {
            str = ws.map((w) => w.pk).join('\n');
            // list or write private keys only
          } else if (out) {
            str = JSON.stringify(ws);
            // write all wallet info as json
          } else {
            str = objsToTableStr(ws, [4, 23, 15, 35], true);
            // list all wallet info as table
          }
        } else {
          const wsNoPk = ws.map((w) => ({
            id: w.id, role: w.role, address: w.address,
          }));
          if (out) {
            str = JSON.stringify(wsNoPk);
            // write wallet info except pk as json
          } else {
            str = objsToTableStr(wsNoPk);
            // list wallet info except pk as table
          }
        }
        if (out) {
          fs.writeFileSync(out, str);
          // write file
        } else {
          io.print(str === '' ? 'No data to show' : str);
          // list to console
        }
      });
    };
  }
}

export default Query;
