import { ethers } from 'ethers';
import Spinnies from 'terminal-multi-spinners';
import { getSigner } from '../auth/index.js';
import { getDb, getWallets } from '../db/utils.js';
import { INVALID_ROLE, NOT_LOGGED_IN, strToRole } from './utils.js';

const command = 'create [number]';

const description = 'Create new wallets';

const builder = (args) => {
  args
    .positional('number', {
      type: 'number',
      describe: 'Number of wallets to create',
    })
    .option('role', {
      alias: 'r',
      type: 'string',
      describe: 'Role for the wallets',
    });
};

const handler = async (argv) => {
  const s = getSigner(true);
  if (s === null) {
    console.log(NOT_LOGGED_IN);
    return;
  }
  // auth

  const { number, role } = argv;
  const n = Math.floor(number);
  if (n < 1) {
    console.log('Must be at least 1 wallet');
    return;
  }
  // validate number

  const r = role === undefined ? 2 : strToRole(role);
  if (r === null) {
    console.log(INVALID_ROLE);
    return;
  }
  // validate role

  if (r === 1 && n > 1) {
    console.log('Only 1 funding wallet can be created');
    return;
  }
  // validate if role is funding, only 1 wallet can be created

  const fundingWallets = await getWallets({ role: 1 });
  if (fundingWallets.length > 0) {
    console.log(`Funding wallet(s) with id ${fundingWallets.map((w) => w.walletId)} already exists, setting them to unused role`);
    const db = await getDb();
    db.data.wallets = db.data.wallets.map((w) => ({ ...w, role: w.role === 1 ? 0 : w.role }));
    await db.write();
  }
  // validate if funding wallet already exists

  console.log(`Creating ${n} wallets with role ${r}...`);
  const spinnies = new Spinnies();
  spinnies.add('create', { text: `0/${n}` });
  // create spinner

  const db = await getDb();
  let wid = db.data.wallets.reduce((acc, { walletId }) => Math.max(acc, walletId), 0);
  // get largest walletId

  [...Array(n).keys()].map(() => ethers.Wallet.createRandom()).forEach((w, i) => {
    const epk = s.sign(w.privateKey);
    db.data.wallets.push({
      walletId: ++wid, role: r, address: w.address, pk: epk,
    });
    spinnies.update('create', { text: `${i + 1}/${n}` });
  });
  // create wallets

  spinnies.succeed('create', { text: `${n}/${n}` });
  await db.write();
  console.log('Wallets created');
};

export default [command, description, builder, handler];
