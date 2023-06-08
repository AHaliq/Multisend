import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import login from './commands/login.js';
import logout from './commands/logout.js';
import changepw from './commands/changepw.js';
import create from './commands/create.js';
import query from './commands/query.js';
import verify from './commands/verify.js';

yargs(hideBin(process.argv))
  .command(...login)
  .command(...logout)
  .command(...changepw)
  // auth operations
  .command(...create)
  .command(...query)
  .command(...verify)
  // wallet operations
  .parse();

// TODO register and purge wallet commands
