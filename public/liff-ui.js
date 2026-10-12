/* Reference-led LIFF presentation. No LINE identity, Agent or network calls. */
(()=>{'use strict';
const $=id=>document.getElementById(id),form=$('form'),workspace=$('calculator'),results=$('taxiResults');
const config=window.TAXI_CONFIG;
const make=(tag,cls,html='')=>{const el=document.createElement(tag);el.className=cls;el.innerHTML=html;return el;};
document.body.classList.add('liff-design');
const shell=make('section','liff-shell');shell.id='liffApp';
const heading=make('header','liff-heading','<a href="#liffApp" class="liff-brand">油轉電顧問<small>bZ4X 換車試算</small></a><span class="local-label">本機試算</span>');
document.title='油轉電顧問｜bZ4X 換車試算';
const progress=make('nav','liff-progress');progress.setAttribute('aria-label','試算步驟');
const names=['基本資料','營運模式','地點選擇','結果與建議'];
names.slice(0,3).forEach((name,i)=>{const b=make('button','step-button',`<span>${i+1}</span><small>${name}</small>`);b.type='button';b.dataset.step=i;progress.append(b);});
const progressCounter=make('p','progress-counter','1 / 3');progress.append(progressCounter);
const lead=make('div','liff-lead','<p class="liff-kicker">YOUR DAILY DRIVE</p><h1 id="stepTitle" tabindex="-1"></h1><p id="stepDescription"></p>');
shell.append(heading,progress,lead);document.querySelector('main.wrap').prepend(shell);
const panels=names.map((name,i)=>{const el=make('section','wizard-page');el.dataset.page=i;el.setAttribute('aria-label',name);return el;});
const questions=[...form.querySelectorAll(':scope > fieldset')];
// Reuse all existing controls, catalog and financial model.
const intro=[...form.children].filter(x=>!['FIELDSET','DETAILS','BUTTON'].includes(x.tagName));intro.forEach(x=>x.hidden=true);
const body=make('div','wizard-body');form.prepend(body);panels.slice(0,3).forEach(p=>body.append(p));
[0,1].forEach(i=>panels[0].append(questions[i]));
questions.forEach(q=>{const legend=q.querySelector('legend');legend.textContent=legend.textContent.replace(/^\d+｜/,'');});
const fuelSettings=make('details','wizard-settings','<summary>實際油耗與油價</summary>');fuelSettings.append(questions[2]);panels[0].append(fuelSettings);
const catalog=document.querySelector('details.catalog-picker');panels[0].prepend(catalog);
const trip=$('tripInputs');panels[2].append(trip);trip.open=true;trip.querySelector('summary').textContent='單趟比較（選填）';
const localText=(id,label,placeholder='')=>`<div class="field"><label for="${id}">${label}</label><div class="input"><input id="${id}" type="text" maxlength="60" placeholder="${placeholder}"></div></div>`;
const localNumber=(id,label,unit,min,max)=>`<div class="field"><label for="${id}">${label}</label><div class="input"><input id="${id}" type="number" min="${min}" max="${max}" step="1" placeholder="選填"><span class="unit">${unit}</span></div></div>`;
const choices=(id,title,options,multi=false)=>{const box=make('fieldset','choice-group',`<legend>${title}</legend><div class="choice-options"></div>`);box.id=id;box.dataset.multi=multi;options.forEach(label=>{const b=make('button','choice-button');b.type='button';b.textContent=label;b.setAttribute('aria-pressed','false');box.lastElementChild.append(b);});return box;};
const extra=make('div','fields basic-extra',localNumber('workHours','每日工作時間','小時',0,24)+localText('workStart','開始時間','')+localText('workEnd','結束時間',''));panels[0].append(extra);
// Compact reference layout: brand/model, power chips, daily km/hours and working time.
const brandField=make('div','field','<label for="currentBrand">品牌</label><select id="currentBrand"></select>');
const modelField=make('div','field','<label for="carModelChoice">車型</label><select id="carModelChoice"></select>');
const customCar=make('details','power-other','<summary>自行填寫車型／版本</summary>');customCar.append($('carName').closest('.field'));
questions[0].querySelector('.fields').prepend(brandField,modelField);questions[0].append(customCar);document.querySelector('label[for="carName"]').textContent='自填車型／版本';
const vehicles=JSON.parse($('vehicleData').textContent),brandSelect=$('currentBrand'),modelSelect=$('carModelChoice');
const option=(select,value,label=value)=>select.add(new Option(label,value));
[...new Set([config.ui.brand,...vehicles.map(v=>v.brand)])].forEach(name=>option(brandSelect,name));option(brandSelect,'other','其他／自行填寫');
function populateModels(chosen){modelSelect.replaceChildren();const models=[...new Set(vehicles.filter(v=>v.brand===brandSelect.value).map(v=>v.model))];if(brandSelect.value==='Toyota')models.unshift('Corolla Altis');models.forEach(name=>option(modelSelect,name));option(modelSelect,'other','其他／自行填寫');if(chosen&&!models.includes(chosen))option(modelSelect,chosen);modelSelect.value=chosen||models[0]||'other';}
function applyCarChoice(){if(modelSelect.value==='other'){customCar.open=true;$('carName').focus();}else{$('carName').value=brandSelect.value+' '+modelSelect.value;$('carName').dispatchEvent(new Event('input',{bubbles:true}));}}
brandSelect.value=config.ui.brand;populateModels(config.ui.model);$('carName').value=config.ui.brand+' '+config.ui.model;$('carName').defaultValue=$('carName').value;
brandSelect.addEventListener('change',()=>{populateModels();applyCarChoice();});modelSelect.addEventListener('change',applyCarChoice);
const powerChoices=choices('powerChoices','動力類型',['汽油','油電','電車']);questions[0].append(powerChoices);
const powerKeys=['gas','hev','ev'];const hev=document.createElement('option');hev.value='hev';hev.textContent='油電（HEV）';$('currentType').append(hev);
const detailedPower=make('details','power-other','<summary>柴油／插電油電／其他動力</summary>');detailedPower.append($('currentType').closest('.field'));questions[0].append(detailedPower);
const syncPower=()=>powerChoices.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String($('currentType').value===powerKeys[i])));
powerChoices.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const i=[...powerChoices.querySelectorAll('button')].indexOf(b);if($('currentType').value!==powerKeys[i]){$('currentType').value=powerKeys[i];$('currentType').dispatchEvent(new Event('change',{bubbles:true}));}syncPower();});$('currentType').addEventListener('change',syncPower);syncPower();
questions[1].querySelector('legend').textContent='每日營運';questions[1].querySelector('.fields').append($('workHours').closest('.field'));questions[2].querySelector('.fields').prepend($('days').closest('.field'));
fuelSettings.querySelector('summary').textContent='每月天數、實際油耗與油價';$('workStart').type='time';$('workEnd').type='time';
$('loadCar').addEventListener('click',()=>{const words=$('carName').value.split(' ');brandSelect.value=[...brandSelect.options].some(o=>o.value===words[0])?words[0]:'other';populateModels(words.slice(1).join(' '));syncPower();});form.addEventListener('reset',()=>setTimeout(syncPower,0));
panels[1].append(choices('regionChoices','主要營運區域',['台北市','新北市','台中','彰化／南投','雲林／嘉義','台南','高雄','屏東','其他'],true),choices('serviceChoices','常跑路線',['市區短程','機場接送','跨縣市','固定包車'],true),choices('breakChoices','平常何時休息？',['午餐時段','接單空檔','沒有固定時間'],true),questions[6]);
const region=make('div','fields',localText('regionOther','其他營運區域（選填）','填縣市即可')+localNumber('longestTrip','最長單趟距離','km',0,2000));panels[1].append(region);
const mapBox=make('section','region-map-box','<div class="map-heading"><span>營運區域地圖</span><button type="button" id="mapFit">查看全部</button></div><div id="regionMap" role="region" aria-label="可缩放的營運縣市地圖"></div><p id="mapStatus" role="status">點選紅色標記可選擇縣市。</p><div class="map-tools"><button type="button" id="mapStreets">載入街道底圖</button><small>底圖連網；不傳送試算資料。</small></div>');
$('serviceChoices').after(mapBox);mapBox.after(region);region.append($('breakChoices'));$('breakChoices').classList.add('full');
const incomeSettings=make('details','wizard-settings','<summary>選填：每小時收入</summary>');incomeSettings.append(questions[6]);panels[1].append(incomeSettings);

