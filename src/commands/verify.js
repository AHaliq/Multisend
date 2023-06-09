import fs from 'fs';
import Table from 'cli-table3';
import { getSigner } from '../auth/index.js';
import { getWallets } from '../db/utils.js';
import { NOT_LOGGED_IN } from './utils.js';

const command = 'verify';

const description = 'Verify wallet privatekeys';

const builder = (args) => {
  args
    .option('out', {
      alias: 'o',
      type: 'string',
      describe: 'File path to output to',
    });
};

const handler = async ({ out }) => {
  const s = getSigner(true);
  if (s === null) {
    console.log(NOT_LOGGED_IN);
  }
  // auth

  const ws = await getWallets();
  const failedWallets = (await Promise.all(ws.map(
    async (w) => ({
      wallet: w,
      verified: await s.verifyWallet(w),
    }),
  ))).filter(({ verified }) => !verified).map(({ wallet }) => wallet);
  // verify wallets

  if (failedWallets.length === 0) {
    console.log('All wallets verified!');
    return;
  }
  // all verified case

  console.log(`These ${failedWallets.length} wallet(s) failed verification`);
  const table = new Table({
    head: failedWallets[0].keys(),
    colWidths: [null, null, null, 20],
    wordWrap: true,
  });
  failedWallets.forEach((wallet) => {
    table.push(Object.values(wallet));
  });
  console.log(table.toString());
  // failed verification case

  if (out !== undefined) {
    fs.writeFileSync(out, JSON.stringify(failedWallets, null, 2));
    console.log(`Wrote failed wallets to '${out}'`);
  }
  // write to file
};

export default [command, description, builder, handler];
