/* eslint-disable camelcase */
import { ethers } from 'ethers';
import { op } from '../opsDefinitions.js';
import { ERC20__factory } from '../../../types/ethers-contracts/factories/ERC20__factory.js';

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

export default balance;
