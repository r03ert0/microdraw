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

describe('Editing tools: convert polygons to bézier and vice-versa', async () => {
  it('opens a data page', async () => {
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], dumpio: false});
    page = await browser.newPage();
    await page.setViewport({width: U.width, height: U.height})
    const diff = await U.comparePageScreenshots(
      page,
      'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      'toBezierPolygon.01.cat.png'
    );
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('draws a star polygon', async () => {
    // select the polygon tool
    await shadowclick(UI.DRAWPOLYGON);

    const o = [U.width*2/3, U.height/2];
    const r = U.width/4;
    for(let a=0; a<=360; a+=36) {
      const r1 = r*(1-0.5*(a%72==0));
      const x = o[0] + r1*Math.cos(a*Math.PI/180);
      const y = o[1] + r1*Math.sin(a*Math.PI/180);
      await page.mouse.click(x, y);
    }

    const filename = "toBezierPolygon.02.cat-star.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('converts the star polygon to a bézier curve', async () => {
    await shadowclick(UI.TOBEZIER);

    const filename = "toBezierPolygon.03.cat-star-toBezier.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('converts the star bézier back to a polygon', async () => {
    // conversion to polygon has to be confirmed through a dialog
    page.on('dialog', async dialog => {
        await dialog.accept();
    });

    await shadowclick(UI.TOPOLYGON);

    const filename = "toBezierPolygon.04.cat-star-toPolygon.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('closes normally', async () => {
    await browser.close();
  });
});
