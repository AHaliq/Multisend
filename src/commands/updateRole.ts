import { Argv } from 'yargs';
import Command, { StatesForHandler } from './index.js';
import {
  getWalletFiltersOption,
  promptFundingChangeRole,
  walletFiltersBuilder,
} from './utils.js';
import { StrOfWalletRole, WalletRoles, roleStrToId } from '../db/schema.js';

class UpdateRole extends Command {
  override _command() {
    return 'wupdate [setRole]';
  }

  override _description() {
    return 'Update a wallet role';
  }

  override _builder() {
    return async (args: Argv) =>
      walletFiltersBuilder(args).positional('setRole', {
        type: 'string',
        describe: 'Role to set',
      });
  }

  override async _handler({ args, db, io }: StatesForHandler) {
    const setRole =
      args.setRole === undefined
        ? undefined
        : roleStrToId(args.setRole as string);
    if (setRole === undefined) {
      io.err(
        `UpdateRole: Invalid role "${
          args.setRole
        }", must be one of ${StrOfWalletRole.join(', ')}`,
      );
      return;
    }
    // verify setRole

    const filter = getWalletFiltersOption(args);
    const ws = await db.getWallets(filter);
    if (ws.length === 0) {
      io.print(' No wallets found');
      return;
    }
    // get wallets

    if (setRole === WalletRoles.FUNDING) {
      if (ws.length > 1) {
        io.err(
          'UpdateRole: Invalid number of wallets, must be exactly 1 for "funding" role',
        );
        return;
      }
      if (await promptFundingChangeRole({ db, io })) {
        io.print('Aborted');
        return;
      }
    }
    // verify when role is funding

    io.print(`To Update:\n- ${ws.map(w => w.address).join('\n- ')}`);
    if (
      !io.promptYN(
        `confirm set role "${StrOfWalletRole[setRole]}" to the ${ws.length} above mentioned wallet(s)?`,
      )
    ) {
      io.print('Aborted');
      return;
    }
    // prompt confirmation

    if (
      !db.updateWalletRole(
        ws.map(w => w.id),
        setRole,
      )
    ) {
      io.err('UpdateRole: Failed to update wallet role');
      return;
    }
    io.print(
      `Updated ${ws.length} wallet${ws.length === 1 ? '' : 's'} to role "${
        StrOfWalletRole[setRole]
      }"`,
    );
    await db.write();
  }
}

export default UpdateRole;
