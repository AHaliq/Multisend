import { Argv } from 'yargs';
import Command, { StatesForHandler } from './index.js';
import { getWalletFiltersOption, walletFiltersBuilder } from './utils.js';
import { PurgeState, PurgeStates } from '../db/state.js';
import { SpinnerType } from '../io/state.js';

class Purge extends Command {
  override _command() {
    return 'wpurge';
  }

  override _description() {
    return 'Delete privatekey from wallet';
  }

  override _builder() {
    return async (args: Argv) => walletFiltersBuilder(args);
  }

  override async _handler({ args, db, io }: StatesForHandler) {
    const filter = getWalletFiltersOption(args);
    const ws =
      (await db.getWallets({
        ...filter,
        purgeState: PurgeStates.UNPURGED as PurgeState,
      })) ?? [];

    if (ws.length === 0) {
      io.print('No unpurged wallets matching the filter found');
      return;
    }
    // verify matching wallets exists

    io.print(`To Purge:\n- ${ws.map(w => w.address).join('\n- ')}`);
    if (
      !io.promptYN(
        `confirm purging the ${ws.length} above mentioned wallet(s)?`,
      )
    ) {
      io.print('Aborted');
      return;
    }
    // prompt confirmation

    const ids = ws.map(w => w.id);
    await db.purgeWalletById(ids);
    io.spinner('purge', `Purged ${ids.length} wallets`, SpinnerType.SUCCEED);
    db.write();
  }
}

export default Purge;
