import { voodoo } from "./utils/voodoo.mjs";
import EZCrypto from "@justinwwolcott/ez-web-crypto";

async function encryptWithFormattedResponse(
  apiKey,
  deviceHash,
  serviceEncryptionKey,
  deviceParams,
  eventType,
  userId,
  cryptoCookie
) {
  const keyriApiPublicKey =
    "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEO6aCXxDctj+urHBGTGQgfJ9I9euUIPtkLYMfloUqz1m/zUMIY26Ojz97C/o72DtcXh0xEi6gD/W/jIMvaUJEgw==";

  const ezCrypto = new EZCrypto();
  const clientSigningKeys = await ezCrypto.EcMakeSigKeys();
  const timestamp = new Date().getTime();
  const encryptString = timestamp.toString().repeat(2);
  const timestampSignature = await ezCrypto.EcSignData(
    clientSigningKeys.privateKey,
    btoa(encryptString)
  );

  const plainTextPayload = btoa(
    JSON.stringify({
      apiKey,
      deviceHash,
      serviceEncryptionKey,
      deviceParams,
      eventType,
      eventResult: "incomplete",
      signals: [],
      userId,
      cryptoCookie,
      timestamp: encryptString,
      timestampSignature,
      clientSigningKey: clientSigningKeys.publicKey,
    })
  );

  const clientEncryptionKeys = await ezCrypto.EcMakeCryptKeys();
  const outputEncrypt = await ezCrypto.HKDFEncrypt(
    clientEncryptionKeys.privateKey,
    keyriApiPublicKey,
    plainTextPayload
  );
  return { publicKey: clientEncryptionKeys.publicKey, ...outputEncrypt };
}

export async function keyriEvent(
  userId,
  eventType,
  serviceEncryptionKey,
  apiKey,
  environment = "production"
) {
  const environmentUrls = {
    local: "http://localhost:8000/fingerprint",
    development: "https://dev-api.keyri.co/fingerprint",
    staging: "https://staging.keyri.co/fingerprint",
    production: "https://api.keyri.co/fingerprint",
  };

  const all = await voodoo();
  const deviceHash = all.creepHash;
  const cryptocookie = all.cryptoCookie;
  const deviceParams = {
    userAgent: all.fp.navigator.userAgent,
    appVersion: all.fp.navigator.userAgent,
    platform: all.fp.navigator.platform,
  };

  // Send to /new-device
  await fetch(`${environmentUrls[environment]}/new-device`, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceHash,
      deviceParams,
      cryptocookie,
    }),
  });

  const { ciphertext, publicKey, iv, salt } =
    await encryptWithFormattedResponse(
      apiKey,
      deviceHash,
      serviceEncryptionKey,
      deviceParams,
      eventType,
      userId,
      cryptocookie
    );

  // Send to /event
  const eventResponse = await fetch(`${environmentUrls[environment]}/event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientEncryptionKey: publicKey,
      encryptedPayload: ciphertext,
      iv,
      salt,
    }),
  });

  const encryptedEventData = await eventResponse.json();
  return encryptedEventData;
}
