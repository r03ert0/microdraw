const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const jpeg = require('jpeg-js');
const pixelmatch = require('pixelmatch');
const { createHttpTerminator } = require('http-terminator');
const microdrawApp = require('../app/app');

let db, httpTerminator, server, ws;
const serverURL = "http://127.0.0.1:3000";

const initResources = async () => {
  const { server: appServer, app, wsServer } = await microdrawApp.start();

  server = appServer;
  db = app.db.mongoDB();
  ws = wsServer;
  httpTerminator = createHttpTerminator({ server });
};

const closeResources = async () => {
  if (db) {
    db.close();
  }
  if (ws) {
    ws.close();
  }
  if (httpTerminator) {
    await httpTerminator.terminate();
  }
};

const getServer = () => server;

const newPath = './test/e2e/screenshots/';
const refPath = './test/reference-screenshots/';
const width = 800;
const height = 600;
const pct1 = 0.01 * width * height;
const pct5 = 0.05 * width * height;

const delay = async function (delayTimeout) {
  await new Promise((resolve) => {
    setTimeout(resolve, delayTimeout);
  });
};

// eslint-disable-next-line max-statements
const waitUntilHTMLRendered = async function(page, timeout = 30000) {
  const checkDurationMsecs = 1000;
  const maxChecks = timeout / checkDurationMsecs;
  let lastHTMLSize = 0;
  let checkCounts = 1;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 3;

  for (checkCounts = 1; checkCounts <= maxChecks; checkCounts++) {
    /* eslint-disable no-await-in-loop */
    const html = await page.content();
    const currentHTMLSize = html.length;

    // const bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);

    // console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

    if (lastHTMLSize !== 0 && currentHTMLSize === lastHTMLSize) {
      countStableSizeIterations+=1;
    } else {
      countStableSizeIterations = 0; //reset the counter
    }

    if (countStableSizeIterations >= minStableSizeIterations) {
      // console.log("Page rendered fully..");
      break;
    }

    lastHTMLSize = currentHTMLSize;
    await page.waitForTimeout(checkDurationMsecs);
    /* eslint-enable no-await-in-loop */
  }
};


// eslint-disable-next-line max-statements
const compareImages = async function (pathImg1, pathImg2) {
  const data1 = await fs.promises.readFile(pathImg1);
  const data2 = await fs.promises.readFile(pathImg2);
  let img1, img2;
  if (pathImg1.split(".").pop() === "png") {
    img1 = PNG.sync.read(data1);
  } else if (pathImg1.split(".").pop() === "jpg") {
    img1 = jpeg.decode(data1);
  }
  if (pathImg2.split(".").pop() === "png") {
    img2 = PNG.sync.read(data2);
  } else if (pathImg2.split(".").pop() === "jpg") {
    img2 = jpeg.decode(data2);
  }
  const pixdiff = pixelmatch(img1.data, img2.data, null, img1.width, img1.height);

  return pixdiff;
};

const comparePageScreenshots = async function (testPage, url, filename) {
  const newFilePath = './test/e2e/screenshots/' + filename;
  const refFilePath = './test/reference-screenshots/' + filename;
  await testPage.goto(url, { waitUntil: 'networkidle0' });
  await waitUntilHTMLRendered(testPage);
  await testPage.screenshot({ path: newFilePath });
  const pixdiff = await compareImages(newFilePath, refFilePath);

  return pixdiff;
};

const getMockfsConfig = (dirname, filename, content) => {
  const obj = {};
  obj[path.join(dirname, filename)] = content;

  return obj;
};

const testingCredentials = {
  username: "testing-user",
  password: "baz"
};

const insertUser = function (user) {
  return db.get('users').insert(user);
};

const insertProject = function (project) {
  return db.get('projects').insert(project);
};

const queryProject = function (shortname) {
  return db.get('projects').findOne({ shortname, backup: { $exists: 0 } });
};

const removeLocalUser = function (username) {
  return db.get('users').remove({ username });
};

const removeUser = function (nickname) {
  return db.get('users').remove({ nickname });
};

const removeProject = function (shortname) {
  return db.get('projects').remove({ shortname });
};

const parseCookies = (str) => str
  .split(';')
  .map((v) => v.split('='))
  .reduce((acc, v) => {
    if (typeof v[0] === 'undefined' || typeof v[1] === 'undefined') {
      return acc;
    }
    acc.push({
      name: decodeURIComponent(v[0].trim()),
      value: decodeURIComponent(v[1].trim()),
      url: serverURL
    });

    return acc;
  }, []);

const privateProjectTest = {
  "name": "Test project",
  "shortname": "testproject",
  "url": "",
  "created": "2022-02-03T14:59:49.786Z",
  "owner": "foo",
  "collaborators": {
    "list": [
      {
        "username": "anyone",
        "access": {
          "collaborators": "none",
          "annotations": "none",
          "files": "none"
        },
        "name": "Any User"
      }
    ]
  },
  "files": {
    "list": [{ source: "https://microdraw.pasteur.fr/test_data/cat.json", name: "Cat" }]
  },
  "annotations": {
    "list": [
      {
        "type": "vectorial",
        "values": "Set I",
        "display": true,
        "name": "layer"
      }
    ]
  }
};

const createProjectWithPermission = function (name, accessProp) {
  const access = Object.assign({}, {
    collaborators: "none",
    annotations: "none",
    files: "none"
  }, accessProp);

  const project = {
    "name": name,
    "shortname": name,
    "url": "http://foo.bar",
    "created": "2022-02-03T14:59:49.786Z",
    "owner": "foo",
    "collaborators": {
      "list": [
        {
          "username": "anyone",
          "access": {
            "collaborators": "none",
            "annotations": "none",
            "files": "none"
          },
          "name": "Any User"
        }
      ]
    },
    "files": {
      "list": [{ source: "https://microdraw.pasteur.fr/test_data/cat.json", name: "cat" }]
    },
    "annotations": {
      "list": [
        {
          "type": "vectorial",
          "values": "Set I",
          "display": true,
          "name": "layer"
        }
      ]
    }

  };

  project.collaborators.list.push({
    access,
    userID: testingCredentials.username,
    username: testingCredentials.username,
    name: testingCredentials.username
  });

  return project;
};

module.exports = {
  compareImages,
  comparePageScreenshots,
  delay,
  getMockfsConfig,
  waitUntilHTMLRendered,
  insertUser,
  removeUser,
  removeLocalUser,
  insertProject,
  removeProject,
  queryProject,
  createProjectWithPermission,
  initResources,
  closeResources,
  getServer,
  parseCookies,
  serverURL,
  testingCredentials,
  privateProjectTest,
  newPath,
  refPath,
  width,
  height,
  pct1,
  pct5
};
