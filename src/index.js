import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import login from './commands/login.js';
import logout from './commands/logout.js';
import changepw from './commands/changepw.js';

yargs(hideBin(process.argv))
  .command(...login)
  .command(...logout)
  .command(...changepw)
  .parse();
