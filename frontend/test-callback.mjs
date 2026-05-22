import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  console.log('Navigating...');
  await page.goto('http://localhost:5173/callback?outTradeNo=ORDER_1777526850392&tradeToken=T2026043005386186296297&status=SUCCESS', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(2000);
  console.log('Done.');
  await browser.close();
})();
