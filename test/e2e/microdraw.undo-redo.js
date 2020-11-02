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

describe('Editing tools: undo and redo', async () => {
  it('opens a data page', async () => {
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'], dumpio: false});
    page = await browser.newPage();
    await page.setViewport({width: U.width, height: U.height})
    const diff = await U.comparePageScreenshots(
      page,
      'http://localhost:3000/data?source=/test_data/cat.json&slice=0',
      'undo.01.cat.png'
    );
    assert(diff<U.pct5, `${diff} pixels were different`);
  }).timeout(0);

  it('draws a triangle, a square and a circle', async () => {
    // select the polygon tool
    await shadowclick(UI.DRAWPOLYGON);

    // draw a triangle
    await page.mouse.click(300, 100);
    await page.mouse.click(400, 100);
    await page.mouse.click(350, 200);
    await page.mouse.click(300, 100);

    // draw a square
    await page.mouse.click(400, 150);
    await page.mouse.click(450, 150);
    await page.mouse.click(450, 250);
    await page.mouse.click(400, 250);
    await page.mouse.click(400, 150);

    // draw a circle
    await shadowclick(UI.DRAW);
    const o = [500, 200];
    const r = 100;
    for(let a=0; a<=360; a+=1) {
      const x = o[0] + r*Math.cos(a*Math.PI/180);
      const y = o[1] + r*Math.sin(a*Math.PI/180);
      await page.mouse.move(x, y);
      if( a === 0 ) {
        await page.mouse.down();
      }
    }
    await page.mouse.up();

    const filename = "undo.02.cat-triangle-square-circle.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<1000, `${diff} pixels were different`);
  }).timeout(0);

  it('undo', async () => {
    for(let i=0; i<10; i+=1) {
      await shadowclick(UI.UNDO);
    }

    const filename = "undo.03.undo.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);

  it('redo', async () => {
    for(let i=0; i<10; i+=1) {
      await shadowclick(UI.REDO);
    }

    const filename = "undo.04.redo.png";
    await page.screenshot({path: U.newPath + filename}) ;
    const diff = U.compareImages(U.newPath + filename, U.refPath + filename);
    assert(diff<U.pct5, `${diff} pixels were different - more than 5%`);
  }).timeout(0);


  it('closes normally', async () => {
    await browser.close();
  });
});
