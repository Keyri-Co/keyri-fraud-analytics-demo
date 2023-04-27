function checkWarnOrDeny(data) {
  for (let key in data.deny) {
    if (data.deny[key] === true) {
      return 'Deny';
    }
  }

  for (let key in data.warn) {
    if (data.warn[key] === true) {
      return 'Warn';
    }
  }

  return 'Allow';
}

module.exports = { checkWarnOrDeny };
