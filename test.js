'use strict';
const UI = require('./test/UI');
try {
    require('puppeteer')
} catch (e) {
    console.warn(`[microdraw]: dependency error: puppeteer needs to be installed manually. - npm i puppeteer`)
    process.exit(1)
}
const puppeteer = require('puppeteer');


const delay = (timeout) => {
    console.log('delay', timeout, 'milliseconds');

    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}

const shadow = (sel) => `document.querySelector("#content").shadowRoot.querySelector("${sel}")`;

const test = async () => {
    const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    console.log('puppeteer launched');

    const page = await browser.newPage();

    async function shadowclick(sel) {
        const handle = await page.evaluateHandle(shadow(sel));
        return handle.click();    
    }

    console.log('browser open');

    // capture console
    // page.on('console', (msg) => {
    //     console.log('PAGE LOG:', ...msg.args);
    // });

    // set viewport
    await page.setViewport({width: 1600, height: 1200});

    // OPEN HOMEPAGE
    console.log('go to home page');
    await page.goto('http://localhost:3000');
    await delay(2000);
    await page.screenshot({path:'test/01.home.png'});


    // OPEN DATA
    console.log('go to cat');
    await page.goto('http://localhost:3000/data?source=/test_data/cat.json&slice=0');
    await delay(2000);
    await page.screenshot({path:'test/02.cat.png'});

    // DELETE TRIANGLE
    // select tool
    console.log('DELETE TRIANGLE');
    await shadowclick(UI.SELECT);
    // select triangle
    await shadowclick(UI.CANVAS);
    await page.mouse.click(450, 250) ;
    // delete tool
    await shadowclick(UI.DELETE);
    await page.screenshot({path:'test/03.cat-delete.png'});

    // DRAW SQUARE
    // select the polygon tool
    await shadowclick(UI.DRAWPOLYGON);
    // draw a square A
    await page.mouse.click(400, 400) ;
    await page.mouse.click(500, 400) ;
    await page.mouse.click(500, 500) ;
    await page.mouse.click(400, 500) ;
    await page.mouse.click(400, 400) ;
    await page.screenshot({path:'test/04.cat-square-A.png'}) ;
    console.log('draw square A');

    // DRAW SQUARE B
    // draw a square B
    await page.mouse.click(450, 450) ;
    await page.mouse.click(550, 450) ;
    await page.mouse.click(550, 550) ;
    await page.mouse.click(450, 550) ;
    await page.mouse.click(450, 450) ;
    await page.screenshot({path:'test/05.cat-square-B.png'}) ;
    console.log('draw square B');

    // UNION OF SQUARES A AND B
    // select union tool
    await shadowclick(UI.ADDREGION);

    // click on square A (square B is already selected)
    await page.mouse.click(405, 405) ;

    // click on square B (square A is already selected)
    await page.mouse.click(540, 540) ;
    await page.screenshot({path:'test/06.cat-union.png'}) ;
    console.log('union');

    // DELETE A+B
    // select delete tool
    await shadowclick(UI.DELETE);
    await page.screenshot({path:'test/07.cat-delete.png'}) ;
    console.log('delete');

    // DRAW AGAIN THE INITIAL TRIANGLE
    // select the polygon tool
    await shadowclick(UI.DRAWPOLYGON);
    // draw a triangle
    await page.mouse.click(400, 200) ;
    await page.mouse.click(500, 200) ;
    await page.mouse.click(450, 300) ;
    await page.mouse.click(400, 200) ;
    await page.screenshot({path:'test/08.cat-triangle.png'}) ;
    console.log('draw triangle');

    // SAVE TO DB
    // select the save tool
    await shadowclick(UI.SAVE);
    await page.screenshot({path:'test/09.cat-save.png'}) ;
    console.log('save');

    // CLOSE
    await browser.close();
    console.log('browser closed');
}

test();