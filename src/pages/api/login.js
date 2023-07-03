import bcrypt from 'bcryptjs';
import EZCrypto from '@justinwwolcott/ez-web-crypto';
import { query } from '../../../database';
import { sign } from '../../lib/jwt';

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
      encryptedLoginEvent.publicEncryptionKey,
      encryptedLoginEvent.salt,
      encryptedLoginEvent.iv,
      encryptedLoginEvent.ciphertext
    );

    decryptedLoginEvent = new TextDecoder().decode(decryptedLoginEvent);
    decryptedLoginEvent = JSON.parse(decryptedLoginEvent);
    console.log(decryptedLoginEvent);
    const riskDetermination = decryptedLoginEvent.riskSummary;
    const signals = decryptedLoginEvent.signals;
    const riskParams = decryptedLoginEvent.signals;
    const location = decryptedLoginEvent.ipLocationData;
    const fingerprintId = decryptedLoginEvent.deviceId;
    const riskResponse = JSON.stringify({
      signals,
      riskParams,
      location,
      fingerprintId,
      riskDetermination,
    });

    if (riskDetermination === 'deny') {
      statusCode = 403;
      response = { riskResponse };
    } else if (riskDetermination === 'warn') {
      statusCode = 300;
      response = { riskResponse };
    } else if (riskDetermination === 'allow') {
      const users = await query('SELECT * FROM users_fraud_demo WHERE username = $1', [username]);
      const user = users[0];

      if (!user || !(await bcrypt.compare(password, user.password))) {
        statusCode = 401;
        response = { riskResponse, error: 'Invalid username or password' };
      } else {
        const token = sign({
          id: user.id,
          username: user.username,
          publicKey: publicKey,
        });
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
