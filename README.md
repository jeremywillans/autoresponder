
Webex Teams Auto Responder Integration

Written by Jeremy Willans (2019)

-------
PURPOSE
-------

This application was created as a mechanism of effectively managing multiple Webex Teams accounts. 

Whilst working as a Cisco Partner, we are required to maintain individual Teams accounts for ongoing organizational management (such as Directory Connector access). 
When clients were attempting to contact me, they would inadvertantly message my client account whcih I was not actively monitoring.

This application provies an auto-response mechanism back to the individual advising the status of this account, as well as the ability to forward the message to a primary account - being my Cisco Partner Webex Teams account.

------------
INSTALLATION
------------

1. Deploy Build and Docker Container

  docker build --tag autoresponder .
  docker create --name autoresponder -p xxxxx:3000 --link redis:redis -v <location>:/config autoresponder

2. Add .env file to Config Directory or define Environmental Variables - refer dotenv-sample
3. Configure HTTPS Reverse Proxy or Direct Internet Connectivity for Public URL
4. Connect to Public URL to complete setup for each client account.