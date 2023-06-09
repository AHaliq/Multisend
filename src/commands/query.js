import fs from 'fs';
import { getSigner } from '../auth/index.js';
import { NOT_LOGGED_IN, rawWalletToTable } from './utils.js';
import { builder as wfBuilder, handler as wfHandler } from './walletFilters.js';

const command = 'query';

const description = 'Query wallet information';

const builder = (args) => {
  wfBuilder(args)
    .option('pk', {
      type: 'boolean',
      describe: 'Show private keys only',
    })
    .option('out', {
      alias: 'o',
      type: 'string',
      describe: 'File path to output to',
    })
    .option('all', {
      type: 'boolean',
      describe: 'Show all wallet details including pk',
    });
};

const handler = async (argv) => {
  const s = getSigner(true);
  if (s === null) {
    console.log(NOT_LOGGED_IN);
    return;
  }
  // auth

  const [wallets, err] = await wfHandler(argv, true);
  if (err != null) {
    console.log(err);
    return;
  }
  // no wallets found

  const { pk, out, all } = argv;
  if (pk) {
    const pks = wallets.map((w) => (w.pk !== undefined ? s.read(w.pk) : 'undefined')).join('\n');
    if (out === undefined) {
      console.log(pks);
      return;
    }
    // cli output pk query

    try {
      fs.writeFileSync(out, pks);
      console.log(`Wrote private keys to '${out}'`);
    } catch (e) {
      console.log(`Failed to write private keys to ${out}: ${e}`);
    }
    // file output pk query
  } else {
    const wdata = wallets.map((w) => {
      const { pk, ...rest } = w;
      return all ? { ...rest, pk: s.read(pk) } : w;
    });
    // TODO add argument to query balance given token contract address
    if (out === undefined) {
      console.log(rawWalletToTable(wdata, all));
      return;
    }
    // cli output non pk query

    try {
      fs.writeFileSync(out, JSON.stringify(wdata, null, 2));
      console.log(`Wrote wallet details to '${out}'`);
    } catch (e) {
      console.log(`Failed to write wallet details to ${out}: ${e}`);
    }
    // file output non pk query
  }
};

export default [command, description, builder, handler];
