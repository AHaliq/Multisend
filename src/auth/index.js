import AppAuthEnv from './appauthenv.js';

let SIGNER = null;

const setSigner = (signer) => {
  SIGNER = signer;
};

const getSigner = (tryLoadFromEnv = false) => {
  if (SIGNER !== null && SIGNER.verifyDbCipher()) return SIGNER;
  if (tryLoadFromEnv && AppAuthEnv.envExists()) {
    const s = new AppAuthEnv();
    if (!s.verifyDbCipher()) return null;
    setSigner(s);
    return SIGNER;
  }
  return null;
};

export { setSigner, getSigner };
