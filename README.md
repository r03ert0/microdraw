# MicroDraw

[![CI](https://github.com/neuroanatomy/microdraw/actions/workflows/main.yml/badge.svg)](https://github.com/neuroanatomy/microdraw/actions/workflows/main.yml) [![CircleCI](https://circleci.com/gh/r03ert0/microdraw/tree/master.svg?style=shield)](https://circleci.com/gh/r03ert0/microdraw/tree/master) [![Join the chat at https://gitter.im/r03ert0/microdraw](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/r03ert0/microdraw?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

![microdraw-vervet](https://user-images.githubusercontent.com/2310732/31443628-40b315ec-ae9a-11e7-9c2e-d133b5921687.png)

MicroDraw is a collaborative vectorial annotation tool for ultra
high resolution data, such as that produced by high-throughput histology.

Data visualisation uses OpenSeadragon, and data annotation uses Paper.js.

## Developer install instructions

As of July 2018

### Basic Steps

#### Without docker
* Install nodejs
* Install mongo

* Checkout the repository `git clone https://github.com/neuroanatomy/microdraw.git`
* `cd microdraw`
* install the project
  * cd into microdraw
  * `npm install`
  * `npm run build-pages`
  * drop the `.example` in `cfg.json.example`
  * drop the `.example` in `app/auth/github-keys.json.example`
  * drop the `.example` in `app/controller/microdrawWebsocketServer/whitelist.json.example`
  * drop the `.example` in `app/controller/microdrawWebsocketServer/blacklist.json.example`
* run the project
  * in one terminal window start `mongod` database and leave it run
  * in another terminal: cd into microdraw folder: `npm start`
* open http://localhost:3000 to see MicroDraws landing page and click any of the data links provided
* test data can be viewed at http://localhost:3000/data?source=/test_data/cat.json

#### With docker
* checkout the repository `git clone https://github.com/neuroanatomy/microdraw.git`
* `cd microdraw`
* `docker-compose build`
* `docker-compose up`
* open http://localhost:3001 to see MicroDraw's landing page and click any of the data links provided
* test data can be viewed at http://localhost:3001/data?source=/test_data/cat.json

### Users management
Microdraw utilises [passportjs](http://www.passportjs.org/) to manage user login. By default, Microdraw is configured to use `Github` and `local` strageties. 

You may also want to set the session secret by setting the environment variable: `SESSION_SECRET=MySuperDuperSecret`

#### Enable Github signin strategy

* Get your Github developer keys for your local microdraw url
  * go to `https://github.com/settings/applications/new` and add a new application
  * App name: MicroDraw development for example
  * Homepage URL: http://localhost:3000
  * Authorization callback URL: http://localhost:3000/auth/github/callback (this may differ between your development/production instances)
* copy paste **client id**, **client secret** and **callback URL** into `./app/auth/github-keys.json`

#### Enable Local signin strategy

* Set environment variable: `LOCALSIGNIN=true`

_n.b. it is highly advised to not use local strategies to manage users unless absolutely necessary._

### Annotations management
Microdraw uses [mongodb](https://docs.mongodb.com/) to manage the annotations by default. You may choose to use a different solution, by replacing `./app/db/db.js` and replace with your own backend. 

You can set a custom endpoint for mongodb by setting the environment variable : `MONGODB=url-to-mongo:27017/db_name`

#### Programmatic access of annotations
In order to access the user specific annotation, logged in user can visit `token` endpoint on a logged in browser. This will generate a token, which, when appended as a query param with the key `token` can be used as proxy to user login.

```
# get annotations
curl -XGET /api?source=/path/to/file&slice=12&token=FAKE_TOKEN
```

```
# save annotation
curl -XPOST /api?source=/path/to/file&slice=12token=FAKE_TOKEN -H "Content-Type: application/json" -d"{\"hello\":\"world\"}"
```

```
# save annotation via API
# note that only the files in the `data` field is parsed and saved
curl -XPOST /api?action=save&source=/path/to/file&slice=12token=FAKE_TOKEN -F "data=@/path/to/file.json"
```

```
# append annotation via API
# note that only the files in the data field is parsed and appended
curl -XPOST /api?action=append&source=/path/to/file&slice=12token=FAKE_TOKEN -F "data=@/path/to/file.json"
```

> ### saving strategy
> [multer](https://www.npmjs.com/package/multer) is used to handle uploaded file. An optional TMP_DIR environmental variable can be set for the uploaded json file to be saved to disk. If unset, multer is configured to use buffer storage.

The token expires after 24 hours by default (can be changed by setting env `TOKEN_DURATION`)

#### Example data.json file
TODO

#### Saving annotation via file upload
Deploy environments may not allow for `fs` access. As a result, Microdraw uses [memory storage](https://github.com/expressjs/multer#memorystorage) by default. This can lead to OOM. If `TMP_DIR` env is set, Microdraw will use `TMP_DIR` to write uploaded file. 

### Set up your own local data folder
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

