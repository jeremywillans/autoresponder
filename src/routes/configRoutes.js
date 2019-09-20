const express = require('express');
const configController = require('../controllers/configController');

const configRoutes = express.Router();

function router() {
  const {
    getIndex,
    postConfig,
    getTest,
    getDelete,
    getLogout,
  } = configController();

  configRoutes.route('/')
    .get(getIndex);
  configRoutes.route('/update')
    .get(getIndex)
    .post(postConfig);
  configRoutes.route('/test')
    .get(getTest);
  configRoutes.route('/delete')
    .get(getDelete);
  configRoutes.route('/logout')
    .get(getLogout);

  return configRoutes;
}

module.exports = router;
