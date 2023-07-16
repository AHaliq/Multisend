import { Argv } from 'yargs';
import { parseAmt } from '../utils.js';
import Command, { StatesForHandler } from './index.js';
import { verifyAlias } from './utils.js';

class NetworkUpdate extends Command {
  override _command() {
    return 'nset [alias]';
  }

  override _description() {
    return 'Update network info in the db';
  }

  override _builder() {
    return async (args: Argv) =>
      args
        .positional('alias', {
          type: 'string',
          describe: 'Exact alias of the network',
        })
        .option('rpc', {
          type: 'string',
          describe: 'RPC url of the network',
        })
        .option('chainid', {
          type: 'number',
          describe: 'Chain id of the network',
        })
        .option('gweiGasPrice', {
          type: 'number',
          describe: 'Gas price in gwei',
        })
        .option('rename', {
          type: 'string',
          describe: 'New alias of the network',
        });
  }

  override async _handler({ args, io, db }: StatesForHandler) {
    const alias = args.alias as string | undefined;
    if (alias === undefined) {
      io.err('NetworkUpdate: Invalid alias');
      return;
    }
    // validate alias

    const rpc = args.rpc as string | undefined;
    // validate rpc

    const chainId = args.chainid as number | undefined;
    // validate chainid

    let gweiGasPrice: bigint | undefined;
    try {
      gweiGasPrice =
        args.gweiGasPrice !== undefined
          ? parseAmt(args.gweiGasPrice as string)
          : undefined;
    } catch {
      io.err(
        'NetworkUpdate: Failed to parse gasPrice, please check the format, must be X as eth, Xg as X gwei, XeN as X * 10^N wei',
      );
      return;
    }
    // validate gweiGasPrice

    const rename =
      args.rename === undefined
        ? undefined
        : await verifyAlias(args.rename as string, io, db);
    // validate rename

    if (!(await db.updateNetwork(alias, rpc, chainId, gweiGasPrice, rename))) {
      io.err(`NetworkUpdate: No network registered with alias "${alias}"`);
      return;
    }
    db.write();
    io.print(`Network "${alias}" updated`);
  }
}

export default NetworkUpdate;
