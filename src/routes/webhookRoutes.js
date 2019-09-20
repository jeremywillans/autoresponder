const express = require('express');
const webhookController = require('../controllers/webhookController');

const webhookRoutes = express.Router();

function router() {
  const { getIndex, postIndex } = webhookController();
  webhookRoutes.route('/')
    .post(postIndex)
    .get(getIndex);

  return webhookRoutes;
}

module.exports = router;
