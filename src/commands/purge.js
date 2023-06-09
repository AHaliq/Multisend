import Spinnies from 'terminal-multi-spinners';
import { getSigner } from '../auth/index.js';
import { NOT_LOGGED_IN, rawWalletToTable, promptUser } from './utils.js';
import { builder as wfBuilder, handler as wfHandler } from './walletFilters.js';
import { getDb } from '../db/utils.js';

const command = 'purge';

const description = 'Delete a wallet\'s private key from the database';

const builder = (args) => {
  wfBuilder(args);
};

const handler = async (argv) => {
  const s = getSigner(true);
  if (s === null) {
    console.log(NOT_LOGGED_IN);
  }
  // auth

  const [wallets, err] = await wfHandler(argv, true);
  if (err != null) {
    console.log(err);
    return;
  }

  console.log(rawWalletToTable(wallets));
  // display wallets to delete

  const toDelete = await promptUser(
    'Are you sure you want to purge these wallets? (y/n) ',
    (response) => /^(y|Y)/gm.test(response),
  );
  // confirm deletion

  if (!toDelete) {
    console.log('Aborting...');
    return;
  }
  // abort

  console.log('Purging wallets...');
  const spinnies = new Spinnies();
  const db = await getDb();
  const n = wallets.length;
  let i = 0;
  spinnies.add('purge', { text: `${i}/${n}` });
  const wids = wallets.map(({ id }) => id);
  db.data.wallets = db.data.wallets.map((w) => {
    if (wids.includes(w.id)) {
      spinnies.update('purge', { text: `${++i}/${n}` });
      return { ...w, pk: undefined, role: 0 };
    }
    return w;
  });
  await db.write();
  spinnies.succeed('purge', { text: `${i}/${n} wallets purged successfully!` });
};

export default [command, description, builder, handler];

// 0x6AFb9B4c326ac5E311a3a7B0EB11aF76355a8929
// 0x4a0b559c83ec6e0c74473e1c9db21dcaa89977962235b1d48ffa1e5af48b87fc
