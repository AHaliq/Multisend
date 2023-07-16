import { op } from '../opsDefinitions.js';

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

export default dummy;
