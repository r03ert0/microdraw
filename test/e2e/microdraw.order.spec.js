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

const shadowclick = async function (sel) {
  const handle = await page.evaluateHandle(shadow(sel));
  await handle.click();
};

describe('Editing tools: order', () => {
  it('opens a data page', async () => {
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], dumpio: false});
    page = await browser.newPage();
    await page.setViewport({width: U.width, height: U.height});
    await page.goto('http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      { waitUntil: 'networkidle0' });
    await U.waitUntilHTMLRendered(page);

  //   const diff = await U.comparePageScreenshots(
  //     page,
  //     'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
  //     'order.01.cat.png'
  //   );
  //   assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  // eslint-disable-next-line max-statements
  it('draws four overlapping triangles', async () => {
    // select the polygon tool
    await shadowclick(UI.DRAWPOLYGON);

    for(let i=0; i<4; i++) {
      // draw a triangle
      /* eslint-disable no-await-in-loop */
      await page.mouse.click(300 + i*10, 100 + i*10);
      await page.mouse.click(400 + i*10, 100 + i*10);
      await page.mouse.click(350 + i*10, 200 + i*10);
      await page.mouse.click(300 + i * 10, 100 + i * 10);
      /* eslint-enable no-await-in-loop */
    }

    await shadowclick(UI.SELECT);
    await page.mouse.click(500, 100);

    const res = await page.evaluate(() => ({
      regionsExists: typeof (Microdraw.ImageInfo[0].Regions) !== 'undefined',
      regionsLength: Microdraw.ImageInfo[0].Regions.length,
      firstRegionX: Microdraw.ImageInfo[0].Regions[0].path.segments[0].point.x,
      lastRegionX: Microdraw.ImageInfo[0].Regions[3].path.segments[0].point.x
    }));
    console.log(res);
    assert(res.regionsExists === true, 'No Regions object');
    assert(res.regionsLength === 4, `Regions.length is ${res.regionsLength} instead of 4`);
    assert(res.firstRegionX < res.lastRegionX, `X-coord of 1st region is not smaller than that of the last region`);

    // await U.waitUntilHTMLRendered(page);
    // const filename = "order.02.triangles.png";
    // await page.screenshot({path: U.newPath + filename});
    // const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    // assert(diff<1000, `${diff} pixels were different`);
  }).timeout(0);

  // eslint-disable-next-line max-statements
  it('invert the order by sending front', async () => {
    for(let i=2; i>=0; i--) {
      /* eslint-disable no-await-in-loop */
      await shadowclick(UI.SELECT);
      await page.mouse.click(395 + i*10, 101 + i*10);
      await shadowclick(UI.FRONT);
      /* eslint-enable no-await-in-loop */
    }

    await shadowclick(UI.SELECT);
    await page.mouse.click(500, 100);

    const res = await page.evaluate(() => ({
      regionsExists: typeof (Microdraw.ImageInfo[0].Regions) !== 'undefined',
      regionsLength: Microdraw.ImageInfo[0].Regions.length,
      firstRegionX: Microdraw.ImageInfo[0].Regions[0].path.segments[0].point.x,
      lastRegionX: Microdraw.ImageInfo[0].Regions[3].path.segments[0].point.x
    }));
    console.log(res);
    assert(res.regionsExists === true, 'No Regions object');
    assert(res.regionsLength === 4, `Regions.length is ${res.regionsLength} instead of 4`);
    assert(res.lastRegionX < res.firstRegionX, `X-coord of last region is not smaller than that of the 1st region`);

    // await U.waitUntilHTMLRendered(page);
    // const filename = "order.03.invert.png";
    // await page.screenshot({path: U.newPath + filename});
    // const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    // assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  // eslint-disable-next-line max-statements
  it('invert the order by sending back', async () => {
    for (let i = 2; i >= 0; i--) {
      /* eslint-disable no-await-in-loop */
      await shadowclick(UI.SELECT);
      await page.mouse.click(395 + i*10, 101 + i*10);
      await shadowclick(UI.BACK);
      /* eslint-enable no-await-in-loop */
    }

    await shadowclick(UI.SELECT);
    await page.mouse.click(500, 100);

    const res = await page.evaluate(() => ({
      regionsExists: typeof (Microdraw.ImageInfo[0].Regions) !== 'undefined',
      regionsLength: Microdraw.ImageInfo[0].Regions.length,
      firstRegionX: Microdraw.ImageInfo[0].Regions[0].path.segments[0].point.x,
      lastRegionX: Microdraw.ImageInfo[0].Regions[3].path.segments[0].point.x
    }));
    console.log(res);
    assert(res.regionsExists === true, 'No Regions object');
    assert(res.regionsLength === 4, `Regions.length is ${res.regionsLength} instead of 4`);
    assert(res.firstRegionX < res.lastRegionX, `X-coord of 1st region is not smaller than that of the last region`);

    // await U.waitUntilHTMLRendered(page);
    // const filename = "order.04.invert-again.png";
    // await page.screenshot({path: U.newPath + filename});
    // const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    // assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  after(async () => {
    await browser.close();
  });
});
