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
let page1, page2;

describe('Editing tools: draw polygons and curves', () => {
  before(async () => {
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  });
  it('opens a data page', async () => {
    page1 = await browser.newPage();
    page2 = await browser.newPage();
    await page1.setViewport({width: U.width, height: U.height});
    await page2.setViewport({width: U.width, height: U.height});
    const diff1 = await U.comparePageScreenshots(
      page1,
      'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      'multiple.01.page1.png'
    );
    const diff2 = await U.comparePageScreenshots(
      page2,
      'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      'multiple.02.page2.png'
    );
    assert(diff1<U.pct5, `${diff1} pixels were different in page 1`);
    assert(diff2<U.pct5, `${diff2} pixels were different in page 2`);
  }).timeout(0);

  // eslint-disable-next-line max-statements
  it('draws and saves a square in page 2', async () => {
    await shadowclick(UI.DRAWPOLYGON, page2);
    await page2.mouse.click(400, 100);
    await page2.mouse.click(500, 100);
    await page2.mouse.click(500, 200);
    await page2.mouse.click(400, 200);
    await page2.mouse.click(400, 100);
    await shadowclick(UI.SAVE, page2);

    const filename = "multiple.04.page2-square.png";
    await page2.screenshot({path: U.newPath + filename});
    const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('draws and saves a triangle in page 1', async () => {
    await shadowclick(UI.DRAWPOLYGON, page1);
    await page1.mouse.click(300, 100);
    await page1.mouse.click(400, 100);
    await page1.mouse.click(350, 200);
    await page1.mouse.click(300, 100);
    await shadowclick(UI.SAVE, page1);

    const filename = "multiple.03.page1-triangle.png";
    await page1.screenshot({path: U.newPath + filename});
    const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('reload page 1', async () => {
    await page1.reload();
    await U.waitUntilHTMLRendered(page1);

    const filename = "multiple.05.page1-reload.png";
    await page1.screenshot({path: U.newPath + filename});
    const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  // eslint-disable-next-line max-statements
  it('clean up', async () => {
    await shadowclick(UI.SELECT, page1);
    await page1.mouse.click(350, 150);
    await shadowclick(UI.DELETE, page1);

    await shadowclick(UI.SELECT, page1);
    await page1.mouse.click(450, 150);
    await shadowclick(UI.DELETE, page1);

    await shadowclick(UI.SAVE, page1);

    const filename = "multiple.06.page1-cleanup.png";
    await page1.screenshot({path: U.newPath + filename});
    const diff = await U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  after(async () => {
    await browser.close();
  });
});
