/* EN-2614 · Motor independiente. COP nominales, períodos mensuales. */
(function (root) {
'use strict';
const defaults={
 version:1, siteW:45.45,siteD:22,setback:1,gap:2.5,wallGap:3.65,pathWidth:2.5,
 unitW:5,unitD:5,deck:2.8,jacuzzi:2.2,minArea:25,guests:2,maxCoverage:30,
 homeX:13.5,homeY:2,parkingX:1,parkingY:2,
 homeW:8,homeD:7,parkingCount:5,stallW:2.5,stallD:5,aisle:5,parkingRatio:1,adminParking:0,
 // Valores por defecto = escenario recomendado: 3 cabañas con la obra base, cabaña optimizada (~$88 M),
 // tarifa premium, casa por cuenta de los padres y crédito al 12 % a 20 años. La base de mercado vive en app.js (ANALYSIS).
 technicalW:4,technicalD:3,targetUnits:4,stage1:3,stage2:0,buildMonths:6,cabinMonths:4,cabinEvery:0,
 // Obra industrializada ~$1,95 M/m² (prefabricado llave en mano $1,9–2,5 M/m²); jacuzzi empotrado básico sin calentador.
 land:100000000,equity:50000000,landFees:3,foundation:236000,steel:381000,envelope:317000,
 roof:218000,finishes:390000,installations:408000,deckCost:280000,jacuzziCost:11500000,
 kitchenCost:3500000,furniture:6000000,extraGuestFurniture:1200000,ac:2200000,homeM2:2100000,
 parkingM2:110000,pathM2:85000,technicalCost:18000000,networks:16000000,
 landscaping:8000000,design:5,contingency:10,lowRange:15,highRange:30,
 // Mercado Ricaurte (oct-2025 a sep-2026): ~26 % de ocupación media. Base ≈ 30 %: 20 % entre semana, 55 % fin de semana.
 adrWeek:400000,adrWeekend:550000,familyPremium:25,familyOccupancy:85,extraGuestNight:7000,occWeek:20,occWeekend:55,stay:2,
 // Airbnb: tarifa única del anfitrión 15,5 %. ICA Ricaurte hospedaje 10 por mil + FONTUR 2,5 por mil = 1,25 %.
 // IVA 19 % cuando los ingresos de 12 meses superan 3.500 UVT (UVT 2026 $52.374): verificar con contador.
 fee:15.5,taxReserve:1.25,vatPct:19,vatThreshold:183309000,variableNight:35000,cleaningStay:60000,laundryStay:20000,cleaningCharge:0,
 // Aseo: por salida o una persona fija (salario mínimo 2026 + carga, sin exoneración), lo que resulte más barato.
 staffCost:2950000,
 // Fijos mensuales con al menos una cabaña operando; check-in y administración los hacen los padres (adminPay 0).
 internet:250000,commonUtilities:300000,gardening:400000,accounting:350000,fixed:150000,jacuzziUnit:120000,
 adminPay:0,propertyTax:700000,insurance:0.4,maintenance:1.5,
 replacement:700000,rampMonths:6,rampFactor:55,priceGrowth:4,costGrowth:5,
 // Crédito: libre inversión con garantía hipotecaria ~15,5–16,5 % EA (2026). El resto de la inversión es crédito.
 rate:12,landRate:12,years:20,landYears:10,grace:6,financePct:100,loanFee:1,loanInsurance:.035,
 // Subsidio de vivienda rural: hasta 70 SMMLV 2026, aplicado a la casa de los padres al terminarla.
 subsidy:122563350,subsidyMonth:6,subsidyConfirmed:false,homeByParents:true,horizon:20,discount:16,cdtRate:12,
 occupancyFactor:100,priceFactor:100,startYear:2027,salvage:false,salvagePct:50,
 objects:[]
};
const copy=x=>JSON.parse(JSON.stringify(x));
// Parqueadero girado: maniobra a la izquierda y puestos a la derecha, en columna desde el frente norte.
const PARKING_ROTATION=270,PARKING_STALLS=6; // Seis puestos siempre; los equipos van debajo.
const money=x=>Math.round(x);
function rect(o){return {x:o.x,y:o.y,w:o.w,d:o.d};}
function overlap(a,b,pad=0){return a.x < b.x+b.w+pad-1e-7&&a.x+a.w+pad>b.x+1e-7&&a.y<b.y+b.d+pad-1e-7&&a.y+a.d+pad>b.y+1e-7;}
function inside(o,s,margin=0){return o.x>=margin-1e-7&&o.y>=margin-1e-7&&o.x+o.w<=s.siteW-margin+1e-7&&o.y+o.d<=s.siteD-margin+1e-7;}
function rectDistance(a,b){return Math.hypot(Math.max(0,a.x-b.x-b.w,b.x-a.x-a.w),Math.max(0,a.y-b.y-b.d,b.y-a.y-a.d));}
// Separación lateral (wallGap) solo entre paredes de cabañas; frente a casa, parqueo y zona técnica rige la separación general (gap).
function wallPair(a,b){return a.type==='unit'&&b.type==='unit';}
function wallDistance(a,b){return rectDistance(a.type==='unit'?unitParts(a).body:a,b.type==='unit'?unitParts(b).body:b);}
function unionArea(rects){
 const xs=[...new Set(rects.flatMap(o=>[o.x,o.x+o.w]))].sort((a,b)=>a-b);let area=0;
 for(let i=1;i<xs.length;i++){const a=xs[i-1],b=xs[i];const ys=rects.filter(o=>o.x<b&&o.x+o.w>a).map(o=>[o.y,o.y+o.d]).sort((p,q)=>p[0]-q[0]);let length=0,end=-Infinity;for(const [y,z]of ys){length+=Math.max(0,z-Math.max(y,end));end=Math.max(end,z);}area+=(b-a)*length;}return area;
}
function size(s,rot=false){return rot?{bw:s.unitD,bd:s.unitW}:{bw:s.unitW,bd:s.unitD};}
// Regla de capacidad del esquema conceptual, no un mínimo normativo.
function maxGuests(bw,bd){return bw>=4&&bd>=4&&bw*bd>=30-1e-7?4:2;}
function fitGuests(bw,bd,requested){return maxGuests(bw,bd)===4&&requested>=4?4:2;}
function orientUnit(o){const lateral=o.side==='east'||o.side==='west';o.w=lateral?o.bd+o.deck:o.bw;o.d=lateral?o.bw:o.bd+o.deck;o.guests=fitGuests(o.bw,o.bd,o.guests);return o;}
function rotateUnit(o,turns=1){
 const sides=['north','east','south','west'],cx=o.x+o.w/2,cy=o.y+o.d/2;
 o.side=sides[((sides.indexOf(o.side)+turns)%4+4)%4];orientUnit(o);
 o.x=Math.round((cx-o.w/2)*1e8)/1e8;o.y=Math.round((cy-o.d/2)*1e8)/1e8;return o;
}
function unitParts(o){
 const x=o.x,y=o.y,bw=o.bw,bd=o.bd,k=o.deck,side=o.side;
 if(side==='east')return {body:{x,y,w:bd,d:bw},deck:{x:x+bd,y,w:k,d:bw},front:{x:x+bd+k,y:y+bw/2}};
 if(side==='west')return {body:{x:x+k,y,w:bd,d:bw},deck:{x,y,w:k,d:bw},front:{x,y:y+bw/2}};
 if(side==='south')return {body:{x,y,w:bw,d:bd},deck:{x,y:y+bd,w:bw,d:k},front:{x:x+bw/2,y:y+bd+k}};
 return {body:{x,y:y+k,w:bw,d:bd},deck:{x,y,w:bw,d:k},front:{x:x+bw/2,y}};
}
function syncParking(s,objects){
 const count=PARKING_STALLS;
 s.parkingCount=count;s.parkingRatio=1;s.adminParking=0;
 let p=objects.find(o=>o.type==='parking');
 if(!p){p={id:'parking',type:'parking',name:'Parqueaderos + maniobra',rotation:PARKING_ROTATION};objects.push(p);}
 // Parqueadero y equipos son fijos: sin giro ni desplazamiento.
 p.x=defaults.parkingX;p.y=defaults.parkingY;p.rotation=PARKING_ROTATION;
 const lateral=p.rotation%180===90;
 p.w=lateral?s.stallD+s.aisle:count*s.stallW;p.d=lateral?count*s.stallW:s.stallD+s.aisle;
 const t=objects.find(o=>o.type==='technical');
 if(t){t.x=p.x+p.w-s.technicalW;t.y=p.y+p.d;t.w=s.technicalW;t.d=s.technicalD;}
 return count;
}
function accessGeometry(s,objects){
 const paths=objects.filter(o=>o.type==='path'),hard=objects.filter(o=>o.type!=='path');
 const reached=new Set(paths.filter(p=>p.y<=.05).map(p=>p.id));let change=true;
 while(change){change=false;for(const a of paths)if(reached.has(a.id))for(const b of paths)if(!reached.has(b.id)&&overlap(a,b,.06)){reached.add(b.id);change=true;}}
 const routes=[];
 for(const o of hard.filter(o=>['unit','home','technical'].includes(o.type))){
  let best=null;
  for(const p of paths.filter(p=>reached.has(p.id))){
   const front=o.type==='unit'?unitParts(o).front:{x:o.x+o.w/2,y:o.y+o.d/2},ex=front.x,ey=front.y;
   const cx=Math.max(p.x,Math.min(ex,p.x+p.w)),cy=Math.max(p.y,Math.min(ey,p.y+p.d));
   const ox=o.type==='unit'?ex:Math.max(o.x,Math.min(cx,o.x+o.w));
   const oy=o.type==='unit'?ey:Math.max(o.y,Math.min(cy,o.y+o.d));
   const dist=Math.hypot(cx-ox,cy-oy),width=Math.min(1.2,s.pathWidth);
   const connector={x:Math.min(cx,ox)-(cx===ox?width/2:0),y:Math.min(cy,oy)-(cy===oy?width/2:0),w:Math.max(width,Math.abs(cx-ox)),d:Math.max(width,Math.abs(cy-oy)),type:'connector',id:'access-'+o.id,name:'Conexión '+o.name};
   if(dist<.01){connector.w=0;connector.d=0;}
   if(dist<=s.gap+1&&(!best||dist<best.dist)&&!hard.some(b=>b.id!==o.id&&overlap(connector,b)))best={object:o.id,rect:connector,dist};
  }
  if(best)routes.push(best);
 }
 return routes;
}
function unit(s,x,y,id,side='south',rot=false,stage=1){const z=size(s,rot);return {id,type:'unit',name:'Airbnb '+id.replace('u',''),x,y,w:z.bw,d:z.bd+s.deck,bw:z.bw,bd:z.bd,deck:s.deck,side,stage,guests:fitGuests(z.bw,z.bd,s.guests)};}
function base(s,n,pattern='double',rot=false,corridorY=(s.siteD-s.pathWidth)/2,homeX=defaults.homeX){
 const count=PARKING_STALLS,parkingW=s.stallD+s.aisle;
 const px=defaults.parkingX+parkingW,homeY=defaults.homeY;
 // Franja de apoyo a la izquierda: parqueadero y, debajo, los equipos junto al acceso peatonal prolongado.
 // A la derecha del acceso todo es reubicable; la casa conserva su altura y solo se corre en sentido este-oeste.
 const techY=defaults.parkingY+count*s.stallW,techX=px-s.technicalW;
 return [
 {id:'parking',type:'parking',name:'Parqueaderos + maniobra',x:defaults.parkingX,y:defaults.parkingY,w:parkingW,d:count*s.stallW,rotation:PARKING_ROTATION},
 {id:'home',type:'home',name:'Casa administración',x:homeX,y:homeY,w:s.homeW,d:s.homeD},
 {id:'technical',type:'technical',name:'Saneamiento / apoyo',x:techX,y:techY,w:s.technicalW,d:s.technicalD},
 {id:'path-v',type:'path',name:'Acceso peatonal norte',x:px,y:0,w:s.pathWidth,d:Math.max(corridorY+s.pathWidth,techY+s.technicalD)},
 {id:'path-h',type:'path',name:'Pasillo principal',x:px,y:corridorY,w:Math.max(0.1,s.siteW-s.setback-px),d:s.pathWidth}
 ];
}
function validate(s,objects){
 const errors=[],warnings=[],units=objects.filter(o=>o.type==='unit'),paths=objects.filter(o=>o.type==='path');
 const hard=objects.filter(o=>o.type!=='path');
 const label=o=>o.name;let minWallGap=Infinity;
 for(const o of objects){
  if(![o.x,o.y,o.w,o.d].every(Number.isFinite)||o.w<=0||o.d<=0){errors.push(label(o)+': dimensiones inválidas.');continue;}
  if(!inside(o,s,o.type==='path'?0:s.setback))errors.push(label(o)+': fuera del lote o del retiro supuesto.');
 }
 for(let i=0;i<hard.length;i++)for(let j=i+1;j<hard.length;j++){
  const a=hard[i],b=hard[j];
  if(overlap(a,b))errors.push(label(a)+' se cruza con '+label(b)+'.');
  else if((a.type==='unit'||b.type==='unit')&&overlap(a,b,s.gap))errors.push(label(a)+' / '+label(b)+': separación menor a '+s.gap+' m (entre envolventes).');
  if(wallPair(a,b)){const distance=wallDistance(a,b);minWallGap=Math.min(minWallGap,distance);if(distance<(s.wallGap||0)-1e-7)errors.push(label(a)+' / '+label(b)+': separación entre paredes menor a '+s.wallGap+' m.');}
 }
 for(const p of paths)for(const o of hard)if(overlap(p,o))errors.push(p.name+' atraviesa '+o.name+'.');
 const mainPaths=paths.filter(p=>['path-h','path-v'].includes(p.id));
 for(const p of mainPaths)if(Math.min(p.w,p.d)<s.pathWidth-1e-7)errors.push(p.name+': ancho inferior a '+s.pathWidth+' m.');
 // Acceso: conexiones cortas al frente de terrazas y red conectada al norte.
 const routes=accessGeometry(s,objects);
 for(const o of hard.filter(o=>['unit','home','technical'].includes(o.type))){
  if(!routes.some(r=>r.object===o.id))errors.push(o.name+': sin conexión peatonal corta comprobada hacia el acceso norte.');
 }
 const park=objects.find(o=>o.type==='parking'),capacity=park?Math.floor(((park.rotation%180===90?park.d:park.w)+1e-6)/s.stallW):0;
 // Un puesto por Airbnb; la casa comparte (puede parquear detrás de otro carro).
 const need=units.length;
 if(capacity<need)errors.push('Parqueaderos: '+capacity+' disponibles; '+need+' exigidos por el supuesto de operación.');
 if(park&&((park.rotation%180===90?park.w:park.d)<s.stallD+s.aisle-1e-6))errors.push('Parqueadero sin profundidad de puesto + maniobra configurada.');
 if(park&&park.rotation!==PARKING_ROTATION)warnings.push('Parqueo girado: comprobar enlace vehicular desde la servidumbre y acceso lateral.');
 if(park&&park.y>s.setback+0.1)warnings.push('Parqueadero alejado del frente norte: revisar recorrido vehicular de entrada.');
 if(s.pathWidth<1.2)warnings.push('Pasillo supuesto menor a 1,20 m; revisar accesibilidad y operación.');
 for(const u of units){
  if(![2,4].includes(u.guests)||u.guests>maxGuests(u.bw,u.bd))errors.push(u.name+': capacidad incompatible con el tamaño; máximo '+maxGuests(u.bw,u.bd)+' huéspedes en este esquema.');
  if(u.bw*u.bd<s.minArea)errors.push(u.name+': área interior bruta inferior al mínimo funcional supuesto de '+s.minArea+' m².');
  if(s.jacuzzi>u.bw-0.6+1e-6||s.jacuzzi>u.deck-0.6+1e-6)errors.push(u.name+': jacuzzi no cabe en terraza con margen funcional de 0,30 m por lado.');
 }
 const built=hard.reduce((a,o)=>a+(o.type==='unit'?o.bw*o.bd:(o.type==='home'||o.type==='technical'?o.w*o.d:0)),0);
 const occupied=unionArea([...objects,...routes.map(r=>r.rect)]);
 if(built/(s.siteW*s.siteD)*100>s.maxCoverage)errors.push('Área techada supera el índice de ocupación SUPUESTO de '+s.maxCoverage+' %.');
 if(!units.length)warnings.push('No hay unidades productivas.');
 warnings.push('Retiros, separación e índice de ocupación son supuestos; no son norma certificada.');
 const minSetback=hard.length?Math.min(...hard.map(o=>Math.min(o.x,o.y,s.siteW-o.x-o.w,s.siteD-o.y-o.d))):null;
 const mainPathWidth=mainPaths.length?Math.min(...mainPaths.map(p=>Math.min(p.w,p.d))):null;
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)],units:units.length,built,occupied,free:s.siteW*s.siteD-occupied,parking:capacity,parkingNeed:need,minWallGap:Number.isFinite(minWallGap)?minWallGap:null,minSetback,mainPathWidth,valid:!errors.length};
}
// Posiciones posibles de la casa: desde el acceso peatonal hasta el retiro este, cada 0,5 m (de oeste a este).
function homePositions(s){
 const first=defaults.parkingX+s.stallD+s.aisle+s.pathWidth,last=s.siteW-s.setback-s.homeW,out=[];
 for(let x=first;x<=last+1e-6;x+=.5)out.push(Math.round(x*100)/100);
 return out;
}
// Quita cabañas desde la última hasta que el plano no tenga conflictos.
function trimToValid(s,objects){
 objects=objects.slice();
 while(!validate(s,objects).valid&&objects.some(o=>o.type==='unit')){const k=objects.map(o=>o.type).lastIndexOf('unit');objects.splice(k,1);}
 return validate(s,objects).valid?objects:null;
}
function layout(s,n=s.targetUnits,pattern='double',rot=null){
 // Busca la mayor cantidad válida probando altura del pasillo, giro del módulo y posición este-oeste de la casa.
 // A igualdad gana: sin giro, pasillo centrado y casa más al oeste (cerca del acceso y del parqueo).
 const rots=rot===null||rot===undefined?[false,true]:[rot];
 const center=(s.siteD-s.pathWidth)/2,corridors=[],homes=homePositions(s);
 for(let y=s.setback;y<=s.siteD-s.setback-s.pathWidth+1e-6;y+=.25)corridors.push(Math.round(y*100)/100);
 corridors.sort((a,b)=>Math.abs(a-center)-Math.abs(b-center)||a-b);
 let best=null;const count=o=>o.filter(x=>x.type==='unit').length;
 for(const r of rots)for(const hx of homes)for(const cy of corridors){
  const objects=trimToValid(s,fill(r,cy,hx));
  if(objects&&(!best||count(objects)>count(best)))best=objects;
  if(best&&count(best)>=n)return best;
 }
 // Si las filas no alcanzan, se prueban posiciones libres: esquinas y cabañas giradas hacia el pasillo.
 if(rot===null||rot===undefined){const free=freeLayout(s,n,corridors,homes,best?count(best):0);if(free)best=free;}
 return best||base(s,0,pattern,false,center);
 function fill(rot,corridorY,homeX){
 const obs=base(s,n,pattern,rot,corridorY,homeX),path=obs.find(o=>o.id==='path-h'),z=size(s,rot),depth=z.bd+s.deck;
 if(obs.some(p=>p.type==='path'&&obs.some(b=>b.type!=='path'&&overlap(p,b))))return obs;
 const ys=pattern==='single'?[{y:path.y+s.pathWidth,side:'north'}]:[{y:path.y+s.pathWidth,side:'north'},{y:path.y-depth,side:'south'}];
 let id=0;const cursors=ys.map(()=>path.x+s.pathWidth);let progress=true;
 // Cada fila encuentra sus propias posiciones; no hereda la alineación bloqueada por la casa.
 while(id<n&&progress){
  progress=false;
  for(let rowIndex=0;rowIndex<ys.length&&id<n;rowIndex++){
   const row=ys[rowIndex];
   for(let x=cursors[rowIndex];x+z.bw<=s.siteW-s.setback+1e-6;x+=.25){
    cursors[rowIndex]=x+.25;
    const o=unit(s,x,row.y,'u'+(id+1),row.side,rot,id<s.stage1?1:2);
    if(!inside(o,s,s.setback)||obs.some(b=>b.type!=='path'&&overlap(o,b,s.gap))||obs.some(b=>b.type==='path'&&overlap(o,b))||obs.some(b=>wallPair(o,b)&&wallDistance(o,b)<(s.wallGap||0)-1e-7))continue;
    obs.push(o);id++;cursors[rowIndex]=x+z.bw+Math.max(s.gap,s.wallGap||0);progress=true;break;
   }
  }
 }
 return obs;
 }
}
function freeLayout(s,n,corridors,homes,beat){
 // Colocación voraz en malla de 0,5 m y cuatro orientaciones, con varios órdenes de barrido.
 // Para acotar el tiempo se prueban la casa al oeste, al centro y al este, y el pasillo cada 0,5 m.
 const sides=['north','east','south','west'],cands=[];
 for(let x=s.setback;x<=s.siteW-s.setback;x+=.5)for(let y=s.setback;y<=s.siteD-s.setback;y+=.5)for(const side of sides)cands.push([x,y,side]);
 const orders=[c=>c[0]+c[1]*.01,c=>-c[0]+c[1]*.01,c=>c[1]+c[0]*.01,c=>-c[1]+c[0]*.01].map(k=>cands.slice().sort((a,b)=>k(a)-k(b)));
 const homeTries=[...new Set([homes[0],homes[Math.floor(homes.length/2)],homes[homes.length-1]])];
 let best=null,bestCount=beat;
 for(const hx of homeTries)for(const cy of corridors.filter(y=>Math.abs(y*2-Math.round(y*2))<1e-6))for(const list of orders){
  const objects=base(s,n,'double',false,cy,hx);
  if(objects.some(p=>p.type==='path'&&objects.some(b=>b.type!=='path'&&overlap(p,b))))break;
  let placed=0;
  for(const [x,y,side]of list){
   if(placed>=n)break;
   const o=unit(s,x,y,'u'+(placed+1),'north',false,1);o.side=side;orientUnit(o);o.x=x;o.y=y;
   if(!inside(o,s,s.setback)||objects.some(b=>b.type==='path'?overlap(o,b):overlap(o,b,s.gap)||(wallPair(o,b)&&wallDistance(o,b)<(s.wallGap||0)-1e-7)))continue;
   if(!accessGeometry(s,[...objects.filter(b=>b.type!=='unit'),o]).some(r=>r.object===o.id))continue;
   objects.push(o);placed++;
  }
  if(placed<=bestCount)continue;
  const valid=trimToValid(s,objects);if(!valid)continue;
  const units=valid.filter(o=>o.type==='unit');if(units.length<=bestCount)continue;
  // Numeración: primero la fila al sur del pasillo de izquierda a derecha, luego el resto.
  const south=o=>o.y>=cy+s.pathWidth-1e-6?0:1;
  units.sort((a,b)=>south(a)-south(b)||a.x-b.x);
  units.forEach((o,i)=>{o.id='u'+(i+1);o.name='Airbnb '+(i+1);o.stage=i<s.stage1?1:2;});
  best=[...valid.filter(o=>o.type!=='unit'),...units];bestCount=units.length;
  if(bestCount>=n)return best;
 }
 return best;
}
function costs(s,objects){
 const lines=[],rate=s.foundation+s.steel+s.envelope+s.roof+s.finishes+s.installations;
 const add=(group,item,qty,unitCost,stage=1)=>lines.push({group,item,qty,unitCost,total:qty*unitCost,stage});
 for(const u of objects.filter(o=>o.type==='unit')){
  const a=u.bw*u.bd,st=u.stage,first=lines.length;
  for(const [key,name]of [['foundation','Cimentación'],['steel','Estructura metálica'],['envelope','Cerramientos y ventanas'],['roof','Cubierta y aislamiento'],['finishes','Acabados'],['installations','Redes interiores y baño']])add(u.name,name,a,s[key],st);
  add(u.name,'Terraza',u.bw*u.deck,s.deckCost,st);add(u.name,'Jacuzzi instalado',1,s.jacuzziCost,st);
  add(u.name,'Cocineta',1,s.kitchenCost,st);add(u.name,'Dotación',1,s.furniture,st);add(u.name,'Climatización',1,s.ac,st);
  add(u.name,'Dotación por huésped adicional a dos',Math.max(0,fitGuests(u.bw,u.bd,u.guests)-2),s.extraGuestFurniture,st);
  for(let i=first;i<lines.length;i++)lines[i].objectID=u.id;
 }
 for(const o of objects){
  // Si los padres pagan su casa, no entra en la inversión del proyecto (y el subsidio de vivienda va con ella).
  if(o.type==='home'&&!s.homeByParents)add('Casa de los padres','Construcción y acabados',o.w*o.d,s.homeM2);
  if(o.type==='parking')add('Urbanismo','Parqueadero y maniobra',o.w*o.d,s.parkingM2);
  if(o.type==='path'){const prev=objects.slice(0,objects.indexOf(o)).filter(p=>p.type==='path');add('Urbanismo',o.name,unionArea([...prev,o])-unionArea(prev),s.pathM2);}
 }
 const pathObjects=objects.filter(o=>o.type==='path'),access=accessGeometry(s,objects).map(r=>r.rect);
 add('Urbanismo','Conexiones peatonales cortas',Math.max(0,unionArea([...pathObjects,...access])-unionArea(pathObjects)),s.pathM2);
 add('Servicios','Solución técnica / saneamiento',1,s.technicalCost);add('Servicios','Acometidas y redes generales',1,s.networks);add('Urbanismo','Paisajismo y privacidad',1,s.landscaping);
 const direct=lines.reduce((a,l)=>a+l.total,0),design=direct*s.design/100,contingency=(direct+design)*s.contingency/100;
 const factor=(1+s.design/100)*(1+s.contingency/100);
 const phase1=lines.filter(l=>l.stage===1).reduce((a,l)=>a+l.total,0)*factor;
 const phase2=lines.filter(l=>l.stage===2).reduce((a,l)=>a+l.total,0)*factor;
 return {lines,rate,direct,design,contingency,construction:direct+design+contingency,phase1,phase2,land:s.land,landFees:s.land*s.landFees/100,total:s.land*(1+s.landFees/100)+direct+design+contingency,factor};
}
function monthlyRate(ea){return Math.pow(1+ea/100,1/12)-1;}
function payment(p,r,n){return n>0?(r===0?p/n:p*r/(1-Math.pow(1+r,-n))):p;}
function npv(flows,rate){return flows.reduce((a,f,i)=>a+f/Math.pow(1+rate,i),0);}
function irr(flows){
 // No se presenta una TIR ambigua si hay varias alternancias de signo.
 const signs=flows.filter(x=>Math.abs(x)>1e-6).map(x=>Math.sign(x));
 const changes=signs.slice(1).reduce((a,x,i)=>a+(x!==signs[i]?1:0),0);
 if(changes!==1)return null;
 let lo=-0.5,hi=1,fl=npv(flows,lo),fh=npv(flows,hi);if(!Number.isFinite(fl)||fl*fh>0)return null;
 for(let i=0;i<140;i++){let mid=(lo+hi)/2,f=npv(flows,mid);if(f*fl>0){lo=mid;fl=f;}else hi=mid;}
 return Math.pow(1+(lo+hi)/2,12)-1;
}
function mirr(flows,ea){const rate=monthlyRate(ea),n=flows.length-1;let neg=0,pos=0;flows.forEach((f,i)=>{if(f<0)neg-=f/Math.pow(1+rate,i);else pos+=f*Math.pow(1+rate,n-i);});return neg>0&&pos>0?Math.pow(pos/neg,12/n)-1:null;}
function recovery(flows){
 // Primer cruce que no vuelve a negativo durante el horizonte (incluye etapas posteriores).
 let sum=0,arr=flows.map(f=>(sum+=f));
 for(let i=1;i<arr.length;i++)if(arr[i]>=0&&arr.slice(i).every(v=>v>=-1e-4)){
  return i-1+(arr[i]-arr[i-1]!==0?Math.max(0,-arr[i-1])/(arr[i]-arr[i-1]):1);
 }return null;
}
function simulate(s,objects){
 objects=objects.map(o=>o.type==='unit'?{...o,guests:fitGuests(o.bw,o.bd,o.guests)}:o);
 const c=costs(s,objects),num=o=>Number(String(o.id).replace(/\D/g,''))||0;
 const units=objects.filter(o=>o.type==='unit').sort((a,b)=>num(a)-num(b));
 const months=s.horizon*12,loans=[],rows=[],projectFlows=[],equityFlows=[];
 let cash=s.equity,invested=s.equity,projectCum=0,equityCum=0,totalInterest=0,maxDebt=0,maxGap=0;
 // Etapas: obra base (casa + urbanismo + redes + equipos) y las primeras stage1 cabañas desde el mes 1;
 // después una cabaña a la vez, cuando el negocio ya puede pagar su cuota (o cada cabinEvery meses si se fija).
 const unitCost=units.map(u=>c.lines.filter(l=>l.objectID===u.id).reduce((a,l)=>a+l.total,0)*c.factor);
 const baseCost=c.construction-unitCost.reduce((a,x)=>a+x,0);
 const homeCost=c.lines.filter(l=>l.group==='Casa de los padres').reduce((a,l)=>a+l.total,0)*c.factor;
 const subsid=Math.min(Math.max(0,s.subsidy),homeCost);
 const cm=Math.max(1,s.cabinMonths||1),bm=Math.max(1,s.buildMonths);
 const plan=units.map((u,i)=>({id:u.id,name:u.name,cost:unitCost[i],paid:0,start:i<s.stage1?1:null,open:null}));
 for(const p of plan)if(p.start)p.open=Math.max(p.start+cm,bm+1);
 const base={cost:baseCost,paid:0,open:bm+1};
 const season=[1.12,.86,.94,1.07,.92,1.1,1.15,.97,.88,1.02,.88,1.19];
 const r=monthlyRate(s.rate),vatFactor=1+s.vatPct/100,revenue12=[];
 function borrow(amount,ea,years,grace,m){if(amount<=0)return;loans.push({balance:amount,r:monthlyRate(ea),n:years*12,grace,end:m+grace,pmt:null});}
 for(let m=0;m<=months;m++){
  let capex=0,draw=0,grant=0,interest=0,principal=0,extra=0;
  const growth=Math.pow(1+s.costGrowth/100,m/12);
  if(m===0){capex=c.land+c.landFees;const fromOwn=Math.min(cash,capex);cash-=fromOwn;draw=capex-fromOwn;borrow(draw,s.landRate,s.landYears,0,m);}
  else {
   // ¿Arranca la siguiente cabaña este mes? Solo una en obra a la vez y con la obra base terminada.
   const next=plan.find(p=>p.start===null),building=plan.some(p=>p.start&&m<p.start+cm);
   if(next&&!building&&m>bm){
    const last=Math.max(0,...plan.filter(p=>p.start).map(p=>p.start));
    let go;
    if(s.cabinEvery>0)go=m>=last+s.cabinEvery;
    else{
     // Según caja: lo que dejó el negocio en los últimos 3 meses (después de cuotas) alcanza para la cuota nueva.
     const recent=rows.slice(-3),margin=recent.length?recent.reduce((a,x)=>a+x.operating-x.debt,0)/recent.length:0;
     const loan=next.cost*growth*s.financePct/100,own=next.cost*growth-loan;
     go=recent.length===3&&margin>=payment(loan,r,s.years*12)&&cash>=own;
    }
    if(go){next.start=m;next.open=m+cm;}
   }
   if(m<=bm){const part=baseCost/bm*growth;capex+=part;base.paid+=part;}
   for(const p of plan)if(p.start&&m>=p.start&&m<p.start+cm){const part=p.cost/cm*growth;capex+=part;p.paid+=part;}
   if(capex>0){let eligible=capex*s.financePct/100;draw=Math.min(eligible,Math.max(0,capex-cash));borrow(draw,s.rate,s.years,s.grace,m);}
  }
  // El subsidio paga la casa: se abona a los créditos de obra (los más recientes primero), no queda como caja libre.
  if(m===s.subsidyMonth&&subsid>0){grant=subsid;let left=subsid;for(const l of loans.slice(1).reverse()){const pay=Math.min(left,l.balance);l.balance-=pay;left-=pay;if(l.pmt!==null&&l.n>0)l.pmt=payment(l.balance,l.r,l.n);}cash+=left;}
  if(m>0)for(const l of loans){
   if(l.balance<=1e-7)continue;
   interest+=l.balance*l.r;
   if(m>=l.end){if(l.pmt===null)l.pmt=payment(l.balance,l.r,l.n);let pr=Math.min(l.balance,Math.max(0,l.pmt-l.balance*l.r));principal+=pr;l.balance-=pr;l.n--;}
  }
  const date=new Date(Date.UTC(s.startYear, m-1,1)),days=m?new Date(Date.UTC(s.startYear,m,0)).getUTCDate():0;
  let weekends=0;if(m)for(let d=1;d<=days;d++){const wd=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),d)).getUTCDay();if(wd===5||wd===6)weekends++;}
  const weekdays=days-weekends;
  let revenue=0,nightCost=0,stays=0,nightCount=0,active=0,available=0,potential=0,guestVariable=0;
  const priceGrow=Math.pow(1+s.priceGrowth/100,m/12);
  units.forEach((u,i)=>{
   const open=plan[i].open;
   if(open===null||m<open)return;active++;available+=days;
   const ramp=Math.min(1,s.rampFactor/100+(1-s.rampFactor/100)*(m-open)/Math.max(1,s.rampMonths));
   const sf=season[date.getUTCMonth()];
   const demand=u.guests>=4?s.familyOccupancy/100:1;
   const ow=Math.min(1,s.occWeek/100*s.occupancyFactor/100*sf*ramp*demand),oe=Math.min(1,s.occWeekend/100*s.occupancyFactor/100*sf*ramp*demand);
   const premium=u.guests>=4?1+s.familyPremium/100:1;
   const aw=s.adrWeek*priceGrow*s.priceFactor/100*premium,ae=s.adrWeekend*priceGrow*s.priceFactor/100*premium;
   const nights=weekdays*ow+weekends*oe;nightCount+=nights;stays+=nights/Math.max(.5,s.stay);
   revenue+=weekdays*ow*aw+weekends*oe*ae+nights/Math.max(.5,s.stay)*s.cleaningCharge*priceGrow;
   potential+=weekdays*aw+weekends*ae+days/Math.max(.5,s.stay)*s.cleaningCharge*priceGrow;
   nightCost+=nights*(s.variableNight+Math.max(0,u.guests-2)*s.extraGuestNight)*growth;
   guestVariable+=Math.max(0,u.guests-2)*s.extraGuestNight*days;
  });
  // IVA: si lo vendido en los últimos 12 meses supera el tope, la tarifa publicada ya lo incluye.
  revenue12.push(revenue);if(revenue12.length>12)revenue12.shift();
  const vatOn=revenue12.reduce((a,x)=>a+x,0)>s.vatThreshold;
  const vat=vatOn?revenue-revenue/vatFactor:0;
  const fee=revenue*s.fee/100,tax=(revenue-vat)*s.taxReserve/100;
  // Aseo: cada mes lo más barato entre pago por salida y persona fija + lavandería.
  const staff=active>0&&s.staffCost+stays*s.laundryStay<stays*s.cleaningStay;
  const perStay=staff?s.laundryStay:s.cleaningStay;
  const cleanCost=(stays*perStay+(staff?s.staffCost:0))*growth;
  const fixedBase=active?(s.internet+s.commonUtilities+s.gardening+s.accounting+s.fixed+s.adminPay+s.jacuzziUnit*active)*growth:0;
  const fixed=m?fixedBase+s.propertyTax/12*growth:0;
  const builtSoFar=(m>bm?baseCost:0)+plan.reduce((a,p)=>a+(p.open!==null&&m>=p.open?p.cost:0),0);
  const maintenance=builtSoFar*(s.maintenance+s.insurance)/100/12*growth;
  const replacement=active*s.replacement/12*growth;
  const opex=nightCost+cleanCost+fee+tax+vat+fixed+maintenance+replacement;
  const loanFees=draw*s.loanFee/100,loanInsurance=m?loans.reduce((a,l)=>a+l.balance,0)*s.loanInsurance/100:0;
  const operating=revenue-opex,debt=interest+principal+loanFees+loanInsurance;
  const project=operating-capex+grant;
  let cashFlow=operating-capex+draw-debt;
  if(m===0){cash-=loanFees;cashFlow=-loanFees;}else cash+=cashFlow;
  if(cash<0){extra=-cash;cash=0;invested+=extra;maxGap+=extra;}
  const equityFlow=m===0?-s.equity-extra:-extra; // Aportes y distribuciones: retiro anual de caja por encima de reserva.
  const reserve=3*(fixed+maintenance+replacement+debt);
  let distribution=0;if(m>0&&m%12===0&&cash>reserve){distribution=cash-reserve;cash-=distribution;}
  const ef=equityFlow+distribution;
  equityFlows.push(ef);projectFlows.push(project);projectCum+=project;equityCum+=ef;
  totalInterest+=interest;const balance=loans.reduce((a,l)=>a+l.balance,0);maxDebt=Math.max(maxDebt,balance);
  // Equilibrio mensual a mezcla de tarifa constante; independiente de la ocupación elegida.
  const netShare=(vatOn?1/vatFactor:1)*(1-s.taxReserve/100)-s.fee/100;
  const netPotential=potential*netShare-(available*(s.variableNight+perStay/Math.max(.5,s.stay))+guestVariable)*growth;
  const fixedAll=fixed+maintenance+replacement+(staff?s.staffCost*growth:0);
  const beOp=netPotential>0?fixedAll/netPotential:null;
  const beCash=netPotential>0?(fixedAll+debt)/netPotential:null;
  rows.push({m,capex,draw,grant,revenue,opex,vat,fee,tax,nightCost,maintenance,replacement,staff,clean:cleanCost,fixed,operating,interest,principal,loanFees,loanInsurance,debt,extra,distribution,cash,project,projectCum,equityCum,balance,active,nightCount,available,occupancy:available?nightCount/available:0,beOp,beCash});
 }
 const last=rows[rows.length-1];
 // Caja retenida se devuelve al cierre; deuda remanente se liquida incluso sin venta de activos.
 let terminal=last.cash-last.balance;
 if(s.salvage)terminal+=c.land*Math.pow(1+s.priceGrowth/100,s.horizon)+c.construction*s.salvagePct/100;
 equityFlows[equityFlows.length-1]+=terminal;
 if(s.salvage)projectFlows[projectFlows.length-1]+=c.land*Math.pow(1+s.priceGrowth/100,s.horizon)+c.construction*s.salvagePct/100;
 const discount=monthlyRate(s.discount);
 const built=plan.filter(p=>p.open!==null&&p.open<=months),lastOpen=Math.max(bm+1,...built.map(p=>p.open));
 const steadyStart=lastOpen+s.rampMonths;
 const normal=rows.filter(r=>r.m>=steadyStart&&r.m<steadyStart+12);
 const steady=normal.length>=12?normal:rows.filter(r=>r.m>months-12);
 const mean=key=>steady.reduce((a,r)=>a+(r[key]||0),0)/Math.max(1,steady.length);
 const sustainable=rows.find(r=>r.m>0&&r.active===built.length&&rows.slice(r.m).every(t=>t.operating-t.debt>=-1e-5));
 const paid=base.paid+plan.reduce((a,p)=>a+p.paid,0),unbuilt=plan.filter(p=>p.start===null).reduce((a,p)=>a+p.cost,0);
 const daysMonth=365.25/12;
 return {cost:c,rows,plan,base,projectFlows,equityFlows,npv:npv(projectFlows,discount),equityNpv:npv(equityFlows,discount),irr:irr(projectFlows),equityIrr:irr(equityFlows),mirr:mirr(projectFlows,s.discount),equityMirr:mirr(equityFlows,s.discount),payback:recovery(rows.map(r=>r.project)),equityPayback:recovery(equityFlows.slice(0,-1).concat(equityFlows.at(-1)-terminal)),sustainableMonth:sustainable?sustainable.m:null,
  // Conciliación con el presupuesto: precios de hoy + inflación de lo construido − cabañas que no alcanzan a construirse.
  capexPaid:paid,capexInflation:paid-(c.construction-unbuilt),unbuilt,built:built.length,
  terminal,invested,maxGap,maxDebt,totalInterest,subsidy:subsid,
  steady:{revenue:mean('revenue'),operating:mean('operating'),debt:mean('debt'),cash:mean('operating')-mean('debt'),beOp:mean('beOp'),beCash:mean('beCash'),occupancy:mean('occupancy'),beCashNights:mean('beCash')*daysMonth,beOpNights:mean('beOp')*daysMonth,active:mean('active')},units:units.length};
}
root.EN2614={defaults,copy,rect,overlap,inside,rectDistance,wallDistance,maxGuests,fitGuests,unit,orientUnit,rotateUnit,unitParts,syncParking,layout,validate,costs,monthlyRate,payment,npv,irr,mirr,recovery,simulate,accessGeometry,unionArea};
if(typeof module!=='undefined')module.exports=root.EN2614;
})(typeof globalThis!=='undefined'?globalThis:this);
