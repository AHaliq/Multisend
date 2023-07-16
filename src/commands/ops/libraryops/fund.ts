/* eslint-disable camelcase */
import { ethers } from 'ethers';
import { Mutex } from 'async-mutex';
import { parseAmt } from '../../../utils.js';
import { op } from '../opsDefinitions.js';
import { ERC20__factory } from '../../../types/ethers-contracts/factories/ERC20__factory.js';

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

export default fund;
