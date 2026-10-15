# EN-2614 · Simulador de implantación e inversión

Abre **index.html** en un navegador. Es un archivo autónomo: funciona sin conexión y no requiere instalaciones ni servidor. No se ha publicado en internet.

## Uso

1. **Implantación:** elige el modelo de cabaña (5×5, 6×5, 6×6, 7×5) y se dibuja la cantidad máxima que cabe: 5×5 → 6 cabañas; 6×5, 6×6 y 7×5 → 5. «Redistribuir al máximo» vuelve a calcularlo después de mover cosas a mano. Las cabañas se pueden mover, girar, duplicar o eliminar; la casa solo se corre de oeste a este; parqueadero y equipos son fijos.
2. **Comprobación:** revisa conflictos antes de interpretar el resultado como alternativa físicamente factible. El módulo incluye área interior bruta y terraza; el jacuzzi se reserva dentro de la terraza. El mobiliario es indicativo, no un plano arquitectónico resuelto.
3. **Flujo y equilibrio:** responde «¿es buena inversión?» con cinco preguntas y semáforo (plata extra a poner, caja mensual, noches para no perder, años para recuperar, rentabilidad frente a la meta), la ocupación que haría falta, tres escenarios, la curva de inversión por etapas, los gastos de un mes típico y la comparación 5×5 contra 7×5 (para 2 o 4 huéspedes). VPN, TIR y la tabla anual quedan en «Para el analista».
4. **Presupuesto:** precios por rubro de cada cabaña, la casa de los padres (por capítulos) y las obras comunes, con resumen de inversión y conciliación con el flujo. Los precios deben incluir mano de obra, materiales, transporte e impuestos que correspondan. No son cotizaciones.
5. Los cambios del plano y los parámetros se guardan automáticamente en este navegador.
6. **Descargas:** plano SVG. Es un esquema conceptual; no es DWG ni plano de licencia.

## Convenciones financieras (Ricaurte, octubre de 2026)

**Los supuestos por defecto son los del escenario recomendado (6):** cabaña optimizada (~$88 M), tarifa $400.000 / $550.000, 3 cabañas con la obra base, casa por cuenta de los padres y crédito al 12 % a 20 años. La base de mercado y los demás escenarios se conservan en «Análisis de escenarios» y se cargan con «Aplicar». Donde abajo se mencionan valores de mercado (tarifa $280k/$380k, crédito 16 %, 1 cabaña inicial), corresponden al escenario 1.

- **Capital y crédito:** $50 M propios para la compra del lote (+3 % de gastos); el resto es crédito (libre inversión con garantía hipotecaria, 16 % EA base). Persona natural. Resultados antes del impuesto de renta.
- **Subsidio de vivienda rural:** $122.563.350 (70 SMMLV 2026), limitado al costo de la casa de los padres. Se abona al crédito de obra en el mes en que se recibe. Es un escenario condicionado a la aprobación; la transición futura de uso rural a turístico se supone viable y debe confirmarse.
- **Etapas:** mes 0 lote; meses 1–6 obra base (casa, parqueadero, pasillos, redes, equipos) y la primera cabaña. Después, una cabaña a la vez (4 meses de obra cada una). Ritmo base «según caja»: la siguiente arranca cuando lo que dejó el negocio en los últimos 3 meses, después de cuotas, alcanza para la cuota del crédito de esa cabaña. También se puede fijar «una cada N meses».
- **Demanda:** mercado de Ricaurte con ~26 % de ocupación media y ~1.100 anuncios (oct-2025 a sep-2026). Base: 20 % entre semana y 55 % fines de semana (~30 %), tarifa $280.000 / $380.000. Las cabañas de 4 huéspedes cobran +25 % con 85 % de la demanda de parejas.
- **Gastos por venta:** comisión Airbnb 15,5 % (tarifa única del anfitrión), ICA 1 % (Acuerdo 019 de 2012 de Ricaurte, verificar vigencia) + FONTUR 0,25 %, IVA 19 % incluido en la tarifa cuando lo vendido en 12 meses supera 3.500 UVT ($183,3 M con UVT 2026 de $52.374; verificar con contador), $35.000 de insumos por noche.
- **Aseo:** cada mes se usa lo más barato entre pago por salida ($60.000 con lavandería) y una persona fija ($2,95 M/mes con prestaciones, salario mínimo 2026) + $20.000 de lavandería por salida. Check-in y administración: los padres, sin sueldo.
- **Fijos con al menos una cabaña operando:** internet $250.000 (Starlink), servicios comunes $300.000, jardinería $400.000, contador $350.000, software y publicidad $150.000, jacuzzi $120.000 por cabaña; predial $700.000/año; mantenimiento 1,5 % y seguro 0,4 % anual del costo de obra; reposición $700.000/año por cabaña. Los valores sin fuente son estimados para validar con cotizaciones.
- Tasa mensual = `(1 + tasa EA)^(1/12) - 1`. Cada desembolso se amortiza con cuota constante después de la gracia a capital. Seguro deudor sobre saldo y gastos por desembolso incluidos.
- Se registra **plata extra** cada mes que la caja queda por debajo de cero. Distribuciones al propietario: anuales, dejando tres meses de gastos y cuotas en reserva.
- **Veredicto:** «No conviene así» si la plata extra supera el capital inicial, la caja mensual es negativa o la rentabilidad (TIR modificada del proyecto) no llega al CDT (12 %). «Buena inversión» si las cinco preguntas están en verde (meta 16 % = CDT + 4 puntos). En otro caso, «Ajustada».
- **Análisis de escenarios** (pestaña de flujo): 1) base de mercado; 2) solo bajar costos (cabaña ~$88 M: obra $1,95 M/m², jacuzzi empotrado $11,5 M, cocineta $3,5 M, dotación $6 M, diseños 5 %, contingencia 10 %); 3) solo tarifa premium $400k / $550k; 4) premium + costos + 3 cabañas iniciales; 5) lo anterior con la casa por cuenta de los padres; 6) lo anterior con crédito al 12 % a 20 años. Cada uno muestra su resultado base y pesimista (ocupación −25 %) y se puede aplicar a todo el simulador.
- **Casa por cuenta de los padres:** opción que saca la casa de la inversión del proyecto; el subsidio de vivienda va con ella y no entra al flujo.
- **Conciliación:** presupuesto a precios de hoy + inflación de obra hasta el mes de ejecución − cabañas que no alcanzan a construirse = inversión del flujo.

