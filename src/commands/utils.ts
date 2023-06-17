import Table from 'cli-table3';
import { ArgumentsCamelCase, Argv } from 'yargs';
import { WalletRole, WalletRoles, roleStrToId } from '../db/schema.js';
import DbState, { WalletFilterOptions } from '../db/state.js';
import IOState from '../io/state.js';
import { splitAlias } from '../utils.js';

/**
 * Prompt user to change funding wallet role or abort
 * @param state AppState instance to use for io
 * @returns true if aborted is triggered
 */
const promptFundingChangeRole = async ({ db, io } : { db: DbState, io : IOState}) => {
  if (await db.fundingWalletExists()) {
    const proceed = io.prompt('Funding wallet already exists\nSet it to new role or abort?\n(u(nused)/t(ransaction)/a(bort))') ?? 'a';
    if (/^u.*/gm.test(proceed)) {
      await db.updateFundingRole(WalletRoles.UNUSED as WalletRole);
    } else if (/^t.*/gm.test(proceed)) {
      await db.updateFundingRole(WalletRoles.TRANSACTION as WalletRole);
    } else {
      io.print('Aborted');
      return true;
    }
    io.print('Funding wallet role updated');
  }
  return false;
};

/**
 * Higher order function to add wallet filters to a yargs builder
 * @param args yargs object
 * @returns yargs object
 */
const walletFiltersBuilder = (args: Argv) => args
  .option('id', {
    type: 'number',
    describe: 'Filter for wallet id',
  })
  .option('role', {
    alias: 'r',
    type: 'string',
    describe: 'Filter for wallet role',
  })
  .option('address', {
    alias: 'a',
    type: 'string',
    describe: 'Filter for wallet address',
  })
  .option('callId', {
    alias: 'c',
    type: 'number',
    describe: 'Filter for call id',
  });

/**
 * handler is assumed to be for a command with walletFiltersBuilder used in builder
 * @param args handler args
 * @returns WalletFilterOptions object
 */
const getWalletFiltersOption = (args: ArgumentsCamelCase) : WalletFilterOptions => {
  const id = args.id as number | undefined;
  const role = args.role === undefined ? undefined : roleStrToId(args.role as string);
  const address = args.address as string | undefined;
  const callId = args.callId as number | undefined;
  const obj : WalletFilterOptions = {};
  if (id !== undefined) obj.id = id;
  if (role !== undefined) obj.role = role;
  if (address !== undefined) obj.address = address;
  if (callId !== undefined) obj.callId = callId;
  return obj;
};

/**
 * Give a tabularized string representation of an array of objects
 * @param objs the array of objects
 * @param colWidths array of numbers for each column width
 * @param wordWrap true will wrap columns if colWidth is not unspecified
 * @returns table string
 */
const objsToTableStr = (
  objs: object[],
  colWidths : number[] = [],
  wordWrap = false,
  wrapOnWordBoundary = false,
) => {
  const table = new Table({
    colWidths,
    head: Object.keys(objs[0] ?? {}),
    wordWrap,
    wrapOnWordBoundary,
  });
  objs.forEach((obj) => table.push(Object.values(obj)));
  return table.toString();
};

const verifyAlias = async (alias: string, io: IOState, db: DbState) => {
  const splits = splitAlias(alias);
  const baseAlias = splits[1];
  let version = splits[2] ?? '';
  // parse alias

  const netFam = await db.getNetworks({ alias });
  if (version === '') {
    if (netFam.length > 0) {
      if (!io.promptYN('Network with the same alias already exists, add as another version?')) {
        io.print('Aborted');
        return undefined;
      }
      version = netFam.length.toString();
    }
  } else if (version !== netFam.length.toString()) {
    if (!io.promptYN(`Invalid version, must be the next version of the network: "${netFam.length}", proceed with new number?`)) {
      io.print('Aborted');
      return undefined;
    }
    version = netFam.length.toString();
  }
  return `${baseAlias}${version}`;
  // validate against existing networks
};

/**
 * Returns true if aborted
 * @param rpc
 * @param io
 * @param db
 * @returns
 */
const verifyRpc = async (rpc: string, io: IOState, db: DbState) => {
  const ns = await db.getNetworks({ rpc });
  if (ns.length > 0) {
    if (!io.promptYN('Network with the same rpc already exists, proceed creating duplicate rpc?')) {
      io.print('Aborted');
      return true;
    }
  }
  return false;
};

export {
  promptFundingChangeRole,
  walletFiltersBuilder,
  getWalletFiltersOption,
  objsToTableStr,
  verifyAlias,
  verifyRpc,
};
