import chalk from 'chalk';
import Spinnies from 'spinnies';
import readlineSync from 'readline-sync';

const SpinnerType = {
  PLAIN: 0,
  SUCCEED: 1,
  FAILED: 2,
};
type SpinnerType = typeof SpinnerType[keyof typeof SpinnerType];

type Spinners = {
  [name: string]: boolean;
}

const spinnerColourConfig = (type: SpinnerType) => {
  switch (type) {
    case SpinnerType.SUCCEED:
      return { succeedColor: 'green' };
    case SpinnerType.FAILED:
      return { failColor: 'red' };
    default:
      return {};
  }
};

class IOState {
  #spinnerStarted : boolean;

  #spinnerFlags : Spinners;

  #spinner : Spinnies | undefined;

  constructor() {
    this.#spinnerStarted = false;
    this.#spinnerFlags = {};
    this.#spinner = undefined;
  }

  // TODO auto add if not started
  spinner(
    name: string,
    text: string,
    type: SpinnerType = SpinnerType.PLAIN,
  ) {
    this.#startSpinnerGuard();
    const cobj = { ...spinnerColourConfig(type), text };
    if (this.#spinnerFlags[name] && type === SpinnerType.PLAIN) {
      this.#spinner?.update(name, cobj);
    } else {
      switch (type) {
        case SpinnerType.SUCCEED:
          this.#spinner?.succeed(name, cobj);
          break;
        case SpinnerType.FAILED:
          this.#spinner?.fail(name, cobj);
          break;
        default:
          this.#spinner?.add(name, cobj);
          break;
      }
      this.#spinnerFlags[name] = true;
    }
  }

  #startSpinnerGuard() {
    if (!this.#spinnerStarted) {
      this.#spinner = new Spinnies();
      this.#spinnerFlags = {};
      this.#spinnerStarted = true;
    }
  }

  #endSpinnerGuard() {
    if (this.#spinnerStarted) {
      this.#spinner?.stopAll();
      this.#spinner = undefined;
      this.#spinnerFlags = {};
      this.#spinnerStarted = false;
    }
  }

  print(...args: string[]) {
    this.#endSpinnerGuard();
    console.log(...args);
  }

  err(...args: string[]) {
    this.#endSpinnerGuard();
    console.error(chalk.red.bold.underline('ERROR:'), ...args.map((a) => chalk.red.inverse(a)));
  }

  warn(...args: string[]) {
    this.#endSpinnerGuard();
    console.warn(...args);
  }

  prompt(msg: string, hideEchoBack = false) {
    this.#endSpinnerGuard();
    return readlineSync.question(`${msg}\n> `, { hideEchoBack });
  }

  promptYN(msg: string) {
    return /(y|Y).*/gm.test(this.prompt(`${msg} [y/n]`));
  }
}

export default IOState;
export { SpinnerType };
