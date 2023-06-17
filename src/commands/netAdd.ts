import { Argv } from 'yargs';
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
    return (args: Argv) => args
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
        type: 'number',
        default: 0,
        describe: 'Gas price in gwei',
      });
  }

  override async _handler({ args, io, db } : StatesForHandler) {
    const alias = await verifyAlias(args.alias as string, io, db) ?? undefined;
    if (alias === undefined) {
      io.err('NetworkAdd: Invalid alias');
      return;
    }
    // validate alias

    const rpc = args.rpc as string ?? undefined;
    if (rpc === undefined) {
      io.err('NetworkAdd: Invalid rpc');
      return;
    }
    if (await verifyRpc(rpc, io, db)) {
      return;
    }
    // validate rpc

    const chainId = args.chainid as number ?? undefined;
    if (chainId === undefined) {
      io.err('NetworkAdd: Invalid chainid');
      return;
    }
    // validate chainid

    const gweiGasPrice = args.gweiGasPrice as number ?? 0;
    if (gweiGasPrice < 0) {
      io.err('NetworkAdd: Invalid gweiGasPrice. Must be greater than or equal to 0');
      return;
    }
    // validate gweiGasPrice

    db.addNetwork([{
      id: 1 + await db.getLargestNetworkid(),
      alias,
      rpc,
      chainId,
      gas: gweiGasPrice,
    }]);
    await db.write();
    io.spinner('networkadd', `Network "${alias}" added successfully`, SpinnerType.SUCCEED);
  }
}

export default NetworkAdd;
