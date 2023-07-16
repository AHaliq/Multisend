import { Argv } from 'yargs';
import { JsonRpcProvider, ethers, Wallet } from 'ethers';
import { getLargest } from '../utils.js';
import { StatePkg } from '../index.js';
import Command, { StatesForHandler } from './index.js';
import { objsToTableStr, walletFiltersBuilder } from './utils.js';
import { defaultOps, op, opsmap } from './opsDefinitions.js';
import {
  Call,
  Network,
  Tx,
  TxStatuses,
  WalletPretty,
  WalletRoles,
} from '../db/schema.js';
import { SpinnerType } from '../io/state.js';

type ValidatorErrors = { err: 'safe' | 'critical' };
type ValidatorSuccess<T> = { err: 'none'; value: T };
type NetworkValidatorSuccess = ValidatorSuccess<{
  network: Network;
  gasPrice: bigint;
  provider: JsonRpcProvider;
}>;

class Ops extends Command {
  #ops;

  constructor(s?: StatePkg, ops: opsmap = {}) {
    super(s);
    this.#ops = { ...defaultOps, ...ops };
  }

  override _command() {
    return 'op [opName] [networkAlias] [args]';
  }

  override _description() {
    return 'Run an operation';
  }

  override _builder() {
    return async (args: Argv) =>
      walletFiltersBuilder(args)
        .option('retry', {
          alias: 'r',
          type: 'number',
          coerce: value => (value === '' ? -1 : parseInt(value, 10)),
          describe:
            'Retry failed transaction for a given callId, last call if none provided, wallet filter callId will be ignored with this flag',
        })
        .option('list', {
          alias: 'ls',
          type: 'boolean',
          default: false,
          describe:
            'List available ops, if true, will not run any op but just list them',
        })
        .option('gasOverride', {
          alias: 'g',
          type: 'number',
          describe: 'Override gas price in gwei for the operation',
        })
        .option('withFunding', {
          alias: 'f',
          type: 'boolean',
          default: false,
          describe: 'Run operation on funding wallet too',
        })
        .option('onlyFunding', {
          alias: 'o',
          type: 'boolean',
          default: false,
          describe: 'Run operation only on funding wallet',
        })
        .positional('opName', {
          type: 'string',
          describe: 'Name of the operation to run',
        })
        .positional('networkAlias', {
          type: 'string',
          describe: 'Alias of the network to run the operation on',
        })
        .positional('args', {
          type: 'string',
          describe: 'Arguments for the operation',
          default: '',
        });
  }

