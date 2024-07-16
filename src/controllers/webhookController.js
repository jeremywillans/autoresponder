const debug = require('debug')('autoresponder:webhookController');
const crypto = require('crypto');
const sparkService = require('../services/sparkService');
const redisService = require('../services/redisService');

function oAuthController() {
  async function getIndex(req, res) {
    debug('webhook get reached.. redirecting to root');
    res.redirect('/');
  }

  async function postIndex(req, res) {
    debug('webhook post initiated');

    // verify webhook payload
    try {
      await sparkService.verifyWebhookPayload(req.body);
      debug('webhook payload verified');
    } catch (error) {
      debug('unexpected payload POSTed, aborting...');
      res.status(400).json({
        message: 'Bad payload for Webhook',
        details: 'either the integration is misconfigured or Webex is running a new API version',
      });
    }

    // event is ready to be processed, send a response to Webex
    res.status(200).json({ message: 'message received and being processed by webhook' });

    // verify signature
    const signature = req.headers['x-spark-signature'];
    if (!signature) {
      debug('header X-Spark-Signature not found');
      return;
    }

    // secret for webhook
    const secret = req.body.createdBy.substring(req.body.createdBy.length - 15);
    // computed secret
    const computed = crypto.createHmac('sha1', secret).update(JSON.stringify(req.body)).digest('hex');
    if (signature !== computed) {
      debug('signatures do not match');
      return;
    }
    debug('signature check ok, continuing...');

    // Check if self is originator of message
    if (req.body.createdBy === req.body.data.personId) {
      debug('message from owner, skipping...');
      return;
    }
    // debug(JSON.stringify(req.body));
    //
    //
    if (req.body.data.roomType === 'group') {
      // check if @mentioned was directed
      if (req.body.data.mentionedPeople === undefined
        || req.body.data.mentionedPeople.indexOf(req.body.createdBy) === -1) {
        // check if @all was mentioned
        if (req.body.data.mentionedGroups === undefined
          || req.body.data.mentionedGroups.indexOf('all') === -1) {
          debug('not mentioned in message, skipping...');
          return;
        }
        const output = await redisService.get('tokens', req.body.createdBy);
        if (output.mentionAll !== 'checked') {
          debug('@all response disabled , skipping...');
          return;
        }
      }
    }

    // check if currently suppressed
    try {
      const output = await redisService.get('suppress', `${req.body.createdBy}-${req.body.data.personId}`);
      if (output !== null) {
        debug('user suppression in effect, skipping...');
        return;
      }
    } catch (error) {
      debug('not suppressed! continuing...');
    }

    try {
      // get data from redis
      const output = await redisService.get('tokens', req.body.createdBy);

      let roomTitle;
      // debug(JSON.stringify(output));
      if (req.body.data.roomType === 'group') {
        roomTitle = await sparkService.getField(output.access_token, `rooms/${req.body.data.roomId}`, 'title');
      }

      if (output.status === 'checked') {
        // send message to originator
        await sparkService.postMessage(output.access_token,
          req.body.data.personId, output.autoResponse);

        if (output.suppressionTime !== 'None') {
          try {
            // Verify Suppression is a Number
            let intTime = parseInt(output.suppressionTime, 10);
            if (Number.isNaN(intTime)) {
              intTime = 10;
            }
            const suppressionTime = new Date();
            suppressionTime.setMinutes(suppressionTime.getMinutes() + intTime);
            const epocTime = Math.floor(suppressionTime / 1000);
            // Prepare Data Table for Save
            const data = {
              id: `${req.body.createdBy}-${req.body.data.personId}`,
              suppressUntil: epocTime,
            };
            // suppress further messages
            await redisService.save('suppress', data);
            debug('saved to suppression list');
          } catch (error) {
            debug('unable to save suppression');
          }
        }


        debug(output.primaryEnabled);
        // prepare to send to Primary Account
        if (output.primaryEnabled !== 'checked') {
          debug('primary account send disabled, skipping...');
          return;
        }

        // get message details
        const messageObject = await sparkService.getField(output.access_token, `messages/${req.body.data.id}`);
        const sourceName = await sparkService.getField(output.access_token, `people/${req.body.data.personId}`, 'displayName');

        // construct message
        let message;
        if (req.body.data.roomType === 'direct') {
          message = `You have received the following message from **${sourceName}** (*${messageObject.personEmail}*)\n\n>*${messageObject.text}*`;
        } else {
          message = `You have received the following message from **${sourceName}** (*${messageObject.personEmail}*) in **${roomTitle}**\n\n>*${messageObject.text}*`;
        }

        // send message to primary account
        await sparkService.postMessage(output.access_token,
          output.primaryId, message);
      }
    } catch (error) {
      debug(`error encountered: ${error}`);
    }
  }

  return {
    getIndex,
    postIndex,
  };
}

module.exports = oAuthController;
