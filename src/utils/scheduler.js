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

const messageSuppression = new schedule.RecurrenceRule();
messageSuppression.minute = 30;

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
        suppressionTime: output.suppressionTime || '',
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
cronInt = parseInt(params.suppressionTime, 10);
if ((cronInt < 1) || (cronInt > 59) || (Number.isNaN(cronInt))) {
  cronInt = 30;
  debug('rewrite');
}

schedule.scheduleJob(`*/${cronInt} * * * *`, async (fireDate) => {
  debug(`This Suppression job was supposed to run at ${fireDate} but actually ran at ${new Date()}`);

  // Determine epoc time and add 5 minutes for balance
  const suppressionTime = new Date();
  suppressionTime.setMinutes(suppressionTime.getMinutes() + 5);
  const epocTime = Math.floor(suppressionTime / 1000);

  try {
    const keys = await redisService.hkeys('suppress');
    keys.forEach(async (element) => {
      debug(`processing suppression for ${element}`);
      const output = await redisService.get('suppress', element);
      if (output.suppressUntil <= epocTime) {
        await redisService.remove('suppress', element);
        debug('suppression removed');
      }
    });
  } catch (error) {
    debug(`error retrieving Keys from Redis! - ${error}`);
  }
});
