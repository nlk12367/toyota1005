const assert=require('node:assert/strict');
const {calculate,progressiveBill}=require('../public/taxi.js');
const {parameters}=require('../public/taxi-config.js');
assert.equal(parameters.home,null,'do not guess household tariff');
assert.equal(parameters.fast,null,'public fast charging price must be user entered');

const tiers={
  summer:[{limit:120,rate:1.78},{limit:330,rate:2.55},{limit:500,rate:3.8},{limit:700,rate:5.14},{limit:1000,rate:6.44},{limit:null,rate:8.86}],
  non_summer:[{limit:120,rate:1.78},{limit:330,rate:2.26},{limit:500,rate:3.13},{limit:700,rate:4.24},{limit:1000,rate:5.27},{limit:null,rate:7.03}],
};
assert.equal(progressiveBill(120,tiers.summer),213.6);
assert.ok(Math.abs(progressiveBill(330,tiers.non_summer)-688.2)<1e-9);

const base={day:200,days:26,eff:14,fuel:32.7,hybridEff:18,hybridFuel:32.7,
  share:80,fleetShare:0,fastShare:20,home:2.95,fleetRate:null,fast:10,
  evEff:6.7,loss:0,tripKm:10,mode:'gas'};
const manual=calculate(base);
assert.equal(manual.homeRate,2.95);
assert.ok(Math.abs(manual.rate-4.36)<1e-9);

const tariffed=calculate({...base,homeMonthlyKwh:400,residentialTariff:tiers});
assert.ok(tariffed.homeRate>4.24&&tariffed.homeRate<6.44);
assert.ok(tariffed.rate>manual.rate);
assert.equal(calculate({...base,homeMonthlyKwh:null,residentialTariff:tiers}).homeRate,2.95);
console.log('Electricity model checks passed: tier billing, annual seasonal marginal rate, manual fallback, weighted price.');
