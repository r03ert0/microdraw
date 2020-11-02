'use strict';
const UI = require('../UI');
const U = require('../mocha.test.util');
const chai = require('chai');
var assert = chai.assert;

try {
    require('puppeteer')
} catch (e) {
    console.warn(`[microdraw]: dependency error: puppeteer needs to be installed manually. - npm i puppeteer`)
    process.exit(1)
}
const puppeteer = require('puppeteer');

const shadow = (sel) => `document.querySelector("#content").shadowRoot.querySelector("${sel}")`;

async function shadowclick(sel) {
  const handle = await page.evaluateHandle(shadow(sel));
  return handle.click();    
}

let browser;
let page;

describe('Editing tools: Copy and paste', async () => {
  it('opens a data page', async () => {
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    page = await browser.newPage();
    await page.setViewport({width: U.width, height: U.height})
    const diff = await U.comparePageScreenshots(
      page,
      'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      'copyPaste.01.cat.png'
    );
    assert(diff<1000, `${diff} pixels were different`);
  }).timeout(0);

  it('draws a square', async () => {
    // select the polygon tool
    await shadowclick(UI.DRAWPOLYGON);
    // draw a square
    await page.mouse.click(400, 400) ;
    await page.mouse.click(500, 400) ;
    await page.mouse.click(500, 500) ;
    await page.mouse.click(400, 500) ;
    await page.mouse.click(400, 400) ;

    const filename = "copyPaste.02.cat-square.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

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

    const filename = "copyPaste.03.cat-paste.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  it('closes normally', async () => {
    await browser.close();
  });
});
