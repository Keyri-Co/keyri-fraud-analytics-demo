import EZCrypto from '@justinwwolcott/ez-web-crypto';

export default async function jwtLogin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { encryptedRiskEventString } = req.body;
  let statusCode, response;

  try {
    const ezcrypto = new EZCrypto();
    const rpPrivateKey = process.env.RP_ENCRYPTION_PRIVATE_KEY;
    const encryptedRiskEvent = JSON.parse(encryptedRiskEventString);

    let decryptedRiskEvent = await ezcrypto.HKDFDecrypt(
      rpPrivateKey,
      encryptedRiskEvent.keyriEncryptionPublicKey,
      encryptedRiskEvent.salt,
      encryptedRiskEvent.iv,
      encryptedRiskEvent.encryptedPayload
    );

    decryptedRiskEvent = new TextDecoder().decode(decryptedRiskEvent);
    decryptedRiskEvent = JSON.parse(decryptedRiskEvent).fingerprintEvent;
    const riskDetermination = decryptedRiskEvent.riskSummary;
    const signals = decryptedRiskEvent.signals;
    const riskParams = decryptedRiskEvent.riskParams;
    const location = JSON.stringify(decryptedRiskEvent.location);
    const fingerprintId = decryptedRiskEvent.fingerprintId;
    const riskResponse = JSON.stringify({ signals, riskParams, location, fingerprintId });

    if (riskDetermination === 'Deny') {
      statusCode = 403;
      response = { riskResponse };
    } else if (riskDetermination === 'Warn') {
      statusCode = 300;
      response = { riskResponse };
    } else if (riskDetermination === 'Allow') {
      statusCode = 200;
      response = { riskResponse };
    }
  } catch (error) {
    statusCode = 500;
    response = { error: 'Failed to decrypt risk object' };
  }

  res.status(statusCode).json(response);
}