## Límites espaciales

El rectángulo 45,45 × 22 m es una interpretación conceptual de los linderos, no un levantamiento. Falta el plano con vértices, ángulos y orientación exacta, además de retiros, densidad, ocupación, servidumbre y uso del suelo certificados. El frente norte de acceso es una hipótesis basada en la colindancia registral con servidumbre.

La comprobación cubre cruces de rectángulos, retiros, separación conservadora entre envolventes, reserva de jacuzzi, área mínima funcional configurada, cantidad/profundidad de parqueo y conexión corta al sistema peatonal con entrada norte. No resuelve puertas, accesibilidad universal, giro vehicular, incendios, pendiente, nivel freático, árboles, privacidad visual, infiltración ni normativa predial. Las conexiones cortas se muestran y presupuestan. Las terrazas se suponen descubiertas.

La zona técnica reservada no demuestra que el saneamiento quepa: debe dimensionarse con suelos, capacidad y distancias sanitarias reales. La casa de los padres no genera ingreso por arriendo. El pago por administración es una variable independiente, inicialmente cero.

## Fuentes y datos

La pestaña **Supuestos y fuentes** conserva enlaces bancarios, del subsidio, climáticos y referencias del chat consultadas el 15/10/2026. Las referencias de Airbnb prueban oferta, no ocupación ni tarifas del modelo. El certificado registral está en la carpeta superior. La hipótesis del 10 % fue descartada; no se usa como aporte propio.

## Mantenimiento y pruebas

- `engine.js`: geometría, distribución automática, presupuesto, etapas, financiación y flujo.
- `app.js`: interfaz, SVG, controles, veredicto, escenarios y comparación de modelos.
- `styles.css`: diseño adaptable, sin recursos externos.
- `index.template.html`: estructura fuente.
- `build.py`: recompone el HTML autónomo después de editar los archivos anteriores: `python build.py`.
- `test-engine.js`: comprobaciones reproducibles con `node test-engine.js` (~15 s): finanzas, implantación máxima por modelo, etapas, subsidio, IVA, aseo, conciliación y geometría. No requiere paquetes.

No editar a mano el HTML compilado si después se va a regenerar: los cambios de estructura van en `index.template.html`.


### Lectura del plano y servicios privados
- Plano a todo el ancho, zoom 100/150/200 % y ampliación con cierre por Escape.
- Cotas actualizadas de envolventes, interiores brutos, terrazas, parqueos, pasillos y separaciones ortogonales. Seleccionar un elemento muestra sus cuatro distancias libres hasta el primer volumen alineado o lindero; no son distancias diagonales ni certificación normativa.
- Cada Airbnb incluye baño y cocineta privados, además del jacuzzi en su terraza. La reserva común corresponde a saneamiento y equipos, no a baños compartidos. Estos conceptos ya estaban incluidos en el presupuesto.
- El detalle interior usa mobiliario y baño de referencia y no descuenta muros del área bruta. Los tamaños que no admiten el esquema requieren otra distribución arquitectónica.

### Distribución automática
- Franja de apoyo fija a la izquierda: parqueadero girado de 6 puestos (maniobra 5 m + puesto 5 m, desde el retiro de 1 m) con los equipos debajo y el acceso peatonal de 11 a 13,5 m. Un puesto por Airbnb; la casa comparte.
- Separaciones: 1 m del lindero al borde de la cabaña (terraza incluida), 3,65 m entre paredes de cabañas y 2,5 m entre cabañas y casa, pasillos o equipos.
- El generador prueba la altura del pasillo, el giro de los módulos y la posición oeste-este de la casa; si las filas no alcanzan, prueba posiciones libres (esquinas y cabañas giradas hacia el pasillo).
