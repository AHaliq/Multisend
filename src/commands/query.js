import fs from 'fs';
import { ethers } from 'ethers';
import Table from 'cli-table3';
import { getSigner } from '../auth/index.js';
import {
  strToRole, INVALID_ROLE, NOT_LOGGED_IN, roleToStr,
} from './utils.js';
import { getWallets } from '../db/utils.js';

const command = 'query';

const description = 'Query wallet information';

const builder = (args) => {
  args
    .option('role', {
      alias: 'r',
      type: 'string',
      describe: 'Filter wallets of this role',
    })
    .option('callId', {
      alias: 'c',
      type: 'number',
      describe: 'Filter wallets with this callId',
    })
    .option('address', {
      alias: 'a',
      type: 'string',
      describe: 'Select only this wallet address',
    })
    .option('pk', {
      type: 'boolean',
      describe: 'Show private keys only',
    })
    .option('out', {
      alias: 'o',
      type: 'string',
      describe: 'File path to output to',
    });
};

const handler = async (argv) => {
  const s = getSigner(true);
  if (s === null) {
    console.log(NOT_LOGGED_IN);
    return;
  }
  // auth

  const {
    role, callId, address, pk, out,
  } = argv;
  const r = role === undefined ? undefined : strToRole(role);
  if (r !== undefined && r === null) {
    console.log(INVALID_ROLE);
    return;
  }
  // verify role

  const c = callId === undefined ? undefined : Math.floor(callId);
  if (c !== undefined && c < 0) {
    console.log('CallId must be non-negative');
    return;
  }
  // verify callId

  const a = address === undefined ? undefined : address;
  if (a !== undefined && !ethers.isAddress(a)) {
    console.log('Invalid address');
    return;
  }
  // verify address

  const wallets = await getWallets({ role: r, callId: c, address: a });
  if (wallets.length === 0) {
    console.log('No wallets found');
    return;
  }
  // no wallets found

  if (pk) {
    const pks = wallets.map(({ pk: epk }) => s.read(epk)).join('\n');
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
      return rest;
    });
    // TODO add argument to query balance given token contract address
    if (out === undefined) {
      const table = new Table({ head: Object.keys(wdata[0]) });
      wdata
        .map((w) => ({ walletId: w.walletId, role: roleToStr(w.role), address: w.address }))
        .forEach((w) => table.push(Object.values(w)));
      console.log(table.toString());
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
