import { CommandModule } from 'yargs';
import type { StatePkg } from '../index.js';
import AppState, { GuardCallback } from '../state/index.js';

class Command {
  static VIRTUAL_ERROR = 'Virtual method must be overidden';

  #spkg:StatePkg | undefined;

  #genAlready = false;

  _appState : AppState | undefined;

  constructor(spkg?:StatePkg) {
    this.#spkg = spkg;
  }

  async _guardSpkg(callback ?: GuardCallback) {
    if (this.#spkg === undefined) {
      throw new Error('State package was not provided');
    }
    if (!this.#genAlready) {
      this._appState = this.#spkg.genState();
      this.#genAlready = true;
    }
    if (callback !== undefined) {
      return this._appState?.guard(callback);
    }
    return Promise.resolve();
  }

  #returnAndWarn<T>(str:T) {
    try {
      this._guardSpkg();
      this._appState?.io?.warn(Command.VIRTUAL_ERROR);
      return str;
    } catch {
      return str;
    }
  }

  _command() : CommandModule['command'] {
    return this.#returnAndWarn('cmd');
  }

  _alias() : CommandModule['aliases'] {
    return undefined;
  }

  _description() : CommandModule['describe'] {
    return this.#returnAndWarn('lorem ipsum');
  }

  _builder() : CommandModule['builder'] {
    return undefined;
  }

  _handler() : CommandModule['handler'] {
    return this.#returnAndWarn(() => {});
  }

  gen() : CommandModule {
    return {
      command: this._command(),
      aliases: this._alias(),
      describe: this._description(),
      builder: this._builder(),
      handler: this._handler(),
    };
  }
}

export default Command;
