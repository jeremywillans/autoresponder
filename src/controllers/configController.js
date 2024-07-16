const debug = require('debug')('autoresponder:configController');
const sparkService = require('../services/sparkService');
const redisService = require('../services/redisService');

function configController() {
  async function getIndex(req, res) {
    debug('config get initiate');

    if (typeof req.session.personId === 'undefined') {
      debug('no session data, redirecting...');
      res.redirect('/');
      return;
    }

    try {
      const output = await redisService.get('tokens', req.session.personId);
      res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.header('Expires', '-1');
      res.header('Pragma', 'no-cache');

      // Check Field Population Status
      let testButton;
      if ((output.primaryId === '') || (output.autoResponse === '')) {
        testButton = 'disabled';
      } else {
        testButton = ' href=/config/test';
      }

      res.render('configPage', {
        displayName: req.session.displayName,
        personId: req.session.personId,
        primaryId: output.primaryId,
        primaryEmail: output.primaryEmail,
        primaryEnabled: output.primaryEnabled,
        autoResponse: output.autoResponse,
        mentionAll: output.mentionAll,
        suppressionTime: output.suppressionTime,
        status: output.status,
        errorStatus: '',
        errorMessage: '',
        successStatus: '',
        testButton,
      });
    } catch (error) {
      debug(`error encountered: ${error}`);
    }
  }

  async function postConfig(req, res) {
    debug('config post initiate');
    if (typeof req.session.personId === 'undefined') {
      debug('session timed out... redirecting');
      res.redirect('/');
      return;
    }
    req.session.touch();

    // Check Field Population Status
    let primaryId;
    let testButton;
    let errStatus;
    let errMessage = '';
    let successStatus;

    if (req.body.primaryEnabled === 'checked' && req.body.primaryEmail === '') {
      errStatus = true;
      errMessage += ' Missing Primary Email';
    }

    if (req.body.autoResponse === '') {
      if (errStatus === true) {
        errMessage += ' and Auto Response!';
      } else {
        errStatus = true;
        errMessage += ' Missing Auto Response';
      }
    }

    if (errStatus) {
      errStatus = 'is-visible';
      testButton = 'disabled';
      req.body.status = '';
      res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.header('Expires', '-1');
      res.header('Pragma', 'no-cache');
      res.render('configPage', {
        displayName: req.session.displayName,
        personId: req.session.personId,
        primaryId,
        primaryEmail: req.body.primaryEmail,
        primaryEnabled: req.body.primaryEnabled || '',
        autoResponse: req.body.autoResponse,
        mentionAll: req.body.mentionAll || '',
        suppressionTime: req.body.suppressionTime,
        status: req.body.status || '',
        errorStatus: errStatus,
        errorMessage: errMessage,
        successStatus,
        testButton,
      });
    } else {
      try {
        if (req.body.primaryEnabled === 'checked') {
          const returnId = await sparkService.getPersonId(req.session.access_token,
            req.body.primaryEmail);
          primaryId = returnId;
          testButton = ' href=/config/test';
          successStatus = 'is-visible';
        } else {
          primaryId = '';
          testButton = 'disabled';
        }
      } catch (error) {
        // no person found
        errMessage += ' Invalid Primary Account';
        primaryId = 'Error';
        errStatus = 'is-visible';
        testButton = 'disabled';
        req.body.status = '';
        debug(`invalid person id: ${error}`);
      }

      try {
        const output = await redisService.get('tokens', req.session.personId);

        // Prepare Data Table for Save
        const data = {
          id: req.body.id,
          access_token: output.access_token,
          refresh_token: output.refresh_token,
          primaryId: primaryId || '',
          primaryEmail: req.body.primaryEmail || '',
          primaryEnabled: req.body.primaryEnabled || '',
          autoResponse: req.body.autoResponse || '',
          mentionAll: req.body.mentionAll || '',
          suppressionTime: req.body.suppressionTime,
          status: req.body.status || '',
        };

        // save changes to Redis DB
        await redisService.save('tokens', data);

        // Update Webhook Status
        if ((output.status !== 'checked') && (req.body.status === 'checked')) {
          debug('delete existing webhooks');
          await sparkService.deleteWebhook(output.access_token);
          debug('creating webhook');
          await sparkService.postWebhook(output.access_token, req.body.id);
        } else if ((output.status === 'checked') && (req.body.status !== 'checked')) {
          debug('deleting webhook');
          await sparkService.deleteWebhook(output.access_token);
        }
      } catch (error) {
        debug(`error encountered: ${error}`);
        res.send('<h1>Redis Database Issue </h1><p>Sorry, could not save the details for your Webex Teams account. Try again...</p>');
        return;
      }

      res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.header('Expires', '-1');
      res.header('Pragma', 'no-cache');
      res.render('configPage', {
        displayName: req.session.displayName,
        personId: req.session.personId,
        primaryId,
        primaryEmail: req.body.primaryEmail,
        primaryEnabled: req.body.primaryEnabled || '',
        autoResponse: req.body.autoResponse,
        mentionAll: req.body.mentionAll || '',
        suppressionTime: req.body.suppressionTime,
        status: req.body.status || '',
        errorStatus: errStatus,
        errorMessage: errMessage,
        successStatus,
        testButton,
      });
    }
  }

  async function getTest(req, res) {
    debug('test get initiate');
    if (typeof req.session.personId === 'undefined') {
      debug('session timed out... redirecting');
      res.redirect('/');
      return;
    }
    req.session.touch();

    try {
      const output = await redisService.get('tokens', req.session.personId);
      await sparkService.postMessage(output.access_token, output.primaryId, output.autoResponse);
    } catch (error) {
      debug(`unable send send message: ${error}`);
    }
    res.redirect('/config');
  }

  async function getDelete(req, res) {
    debug('test get initiate');
    if (typeof req.session.personId === 'undefined') {
      debug('session timed out... redirecting');
      res.redirect('/');
      return;
    }
    req.session.touch();

    try {
      await redisService.remove('tokens', req.session.personId);
    } catch (error) {
      debug(`unable to delete instance: ${error}`);
    }
    res.redirect('/config/logout');
  }

  async function getLogout(req, res) {
    debug('config logout initiate');

    // construct return url
    const logoutURL = 'https://idbroker.webex.com/idb/oauth2/v1/logout';
    // perform logout
    req.session.destroy();
    res.redirect(logoutURL);
  }

  return {
    getIndex,
    postConfig,
    getTest,
    getDelete,
    getLogout,
  };
}

module.exports = configController;
