import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    
    await page.goto('http://localhost:5173');
    await page.waitForSelector('[data-square="e2"]');

    console.log("Moving e2 to e4");
    // Move White e2 to e4
    const e2 = await page.$('[data-square="e2"]');
    const e2Box = await e2.boundingBox();
    await page.mouse.move(e2Box.x + 10, e2Box.y + 10);
    await page.mouse.down();
    const e4 = await page.$('[data-square="e4"]'); // wait, e4 doesn't have a piece, so data-square might not exist on the square itself?
    // Let's use coordinates
    await page.mouse.move(e2Box.x + 10, e2Box.y - e2Box.height * 2 + 10);
    await page.mouse.up();
    
    await new Promise(r => setTimeout(r, 500));
    
    console.log("Dragging White d2 to d4 (out of turn)");
    const d2 = await page.$('[data-square="d2"]');
    const d2Box = await d2.boundingBox();
    await page.mouse.move(d2Box.x + 10, d2Box.y + 10);
    await page.mouse.down();
    await page.mouse.move(d2Box.x + 10, d2Box.y - d2Box.height * 2 + 10);
    await page.mouse.up();

    await new Promise(r => setTimeout(r, 500));

    console.log("Clicking Black d7, then d5");
    const d7 = await page.$('[data-square="d7"]');
    const d7Box = await d7.boundingBox();
    // click d7
    await page.mouse.click(d7Box.x + 10, d7Box.y + 10);
    
    await new Promise(r => setTimeout(r, 500));
    
    // click d5
    await page.mouse.click(d7Box.x + 10, d7Box.y + d7Box.height * 2 + 10);
    
    await new Promise(r => setTimeout(r, 500));
    
    // Check if d5 has a piece now
    const d5Piece = await page.$('[data-square="d5"]');
    console.log("Does d5 have a piece?", d5Piece ? "YES" : "NO");

    await browser.close();
})();
