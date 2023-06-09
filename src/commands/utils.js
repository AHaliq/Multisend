import Table from 'cli-table3';
import readline from 'readline';

const INVALID_ROLE = 'Invalid role, must be one of "unused", "funding", or "transaction"';

const NOT_LOGGED_IN = 'Not logged in';

/**
 * Converts the numbered role stored in database into string representation
 * @param {number} role
 * @returns numbered role
 */
const strToRole = (role) => {
  let r = 2;
  if (/t(ransaction)?|2/gm.test(role)) {
    r = 2;
  } else if (/f(unding)?|1/gm.test(role)) {
    r = 1;
  } else if (/u(nused(\(purged\))?)?|0/gm.test(role)) {
    r = 0;
  } else {
    return null;
  }
  return r;
};

/**
 * Given an entry of a wallet, returns the string representation of the role
 * @param {wallet} w
 * @returns
 */
const walletToRoleStr = (w) => {
  switch (w.role) {
    case 0:
      return `unused${w.pk ? '' : '(purged)'}`;
    case 1:
      return 'funding';
    case 2:
      return 'transaction';
    default:
      return 'invalidRole';
  }
};

/**
 * Prompts the user with the given prompt and maps the input with the given mapFunc
 * @param {*} prompt
 * @param {*} mapFunc
 * @returns
 */
const promptUser = async (prompt, mapFunc) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const res = await new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve(mapFunc(answer)));
  });
  rl.close();
  return res;
};

/**
 * Given an object array, returns a string representation of the table
 * @param {array} objs
 * @param {boolean} showPk if true, will show the private key assuming objs is an array of wallets
 * @returns
 */
const objsToTableStr = (objs, showPk = false) => {
  const table = new Table({
    colWidths: showPk ? [4, 15, 23, 35] : [],
    head: Object.keys(objs[0]),
    wordWrap: showPk,
    wrapOnWordBoundary: false,
  });
  objs.forEach((w) => table.push(Object.values(w)));
  return table.toString();
};

/**
 * Given an array of wallet entries, returns a prettified version of the data
 * @param {array<wallet>} wdata
 * @param {boolean} showPk hides the private key if false
 * @returns
 */
const prettifyWalletData = (wdata, showPk = false) => wdata.map(
  (w) => ((w2) => (showPk ? { ...w2, pk: w.pk } : w2))(
    { id: w.id, role: walletToRoleStr(w), address: w.address },
  ),
);

/**
 * Given unprettiified wallet data, returns a string representation of the table
 * Note, pk is assumed to already been decrypted
 * @param {array<wallet>} wdata
 * @param {boolean} showPk
 * @returns
 */
const rawWalletToTable = (wdata, showPk = false) => objsToTableStr(
  prettifyWalletData(wdata, showPk),
  showPk,
);

export {
  strToRole,
  walletToRoleStr,
  INVALID_ROLE,
  NOT_LOGGED_IN,
  objsToTableStr,
  prettifyWalletData,
  rawWalletToTable,
  promptUser,
};
