const debug = require('debug')('autoresponder:scheduler');
const schedule = require('node-schedule');
const sparkService = require('../services/sparkService');
const redisService = require('../services/redisService');
const params = require('../utils/params');

debug('Scheduler Service Active');

const tokenRefresh = new schedule.RecurrenceRule();
tokenRefresh.dayOfWeek = [0, 2, 4, 6];
tokenRefresh.hour = 12;
tokenRefresh.minute = 0;

const messageSupression = new schedule.RecurrenceRule();
messageSupression.minute = 30;

schedule.scheduleJob(tokenRefresh, async (fireDate) => {
  debug(`This Refresh job was supposed to run at ${fireDate} but actually ran at ${new Date()}`);

  try {
    const keys = await redisService.hkeys('tokens');
    keys.forEach(async (element) => {
      debug(`processing refresh for ${element}`);

      const output = await redisService.get('tokens', element);
      const accessCodes = await sparkService.postTokensRefresh(output.refresh_token);

      // update redis with new tokens
      const data = {
        id: element,
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

      // save changes to Redis DB
      await redisService.save('tokens', data);
      debug('token refresh completed');
    });
  } catch (error) {
    debug(`error retrieving Keys from Redis! - ${error}`);
  }
});

let cronInt;
cronInt = parseInt(params.supressionTime, 10);
if ((cronInt < 1) || (cronInt > 59) || (Number.isNaN(cronInt))) {
  cronInt = 30;
  debug('rewrite');
}

schedule.scheduleJob(`*/${cronInt} * * * *`, async (fireDate) => {
  debug(`This Supression job was supposed to run at ${fireDate} but actually ran at ${new Date()}`);

  // Determine epoc time and add 5 minutes for balance
  const supressionTime = new Date();
  supressionTime.setMinutes(supressionTime.getMinutes() + 5);
  const epocTime = Math.floor(supressionTime / 1000);

  try {
    const keys = await redisService.hkeys('supress');
    keys.forEach(async (element) => {
      debug(`processing supression for ${element}`);
      const output = await redisService.get('supress', element);
      if (output.supressUntil <= epocTime) {
        await redisService.remove('supress', element);
        debug('supression removed');
      }
    });
  } catch (error) {
    debug(`error retrieving Keys from Redis! - ${error}`);
  }
});
