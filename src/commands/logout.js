import AppAuthEnv from '../auth/appauthenv.js';

const command = 'logout';

const description = 'Logout';

const builder = () => {};

const handler = () => {
  if (AppAuthEnv.envExists()) {
    AppAuthEnv.deleteEnv();
    console.log('Successfully logged out');
    return;
  }
  console.log('Already logged out');
};

export default [command, description, builder, handler];
