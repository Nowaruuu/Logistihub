const puppeteer = require('puppeteer');
const path = require('path');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const filePath = path.resolve(__dirname, 'questionnaire.html');
  await page.goto('file:///' + filePath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
  await page.pdf({
    path: path.resolve(__dirname, 'LogistiHub_Questionnaire.pdf'),
    format: 'Letter',
    margin: { top: '0.4in', bottom: '0.4in', left: '0.6in', right: '0.6in' },
    printBackground: true
  });
  console.log('PDF saved!');
  await browser.close();
})();
