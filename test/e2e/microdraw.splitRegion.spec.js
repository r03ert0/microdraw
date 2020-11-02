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

describe('Editing tools: split regions', async () => {
  it('opens a data page', async () => {
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    page = await browser.newPage();
    await page.setViewport({width: U.width, height: U.height})
    const diff = await U.comparePageScreenshots(
      page,
      'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      'split.01.cat.png'
    );
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('draws a square', async () => {
    // select the polygon tool
    await shadowclick(UI.DRAWPOLYGON);
    // draw a square E
    await page.mouse.click(400, 400) ;
    await page.mouse.click(500, 400) ;
    await page.mouse.click(500, 500) ;
    await page.mouse.click(400, 500) ;
    await page.mouse.click(400, 400) ;

    const filename = "split.02.cat-square-E.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  it('draws another square', async () => {
    // draw a square F
    await page.mouse.click(450, 450) ;
    await page.mouse.click(550, 450) ;
    await page.mouse.click(550, 550) ;
    await page.mouse.click(450, 550) ;
    await page.mouse.click(450, 450) ;

    const filename = "split.03.cat-square-F.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  it('split square E using square F', async () => {
    await shadowclick(UI.SPLITREGION);

    // click on square E (square F is already selected)
    await page.mouse.click(405, 405) ;

    const filename = "split.04.cat-split.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  it('closes normally', async () => {
    await browser.close();
  });
});
