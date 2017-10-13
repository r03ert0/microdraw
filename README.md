# Microdraw

[![Join the chat at https://gitter.im/r03ert0/microdraw](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/r03ert0/microdraw?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

![microdraw-vervet](https://user-images.githubusercontent.com/2310732/31443628-40b315ec-ae9a-11e7-9c2e-d133b5921687.png)

Microdraw is a collaborative vectorial annotation tool for ultra
high resolution data, such as that produced by high-throughput histology.

Data visualisation uses OpenSeadragon, and data annotation uses Paper.js.

## Local Installation

### Basic Steps

* install nodejs
* checkout the repository `git clone https://github.com/r03ert0/microdraw.git`
* `cd microdraw`
* rename and adjust configuration example files
  * `github-keys.json.example -> github-keys.json`
  * `public/js/base.js.example -> public/js/base.js`
  * `public/js/configuration.json.example -> public/js/configuration.json`
* install the project: `npm install`
* run it: `npm run start`
* open http://localhost:3000

### Enable Github Login

* go to https://github.com/settings/applications/new and add a new application
* Homepage URL: http://localhost:3000
* Authorization callback URL: http://localhost:3000/auth/github/callback
* copy paste **client id** and **client secret** into `github-keys.json`

## License
This project is licensed under GNU GPL v3 or any later version.
