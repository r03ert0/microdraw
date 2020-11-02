'use strict';
const UI = require('../UI');
const U = require('../../test/mocha.test.util');
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

describe('View pages and data', async () => {
  it('opens browser', async () => {
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  }).timeout(0);

  it('shows the landing page', async () => {
    page = await browser.newPage();
    await page.setViewport({width: U.width, height: U.height})
    const diff = await U.comparePageScreenshots(
      page,
      'http://localhost:3000',
      'view.01.home.png'
    );
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('shows test data, first page', async () => {
    const diff = await U.comparePageScreenshots(
      page,
      'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      'view.02.cat.png'
    );
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('can go to the next page', async () => {
    await shadowclick(UI.NEXT);
    const filename = "view.03.cat-next.png";
    await page.screenshot({path: U.newPath + filename});
    await page.waitForFunction('Microdraw.isAnimating === false');
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('can go back to the previous page', async () => {
    await shadowclick(UI.PREVIOUS);
    const filename = "view.04.cat-prev.png";
    await page.screenshot({path: U.newPath + filename});
    await page.waitForFunction('Microdraw.isAnimating === false');
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('can zoom in', async () => {
    await shadowclick(UI.ZOOMIN);
    const filename = "view.05.cat-zoom-in.png";
    await page.screenshot({path: U.newPath + filename});
    await page.waitForFunction('Microdraw.isAnimating === false');
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  it('can translate', async () => {
    await shadowclick(UI.NAVIGATE);

    await page.mouse.move(U.width/2, U.height/2);
    await page.mouse.down();
    await page.mouse.move(U.width*2/3, U.height/2, {steps:50});
    await page.mouse.up();
    await page.waitForFunction('Microdraw.isAnimating === false');
    const filename = "view.06.cat-zoom-in-translate.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  it('can zoom out', async () => {
    await shadowclick(UI.ZOOMOUT);
    const filename = "view.07.cat-zoom-out.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  it('closes normally', async () => {
    await browser.close();
  });
});
