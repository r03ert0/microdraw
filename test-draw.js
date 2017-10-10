'use strict';

var puppeteer = require('puppeteer');

function delay(timeout) {
    console.log('delay', timeout,'milliseconds');
    return new Promise((resolve) => {
        setTimeout(resolve, timeout);
    });
}

puppeteer.launch({headless: true})
.then(function(browser) {
    console.log('puppeteer launched');
    browser.newPage()
    .then(function(page) {
        console.log('browser open');

        // capture console
        page.on('console', msg => console.log('PAGE LOG:', ...msg.args));

        // set viewport
        page.setViewport({width: 1600, height: 1200})

        // OPEN HOMEPAGE
        .then(function() {return page.goto('http://localhost:3000')})
        .then(function() {return page.screenshot({path:'test/01.home.png'});})
        .then(function() {console.log('go to home page');})

        // OPEN DATA
        .then(function() {return page.goto('http://localhost:3000/data?source=/ferret/sub1.20.json')})
        .then(function() {return delay(2000);})
        .then(function() {return page.screenshot({path:'test/02.ferret.png'});})
        .then(function() {console.log('go to ferret');})

        // DELETE TRIANGLE
        // select tool
        .then(function() {return page.mouse.click(35, 270)})
        // select triangle
        .then(function() {return page.mouse.click(450, 250)})
        // delete tool
        .then(function() {return page.mouse.click(160, 400)})
        .then(function() {return page.screenshot({path:'test/03.ferret-delete.png'});})
        .then(function() {console.log('delete');})

        // DRAW SQUARE
        // select the polygon tool
        .then(function() {return page.mouse.click(120,270)})
        // draw a square A
        .then(function() {return page.mouse.click(400, 400)})
        .then(function() {return page.mouse.click(500, 400)})
        .then(function() {return page.mouse.click(500, 500)})
        .then(function() {return page.mouse.click(400, 500)})
        .then(function() {return page.mouse.click(400, 400)})
        .then(function() {return page.screenshot({path:'test/04.ferret-square-A.png'});})
        .then(function() {console.log('draw square A');})

        // DRAW SQUARE B
        // draw a square B
        .then(function() {return page.mouse.click(450, 450)})
        .then(function() {return page.mouse.click(550, 450)})
        .then(function() {return page.mouse.click(550, 550)})
        .then(function() {return page.mouse.click(450, 550)})
        .then(function() {return page.mouse.click(450, 450)})
        .then(function() {return page.screenshot({path:'test/05.ferret-square-B.png'});})
        .then(function() {console.log('draw square B');})

        // UNION OF SQUARES A AND B
        // select union tool
        .then(function() {return page.mouse.click(120, 315)})

        // click on square A (square B is already selected)
        .then(function() {return page.mouse.click(405, 405)})
        
        // click on square B (square A is already selected)
        .then(function() {return page.mouse.click(540, 540)})
        .then(function() {return page.screenshot({path:'test/06.ferret-union.png'});})
        .then(function() {console.log('union');})

        // DELETE A+B
        // select delete tool
        .then(function() {return page.mouse.click(160, 400)})
        // select the A+B object
        .then(function() {return page.mouse.click(405, 405)})
        .then(function() {return page.screenshot({path:'test/07.ferret-delete.png'});})
        .then(function() {console.log('delete');})

        // DRAW AGAIN THE INITIAL TRIANGLE
        // select the polygon tool
        .then(function() {return page.mouse.click(120,270)})
        // draw a square A
        .then(function() {return page.mouse.click(400, 200)})
        .then(function() {return page.mouse.click(500, 200)})
        .then(function() {return page.mouse.click(450, 300)})
        .then(function() {return page.mouse.click(400, 200)})
        .then(function() {return page.screenshot({path:'test/08.ferret-triangle.png'});})
        .then(function() {console.log('draw triangle');})

        // SAVE TO DB
        // select the save tool
        .then(function() {return page.mouse.click(35, 400)})
        .then(function() {return page.screenshot({path:'test/09.ferret-save.png'});})
        .then(function() {console.log('save');})

        // CLOSE
        .then(function() {return browser.close();})
        .then(function() {console.log('browser closed');})
    });
});

/* GUI element coordinates
//      35       75      120     160
// 270  select   pen     poly    simplify
// 315  add      remove  union   exclusion
// 350  segment  rotate  mirror  curve2poly
// 400  save     copy    paste   delete

// pen tool
.then(function() {return page.mouse.click(80,270)})

// polygon tool
.then(function() {return page.mouse.click(120,270)})

// add point tool
.then(function() {return page.mouse.click(35, 315)})

// region union tool
.then(function() {return page.mouse.click(120, 315)})
*/
