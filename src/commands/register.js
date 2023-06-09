import { getSigner } from '../auth/index.js';
import { getDb, getLargest } from '../db/utils.js';
import {
  INVALID_ROLE, NOT_LOGGED_IN, strToRole,
} from './utils.js';

const command = 'register [address] [privatekey]';

const description = 'Add a wallet to the database';

const builder = (args) => {
  args
    .positional('address', {
      describe: 'Address of the wallet to add',
      type: 'string',
    })
    .positional('privatekey', {
      describe: 'Private key of the wallet to add',
      type: 'string',
    })
    .option('role', {
      alias: 'r',
      type: 'string',
      describe: 'Role for the wallet',
    });
};

const handler = async (argv) => {
  const s = getSigner(true);
  if (s === null) {
    console.log(NOT_LOGGED_IN);
    return;
  }
  // auth

  const { address, privatekey, role } = argv;

  const r = role === undefined ? 2 : strToRole(role);
  if (r === null) {
    console.log(INVALID_ROLE);
    return;
  }
  // validate role

  if (await s.verifyWallet({ address, pk: privatekey }, true)) {
    const db = await getDb();
    if (db.data.wallets.find((w) => w.address === address) !== undefined) {
      console.log('Wallet already exists');
      return;
    }
    db.data.wallets.push({
      id: getLargest(db.data.wallets, 'id') + 1,
      role: r,
      address,
      pk: s.sign(privatekey),
    });
    await db.write();
    console.log('Successfully added wallet');
    return;
  }
  console.log('Private key does not match address');
};

export default [command, description, builder, handler];
