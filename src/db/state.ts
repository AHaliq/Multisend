import fs from 'fs';
import path from 'path';
import { mkdirp } from 'mkdirp';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import migration from './index.js';
import type Db from './schema.js';
import { WalletRole, emptyDb } from './schema.js';
import appPaths from '../state/path.js';
import { getLargest } from '../utils.js';
import AppState from '../state/index.js';
import AppSigner from '../auth/index.js';

type WalletFilterOptions = {
  callId?: number;
  role?: WalletRole;
  address?: string;
}

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
    return this.#readProtect(async () => getLargest(this.#wallets(), 'id'));
  }

  /**
   * Get the wallets satisfying the given filter arguments: role, callId, and address
   * If the argument is undefined it is not used as a filter
   * @param param0 the filter arguments
   * @returns wallets
   */
  async getWallets({ callId, role, address }: WalletFilterOptions = {}) {
    return this.#readProtect(
      async () => this.#walletsMatchCallId(
        callId,
        this.#walletMatchRole(
          role,
          this.#walletMatchAddress(address),
        ),
      ),
    );
  }

  // private read helpers ---------------------------------------------

  #wallets() {
    return this.#db.data.wallets;
  }

  #calls() {
    return this.#db.data.calls;
  }

  #txs() {
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

  // public write operations ---------------------------------------------

  setData(data: Db) {
    this.#db.data = data;
    this.#dirty = true;
  }

  setAuth(cipher: string) {
    this.#db.data.auth = cipher;
    this.#dirty = true;
  }
}

export default DbState;
