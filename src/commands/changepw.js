import AppAuthEnv from '../auth/appauthenv.js';
import { getSigner, setSigner } from '../auth/index.js';
import { getDb } from '../db/utils.js';
import { NOT_LOGGED_IN } from './utils.js';

const command = 'changepw [plaintext] [password]';

const description = 'Change credentials';

const builder = (args) => {
  args
    .positional('plaintext', {
      type: 'string',
      describe: 'Plaintext',
    })
    .positional('password', {
      type: 'string',
      describe: 'Password',
    });
};

const handler = async (argv) => {
  const s2 = getSigner(true);

  if (s2 === null) {
    console.log(NOT_LOGGED_IN);
    return;
  }

  if (s2.compare(argv)) {
    console.log('New password and plaintext must be different');
    return;
  }

  const s = new AppAuthEnv(argv);
  const db = await getDb();
  const ws = db.data.wallets;
  db.data.wallets = ws.map((w) => ({ ...w, pk: s.sign(s2.read(w.pk)) }));
  await db.write();
  // re-encrypt pk entries with new password

  s.createEnv();
  await s.setDbCipher();
  setSigner(s);
  console.log('Successfully changed password');
};

export default [command, description, builder, handler];
