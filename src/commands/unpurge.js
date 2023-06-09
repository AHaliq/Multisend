import { getSigner } from '../auth/index.js';
import { getDb } from '../db/utils.js';
import { INVALID_ROLE, NOT_LOGGED_IN, strToRole } from './utils.js';

const command = 'unpurge [address] [privatekey]';

const description = 'Provide private key to restore a purged wallet';

const builder = (args) => {
  args
    .positional('address', {
      describe: 'Address of the wallet to restore',
      type: 'string',
    })
    .positional('privatekey', {
      describe: 'Private key of the wallet to restore',
      type: 'string',
    })
    .option('role', {
      alias: 'r',
      type: 'string',
      describe: 'Role to set the wallet to',
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

  const r = role === undefined ? 0 : strToRole(role);
  if (r === null) {
    console.log(INVALID_ROLE);
    return;
  }
  // validate role

  if (await s.verifyWallet({ address, pk: privatekey }, true)) {
    const db = await getDb();
    db.data.wallets = db.data.wallets.map((w) => (
      { ...w, pk: w.address === address ? s.sign(privatekey) : w.pk, role: r }
    ));
    await db.write();
    console.log('Successfully unpurged wallet');
    return;
  }
  console.log('Private key does not match address');
};

export default [command, description, builder, handler];
