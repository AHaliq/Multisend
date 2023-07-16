/* eslint-disable camelcase */
import { JsonRpcProvider, Wallet, ethers } from 'ethers';
import { Mutex } from 'async-mutex';
import { parseAmt } from '../utils.js';
import DbState from '../db/state.js';
import { ERC20__factory } from '../types/ethers-contracts/factories/ERC20__factory.js';
import { StatesForHandler } from './index.js';

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

const balance: op = {
  name: 'balance',
  description: 'Get the balance of all transaction wallets',
  help: '',
  parseArgs: (arg: string) => {
    const args = arg.split(' ');
    const tokenAddress = args.length === 0 || args[0] === '' ? '0x' : args[0];
    const isNative = tokenAddress === '0x';
    if (!isNative) {
      if (!ethers.isAddress(tokenAddress)) {
        throw new Error('Balance: token address must be valid');
      }
    }
    return { tokenAddress, isNative };
  },
  func: async ({ transacting, provider, args }) => {
    const { tokenAddress, isNative } = args as {
      tokenAddress: string;
      isNative: boolean;
    };
    const bal = await (isNative
      ? provider.getBalance(transacting.address)
      : ERC20__factory.connect(tokenAddress, provider).balanceOf(
          transacting.address,
        ));
    return bal;
  },
};

const fund: op = {
  name: 'fund',
  description: 'Fund all transaction wallets.',
  help: `args parsed as: [amount](e[n]|g) --upto --contract [contractAddress], 
if g; gwei, then n=9, if no g and e then n=18
thus 'amount * 10^n' is the amount in wei. e.g.
9 -> 9000000000000000000 wei
9g -> 9000000000 wei
9e3 -> 9000 wei

optional --contract [contractAddress] to fund a specific token contract
if no contract specified will fund native token

if upto flag present rather than funding amount,
it will fund to match balance to minimum of amount value`,
  parseArgs: (arg: string) => {
    const args = arg.split(' ');
    if (args[0] === undefined) {
      throw new Error('Fund: amount is required');
    }
    let val;
    try {
      val = parseAmt(args[0]);
    } catch {
      throw new Error(`Fund: failed to parse amount "${args[0]}"`);
    }
    if (args.indexOf('--contract') !== -1) {
      const contractAddress = args[args.indexOf('--contract') + 1];
      if (!ethers.isAddress(contractAddress)) {
        throw new Error('Fund: contract address must be valid');
      }
      return { val, contractAddress, mutex: new Mutex() };
    }

    const upto = args.indexOf('--upto') !== -1;
    return { val, contractAddress: '0x', mutex: new Mutex(), upto };
  },
  func: async ({ funding, transacting, gasPrice, args, out }) => {
    const { val, contractAddress, mutex, upto } = args as {
      val: bigint;
      contractAddress: string;
      mutex: Mutex;
      upto: boolean;
    };
    out('waiting');
    const release = await mutex.acquire();
    out('running');
    // enter protected section
    const { provider } = transacting;
    if (provider === null || provider === undefined) {
      throw new Error('Drain: Network failed to create provider');
    }

    if (contractAddress === '0x') {
      let amountToSend;
      if (upto) {
        const balance = await provider.getBalance(transacting.address);
        if (balance > val) {
          return 'already satisfied';
        }
        amountToSend = val - balance;
      } else {
        amountToSend = val;
      }

      const res = await funding.sendTransaction({
        to: transacting.address,
        value: amountToSend,
        gasPrice,
      });
      const rec = await res.wait();
      release();
      if (rec === null) throw new Error('failed to fund');
      return rec.hash;
    }
    const contract = ERC20__factory.connect(contractAddress, funding.provider);
    let amountToSend;
    if (upto) {
      const balance = await contract.balanceOf(transacting.address);
      if (balance > val) {
        return 'already satisfied';
      }
      amountToSend = val - balance;
    } else {
      amountToSend = val;
    }
    const res = await contract.transfer(transacting.address, amountToSend, {
      gasPrice,
    });
    const rec = await res.wait();
    release();
    if (rec === null) throw new Error('failed to fund');
    return rec.hash;
  },
};

const drain: op = {
  name: 'drain',
  description: 'Drain all transaction wallets to a target wallet.',
  help: `args parsed as: [targetWalletAddress] --amount [amount] --upto [upto] --contract [contractAddress]
if no amount specified will drain all
if no contract specified will drain native token
upto tries to drain all but leave behind upto amount;transfers: balance - upto`,
  parseArgs: (arg: string) => {
    const args = arg.split(' ');
    const target = args[0];
    if (!ethers.isAddress(target)) {
      throw new Error('Drain: target wallet address must be valid');
    }
    // validate target

    const contractIndex = args.indexOf('--contract');
    const isNative = contractIndex === -1;
    const contractAddress = isNative ? '0x' : args[contractIndex + 1];
    if (!isNative && !ethers.isAddress(contractAddress)) {
      throw new Error('Drain: contract address must be valid');
    }
    // validate contract

    const amountIndex = args.indexOf('--amount');
    const amount =
      amountIndex === -1 ? 0n : parseAmt(args[amountIndex + 1] ?? '0');
    // validate amount

    const uptoIndex = args.indexOf('--upto');
    const upto = uptoIndex === -1 ? 0n : parseAmt(args[uptoIndex + 1] ?? '0');
    // validate amount

    return {
      isNative,
      contractAddress,
      amount,
      upto,
      target,
    };
  },
  func: async ({ transacting, gasPrice, args }) => {
    const { isNative, contractAddress, amount, target, upto } = args as {
      isNative: boolean;
      contractAddress: string;
      amount: bigint;
      upto: bigint;
      target: string;
    };
    const { provider } = transacting;
    if (provider === null || provider === undefined) {
      throw new Error('Drain: Network failed to create provider');
    }

    if (isNative) {
      let amountToSend;
      if (upto !== 0n || amount === 0n) {
        const balance = await provider.getBalance(transacting.address);
        amountToSend = balance - upto;
      } else {
        amountToSend = amount;
      }
      return (
        await transacting.sendTransaction({
          to: target,
          value: amountToSend,
          gasPrice,
        })
      ).hash;
    }
    // drain native

    const contract = ERC20__factory.connect(contractAddress, provider);
    let amountToSend;
    if (upto !== 0n || amount === 0n) {
      const balance = await contract.balanceOf(transacting.address);
      amountToSend = balance - upto;
    } else {
      amountToSend = amount;
    }
    return (await contract.transfer(target, amountToSend, { gasPrice })).hash;
    // drain erc20
  },
};

const dummy: op = {
  name: 'dummy',
  description: 'Dummy operation.',
  help: '',
  parseArgs: () => {},
  func: async () => {
    await new Promise(resolve =>
      // eslint-disable-next-line no-promise-executor-return
      setTimeout(resolve, Math.ceil(3000 + Math.random() * 10000)),
    );
    return 'done';
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type opsmap = { [key: string]: op };

const defaultOps: opsmap = {
  balance,
  fund,
  drain,
  dummy,
};

export { fund, drain, opsmap, op, defaultOps };
