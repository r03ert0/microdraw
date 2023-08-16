'use strict';
const UI = require('../UI');
const U = require('../mocha.test.util');
const chai = require('chai');
var {assert} = chai;

// try {
//     require('puppeteer')
// } catch (e) {
//     console.warn(`[microdraw]: dependency error: puppeteer needs to be installed manually. - npm i puppeteer`)
//     process.exit(1)
// }
const puppeteer = require('puppeteer');

const shadow = (sel) => `document.querySelector("#content").shadowRoot.querySelector("${sel}")`;

let browser;
let page;

const shadowclick= async function (sel) {
  const handle = await page.evaluateHandle(shadow(sel));
  await handle.click();
};

describe('Editing tools: Translate, rotate, flip', () => {
  before(async () => {
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  });
  it('opens a data page', async () => {
    page = await browser.newPage();
    await page.setViewport({width: U.width, height: U.height});
    await page.goto('http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      { waitUntil: 'networkidle0' });
    await U.waitUntilHTMLRendered(page);

    // const diff = await U.comparePageScreenshots(
    //   page,
    //   'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
    //   'transform.01.cat.png'
    // );
    // assert(diff<1000, `${diff} pixels were different`);
  }).timeout(0);

  // eslint-disable-next-line max-statements
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

    // await U.waitUntilHTMLRendered(page);
    // const filename = "transform.02.cat-square.png";
    // await page.screenshot({path: U.newPath + filename});
    // const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    // assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  /*

    Translation is disabled
    -----------------------

  // eslint-disable-next-line max-statements
  it('translate', async () => {
    await shadowclick(UI.SELECT);
    await page.mouse.click(405, 405);

    const res1 = await page.evaluate(() => ({
      regionX: Microdraw.ImageInfo[0].Regions[0].path.segments[0].point.x
    }));
    console.log(res1);

    await page.mouse.move(405, 405);
    await page.mouse.down();
    await page.mouse.move(255, 255, {steps: 10});
    await page.mouse.up();

    const res2 = await page.evaluate(() => ({
      regionX: Microdraw.ImageInfo[0].Regions[0].path.segments[0].point.x
    }));
    console.log(res2);

    assert(res1.regionX < res2.regionX, `X-coord is not larger after translation`);

    // const filename = "transform.03.cat-translate.png";
    // await page.screenshot({path: U.newPath + filename});
    // const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    // assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);
  */

  // eslint-disable-next-line max-statements
  it('rotate', async () => {
    await shadowclick(UI.SELECT);
    await page.mouse.click(405, 405);

    await shadowclick(UI.ROTATE);

    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(450, 300, {steps: 10});
    await page.mouse.up();

    const res = await page.evaluate(() => ({
      regionTransformationExists: typeof (Microdraw.ImageInfo[0].Regions[0].origin) !== 'undefined'
    }));

    assert(res.regionTransformationExists === true, 'No transformation matrix exists');

    // await U.waitUntilHTMLRendered(page);
    // const filename = "transform.04.cat-rotate.png";
    // await page.screenshot({path: U.newPath + filename});
    // const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    // assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  it('flip', async () => {

    const res1 = await page.evaluate(() => ({
      regionX: Microdraw.ImageInfo[0].Regions[0].path.segments[0].point.x
    }));
    // console.log(res1);

    await shadowclick(UI.FLIPREGION);

    const res2 = await page.evaluate(() => ({
      regionX: Microdraw.ImageInfo[0].Regions[0].path.segments[0].point.x
    }));
    // console.log(res2);

    assert(res2.regionX < res1.regionX, "X-coord of region is not smaller after flip");

    // const filename = "transform.05.cat-flip.png";
    // await page.screenshot({path: U.newPath + filename});
    // const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    // assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  after(async () => {
    await browser.close();
  });
});
