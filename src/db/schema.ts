const StrOfWalletRole = ['unused', 'funding', 'transaction'];
type WalletRole = 0 | 1 | 2;

type Wallet = {
  id: number;
  role: WalletRole;
  address: string;
  pk: string;
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
  networkId: number;
  op: string;
  timestamp: number;
}

const StrOfTxStatus = ['success', 'error'];
type TxStatus = 0 | 1;

type Tx = {
  id: number;
  callId: number;
  walletId: number;
  hash: string;
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
  Wallet, Network, Call, Tx, emptyDb, WalletRole, TxStatus, StrOfTxStatus, StrOfWalletRole,
};
