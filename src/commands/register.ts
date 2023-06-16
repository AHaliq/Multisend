import { Argv } from 'yargs';
import { Wallet } from 'ethers';
import Command, { StatesForHandler } from './index.js';
import {
  StrOfWalletRole, WalletRoles, roleStrToId,
} from '../db/schema.js';
import { promptFundingChangeRole } from './utils.js';
import { SpinnerType } from '../io/state.js';

class Register extends Command {
  override _command() {
    return 'wadd [privatekey]';
  }

  override _description() {
    return 'Register a new wallet';
  }

  override _builder() {
    return (args: Argv) => args
      .positional('privatekey', {
        type: 'string',
        describe: 'Private key of the wallet',
      })
      .option('role', {
        alias: 'r',
        type: 'string',
        describe: 'Role of the wallet',
        default: 'transaction',
      });
  }

  override async _handler({
    args, db, io, signer,
  } : StatesForHandler) {
    const pk = args.privatekey as string;
    const role = args.role as string;
    // get args

    const ri = roleStrToId(role);
    if (ri === undefined) {
      io.err(`Register: Invalid role "${role}", must be one of ${StrOfWalletRole.join(', ')}`);
      return;
    }
    // validate role

    if (pk === undefined) {
      io.err('Register: private key is required');
      return;
    }
    let wallet : Wallet;
    try {
      wallet = new Wallet(pk);
    } catch (e) {
      io.err('Register: private key is invalid');
      return;
    }
    // validate pk

    const id = (await db.getLargestWid() ?? 0) + 1;
    // get next wallet id

    if (ri === WalletRoles.FUNDING
            && this._appState !== undefined
            && await promptFundingChangeRole({ io, db })) {
      return;
    }
    // handle funding wallet

    const failed = await db.addWallets([{
      id,
      role: ri,
      address: wallet.address,
      pk: signer.sign(wallet.privateKey),
    }]) ?? [];
    // register wallet

    if (failed.length === 0) {
      io.spinner('register', '');
      io.spinner('register', `Successfully registered wallet ${wallet.address}`, SpinnerType.SUCCEED);
      await db.write();
      return;
    }
    // success

    const [w] = failed;
    // get first failing wallet

    if (w === undefined) throw new Error('Register: failed to get first failing wallet');
    const wdb = (await db.getWallets({ address: w.address }))?.[0]
              ?? undefined;
    if (wdb === undefined) throw new Error('Register: failed to get matching wallet in db');
    // get existing in db

    if (wdb.pk === undefined
              && db.updateWalletPk(wdb.id, signer.sign(pk))
              && db.updateWalletRole(wdb.id, ri)) {
      io.spinner('register', '');
      io.spinner('register', `Unpurged wallet ${wallet.address}`, SpinnerType.SUCCEED);
      await db.write();
      return;
    }
    // unpurge wallet if in db is purged

    io.err('Register: Wallet already exist in database:');
    io.print(`${failed.map((w) => w.address).join('\n')}`);
    // failed to register
  }
}

export default Register;
