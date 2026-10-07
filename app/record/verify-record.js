/* Local-only record restoration, export and responsive print checks. */
'use strict';
const path=require('path'),fs=require('fs'),assert=require('node:assert/strict');
const puppeteer=require(process.env.PUP_DIR||'/home/damienriehl/.npm/_npx/7d92d9a2d2ccc630/node_modules/puppeteer');
(async()=>{
  const browser=await puppeteer.launch({executablePath:process.env.CHROME_BIN||'/snap/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  // Snap Chromium has a private /tmp; keep uploads and downloads in a
  // directory that both Node and the browser can access.
  const testDir=fs.mkdtempSync(path.join(__dirname,'verify-tmp-'));
  const fixture=path.join(testDir,'fixture.json');
  const doc={schema_version:1,entries:[{date:'2026-10-05',matter_id:'m01',matter_title:'Synthetic matter',activity:'interview',scores:[{area:'rapport_opening',earned:7,possible:10}]}]};
  fs.writeFileSync(fixture,JSON.stringify(doc));
  try{
    for(const width of [1280,390]){
      const page=await browser.newPage();await page.setViewport({width,height:900});
      await page.evaluateOnNewDocument(()=>localStorage.removeItem('sonsteng-type-lg'));
      page.on('dialog',()=>{throw Error('Unexpected browser dialog');});
      await page.goto('file://'+path.resolve(__dirname,'../../site/platform/record/index.html'));
      await page.click('[data-record-mode="session"]');
      await page.click('details summary');
      const input=await page.$('#import-file');await input.uploadFile(fixture);
      await page.click('#preview-import');await page.waitForFunction(()=>document.getElementById('import-preview').textContent.length>0);
      assert.equal(await page.$eval('#apply-import',e=>e.hidden),false,await page.$eval('#import-preview',e=>e.textContent));
      await page.click('#apply-import');assert.match(await page.$eval('#milestones',e=>e.textContent),/first interview/);
      assert.equal(await page.$$eval('#entries article',els=>els.length),1);
      const downloadDir=path.join(testDir,'downloads-'+width);
      const client=await page.createCDPSession();await client.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:downloadDir});
      await page.click('#export-json');await page.waitForFunction(()=>document.getElementById('storage-status').textContent.includes('exported'));
      const exported=path.join(downloadDir,'practice-record.json');
      for(let i=0;i<50&&!fs.existsSync(exported);i++)await new Promise(resolve=>setTimeout(resolve,100));
      assert.deepEqual(JSON.parse(fs.readFileSync(exported,'utf8')),doc);
      await page.click('#export-csv');await page.waitForFunction(()=>document.getElementById('storage-status').textContent.includes('CSV'));
      await page.click('#type-toggle');assert.ok(await page.evaluate(()=>document.documentElement.classList.contains('type-lg')));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.emulateMediaType('print');assert.equal(await page.$eval('.actions',e=>[...e.querySelectorAll('button')].every(b=>getComputedStyle(b).display==='none')),true);
      await page.emulateMediaType('screen');await page.click('#clear');await page.click('#clear-cancel');assert.equal(await page.$$eval('#entries article',els=>els.length),1);
      await page.click('#clear');await page.click('#clear-yes');assert.equal(await page.$$eval('#entries article',els=>els.length),0);
      await input.uploadFile(exported);await page.click('#preview-import');
      await page.waitForFunction(()=>document.getElementById('import-preview').textContent.length>0);
      assert.equal(await page.$eval('#apply-import',e=>e.hidden),false,await page.$eval('#import-preview',e=>e.textContent));
      await page.click('#apply-import');
      assert.equal(await page.$$eval('#entries article',els=>els.length),1);
      await page.close();
    }
    console.log('PRACTICE RECORD SUMMARY 2/2 PASS');
  }finally{await browser.close();fs.rmSync(testDir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
