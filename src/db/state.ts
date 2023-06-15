import fs from 'fs';
import path from 'path';
import { mkdirp } from 'mkdirp';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import migration from './index.js';
import type Db from './schema.js';
import {
  Call,
  StrOfWalletRole, Tx, TxStatus, TxStatuses, Wallet, WalletPretty, WalletRole, WalletRoles, emptyDb,
} from './schema.js';
import appPaths from '../state/path.js';
import { getLargest } from '../utils.js';
import AppState from '../state/index.js';
import AppSigner from '../auth/index.js';

type PurgeState = 'all' | 'purged' | 'unpurged';
const PurgeStates = {
  ALL: 'all',
  PURGED: 'purged',
  UNPURGED: 'unpurged',
};

type WalletFilterOptions = {
  id?: number;
  callId?: number;
  role?: WalletRole;
  address?: string;
  purgeState?: PurgeState;
}

type WalletSplit = {existing: Wallet[], newWallets: Wallet[]};

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
    const adapter = new JSONFile<Db>(DbState.DBNAME);
    this.#db = new Low<Db>(adapter, emptyDb);
    const signer = state.auth.getSigner();
    if (state.auth.notAuthed() && signer !== null) {
      if (!DbState.dbExists()) {
        migration(state, signer);
      }
      this.#dirty = true;
      this.#loaded = false;
      return;
    }
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
  async write() {
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
      migration(this.#state, this.#state.auth.getSigner() as AppSigner, await this.getMigration());
      // INFO do migration for writeProtect too
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

  /**
   * Get the wallets satisfying the given filter arguments: role, callId, and address
   * If the argument is undefined it is not used as a filter
   * @param param0 the filter arguments
   * @param signer if provided, the pk is decrypted and the role is a string; prettified
   * @returns wallets
   */
  async getWallets({
    id, callId, role, address, purgeState,
  }: WalletFilterOptions = {}, signer: AppSigner | undefined = undefined)
   : Promise<WalletPretty[]> {
    const ws : Wallet[] = await this.#readProtect(
      async () => this.#walletsMatchCallId(
        callId,
        this.#walletMatchRole(
          role,
          this.#walletsMatchPurge(
            purgeState,
            this.#walletMatchAddress(
              address,
              this.#walletMatchId(id),
            ),
          ),
        ),
      ),
    );
    return signer !== undefined ? ws.map((w) => ({
      id: w.id,
      address: w.address,
      role: `${StrOfWalletRole[w.role]}${w.pk === undefined ? '(purged)' : ''}`,
      pk: w.pk !== undefined ? signer.decrypt(w.pk) : w.pk,
    })) : ws;
  }

  // private read helpers ---------------------------------------------

  #wallets(data ?: Wallet[]) {
    if (data !== undefined) this.#db.data.wallets = data;
    return this.#db.data.wallets;
  }

  #calls(data ?: Call[]) {
    if (data !== undefined) this.#db.data.calls = data;
    return this.#db.data.calls;
  }

  #txs(data ?: Tx[]) {
    if (data !== undefined) this.#db.data.txs = data;
    return this.#db.data.txs;
  }

  #walletsMatchCallId(callId?:number, wallets = this.#wallets()) {
    if (callId === undefined) return wallets;
    const callWallets = this.#txs().filter((t) => t.callId === callId).map((t) => t.walletId);
    return wallets.filter((w) => callWallets.includes(w.id));
  }

  #walletMatchRole(role?:WalletRole, wallets = this.#wallets()) {
    if (role === undefined) return wallets;
    return wallets.filter((w) => w.role === role);
  }

  #walletMatchAddress(address?: string, wallets = this.#wallets()) {
    if (address === undefined) return wallets;
    return wallets.filter((w) => w.address.toLowerCase() === address.toLowerCase());
  }

  #walletMatchId(id?: number, wallets = this.#wallets()) {
    if (id === undefined) return wallets;
    return wallets.filter((w) => w.id === id);
  }

  #walletsMatchPurge(purgeState?: PurgeState, wallets = this.#wallets()) {
    if (purgeState === undefined || purgeState === PurgeStates.ALL) return wallets;
    return wallets.filter(
      (w) => (purgeState === PurgeStates.PURGED
        ? w.pk === undefined
        : w.pk !== undefined),
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

  addTxs(txs: Tx[]) {
    this.#db.data.txs.push(...txs);
    this.#dirty = true;
  }

  async createNewCall(op: string, networkId?: number, desc?: string) {
    const id = (await this.getLargestCallid() ?? 0) + 1;
    this.#calls().push({
      id,
      networkId,
      op,
      desc,
      timestamp: Date.now(),
    });
    this.#dirty = true;
    return id;
  }

  async filterExistingWallets(newWallets: Wallet[]) : Promise<WalletSplit> {
    const wallets = this.#wallets().map((w) => w.address);
    return newWallets.reduce(
      ({ existing, newWallets } : WalletSplit, w : Wallet) => {
        const exists = wallets.includes(w.address);
        if (exists) return { existing: [...existing, w], newWallets };
        return { existing, newWallets: [...newWallets, w] };
      },
      { existing: [], newWallets: [] },
    );
  }

  async purgeWalletById(ids: number[]) {
    this.#wallets(this.#wallets().map(
      (w) => (ids.includes(w.id) ? { ...w, pk: undefined, role: 0 } : w),
    ));
    this.#dirty = true;
  }

  async addWallets(wallets: Wallet[]) {
    const { existing, newWallets } = await this.filterExistingWallets(wallets);

    if (newWallets.length === 0) return existing;
    // early termination if no new wallets

    this.#wallets().push(...newWallets);
    // populate wallets table

    const callId = await this.createNewCall(
      'create',
      undefined,
      `${wallets.length} wallet${wallets.length === 1 ? '' : 's'}`,
    );
    // create call entry

    const id = (await this.getLargestTxid() ?? 0) + 1;
    this.addTxs(newWallets.map((w, i) => ({
      id: id + i,
      callId,
      walletId: w.id,
      hash: undefined,
      status: TxStatuses.SUCCESS as TxStatus,
      timestamp: Date.now(),
    })));
    // populate txs table

    this.#dirty = true;

    return existing;
  }

  updateWalletRole(id: number | number[], role: WalletRole) {
    const is = this.#wallets().map((w, i) => ((typeof id === 'number' ? w.id === id : id.includes(w.id)) ? i : -1)).filter((i) => i !== -1);
    if (is.length === 0) return false;
    is.forEach((i) => {
      const w = this.#wallets()[i];
      if (w === undefined) throw new Error('impossible wallet not found');
      w.role = role;
    });
    this.#dirty = true;
    return true;
  }

  updateWalletPk(id: number, pk: string) {
    const i = this.#wallets().findIndex((w) => w.id === id);
    if (i === -1) return false;
    const w = this.#wallets()[i];
    if (w === undefined) return false;
    w.pk = pk;
    this.#dirty = true;
    return true;
  }

  async fundingWalletExists() {
    return (await this.getWallets({ role: WalletRoles.FUNDING as WalletRole })).length > 0;
  }

  async updateFundingRole(role: WalletRole) {
    const fundingEntry = (await this.getWallets({ role: WalletRoles.FUNDING as WalletRole }))?.[0];
    if (fundingEntry === undefined) return false;
    return this.updateWalletRole(fundingEntry.id, role);
  }

  updateWalletsNewPassword(s2 : AppSigner) {
    const s = this.#state.auth.getSigner();
    if (s === null) throw new Error('no signer');
    this.#wallets(this.#wallets().map((w) => ({
      ...w,
      pk: w.pk === undefined ? undefined : s2.sign(s.decrypt(w.pk)),
    })));
  }
}

export default DbState;
export { WalletFilterOptions, PurgeState, PurgeStates };
