/* Reference-led LIFF presentation. No LINE identity, Agent or network calls. */
(()=>{'use strict';
const $=id=>document.getElementById(id),form=$('form'),workspace=$('calculator'),results=$('taxiResults');
const make=(tag,cls,html='')=>{const el=document.createElement(tag);el.className=cls;el.innerHTML=html;return el;};
document.body.classList.add('liff-design');
const shell=make('section','liff-shell');shell.id='liffApp';
const heading=make('header','liff-heading','<a href="#liffApp" class="liff-brand"><span>bZ4X</span> 換車試算</a><span class="local-label">本機試算</span>');
const progress=make('nav','liff-progress');progress.setAttribute('aria-label','試算步驟');
const names=['基本資料','常跑路線','充電條件','結果與建議'];
names.slice(0,3).forEach((name,i)=>{const b=make('button','step-button',`<span>${i+1}</span><small>${name}</small>`);b.type='button';b.dataset.step=i;progress.append(b);});
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
const brandField=make('div','field','<label for="currentBrand">品牌（選填）</label><div class="input"><input id="currentBrand" type="text" maxlength="40" placeholder="例如 Toyota"></div>');
questions[0].querySelector('.fields').prepend(brandField);$('carName').closest('.field').classList.remove('full');document.querySelector('label[for="carName"]').textContent='車系／版本';
const powerChoices=choices('powerChoices','動力類型',['汽油','油電','電車']);questions[0].append(powerChoices);
const powerKeys=['gas','hev','ev'];const hev=document.createElement('option');hev.value='hev';hev.textContent='油電（HEV）';$('currentType').append(hev);
const detailedPower=make('details','power-other','<summary>柴油／插電油電／其他動力</summary>');detailedPower.append($('currentType').closest('.field'));questions[0].append(detailedPower);
const syncPower=()=>powerChoices.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String($('currentType').value===powerKeys[i])));
powerChoices.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const i=[...powerChoices.querySelectorAll('button')].indexOf(b);if($('currentType').value!==powerKeys[i]){$('currentType').value=powerKeys[i];$('currentType').dispatchEvent(new Event('change',{bubbles:true}));}syncPower();});$('currentType').addEventListener('change',syncPower);syncPower();
questions[1].querySelector('legend').textContent='每日營運';questions[1].querySelector('.fields').append($('workHours').closest('.field'));questions[2].querySelector('.fields').prepend($('days').closest('.field'));
fuelSettings.querySelector('summary').textContent='每月天數、實際油耗與油價';$('workStart').type='time';$('workEnd').type='time';
$('loadCar').addEventListener('click',()=>{const words=$('carName').value.split(' ');$('currentBrand').value=words[0];syncPower();});form.addEventListener('reset',()=>setTimeout(syncPower,0));
panels[1].append(choices('regionChoices','主要營運區域',['台中','彰化／南投','雲林／嘉義','台南','高雄','屏東','其他'],true),choices('serviceChoices','常跑的營運模式',['市區巡迴','機場接送','跨縣市','固定包車'],true),choices('breakChoices','通常什麼時候休息？',['午餐時段','接單空檔','沒有固定時間']),questions[6]);
const region=make('div','fields',localText('regionOther','其他營運區域（選填）','填縣市即可')+localNumber('longestTrip','最長單趟距離','km',0,2000));panels[1].append(region);
const mapBox=make('section','region-map-box','<div class="map-heading"><span>營運區域地圖</span><button type="button" id="mapFit">查看全部</button></div><div id="regionMap" role="region" aria-label="可缩放的營運縣市地圖"></div><p id="mapStatus" role="status">點選紅色標記可選擇縣市。</p><div class="map-tools"><button type="button" id="mapStreets">載入街道底圖</button><small>底圖連網；不傳送試算資料。</small></div>');
$('serviceChoices').after(mapBox);mapBox.after(region);region.append($('breakChoices'));$('breakChoices').classList.add('full');
const incomeSettings=make('details','wizard-settings','<summary>選填：每小時收入</summary>');incomeSettings.append(questions[6]);panels[1].append(incomeSettings);

