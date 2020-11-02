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

describe('Editing tools: simplify', async () => {
  it('opens a data page', async () => {
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], dumpio: false});
    page = await browser.newPage();
    await page.setViewport({width: U.width, height: U.height})
    const diff = await U.comparePageScreenshots(
      page,
      'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      'simplify.01.cat.png'
    );
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('draws a star polygon', async () => {
    // select the polygon tool
    await shadowclick(UI.DRAWPOLYGON);

    const o = [U.width*2/3, U.height/2];
    const r = U.width/4;
    for(let a=0; a<=360; a += 1) {
      const r1 = r*(0.8+ 0.2*Math.cos(a*Math.PI/180*10));
      const x = o[0] + r1*Math.cos(a*Math.PI/180);
      const y = o[1] + r1*Math.sin(a*Math.PI/180);
      await page.mouse.click(x, y);
    }

    const filename = "simplify.02.cat-star.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('simplify once', async () => {
    await shadowclick(UI.SIMPLIFY);

    const filename = "simplify.03.cat-simplified.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('simplify again', async () => {
    await shadowclick(UI.SIMPLIFY);

    const filename = "simplify.04.cat-simplified.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);


  it('closes normally', async () => {
    await browser.close();
  });
});
