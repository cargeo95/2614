'use strict';
const assert=require('node:assert/strict'),E=require('./engine.js');
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
// Matemática financiera.
close(E.monthlyRate(12),Math.pow(1.12,1/12)-1);
close(E.payment(1200,0,12),100);
close(E.npv([-100,110],.1),0);
close(E.mirr([-100,110],0),Math.pow(1.1,12)-1);
assert.equal(E.irr([-100,200,-110]),null,'TIR con cambios múltiples se omite');
close(E.recovery([-100,60,60]),1+40/60);
assert.equal(E.recovery([-100,120,-150,50]),null,'No confundir cruce temporal con recuperación definitiva');

// Implantación: máximo por modelo con la franja de apoyo fija y la casa móvil solo de oeste a este.
const s=E.copy(E.defaults),layouts={};
for(const [w,d,max] of [[5,5,6],[6,5,5],[6,6,5],[7,5,5]]){
 const cfg={...s,unitW:w,unitD:d,guests:E.maxGuests(w,d)},list=E.layout(cfg,12,'double');E.syncParking(cfg,list);layouts[w+'x'+d]=list;
 const check=E.validate(cfg,list),home=list.find(o=>o.type==='home'),park=list.find(o=>o.type==='parking'),tech=list.find(o=>o.type==='technical');
 assert.equal(check.valid,true,JSON.stringify(check.errors));assert.equal(check.units,max,w+'x'+d);
 close(home.y,2);close(home.w,8);close(home.d,7);assert.ok(home.x>=13.5-1e-7,'la casa queda a la derecha del acceso');
 close(park.x,1);close(park.y,2);assert.equal(park.rotation,270);assert.equal(check.parking,6,'seis puestos siempre');
 close(tech.x,park.x+park.w-tech.w);close(tech.y,park.y+park.d);
 assert.ok(check.minWallGap===null||check.minWallGap>=s.wallGap-1e-7);
 assert.ok(!list.some(o=>o.id.startsWith('path-service')),'sin acceso de servicio');
}
const objects=layouts['5x5'];
// Seis cabañas 5×5 con 6 puestos: un puesto por Airbnb; la casa comparte.
assert.equal(E.validate(s,objects).parkingNeed,6);
// Separación lateral solo entre cabañas.
const closer=E.copy(objects),row=closer.filter(o=>o.type==='unit'&&o.side==='north').sort((a,b)=>a.x-b.x);
row[1].x=row[0].x+row[0].w+s.wallGap-.5;
assert.ok(E.validate(s,closer).errors.some(t=>t.includes('paredes menor a '+s.wallGap)));
const narrowPath=E.copy(objects);narrowPath.find(o=>o.id==='path-h').d=2;
assert.ok(E.validate(s,narrowPath).errors.some(t=>t.includes('ancho inferior a 2.5')));
let bad=E.copy(objects);bad.find(o=>o.type==='unit').x=-1;assert.equal(E.validate(s,bad).valid,false);
let crossed=E.copy(objects);let us=crossed.filter(o=>o.type==='unit');us[1].x=us[0].x;us[1].y=us[0].y;assert.ok(E.validate(s,crossed).errors.some(x=>x.includes('se cruza')));
// Parqueadero y equipos vuelven siempre a su sitio.
const moved=E.copy(objects),mp=moved.find(o=>o.type==='parking'),mt=moved.find(o=>o.type==='technical');
mp.x=20;mp.rotation=0;mt.x=30;E.syncParking(s,moved);close(mp.x,1);assert.equal(mp.rotation,270);close(mt.x,7);

