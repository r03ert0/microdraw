# MicroDraw

[![CircleCI](https://circleci.com/gh/r03ert0/microdraw/tree/master.svg?style=shield)](https://circleci.com/gh/r03ert0/microdraw/tree/master) [![Join the chat at https://gitter.im/r03ert0/microdraw](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/r03ert0/microdraw?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

![microdraw-vervet](https://user-images.githubusercontent.com/2310732/31443628-40b315ec-ae9a-11e7-9c2e-d133b5921687.png)

MicroDraw is a collaborative vectorial annotation tool for ultra
high resolution data, such as that produced by high-throughput histology.

Data visualisation uses OpenSeadragon, and data annotation uses Paper.js.

## Developer install instructions
as of 2018-07-09

### Basic Steps

#### without docker
* install nodejs
* install mongo

* checkout the repository `git clone https://github.com/r03ert0/microdraw.git`
* `cd microdraw`
* rename and adjust `./app/auth/github-keys.json` example file
  * `./app/auth/github-keys.json.example -> ./app/auth/github-keys.json`
    * Get your Github developer keys for your local microdraw url
      * go to `https://github.com/settings/applications/new` and add a new application
      * App name: MicroDraw development for example
      * Homepage URL: http://localhost:3000
      * Authorization callback URL: http://localhost:3000/auth/github/callback
      * copy paste **client id**, **client secret** and **callback URL** into `github-keys.json`
* install the project
  * cd into microdraw
  * `npm install`
* run the project
  * in one terminal window start `mongod` database and leave it run
  * in another terminal: cd into microdraw folder: `npm start`
* open http://localhost:3000 to see MicroDraws landing page and click any of the data links provided
* test data can be viewed at http://localhost:3000/data?source=/test_data/cat.json

#### with docker
* checkout the repository `git clone https://github.com/r03ert0/microdraw.git`
* rename and adjust `github-keys.json` example file
  * `github-keys.json.example -> github-keys.json`
    * Get your Github developer keys for your local microdraw url
      * go to `https://github.com/settings/applications/new` and add a new application
      * App name: MicroDraw development for example
      * Homepage URL: http://localhost:3000
      * Authorization callback URL: http://localhost:3000/auth/github/callback
      * copy paste **client id**, **client secret** and **callback URL** into `github-keys.json`
* `cd microdraw/bin`
* `docker-compose up`
* open http://localhost:3000 to see MicroDraws landing page and click any of the data links provided
* test data can be viewed at http://localhost:3000/data?source=/test_data/cat.json

### To set up your own local data folder
* cd to /public directory, put yourDataFolder here which must contain
    * a folder with the folders with your data tiles in dzi format
    * the .dzi file containing the information about your data (generated by the converter)
    * a json file containing information about your data in the following form:
    ```
    {
      "pixelsPerMeter": 1000000,
      "tileSources": [
        "yourDataFolder/yourData.dzi"
      ]
    }
    ```


## License
This project is licensed under GNU GPL v3 or any later version.

