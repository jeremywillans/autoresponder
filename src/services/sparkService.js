const debug = require('debug')('autoresponder:sparkService');
const axios = require('axios');
const qs = require('qs');
const params = require('../utils/params');

const supportedResources = ['memberships', 'messages', 'rooms'];
const supportedEvents = ['created', 'deleted', 'updated'];


function sparkService() {
  function getPersonId(accessToken, personEmail) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        url: `https://api.ciscospark.com/v1/people?email=${personEmail}`,
        headers:
        {
          authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        json: true,
      };

      axios.request(options)
        .then((response) => {
          // if invalid email - return error
          if (response.status === 400) {
            debug('invalid email address');
            reject(new Error('invalid email'));
          }
          // Check the call is successful
          if (response.status !== 200) {
            debug(`could not send the message, /rooms returned: ${response.status}`);
            reject(response.status);
          }
          // Check JSON payload is compliant with specs https://api.ciscospark.com/v1/rooms/
          if ((!response.data)) {
            debug('could not parse message details: bad json payload or could not find an id.');
            reject(new Error('invalid json data'));
          }
          try {
            debug('person located');
            resolve(response.data.items[0].id);
          } catch (error) {
            debug('no person found');
            reject(error);
          }
        })
        .catch((error) => {
          debug(`could not reach Cisco Spark to send message, error: ${error}`);
          reject(error);
        });
    });
  }

  function getField(accessToken, apiName, varName) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'GET',
        url: `https://api.ciscospark.com/v1/${apiName}`,
        headers:
        {
          authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        json: true,
      };

      axios.request(options)
        .then((response) => {
          // if invalid email - return error
          if (response.status === 400) {
            debug('invalid email address');
            reject(new Error('invalid email'));
          }
          // Check the call is successful
          if (response.status !== 200) {
            debug(`could not send the message, /${apiName} returned: ${response.status}`);
            reject(response.status);
          }
          // Check JSON payload is compliant with specs https://api.ciscospark.com/v1/rooms/
          if ((!response.data)) {
            debug('could not parse message details: bad json payload or could not find an id.');
            reject(new Error('invalid json'));
          }
          try {
            debug('getfield try');
            let output;
            if ((varName !== '') && varName !== undefined) {
              // debug('return variable');
              output = response.data[varName];
            } else {
              // debug('return object');
              output = response.data;
            }
            if (output === undefined || output === '') {
              reject(new Error('getField missing output'));
            }
            resolve(output);
          } catch (err) {
            debug('field not found');
            reject(err);
          }
        })
        .catch((error) => {
          debug(`could not reach Cisco Spark to send message, error: ${error}`);
          reject(error);
        });
    });
  }

  function postMessage(accessToken, personId, message) {
    return new Promise((resolve, reject) => {
      const options = {
        method: 'POST',
        url: 'https://api.ciscospark.com/v1/messages',
        headers:
        {
          authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          toPersonId: personId,
          markdown: message.replace(/\\n/g, '\n'),
        },
        json: true,
      };

      axios.request(options)
        .then((response) => {
          // Check the call is successful
          if (response.status !== 200) {
            debug(`could not send the message, /messages returned: ${response.status}`);
            reject(response.status);
          }
          // Check JSON payload is compliant with specs https://api.ciscospark.com/v1/rooms/
          if ((!response.data)) {
            debug('could not parse message details: bad json payload or could not find an id.');
            reject(response.status);
          }
          try {
            debug('message sent');
            resolve();
          } catch (error) {
            debug('message not sent');
            reject(error);
          }
        })
        .catch((error) => {
          debug(`could not reach Cisco Spark to send message, error: ${error}`);
          reject(error);
        });
    });
  }

  function postTokens(code) {
    return new Promise((resolve, reject) => {
      const data = {
        grant_type: 'authorization_code',
        client_id: params.clientId,
        client_secret: params.clientSecret,
        code,
        redirect_uri: params.redirectURI,
      };
      const options = {
        method: 'POST',
        url: 'https://api.ciscospark.com/v1/access_token',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        data: qs.stringify(data),
        json: true,
      };

      axios.request(options)
        .then((response) => {
          if (response.status !== 200) {
            debug(`access token not issued with status code: ${response.statusCode}`);
            switch (response.status) {
              case 400: {
                debug('bad request');
                reject(new Error(`bad request - error ${response.status}`));
                break;
              }
              case 401:
                debug('oAuth authentication error. check secret');
                reject(new Error(`oAuth authentication error. check secret - error ${response.status}`));
                break;
              default:
                debug('could not retreive your access token');
                reject(new Error(`could not retreive your access token - error ${response.status}`));
                break;
            }
            return;
          }

          // Check JSON payload is compliant with specs https://api.ciscospark.com/v1/rooms/
          if ((!response.data) || (!response.data.access_token) || (!response.data.refresh_token)) {
            debug('could not parse message details: bad json payload or could not find access codes.');
            reject(new Error('invalid json'));
          }
          try {
            debug('return token data');
            resolve(response.data);
          } catch (error) {
            debug('tokens not returnable');
            reject(error);
          }
        })
        .catch((error) => {
          debug(`could not reach Cisco Spark to send message, error: ${error}`);
          reject(error);
        });
    });
  }

  function postTokensRefresh(refreshToken) {
    return new Promise((resolve, reject) => {
      const data = {
        grant_type: 'refresh_token',
        client_id: params.clientId,
        client_secret: params.clientSecret,
        refresh_token: refreshToken,
      };
      const options = {
        method: 'POST',
        url: 'https://api.ciscospark.com/v1/access_token',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        data: qs.stringify(data),
        json: true,
      };

      axios.request(options)
        .then((response) => {
          if (response.status !== 200) {
            debug(`access token not issued with status code: ${response.statusCode}`);
            switch (response.status) {
              case 400: {
                debug('bad request');
                reject(new Error(`bad request - error ${response.status}`));
                break;
              }
              case 401:
                debug('oAuth authentication error. check secret');
                reject(new Error(`oAuth authentication error. check secret - error ${response.status}`));
                break;
              default:
                debug('could not retreive your access token');
                reject(new Error(`could not retreive your access token - error ${response.status}`));
                break;
            }
            return;
          }

          // Check JSON payload is compliant with specs https://api.ciscospark.com/v1/rooms/
          if ((!response.data) || (!response.data.access_token) || (!response.data.refresh_token)) {
            debug('could not parse message details: bad json payload or could not find access codes.');
            reject(new Error('invalid json'));
          }
          try {
            debug('return token data');
            resolve(response.data);
          } catch (error) {
            debug('tokens not returnable');
            reject(error);
          }
        })
        .catch((error) => {
          debug(`could not reach Cisco Spark to send message, error: ${error}`);
          reject(error);
        });
    });
  }

  function deleteWebhook(accessToken) {
    return new Promise((resolve, reject) => {
      let options = {
        method: 'GET',
        url: 'https://api.ciscospark.com/v1/webhooks',
        headers:
        {
          authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      };

      axios(options)
        .then((response) => {
          // Check the call is successful
          if (response.status !== 200) {
            debug(`could not send the message, /webhooks returned: ${response.statusCode}`);
            return;
          }

          // Check JSON payload is compliant with specs https://api.ciscospark.com/v1/people/me
          if (!response.data) {
            debug('could not parse message details: bad json payload');
            return;
          }

          response.data.items.forEach((element) => {
            if (element.name === 'Autoresponder Webhook') {
              options = {
                method: 'DELETE',
                url: `https://api.ciscospark.com/v1/webhooks/${element.id}`,
                headers:
                {
                  authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
              };
              axios(options)
                .then((responseDel) => {
                  // Check the call is successful
                  if (responseDel.status !== 204) {
                    debug(`could not send the message, /webhook delete returned: ${response.status} and ${response.data}`);
                    return;
                  }
                  debug('deleted webhook');
                })
                .catch((error) => {
                  debug(`could not reach Cisco Spark to send message, error: ${error}`);
                  reject(error);
                });
            }
          });
          resolve();
        })
        .catch((error) => {
          debug(`could not reach Cisco Spark to send message, error: ${error}`);
          reject(error);
        });
    });
  }

  function postWebhook(accessToken, id) {
    return new Promise((resolve, reject) => {
      const secret = id.substring(id.length - 15);
      const options = {
        method: 'POST',
        url: 'https://api.ciscospark.com/v1/webhooks',
        headers:
        {
          authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          name: 'Autoresponder Webhook',
          targetUrl: params.webhookURI,
          resource: 'messages',
          event: 'created',
          secret,
        },
        json: true,
      };

      axios(options)
        .then((response) => {
          // Check the call is successful
          if (response.status !== 200) {
            debug(`could not send the message, /webhooks returned: ${response.status}`);
            return;
          }

          // Check JSON payload is compliant with specs https://api.ciscospark.com/v1/people/me
          if ((!response.data) || (!response.data.id)) {
            debug('could not parse message details: bad json payload or could not find an id.');
            reject(new Error('invalid response'));
          }
          debug('created webhook');
          resolve();
        })
        .catch((error) => {
          debug(`could not reach Cisco Spark to send message, error: ${error}`);
          reject(error);
        });
    });
  }

  function verifyWebhookPayload(payload) {
    return new Promise((resolve, reject) => {
      if (!payload || !payload.id
        || !payload.name
        || !payload.created
        || !payload.targetUrl
        || !payload.resource
        || !payload.event
        || !payload.actorId
        || !payload.data
      ) {
        debug('received payload is not compliant with Webhook specifications');
        reject(new Error('invalid webook'));
      }

      if (supportedResources.indexOf(payload.resource) === -1) {
        debug(`incoming resource ${payload.resource} does not comply with webhook specifications`);
        reject(new Error('invalid webook'));
      }
      if (supportedEvents.indexOf(payload.event) === -1) {
        debug(`incoming event ${payload.event} does not comply with webhook specifications`);
        reject(new Error('invalid webook'));
      }
      if ((payload.resource === 'messages') && (payload.event === 'updated')) {
        debug('event "updated" is not expected for "messages" resource');
        reject(new Error('invalid webook'));
      }
      if ((payload.resource === 'rooms') && (payload.event === 'deleted')) {
        debug('event "deleted" is not expected for "rooms" resource');
        reject(new Error('invalid webook'));
      }
      resolve();
    });
  }

  return {
    getPersonId,
    getField,
    postMessage,
    postTokens,
    postTokensRefresh,
    deleteWebhook,
    postWebhook,
    verifyWebhookPayload,
  };
}


module.exports = sparkService();
