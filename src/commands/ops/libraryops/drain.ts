/* eslint-disable camelcase */
import { ethers } from 'ethers';
import { parseAmt } from '../../../utils.js';
import { op } from '../opsDefinitions.js';
import { ERC20__factory } from '../../../types/ethers-contracts/factories/ERC20__factory.js';

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

export default drain;
