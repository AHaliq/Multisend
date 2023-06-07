import AppAuthEnv from '../auth/appauthenv.js';
import { getSigner, setSigner } from '../auth/index.js';

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
    console.log('Not logged in');
    return;
  }

  if (s2.compare(argv)) {
    console.log('New password and plaintext must be different');
    return;
  }

  const s = new AppAuthEnv(argv);
  s.createEnv();
  await s.setDbCipher();
  setSigner(s);
  console.log('Successfully changed password');
};

export default [command, description, builder, handler];
