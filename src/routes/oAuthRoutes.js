const express = require('express');
const oAuthController = require('../controllers/oAuthController');

const oAuthRoutes = express.Router();

function router() {
  const { getIndex } = oAuthController();

  oAuthRoutes.route('/')
    .get(getIndex);

  return oAuthRoutes;
}

module.exports = router;
