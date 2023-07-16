import { Argv } from 'yargs';
import { parseAmt } from '../utils.js';
import Command, { StatesForHandler } from './index.js';
import { SpinnerType } from '../io/state.js';
import { verifyAlias, verifyRpc } from './utils.js';

class NetworkAdd extends Command {
  override _command() {
    return 'nadd [alias] [rpc] [chainid] [gweiGasPrice]';
  }

  override _description() {
    return 'Add a network';
  }

  override _builder() {
    return (args: Argv) =>
      args
        .positional('alias', {
          type: 'string',
          describe: 'Alias of the network',
        })
        .positional('rpc', {
          type: 'string',
          describe: 'RPC url of the network',
        })
        .positional('chainid', {
          type: 'number',
          describe: 'Chain id of the network',
        })
        .positional('gweiGasPrice', {
          type: 'string',
          describe: 'Gas price, X as eth, Xg as X gwei, XeN as X * 10^N wei',
        });
  }

  override async _handler({ args, io, db }: StatesForHandler) {
    const alias =
      (await verifyAlias(args.alias as string, io, db)) ?? undefined;
    if (alias === undefined) {
      io.err('NetworkAdd: Invalid alias');
      return;
    }
    // validate alias

    const rpc = (args.rpc as string) ?? undefined;
    if (rpc === undefined) {
      io.err('NetworkAdd: Invalid rpc');
      return;
    }
    if (await verifyRpc(rpc, io, db)) {
      return;
    }
    // validate rpc

    const chainId = (args.chainid as number) ?? undefined;
    if (chainId === undefined) {
      io.err('NetworkAdd: Invalid chainid');
      return;
    }
    // validate chainid

    let gweiGasPrice;
    try {
      gweiGasPrice =
        args.gweiGasPrice === undefined
          ? BigInt(0)
          : parseAmt(args.gweiGasPrice as string);
    } catch {
      io.err(
        'NetworkAdd: Failed to parse gasPrice, please check the format, must be X as eth, Xg as X gwei, XeN as X * 10^N wei',
      );
      return;
    }
    // validate gweiGasPrice

    db.addNetwork([
      {
        id: 1 + (await db.getLargestNetworkid()),
        alias,
        rpc,
        chainId,
        gas: gweiGasPrice,
      },
    ]);
    db.write();
    io.spinner(
      'networkadd',
      `Network "${alias}" added successfully`,
      SpinnerType.SUCCEED,
    );
  }
}

export default NetworkAdd;
