import path from 'path';
import name from 'project-name';
import os from 'os';

const appDirs = () => {
  const user = os.userInfo().username;
  switch (process.platform) {
    case 'darwin':
      return {
        cache: `/Users/${user}/Library/Caches/`,
        config: `/Users/${user}/Library/Preferences/`,
        data: `/Users/${user}/Library/Application Support/`,
      };
    case 'win32':
      return {
        cache: `C:\\Users\\${user}\\AppData\\Local\\Temp\\`,
        config: `C:\\Users\\${user}\\AppData\\Roaming\\`,
        data: `C:\\Users\\${user}\\AppData\\Local\\`,
      };
    default:
      return {
        cache: `/home/${user}/.cache/`,
        config: `/home/${user}/.local/share/`,
        data: `/home/${user}/.local/share/`,
      };
  }
};

const appPaths = (type: 'cache' | 'config' | 'data', filename: string) =>
  path.join(appDirs()[type], name(), filename);

export default appPaths;
