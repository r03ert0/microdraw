'use strict';
const UI = require('./test/UI');
const puppeteer = require('puppeteer');


function delay(timeout) {
    console.log('delay', timeout, 'milliseconds');

    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}

puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
.then(function(browser) {
    console.log('puppeteer launched');
    browser.newPage()
    .then(function(page) {
        console.log('browser open');

        // capture console
        // page.on('console', (msg) => {
        //     console.log('PAGE LOG:', ...msg.args);
        // });

        // set viewport
        page.setViewport({width: 1600, height: 1200})

        // OPEN HOMEPAGE
        .then(() => {
          console.log('go to home page');
          page.goto('http://localhost:3000');
        })
        .then(() => delay(2000))
        .then(() => page.screenshot({path:'test/01.home.png'}))


        // OPEN DATA
        .then(() => {
          console.log('go to cat');
          page.goto('http://localhost:3000/data?source=/test_data/cat.json');
        })
        .then(() => delay(2000))
        .then(() => page.screenshot({path:'test/02.cat.png'}))

        // DELETE TRIANGLE
        // select tool
        .then(() => page.$(UI.SELECT).then((el) => el.click()))
        // select triangle
        .then(() => page.$(UI.CANVAS).then((el) => el.click()))
        // delete tool
        .then(() => {
          console.log('delete');
          page.$(UI.DELETE).then((el) => el.click());
        })
        .then(() => page.screenshot({path:'test/03.cat-delete.png'}))

        // DRAW SQUARE
        // select the polygon tool
        .then(() => page.$(UI.DRAWPOLYGON).then((el) => el.click()))
        // draw a square A
        .then(() => page.mouse.click(400, 400) )
        .then(() => page.mouse.click(500, 400) )
        .then(() => page.mouse.click(500, 500) )
        .then(() => page.mouse.click(400, 500) )
        .then(() => page.mouse.click(400, 400) )
        .then(() => page.screenshot({path:'test/04.cat-square-A.png'}) )
        .then(function() { console.log('draw square A'); })

        // DRAW SQUARE B
        // draw a square B
        .then(() => page.mouse.click(450, 450) )
        .then(() => page.mouse.click(550, 450) )
        .then(() => page.mouse.click(550, 550) )
        .then(() => page.mouse.click(450, 550) )
        .then(() => page.mouse.click(450, 450) )
        .then(() => page.screenshot({path:'test/05.cat-square-B.png'}) )
        .then(function() { console.log('draw square B'); })

        // UNION OF SQUARES A AND B
        // select union tool
        .then(() => page.$(UI.ADDREGION).then((el) => el.click()))

        // click on square A (square B is already selected)
        .then(() => page.mouse.click(405, 405) )

        // click on square B (square A is already selected)
        .then(() => page.mouse.click(540, 540) )
        .then(() => page.screenshot({path:'test/06.cat-union.png'}) )
        .then(function() { console.log('union'); })

        // DELETE A+B
        // select delete tool
        .then(() => page.$(UI.DELETE).then((el) => el.click()) )
        .then(() => page.screenshot({path:'test/07.cat-delete.png'}) )
        .then(function() { console.log('delete'); })

        // DRAW AGAIN THE INITIAL TRIANGLE
        // select the polygon tool
        .then(() => page.$(UI.DRAWPOLYGON).then((el) => el.click()) )
        // draw a triangle
        .then(() => page.mouse.click(400, 200) )
        .then(() => page.mouse.click(500, 200) )
        .then(() => page.mouse.click(450, 300) )
        .then(() => page.mouse.click(400, 200) )
        .then(() => page.screenshot({path:'test/08.cat-triangle.png'}) )
        .then(function() { console.log('draw triangle'); })

        // SAVE TO DB
        // select the save tool
        .then(() => page.$(UI.SAVE).then((el) => el.click()) )
        .then(() => page.screenshot({path:'test/09.cat-save.png'}) )
        .then(function() { console.log('save'); })

        // CLOSE
        .then(() => browser.close())
        .then(function() { console.log('browser closed'); });
    });
});
