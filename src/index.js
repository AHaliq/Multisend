import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import login from './commands/login.js';
import logout from './commands/logout.js';
import changepw from './commands/changepw.js';
import create from './commands/create.js';
import query from './commands/query.js';
import verify from './commands/verify.js';
import purge from './commands/purge.js';
import unpurge from './commands/unpurge.js';
import register from './commands/register.js';

yargs(hideBin(process.argv))
  .command(...login)
  .command(...logout)
  .command(...changepw)
  // auth operations
  .command(...create)
  .command(...query)
  .command(...verify)
  .command(...purge)
  .command(...unpurge)
  .command(...register)
  // wallet operations
  .parse();

// TODO use spinnies for every log output
// TODO migrate to typescript
// TODO use lodash to interact with lowdb
// TODO contemplate mock db design for unit testing
// TODO use appdirsjs for storing .env and db
