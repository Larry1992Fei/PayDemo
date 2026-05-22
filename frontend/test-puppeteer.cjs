const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err));
  
  console.log('Navigating to /callback...');
  try {
    await page.goto('http://localhost:5173/callback?outTradeNo=ORDER_1777526850392&tradeToken=T2026043005386186296297&status=SUCCESS', { waitUntil: 'networkidle0' });
    console.log('Navigation complete. Waiting 2 seconds...');
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    console.error('Navigation error:', e);
  }
  
  await browser.close();
  console.log('Done.');
})();
