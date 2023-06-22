import bcrypt from 'bcryptjs';
import EZCrypto from '@justinwwolcott/ez-web-crypto';
import { query } from '../../../database';
import { sign } from '../../lib/jwt';
import { checkWarnOrDeny } from '@/lib/riskAnalysis';

export default async function signup(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { username, password, publicKey, encryptedSignupEventString } =
    req.body;
  let statusCode, response;

  try {
    const ezcrypto = new EZCrypto();

    const rpPrivateKey = process.env.RP_ENCRYPTION_PRIVATE_KEY;
    const encryptedSignupEvent = JSON.parse(encryptedSignupEventString);
    console.log('encryptedSignupEvent', encryptedSignupEvent);

    let decryptedSignupEvent = await ezcrypto.HKDFDecrypt(
      rpPrivateKey,
      encryptedSignupEvent.publicEncryptionKey,
      encryptedSignupEvent.salt,
      encryptedSignupEvent.iv,
      encryptedSignupEvent.ciphertext
    );

    decryptedSignupEvent = new TextDecoder().decode(decryptedSignupEvent);
    decryptedSignupEvent = JSON.parse(decryptedSignupEvent);
    console.log('decryptedSignupEvent', decryptedSignupEvent);
    const riskDetermination = decryptedSignupEvent.riskSummary;
    console.log('riskDetermination', riskDetermination);
    const signals = decryptedSignupEvent.signals;
    const riskParams = decryptedSignupEvent.signals;
    const location = decryptedSignupEvent.ipLocationData;
    const fingerprintId = decryptedSignupEvent.deviceId;
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
      const existingUsers = await query(
        'SELECT * FROM users_fraud_demo WHERE username = $1',
        [username]
      );
      if (existingUsers.length > 0) {
        statusCode = 409;
        response = { error: 'User already exists' };
      } else {
        const hashedPassword = await bcrypt.hash(password, 12);
        await query(
          'INSERT INTO users_fraud_demo (username, password) VALUES ($1, $2)',
          [username, hashedPassword]
        );

        const users = await query(
          'SELECT * FROM users_fraud_demo WHERE username = $1',
          [username]
        );
        const user = users[0];

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

  res.status(statusCode).json(response);
}
