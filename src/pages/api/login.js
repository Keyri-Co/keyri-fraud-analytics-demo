import bcrypt from 'bcryptjs';
import EZCrypto from '@justinwwolcott/ez-web-crypto';
import { query } from '../../../database';
import { sign } from '../../lib/jwt';
import { checkWarnOrDeny } from '@/lib/riskAnalysis';

export default async function login(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { username, password, publicKey, encryptedLoginEventString } = req.body;
  let statusCode, response;

  try {
    const ezcrypto = new EZCrypto();

    const rpPrivateKey = process.env.RP_ENCRYPTION_PRIVATE_KEY;
    const encryptedLoginEvent = JSON.parse(encryptedLoginEventString);

    let decryptedLoginEvent = await ezcrypto.HKDFDecrypt(
      rpPrivateKey,
      encryptedLoginEvent.keyriEncryptionPublicKey,
      encryptedLoginEvent.salt,
      encryptedLoginEvent.iv,
      encryptedLoginEvent.encryptedPayload
    );

    decryptedLoginEvent = new TextDecoder().decode(decryptedLoginEvent);
    decryptedLoginEvent = JSON.parse(decryptedLoginEvent).fingerprintEvent;
    const riskDetermination = checkWarnOrDeny(JSON.parse(decryptedLoginEvent.riskParams));
    const signals = decryptedLoginEvent.signals;
    const riskParams = decryptedLoginEvent.riskParams;
    const location = JSON.stringify(decryptedLoginEvent.location);
    const fingerprintId = decryptedLoginEvent.fingerprintId;
    const riskResponse = JSON.stringify({ signals, riskParams, location, fingerprintId });

    if (riskDetermination === 'Deny') {
      statusCode = 403;
      response = { riskResponse };
    } else if (riskDetermination === 'Warn') {
      statusCode = 300;
      response = { riskResponse };
    } else if (riskDetermination === 'Allow') {
      const users = await query('SELECT * FROM users_fraud_demo WHERE username = $1', [username]);
      const user = users[0];

      if (!user || !(await bcrypt.compare(password, user.password))) {
        statusCode = 401;
        response = {};
      } else {
        const token = sign({ id: user.id, username: user.username, publicKey: publicKey });
        statusCode = 200;
        response = { token, riskResponse };
      }
    }
  } catch (error) {
    console.error(error);
    statusCode = 500;
    response = { error: 'Failed to authenticate user' };
  }

  // Send a single response at the end
  res.status(statusCode).json(response);
}
