import AppAuthEnv from './appauthenv.js';

/**
 * Instance of AppAuth
 */
let SIGNER = null;

/**
 * Set the signer instance
 * @param {AppAuth} signer
 */
const setSigner = (signer) => {
  SIGNER = signer;
};

/**
 * Retrieves the signer instance
 * @param {boolean} tryLoadFromEnv attempts auth when true if not authed yet
 * @returns
 */
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
