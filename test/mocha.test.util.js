
/*
const path = require('path')
exports.getMockfsConfig = (dirname, filename, content) => {
    const obj = {}
    obj[path.join(dirname, filename)] = content
    return obj
}
*/

const fs = require('fs');
const path = require('path');
const {PNG} = require('pngjs');
const pixelmatch = require('pixelmatch');

const newPath = './test/e2e/screenshots/';
const refPath = './test/reference-screenshots/';
const width = 800;
const height = 600;
const pct5 = 0.05 * width * height;


async function delay(delayTimeout) {
  await new Promise((resolve) => {
    setTimeout(resolve, delayTimeout);
  });
}

async function waitUntilHTMLRendered(page, timeout = 30000) {
  const checkDurationMsecs = 1000;
  const maxChecks = timeout / checkDurationMsecs;
  let lastHTMLSize = 0;
  let checkCounts = 1;
  let countStableSizeIterations = 0;
  const minStableSizeIterations = 3;

  while(checkCounts++ <= maxChecks) {
    const html = await page.content();
    const currentHTMLSize = html.length;

    const bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);

    // console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

    if(lastHTMLSize !== 0 && currentHTMLSize === lastHTMLSize) {
      countStableSizeIterations++;
    } else {
      countStableSizeIterations = 0; //reset the counter
    }

    if(countStableSizeIterations >= minStableSizeIterations) {
      // console.log("Page rendered fully..");
      break;
    }

    lastHTMLSize = currentHTMLSize;
    await page.waitForTimeout(checkDurationMsecs);
  }
}


function compareImages(pathImg1, pathImg2) {
  const data1 = fs.readFileSync(pathImg1);
  const data2 = fs.readFileSync(pathImg2);
  let img1, img2;
  if(pathImg1.split(".").pop() === "png") {
    img1 = PNG.sync.read(data1);
  } else if(pathImg1.split(".").pop() === "jpg") {
    img1 = jpeg.decode(data1);
  }
  if(pathImg2.split(".").pop() === "png") {
    img2 = PNG.sync.read(data2);
  } else if(pathImg2.split(".").pop() === "jpg") {
    img2 = jpeg.decode(data2);
  }
  const pixdiff = pixelmatch(img1.data, img2.data, null, img1.width, img1.height);

  return pixdiff;
}

async function comparePageScreenshots(testPage, url, filename) {
  const newPath = './test/e2e/screenshots/' + filename;
  const refPath = './test/reference-screenshots/' + filename;
  await testPage.goto(url, {waitUntil: 'networkidle0'});
  await waitUntilHTMLRendered(testPage);
  await testPage.screenshot({path: newPath});
  const pixdiff = compareImages(newPath, refPath);

  return pixdiff;
}

const getMockfsConfig = (dirname, filename, content) => {
  const obj = {}
  obj[path.join(dirname, filename)] = content
  return obj
}

module.exports = {
  compareImages,
  comparePageScreenshots,
  delay,
  getMockfsConfig,
  waitUntilHTMLRendered,
  newPath,
  refPath,
  width,
  height,
  pct5
}