// Flujo: conservación de caja y deuda mes a mes.
const r=E.simulate(s,objects);
close(r.rows[0].draw,53000000); // Lote 100 M + 3 M gastos - 50 M propios.
for(let i=1;i<r.rows.length;i++){
 const prev=r.rows[i-1],cur=r.rows[i],prepay=cur.grant; // El subsidio abona al crédito de obra.
 close(cur.balance,prev.balance+cur.draw-cur.principal-prepay,.05);
 close(cur.cash,prev.cash+cur.operating-cur.capex+cur.draw-cur.debt+cur.extra-cur.distribution,.05);
 assert.ok(cur.cash>=-1e-5);assert.ok(cur.balance>=-1e-5);
}
let cum=0;for(let i=0;i<r.rows.length;i++){cum+=r.equityFlows[i]-(i===r.rows.length-1?r.terminal:0);close(r.rows[i].equityCum,cum,.05);}
// Etapas: obra base y las primeras stage1 cabañas desde el mes 1; luego una cabaña a la vez.
for(const p of r.plan.slice(0,s.stage1)){assert.equal(p.start,1);assert.equal(p.open,s.buildMonths+1);}
assert.equal(r.built,6,'escenario recomendado: se construyen las 6');
const fixedPace=E.simulate({...s,cabinEvery:6},objects);
assert.equal(fixedPace.built,6);
for(let i=Math.max(1,s.stage1);i<fixedPace.plan.length;i++){const a=fixedPace.plan[i-1],b=fixedPace.plan[i];assert.ok(b.start>=a.start+s.cabinMonths,'una cabaña en obra a la vez');assert.equal(b.open,b.start+s.cabinMonths);}
// Regla según caja: una cabaña solo arranca si los 3 meses previos dejaron al menos su cuota.
for(const p of r.plan.slice(s.stage1).filter(p=>p.start!==null)){const prev=r.rows.slice(p.start-3,p.start);assert.ok(prev.reduce((a,x)=>a+x.operating-x.debt,0)/3>0);}
// Subsidio: limitado al costo de la casa y abonado al crédito, no repartido como caja.
// Por defecto la casa la pagan los padres; estas pruebas la meten al proyecto.
const withHome={...s,homeByParents:false},rh=E.simulate(withHome,objects);
const homeCost=rh.cost.lines.filter(l=>l.group==='Casa de los padres').reduce((a,l)=>a+l.total,0)*rh.cost.factor;
assert.ok(E.simulate({...withHome,subsidy:999999999},objects).subsidy<=homeCost+.01);
close(rh.subsidy,122563350);close(r.subsidy,0);
const noSubsidy=E.simulate({...withHome,subsidy:0},objects);assert.ok(noSubsidy.rows[s.subsidyMonth].balance>rh.rows[s.subsidyMonth].balance+1e8);
for(let i=1;i<rh.rows.length;i++){const prev=rh.rows[i-1],cur=rh.rows[i];close(cur.balance,prev.balance+cur.draw-cur.principal-cur.grant,.05);}
// Conciliación: lo que paga el flujo = presupuesto + inflación de obra − cabañas no construidas.
for(const x of [r,fixedPace])close(x.rows.reduce((a,row)=>a+row.capex,0),x.cost.total+x.capexInflation-x.unbuilt,.5);
close(E.simulate({...s,costGrowth:0,cabinEvery:6},objects).capexInflation,0,.5);
// IVA: solo cuando lo vendido en 12 meses supera el tope.
assert.ok(fixedPace.rows.some(x=>x.vat>0));
assert.ok(E.simulate({...s,cabinEvery:6,vatThreshold:1e12},objects).rows.every(x=>x.vat===0));
// Aseo: cada mes lo más barato entre pago por salida y persona fija.
for(const x of fixedPace.rows.filter(x=>x.active)){const stays=x.nightCount/s.stay,g=Math.pow(1+s.costGrowth/100,x.m/12);close(x.clean,Math.min(stays*s.cleaningStay,s.staffCost+stays*s.laundryStay)*g,1);}
// Sin crédito no hay deuda ni intereses.
const debtFree=E.simulate({...s,equity:3e9,financePct:0,cabinEvery:6},objects);close(debtFree.maxDebt,0);close(debtFree.totalInterest,0);
assert.ok(E.simulate({...s,adrWeek:0,adrWeekend:0},objects).payback===null);

// Casa por cuenta de los padres: sale de la inversión y el subsidio no entra al flujo.
assert.equal(r.cost.lines.some(l=>l.group==='Casa de los padres'),false);
close(rh.cost.total-r.cost.total,homeCost,1);
// Huéspedes: el 7×5 se puede arrendar para 2 o para 4; el 5×5 solo para 2.
assert.equal(E.maxGuests(5,5),2);assert.equal(E.maxGuests(7,5),4);assert.equal(E.fitGuests(7,5,2),2);
const small=E.unit({...s,guests:4},18.5,12,'capacity','north');assert.equal(small.guests,2);
const malformed=E.copy(objects);malformed.find(o=>o.type==='unit').guests=4;
assert.ok(E.validate(s,malformed).errors.some(t=>t.includes('capacidad incompatible')));
close(E.simulate(s,malformed).npv,r.npv,.01);

// Girar toda la envolvente conserva dimensiones interiores, centro, áreas y equipamiento.
const turn=E.unit({...s,unitW:5,unitD:6},10,10,'turn','north'),start=E.copy(turn);
const unitCost=o=>E.costs(s,[o]).lines.filter(l=>l.objectID===o.id).reduce((sum,l)=>sum+l.total,0);
const initialCost=unitCost(turn),cx=turn.x+turn.w/2,cy=turn.y+turn.d/2;
for(const side of ['east','south','west','north']){
 E.rotateUnit(turn);assert.equal(turn.side,side);close(turn.x+turn.w/2,cx);close(turn.y+turn.d/2,cy);
 assert.equal(turn.bw,5);assert.equal(turn.bd,6);close(unitCost(turn),initialCost);
 const p=E.unitParts(turn);close(p.body.w*p.body.d,30);close(p.deck.w*p.deck.d,14);assert.equal(E.overlap(p.body,p.deck),false);
 if(side==='east')close(p.front.x,turn.x+turn.w);
 if(side==='west')close(p.front.x,turn.x);
 if(side==='south')close(p.front.y,turn.y+turn.d);
 if(side==='north')close(p.front.y,turn.y);
}
for(const key of ['x','y','w','d','bw','bd','deck'])close(turn[key],start[key]);
const eastern=E.rotateUnit(E.copy(start));
const f=E.unitParts(eastern).front,route={id:'entry',type:'path',x:f.x+.5,y:0,w:1.2,d:f.y+1};
const eastRoute=E.accessGeometry(s,[eastern,route]).find(a=>a.object===eastern.id);assert.ok(eastRoute);close(eastRoute.dist,.5);

console.log('OK · finanzas, implantación, etapas, subsidio, IVA, aseo, conciliación y geometría.');
console.log(JSON.stringify({units:r.units,built:r.built,investmentToday:Math.round(r.cost.total),cashMonth:Math.round(r.steady.cash),extraCapital:Math.round(r.maxGap),mirr:r.mirr},null,1));
