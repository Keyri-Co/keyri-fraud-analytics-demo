function checkWarnOrDeny(riskParams) {
  const data = riskParams;
  const warnObj = data.warn;
  const denyObj = data.deny;

  let warnFlag = false;
  let denyFlag = false;

  for (const key in warnObj) {
    if (warnObj[key]) {
      warnFlag = true;
      break;
    }
  }

  for (const key in denyObj) {
    if (denyObj[key]) {
      denyFlag = true;
      break;
    }
  }

  if (denyFlag) {
    return 'Deny';
  } else if (warnFlag) {
    return 'Warn';
  } else {
    return 'Allow';
  }
}

module.exports = { checkWarnOrDeny };
