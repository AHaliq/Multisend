import { Argv } from 'yargs';
import { ethers } from 'ethers';
import Command, { StatesForHandler } from './index.js';
import { StrOfWalletRole, WalletRoles, roleStrToId } from '../db/schema.js';
import { SpinnerType } from '../io/state.js';
import { promptFundingChangeRole } from './utils.js';

class Create extends Command {
  override _command() {
    return 'wcreate [number]';
  }

  override _description() {
    return 'Create a new wallet';
  }

  override _builder() {
    return (args: Argv) =>
      args
        .positional('number', {
          type: 'number',
          describe: 'Number of wallets to create',
          default: 1,
        })
        .option('role', {
          alias: 'r',
          type: 'string',
          describe: 'Role of the wallet',
          default: StrOfWalletRole[WalletRoles.TRANSACTION],
        });
  }

  override async _handler({ signer, io, db, args }: StatesForHandler) {
    const number = Math.ceil(args.number as number);
    const role = args.role as string;
    // get args

    const ri = roleStrToId(role);
    if (ri === undefined) {
      io.err(
        `Create: Invalid role "${role}", must be one of ${StrOfWalletRole.join(
          ', ',
        )}`,
      );
      return;
    }
    // validate role

    if (number <= 0) {
      io.err('Create: Invalid number of wallets, must be 1 or more');
      return;
    }
    // validate number

    if (ri === WalletRoles.FUNDING && number > 1) {
      io.err(
        'Create: Invalid number of wallets, must be exactly 1 for "funding" role',
      );
      return;
    }
    // validate funding number
    const id = ((await db.getLargestWid()) ?? 0) + 1;
    // get next wallet id

    if (
      ri === WalletRoles.FUNDING &&
      this._appState !== undefined &&
      (await promptFundingChangeRole({ io, db }))
    ) {
      return;
    }
    // handle funding wallet

    const failed =
      (await db.addWallets(
        [...Array(number).keys()]
          .map(() => ethers.Wallet.createRandom())
          .map((w, i) => {
            const epk = signer.sign(w.privateKey);
            if (epk === undefined)
              throw new Error('Create: Failed to encrypt private key');
            // encrypt private key

            io.spinner('create', `${i + 1}/${number}`);
            // show spinner

            return {
              id: id + i,
              role: ri,
              address: w.address,
              pk: epk,
            };
          }),
      )) ?? [];
    if (failed.length > 0) {
      io.err(
        `Create: Randomly created new wallet unexpectedly already exist in database:\n${failed
          .map(w => w.address)
          .join('\n')}`,
      );
      return;
    }
    // create new wallets

    io.spinner(
      'create',
      `Created ${number} wallet${number > 1 ? 's' : ''} successfully`,
      SpinnerType.SUCCEED,
    );

    db.write();
  }
}

export default Create;
