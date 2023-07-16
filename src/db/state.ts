import fs from 'fs';
import path from 'path';
import { mkdirp } from 'mkdirp';
import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import migration from './index.js';
import type Db from './schema.js';
import {
  Call,
  Network,
  StrOfTxStatus,
  StrOfWalletRole,
  Tx,
  TxStatuses,
  Wallet,
  WalletPretty,
  WalletRole,
  WalletRoles,
  emptyDb,
} from './schema.js';
import appPaths from '../state/path.js';
import { getLargest, splitAlias } from '../utils.js';
import AppState from '../state/index.js';
import AppSigner from '../auth/index.js';

type PurgeState = 'all' | 'purged' | 'unpurged';
const PurgeStates: {
  ALL: PurgeState;
  PURGED: PurgeState;
  UNPURGED: PurgeState;
} = {
  ALL: 'all',
  PURGED: 'purged',
  UNPURGED: 'unpurged',
};

type WalletFilterOptions = {
  id?: number;
  callId?: number;
  callIdFails?: boolean;
  role?: WalletRole;
  address?: string;
  purgeState?: PurgeState;
};

type WalletSplit = { existing: Wallet[]; newWallets: Wallet[] };

/**
 * Database state
 */
class DbState {
  /** filename of the database */
  static DBNAME = appPaths('data', 'db.json');

  #state;

  /** in memory db object */
  #db;

  /** flag to determine if json file data has been loaded into db object */
  #loaded;

  /** flag to determine if in memory db object is not in sync with json file */
  #dirty;

  /**
   * @param signer used in initial migration to create auth in db
   */
  constructor(state: AppState) {
    this.#state = state;
    const adapter = new JSONFileSync<Db>(DbState.DBNAME);
    this.#db = new LowSync<Db>(adapter, emptyDb);
    this.#dirty = false;
    this.#loaded = false;
  }

  static dbExists() {
    return fs.existsSync(DbState.DBNAME);
  }

