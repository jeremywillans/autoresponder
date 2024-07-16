const debug = require('debug')('autoresponder:params');
const env = require('node-env-file');

// Load ENV File from Config Directory
try {
  if (process.env.NODE_ENV === 'production') {
    env('/config/.env');
  } else {
    env(`${__dirname}/../../.env`);
  }
} catch (error) {
  debug(`error: ${error}`);
}

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const publicURL = process.env.PUBLIC_URL;
const redirectURI = process.env.REDIRECT_URI || `${publicURL}/oauth`;
const webhookURI = process.env.WEBHOOK_URI || `${publicURL}/webhook`;
const port = process.env.PORT || 3000;
const state = 'autorespond3r';
const scopes = 'spark:kms spark:people_read spark:rooms_read spark:messages_write spark:messages_read';
const initiateURL = `https://api.ciscospark.com/v1/authorize?&client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectURI)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
const redisHost = process.env.REDIS_HOST || 'redis';
const redisPort = process.env.REDIS_PORT || '6379';
const redisNamespace = process.env.REDIS_NAMESPACE || 'autoresponder';
const redisMethod = process.env.REDIS_METHOD || 'userdata';
const suppressionTime = process.env.SUPPRESSION_TIME || '10';
const sessionSecret = process.env.SESSION_SECRET || 'sdfgtrsgsgsegaergwre';

module.exports = {
  clientId,
  clientSecret,
  port,
  redirectURI,
  state,
  scopes,
  initiateURL,
  publicURL,
  redisHost,
  redisPort,
  redisNamespace,
  redisMethod,
  sessionSecret,
  suppressionTime,
  webhookURI,
};
