//
// Copyright (c) 2016 Cisco Systems
// Licensed under the MIT License
//

const debug = require('debug')('autoresponder:app');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const chalk = require('chalk');

const app = express();

// Import Integration Options
const params = require('./src/utils/params');

if (!params.publicURL) {
  process.stdout.write(`${chalk.red('ERROR: Missing Public URL')}`);
  process.exit(1);
}

// Execure Scheduler
require('./src/utils/scheduler');

app.use(express.static(path.join(__dirname, './src/public/')));
app.use('/js', express.static(path.join(__dirname, '/node_modules/jquery/dist')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
  secret: params.sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 120000 },
}));

app.set('views', './src/views');
app.set('view engine', 'ejs');

const oAuthRoutes = require('./src/routes/oAuthRoutes')();
const webhookRoutes = require('./src/routes/webhookRoutes')();
const configRoutes = require('./src/routes/configRoutes')();

app.use('/oauth', oAuthRoutes);
app.use('/webhook', webhookRoutes);
app.use('/config', configRoutes);

// debug(`URL Generated ${params.initiateURL}`);

// Build URL and Display Login Page
app.get('/', (req, res) => {
  if (typeof req.session.personId !== 'undefined') {
    debug('user logged in, redirecting to config page');
    res.redirect('/config');
    return;
  }
  res.render('index', { link: params.initiateURL });
});

// Starts the Cisco Spark Integration
app.listen(params.port, () => {
  process.stdout.write(`${chalk.red(`Cisco Webex Teams OAuth Integration started on port: ${chalk.green(`${params.port}`)}`)}\n`);
});