  /**
   * Performs read operation on the database
   */
  async #read() {
    this.#loaded = true;
    return this.#db.read();
  }

  /**
   * Persists the in memory database to the json file
   */
  write() {
    if (!this.#dirty) return Promise.resolve();
    this.#dirty = false;
    mkdirp.sync(path.dirname(DbState.DBNAME));
    return this.#db.write();
  }

  /**
   * Delete json file and reset in memory database
   */
  async purge() {
    if (DbState.dbExists()) {
      this.#db.data = emptyDb;
      fs.unlinkSync(DbState.DBNAME);
      this.#dirty = true;
      this.#loaded = false;
      return true;
    }
    return false;
  }

  /**
   * Helper function to wrap read operations ensuring the database is loaded
   * @param call the read operation
   * @returns
   */
  async #readProtect<T>(call: () => T) {
    if (!this.#loaded) {
      await this.#read();
      await migration(
        this.#state,
        this.#state.auth.getSigner() as AppSigner,
        1 + (this.#db.data?.migration ?? -1),
      );
      this.#loaded = true;
    }
    return call();
  }

  // public read operations ---------------------------------------------

  async chain() {
    return this.#db.data;
  }

  /**
   * @returns the auth cipher
   */
  async getAuth() {
    return this.#readProtect(() => this.#db.data.auth);
  }

  /**
   * @returns the migration number
   */
  async getMigration() {
    return this.#readProtect(() => this.#db.data.migration);
  }

  /**
   * @returns the largest wallet id
   */
  async getLargestWid() {
    return this.#readProtect(async () => getLargest(this.#wallets(), 'id', 0));
  }

  async getLargestTxid() {
    return this.#readProtect(async () => getLargest(this.#txs(), 'id', 0));
  }

  async getLargestCallid() {
    return this.#readProtect(async () => getLargest(this.#calls(), 'id', 0));
  }

  async getLargestNetworkid() {
    return this.#readProtect(async () => getLargest(this.#networks(), 'id', 0));
  }

  /**
   * Get the wallets satisfying the given filter arguments: role, callId, and address
   * If the argument is undefined it is not used as a filter
   * @param param0 the filter arguments
   * @param signer if provided, the pk is decrypted and the role is a string; prettified
   * @returns wallets
   */
  async getWallets(
    {
      id,
      callId,
      callIdFails = true,
      role,
      address,
      purgeState,
    }: WalletFilterOptions = {},
    signer: AppSigner | undefined = undefined,
  ): Promise<WalletPretty[]> {
    const ws: Wallet[] = await this.#readProtect(async () =>
      this.#walletsMatchCallId(
        callId,
        callIdFails,
        this.#walletMatchRole(
          role,
          this.#walletsMatchPurge(
            purgeState,
            this.#walletMatchAddress(address, this.#walletMatchId(id)),
          ),
        ),
      ),
    );
    return signer !== undefined
      ? ws.map(w => ({
          id: w.id,
          address: w.address,
          role: `${StrOfWalletRole[w.role]}${
            w.pk === undefined ? '(purged)' : ''
          }`,
          pk: w.pk !== undefined ? signer.decrypt(w.pk) : w.pk,
        }))
      : ws;
  }

  async getCalls(cid?: number, formatTimestamp = false) {
    return this.#readProtect(async () => {
      const cs =
        cid === undefined
          ? this.#calls()
          : this.#calls().filter(c => c.id === cid);
      return formatTimestamp
        ? cs.map(c => ({
            ...c,
            timestamp: new Date(c.timestamp).toLocaleString(),
          }))
        : cs;
    });
  }

  // TODO consider cleanup extract prettify functions
  async getTxs(cid?: number, pretty = false) {
    return this.#readProtect(async () => {
      const ts =
        cid === undefined
          ? this.#txs()
          : this.#txs().filter(t => t.callId === cid);
      return pretty
        ? ts.map(t => ({
            ...t,
            walletId: this.#wallets().find(w => w.id === t.walletId)?.address,
            status: StrOfTxStatus[t.status],
            timestamp: new Date(t.timestamp).toLocaleString(),
          }))
        : ts;
    });
  }

  async getNetworks({ alias, rpc }: { alias?: string; rpc?: string }) {
    return this.#readProtect(async () =>
      alias === undefined
        ? rpc === undefined
          ? this.#networks()
          : this.#networks().filter(n => n.rpc === rpc)
        : this.#networks().filter(n =>
            new RegExp(`^${splitAlias(alias)[1]}(\\d*)$`, 'gm').test(n.alias),
          ),
    );
  }

  async getNetwork(alias: string) {
    return this.#readProtect(async () =>
      this.#networks().find(n => n.alias === alias),
    );
  }

  // private read helpers ---------------------------------------------

  #wallets(data?: Wallet[]) {
    if (data !== undefined) this.#db.data.wallets = data;
    return this.#db.data.wallets;
  }

  #calls(data?: Call[]) {
    if (data !== undefined) this.#db.data.calls = data;
    return this.#db.data.calls;
  }

  #txs(data?: Tx[]) {
    if (data !== undefined) this.#db.data.txs = data;
    return this.#db.data.txs;
  }

  #networks(data?: Network[]) {
    if (data !== undefined) this.#db.data.networks = data;
    return this.#db.data.networks;
  }

  #walletsMatchCallId(
    callId?: number,
    onlyFails = true,
    wallets = this.#wallets(),
  ) {
    if (callId === undefined) return wallets;
    const callWallets = this.#txs()
      .filter(
        t =>
          t.callId === callId && (!onlyFails || t.status === TxStatuses.ERROR),
      )
      .map(t => t.walletId);
    return wallets.filter(w => callWallets.includes(w.id));
  }

  #walletMatchRole(role?: WalletRole, wallets = this.#wallets()) {
    if (role === undefined) return wallets;
    return wallets.filter(w => w.role === role);
  }

  #walletMatchAddress(address?: string, wallets = this.#wallets()) {
    if (address === undefined) return wallets;
    return wallets.filter(
      w => w.address.toLowerCase() === address.toLowerCase(),
    );
  }

  #walletMatchId(id?: number, wallets = this.#wallets()) {
    if (id === undefined) return wallets;
    return wallets.filter(w => w.id === id);
  }

  #walletsMatchPurge(purgeState?: PurgeState, wallets = this.#wallets()) {
    if (purgeState === undefined || purgeState === PurgeStates.ALL)
      return wallets;
    return wallets.filter(w =>
      purgeState === PurgeStates.PURGED
        ? w.pk === undefined
        : w.pk !== undefined,
    );
  }

  // public write operations ---------------------------------------------

  setData(data: Db) {
    this.#db.data = data;
    this.#dirty = true;
  }

  setAuth(cipher: string) {
    this.#db.data.auth = cipher;
    this.#dirty = true;
  }

  setMigration(migration: number) {
    this.#db.data.migration = migration;
    this.#dirty = true;
  }

  addTxs(txs: Tx[]) {
    this.#db.data.txs.push(...txs);
    this.#dirty = true;
  }

  addNetwork(net: Network[]) {
    this.#db.data.networks.push(...net);
    this.#dirty = true;
  }

  async addCall(op: string, networkId?: number, desc?: string, args?: string) {
    const id = ((await this.getLargestCallid()) ?? 0) + 1;
    this.#calls().push({
      id,
      networkId,
      op,
      desc,
      args,
      timestamp: Date.now(),
    });
    this.#dirty = true;
    return id;
  }

  async filterExistingWallets(newWallets: Wallet[]): Promise<WalletSplit> {
    const wallets = this.#wallets().map(w => w.address);
    return newWallets.reduce(
      ({ existing, newWallets }: WalletSplit, w: Wallet) => {
        const exists = wallets.includes(w.address);
        if (exists) return { existing: [...existing, w], newWallets };
        return { existing, newWallets: [...newWallets, w] };
      },
      { existing: [], newWallets: [] },
    );
  }

  async purgeWalletById(ids: number[]) {
    this.#wallets(
      this.#wallets().map(w =>
        ids.includes(w.id) ? { ...w, pk: undefined, role: 0 } : w,
      ),
    );
    this.#dirty = true;
  }

  async addWallets(wallets: Wallet[]) {
    const { existing, newWallets } = await this.filterExistingWallets(wallets);

    if (newWallets.length === 0) return existing;
    // early termination if no new wallets

    this.#wallets().push(...newWallets);
    // populate wallets table

    const callId = await this.addCall(
      'create',
      undefined,
      `${wallets.length} wallet${wallets.length === 1 ? '' : 's'}`,
    );
    // create call entry

    const id = ((await this.getLargestTxid()) ?? 0) + 1;
    this.addTxs(
      newWallets.map((w, i) => ({
        id: id + i,
        callId,
        walletId: w.id,
        status: TxStatuses.SUCCESS,
        timestamp: Date.now(),
      })),
    );
    // populate txs table

    this.#dirty = true;

    return existing;
  }

  updateWalletRole(id: number | number[], role: WalletRole) {
    const is = this.#wallets()
      .map((w, i) =>
        (typeof id === 'number' ? w.id === id : id.includes(w.id)) ? i : -1,
      )
      .filter(i => i !== -1);
    if (is.length === 0) return false;
    is.forEach(i => {
      const w = this.#wallets()[i];
      if (w === undefined) throw new Error('impossible wallet not found');
      w.role = role;
    });
    this.#dirty = true;
    return true;
  }

  updateWalletPk(id: number, pk: string) {
    const i = this.#wallets().findIndex(w => w.id === id);
    if (i === -1) return false;
    const w = this.#wallets()[i];
    if (w === undefined) return false;
    w.pk = pk;
    this.#dirty = true;
    return true;
  }

  async fundingWalletExists() {
    return (await this.getWallets({ role: WalletRoles.FUNDING })).length > 0;
  }

  async updateFundingRole(role: WalletRole) {
    const fundingEntry = (
      await this.getWallets({ role: WalletRoles.FUNDING })
    )?.[0];
    if (fundingEntry === undefined) return false;
    return this.updateWalletRole(fundingEntry.id, role);
  }

  async updateNetwork(
    alias: string,
    rpc?: string,
    chainId?: number,
    gweiGasPrice?: bigint,
    rename?: string,
  ) {
    const n = this.#networks().find(n => n.alias === alias);
    if (n === undefined) return false;
    if (rpc !== undefined) n.rpc = rpc;
    if (chainId !== undefined) n.chainId = chainId;
    if (gweiGasPrice !== undefined) n.gas = gweiGasPrice;
    if (rename !== undefined) {
      await this.removeNetwork(alias);
      this.addNetwork([{ ...n, alias: rename }]);
    }
    this.#dirty = true;
    return true;
  }

  async removeNetwork(alias: string) {
    const i = this.#networks().findIndex(n => n.alias === alias);
    if (i === -1) return false;
    const splits = splitAlias(alias);
    const baseAlias = splits[1];
    const version = splits[2];
    const v = version === '' ? 0 : parseInt(version, 10);
    const ns = await this.getNetworks(baseAlias);
    if (v < ns.length - 1) {
      [...Array(ns.length - 1 - v).keys()]
        .map(x => x + v + 1)
        .forEach(j => {
          const nj = this.#networks().findIndex(
            n => n.alias === `${baseAlias}${j}`,
          );
          const n = this.#networks()[nj];
          if (n !== undefined) n.alias = `${baseAlias}${j === 1 ? '' : j - 1}`;
        });
    }
    this.#networks().splice(i, 1);
    this.#dirty = true;
    return true;
  }

  updateWalletsNewPassword(s2: AppSigner) {
    const s = this.#state.auth.getSigner();
    if (s === null) throw new Error('no signer');
    this.#wallets(
      this.#wallets().map(w => ({
        ...w,
        pk: w.pk === undefined ? undefined : s2.sign(s.decrypt(w.pk)),
      })),
    );
  }
}

export default DbState;
export { WalletFilterOptions, PurgeState, PurgeStates };
