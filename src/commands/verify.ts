import { Wallet } from 'ethers';
import Command, { StatesForHandler } from './index.js';
import { asyncFilter } from '../utils.js';
import { SpinnerType } from '../io/state.js';

class Verify extends Command {
  override _command() {
    return 'wverify';
  }

  override _description() {
    return 'Verify all wallets in database';
  }

  override async _handler({ signer, io, db } : StatesForHandler) {
    io.spinner('verify', 'Verifying wallets...');
    const ws = await db.getWallets({}, signer) ?? [];
    const failed = await asyncFilter(
      ws,
      (async (w, i) => {
        try {
          io.spinner('verify', `Verifying (${i}/${ws.length}) ${w.address}...`);
          const genAddr = (await new Wallet(w.pk ?? '').getAddress()).toUpperCase();
          const dbAddr = w.address.toUpperCase();
          return genAddr !== dbAddr;
        } catch {
          return true;
        }
      }),
    );
    // get wallets failing verification

    if (failed.length > 0) {
      io.err(`${failed.length} wallet(s) failed verification:`);
      io.print(`${failed.map((w) => w.address).join('\n')}`);
      return;
    }
    io.spinner('verify', 'All wallets verified successfully', SpinnerType.SUCCEED);
  }
}

export default Verify;
