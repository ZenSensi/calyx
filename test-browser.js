const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
  });

  page.on('pageerror', error => {
    console.log('UNCAUGHT ERROR:', error.message);
  });

  await page.goto('http://localhost:5173');
  
  // Fill the form
  await page.type('#participantName', 'Bot');
  await page.type('#roomName', 'testroom');
  await page.click('button[type="submit"]');
  
  // Wait for 5 seconds to let React crash if it's going to
  await new Promise(r => setTimeout(r, 5000));
  
  await browser.close();
})();
