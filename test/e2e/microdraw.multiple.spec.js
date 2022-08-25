/* global Microdraw */

'use strict';
const UI = require('../UI');
const U = require('../mocha.test.util');
const chai = require('chai');
const {assert} = chai;

// try {
//     require('puppeteer')
// } catch (e) {
//     console.warn(`[microdraw]: dependency error: puppeteer needs to be installed manually. - npm i puppeteer`)
//     process.exit(1)
// }
const puppeteer = require('puppeteer');

const shadow = (sel) => `document.querySelector("#content").shadowRoot.querySelector("${sel}")`;

const shadowclick = async function (sel, testPage) {
  const handle = await testPage.evaluateHandle(shadow(sel));
  await handle.click();
};

let browser;
let page;

describe('Editing tools: draw in multiple pages', () => {
  before(async () => {
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  });
  it('opens data page', async () => {
    page = await browser.newPage();
    await page.setViewport({width: U.width, height: U.height});
    // page.on('console', (message) =>
    //   console.log(`${message.type().substr(0, 3)
    //     .toUpperCase()} ${message.text()}`));

    await page.goto(
      'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      { waitUntil: 'networkidle0' }
    );

    // const diff1 = await U.comparePageScreenshots(
    //   page,
    //   'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
    //   'multiple.01.page.png'
    // );
    // const diff2 = await U.comparePageScreenshots(
    //   page2,
    //   'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
    //   'multiple.02.page2.png'
    // );
    // assert(diff1<U.pct5, `${diff1} pixels were different in page 1`);
    // assert(diff2<U.pct5, `${diff2} pixels were different in page 2`);
  }).timeout(0);

  // eslint-disable-next-line max-statements
  it('draws and saves a square in 1st page', async () => {
    await shadowclick(UI.DRAWPOLYGON, page);
    await page.mouse.click(400, 100);
    await page.mouse.click(500, 100);
    await page.mouse.click(500, 200);
    await page.mouse.click(400, 200);
    await page.mouse.click(400, 100);
    await shadowclick(UI.SAVE, page);
    await U.delay(1000);

    const res = await page.evaluate(() => ({
      sliceIndex: Number(Microdraw.dom.querySelector("#slice").dataset.val),
      regionsExists: typeof (Microdraw.ImageInfo[0].Regions) !== 'undefined',
      regionsLength: Microdraw.ImageInfo[0].Regions.length,
      pathSegments: Microdraw.ImageInfo[0].Regions[0].path.segments.length
    }));
    // console.log(res);
    assert(res.sliceIndex === 0, 'Slice index is not 0');
    assert(res.regionsExists === true, 'No Regions object');
    assert(res.regionsLength === 1, `Regions.length is ${res.regionsLength} instead of 1`);
    assert(res.pathSegments === 4, `Path has ${res.pathSegments} segments instead of 4`);

    // const filename = "multiple.04.page2-square.png";
    // await page2.screenshot({path: U.newPath + filename});
    // const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    // assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  // eslint-disable-next-line max-statements
  it('moves to the 2nd page and draws and saves a triangle', async () => {
    await shadowclick(UI.NEXT, page);
    await U.waitUntilHTMLRendered(page);
    await shadowclick(UI.DRAWPOLYGON, page);
    await page.mouse.click(300, 100);
    await page.mouse.click(400, 100);
    await page.mouse.click(350, 200);
    await page.mouse.click(300, 100);
    await shadowclick(UI.SAVE, page);
    await U.delay(1000);

    const res = await page.evaluate(() => ({
      sliceIndex: Number(Microdraw.dom.querySelector("#slice").dataset.val),
      regionsExists: typeof (Microdraw.ImageInfo[1].Regions) !== 'undefined',
      regionsLength: Microdraw.ImageInfo[1].Regions.length,
      pathSegments: Microdraw.ImageInfo[1].Regions[0].path.segments.length
    }));
    // console.log(res);
    assert(res.sliceIndex === 1, 'Slice index is not 1');
    assert(res.regionsExists === true, 'No Regions object');
    assert(res.regionsLength === 1, `Regions.length is ${res.regionsLength} instead of 1`);
    assert(res.pathSegments === 3, `Path has ${res.pathSegments} segments instead of 3`);

    // const filename = "multiple.03.page-triangle.png";
    // await page.screenshot({path: U.newPath + filename});
    // const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    // assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('square is still present after reloading the 1st page', async () => {
    await page.goto(
      'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      { waitUntil: 'networkidle0' }
    );

    const res = await page.evaluate(() => ({
      sliceIndex: Number(Microdraw.dom.querySelector("#slice").dataset.val),
      regionsExists: typeof (Microdraw.ImageInfo[0].Regions) !== 'undefined',
      regionsLength: Microdraw.ImageInfo[0].Regions.length,
      pathSegments: Microdraw.ImageInfo[0].Regions[0].path.segments.length
    }));
    // console.log(res);
    assert(res.sliceIndex === 0, 'Slice index is not 0');
    assert(res.regionsExists === true, 'No Regions object');
    assert(res.regionsLength === 1, `Regions.length is ${res.regionsLength} instead of 1`);
    assert(res.pathSegments === 4, `Path has ${res.pathSegments} segments instead of 4`);
  }).timeout(0);

  it('triangle is still present after reloading 2nd page', async () => {
    await page.reload();
    await U.waitUntilHTMLRendered(page);
    await shadowclick(UI.NEXT, page);
    await U.waitUntilHTMLRendered(page);

    const res = await page.evaluate(() => ({
      sliceIndex: Number(Microdraw.dom.querySelector("#slice").dataset.val),
      regionsExists: typeof (Microdraw.ImageInfo[1].Regions) !== 'undefined',
      regionsLength: Microdraw.ImageInfo[1].Regions.length,
      pathSegments: Microdraw.ImageInfo[1].Regions[0].path.segments.length
    }));
    // console.log(res);
    assert(res.sliceIndex === 1, 'Slice index is not 1');
    assert(res.regionsExists === true, 'No Regions object');
    assert(res.regionsLength === 1, `Regions.length is ${res.regionsLength} instead of 1`);
    assert(res.pathSegments === 3, `Path has ${res.pathSegments} segments instead of 3`);
  }).timeout(0);

  // eslint-disable-next-line max-statements
  it('clean up the 2 pages', async () => {
    await page.goto(
      'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      { waitUntil: 'networkidle0' }
    );

    // cleanup 1st page
    await U.waitUntilHTMLRendered(page);
    await shadowclick(UI.SELECT, page);
    await page.mouse.click(450, 150);
    await shadowclick(UI.DELETE, page);
    await shadowclick(UI.SAVE, page);
    await U.delay(1000);

    // cleanup 2nd page
    await shadowclick(UI.NEXT, page);
    await shadowclick(UI.SELECT, page);
    await page.mouse.click(350, 150);
    await shadowclick(UI.DELETE, page);
    await shadowclick(UI.SAVE, page);
    await U.delay(1000);
    await page.reload();
    await U.waitUntilHTMLRendered(page);

    // check 1st page is clean
    await shadowclick(UI.PREVIOUS, page);
    const res1 = await page.evaluate(() => ({
      sliceIndex: Number(Microdraw.dom.querySelector("#slice").dataset.val),
      regionsExists: typeof (Microdraw.ImageInfo[0].Regions) !== 'undefined',
      regionsLength: Microdraw.ImageInfo[0].Regions.length
    }));
    // console.log(res1);
    assert(res1.sliceIndex === 0, 'Slice index is not 0');
    assert(res1.regionsExists === true, 'No Regions object in page 2');
    assert(res1.regionsLength === 0, `Regions.length is ${res1.regionsLength} instead of 0 in page 2`);

    // check 2nd page is clean
    await shadowclick(UI.NEXT, page);
    const res2 = await page.evaluate(() => ({
      sliceIndex: Number(Microdraw.dom.querySelector("#slice").dataset.val),
      regionsExists: typeof (Microdraw.ImageInfo[1].Regions) !== 'undefined',
      regionsLength: Microdraw.ImageInfo[1].Regions.length
    }));
    // console.log(res2);
    assert(res2.sliceIndex === 1, 'Slice index is not 1');
    assert(res2.regionsExists === true, 'No Regions object in page 2');
    assert(res2.regionsLength === 0, `Regions.length is ${res2.regionsLength} instead of 0 in page 2`);
  }).timeout(0);

  after(async () => {
    await browser.close();
  });
});
