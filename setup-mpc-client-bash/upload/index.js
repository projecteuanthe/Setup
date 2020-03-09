const { Account } = require('web3x/account');
const { hexToBuffer, bufferToHex } = require('web3x/utils');
const { createReadStream, existsSync, statSync } = require('fs');
const { createHash } = require('crypto');
const http = require('http');
const https = require('https');
const fetch = require('isomorphic-fetch');
const progress = require('progress-stream');

// USAGE: node index.js <0xPRIVATE_KEY_HEX> <PATH_TO_NEW_PARAMS> <API_URL>

// code modified from setup-mpc-common
function hashFile(path) {
  const stream = createReadStream(path);
  const hash = createHash('sha256');

  return new Promise(resolve => {
    stream.on('end', () => {
      hash.end();
      resolve(hash.read());
    });

    stream.pipe(hash);
  });
}

async function main(privateKey, paramsPath, apiUrl) {
  const myAccount = Account.fromPrivate(hexToBuffer(privateKey));

  if (!existsSync(paramsPath)) {
    throw new Error('Params file not found.');
  }
  const hash = await hashFile(paramsPath);
  const { signature: pingSig } = myAccount.sign('ping');
  const { signature: dataSig } = myAccount.sign(bufferToHex(hash));

  const paramsStream = createReadStream(paramsPath);
  paramsStream.on('error', error => {
    console.error('Params file read error: ', error);
    reject(new Error('Failed to read params file.'));
  });

  const stats = statSync(paramsPath);
  const progStream = progress({ length: stats.size, time: 1000 });
  progStream.on('progress', progress => {
    console.log(`transferred ${progress.transferred}`);
  });
  paramsStream.pipe(progStream);

  const agent = /^https/.test(apiUrl) ? new https.Agent({ keepAlive: true }) : new http.Agent({ keepAlive: true });

  const response = await fetch(`${apiUrl}/api/data/${myAccount.address.toString().toLowerCase()}/0`, {
    keepalive: true,
    agent,
    method: 'PUT',
    body: progStream,
    headers: {
      'X-Signature': `${pingSig},${dataSig}`,
      'Content-Type': 'application/octet-stream',
      'Content-Length': `${stats.size}`,
    },
  });

  if (response.status !== 200) {
    throw new Error(`Upload failed, bad status code: ${response.status}`);
  } else {
    console.log('Upload successful!');
  }
}

const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('USAGE: node index.js <0xPRIVATE_KEY_HEX> <PATH_TO_NEW_PARAMS> <API_URL>');
  throw new Error('Invalid args.');
}

main(...args);