const charge=make('div','charge-choices');charge.append(choices('homeChoices','住家或停車處能裝充電設備嗎？',['可以','不行','還不確定']),choices('chargeChoices','平常可用的充電地點',['住家／停車處','車隊慢充','公共快充'],true),choices('toleranceChoices','能接受單次充電停留多久？',['15 分鐘內','15–30 分鐘','30–60 分鐘','依情況安排']));panels[2].prepend(charge);
const charging=make('details','wizard-settings','<summary>調整充電比例與電價</summary>');charging.append(questions[4],questions[5]);panels[2].append(charging);
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
// Keep main content in one app shell; legacy visual sections remain in source for compatibility.
shell.insertBefore(workspace,validation);const footer=document.querySelector('footer.footer');shell.append(footer);
let step=0;const titles=['先了解你的工作日常','你通常在哪裡接單？','充電怎麼配合你？','同樣的里程，少花多少錢？'];
const descriptions=['不用填姓名或車牌，從你的車開始。','選擇常跑的區域與用途。','選擇可用充電地點，也能比較一趟路。','先看能源費，再往下看完整營運比較。'];
function show(index,focus=true){step=index;panels.forEach((p,i)=>p.hidden=i!==step);form.hidden=step===3;panels[3].hidden=step!==3;lead.querySelector('h1').textContent=titles[step];$('stepDescription').textContent=descriptions[step];lead.querySelector('.liff-kicker').textContent=step===3?'bZ4X SWITCH REPORT':`${step+1} / 3`;progress.querySelectorAll('button').forEach((b,i)=>{b.classList.toggle('active',i===step);b.classList.toggle('complete',i<step);if(i===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');b.querySelector('span').textContent=i<step?'✓':i+1;});$('wizardBack').hidden=step===0;$('wizardBack').textContent=step===3?'修改條件':'上一步';$('wizardNext').textContent=['下一步：常跑路線 →','下一步：充電條件 →','查看我的試算結果 →','重新試算 →'][step];validation.textContent='';if(focus){$('stepTitle').focus({preventScroll:true});shell.scrollIntoView({behavior:'instant',block:'start'});}document.dispatchEvent(new CustomEvent('wizard:step',{detail:step}));}
function canAdvance(){if(step===3)return true;const controls=[...panels[step].querySelectorAll('input[type="number"]')];const bad=controls.find(e=>e.value!==''&&!e.validity.valid);if(bad){validation.textContent='請修正「'+(document.querySelector(`label[for="${bad.id}"]`)?.textContent||'數值')+'」。';bad.focus();return false;}if(step===2){const a=['share','fleetShare','fastShare'].map(id=>$(id).value===''?null:Number($(id).value));if(a.some(v=>v===null)||Math.abs(a.reduce((x,y)=>x+y,0)-100)>.00001){charging.open=true;validation.textContent='三種充電比例需合計 100%。';$('share').focus();return false;}}return true;}
$('wizardNext').addEventListener('click',()=>{if(canAdvance())show(step===3?0:step+1);});$('wizardBack').addEventListener('click',()=>show(step===3?2:Math.max(0,step-1)));progress.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const target=Number(b.dataset.step);if(target<=step)show(target);else if(target===step+1&&canAdvance())show(target);});
document.querySelectorAll('.choice-group:not(#powerChoices)').forEach(g=>g.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const next=b.getAttribute('aria-pressed')!=='true';if(g.dataset.multi!=='true')g.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed',String(next));update();document.dispatchEvent(new CustomEvent('regions:change'));}));
const value=id=>{const e=$(id);const n=e.value===''?null:Number(e.value);return n!==null&&Number.isFinite(n)&&n>=Number(e.min||0)&&(!e.max||n<=Number(e.max))?n:null;};
const money=x=>x===null?'待確認':'NT$'+new Intl.NumberFormat('zh-TW',{maximumFractionDigits:0}).format(x);
function update(){const d={};form.querySelectorAll('input[type="number"]').forEach(e=>d[e.id]=value(e.id));d.mode=$('currentType').value;d.eligible=$('eligible').value;d.hybridEligible=$('hybridEligible').value;const r=TaxiModel.calculate(d),saving=r.current===null||r.ev===null?null:r.current-r.ev;
summary.innerHTML=`<div class="report-total"><span>現有車 → bZ4X · 年能源費${saving!==null&&saving<0?'增加':'節省'}</span><strong>${money(saving===null?null:Math.abs(saving))}</strong><p>每月${saving!==null&&saving<0?'多花':'省'} ${money(saving===null?null:Math.abs(saving)/12)}</p></div><div class="featured-costs"><article><span class="report-icon">↗</span><div><h2>現有車年度能源費</h2><strong>${money(r.current)}</strong><small>你的實際油耗與實付單價</small></div></article><article><span class="report-icon">ϟ</span><div><h2>bZ4X 年度電費</h2><strong>${money(r.ev)}</strong><small>依目前充電比例與電價</small></div></article><article><span class="report-icon">−</span><div><h2>保養與保險年費差</h2><strong id="otherSavings">待確認</strong><small>需填入營業車實際費用</small></div></article></div><p class="report-disclaimer">能源費估算，不含購車價差。完整比較請往下滑。</p>`;
const other=['currentInsurance','currentMaintenance','evInsurance','evMaintenance'].map(id=>d[id]);if(other.every(x=>x!==null))$('otherSavings').textContent=money(other[0]+other[1]-other[2]-other[3]);
const selected=id=>[...$(id).querySelectorAll('[aria-pressed="true"]')].map(b=>b.textContent).join('、');const context=[selected('regionChoices'),selected('serviceChoices')].filter(Boolean).join('／');$('operatingAdvice').textContent=(context?context+'：':'')+($('homeChoices').querySelector('[aria-pressed="true"]')?.textContent==='不行'?'先確認車隊或公共充電可用性，並把排隊與繞路納入停工成本。':'先確認充電設備、營業用途保證與接單資格。')+' 補助資格與實際充電速度仍需確認。';
// Put annual three-car details before single-trip details; preserve every original result.
const annual=[...results.children].find(el=>el.querySelector('h2')?.textContent==='1｜三車能源費');if(annual)results.prepend(annual);
}
document.addEventListener('taxi:render',update);
form.addEventListener('input',update);form.addEventListener('change',update);$('loadCar').addEventListener('click',()=>{show(0);update();});form.addEventListener('reset',()=>setTimeout(()=>{document.querySelectorAll('.choice-button').forEach(b=>b.setAttribute('aria-pressed','false'));syncPower();show(0);update();},0));
update();show(0,false);
})();
