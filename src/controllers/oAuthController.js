const debug = require('debug')('autoresponder:oAuthController');
const sparkService = require('../services/sparkService');
const redisService = require('../services/redisService');
const params = require('../utils/params');

function oAuthController() {
  async function getIndex(req, res) {
    debug('oauth callback initiate');

    // Process Authoriation Codes
    if (req.query.error) {
      if (req.query.error === 'access_denied') {
        debug(`user declined, received err: ${req.query.error}`);
        res.send('<h1>OAuth Integration could not complete</h1><p>Got your NO, ciao.</p>');
        return;
      }

      if (req.query.error === 'invalid_scope') {
        debug(`wrong scope requested, received err: ${req.query.error}`);
        res.send('<h1>OAuth Integration could not complete</h1><p>The application is requesting an invalid scope, Bye bye.</p>');
        return;
      }

      if (req.query.error === 'server_error') {
        debug(`server error, received err: ${req.query.error}`);
        res.send('<h1>OAuth Integration could not complete</h1><p>Cisco Spark sent a Server Error, Auf Wiedersehen.</p>');
        return;
      }

      debug(`received err: ${req.query.error}`);
      res.send('<h1>OAuth Integration could not complete</h1><p>Error case not implemented, au revoir.</p>');
      return;
    }

    // Check request parameters correspond to the spec
    if ((!req.query.code) || (!req.query.state)) {
      debug('expected code & state query parameters are not present');
      res.redirect('/');
      return;
    }

    // Check State
    // [NOTE] we implement a Security check below,
    if (params.state !== req.query.state) {
      debug('State does not match');
      res.send('<h1>OAuth Integration could not complete</h1><p>Wrong secret, aborting...</p>');
      return;
    }

    let accessCodes;
    try {
      // Retreive access token (expires in 14 days) & refresh token (expires in 90 days)
      accessCodes = await sparkService.postTokens(req.query.code);

      // Retreive user name
      const displayName = await sparkService.getField(accessCodes.access_token, 'people/me', 'displayName');
      const id = await sparkService.getField(accessCodes.access_token, 'people/me', 'id');

      let data;
      try {
        const output = await redisService.get('tokens', id);
        data = {
          id,
          access_token: accessCodes.access_token,
          refresh_token: accessCodes.refresh_token,
          primaryId: output.primaryId || '',
          primaryEmail: output.primaryEmail || '',
          primaryEnabled: output.primaryEnabled || '',
          autoResponse: output.autoResponse || '',
          mentionAll: output.mentionAll || '',
          supressionTime: output.supressionTime || '',
          status: output.status || '',
        };
      } catch (err) {
        debug('new redis entry');
        data = {
          id,
          access_token: accessCodes.access_token,
          refresh_token: accessCodes.refresh_token,
          primaryId: '',
          primaryEmail: '',
          primaryEnabled: '',
          autoResponse: '',
          mentionAll: 'checked',
          supressionTime: '10',
          status: '',
        };
      }

      // save changes to Redis DB
      await redisService.save('tokens', data);

      // Set Session Data
      req.session.personId = id;
      req.session.displayName = displayName;
      req.session.access_token = accessCodes.access_token;

      // Redirect to Configuration Page
      res.redirect('/config');
    } catch (error) {
      debug(error);
      res.send('<h1>OAuth Integration could not complete</h1><p>Sorry, could not retreive your access token. Try again...</p>');
    }
  }

  return {
    getIndex,
  };
}

module.exports = oAuthController;
