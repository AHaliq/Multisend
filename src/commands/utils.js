const INVALID_ROLE = 'Invalid role, must be one of "unused", "funding", or "transaction"';

const NOT_LOGGED_IN = 'Not logged in';

const strToRole = (role) => {
  let r = 2;
  if (/t(ransaction)?|2/gm.test(role)) {
    r = 2;
  } else if (/f(unding)?|1/gm.test(role)) {
    r = 1;
  } else if (/u(nused)?|0/gm.test(role)) {
    r = 0;
  } else {
    return null;
  }
  return r;
};

const roleToStr = (role) => {
  switch (role) {
    case 0:
      return 'unused';
    case 1:
      return 'funding';
    case 2:
      return 'transaction';
    default:
      return 'invalidRole';
  }
};

const verifyEthAddress = (address) => /^0x[a-fA-F0-9]{40}$/gm.test(address);

export {
  strToRole, roleToStr, verifyEthAddress, INVALID_ROLE, NOT_LOGGED_IN,
};
