/* Interfaz local EN-2614. No transmite datos a servicios externos. */
(() => {
'use strict';
const E=window.EN2614,$=id=>document.getElementById(id),fmt=new Intl.NumberFormat('es-CO',{maximumFractionDigits:2}),COP=n=>(n<-.5?'−$':'$')+new Intl.NumberFormat('es-CO',{maximumFractionDigits:0}).format(Math.abs(n)),M=n=>(n<-5000?'−$':'$')+fmt.format(Math.abs(n)/1e6)+' M',pct=n=>n==null?'—':fmt.format(n*100)+' %',years=n=>n==null?'No recupera':fmt.format(n/12)+' años',esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SUPPORT_KEYS=['setback','gap','wallGap','pathWidth','maxCoverage','homeX','homeY','parkingX','parkingY','homeW','homeD','technicalW','technicalD','stallW','stallD','aisle','parkingRatio','adminParking'];
function fixedSupport(config){for(const key of SUPPORT_KEYS)config[key]=E.defaults[key];}
const KEY='wde_en2614_solution_v1';let s=E.copy(E.defaults),selected='u1',tab='plan',snapshots=[],dirty=false,lastResult=null;
// Cada modelo se distribuye al máximo que cabe; este tope solo acota la búsqueda.
const MAX_UNITS=12;
const finance=[
 ['1. Cómo se construye',[
 ['stage1','Cabañas que se construyen junto con la obra base',0,30,1],['buildMonths','Meses de obra base (infraestructura y casa)',1,36,1],['cabinMonths','Meses de obra de cada cabaña',1,24,1],['cabinEvery','Otra cabaña cada … meses (0 = cuando el negocio pueda pagar su cuota)',0,120,1],['startYear','Año en que empieza la obra',2026,2050,1]],'Qué se hace primero y a qué ritmo siguen las demás cabañas.'],
 ['2. Cuánto se cobra y cuánta gente viene',[
 ['adrWeek','Precio por noche, domingo a jueves (COP)',0,5000000,10000],['adrWeekend','Precio por noche, viernes y sábado (COP)',0,5000000,10000],['occWeek','Qué tan llena entre semana (%)',0,100,1],['occWeekend','Qué tan llena el fin de semana (%)',0,100,1],['stay','Noches que se queda cada huésped',.5,30,.5],['familyPremium','Precio extra si son 4 huéspedes (%)',0,150,1],['familyOccupancy','Demanda de grupos de 4 frente a parejas (%)',0,150,5]],'Precio por noche y ocupación esperada. El promedio de Ricaurte es ~26 % de ocupación.'],
 ['3. Lo que se va en cada venta',[
 ['fee','Comisión Airbnb (%)',0,40,.5],['taxReserve','ICA + FONTUR (%)',0,40,.25],['vatPct','IVA (%)',0,30,1],['variableNight','Energía, agua e insumos por noche (COP)',0,300000,5000],['cleaningStay','Aseo y lavandería por salida, servicio externo (COP)',0,500000,5000],['laundryStay','Lavandería por salida si hay persona fija (COP)',0,200000,5000],['extraGuestNight','Gasto extra por noche con 4 huéspedes (COP)',0,100000,1000]],'Gastos que suben o bajan según cuántas noches se vendan.'],
 ['4. Gastos fijos de cada mes',[
 ['staffCost','Persona fija de aseo, costo total al mes',0,20000000,50000],['internet','Internet',0,5000000,10000],['commonUtilities','Energía y agua de zonas comunes',0,5000000,10000],['gardening','Jardinería',0,5000000,10000],['accounting','Contador',0,5000000,10000],['fixed','Software de reservas y publicidad',0,10000000,10000],['jacuzziUnit','Jacuzzi: químicos y mantenimiento por cabaña',0,2000000,10000],['adminPay','Pago a los administradores (padres)',0,10000000,100000],['propertyTax','Predial al año',0,20000000,100000],['maintenance','Mantenimiento al año (% de la obra)',0,10,.25],['insurance','Seguro al año (% de la obra)',0,5,.1],['replacement','Reponer dotación, al año por cabaña',0,10000000,100000]],'Se pagan haya o no huéspedes. El aseo usa lo más barato entre pago por salida y persona fija.'],
 ['5. Lote, capital propio y crédito',[
 ['land','Precio del lote',0,10000000000,5000000],['landFees','Gastos de compra del lote (%)',0,15,.5],['equity','Capital propio inicial',0,10000000000,5000000],['rate','Tasa del crédito de obra (% anual)',0,60,.5],['years','Plazo del crédito de obra (años)',1,30,1],['landRate','Tasa del crédito del lote (% anual)',0,60,.5],['landYears','Plazo del crédito del lote (años)',1,30,1],['financePct','Parte de la obra que presta el banco (%)',0,100,5],['grace','Meses pagando solo intereses al inicio',0,36,1]],'Con qué plata se paga: lo propio primero y el resto con crédito.'],
 ['6. Casa de los padres y subsidio',[
 ['subsidy','Subsidio de vivienda rural (tope 70 SMMLV 2026)',0,500000000,1000000],['subsidyMonth','Mes en que llega el subsidio',1,240,1]],'Si los padres pagan su casa, no entra en la inversión y el subsidio va con ella.'],
 ['7. Meta: ¿cuánto debe rendir?',[
 ['discount','Rentabilidad mínima esperada (% anual)',0,50,.5],['cdtRate','Lo que paga un CDT (% anual)',0,50,.5],['horizon','Años que se analizan',3,30,1]],'Con estas metas se pinta el semáforo de la respuesta.'],
 ['8. Detalles técnicos (opcional)',[
 ['rampMonths','Meses que tarda una cabaña nueva en llenarse',1,24,1],['rampFactor','Qué tan llena abre una cabaña nueva (% de la normal)',0,100,5],['vatThreshold','Ventas de 12 meses desde las que se cobra IVA (COP)',0,10000000000,1000000],['priceGrowth','Aumento anual de tarifas (%)',0,15,.5],['costGrowth','Aumento anual de costos (%)',0,20,.5],['loanFee','Gastos del crédito por desembolso (%)',0,10,.1],['loanInsurance','Seguro de deuda, % del saldo al mes',0,1,.005],['cleaningCharge','Limpieza cobrada al huésped por estadía (COP)',0,500000,5000],['salvagePct','Valor residual de la obra al final (%)',0,100,5]],'Normalmente no hace falta tocarlos.']
];
const costGroups=[
 ['Construcción por m² bruto',[
 ['foundation','Cimentación',0,3000000,10000],['steel','Estructura metálica',0,3000000,10000],['envelope','Cerramientos y ventanas',0,3000000,10000],['roof','Cubierta y aislamiento',0,3000000,10000],['finishes','Acabados',0,3000000,10000],['installations','Redes interiores y baño privado',0,3000000,10000],['homeM2','Casa padres · costo completo / m²',0,10000000,50000]]],
 ['Terraza y equipamiento',[
 ['deckCost','Terraza / m²',0,2000000,10000],['jacuzziCost','Jacuzzi instalado / unidad',0,100000000,500000],['kitchenCost','Cocineta privada / unidad',0,30000000,500000],['furniture','Mobiliario y menaje / unidad',0,50000000,500000],['extraGuestFurniture','Dotación / huésped adicional a dos',0,10000000,100000],['ac','Climatización / unidad',0,20000000,100000]]],
 ['Obras comunes',[
 ['parkingM2','Parqueadero y maniobra / m²',0,1000000,10000],['pathM2','Pasillos / m²',0,1000000,10000],['technicalCost','Saneamiento y equipos comunes',0,200000000,1000000],['networks','Acometidas y redes generales',0,200000000,1000000],['landscaping','Jardines y privacidad',0,100000000,500000]]],
 ['Provisiones e incertidumbre',[
 ['design','Diseños, estudios, permisos (%)',0,30,.5],['contingency','Contingencia sobre obra + diseños (%)',0,50,1],['lowRange','Rango inferior desde base (%)',0,50,1],['highRange','Rango superior desde base (%)',0,100,1]]]
];
const fields=[...finance,...costGroups].flatMap(g=>g[1]);
const metadata=Object.fromEntries(fields.map(f=>[f[0],f]));
function toast(t){$('toast').textContent=t;$('toast').classList.add('visible');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.remove('visible'),3800);}
function save(){try{localStorage.setItem(KEY,JSON.stringify({config:s,snapshots,layoutRepair:1,fixedSupportLocations:1,parkingRight:1,supportBand:1,finance2026:1,recommended2026:1}));}catch{toast('No se pudo guardar en el navegador. Exporta JSON para conservar tu trabajo.');}}
function repairDisplacedInitialUnit(config){
 // Corrige únicamente el desplazamiento del Airbnb 1 en el esquema inicial mostrado.
 const initial=E.layout(E.defaults),u=config.objects.find(o=>o.id==='u1'),original=initial.find(o=>o.id==='u1');
 if(!u||config.objects.length!==initial.length)return false;
 const sameGeometry=(a,b)=>['type','x','y','w','d','bw','bd','deck','side'].every(k=>a[k]===b[k]);
 if(!initial.every(b=>{const a=config.objects.find(o=>o.id===b.id);return a&&(b.id==='u1'?sameGeometry({...a,x:b.x,y:b.y},b):sameGeometry(a,b));}))return false;
 if(!E.validate(config,config.objects).errors.some(t=>t.includes(u.name)))return false;
 const before={x:u.x,y:u.y};u.x=original.x;u.y=original.y;
 if(E.validate(config,config.objects).errors.some(t=>t.includes(u.name))){Object.assign(u,before);return false;}
 return true;
}
function normalize(input){
 const out=E.copy(E.defaults);
 for(const key of Object.keys(out))if(key!=='objects'&&input[key]!==undefined){
  if(typeof out[key]==='number'){const n=Number(input[key]),f=metadata[key];if(!Number.isFinite(n))throw Error('Número inválido: '+key);out[key]=f?Math.min(f[3],Math.max(f[2],n)):Math.min(1e10,Math.max(0,n));if(f&&f[4]===1)out[key]=Math.round(out[key]);}
  else if(typeof out[key]==='boolean')out[key]=Boolean(input[key]);
 }
 out.siteW=E.defaults.siteW;out.siteD=E.defaults.siteD;fixedSupport(out);
 if(!Array.isArray(input.objects)||input.objects.length>100)throw Error('El archivo no contiene un plano válido (máximo 100 elementos).');
 const ids=new Set();out.objects=input.objects.map(o=>{
  if(!['unit','home','technical','parking','path'].includes(o.type)||typeof o.id!=='string'||ids.has(o.id))throw Error('Elemento no válido o identificador repetido.');ids.add(o.id);
  const obj={id:o.id.slice(0,50),type:o.type,name:String(o.name||o.type).slice(0,100)};
  for(const key of ['x','y','w','d']){obj[key]=Number(o[key]);if(!Number.isFinite(obj[key])||Math.abs(obj[key])>10000)throw Error('Geometría inválida.');}
  if(obj.w<=0||obj.d<=0)throw Error('Dimensión inválida.');
  if(o.type==='parking')obj.rotation=[0,90,180,270].includes(o.rotation)?o.rotation:0;
  if(o.type==='unit'){for(const key of ['bw','bd','deck','guests']){obj[key]=Number(o[key]);if(!Number.isFinite(obj[key])||obj[key]<0||obj[key]>100)throw Error('Módulo inválido.');}obj.stage=o.stage===2?2:1;obj.side=['north','east','south','west'].includes(o.side)?o.side:'north';E.orientUnit(obj);}
  if(obj.type==='home'){obj.w=out.homeW;obj.d=out.homeD;}
  if(obj.type==='technical'){obj.w=out.technicalW;obj.d=out.technicalD;}
  return obj;
 });out.guests=E.fitGuests(out.unitW,out.unitD,out.guests);return out;
}
try{const boot=$('projectData')?JSON.parse($('projectData').textContent):null;const data=boot||JSON.parse(localStorage.getItem(KEY)||'null');if(data){s=normalize(data.config);if(!data.layoutRepair)repairDisplacedInitialUnit(s);if(!data.fixedSupportLocations||!data.parkingRight||!data.supportBand||s.objects.some(o=>o.id.startsWith('path-service')))s.objects=E.layout(s,MAX_UNITS,'double');for(const f of fields)s[f[0]]=E.defaults[f[0]];s.homeByParents=E.defaults.homeByParents;s.salvage=E.defaults.salvage;snapshots=Array.isArray(data.snapshots)?data.snapshots.slice(0,30).filter(x=>x.config&&typeof x.name==='string'):[];}}catch(e){console.warn(e);}
if(!s.objects.length)s.objects=E.layout(s,MAX_UNITS,'double');
const isSiteDimension=key=>key==='siteW'||key==='siteD';
const isTariff=key=>key==='adrWeek'||key==='adrWeekend';
const isPercentField=key=>['occWeek','occWeekend','familyPremium','familyOccupancy'].includes(key);
function fieldValue(key,value){return isTariff(key)?COP(value):isPercentField(key)?fmt.format(value)+' %':value;}
function parsePesos(value){const clean=String(value).replace(/[$\s.]/g,'').replace(',','.');return clean!==''&&/^-?\d+(?:\.\d+)?$/.test(clean)?Math.round(Number(clean)):NaN;}
function parsePercent(value){const clean=String(value).replace(/[%\s]/g,'').replace(',','.');return clean!==''&&/^-?\d+(?:\.\d+)?$/.test(clean)?Number(clean):NaN;}
function fieldHtml(f){const [key,label,min,max,step]=f,money=isTariff(key),formatted=money||isPercentField(key);return `<label class="field${label.length>38?' full':''}"><span>${esc(label)}</span><input data-field="${key}" aria-label="${esc(label)}" ${isSiteDimension(key)?'readonly aria-readonly="true"':''} ${formatted?`type="text" inputmode="${money?'numeric':'decimal'}" value="${fieldValue(key,s[key])}"`:`type="number" value="${s[key]}" min="${min}" max="${max}" step="${step}"`}>${max>=1000000&&!money?`<small>${COP(s[key])}</small>`:''}</label>`;}
function makeControls(id,groups){$(id).innerHTML=`<p class="muted controls-intro">Son los valores del escenario recomendado. Cambia cualquiera y toda la pestaña se recalcula. Ábrelos en orden.</p>`+groups.map(([name,fs,hint],i)=>`<details class="control-section" data-group="${i}" ${i===0?'open':''}><summary><h3 style="display:inline-block">${name}</h3></summary>${hint?`<p class="muted group-hint">${hint}</p>`:''}<div class="fields">${fs.map(fieldHtml).join('')}</div></details>`).join('');}
function refreshInputs(){for(const el of document.querySelectorAll('[data-field]')){el.value=fieldValue(el.dataset.field,s[el.dataset.field]);const sm=el.nextElementSibling;if(sm&&sm.tagName==='SMALL'&&!sm.hasAttribute('data-capacity-note'))sm.textContent=COP(s[el.dataset.field]);}}
function syncStage(){const u=s.objects.filter(o=>o.type==='unit');s.stage2=u.filter(o=>o.stage===2).length;}
function syncCapacity(){
 fixedSupport(s);
 // La casa conserva su altura y solo se corre de oeste a este, entre el acceso peatonal y el retiro.
 for(const o of s.objects){if(o.type==='home'){const minX=E.defaults.parkingX+s.stallD+s.aisle+s.pathWidth;o.x=Math.min(s.siteW-s.setback-s.homeW,Math.max(minX,Number.isFinite(o.x)?o.x:E.defaults.homeX));o.y=E.defaults.homeY;o.w=s.homeW;o.d=s.homeD;}if(o.type==='technical'){o.w=s.technicalW;o.d=s.technicalD;}}
 const models=[[5,5],[6,5],[6,6],[7,5]];
 const standard=(w,d)=>models.find(([a,b])=>a===w&&b===d)||models.find(([a,b])=>a===d&&b===w)||models.reduce((best,m)=>Math.hypot(m[0]-w,m[1]-d)<Math.hypot(best[0]-w,best[1]-d)?m:best);
 const model=standard(s.unitW,s.unitD);[s.unitW,s.unitD]=model;
 s.deck=E.defaults.deck;s.jacuzzi=E.defaults.jacuzzi;s.minArea=E.defaults.minArea;s.guests=E.fitGuests(s.unitW,s.unitD,s.guests);
 for(const o of s.objects.filter(o=>o.type==='unit')){
  const match=models.some(([w,d])=>w===o.bw&&d===o.bd||w===o.bd&&d===o.bw);
  if(!match)[o.bw,o.bd]=standard(o.bw,o.bd);
  o.deck=s.deck;o.guests=E.fitGuests(o.bw,o.bd,s.guests);E.orientUnit(o);
 }
 const family=s.objects.some(o=>o.type==='unit'&&o.guests===4);
 for(const key of ['familyPremium','familyOccupancy','extraGuestNight','extraGuestFurniture'])document.querySelector(`[data-field="${key}"]`)?.closest('.field').toggleAttribute('hidden',!family);
 for(const button of document.querySelectorAll('[data-preset]')){const active=button.dataset.preset===s.unitW+','+s.unitD;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
}
function allRender(){syncCapacity();E.syncParking(s,s.objects);syncStage();lastResult=E.simulate(s,s.objects);const v=E.validate(s,s.objects);renderKpis(v,lastResult);renderMap();renderValidation(v);renderUnits();if(tab==='money')renderMoney();if(tab==='cost')renderCost();$('stampArea').textContent=fmt.format(s.siteW*s.siteD)+' m² geométricos';document.querySelector('.project-stamp strong').textContent=fmt.format(s.siteW)+' × '+fmt.format(s.siteD)+' m';save();}
function renderKpis(v,r){const verdict=verdictOf(r);$('kpis').innerHTML=[
 ['Unidades en el plano',String(v.units),v.valid?'Geometría sin conflictos detectados':v.errors.length+' conflictos espaciales',true],
 ['¿Buena inversión?',verdict.label,r.built+' de '+r.units+' cabañas construidas en '+s.horizon+' años',false,verdict.level==='red'],
 ['Caja al mes ya funcionando',M(r.steady.cash),'Después de gastos y cuotas',false,r.steady.cash<0],
 ['Plata extra a poner',M(r.maxGap),'Además de '+M(s.equity)+' iniciales',false,r.maxGap>0],
 ['Rentabilidad anual',pct(r.mirr),'Meta '+fmt.format(s.discount)+' % · CDT '+fmt.format(s.cdtRate)+' %',false,r.mirr==null||r.mirr<s.discount/100]
 ].map(([label,value,sub,featured,neg])=>`<article class="kpi ${featured?'featured':''}"><label>${label}</label><strong class="${neg?'negative':''}">${value}</strong><small>${sub}${!v.valid&&!featured?' · Plano no factible':''}</small></article>`).join('');}
// Cotas geométricas: se recalculan al mover o redimensionar cada elemento.
function dimH(x1,x2,y,label,color='#4b505a',fs=.62){
 const t=esc(label??fmt.format(Math.abs(x2-x1))+' m'),w=Math.max(1,t.length*fs*.55);
 return `<g class="dimension" pointer-events="none"><path d="M${x1} ${y-.25}v.5M${x1} ${y}H${x2}M${x2} ${y-.25}v.5" fill="none" stroke="${color}" stroke-width=".045"/><rect x="${(x1+x2-w)/2}" y="${y-fs*.8}" width="${w}" height="${fs*1.2}" fill="#fcfcfd"/><text class="dimension-label" data-axis="h" x="${(x1+x2)/2}" y="${y}" fill="${color}" font-size="${fs}" text-anchor="middle">${t}</text></g>`;
}
function dimV(x,y1,y2,label,color='#4b505a',fs=.62){
 const t=esc(label??fmt.format(Math.abs(y2-y1))+' m'),w=Math.max(1,t.length*fs*.55),cy=(y1+y2)/2;
 return `<g class="dimension" pointer-events="none"><path d="M${x-.25} ${y1}h.5M${x} ${y1}V${y2}M${x-.25} ${y2}h.5" fill="none" stroke="${color}" stroke-width=".045"/><g transform="translate(${x},${cy}) rotate(-90)"><rect x="${-w/2}" y="${-fs*.8}" width="${w}" height="${fs*1.2}" fill="#fcfcfd"/><text class="dimension-label" data-axis="v" fill="${color}" font-size="${fs}" text-anchor="middle">${t}</text></g></g>`;
}
function clearances(o){
 const a={west:{value:o.x,to:'Lindero oeste'},east:{value:s.siteW-o.x-o.w,to:'Lindero este'},north:{value:o.y,to:'Lindero norte'},south:{value:s.siteD-o.y-o.d,to:'Lindero sur'}};
 for(const b of s.objects.filter(b=>b.id!==o.id&&b.type!=='path')){
  if(b.y<o.y+o.d-1e-6&&b.y+b.d>o.y+1e-6){
   if(b.x+b.w<=o.x+1e-6&&o.x-b.x-b.w<a.west.value)a.west={value:o.x-b.x-b.w,to:b.name,at:(Math.max(o.y,b.y)+Math.min(o.y+o.d,b.y+b.d))/2};
   if(b.x>=o.x+o.w-1e-6&&b.x-o.x-o.w<a.east.value)a.east={value:b.x-o.x-o.w,to:b.name,at:(Math.max(o.y,b.y)+Math.min(o.y+o.d,b.y+b.d))/2};
  }
  if(b.x<o.x+o.w-1e-6&&b.x+b.w>o.x+1e-6){
   if(b.y+b.d<=o.y+1e-6&&o.y-b.y-b.d<a.north.value)a.north={value:o.y-b.y-b.d,to:b.name,at:(Math.max(o.x,b.x)+Math.min(o.x+o.w,b.x+b.w))/2};
   if(b.y>=o.y+o.d-1e-6&&b.y-o.y-o.d<a.south.value)a.south={value:b.y-o.y-o.d,to:b.name,at:(Math.max(o.x,b.x)+Math.min(o.x+o.w,b.x+b.w))/2};
  }
 }
 return a;
}
function parkingFrame(o){
 const angle=o.rotation||0,lateral=angle%180===90;
 return {angle,w:lateral?o.d:o.w,d:lateral?o.w:o.d,transform:{0:'',90:`translate(${o.w},0) rotate(90)`,180:`translate(${o.w},${o.d}) rotate(180)`,270:`translate(0,${o.d}) rotate(270)`}[angle]};
}
function cabinFrame(o){
 const w=o.bw,d=o.bd+o.deck,angle={north:0,east:90,south:180,west:270}[o.side]||0;
 const transform={0:'',90:`translate(${d},0) rotate(90)`,180:`translate(${w},${d}) rotate(180)`,270:`translate(0,${w}) rotate(270)`}[angle];
 return {c:{...o,x:0,y:0,w,d,side:'north'},angle,transform,point:(x,y)=>angle===90?{x:d-y,y:x}:angle===180?{x:w-x,y:d-y}:angle===270?{x:y,y:w-x}:{x,y}};
}
function uprightCabinText(markup,angle){return !angle?markup:markup.replace(/<text\b([^>]*)>/g,(_,attrs)=>{
 const x=attrs.match(/\bx="([^"]+)"/)?.[1]||0,y=attrs.match(/\by="([^"]+)"/)?.[1]||0;
 let correction=-angle;
 if(attrs.includes('dimension-label')){const raw=(angle+(attrs.includes('data-axis="v"')?-90:0)+360)%360;correction=raw>90&&raw<=270?-180:0;}
 return `<text${attrs}${correction?` transform="rotate(${correction} ${x} ${y})"`:''}>`;
});}
function privateInterior(o,detail=false){
 if(o.bw<4||o.bd<4)return '';
 const by=o.side==='north'?o.deck:0,bx=o.bw-1.8,ky=by+o.bd-.8;
 const label=(x,y,t,size=detail?.27:.4)=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" fill="#202322" stroke="none">${t}</text>`;
 let h=`<g class="private-interior" stroke="#4b505a" stroke-width=".045" stroke-linejoin="round">
 <rect x=".25" y="${by+.25}" width="1.6" height="2" rx=".08" fill="#fcfcfd"/><rect x=".35" y="${by+.35}" width=".63" height=".35" rx=".04" fill="#e3e5ea"/><rect x="1.08" y="${by+.35}" width=".63" height=".35" rx=".04" fill="#e3e5ea"/>
 <rect x="${bx}" y="${by+.2}" width="1.6" height="2.2" fill="#f3f4f7" stroke="none"/>
 <path d="M${bx} ${by+2.4}V${by+.2}h1.6v2.2h-.9" fill="none" stroke="#202322" stroke-width=".085"/>
 <path d="M${bx} ${by+2.4}v-.7a.7 .7 0 0 1 .7 .7" fill="none" stroke="#767c88" stroke-width=".035"/>
 <rect x="${bx+.72}" y="${by+.3}" width=".78" height=".78" fill="#fcfcfd"/>
 <path d="M${bx+.72} ${by+.3}l.78 .78m-.78 0l.78 -.78" fill="none" stroke="#d5d8df"/><circle cx="${bx+1.11}" cy="${by+.69}" r=".045" fill="#767c88"/>
 <rect x="${bx+.13}" y="${by+.33}" width=".4" height=".18" rx=".03" fill="#fcfcfd"/><ellipse cx="${bx+.33}" cy="${by+.76}" rx=".22" ry=".31" fill="#fcfcfd"/><ellipse cx="${bx+.33}" cy="${by+.77}" rx=".13" ry=".19" fill="none"/>
 <rect x="${bx+.88}" y="${by+1.23}" width=".58" height=".42" rx=".04" fill="#fcfcfd"/><ellipse cx="${bx+1.17}" cy="${by+1.45}" rx=".19" ry=".12" fill="none"/><path d="M${bx+1.17} ${by+1.24}v.1"/>
 <rect x="${o.bw-2}" y="${ky}" width="1.8" height=".6" fill="#e3e5ea" stroke="#202322" stroke-width=".065"/>
 <path d="M${o.bw-1.18} ${ky}v.6M${o.bw-.92} ${ky}v.6" fill="none" stroke="#767c88"/>
 <rect x="${o.bw-1.87}" y="${ky+.12}" width=".55" height=".38" rx=".06" fill="#fcfcfd"/><path d="M${o.bw-1.6} ${ky+.03}v.18h.1" fill="none"/>
 <rect x="${o.bw-.82}" y="${ky+.06}" width=".53" height=".48" rx=".03" fill="#fcfcfd"/><circle cx="${o.bw-.57}" cy="${ky+.2}" r=".1" fill="none"/><circle cx="${o.bw-.57}" cy="${ky+.4}" r=".08" fill="none"/>
 ${label(bx+.8,by+1.94,'Baño')}${detail?label(bx+.8,by+2.23,'privado',.22):''}
 ${label(o.bw-1.1,ky-.17,detail?'Cocina privada':'Cocina')}
 </g>`;
 if(o.guests>=4)h+=`<rect x=".25" y="${by+o.bd-2.1}" width="1.4" height="1.8" rx=".08" fill="#fcfcfd" stroke="#767c88" stroke-width=".045"/>`;
 if(detail){
  h+=label(1.05,by+1.45,'Cama');
  if(o.guests>=4)h+=label(.95,by+o.bd-1.1,'Sofá cama');
  const doorY=o.side==='north'?by:by+o.bd,sign=o.side==='north'?1:-1,dx=o.bw/2-.45;
  h+=`<path d="M${dx} ${doorY}h.9" stroke="#fcfcfd" stroke-width=".12"/><path d="M${dx} ${doorY}v${sign*.9}a.9 .9 0 0 ${sign>0?0:1} .9 ${-sign*.9}" fill="none" stroke="#767c88" stroke-width=".035"/>`;
 }
 return h;
}
function homeInterior(o,detail=false){
 const label=(x,y,t)=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="${detail?.27:.42}" fill="#202322" stroke="none">${t}</text>`;
 return `<g class="home-interior" transform="scale(${o.w/8} ${o.d/7})" stroke="#4b505a" stroke-width=".045" fill="#fcfcfd"><title>Casa padres: dos dormitorios, baño, cocina, sala-comedor y lavado</title>
 <rect x=".06" y=".06" width="7.88" height="6.88" fill="#fcfcfd"/>
 <rect x="5.8" y="3.1" width="2.14" height="2.4" fill="#f3f4f7" stroke="none"/>
 <rect x="5.8" y="5.5" width="2.14" height="1.44" fill="#f3f4f7" stroke="none"/>
 <path d="M4 .06V3.1M.06 3.1H3m.85 0h.3m.85 0h2.94M5.8 3.1v1.4m0 .8v.2h2.14M5.8 5.5v.25m0 .8v.39" fill="none" stroke="#202322" stroke-width=".08"/>
 <path d="M3 3.1v-.85a.85 .85 0 0 1 .85 .85M4.15 3.1v-.85a.85 .85 0 0 1 .85 .85M5.8 4.5h.8a.8 .8 0 0 1 -.8 .8M5.8 5.75h.8a.8 .8 0 0 1 -.8 .8" fill="none" stroke="#767c88" stroke-width=".035"/>
 <rect x=".45" y=".5" width="1.6" height="2" rx=".06"/><rect x=".55" y=".6" width=".65" height=".35" rx=".03" fill="#e3e5ea"/><rect x="1.3" y=".6" width=".65" height=".35" rx=".03" fill="#e3e5ea"/>
 <rect x="3.1" y=".3" width=".6" height="1.8" fill="#e3e5ea"/><path d="M3.1 1.2h.6"/>
 <rect x="4.5" y=".5" width="1.2" height="2" rx=".06"/><rect x="4.6" y=".6" width="1" height=".35" rx=".03" fill="#e3e5ea"/>
 <rect x="7.1" y=".3" width=".6" height="1.8" fill="#e3e5ea"/><path d="M7.1 1.2h.6"/>
 <rect x="6.9" y="3.3" width=".85" height=".85"/><path d="M6.9 3.3l.85 .85m-.85 0l.85 -.85" stroke="#d5d8df"/><circle cx="7.325" cy="3.725" r=".045" fill="#767c88"/>
 <rect x="6.08" y="3.35" width=".4" height=".2" rx=".03"/><ellipse cx="6.28" cy="3.83" rx=".23" ry=".3"/><ellipse cx="6.28" cy="3.84" rx=".13" ry=".18" fill="none"/>
 <rect x="7.03" y="4.35" width=".65" height=".45" rx=".03"/><ellipse cx="7.355" cy="4.58" rx=".22" ry=".13" fill="none"/>
 <rect x=".3" y="3.35" width="2.4" height=".6" fill="#e3e5ea" stroke="#202322" stroke-width=".06"/><rect x=".45" y="3.47" width=".65" height=".38" rx=".04"/><path d="M.78 3.38v.15h.1M1.3 3.35v.6M1.8 3.35v.6"/>
 <rect x="1.95" y="3.42" width=".6" height=".45" rx=".03"/><circle cx="2.1" cy="3.57" r=".08" fill="none"/><circle cx="2.4" cy="3.57" r=".08" fill="none"/><circle cx="2.1" cy="3.75" r=".06" fill="none"/><circle cx="2.4" cy="3.75" r=".06" fill="none"/>
 <rect x=".4" y="5.55" width="2.2" height=".85" rx=".12"/><path d="M.55 5.7h1.9M1.5 5.7v.6" stroke="#767c88"/><rect x=".95" y="4.75" width="1.1" height=".5" rx=".08"/>
 <rect x="4.15" y="5.55" width="1.05" height=".75" rx=".06"/><rect x="3.8" y="5.72" width=".25" height=".4" rx=".04"/><rect x="5.3" y="5.72" width=".25" height=".4" rx=".04"/><rect x="4.45" y="5.2" width=".4" height=".25" rx=".04"/><rect x="4.45" y="6.4" width=".4" height=".25" rx=".04"/>
 <rect x="6.15" y="5.8" width=".65" height=".65"/><circle cx="6.475" cy="6.125" r=".22" fill="none"/><rect x="7.05" y="5.8" width=".65" height=".65"/><rect x="7.15" y="5.92" width=".45" height=".4" rx=".04"/>
 <path d="M.8 .06h1.8m2.4 0h1.8M.06 4.5v.8M7.94 4.5v.5" fill="none" stroke="#767c88" stroke-width=".12"/>
 <path d="M3.2 6.94h.9" stroke="#fcfcfd" stroke-width=".14"/><path d="M3.2 6.94v-.9a.9 .9 0 0 1 .9 .9" fill="none" stroke="#767c88" stroke-width=".035"/>
 ${label(2,2.85,'Dormitorio 1')}${label(6,2.85,'Dormitorio 2')}${label(1.5,4.4,'Cocina')}${label(1.5,6.8,'Sala')}${label(4.65,6.85,'Comedor')}${label(6.9,5.18,'Baño')}${label(6.9,6.82,'Lavado')}
 </g>`;
}
function renderModuleDetail(){
 const chosen=s.objects.find(o=>o.id===selected),o=chosen?.type==='unit'?chosen:null;
 $('moduleTitle').textContent=o?o.name+' · distribución privada':'Detalle del elemento';
 document.querySelector('.module-panel .panel-title .muted').textContent=chosen?.type==='home'?'Dos dormitorios, baño, cocina, sala-comedor y lavado':'Baño, cocina y jacuzzi privados en cada unidad';
 if(chosen?.type==='home'){
  $('moduleTitle').textContent='Casa padres · distribución interna';
  const w=chosen.w,d=chosen.d,sx=w/8,sy=d/7;
  const h=homeInterior(chosen,true)+dimH(0,w,-.55,null,'#4b505a',.3)+dimV(-.55,0,d,null,'#4b505a',.3)+dimH(0,4*sx,d+.55,'Dormitorios: '+fmt.format(4*sx)+' m c/u','#4b505a',.27)+dimV(w+.55,0,3.1*sy,null,'#4b505a',.27)+dimV(w+.55,3.1*sy,5.5*sy,null,'#4b505a',.27)+dimV(w+.55,5.5*sy,d,null,'#4b505a',.27);
  $('moduleDetail').innerHTML=`<svg class="module-drawing" viewBox="-1.1 -1.1 ${w+2.3} ${d+2.3}" role="img" aria-label="Casa de los padres: dos dormitorios, cocina, sala, comedor, baño y zona de lavado">${h}</svg><p class="footnote">Esquema para la casa de ${fmt.format(w)} × ${fmt.format(d)} m (${fmt.format(w*d)} m² brutos). Dormitorios de ${fmt.format(4*sx)} × ${fmt.format(3.1*sy)} m; baño de ${fmt.format(2.2*sx)} × ${fmt.format(2.4*sy)} m; lavado de ${fmt.format(2.2*sx)} × ${fmt.format(1.5*sy)} m; zona social integrada de ${fmt.format(5.8*sx)} × ${fmt.format(3.9*sy)} m. Medidas de organización brutas; muros, mobiliario y circulación se deben desarrollar al detalle.</p>`;
 }
 else if(!o){$('moduleDetail').innerHTML='<p class="muted">Selecciona un Airbnb en el plano para ver su baño, cocina, terraza y cotas interiores.</p>';}
 else if(o.bw<4||o.bd<4){$('moduleDetail').innerHTML='<p class="reading">Este tamaño necesita otra distribución interior. El esquema de mobiliario mostrado se dibuja para módulos desde 4 × 4 m; no constituye un mínimo normativo.</p>';}
 else{
  const frame=cabinFrame(o),c=frame.c;
  const by=c.side==='north'?c.deck:0,dy=c.side==='north'?0:c.bd,j=s.jacuzzi,jx=Math.max(.15,c.w-j-.3);
  const label=(x,y,t)=>`<text x="${x}" y="${y}" font-size=".3" fill="#202322" text-anchor="middle">${esc(t)}</text>`;
  let h=`<rect x="0" y="0" width="${c.w}" height="${c.d}" fill="#f3f4f7" stroke="#767c88" stroke-width=".045"/><rect x="0" y="${by}" width="${c.bw}" height="${c.bd}" fill="#fcfcfd" stroke="#202322" stroke-width=".06"/>`;
  h+=privateInterior(c,true);
  if(j>0)h+=`<rect x="${jx}" y="${dy+.3}" width="${j}" height="${j}" rx=".25" fill="#e3e5ea" stroke="#767c88" stroke-width=".04"/>`+label(jx+j/2,dy+.3+j/2,'Jacuzzi')+dimH(jx,jx+j,dy+.3+j-.2,null,'#4b505a',.23);
  if(c.deck>0)h+=label(Math.min(1.2,c.w/4),dy+c.deck/2,'Terraza privada');
  h+=dimH(0,c.bw,-.5,null,'#4b505a',.3)+dimV(-.55,by,by+c.bd,null,'#4b505a',.3)+dimV(c.w+.95,0,c.d,'Total '+fmt.format(c.d)+' m','#4b505a',.3);
  if(c.deck>0)h+=dimV(-.55,dy,dy+c.deck,null,'#4b505a',.3);
  h+=dimH(c.bw-1.8,c.bw-.2,by+2.7,'Baño 1,60 m','#4b505a',.25)+dimV(c.bw+.18,by+.2,by+2.4,'2,20 m','#4b505a',.25)+dimH(c.bw-2,c.bw-.2,by+c.bd+.25,'Cocina 1,80 m','#4b505a',.25);
  h=`<g transform="${frame.transform}">${uprightCabinText(h,frame.angle)}</g>`;
  $('moduleDetail').innerHTML=`<svg class="module-drawing" viewBox="-1.3 -1.2 ${o.w+2.7} ${o.d+2}" role="img" aria-label="${esc(c.name)} con baño privado de 1,6 por 2,2 metros, cocina y jacuzzi">${h}</svg>`;
 }
}
function renderMap(){
 const svg=$('siteMap'),W=s.siteW,D=s.siteD,m=2.4;
 svg.setAttribute('viewBox',`${-m} ${-2.8} ${W+m*2} ${D+6.2}`);
 const text=(x,y,t,size=.45,color='#4b505a')=>`<text x="${x}" y="${y}" font-size="${Math.max(.65,size+.25)}" fill="${color}" text-anchor="middle">${t}</text>`;
 let h=`<defs><pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" stroke="#e3e5ea" stroke-width=".025"/></pattern><pattern id="retreat" width=".8" height=".8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2=".8" stroke="#d5d8df" stroke-width=".1"/></pattern></defs>`;
 h+=`<rect x="0" y="0" width="${W}" height="${D}" fill="#fcfcfd" stroke="#767c88" stroke-width=".13"/><rect x="0" y="0" width="${W}" height="${D}" fill="url(#grid)"/>`;
 if(W>2*s.setback&&D>2*s.setback)h+=`<path d="M0 0H${W}V${D}H0Z M${s.setback} ${s.setback}V${D-s.setback}H${W-s.setback}V${s.setback}Z" fill-rule="evenodd" fill="url(#retreat)"/><rect x="${s.setback}" y="${s.setback}" width="${W-2*s.setback}" height="${D-2*s.setback}" fill="none" stroke="#767c88" stroke-width=".06" stroke-dasharray=".3 .2"/>`;
 h+=`<path d="M0 -1.1H${W}M0 -1.5V-.7M${W} -1.5V-.7" stroke="#767c88" stroke-width=".06"/>`+text(W/2,-1.6,fmt.format(W)+' m · Norte / servidumbre (según CTL)',.5);
 h+=`<path d="M-1 0V${D}M-1.4 0H-.6M-1.4 ${D}H-.6" stroke="#767c88" stroke-width=".06"/>`+`<text x="-1.5" y="${D/2}" transform="rotate(-90 -1.5 ${D/2})" text-anchor="middle" font-size=".64" fill="#4b505a">${fmt.format(D)} m</text>`;
 h+=text(W/2,D+1.5,'Sur · lindero con particular',.42)+text(W/2,D+2.5,'Origen del plano: esquina superior izquierda · posición en metros',.38);
 for(const route of E.accessGeometry(s,s.objects)){const a=route.rect;if(route.dist>.01)h+=`<rect x="${a.x}" y="${a.y}" width="${a.w}" height="${a.d}" fill="#f3f4f7" stroke="#d5d8df" stroke-width=".035" stroke-dasharray=".12 .1"/>`;}
 for(const o of [...s.objects].sort((a,b)=>(a.type==='path'?-1:1)-(b.type==='path'?-1:1))){
  const colors={unit:'#d5d8df',home:'#e3e5ea',technical:'#c4c8d0',parking:'#a8aeba',path:'#f3f4f7'};
  h+=`<g class="site-object ${selected===o.id?'selected':''}" data-id="${esc(o.id)}" tabindex="0" role="button" aria-label="${esc(o.name)}. Usa flechas para mover 25 centímetros. Enter para seleccionar." transform="translate(${o.x},${o.y})"><rect width="${o.w}" height="${o.d}" rx=".1" fill="${colors[o.type]}" stroke="${o.type==='path'?'#d5d8df':'#4b505a'}" stroke-width=".08" ${o.type==='path'?'stroke-dasharray=".2 .12"':''}/>`;
  if(o.type==='unit'){
   const frame=cabinFrame(o),c=frame.c,parts=E.unitParts(o);
   h+=`<g class="cabin-orientation" transform="${frame.transform}"><rect x="0" y="${c.deck}" width="${c.bw}" height="${c.bd}" fill="#e3e5ea" stroke="#4b505a" stroke-width=".05"/><rect x=".06" y="0" width="${c.bw-.12}" height="${c.deck}" fill="#f3f4f7"/><rect x="${Math.max(.15,c.bw-s.jacuzzi-.3)}" y=".3" width="${s.jacuzzi}" height="${s.jacuzzi}" rx=".35" fill="#e3e5ea" stroke="#767c88" stroke-width=".1"/>`;
   if($('showProgram').checked)h+=uprightCabinText(privateInterior(c),frame.angle);
   h+='</g>';
   h+=text(parts.body.x-o.x+parts.body.w/2,parts.body.y-o.y+parts.body.d/2+.4,esc(o.name),.52,'#202322');
   const t=frame.point(Math.max(1,c.bw/4),c.deck/2+.2);h+=text(t.x,t.y,'Terraza',.35,'#4b505a');
  }else if(o.type==='parking'){
   const frame=parkingFrame(o),pw=frame.w;h+=`<g class="parking-orientation" transform="${frame.transform}">`;
   for(let i=0;i<Math.floor(pw/s.stallW);i++)h+=`<rect x="${i*s.stallW+.07}" y="${s.aisle}" width="${s.stallW-.14}" height="${s.stallD-.08}" fill="none" stroke="#767c88" stroke-width=".07"/><rect x="${i*s.stallW+.42}" y="${s.aisle+.6}" width="${Math.max(.3,s.stallW-.84)}" height="${s.stallD-1.2}" rx=".45" fill="#fcfcfd"/>`;
   h+=uprightCabinText(text(pw/2,s.aisle/2,'Maniobra '+fmt.format(s.aisle)+' m',.4,'#4b505a'),frame.angle);h+='</g>';
  }else if(o.type==='path'){if(o.w>o.d*2)h+=text(o.w/2,o.d/2+.15,esc(o.name)+' · '+fmt.format(o.d)+' m',.35);}
  else if(o.type==='home'&&$('showProgram').checked){h+=homeInterior(o);}
  else{h+=text(o.w/2,o.d/2-.25,o.type==='home'?'Casa padres':'Equipos',.46,'#202322')+text(o.w/2,o.d/2+.65,fmt.format(o.w*o.d)+' m²',.4,'#202322');}
  h+='</g>';
 }
 if($('showDimensions').checked){
  for(const o of s.objects){
   if(o.type==='path'){
    if(o.w>o.d*2)h+=dimV(o.x+o.w-.6,o.y,o.y+o.d,null,'#4b505a',.6);
    else if(o.d>o.w*2)h+=dimH(o.x,o.x+o.w,o.y+.7,null,'#4b505a',.6);
    continue;
   }
   h+=dimH(o.x,o.x+o.w,o.y-.6);
   if(o.type==='unit'){
    const p=E.unitParts(o),lateral=o.side==='east'||o.side==='west';
    if(lateral){h+=dimV(o.x+o.w+.65,o.y,o.y+o.d)+dimH(p.body.x,p.body.x+p.body.w,o.y+o.d+.6);if(o.deck>0)h+=dimH(p.deck.x,p.deck.x+p.deck.w,o.y+o.d+.6);}
    else{h+=dimV(o.x+o.w+.65,p.body.y,p.body.y+p.body.d);if(o.deck>0)h+=dimV(o.x+o.w+.65,p.deck.y,p.deck.y+p.deck.d);}
   }else h+=dimV(o.x+o.w+.65,o.y,o.y+o.d);
   if(o.type==='parking'){
    const f=parkingFrame(o),dims=dimV(-.65,0,s.aisle,'Maniobra '+fmt.format(s.aisle)+' m')+dimH(0,s.stallW,f.d+.6)+dimV(-.65,s.aisle,s.aisle+s.stallD);
    h+=`<g transform="translate(${o.x},${o.y})"><g transform="${f.transform}">${uprightCabinText(dims,f.angle)}</g></g>`;
   }
  }
  // Cada separación ortogonal se muestra una vez; el seleccionado añade los cuatro lados.
  const seen=new Set();
  for(const b of s.objects.filter(b=>b.type!=='path'&&b.id!==selected)){
   const a=clearances(b);
   for(const side of ['east','south']){
    const q=a[side];if(q.value<=.1)continue;
    const x=side==='east'?b.x+b.w:q.at??(b.x+b.w/2),y=side==='south'?b.y+b.d:q.at??(b.y+b.d/2);
    const key=[side,x.toFixed(2),y.toFixed(2),q.value.toFixed(2)].join('/');if(seen.has(key))continue;seen.add(key);
    h+=side==='east'?dimH(x,x+q.value,y):dimV(x,y,y+q.value);
   }
  }
  const o=s.objects.find(o=>o.id===selected);
  if(o){const a=clearances(o),cx=o.x+o.w/2,cy=o.y+o.d/2;
   if(a.west.value>0.1)h+=dimH(o.x-a.west.value,o.x,a.west.at??cy,null,'#7d1fbf');
   if(a.east.value>0.1)h+=dimH(o.x+o.w,o.x+o.w+a.east.value,a.east.at??cy,null,'#7d1fbf');
   if(a.north.value>0.1)h+=dimV(a.north.at??cx,o.y-a.north.value,o.y,null,'#7d1fbf');
   if(a.south.value>0.1)h+=dimV(a.south.at??cx,o.y+o.d,o.y+o.d+a.south.value,null,'#7d1fbf');
  }
  if(s.setback>0)h+=dimV(W-1,0,s.setback,'Retiro '+fmt.format(s.setback)+' m');
 }
 h+=`<path d="M${W+1.3} 3V.5L${W+.9} 1.3M${W+1.3} .5L${W+1.7} 1.3" stroke="#4b505a" stroke-width=".09" fill="none"/>`+text(W+1.3,4,'N',.6);
 svg.innerHTML=h;
 renderModuleDetail();
 const v=E.validate(s,s.objects);$('areaSummary').innerHTML=`<span>Área techada: <b>${fmt.format(v.built)} m² (${fmt.format(v.built/(W*D)*100)} %)</b></span><span>Huella + exteriores + pasillos: <b>${fmt.format(v.occupied)} m²</b></span><span>Área sin asignar: <b>${fmt.format(v.free)} m²</b></span><span>Parqueos: <b>${v.parking} / ${v.parkingNeed}</b></span>`;
}
function renderValidation(v){
 $('validBadge').innerHTML=`<span class="badge ${v.valid?'good':'bad'}">${v.valid?'Cumple revisión espacial':'Revisar plano'}</span>`;
 const area=v.built/(s.siteW*s.siteD)*100;
 const checks=[
  ['Retiro mínimo',v.minSetback,`${fmt.format(s.setback)} m`,v.minSetback>=s.setback-1e-7,'m'],
  ['Distancia mínima entre paredes de cabañas',v.minWallGap,`${fmt.format(s.wallGap)} m`,v.minWallGap!=null&&v.minWallGap>=s.wallGap-1e-7,'m'],
  ['Ancho del pasillo principal',v.mainPathWidth,`${fmt.format(s.pathWidth)} m`,v.mainPathWidth!=null&&v.mainPathWidth>=s.pathWidth-1e-7,'m'],
  ['Ocupación techada',area,`máx. ${s.maxCoverage} %`,area<=s.maxCoverage+1e-7,'%'],
  ['Parqueaderos',v.parking,`${v.parkingNeed} puestos`,v.parking>=v.parkingNeed,'puestos']
 ];
 $('validation').innerHTML=`<div class="table-wrap"><table><thead><tr><th>Comprobación</th><th>Resultado</th><th>Condición</th></tr></thead><tbody>${checks.map(([label,value,condition,ok,unit])=>`<tr><td>${label}</td><td>${ok?'✓':'✕'} ${value==null?'—':fmt.format(value)+' '+unit}</td><td>${condition}</td></tr>`).join('')}</tbody></table></div><ul class="validation-list">${[...v.errors.map(t=>['error',t]),...v.warnings.map(t=>['warn',t])].map(([cl,t])=>`<li class="${cl}">${esc(t)}</li>`).join('')}</ul>`;
}
let copiedObject=null,copySerial=0;
function rotateMapObject(o){
 if(o.type==='unit')E.rotateUnit(o);
 else if(o.type==='parking'){
  const cx=o.x+o.w/2,cy=o.y+o.d/2;[o.w,o.d]=[o.d,o.w];o.rotation=((o.rotation||0)+90)%360;
  o.x=Math.round((cx-o.w/2)*1e8)/1e8;o.y=Math.round((cy-o.d/2)*1e8)/1e8;
 }else [o.w,o.d]=[o.d,o.w];
 
}
function nextUnitName(){return 'Airbnb '+(Math.max(0,...s.objects.filter(o=>o.type==='unit').map(o=>Number(o.name.match(/^Airbnb (\d+)$/)?.[1]||0)))+1);}
function focusSelectedObject(){const g=[...$('siteMap').querySelectorAll('[data-id]')].find(el=>el.dataset.id===selected);g?.focus({preventScroll:true});}
function duplicateObject(source){
 if(!source)return;
 if(source.type==='home'){toast('La casa de los padres no se duplica ni se elimina; solo se corre de izquierda a derecha.');return;}
 if(source.type==='technical'){toast('Los equipos son fijos, debajo del parqueadero.');return;}
 if(source.type==='parking'){toast('El parqueadero es fijo: 6 puestos con los equipos debajo.');return;}
 const u=E.copy(source);u.id=u.type+'-'+Date.now()+'-'+(++copySerial);u.name=u.type==='unit'?nextUnitName():source.name+' copia';
 u.x=Math.round((source.x+source.w+s.gap)*100)/100;
 s.objects.push(u);selected=u.id;allRender();focusSelectedObject();
 const v=E.validate(s,s.objects);toast(v.valid?'Elemento duplicado. Todo recalculado.':'Elemento duplicado. Revisa los conflictos del plano y ajusta su posición.');
}
function deleteSelectedObject(){
 if(!s.objects.some(o=>o.id===selected))return;
 if(s.objects.find(o=>o.id===selected)?.type==='home'){toast('La casa de los padres no se duplica ni se elimina; solo se corre de izquierda a derecha.');return;}
 if(s.objects.find(o=>o.id===selected)?.type==='technical'){toast('Los equipos son fijos, debajo del parqueadero.');return;}
 if(s.objects.find(o=>o.id===selected)?.type==='parking'){toast('El parqueadero es fijo: 6 puestos con los equipos debajo.');return;}
 s.objects=s.objects.filter(o=>o.id!==selected);selected=null;allRender();toast('Elemento eliminado. Distancias y resultados recalculados.');
}
function handlePlanShortcut(e){
 if(tab!=='plan'||e.defaultPrevented||e.repeat||e.altKey||document.querySelector('dialog[open]'))return;
 const target=e.target;if(target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])'))return;
 const modifier=e.ctrlKey||e.metaKey;
 if(!modifier&&e.key==='Delete'&&selected){e.preventDefault();deleteSelectedObject();}
}
document.addEventListener('keydown',handlePlanShortcut);
function clipboardInPlan(e){return tab==='plan'&&!document.querySelector('dialog[open]')&&!e.target?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');}
document.addEventListener('copy',e=>{
 if(!clipboardInPlan(e)||window.getSelection()?.toString()||!e.clipboardData)return;
 const o=s.objects.find(o=>o.id===selected);if(!o)return;
 copiedObject=E.copy(o);const payload=JSON.stringify({type:'EN2614-element',version:1,object:copiedObject});
 e.clipboardData.setData('application/x-en2614-element',payload);e.clipboardData.setData('text/plain',payload);e.preventDefault();toast(o.name+' copiado. Usa Ctrl+V para duplicarlo.');
});
document.addEventListener('paste',e=>{
 if(!clipboardInPlan(e)||!e.clipboardData)return;
 try{
  const payload=JSON.parse(e.clipboardData.getData('application/x-en2614-element')||e.clipboardData.getData('text/plain'));
  if(payload.type!=='EN2614-element'||payload.version!==1)return;
  const config=normalize({...s,objects:[payload.object]});copiedObject=config.objects[0];e.preventDefault();duplicateObject(copiedObject);
 }catch{/* Texto ajeno al plano: conservar el comportamiento normal del navegador. */}
});
function renderUnits(){const c=lastResult.cost;$('unitTable').innerHTML=s.objects.filter(o=>o.type==='unit').map(o=>{const cost=c.lines.filter(l=>l.objectID===o.id).reduce((a,l)=>a+l.total,0)*c.factor;const p=lastResult.plan.find(x=>x.id===o.id),open=p&&p.open!==null?'Mes '+p.open:'No alcanza';return `<tr><td><span class="unit-thumb">${esc(o.name.replace('Airbnb ',''))}</span>${esc(o.name)}</td><td>${fmt.format(o.bw*o.bd)} m²</td><td>${fmt.format(o.bw*o.deck)} m²</td><td>${o.guests}</td><td class="${open==='No alcanza'?'negative':''}">${open}</td><td>${M(cost)}</td></tr>`;}).join('')||'<tr><td colspan="6">Sin módulos.</td></tr>';}
const metric=(label,value,sub,negative=false)=>`<div class="mini-metric"><span>${label}</span><strong class="${negative?'negative':''}">${value}</strong><small>${sub||''}</small></div>`;
// Mercado Ricaurte (oct-2025 a sep-2026, GuestFavorites): ocupación media de los anuncios activos.
const MARKET_OCC=.26,DAYS_MONTH=365.25/12;
const nights=x=>x==null?'—':fmt.format(Math.round(x))+' noches';
const LIGHT={green:['verde','Bien'],yellow:['amarillo','Ajustado'],red:['rojo','Mal']};
// Veredicto para el cliente: cinco preguntas con reglas explícitas.
function verdictOf(r,cfg=s){
 const st=r.steady,meta=cfg.discount/100,cdt=cfg.cdtRate/100,market=MARKET_OCC*DAYS_MONTH,rent=r.mirr;
 const q=[
  {key:'aporte',q:'¿Cuánta plata extra hay que poner?',value:r.maxGap>0?M(r.maxGap):'$0',note:`Además de los ${M(cfg.equity)} iniciales, para cubrir meses en rojo.`,light:r.maxGap<=1?'green':r.maxGap<=cfg.equity?'yellow':'red',rule:`Verde: nada · Amarillo: hasta ${M(cfg.equity)} · Rojo: más`},
  {key:'caja',q:'¿Cuánto deja al mes ya funcionando?',value:M(st.cash),note:'Lo que queda después de gastos y cuotas del crédito, en un mes promedio.',light:st.cash>=0?'green':'red',rule:'Verde: positivo · Rojo: negativo'},
  {key:'noches',q:'¿Cuántas noches al mes debe vender cada cabaña para no perder?',value:nights(st.beCashNights),note:`El promedio de Ricaurte vende ~${fmt.format(Math.round(market))} noches al mes por anuncio.`,light:st.beCashNights==null?'red':st.beCashNights<=market?'green':st.beCashNights<=12?'yellow':'red',rule:`Verde: ≤ ${fmt.format(Math.round(market))} · Amarillo: ≤ 12 · Rojo: más`},
  {key:'recupera',q:'¿En cuántos años recupero lo que puse?',value:years(r.equityPayback),note:`Pones ${M(r.invested)} (${M(cfg.equity)} iniciales + ${M(r.maxGap)} de plata extra) y vuelven con los retiros anuales de la caja que sobra. La deuda con el banco sigue: se termina de pagar con lo que produce el negocio. No cuenta el valor del lote ni de las cabañas.`,light:r.equityPayback!=null&&r.equityPayback<=120?'green':r.equityPayback!=null&&r.equityPayback<=180?'yellow':'red',rule:'Verde: ≤ 10 años · Amarillo: ≤ 15 · Rojo: más o nunca'},
  {key:'rentab',q:`¿Le gana a la meta del ${fmt.format(cfg.discount)} % anual?`,value:pct(rent),note:`Rentabilidad anual del proyecto. Un CDT paga ~${fmt.format(cfg.cdtRate)} % sin riesgo.`,light:rent!=null&&rent>=meta?'green':rent!=null&&rent>=cdt?'yellow':'red',rule:`Verde: ≥ ${fmt.format(cfg.discount)} % · Amarillo: ≥ ${fmt.format(cfg.cdtRate)} % (CDT) · Rojo: menos`}
 ];
 const red=q.some(x=>['aporte','caja','rentab'].includes(x.key)&&x.light==='red'),allGreen=q.every(x=>x.light==='green');
 return {q,level:red?'red':allGreen?'green':'yellow',label:red?'No conviene así':allGreen?'Buena inversión':'Ajustada: depende de los supuestos'};
}
// Ocupación promedio que haría falta para que la caja mensual no sea negativa (con todo lo demás igual).
function neededOccupancy(cfg,objects){
 const at=f=>E.simulate({...cfg,occupancyFactor:f},objects);
 if(at(400).steady.cash<0)return null;
 let lo=10,hi=400;for(let i=0;i<14;i++){const mid=(lo+hi)/2;if(at(mid).steady.cash>=0)hi=mid;else lo=mid;}
 return at(hi).steady.occupancy;
}
// Tres casos de demanda para toda la pestaña: solo cambia cuánta gente viene; la tarifa es decisión del negocio.
// Tres casos de demanda para toda la pestaña: solo cambia cuánta gente viene; tarifa y costos son decisiones del proyecto.
const SCENARIOS=[['Pesimista',75,'Viene un 25 % menos de gente'],['Normal',100,'Lo esperado'],['Optimista',133,'Viene un 33 % más de gente']];
const light=l=>`<span class="light ${l}" aria-label="${LIGHT[l][0]}"><i></i>${LIGHT[l][1]}</span>`;
// Escenarios analizados con el cliente. Cada uno fija solo estas llaves; el resto de supuestos (mercado, gastos) es el actual.
const SHELL_KEYS=['foundation','steel','envelope','roof','finishes','installations'];
// Cabaña optimizada: obra industrializada ~$1,95 M/m² (prefabricado llave en mano $1,9–2,5 M/m²), jacuzzi empotrado
// básico sin calentador, cocineta y dotación por volumen, diseño de prototipo repetido y contingencia con cotizaciones.
const MARKET={foundation:260000,steel:420000,envelope:350000,roof:240000,finishes:430000,installations:450000,jacuzziCost:14000000,kitchenCost:4500000,furniture:7000000,design:7,contingency:15,adrWeek:280000,adrWeekend:380000,stage1:1,cabinEvery:0,rate:16,landRate:16,years:15,homeByParents:false};
const OPT_COSTS={foundation:236000,steel:381000,envelope:317000,roof:218000,finishes:390000,installations:408000,jacuzziCost:11500000,kitchenCost:3500000,furniture:6000000,design:5,contingency:10};
const PREMIUM={adrWeek:400000,adrWeekend:550000};
const SCENARIO_KEYS=[...SHELL_KEYS,'jacuzziCost','kitchenCost','furniture','design','contingency','adrWeek','adrWeekend','stage1','cabinEvery','rate','landRate','years','homeByParents'];
const ANALYSIS=[
 ['Base de mercado','Tarifa $280k / $380k, cabaña de $105 M, 1 cabaña con la obra base, casa dentro del proyecto, crédito 16 %.',{}],
 ['Solo bajar costos','Cabaña optimizada (~$88 M en vez de $105 M); lo demás igual.',{...OPT_COSTS}],
 ['Solo tarifa premium','$400k domingo–jueves / $550k viernes–sábado (~$450k promedio); lo demás igual.',{...PREMIUM}],
 ['Premium + costos + 3 cabañas iniciales','Las dos anteriores y arrancar con 3 cabañas junto con la obra base.',{...OPT_COSTS,...PREMIUM,stage1:3}],
 ['+ casa por cuenta de los padres','Los padres pagan su casa (y el subsidio va con ella); el proyecto no la financia.',{...OPT_COSTS,...PREMIUM,stage1:3,homeByParents:true}],
 ['+ crédito 12 % a 20 años: propuesta','Hipotecario o leasing en vez de libre inversión al 16 %. Es la propuesta que se analiza en el resto de la pestaña.',{...OPT_COSTS,...PREMIUM,stage1:3,homeByParents:true,rate:12,landRate:12,years:20}]
];
const scenarioConfig=(sc,base=s)=>{const cfg={...base};for(const k of SCENARIO_KEYS)cfg[k]=sc[k]??MARKET[k];return cfg;};
const isActive=sc=>SCENARIO_KEYS.every(k=>{const want=sc[k]??MARKET[k];return typeof want==='number'?Math.abs(want-s[k])<1:want===s[k];});
const demandRun=(cfg,objects,occ)=>E.simulate({...cfg,occupancyFactor:cfg.occupancyFactor*occ/100},objects);
// Paso 1: supuestos de análisis, solo lectura, en los tres casos.
function renderAssumptions(r,runs){
 const same=v=>`<td colspan="3" class="same">${v}</td>`,vary=f=>runs.map(x=>`<td>${f(x)}</td>`).join('');
 const row=(label,cells,note='')=>`<tr><td>${label}${note?`<br><small class="muted">${note}</small>`:''}</td>${cells}</tr>`;
 const group=t=>`<tr class="group"><td colspan="4">${t}</td></tr>`;
 const later=s.cabinEvery>0?`Una cada ${s.cabinEvery} meses`:'Cuando el negocio pueda pagar la cuota de la siguiente';
 const body=[
  group('Construcción por etapas'),
  row('Modelo de cabaña',same(`${fmt.format(s.unitW)} × ${fmt.format(s.unitD)} m para ${s.guests} huéspedes · ${r.units} cabañas en el lote`)),
  row('Costo por cabaña',same(M(r.plan[0]?.cost||0)),'Obra prefabricada, terraza, jacuzzi, cocineta, dotación, diseños y contingencia'),
  row('Inversión total a precios de hoy',same(M(r.cost.total)),s.homeByParents?'Lote, obra base y cabañas; la casa la pagan los padres':'Lote, obra base, casa y cabañas'),
  row('Qué se construye primero',same(`Obra base y ${s.stage1} ${s.stage1===1?'cabaña':'cabañas'} (${s.buildMonths} meses), desde ${s.startYear}`)),
  row('Siguientes cabañas',same(`${later} · ${s.cabinMonths} meses de obra cada una`)),
  row('Cabañas construidas en '+s.horizon+' años',vary(x=>`${x.built} de ${x.units}`)),
  group('Precio y demanda'),
  row('Precio por noche',same(`${COP(s.adrWeek)} domingo a jueves · ${COP(s.adrWeekend)} viernes y sábado`),'Glamping con jacuzzi en la zona: $450.000–$660.000'),
  row('Ocupación promedio',vary(x=>`<strong>${pct(x.steady.occupancy)}</strong>`),`Promedio de Ricaurte: ${pct(MARKET_OCC)} (oct-2025 a sep-2026)`),
  row('Ocupación entre semana / fin de semana',vary(x=>`${fmt.format(Math.round(s.occWeek*x.f))} % / ${fmt.format(Math.round(Math.min(100,s.occWeekend*x.f)))} %`)),
  row('Noches por estadía',same(fmt.format(s.stay))),
  row('Ventas al mes (año normal)',vary(x=>M(x.steady.revenue))),
  group('Lo que se va en cada venta'),
  row('Comisión Airbnb',same(`${fmt.format(s.fee)} %`),'Tarifa única del anfitrión'),
  row('Impuestos sobre ventas',same(`ICA + FONTUR ${fmt.format(s.taxReserve)} % · IVA ${fmt.format(s.vatPct)} % cuando las ventas de 12 meses superan ${M(s.vatThreshold)}`),'IVA por validar con contador'),
  row('Energía, agua e insumos',same(`${COP(s.variableNight)} por noche ocupada`)),
  row('Aseo y lavandería',same(`${COP(s.cleaningStay)} por salida, o persona fija de ${COP(s.staffCost)}/mes si sale más barato`)),
  group('Gastos fijos de cada mes'),
  row('Internet, servicios comunes, jardinería, contador, software',same(`${COP(s.internet+s.commonUtilities+s.gardening+s.accounting+s.fixed)} al mes`),'Estimados por validar con cotizaciones'),
  row('Jacuzzi: químicos y mantenimiento',same(`${COP(s.jacuzziUnit)} por cabaña al mes`)),
  row('Predial, mantenimiento y seguro',same(`Predial ${COP(s.propertyTax)}/año · ${fmt.format(s.maintenance+s.insurance)} % anual del costo de obra`)),
  row('Administración y check-in',same(s.adminPay?COP(s.adminPay)+' al mes':'Los padres, sin sueldo')),
  group('Plata y crédito'),
  row('Lote',same(`${M(s.land)} + ${fmt.format(s.landFees)} % de gastos`)),
  row('Capital propio',same(M(s.equity))),
  row('Crédito',same(`${fmt.format(s.rate)} % anual a ${s.years} años (obra) · ${fmt.format(s.landRate)} % a ${s.landYears} años (lote) · ${s.grace} meses pagando solo intereses`),'El resto de la inversión es crédito'),
  row('Casa de los padres y subsidio',same(s.homeByParents?`La pagan los padres; el subsidio de vivienda rural (${M(s.subsidy)}) va con la casa`:`Dentro del proyecto; subsidio de ${M(s.subsidy)} en el mes ${s.subsidyMonth}`)),
  group('Meta'),
  row('Rentabilidad mínima esperada',same(`${fmt.format(s.discount)} % anual (CDT ${fmt.format(s.cdtRate)} % + riesgo)`)),
  row('Horizonte e inflación',same(`${s.horizon} años · costos +${fmt.format(s.costGrowth)} % y tarifas +${fmt.format(s.priceGrowth)} % al año`))
 ].join('');
 $('assumptionsTable').innerHTML=`<div class="table-wrap"><table class="cost-breakdown assumptions"><thead><tr><th>Supuesto</th>${SCENARIOS.map(([n,,d])=>`<th>${n}<br><small>${d}</small></th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div><p class="muted">Los tres casos usan el mismo proyecto y los mismos precios; solo cambia cuánta gente viene. Las celdas que ocupan las tres columnas son iguales en los tres casos.</p>`;
}
// Paso 2: cómo se llegó a la propuesta, en una tabla que ajusta el texto (sin desplazamiento horizontal).
function renderScenarios(){
 const rows=ANALYSIS.map(([name,desc,sc],i)=>{
  const cfg=scenarioConfig(sc),r=E.simulate(cfg,s.objects),v=verdictOf(r,cfg);
  const pes=E.simulate({...cfg,occupancyFactor:cfg.occupancyFactor*.75},s.objects),pv=verdictOf(pes,cfg);
  const on=isActive(sc);
  return `<tr class="selectable ${on?'active-scenario':''}" data-scenario="${i}" tabindex="0" role="button" aria-pressed="${on}" aria-label="Ver el escenario ${i+1}: ${esc(name)}"><td><span class="pick">${on?'● Viendo':'○ Ver'}</span> <strong>${i+1}. ${esc(name)}</strong><br><small class="muted">${esc(desc)}</small></td><td>${M(r.cost.total)}</td><td>${r.built} de ${r.units}</td><td class="${r.steady.cash<0?'negative':''}">${M(r.steady.cash)}</td><td>${M(r.maxGap)}</td><td>${pct(r.mirr)}</td><td>${years(r.equityPayback)}</td><td>${light(v.level)}</td><td>${light(pv.level)}</td></tr>`;
 });
 $('scenarioTable').innerHTML=`<table class="cost-breakdown scenario-table"><colgroup><col class="c-name"><col span="8"></colgroup><thead><tr><th>Escenario</th><th>Inversión</th><th>Cabañas construidas</th><th>Queda al mes</th><th>Plata extra</th><th>Rentabilidad</th><th>Recupera</th><th>Normal</th><th>Pesimista</th></tr></thead><tbody>${rows.join('')}</tbody></table><p class="muted">Se lee de arriba hacia abajo: cada fila agrega un cambio a la anterior. Todas usan el modelo de cabaña dibujado en el plano y los mismos supuestos de mercado, gastos y crédito. <b>Haz clic en una fila para ver toda la pestaña con ese escenario</b>; la propuesta es la 6.</p>`;
}
// Ver un escenario: carga sus valores y recalcula todo (plano, presupuesto y flujo).
function applyScenario(i){
 const [name,,sc]=ANALYSIS[i];
 for(const k of SCENARIO_KEYS)s[k]=sc[k]??MARKET[k];
 allRender();toast('Viendo el escenario '+(i+1)+': '+name+'.');
}
function renderMoney(){
 const r=lastResult,st=r.steady,v=E.validate(s,s.objects),verdict=verdictOf(r);
 const runs=SCENARIOS.map(([name,occ])=>Object.assign(demandRun(s,s.objects,occ),{name,f:occ/100}));
 // 1. Supuestos · 2. Escenarios · 3. Respuesta.
 renderAssumptions(r,runs);renderScenarios();
 $('verdict').innerHTML=`<div class="verdict ${verdict.level}"><span>Caso normal · ${r.built} de ${r.units} cabañas construidas en ${s.horizon} años</span><strong>${verdict.label}</strong>${!v.valid?'<small>El plano tiene conflictos: resultados solo indicativos.</small>':''}</div>`+
  `<table class="cost-breakdown verdict-table"><colgroup><col class="c-q"><col class="c-v"><col class="c-l"><col></colgroup><thead><tr><th>Pregunta</th><th>Resultado</th><th>Semáforo</th><th>Qué significa · regla del semáforo</th></tr></thead><tbody>${verdict.q.map(x=>`<tr><td><strong>${x.q}</strong></td><td class="value">${x.value}</td><td>${light(x.light)}</td><td>${x.note}<br><small class="muted">${x.rule}</small></td></tr>`).join('')}</tbody></table>`;
 // 4. Inversión · 5. Mes normal.
 renderInvestment(r);renderOpex(r);
 // 6. Pesimista, normal y optimista.
 const need=neededOccupancy(s,s.objects);
 $('whatIf').innerHTML=`<div class="table-wrap"><table class="cost-breakdown"><thead><tr><th>Caso</th><th>Ocupación</th><th>Cabañas</th><th>Queda al mes</th><th>Plata extra</th><th>Rentabilidad</th><th>Resultado</th></tr></thead><tbody>${runs.map(x=>{const vv=verdictOf(x);return `<tr class="${x.f===1?'active-scenario':''}"><td><strong>${x.name}</strong></td><td>${pct(x.steady.occupancy)}</td><td>${x.built} de ${x.units}</td><td class="${x.steady.cash<0?'negative':''}">${M(x.steady.cash)}</td><td>${M(x.maxGap)}</td><td>${pct(x.mirr)}</td><td>${light(vv.level)}</td></tr>`;}).join('')}</tbody></table></div>`+
  `<p>Para no quedar en rojo, cada cabaña necesita una ocupación promedio de <b>${need==null?'más del 100 % (no se logra solo con más gente)':pct(need)}</b>. El promedio de Ricaurte es <b>${pct(MARKET_OCC)}</b>.</p>`;
 // 7. Modelos (automático).
 compareModels();
 // Anexo para el analista.
 renderCashflow(r);
}
// OPEX de un mes típico ya estabilizado (promedio de la ventana de 12 meses que usa el veredicto).
function renderOpex(r){
 const lastOpen=Math.max(s.buildMonths+1,...r.plan.filter(p=>p.open!==null&&p.open<=s.horizon*12).map(p=>p.open)),from=lastOpen+s.rampMonths;
 const window=r.rows.filter(x=>x.m>=from&&x.m<from+12),rows=window.length>=12?window:r.rows.slice(-12);
 const avg=k=>rows.reduce((a,x)=>a+(x[k]||0),0)/rows.length,g=avg('active')>0?1:0;
 const active=avg('active'),year=Math.ceil(rows[0].m/12);
 // Se reparte el fijo real del motor (con inflación) en proporción a cada concepto, para que la tabla sume exacto.
 const raw=[['Internet (Starlink)',s.internet*g],['Energía y agua de zonas comunes',s.commonUtilities*g],['Jardinería',s.gardening*g],['Contador',s.accounting*g],['Software de reservas y publicidad',s.fixed*g],['Químicos y mantenimiento de jacuzzis',s.jacuzziUnit*active],['Administración y check-in (padres)',s.adminPay*g],['Predial',s.propertyTax/12]];
 const rawSum=raw.reduce((a,x)=>a+x[1],0)||1,fixedItems=raw.map(([n,v])=>[n,v*avg('fixed')/rawSum]);
 const staffMonths=rows.filter(x=>x.staff).length;
 const lines=[
  ['A. Lo que entra','',0,'group'],
  ['Ventas de noches',`${fmt.format(Math.round(avg('nightCount')))} noches al mes entre ${fmt.format(Math.round(active))} ${Math.round(active)===1?'cabaña':'cabañas'}`,avg('revenue'),'sub'],
  ['B. Lo que se va en cada venta','',0,'group'],
  ['Comisión Airbnb',`${fmt.format(s.fee)} % de lo vendido`,-avg('fee')],
  ...(avg('vat')>0?[['IVA',`${fmt.format(s.vatPct)} % incluido en la tarifa: lo vendido en 12 meses supera ${M(s.vatThreshold)}`,-avg('vat')]]:[]),
  ['ICA y FONTUR',`${fmt.format(s.taxReserve)} % de lo vendido sin IVA`,-avg('tax')],
  ['Energía, agua e insumos por noche',`${COP(s.variableNight)} por noche ocupada`,-avg('nightCost')],
  ['Aseo y lavandería',staffMonths>rows.length/2?`Persona fija (${COP(s.staffCost)}/mes) + lavandería ${COP(s.laundryStay)} por salida`:`${COP(s.cleaningStay)} por salida (servicio externo)`,-avg('clean')],
  ['C. Gastos fijos, haya o no huéspedes','',0,'group'],
  ...fixedItems.filter(x=>x[1]>0).map(([n,v])=>[n,'Mensual',-v]),
  ['Mantenimiento y seguro de lo construido',`${fmt.format(s.maintenance+s.insurance)} % anual del costo de obra`,-avg('maintenance')],
  ['Reserva para reponer dotación',`${COP(s.replacement)} al año por cabaña`,-avg('replacement')],
  ['Queda de la operación','A − B − C, antes de pagar el crédito',avg('operating'),'total'],
  ['D. Cuotas del crédito','Intereses, capital y seguro de deuda',-avg('debt')],
  ['Queda al mes para la familia','Lo que sobra después de pagar todo',avg('operating')-avg('debt'),'total']
 ];
 $('opexTable').innerHTML=`<div class="table-wrap"><table class="cost-breakdown"><thead><tr><th>Concepto</th><th>Cómo se calcula</th><th>Al mes</th></tr></thead><tbody>${lines.map(([label,calc,value,cls])=>cls==='group'?`<tr class="group"><td colspan="3">${label}</td></tr>`:`<tr${cls?` class="${cls}"`:''}><td>${label}</td><td>${calc}</td><td class="${value<0?'negative':''}">${cls?`<strong>${COP(value)}</strong>`:COP(value)}</td></tr>`).join('')}</tbody></table></div><p class="muted">Promedio de un año normal (año ${year}) con ${fmt.format(Math.round(active))} ${Math.round(active)===1?'cabaña':'cabañas'} en marcha, a precios de ese año. Internet, servicios, jardinería, contador y jacuzzis son estimados para validar con cotizaciones.</p>`;
}
// Curva de inversión en todo el horizonte: cuánto se invierte, con qué plata y cómo baja la deuda.
function renderInvestment(r){
 const rows=r.rows,end=rows.length-1;
 let inv=0,credit=0,own=0,sub=0;const pts=[];
 for(const row of rows){inv+=row.capex;credit+=row.draw;own+=(row.m===0?s.equity:0)+row.extra;sub+=row.grant;pts.push({m:row.m,inv,credit,own,sub,debt:row.balance});}
 const W=860,H=300,pad={l:64,r:200,t:28,b:34},max=Math.max(1,...pts.map(p=>Math.max(p.inv,p.credit,p.own,p.debt)))/1e6;
 const x=m=>pad.l+m/end*(W-pad.l-pad.r),y=v=>H-pad.b-v/max*(H-pad.t-pad.b);
 const series=[['inv','Inversión acumulada','#202322',''],['credit','Crédito recibido','#a738ea',''],['debt','Deuda pendiente','#a738ea','2 4'],['own','Capital propio + plata extra','#767c88','7 4']];
 let h='';
 // Franja de obra: desde el mes 1 hasta que termina la última cabaña construida.
 const builtPlan=r.plan.filter(p=>p.start!==null),obraEnd=Math.max(s.buildMonths,...builtPlan.map(p=>p.start+s.cabinMonths-1));
 h+=`<rect x="${x(1)}" y="${pad.t}" width="${Math.max(2,x(obraEnd)-x(1))}" height="${H-pad.t-pad.b}" fill="#f5ecfd"/><text x="${x(1)+4}" y="${pad.t-8}" font-size="12" fill="#4b505a">Obra: meses 1–${obraEnd}</text>`;
 for(let i=0;i<=4;i++){const val=max*i/4;h+=`<line x1="${pad.l}" y1="${y(val)}" x2="${W-pad.r}" y2="${y(val)}" stroke="#e3e5ea"/><text x="${pad.l-8}" y="${y(val)+4}" text-anchor="end" fill="#767c88" font-size="12">${fmt.format(Math.round(val))} M</text>`;}
 const stepYears=s.horizon>12?2:1;
 for(let yr=0;yr<=s.horizon;yr+=stepYears)h+=`<text x="${x(yr*12)}" y="${H-10}" text-anchor="middle" font-size="12" fill="#767c88">${yr?'Año '+yr:'Compra'}</text>`;
 const last=pts.at(-1),labels=series.map(([key,label])=>({key,label,y:y(last[key]/1e6)+4})).sort((a,b)=>a.y-b.y);
 for(let i=1;i<labels.length;i++)labels[i].y=Math.max(labels[i].y,labels[i-1].y+16); // etiquetas sin chocar
 for(const [key,,color,dash]of series)h+=`<path d="${pts.map((p,i)=>(i?'L':'M')+x(p.m).toFixed(1)+','+y(p[key]/1e6).toFixed(1)).join(' ')}" stroke="${color}" stroke-width="2" fill="none" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
 for(const l of labels)h+=`<text x="${W-pad.r+8}" y="${l.y}" font-size="12" fill="#202322">${l.label}: ${M(last[l.key])}</text>`;
 // Capa de lectura: cada mes muestra sus valores al pasar el cursor.
 const step=(W-pad.l-pad.r)/Math.max(1,end);
 for(const p of pts)h+=`<rect x="${x(p.m)-step/2}" y="${pad.t}" width="${step}" height="${H-pad.t-pad.b}" fill="transparent"><title>Mes ${p.m} (año ${Math.ceil(p.m/12)}): invertido ${M(p.inv)} · crédito recibido ${M(p.credit)} · deuda pendiente ${M(p.debt)} · capital propio + extra ${M(p.own)}${p.sub?' · subsidio '+M(p.sub):''}</title></rect>`;
 $('investmentChart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Curva de inversión acumulada, crédito, deuda pendiente y capital propio en ${s.horizon} años">${h}</svg>`;
 const pending=r.plan.filter(p=>p.start===null),initial=r.plan.filter(p=>p.start===1),later=builtPlan.filter(p=>p.start>1);
 $('investmentSteps').innerHTML=`<ol class="steps"><li><b>Mes 0 · compra del lote</b> (${M(r.cost.land+r.cost.landFees)}): ${M(s.equity)} propios y el resto con crédito.</li><li><b>Meses 1–${s.buildMonths} · obra base</b>: ${s.homeByParents?'parqueadero, pasillos, redes y equipos (la casa la pagan los padres)':'casa de los padres, parqueadero, pasillos, redes y equipos'} (${M(r.base.paid)})${initial.length?` y ${initial.length===1?'la primera cabaña':'las primeras '+initial.length+' cabañas'} (${M(initial.reduce((a,p)=>a+p.paid,0))})`:''}. Abren en el mes ${s.buildMonths+1}.${r.subsidy>0?` El subsidio (${M(r.subsidy)}) abona al crédito en el mes ${s.subsidyMonth}.`:''}</li>${later.map(p=>`<li><b>${esc(p.name)}</b>: obra en los meses ${p.start}–${p.start+s.cabinMonths-1} y abre en el mes ${p.open} (${M(p.paid)}).</li>`).join('')}${pending.length?`<li class="negative"><b>${pending.map(p=>esc(p.name)).join(', ')}:</b> no alcanzan a construirse en ${s.horizon} años.</li>`:''}<li><b>Año ${s.horizon}</b>: la deuda pendiente baja a ${M(last.debt)}.</li></ol><p class="muted">${s.cabinEvery>0?`Ritmo fijo: una cabaña cada ${s.cabinEvery} meses.`:'Ritmo «según caja»: la siguiente cabaña arranca cuando lo que deja el negocio en 3 meses, después de cuotas, alcanza para pagar la cuota de esa cabaña.'} Pasa el cursor sobre la gráfica para ver cada mes.</p>`;
}
// Paso 6: comparación de modelos, siempre visible. Los planos se calculan una vez y se guardan; luego solo se simula.
const modelLayouts=new Map(),MODELS=[['5 × 5 · parejas',5,5,2],['7 × 5 · parejas',7,5,2],['7 × 5 · 4 huéspedes',7,5,4]];
let compareTimer;
function compareModels(){
 const pending=MODELS.some(([,w,d])=>!modelLayouts.has(w+'x'+d));
 if(pending)$('compareStatus').textContent='Calculando la distribución máxima de cada modelo (unos segundos)…';
 clearTimeout(compareTimer);
 compareTimer=setTimeout(()=>{
  const out=MODELS.map(([name,w,d,g])=>{
   const cfg={...s,unitW:w,unitD:d,guests:g};const key=w+'x'+d;
   if(!modelLayouts.has(key))modelLayouts.set(key,E.layout(cfg,MAX_UNITS,'double'));
   const objects=E.copy(modelLayouts.get(key)).map(o=>o.type==='unit'?{...o,guests:E.fitGuests(o.bw,o.bd,g)}:o);E.syncParking(cfg,objects);
   return {name,w,d,g,runs:SCENARIOS.map(([sc,occ])=>{const x=demandRun(cfg,objects,occ);return {sc,x,v:verdictOf(x,cfg)};})};
  });
  const best=out.reduce((a,b)=>(b.runs[1].x.mirr??-1)>(a.runs[1].x.mirr??-1)?b:a);
  const cell=o=>`<td>${light(o.v.level)}<br><span class="${o.x.steady.cash<0?'negative':''}">${M(o.x.steady.cash)}/mes</span><br><small class="muted">rentabilidad ${pct(o.x.mirr)} · ${o.x.built} de ${o.x.units} cabañas</small></td>`;
  $('compareTable').innerHTML=`<div class="table-wrap"><table class="cost-breakdown scenarios"><thead><tr><th>Modelo</th><th>Cabañas que caben</th><th>Costo por cabaña</th>${SCENARIOS.map(([n,,d])=>`<th>${n}<br><small>${d}</small></th>`).join('')}</tr></thead><tbody>${out.map(m=>`<tr class="${m===best?'active-scenario':''}"><td><strong>${m.name}</strong>${m===best?'<br><small>Mejor opción en el caso normal</small>':''}</td><td>${m.runs[1].x.units}</td><td>${M(m.runs[1].x.plan[0]?.cost||0)}</td>${m.runs.map(cell).join('')}</tr>`).join('')}</tbody></table></div>`;
  $('compareStatus').textContent='Mismos supuestos del panel izquierdo; solo cambia el tamaño de la cabaña y para cuántos huéspedes se arrienda. Cada modelo usa su distribución máxima.';
 },pending?60:0);
}
// Paso 8: flujo de caja anual. Por año: lo que queda después de gastos y cuotas, la plata extra y los retiros.
function annualRows(r){
 const out=[];for(const row of r.rows){const y=row.m===0?0:Math.ceil(row.m/12);if(!out[y])out[y]={year:y,revenue:0,operating:0,capex:0,draw:0,debt:0,extra:0,distribution:0,balance:0};const a=out[y];for(const k of ['revenue','operating','capex','draw','debt','extra','distribution'])a[k]+=row[k];a.balance=row.balance;}
 for(const a of out)a.net=a.operating-a.debt;return out;
}
function renderCashflow(r){
 const annual=annualRows(r),lev=r.equityIrr!=null&&r.mirr!=null&&r.equityIrr>r.mirr;
 $('cashIndicators').innerHTML=
  metric('Lo que pone la familia',M(r.invested),`${M(s.equity)} iniciales + ${M(r.maxGap)} de plata extra en los meses en rojo`)+
  metric('Rentabilidad de la plata de la familia',r.equityIrr==null?'—':pct(r.equityIrr),lev?`Mayor que la del proyecto (${pct(r.mirr)}) porque el crédito al ${fmt.format(s.rate)} % cuesta menos de lo que rinde el negocio`:'TIR del propietario: lo que rinde al año lo que pone la familia')+
  metric(`Valor presente neto al ${fmt.format(s.discount)} %`,M(r.npv),r.npv>=0?'Positivo: el proyecto completo rinde más que la meta':'Negativo: el proyecto completo rinde algo menos que la meta (la familia sí la supera gracias al crédito)',r.npv<0)+
  metric(`Intereses pagados al banco en ${s.horizon} años`,M(r.totalInterest),'Se pagan con lo que produce el negocio, no con capital propio');
 // Gráfica de barras: lo que queda cada año después de gastos y cuotas.
 const W=860,H=280,pad={l:64,r:16,t:16,b:34},vals=annual.map(a=>a.net/1e6);
 let min=Math.min(0,...vals),max=Math.max(0,...vals);if(max-min<1)max=min+1;
 const n=annual.length,bw=(W-pad.l-pad.r)/n,y=v=>H-pad.b-(v-min)/(max-min)*(H-pad.t-pad.b);
 let h='';for(let i=0;i<=4;i++){const v=min+(max-min)*i/4;h+=`<line x1="${pad.l}" y1="${y(v)}" x2="${W-pad.r}" y2="${y(v)}" stroke="#e3e5ea"/><text x="${pad.l-8}" y="${y(v)+4}" text-anchor="end" fill="#767c88" font-size="12">${fmt.format(Math.round(v))} M</text>`;}
 annual.forEach((a,i)=>{const v=a.net/1e6,x0=pad.l+i*bw+bw*.18,top=Math.min(y(v),y(0)),hgt=Math.max(1,Math.abs(y(v)-y(0)));
  h+=`<rect x="${x0}" y="${top}" width="${bw*.64}" height="${hgt}" rx="3" fill="${v<0?'#a52a2a':'#202322'}"><title>Año ${a.year}: queda ${M(a.net)} después de gastos y cuotas · plata extra ${M(a.extra)} · retiros ${M(a.distribution)} · deuda al cierre ${M(a.balance)}</title></rect>`;
  if(a.year%2===0||n<=12)h+=`<text x="${x0+bw*.32}" y="${H-10}" text-anchor="middle" font-size="12" fill="#767c88">${a.year?'Año '+a.year:'Compra'}</text>`;});
 h+=`<line x1="${pad.l}" y1="${y(0)}" x2="${W-pad.r}" y2="${y(0)}" stroke="#4b505a"/>`;
 $('cashChart').innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Flujo de caja anual: lo que queda cada año después de gastos y cuotas">${h}</svg>`;
 const cols=[['revenue','Ventas'],['operating','Queda de la operación'],['debt','Cuotas del crédito'],['net','Queda después de cuotas'],['capex','Inversión (lote y obra)'],['draw','Crédito recibido'],['extra','Plata extra puesta'],['distribution','Retiros para la familia'],['balance','Deuda pendiente al cierre']];
 $('annualTable').innerHTML=`<table class="cost-breakdown cash-table"><thead><tr><th>Año</th>${cols.map(c=>`<th>${c[1]}</th>`).join('')}</tr></thead><tbody>${annual.map(a=>`<tr><td>${a.year||'0 (compra)'}</td>${cols.map(([k])=>`<td class="${a[k]<-.5?'negative':''}">${fmt.format(Math.round(a[k]/1e5)/10)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function renderCost(){
 const r=lastResult,c=r.cost,units=s.objects.filter(o=>o.type==='unit');
 // Filas: [concepto, cálculo, valor, clase]; clase 'group' = encabezado de capítulo, 'sub' = subtotal, 'total' = total.
 const table=rows=>`<div class="table-wrap"><table class="cost-breakdown"><thead><tr><th>Concepto</th><th>Cálculo</th><th>Estimado</th></tr></thead><tbody>${rows.map(([label,calculation,value,cls])=>cls==='group'?`<tr class="group"><td colspan="3">${label}</td></tr>`:`<tr${cls?` class="${cls}"`:''}><td>${label}</td><td>${calculation}</td><td>${cls?`<strong>${COP(value)}</strong>`:COP(value)}</td></tr>`).join('')}</tbody></table></div>`;
 const m2=(qty,price)=>`${fmt.format(qty)} m² × ${COP(price)}/m²`,sum=list=>list.reduce((a,l)=>a+l.total,0);
 const names={'Redes interiores y baño':'Redes interiores y baño privado','Dotación':'Mobiliario y menaje','Cocineta':'Cocineta privada','Climatización':'Climatización (aire acondicionado)','Dotación por huésped adicional a dos':'Dotación para 2 huéspedes adicionales'};
 const shell=['Cimentación','Estructura metálica','Cerramientos y ventanas','Cubierta y aislamiento','Acabados','Redes interiores y baño'];
 const models=new Map();
 for(const u of units){const key=[u.bw,u.bd,u.deck,u.guests].join(',');if(!models.has(key))models.set(key,{unit:u,count:0});models.get(key).count++;}
 const indirect=`diseños ${fmt.format(s.design)} % + contingencia ${fmt.format(s.contingency)} %`;
 $('moduleCostEstimate').innerHTML=[...models.values()].map(({unit:u,count})=>{
  const area=u.bw*u.bd,lines=c.lines.filter(l=>l.objectID===u.id&&l.total>0);
  const line=l=>[names[l.item]||l.item,l.item==='Terraza'||shell.includes(l.item)?m2(l.qty,l.unitCost):l.qty===1?'1 und × '+COP(l.unitCost):fmt.format(l.qty)+' × '+COP(l.unitCost),l.total];
  const body=lines.filter(l=>shell.includes(l.item)),deck=lines.filter(l=>l.item==='Terraza'),equip=lines.filter(l=>!shell.includes(l.item)&&l.item!=='Terraza');
  const total=sum(lines);
  return `<h3>${fmt.format(u.bw)} × ${fmt.format(u.bd)} m · ${u.guests} huéspedes · ${count} ${count===1?'unidad':'unidades'}</h3>`+table([
   [`1. Módulo cerrado · ${fmt.format(area)} m² interiores brutos`,'',0,'group'],...body.map(line),
   ['Subtotal módulo',m2(area,c.rate),sum(body),'sub'],
   [`2. Terraza descubierta · ${fmt.format(u.bw)} × ${fmt.format(u.deck)} m`,'',0,'group'],...deck.map(line),
   ['3. Equipamiento y dotación','',0,'group'],...equip.map(line),
   ['Subtotal equipamiento','',sum(equip),'sub'],
   ['Costo directo por Airbnb','1 + 2 + 3',total,'total'],
   ['Con diseños y contingencia',indirect,total*c.factor,'sub'],
   [`Total ${count} ${count===1?'Airbnb':'Airbnbs'} de este modelo`,`${count} × ${COP(total*c.factor)}`,count*total*c.factor,'total']
  ]);
 }).join('')+(models.size?'<p class="muted">Precios por m² sobre área bruta, sin descontar muros. Incluyen material, mano de obra y transporte supuestos; no son cotización.</p>':'')||'<p class="muted">Distribuye los módulos para ver su estimado.</p>';
 // Reparto típico de una vivienda rural de un piso; solo orienta en qué se va el valor por m².
 const homeShare=[['Preliminares, localización y descapote',3],['Cimentación y placa de contrapiso',12],['Estructura y mampostería',22],['Cubierta, canales y bajantes',12],['Redes hidrosanitarias, eléctricas y de gas',12],['Pisos, enchapes y pañetes',10],['Puertas, ventanas y cerrajería',10],['Aparatos de baño y cocina',9],['Pintura y acabados finales',6],['Obras exteriores y aseo de obra',4]];
 const homes=s.objects.filter(o=>o.type==='home');
 $('homeCostEstimate').innerHTML=homes.map(home=>{const area=home.w*home.d,total=area*s.homeM2;return table([
  [`Casa ${fmt.format(home.w)} × ${fmt.format(home.d)} m · ${fmt.format(area)} m²`,'',0,'group'],
  ...homeShare.map(([label,p])=>[label,`${p} % del valor por m² · ${COP(s.homeM2*p/100)}/m²`,total*p/100]),
  ['Costo directo de la casa',m2(area,s.homeM2),total,'total'],
  ['Con diseños y contingencia',indirect,total*c.factor,'sub']
 ]);}).join('')+(s.homeByParents?'<p class="muted"><b>Escenario activo: la casa la pagan los padres.</b> Se muestra como referencia; no suma en la inversión del proyecto ni recibe el subsidio dentro del flujo.</p>':'')+'<p class="muted">El reparto por capítulos es una proporción típica de referencia, no un presupuesto por cantidades. Cambia según diseño, terreno y acabados elegidos.</p>';
 const common=c.lines.filter(l=>['Urbanismo','Servicios'].includes(l.group)&&l.total>0);
 const commonDirect=sum(common);
 $('commonCostEstimate').innerHTML=table([
  ...common.map(l=>[l.item,l.qty===1?'Global':m2(l.qty,l.unitCost),l.total]),
  ['Costo directo de obras comunes','',commonDirect,'total'],
  ['Con diseños y contingencia',indirect,commonDirect*c.factor,'sub']
 ])+'<p class="muted">El saneamiento depende del estudio de suelos y de la capacidad real; las acometidas, de la disponibilidad del operador de red.</p>';
 const unitDirect=sum(c.lines.filter(l=>l.objectID)),homeDirect=sum(c.lines.filter(l=>l.group==='Casa de los padres'));
 const low=c.construction*(1-s.lowRange/100),high=c.construction*(1+s.highRange/100);
 $('summaryCostEstimate').innerHTML=table([
  ['Obra','',0,'group'],
  [`Airbnbs (${units.length})`,'Módulo + terraza + equipamiento',unitDirect],
  ['Casa de tus padres',s.homeByParents?'Por cuenta de los padres: no entra en la inversión':'Construcción completa',homeDirect],
  ['Obras comunes','Parqueo, pasillos, saneamiento, redes y jardines',commonDirect],
  ['Costo directo de obra','',c.direct,'sub'],
  ['Diseños, estudios y permisos',`${fmt.format(s.design)} % del costo directo`,c.design],
  ['Contingencia',`${fmt.format(s.contingency)} % de obra + diseños`,c.contingency],
  ['Total construcción','',c.construction,'total'],
  ['Lote','',0,'group'],
  ['Precio del lote','',c.land],
  ['Gastos de compra',`${fmt.format(s.landFees)} % del precio`,c.landFees],
  ['Inversión total a precios de hoy','Construcción + lote + gastos',c.total,'total'],
  ['Conciliación con el flujo de caja','',0,'group'],
  ['Inflación de obra',`${fmt.format(s.costGrowth)} % anual hasta el mes en que se construye cada parte`,r.capexInflation],
  ...(r.unbuilt>0?[['Cabañas que no alcanzan a construirse',`En ${s.horizon} años, con el ritmo de etapas elegido`,-r.unbuilt]]:[]),
  ['Inversión que paga el flujo de caja','Lo que muestra la pestaña de flujo',c.total+r.capexInflation-r.unbuilt,'total']
 ])+`<p class="muted">Rango razonable de la construcción en esta etapa conceptual: <strong>${COP(low)}</strong> a <strong>${COP(high)}</strong> (−${fmt.format(s.lowRange)} % / +${fmt.format(s.highRange)} %). No incluye intereses del crédito, seguros financieros ni capital de trabajo de la operación, que se ven en la pestaña de flujo.</p>`;
}
function setTab(t){tab=t;for(const p of document.querySelectorAll('.tab-panel'))p.classList.toggle('active',p.id===t);for(const b of document.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===t);if(t==='money')renderMoney();if(t==='cost')renderCost();}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));
function updateInput(e,soft=false){
 if(e.target.value==='')return;
 const key=e.target.dataset.field;if(isSiteDimension(key)){e.target.value=s[key]=E.defaults[key];return;}if(key){const f=metadata[key],n=isTariff(key)?parsePesos(e.target.value):isPercentField(key)?parsePercent(e.target.value):Number(e.target.value);if(!Number.isFinite(n)){if(!soft)e.target.value=fieldValue(key,s[key]);return;}s[key]=Math.min(f[3],Math.max(f[2],f[4]===1?Math.round(n):n));
  if(['unitW','unitD','deck','guests'].includes(key))for(const u of s.objects.filter(o=>o.type==='unit')){u.bw=s.unitW;u.bd=s.unitD;u.deck=s.deck;u.guests=E.fitGuests(u.bw,u.bd,s.guests);E.orientUnit(u);}
  const home=s.objects.find(o=>o.type==='home');if(home&&['homeW','homeD'].includes(key)){home.w=s.homeW;home.d=s.homeD;}
  const parking=s.objects.find(o=>o.type==='parking');if(parking&&['parkingCount','stallW','stallD','aisle'].includes(key)){parking.w=parking.rotation%180===90?s.stallD+s.aisle:s.parkingCount*s.stallW;parking.d=parking.rotation%180===90?s.parkingCount*s.stallW:s.stallD+s.aisle;}
  if(key==='stage1')s.objects.filter(o=>o.type==='unit').forEach((u,i)=>u.stage=i<s.stage1?1:2);
  if(!soft)refreshInputs();allRender(soft);return;
 }
 const attr=e.target.dataset.object;if(attr){const o=s.objects.find(o=>o.id===selected);if(!o)return;const n=Number(e.target.value);if(!Number.isFinite(n))return;o[attr]=Math.round(n*100)/100;if(['w','d','bw','bd'].includes(attr))o[attr]=Math.max(.5,o[attr]);if(attr==='deck')o.deck=Math.max(0,o.deck);if(attr==='guests')o.guests=Math.max(1,Math.round(o.guests));if(o.type==='unit'){E.orientUnit(o);}allRender(soft);}
}
let inputTimer;document.addEventListener('input',e=>{if(!e.target.dataset.field&&!e.target.dataset.object)return;clearTimeout(inputTimer);inputTimer=setTimeout(()=>updateInput(e,true),120);});document.addEventListener('change',e=>{if(!e.target.dataset.field&&!e.target.dataset.object)return;clearTimeout(inputTimer);updateInput(e);});
$('showProgram').onchange=renderMap;
$('showDimensions').onchange=renderMap;
$('mapZoom').onchange=e=>{$('siteMap').style.width=(100*Number(e.target.value))+'%';};
$('expandPlan').onclick=()=>{const panel=document.querySelector('.map-panel'),expanded=panel.classList.toggle('expanded');$('expandPlan').textContent=expanded?'Cerrar ampliación':'Ampliar plano';$('expandPlan').setAttribute('aria-expanded',String(expanded));document.body.classList.toggle('plan-expanded',expanded);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('.map-panel.expanded'))$('expandPlan').click();});
function regenerate(){
 clearTimeout(inputTimer);
 $('layoutStatus').textContent='Buscando la distribución máxima…';
 // La búsqueda tarda alrededor de un segundo: se deja pintar el aviso antes de calcular.
 setTimeout(()=>{
  s.objects=E.layout(s,MAX_UNITS,'double');
  const n=s.objects.filter(o=>o.type==='unit').length;s.targetUnits=n;s.parkingCount=n+1;
  selected=s.objects.find(o=>o.type==='unit')?.id||'home';
  refreshInputs();allRender();
  const check=E.validate(s,s.objects),model=fmt.format(s.unitW)+' × '+fmt.format(s.unitD)+' m';
  $('layoutStatus').textContent=`${n} cabañas de ${model} · ${n+1} puestos de parqueo. Es el máximo que cabe con la casa fija y las separaciones actuales.`+(check.valid?'':' Revisa los conflictos espaciales.');
  toast(`Distribución máxima: ${n} cabañas de ${model}.`);
 },30);
}
$('generate').onclick=regenerate;document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{[s.unitW,s.unitD]=b.dataset.preset.split(',').map(Number);s.guests=E.maxGuests(s.unitW,s.unitD);s.deck=E.defaults.deck;s.jacuzzi=E.defaults.jacuzzi;regenerate();});
let drag=null;
function pointer(e){const pt=$('siteMap').createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;return pt.matrixTransform($('siteMap').getScreenCTM().inverse());}
$('siteMap').addEventListener('contextmenu',e=>{
 const g=e.target.closest('[data-id]'),o=g&&s.objects.find(o=>o.id===g.dataset.id);
 if(!o||o.type!=='unit')return;
 e.preventDefault();drag=null;selected=o.id;rotateMapObject(o);allRender();focusSelectedObject();
 toast('↻ '+o.name+' girado 90°.');
});
$('siteMap').addEventListener('pointerdown',e=>{if(e.button!==0)return;const g=e.target.closest('[data-id]');if(!g)return;const o=s.objects.find(o=>o.id===g.dataset.id);if(!o)return;selected=o.id;const p=pointer(e);drag={id:o.id,dx:p.x-o.x,dy:p.y-o.y,startX:e.clientX,startY:e.clientY,x:o.x,y:o.y,moving:false};$('siteMap').setPointerCapture(e.pointerId);renderMap();});
$('siteMap').addEventListener('pointermove',e=>{if(!drag)return;if(['parking','technical'].includes(s.objects.find(o=>o.id===drag.id)?.type))return;if(!drag.moving){if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<6)return;drag.moving=true;}const o=s.objects.find(o=>o.id===drag.id),p=pointer(e);o.x=Math.round((p.x-drag.dx)*4)/4;if(o.type!=='home')o.y=Math.round((p.y-drag.dy)*4)/4;renderMap();renderValidation(E.validate(s,s.objects));});
function endDrag(e){
 if(!drag)return;
 const o=s.objects.find(o=>o.id===drag.id),click=e?.type==='pointerup'&&!drag.moving&&o?.type==='unit';
 if(e?.type==='pointercancel'&&o){o.x=drag.x;o.y=drag.y;}
 if(click)rotateMapObject(o);
 drag=null;allRender();
 if(click){focusSelectedObject();toast('↻ '+o.name+' girado 90°.'+(o.type==='unit'?' Arrastra para moverlo.':''));}
} $('siteMap').addEventListener('pointerup',endDrag);$('siteMap').addEventListener('pointercancel',endDrag);
$('siteMap').addEventListener('keydown',e=>{const g=e.target.closest('[data-id]');if(!g)return;const o=s.objects.find(o=>o.id===g.dataset.id);selected=o.id;if(e.key==='Enter'){renderMap();return;}const moves={ArrowLeft:[-.25,0],ArrowRight:[.25,0],ArrowUp:[0,-.25],ArrowDown:[0,.25]};if(moves[e.key]){e.preventDefault();if(o.type==='parking'||o.type==='technical'||(o.type==='home'&&moves[e.key][1]))return;o.x+=moves[e.key][0];o.y+=moves[e.key][1];allRender();const match=[...$('siteMap').querySelectorAll('[data-id]')].find(x=>x.dataset.id===o.id);match?.focus();}});
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('downloadPlan').onclick=()=>{const clone=$('siteMap').cloneNode(true);clone.setAttribute('xmlns','http://www.w3.org/2000/svg');clone.setAttribute('width','1800');clone.setAttribute('font-family','Arial, sans-serif');clone.removeAttribute('style');download('EN2614-implantacion.svg',clone.outerHTML,'image/svg+xml');};
document.addEventListener('click',e=>{const row=e.target.closest('[data-scenario]');if(row)applyScenario(Number(row.dataset.scenario));});
document.addEventListener('keydown',e=>{const row=e.target.closest?.('[data-scenario]');if(row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();applyScenario(Number(row.dataset.scenario));}});
allRender();setTab('plan');
window.simulator={getState:()=>E.copy(s),getResult:()=>lastResult,getValidation:()=>E.validate(s,s.objects)};
})();
