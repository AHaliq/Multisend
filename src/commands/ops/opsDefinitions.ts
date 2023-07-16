/* eslint-disable camelcase */
import { JsonRpcProvider, Wallet } from 'ethers';
import DbState from '../../db/state.js';
import { StatesForHandler } from '../index.js';
import balance from './libraryops/balance.js';
import drain from './libraryops/drain.js';
import fund from './libraryops/fund.js';
// import dummy from './libraryops/dummy.js';

type opFuncArgs = {
  funding: Wallet;
  transacting: Wallet;
  provider: JsonRpcProvider;
  gasPrice: bigint;
  args: unknown;
  db: DbState;
  out: (msg: string) => void;
};

type opFunc = (args: opFuncArgs) => Promise<unknown>;
type parseFunc = (args: string, sfh: StatesForHandler) => unknown;

type op = {
  parseArgs: parseFunc;
  func: opFunc;
  description: string;
  help: string;
  name: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type opsmap = { [key: string]: op };

const defaultOps: opsmap = {
  balance,
  fund,
  drain,
  // dummy,
};

export { fund, drain, opsmap, op, defaultOps };