const charge=make('div','charge-choices');charge.append(choices('homeChoices','住家或停車處能裝充電設備嗎？',['可以','不行','還不確定']),choices('chargeChoices','平常可用的充電地點',['住家／停車處','車隊補點','公共充電站','還不清楚'],true),choices('toleranceChoices','每次可接受的充電停留時間',['15 分鐘內','15–30 分鐘','30–60 分鐘','依情況安排']));panels[2].prepend(charge);
function applyDefaults(){$('currentType').value=config.ui.power;syncPower();Object.entries(config.parameters).forEach(([id,val])=>{if(['workHours','longestTrip','day'].includes(id)&&$(id)){$(id).value=val??'';$(id).defaultValue=$(id).value;}});['workStart','workEnd'].forEach(id=>{$(id).value=config.ui[id];$(id).defaultValue=config.ui[id];});brandSelect.value=config.ui.brand;populateModels(config.ui.model);Object.entries(config.choices).forEach(([id,selected])=>$(id)?.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(selected.includes(b.textContent)))));}
applyDefaults();
document.querySelector('label[for="day"]').textContent='每日行駛里程';$('day').closest('.input').querySelector('.unit').textContent='公里';$('longestTrip').closest('.input').querySelector('.unit').textContent='公里';
extra.after(catalog);
extra.insertAdjacentHTML('beforeend','<small class="overnight-note full">可跨日設定；結束時間可早於開始時間。</small>');
const mascotTip=text=>{const tip=make('aside','mascot-tip','<p></p><img src="./images/advisor-mascot.svg" alt="" width="64" height="64">');tip.querySelector('p').textContent=text;return tip;};
panels[0].prepend(mascotTip('不用精算，填入平常的概況就好。'));
charge.after(mascotTip('我們會把充電時間一起納入運算評估。實測資料未填時，時間成本會顯示待確認。'));
const charging=make('details','wizard-settings','<summary>調整充電比例與電價</summary>');charging.append(questions[4],questions[5]);panels[2].append(charging);
charging.insertAdjacentHTML('beforeend','<p class="note">上方選項記錄可用地點；能源費依此處填寫的電量占比計算，不會自動分配。</p>');
const hybrid=make('details','wizard-settings','<summary>同級油電車比較</summary>');hybrid.append(questions[3]);panels[0].append(hybrid);
const finance=make('details','wizard-settings','<summary>選填：舊車殘值與貸款</summary>');finance.append(questions[7]);panels[2].append(finance,$('taxiAdvanced'));
const review=make('details','review-inputs','<summary>確認我的填寫內容</summary><p id="inputReview"></p>');charge.after(review);review.addEventListener('toggle',()=>{if(review.open)$('inputReview').textContent=[$('carName').value,'每日 '+$('day').value+' km','每月 '+$('days').value+' 天',...document.querySelectorAll('#regionChoices [aria-pressed=true]')].map(x=>typeof x==='string'?x:x.textContent).join(' · ');});
trip.open=false;

