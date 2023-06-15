const StrOfWalletRole = ['unused', 'funding', 'transaction'];
const AliasOfWalletRole = ['u', 'f', 't'];
const WalletRoles = {
  UNUSED: 0,
  FUNDING: 1,
  TRANSACTION: 2,
};
type WalletRole = 0 | 1 | 2;

/**
 * Tries to convert to WalletRole
 * @param role role string representation
 * @returns role id or undefined if failed to convert
 */
const roleStrToId = (role: string) : WalletRole | undefined => {
  let ri = StrOfWalletRole.indexOf(role);
  ri = ri === -1 ? AliasOfWalletRole.indexOf(role) : ri;
  return ri === -1 ? undefined : ri as WalletRole;
};

type WalletPretty = {
  id: number;
  role: string | WalletRole;
  address: string;
  pk: string | undefined;
}

type Wallet = {
  id: number;
  role: WalletRole;
  address: string;
  pk: string | undefined;
}

type Network = {
  id: number;
  alias: string;
  rpc: string;
  chainId: number;
  gas: string;
}

type Call = {
  id: number;
  networkId: number | undefined;
  op: string;
  desc: string | undefined;
  timestamp: number;
}

const StrOfTxStatus = ['success', 'error'];
type TxStatus = 0 | 1;
const TxStatuses = {
  SUCCESS: 0,
  ERROR: 1,
};

type Tx = {
  id: number;
  callId: number;
  walletId: number;
  hash: string | undefined;
  status: TxStatus;
  timestamp: number;
}

type Db = {
  auth: string;
  migration: number;
  wallets: Wallet[];
  networks: Network[];
  calls: Call[];
  txs: Tx[];
}

const emptyDb = {
  auth: '',
  migration: 0,
  networks: [],
  wallets: [],
  calls: [],
  txs: [],
};

export default Db;
export {
  Wallet,
  Network,
  Call,
  Tx,
  emptyDb,
  WalletRole,
  TxStatus,
  StrOfTxStatus,
  StrOfWalletRole,
  AliasOfWalletRole,
  roleStrToId,
  WalletRoles,
  TxStatuses,
  WalletPretty,
};
