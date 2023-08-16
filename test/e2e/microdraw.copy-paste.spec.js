'use strict';
const UI = require('../UI');
const U = require('../mocha.test.util');
const chai = require('chai');
var {assert} = chai;

// try {
//   require('puppeteer');
// } catch (e) {
//   console.warn(`[microdraw]: dependency error: puppeteer needs to be installed manually. - npm i puppeteer`);
//   process.exit(1);
// }
const puppeteer = require('puppeteer');

const shadow = (sel) => `document.querySelector("#content").shadowRoot.querySelector("${sel}")`;

let browser;
let page;

const shadowclick = async function (sel) {
  const handle = await page.evaluateHandle(shadow(sel));
  await handle.click();
};

describe('Editing tools: Copy and paste', () => {
  before(async () => {
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  });
  it('opens a data page', async () => {
    page = await browser.newPage();
    await page.setViewport({width: U.width, height: U.height});
    await page.goto(
      'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      { waitUntil: 'networkidle0' }
    );
    await U.waitUntilHTMLRendered(page);
    // const diff = await U.comparePageScreenshots(
    //   page,
    //   'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
    //   'copyPaste.01.cat.png'
    // );
    // assert(diff<1000, `${diff} pixels were different`);
  }).timeout(0);

  it('draws a square', async () => {
    // select the polygon tool
    await shadowclick(UI.DRAWPOLYGON);
    // draw a square
    await page.mouse.click(400, 400);
    await page.mouse.click(500, 400);
    await page.mouse.click(500, 500);
    await page.mouse.click(400, 500);
    await page.mouse.click(400, 400);

    const res = await page.evaluate(() => ({
      regionsExists: typeof (Microdraw.ImageInfo[0].Regions) !== 'undefined',
      regionsLength: Microdraw.ImageInfo[0].Regions.length,
      pathSegments: Microdraw.ImageInfo[0].Regions[0].path.segments.length
    }));
    // console.log(res);
    assert(res.regionsExists === true, 'No Regions object');
    assert(res.regionsLength === 1, `Regions.length is ${res.regionsLength} instead of 1`);
    assert(res.pathSegments === 4, `Path has ${res.pathSegments} segments instead of 4`);

    // const filename = "copyPaste.02.cat-square.png";
    // await page.screenshot({path: U.newPath + filename});
    // const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    // assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  // eslint-disable-next-line max-statements
  it('move the first square and paste a second one', async () => {
    await shadowclick(UI.SELECT);
    await page.mouse.click(405, 405);
    await shadowclick(UI.COPY);

    await shadowclick(UI.SELECT);
    await page.mouse.click(405, 405);

    await page.mouse.move(405, 405);
    await page.mouse.down();
    await page.mouse.move(355, 355);
    await page.mouse.up();

    await shadowclick(UI.PASTE);

    const res = await page.evaluate(() => ({
      regionsExists: typeof (Microdraw.ImageInfo[0].Regions) !== 'undefined',
      regionsLength: Microdraw.ImageInfo[0].Regions.length,
      path1Segments: Microdraw.ImageInfo[0].Regions[0].path.segments.length,
      path2Segments: Microdraw.ImageInfo[0].Regions[1].path.segments.length
    }));
    // console.log(res);
    assert(res.regionsExists === true, 'No Regions object');
    assert(res.regionsLength === 2, `Regions.length is ${res.regionsLength} instead of 2`);
    assert(res.path1Segments === 4, `1st path has ${res.path1Segments} segments instead of 4`);
    assert(res.path2Segments === 4, `2nd path ${res.path2Segments} segments instead of 4`);

    // const filename = "copyPaste.03.cat-paste.png";
    // await page.screenshot({path: U.newPath + filename});
    // const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    // assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  after(async () => {
    await browser.close();
  });
});