  #listHandler({ io }: StatesForHandler) {
    io.print(
      objsToTableStr(
        Object.entries(this.#ops).map(([name, op]) => ({
          name,
          description: op.description,
        })),
        [20, 60],
        true,
        true,
      ),
    );
  }

  #opValidatorHandler(
    opName: unknown,
    { io }: StatesForHandler,
  ): ValidatorErrors | ValidatorSuccess<op> {
    const opStr = opName as string;
    const op = this.#ops[opStr];
    if (op === undefined) {
      io.err(`Ops: No op named "${opName}"`);
      return { err: 'safe' };
    }
    return { err: 'none', value: op };
  }

  async #networkValidatorHandler(
    networkAlias: unknown,
    gasOverride: unknown,
    { io, db }: StatesForHandler,
  ): Promise<ValidatorErrors | NetworkValidatorSuccess> {
    const network = await db.getNetwork(networkAlias as string);
    if (network === undefined) {
      io.err(`Ops: No network named "${networkAlias}"`);
      return { err: 'safe' };
    }
    // get network entry

    const provider = new ethers.JsonRpcProvider(network.rpc);
    try {
      await provider.getBlockNumber();
    } catch {
      io.err(
        `Ops: Could not connect to network "${networkAlias}" at "${network.rpc}", try a different network or check your internet connection`,
      );
      return { err: 'critical' };
    }
    // check rpc url is valid

    const gasPrice =
      gasOverride !== undefined
        ? BigInt(gasOverride as number)
        : network.gas !== undefined
        ? BigInt(network.gas ?? 0)
        : (await provider.getFeeData()).gasPrice;
    if (gasPrice === null) {
      io.err(
        'Ops: Could not get gas price, provide in network definition or gasOverride flag',
      );
      return { err: 'safe' };
    }
    // get gas price
    return { err: 'none', value: { network, provider, gasPrice } };
  }

  async #fundingValidatorHandler(
    provider: JsonRpcProvider,
    { db, signer, io }: StatesForHandler,
  ): Promise<ValidatorErrors | ValidatorSuccess<Wallet>> {
    const fundingEntry = (
      await db.getWallets({ role: WalletRoles.FUNDING }, signer)
    )?.[0];
    if (fundingEntry === undefined) {
      io.err('Ops: No funding wallet found');
      return { err: 'safe' };
    }
    // get funding entry

    if (fundingEntry.pk === undefined) {
      io.err('Ops: Funding wallet missing privatekey');
      return { err: 'safe' };
    }
    // check not purged

    const funding = new ethers.Wallet(fundingEntry.pk, provider);
    // create ethers wallet
    return { err: 'none', value: funding };
  }

  async #getOpParams(
    retry: unknown,
    opArgs: unknown,
    onlyFunding: unknown,
    withFunding: unknown,
    { db, signer }: StatesForHandler,
  ) {
    let ws;
    let toArg: string | undefined;
    const callId =
      retry === -1 || retry === undefined
        ? getLargest((await db.getCalls()) as Call[], 'id') +
          (retry === undefined ? 1 : 0)
        : (retry as number);
    // get call id

    if (retry !== undefined) {
      ws = await db.getWallets({ callId, callIdFails: true }, signer);
      // get transacting wallet entries from call id

      toArg =
        opArgs !== undefined
          ? undefined
          : (await db.getCalls(callId))?.[0]?.args;
      // get args from call id if no args provided
    } else {
      ws = await db.getWallets(
        onlyFunding
          ? { role: WalletRoles.FUNDING }
          : !withFunding
          ? { role: WalletRoles.TRANSACTION }
          : {},
        signer,
      );
      // get all transacting wallet entries
    }

    toArg =
      toArg !== undefined
        ? toArg
        : opArgs === undefined
        ? ''
        : (opArgs as string);
    // get args from argument

    return { ws, toArg, callId };
  }

  async runOp(
    retry: unknown,
    callId: number,
    provider: JsonRpcProvider,
    network: Network,
    op: op,
    toArg: string,
    funding: Wallet,
    ws: WalletPretty[],
    gasPrice: bigint,
    sfh: StatesForHandler,
  ) {
    const { db, io } = sfh;
    if (retry === undefined)
      await db.addCall(op.name, network.id, op.description, toArg);
    // create new call entry

    let txid = getLargest((await db.getTxs()) as Tx[], 'id');
    const args = op.parseArgs(toArg, sfh);
    // get latest ids

    const sigintfails: (Tx | null)[] = [];
    // collate sigint fails

    const exListener = async () => {
      db.addTxs(
        (sigintfails.filter(x => x !== null) as Tx[]).map(tx => ({
          ...tx,
          id: ++txid,
        })),
      );
      db.write();
    };
    process.on('exit', exListener);
    // add fail entries

    await Promise.all(
      ws.map(async w => {
        const addr = `wid ${w.id}, ${w.address.slice(0, 7)}`;
        const outa = (msg: string, t: SpinnerType) =>
          io.spinner(`${w.id}`, `${addr} - ${msg}`, t);
        try {
          if (w.pk !== undefined) {
            const transacting = new ethers.Wallet(w.pk, provider);
            const out = (msg: string) => outa(msg, SpinnerType.PLAIN);
            out('started');
            // prepare spinners

            const sigintindex =
              sigintfails.push({
                id: 0,
                callId,
                walletId: w.id,
                desc: 'sigint',
                status: TxStatuses.ERROR,
                timestamp: Date.now(),
              }) - 1;
            // prepare for sigint fail

            const res = await op.func({
              funding,
              transacting,
              provider,
              gasPrice,
              db,
              out,
              args,
            });
            // execute operation

            sigintfails[sigintindex] = null;
            // remove from sigint entry

            db.addTxs([
              {
                id: ++txid,
                callId,
                walletId: w.id,
                desc:
                  res === undefined ? 'success' : (res as object).toString(),
                status: TxStatuses.SUCCESS,
                timestamp: Date.now(),
              },
            ]);
            // add tx entry

            outa(`${res ?? 'success'}`, SpinnerType.SUCCEED);
            // print succeed
          } else {
            outa(`no pk, skipped`, SpinnerType.FAILED);
            // skip if no pk

            db.addTxs([
              {
                id: ++txid,
                callId,
                walletId: w.id,
                desc: 'no pk, skipped',
                status: TxStatuses.ERROR,
                timestamp: Date.now(),
              },
            ]);
            // add tx entry
          }
        } catch (e) {
          const errMsg = (e as Error).message;
          outa(`${errMsg}`, SpinnerType.FAILED);
          // catch exception and print error

          db.addTxs([
            {
              id: ++txid,
              callId,
              walletId: w.id,
              desc: (e as Error).message,
              status: TxStatuses.ERROR,
              timestamp: Date.now(),
            },
          ]);
          // add tx entry
        }
      }),
    );
    process.removeListener('exit', exListener);
  }

  override async _handler(sfh: StatesForHandler) {
    const { args, db } = sfh;
    if (args.list as boolean) {
      this.#listHandler(sfh);
      return;
    }
    // list all ops

    const opValRes = this.#opValidatorHandler(args.opName, sfh);
    if (opValRes.err === 'safe') return;
    const op = (opValRes as ValidatorSuccess<op>).value;
    // validate operation

    const netValRes = await this.#networkValidatorHandler(
      args.networkAlias,
      args.gasOverride,
      sfh,
    );
    if (netValRes.err === 'critical') process.exit(1);
    if (netValRes.err === 'safe') return;
    const { network, provider, gasPrice } = (
      netValRes as NetworkValidatorSuccess
    ).value;
    // validate network

    const fundValRes = await this.#fundingValidatorHandler(provider, sfh);
    if (fundValRes.err === 'safe') return;
    const funding = (fundValRes as ValidatorSuccess<Wallet>).value;
    // get funding wallet

    const { ws, toArg, callId } = await this.#getOpParams(
      args.retry,
      args.args,
      args.onlyFunding,
      args.withFunding,
      sfh,
    );
    // get op params

    await this.runOp(
      args.retry,
      callId,
      provider,
      network,
      op,
      toArg,
      funding,
      ws,
      gasPrice,
      sfh,
    );
    db.write();
  }
}

export default Ops;
// TODO default network flag?