const reset=form.querySelector('button[type="reset"]');reset.textContent='清除並重新填寫';panels[2].append(reset);
workspace.append(panels[3]);
const summary=make('section','report-summary');summary.id='reportSummary';panels[3].append(summary,results);
const advice=make('article','panel operating-advice','<h2>營運提醒</h2><p id="operatingAdvice"></p>');panels[3].append(advice);
const validation=make('p','wizard-error');validation.id='wizardError';validation.setAttribute('role','alert');shell.append(validation);
const actions=make('div','wizard-actions','<button type="button" id="wizardBack">上一步</button><button type="button" id="wizardNext">下一步：常跑路線 →</button>');shell.append(actions);
actions.append(make('small','assessment-privacy','資料僅用於本次評估'));
[['了解使用者車款、上班工時','每日里程，建立基本使用輪廓。'],['了解使用者用車區域、用途','選擇主要接單地點，對應充電與營運條件。'],['了解使用者使用充電樁需求','了解充電習慣與預算，協助評估營運條件。']].forEach(([title,text],i)=>panels[i].append(make('aside','step-caption',`<strong>${title}</strong><p>${text}</p>`)));
// Keep main content in one app shell; legacy visual sections remain in source for compatibility.
shell.insertBefore(workspace,validation);const footer=document.querySelector('footer.footer');shell.append(footer);
let step=0;const titles=['先了解你的工作日常','你通常在哪裡接單？','充電能怎麼配合你？','同樣的里程，少燒多少錢？'];
const descriptions=['不用填姓名或車牌，從你的車開始。','可選擇多種路線，估算更貼近日常。','選擇充電條件，評估能源費與停工成本。','依你的營運里程，比較年花費與固定條件下的五年節省。'];
function show(index,focus=true){step=index;progressCounter.textContent=step===3?'結果與建議':`${step+1} / 3`;panels.forEach((p,i)=>p.hidden=i!==step);form.hidden=step===3;panels[3].hidden=step!==3;lead.querySelector('h1').textContent=titles[step];if(step===3){lead.querySelector('h1').innerHTML='同樣的里程，<br><span class=report-title-accent>少燒多少錢？</span>';}progress.classList.toggle('report-progress',step===3);$('stepDescription').textContent=descriptions[step];lead.querySelector('.liff-kicker').textContent=step===3?'bZ4X SWITCH REPORT':`${step+1} / 3`;progress.querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('active',i===step);b.classList.toggle('complete',i<step);if(i===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');b.querySelector('span').textContent=i<step?'✓':i+1;});$('wizardBack').hidden=step===0;$('wizardBack').textContent=step===3?'修改條件':'上一步';$('wizardNext').textContent=['下一步：常跑路線 →','下一步：充電條件 →','查看我的診斷結果 →','重新試算 →'][step];validation.textContent='';if(focus){$('stepTitle').focus({preventScroll:true});shell.scrollIntoView({behavior:'instant',block:'start'});}document.dispatchEvent(new CustomEvent('wizard:step',{detail:step}));}
function canAdvance(){if(step===3)return true;const controls=[...panels[step].querySelectorAll('input[type="number"]')];const bad=controls.find(e=>e.value!==''&&!e.validity.valid);if(bad){validation.textContent='請修正「'+(document.querySelector(`label[for="${bad.id}"]`)?.textContent||'數值')+'」。';bad.focus();return false;}if(step===2){const a=['share','fleetShare','fastShare'].map(id=>$(id).value===''?null:Number($(id).value));if(a.some(v=>v===null)||Math.abs(a.reduce((x,y)=>x+y,0)-100)>.00001){charging.open=true;validation.textContent='三種充電比例需合計 100%。';$('share').focus();return false;}}return true;}
$('wizardNext').addEventListener('click',()=>{if(canAdvance())show(step===3?0:step+1);});$('wizardBack').addEventListener('click',()=>show(step===3?2:Math.max(0,step-1)));progress.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const target=Number(b.dataset.step);if(target<=step)show(target);else if(target===step+1&&canAdvance())show(target);});
document.querySelectorAll('.choice-group:not(#powerChoices)').forEach(g=>g.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const next=b.getAttribute('aria-pressed')!=='true';if(g.dataset.multi!=='true')g.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed',String(next));const exclusive=g.id==='chargeChoices'?'還不清楚':g.id==='breakChoices'?'沒有固定時間':null;if(exclusive&&next)g.querySelectorAll('button').forEach(x=>{if(x!==b&&(b.textContent===exclusive||x.textContent===exclusive))x.setAttribute('aria-pressed','false');});update();document.dispatchEvent(new CustomEvent('regions:change'));}));
const value=id=>{const e=$(id);const n=e.value===''?null:Number(e.value);return n!==null&&Number.isFinite(n)&&n>=Number(e.min||0)&&(!e.max||n<=Number(e.max))?n:null;};
const uiState={schemaVersion:1,extensions:{}};
function syncUIState(){const chosen=id=>[...$(id).querySelectorAll('[aria-pressed=true]')].map(b=>b.textContent);Object.assign(uiState,{brand:brandSelect.value,model:modelSelect.value==='other'?$('carName').value:modelSelect.value,powerType:$('currentType').value,dailyKm:value('day'),dailyHours:value('workHours'),workStart:$('workStart').value,workEnd:$('workEnd').value,areas:chosen('regionChoices'),routes:chosen('serviceChoices'),maxTripKm:value('longestTrip'),breaks:chosen('breakChoices'),canInstallCharger:chosen('homeChoices')[0]||null,chargeSpots:chosen('chargeChoices'),chargeDuration:chosen('toleranceChoices')[0]||null});}
window.TaxiUI={getState:()=>JSON.parse(JSON.stringify(uiState))};
const money=x=>x===null?'待確認':'NT$'+new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0}).format(x);
const icon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">'+({fuel:'<path d="M12 3C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-12Z"/>',plug:'<path d="M8 3v5m8-5v5M6 8h12v4a6 6 0 0 1-12 0Zm6 10v4"/>',wrench:'<path d="m15 4 1 5 4 1a6 6 0 0 1-7 6l-5 5-4-4 5-5a6 6 0 0 1 6-8Z"/>'}[name])+'</svg>';
function update(){const d={};form.querySelectorAll('input[type="number"]').forEach(e=>d[e.id]=value(e.id));d.mode=$('currentType').value;d.eligible=$('eligible').value;d.hybridEligible=$('hybridEligible').value;const r=TaxiModel.calculate(d),saving=r.current===null||r.ev===null?null:r.current-r.ev;
syncUIState();
const annual=r.annualReport,hasTotal=annual.totalSaving!==null,headline=hasTotal?annual.totalSaving:saving,projection=hasTotal?annual.projectedTotal:annual.projectedEnergy;
const count=x=>x===null?'待確認':new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0}).format(x);
summary.innerHTML=`<figure class="report-visual"><img src="./images/bz4x-official.png" alt="Toyota bZ4X 車輛官圖" width="520" height="220"><figcaption>Toyota bZ4X · 車款示意</figcaption></figure><div class="report-car"><span>你的車輛</span><strong id="reportVehicle"></strong><button type="button" id="reportEditCar" aria-label="修改目前車輛">修改 →</button></div><div class="report-total"><span>現有車 → TOYOTA bZ4X · ${hasTotal?'年度總':'年能源費'}${headline!==null&&headline<0?'增加':'節省'}</span><strong>${money(headline===null?null:Math.abs(headline))}</strong><p>以年行駛 ${count(r.km)} 公里計算${annual.energyReduction===null?'':`，能源支出${annual.energyReduction<0?'增加':'降低'}約 <em>${Math.abs(annual.energyReduction).toFixed(0)}%</em>`}。</p><p>${count(d.projectionYears)} 年${hasTotal?'總':'能源'}累積${projection!==null&&projection<0?'增加':'節省'} <em>${money(projection===null?null:Math.abs(projection))}</em></p><small>${hasTotal?'含能源、保養與稅費差':'保養稅費未填齊，先顯示能源節省'}；以顯示年金額 × 年數。</small></div><div class="featured-costs"><article><span class="report-icon">${icon('fuel')}</span><div><h2>現有車年度${d.mode==='ev'?'電':'油'}費</h2><strong>${money(r.current)}</strong><small>約 ${count(r.current!==null&&r.km!==null&&d.eff>0?r.km/d.eff:null)} ${d.mode==='ev'?'度':'公升'} · 依實際能源效率</small></div></article><article><span class="report-icon">${icon('plug')}</span><div><h2>bZ4X 年度電費</h2><strong>${money(r.ev)}</strong><small>約 ${count(r.km!==null&&d.evEff>0&&d.loss!==null?r.km/d.evEff/(1-d.loss/100):null)} 度 · 均價 ${r.rate===null?'待確認':r.rate.toFixed(2)} 元／度</small></div></article><article><span class="report-icon">${icon('wrench')}</span><div><h2>保養稅費${annual.maintenanceTaxSaving!==null&&annual.maintenanceTaxSaving<0?'增加':'節省'}</h2><strong id="otherSavings">${money(annual.maintenanceTaxSaving===null?null:Math.abs(annual.maintenanceTaxSaving))}</strong><small>${d.evMaintenance===null?'營業車保養與稅費待確認':'bZ4X 年保養 '+money(d.evMaintenance)+' · 稅費 '+money(d.evTax)}</small></div></article></div><p class="report-disclaimer">未含購車價差、保險差、補助、停工或折舊；完整營運比較請往下滑。</p>`;
$('reportVehicle').textContent=$('carName').value;$('reportEditCar').addEventListener('click',()=>show(0));
const other=['currentInsurance','currentMaintenance','evInsurance','evMaintenance'].map(id=>d[id]);
const missing=[];if(r.hybrid===null||d.hybridPrice===null)missing.push('油電車油耗與車價');if(d.eligible==='unknown'||(d.eligible==='yes'&&d.evGrant===null))missing.push('bZ4X 補助資格與金額');if(other.some(x=>x===null))missing.push('保險與保養費');if(r.timeCost===null)missing.push('快充實測與每小時收入');
if(missing.length){const hint=make('aside','completion-hint');hint.setAttribute('aria-label','待補齊資料');hint.innerHTML='<strong>補齊資料，讓比較更完整</strong><p></p>';hint.querySelector('p').textContent=missing.join('、')+'。可返回修改條件；已能計算的結果會先顯示。';summary.append(hint);}
summary.querySelectorAll('strong').forEach(el=>el.classList.toggle('pending-value',el.textContent==='待確認'));
results.querySelectorAll('strong').forEach(el=>el.classList.toggle('pending-value',el.textContent==='待確認'));
const selected=id=>[...$(id).querySelectorAll('[aria-pressed="true"]')].map(b=>b.textContent).join('、');const context=[selected('regionChoices'),selected('serviceChoices')].filter(Boolean).join('／');$('operatingAdvice').textContent=(context?context+'：':'')+($('homeChoices').querySelector('[aria-pressed="true"]')?.textContent==='不行'?'先確認車隊或公共充電可用性，並把排隊與繞路納入停工成本。':'先確認充電設備、營業用途保證與接單資格。')+' 補助資格與實際充電速度仍需確認。';
// Put annual three-car details before single-trip details; preserve every original result.
const energyPanel=[...results.children].find(el=>el.querySelector('h2')?.textContent==='1｜三車能源費');if(energyPanel)results.prepend(energyPanel);
}
document.addEventListener('taxi:render',update);
form.addEventListener('input',update);form.addEventListener('change',update);$('loadCar').addEventListener('click',()=>{show(0);update();});form.addEventListener('reset',()=>setTimeout(()=>{applyDefaults();customCar.open=false;syncPower();show(0);update();document.dispatchEvent(new CustomEvent('regions:change'));},0));
update();show(0,false);
// Reveal the app only after the legacy markup has been transformed into the LIFF wizard.
document.body.classList.remove('app-boot');
})();
