import { dbExists } from '../db/utils.js';
import migration from '../db/index.js';
import { setSigner, getSigner } from '../auth/index.js';
import AppAuthEnv from '../auth/appauthenv.js';

const command = 'login [plaintext] [password]';

const description = 'Authenticate with credentials';

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
  const s = new AppAuthEnv(argv);
  if (!dbExists()) {
    setSigner(s);
    console.log('No database found, using credentials to create one');

    await migration();
    console.log('Database created\nSuccessfully logged in');

    return;
  }
  // new user register

  if (getSigner(true) !== null) {
    console.log('Already logged in');
    return;
  }
  // check current credentials if .env exists

  if (await s.verifyDbCipher()) {
    setSigner(s);
    s.createEnv();
    console.log('Successfully logged in');
    return;
  }
  console.log('Invalid credentials');
  // authenticate and write to .env if valid
};

export default [command, description, builder, handler];
