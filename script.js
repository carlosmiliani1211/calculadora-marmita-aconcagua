/* ===================================================================
   Calculadora de Marmita — Planta Aconcagua
   Guarda cada registro en localStorage del navegador (offline).
   Exporta a CSV para consolidar o llevar a Power BI / Excel.
   =================================================================== */
   const supabaseClient = supabase.createClient(
  "https://gyusycbgciptywdtxtee.supabase.co",
  "sb_publishable_ewSsj2SAFvkTGTGpcosGvw_vKHTaVny"
);
(function(){
  "use strict";

  var STORE_KEY = "marmita_aconcagua_registros_v1";

  // --- refs ---
  var famBtns = document.querySelectorAll(".fam button");
  var cm      = document.getElementById("cm");
  var bolsas  = document.getElementById("bolsas");
  var res     = document.getElementById("res");
  var vacio   = document.getElementById("vacio");
  var elKg    = document.getElementById("kg");
  var elLit   = document.getElementById("litros");
  var elPct   = document.getElementById("pct");
  var elRango = document.getElementById("rango");
  var alerta  = document.getElementById("alerta");
  var compOut = document.getElementById("compOut");
  var inSku = document.getElementById("sku");
  var inDesc = document.getElementById("descripcion");
  var inMarmita=document.getElementById("marmita");
  var inTurno = document.getElementById("turno");
  var btnGuardar = document.getElementById("guardar");
  var toast   = document.getElementById("toast");
  var histList= document.getElementById("histList");
  var histVacio=document.getElementById("histVacio");
  var histCont= document.getElementById("histCont");
   var btnActualizar = document.getElementById("actualizar");
  var btnCsv  = document.getElementById("exportCsv");

  var k = 1.02, famActual = "general";
  var MAX_UTIL = 420;              // kg de referencia a d~8 con k~1.02
  var estadoValido = false;        // hay un cálculo válido para guardar

  // --- helpers ---
  function fmt(n){ return Math.round(n).toLocaleString("es-CL"); }
  function fmtDec(n,d){ return n.toFixed(d==null?2:d).replace(".",","); }

  function showAlerta(tipo, html){ alerta.className = "alerta show " + tipo; alerta.innerHTML = html; }
  function clearAlerta(){ alerta.className = "alerta"; alerta.innerHTML = ""; }

  function showToast(msg){
    toast.textContent = msg; toast.classList.add("show");
    setTimeout(function(){ toast.classList.remove("show"); }, 1900);
  }

  // --- selección de familia ---
  famBtns.forEach(function(b){
    b.addEventListener("click", function(){
      famBtns.forEach(function(x){ x.classList.remove("on"); });
      b.classList.add("on");
      k = parseFloat(b.dataset.k);
      famActual = b.dataset.fam;
      calc();
    });
  });
  cm.addEventListener("input", calc);
  bolsas.addEventListener("input", calc);
[inSku, inDesc, inMarmita, inTurno].forEach(function(el){
    if(el) el.addEventListener("input", refreshBotonGuardar);
  });

  // --- cálculo principal ---
  var ultimo = null;  // guarda el resultado vigente

  function calc(){
    var d = parseFloat(cm.value);
    clearAlerta();
    estadoValido = false; ultimo = null;

    if(isNaN(d) || cm.value === ""){
      res.style.display = "none"; vacio.style.display = "block";
      compOut.classList.remove("show"); refreshBotonGuardar(); return;
    }

    if(d < 0 || d > 55){
      showAlerta("err","<b>Medición fuera de rango.</b> La regla debe leer entre 0 y ~48 cm en esta marmita. Revisa el valor ingresado.");
      res.style.display = "none"; vacio.style.display = "none";
      compOut.classList.remove("show"); refreshBotonGuardar(); return;
    }

    var litros = 470 - 6.3 * d;
    var kg = k * litros;

    if(d > 48){
      showAlerta("warn","<b>Nivel muy bajo.</b> Bajo d≈48 cm empieza el fondo curvo y la ecuación pierde precisión. Usa el resultado solo como referencia.");
    } else if(d < 8){
      showAlerta("warn","<b>Nivel muy alto.</b> Sobre d≈8 cm la marmita está casi al tope de llenado útil. Verifica que no haya riesgo de derrame al agitar.");
    }

    vacio.style.display = "none"; res.style.display = "block";
    elKg.textContent = fmt(kg);
    elLit.textContent = fmt(litros);
    var pct = Math.max(0, Math.min(100, Math.round(kg / MAX_UTIL * 100)));
    elPct.textContent = pct + "%";
    elRango.textContent = "rango esperado " + fmt(kg-15) + " – " + fmt(kg+15) + " kg";

    // comparador bolsas
    var nb = parseFloat(bolsas.value);
    var pesoReal = null;
    if(!isNaN(nb) && nb > 0){
      compOut.classList.add("show");
      var estBolsas = nb * 3.0;
      var dif = kg - estBolsas;
      pesoReal = kg / nb;
      var pesoTxt = fmtDec(pesoReal), pillClass, pillTxt, msg;
      if(pesoReal > 3.15){
        pillClass="hi"; pillTxt=pesoTxt+" kg/bolsa";
        msg="El conteo × 3 kg <b>subestima</b> la producción en ~"+fmt(Math.abs(dif))+" kg. La bolsa real pesaría <b>"+pesoTxt+" kg</b> — posible sobrellenado (merma). Conviene pesar una muestra.";
      } else if(pesoReal < 2.85){
        pillClass="hi"; pillTxt=pesoTxt+" kg/bolsa";
        msg="El conteo × 3 kg <b>sobreestima</b> la producción en ~"+fmt(Math.abs(dif))+" kg. La bolsa real pesaría <b>"+pesoTxt+" kg</b> — riesgo de bajo gramaje. Conviene pesar una muestra.";
      } else {
        pillClass="ok"; pillTxt=pesoTxt+" kg/bolsa";
        msg="Ambos métodos coinciden dentro del margen. La bolsa real implícita es <b>"+pesoTxt+" kg</b>, cerca del objetivo de 3,0 kg.";
      }
      compOut.innerHTML = "Regla: <b>"+fmt(kg)+" kg</b> · Conteo: <b>"+fmt(estBolsas)+" kg</b> "+
        "<span class='pill "+pillClass+"'>"+pillTxt+"</span><br>"+msg;
    } else {
      compOut.classList.remove("show");
    }

    // resultado vigente para guardar
    estadoValido = true;
    ultimo = {
      d: d, familia: famActual, k: k,
      litros: Math.round(litros), kg: Math.round(kg),
      bolsas: (!isNaN(nb) && nb>0) ? nb : null,
      pesoRealBolsa: pesoReal
    };
    refreshBotonGuardar();
  }

  function refreshBotonGuardar(){
    // se puede guardar si hay cálculo válido y receta escrita
  var okReceta =
  inSku && inSku.value.trim().length > 0 &&
  inDesc && inDesc.value.trim().length > 0;
    btnGuardar.disabled = !(estadoValido && okReceta);
  }

 // ============ Supabase ============
async function leer(){

  const {data,error} = await supabaseClient
    .from("registros")
    .select("*")
    .order("id",{ascending:false});

  if(error){
    console.error("Error leyendo Supabase:", error);
    return [];
  }

  return data || [];
}


async function guardarEnSupabase(reg){

  const {data, error} = await supabaseClient
    .from("registros")
    .insert([reg])
    .select();

  if(error){
    console.error("ERROR COMPLETO SUPABASE:", error);
    alert(
      "Error Supabase:\n\n" +
      error.message
    );
    return false;
  }

  console.log("Registro creado:", data);
  return true;
}


async function eliminarDeSupabase(id){

  const { data, error } = await supabaseClient
    .from("registros")
    .delete()
    .eq("id", id)
    .select();

  console.log("DELETE:", data, error);

  if(error){
    console.error(error);
    return false;
  }

  return true;
}

    btnGuardar.addEventListener("click", async function(){
    if(!estadoValido || !ultimo) return;
    var now = new Date();
 var reg = {
  fecha: now.toISOString().split("T")[0],
  sku: inSku.value.trim(),
  descripcion: inDesc.value.trim(),
  tipo: ultimo.familia,
  marmita: inMarmita ? inMarmita.value.trim() : "",
  medicion_cm: ultimo.d,
  litros: ultimo.litros,
  kg_estimados: ultimo.kg,
  bolsas: ultimo.bolsas,
  kg_bolsa: ultimo.pesoRealBolsa != null
      ? +ultimo.pesoRealBolsa.toFixed(3)
      : null,
  usuario: "",
  observaciones: ""
};
      if(await guardarEnSupabase(reg)){
      showToast("Registro guardado ✓");
      // limpiar campos de entrada, mantener familia
      cm.value = ""; bolsas.value = "";
      inSku.value = "";
      inDesc.value = ""; if(inMarmita) inMarmita.value=""; if(inTurno) inTurno.value="";
      calc(); render();
    } else {
      showToast("No se pudo guardar en este navegador");
    }
  });

  // ============ render historial ============
  async function render(){

    var arr = await leer();
    histCont.textContent = arr.length + (arr.length===1 ? " registro" : " registros");
  if(arr.length === 0){
  histVacio.style.display = "block"; 
  histList.innerHTML = "";
  btnCsv.disabled = true; 
  return;
}
 histVacio.style.display = "none";
btnCsv.disabled = false;

    histList.innerHTML = arr.map(function(r){
      var famTag = r.tipo === "pure"
        ? "<span class='tag pure'>Puré</span>"
        : "<span class='tag general'>General</span>";
      var linea2 = "d <b>"+fmtDec(r.medicion_cm,1)+" cm</b> · <b>"+r.litros+" L</b>";
      if(r.bolsas){
        linea2 += " · "+r.bolsas+" bolsas";
        if(r.kg_bolsa) linea2 += " · <b>"+fmtDec(r.kg_bolsa)+"</b> kg/bolsa";
      }
      var meta = r.fecha+" "+r.hora;
      if(r.marmita) meta += " · M"+r.marmita;
      if(r.turno) meta += " · "+r.turno;
      return "<div class='row'>"+
    "<div class='info'>"+
      "<div class='r1'>"+
        "<span style='font-weight:800'>"+escapeHtml(r.sku)+"</span>"+
        "<br>"+
        "<span style='font-weight:600;color:#333'>"+escapeHtml(r.descripcion)+"</span>"+
        famTag+
      "</div>"+
      "<div class='r2'>"+linea2+"<br>"+meta+"</div>"+
    "</div>"+
    "<div style='text-align:right'>"+
      "<div class='kgbig'>"+fmt(r.kg_estimados)+"<span class='u'> kg</span></div>"+
    "</div>"+
  "</div>";
    }).join("");
    }
     
   // Botón actualizar registros manualmente
btnActualizar.addEventListener("click", async function(){

    await render();

    showToast("Registros actualizados ✓");

});
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  // ============ exportar CSV ============
btnCsv.addEventListener("click", async function(){

  var arr = await leer();

  if(arr.length === 0){
    showToast("No hay registros para exportar");
    return;
  }

  var cols = [
    "Fecha",
    "ID",
    "SKU",
    "Descripcion",
    "Tipo",
    "Marmita",
    "Medicion_cm",
    "Litros",
    "Kg_estimados",
    "Bolsas",
    "Kg_bolsa",
    "Usuario",
    "Observaciones"
  ];

  var lines = [cols.join(";")];

  arr.slice().reverse().forEach(function(r){

    lines.push([
      r.fecha,
      csvCell(r.id),
      csvCell(r.sku),
      csvCell(r.descripcion),
      csvCell(r.tipo),
      csvCell(r.marmita),
      r.medicion_cm,
      r.litros,
      r.kg_estimados,
      r.bolsas != null ? r.bolsas : "",
      r.kg_bolsa != null ? fmtDec(r.kg_bolsa) : "",
      csvCell(r.usuario),
      csvCell(r.observaciones)

    ].join(";"));

  });


  var bom = "\uFEFF";

  var blob = new Blob(
    [bom + lines.join("\r\n")],
    {type:"text/csv;charset=utf-8;"}
  );


  var url = URL.createObjectURL(blob);

  var a = document.createElement("a");

  var hoy = new Date().toISOString().slice(0,10);

  a.href = url;
  a.download = "registros_marmita_"+hoy+".csv";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);

  showToast("CSV exportado ✓");

});

  function csvCell(v){
    v = v == null ? "" : String(v);
    if(/[;"\n]/.test(v)) v = '"' + v.replace(/"/g,'""') + '"';
    return v;
  }

  // ============ limpiar todo ============
    btnClear.addEventListener("click", async function(){

    var registros = await leer();

    if(registros.length === 0) return;
    if(confirm("¿Borrar TODOS los registros guardados en esta máquina?\nExporta el CSV antes si necesitas conservarlos.")){
      await supabaseClient
.from("registros")
.delete()
.neq("id",0); render(); showToast("Historial vaciado");
    }
  });

// init
(async function(){

  await render();
  refreshBotonGuardar();

})();

})();
