import { ethers } from 'ethers';
import { getWallets } from '../db/utils.js';
import { INVALID_ROLE, strToRole } from './utils.js';

const builder = (args) => args
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
  });

const handler = async (argv, throwOnEmpty = false) => {
  const { role, callId, address } = argv;

  const r = role === undefined ? undefined : strToRole(role);
  if (r !== undefined && r === null) {
    return [[], INVALID_ROLE];
  }
  // verify role

  const c = callId === undefined ? undefined : Math.floor(callId);
  if (c !== undefined && c < 0) {
    return [[], 'CallId must be non-negative'];
  }
  // verify callId

  const a = address;
  if (a !== undefined && !ethers.isAddress(a)) {
    console.log(a);
    return [[], 'Invalid address'];
  }
  // verify address

  const wallets = await getWallets({ role: r, callId: c, address: a });
  if (throwOnEmpty && wallets.length === 0) {
    return [[], 'No wallets found'];
  }
  // verify wallets exist

  return [wallets, null];
};

export { builder, handler };
