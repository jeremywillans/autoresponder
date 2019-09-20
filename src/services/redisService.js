// const debug = require('debug')('autoresponder:redis');
const redis = require('redis');
const params = require('../utils/params');

const config = {
  namespace: params.redisNamespace,
  method: params.redisMethod,
  port: params.redisPort,
  host: params.redisHost,
};

const client = redis.createClient(config);

function redisService() {
  function get(ns, id) {
    return new Promise((resolve, reject) => {
      try {
        client.hget(`${params.redisNamespace}:${ns}`, id, (err, res) => {
          if (err) { reject(err); }
          resolve(res ? JSON.parse(res) : null);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function hkeys(ns) {
    return new Promise((resolve, reject) => {
      try {
        client.hkeys(`${params.redisNamespace}:${ns}`, (err, res) => {
          if (err) { reject(err); }
          resolve(res);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  function save(ns, object) {
    return new Promise((resolve, reject) => {
      if (!object.id) {
        reject(new Error('The given object must have an id property'));
      }
      try {
        client.hset(`${params.redisNamespace}:${ns}`, object.id, JSON.stringify(object));
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  function remove(ns, id) {
    return new Promise((resolve, reject) => {
      try {
        client.hdel(`${params.redisNamespace}:${ns}`, [id]);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  return {
    get,
    hkeys,
    save,
    remove,
  };
}

module.exports = redisService();
