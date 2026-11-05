'use strict';
// Presentation only. Keep pricing, saved window scope and construction costs intact.
function customerGlassSpecification(item){
  const code=String(item?.product_code||'').trim().toUpperCase();
  const fixed=['fixed','고정창'].includes(item?.window_type)||/^CB-(90|100)$/.test(code);
  const scope=itemWindowScope(item);
  const knownScope=scope==='외부창'||scope==='내부창';
  const thickness=fixed?'24T':'28T';
  // These two product codes use the agreed mixed composition, independent of location.
  const mixed=!fixed&&['F-250','F-250I'].includes(code);
  const glass=mixed?'수퍼더블로이유리 + LX지인유리':scope==='외부창'?'수퍼더블로이유리':scope==='내부창'?'LX지인유리':'유리 사양 확인 필요';
  return {scope,knownScope,mixed,fixed,thickness,label:glass+' / '+(mixed?'각 ':'')+thickness};
}
