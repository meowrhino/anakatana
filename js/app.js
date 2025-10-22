Text file: app.js
Latest content with line numbers:
313	
314	  const btnNL = document.createElement('button');
315	  btnNL.id = 'btn-nl-suscribir';
316	  btnNL.type = 'button';
317	  btnNL.className = 'btn-nl';
318	  btnNL.textContent = 'suscribirme';
319	
320	  const btnPagar = document.createElement("button");
321	  btnPagar.className = "carrito-pagar";
322	  btnPagar.textContent = "IR AL PAGO";
323	  btnPagar.addEventListener("click", () => {
324	    window.location.href = "checkout.html";
325	  });
326	
327	  actions.append(btnNL, btnPagar);
328	
329	  // Lógica de suscripción desde el carrito (con pre-chequeo)
330	  const nlInput = promoNL.querySelector('#nl-input-carrito');
331	  const nlCheckModal = promoNL.querySelector('#nl-check-modal');
332	  function updateNLState(){
333	    const hasMail = (nlInput.value || '').trim().toLowerCase().length > 3;
334	    btnNL.classList.toggle('is-disabled', !hasMail);
335	    btnNL.disabled = !hasMail;
336	  }
337	  updateNLState();
338	  nlInput.addEventListener('input', updateNLState);
339	
340	  async function markAsSubscribed(email){
341	    btnNL.textContent = 'ya suscrita';
342	    btnNL.classList.add('is-disabled');
343	    btnNL.disabled = true;
344	    localStorage.setItem('nl_email', email);
345	    if (nlCheckModal) nlCheckModal.checked = true;
346	  }
347	
348	  async function nlSubscribe(email){
349	    if (!email) return;
350	    try {
351	      await fetch(`${window.API_BASE}/newsletter`, {
352	        method: 'POST',
353	        headers: { 'Content-Type': 'application/json' },
354	        body: JSON.stringify({ email })
355	      });
356	      localStorage.setItem('nl_email', email.trim().toLowerCase());
357	    } catch(_){}
358	  }
359	  async function nlUnsubscribe(email){
360	    if (!email) return;
361	    try {
362	      await fetch(`${window.API_BASE}/newsletter/${encodeURIComponent(email)}`, { method: 'DELETE' });
363	    } catch(_){}
364	    localStorage.removeItem('nl_email');
365	  }
366	
367	  // si ya hay un email guardado, comprobar en el back (async IIFE)
368	  if ((savedNL || '').length > 3) {
369	    (async () => {
370	      try {
371	        const chk = await fetch(`${window.API_BASE}/newsletter/${encodeURIComponent(savedNL)}`).then(r=>r.json());
372	        if (chk && chk.suscrito) await markAsSubscribed(savedNL);
373	        if (chk && chk.suscrito && nlCheckModal) nlCheckModal.checked = true;
374	      } catch (_) {}
375	    })();
376	  }
377	
378	  btnNL.addEventListener('click', async () => {
379	    const email = (nlInput.value || '').trim().toLowerCase();
380	    if (!email) return;
381	
382	    // Pre-chequeo en backend para evitar duplicados
383	    try {
384	      const chk = await fetch(`${window.API_BASE}/newsletter/${encodeURIComponent(email)}`).then(r=>r.json());
385	      if (chk && chk.suscrito) return markAsSubscribed(email);
386	    } catch (_) {}
387	
388	    try {
389	      const r = await fetch(`${window.API_BASE}/newsletter`, {
390	        method: 'POST',
391	        headers: { 'Content-Type': 'application/json' },
392	        body: JSON.stringify({ email })
393	      });
394	      const j = await r.json();
395	      if (!r.ok) throw new Error(j.error || 'error');
396	      // feedback mínimo
397	      btnNL.textContent = '¡suscrita!';
398	      await new Promise(res=>setTimeout(res, 1000));
399	      await markAsSubscribed(email);
400	      if (nlCheckModal) nlCheckModal.checked = true;
401	    } catch (e) {
402	      console.warn('No se pudo suscribir ahora');
403	    }
404	  });
405	
406	  nlCheckModal?.addEventListener('change', async () => {
407	    const em = ((nlInput?.value) || localStorage.getItem('nl_email') || '').trim().toLowerCase();
408	    if (!em){
409	      nlCheckModal.checked = false; // sin email no podemos tocar backend
410	      return;
411	    }
412	    if (nlCheckModal.checked) {
413	      await nlSubscribe(em);
414	      await markAsSubscribed(em);
415	    } else {
416	      await nlUnsubscribe(em);
417	      // reset del botón por si estaba en “ya suscrita”
418	      btnNL.textContent = 'suscribirme';
419	      btnNL.classList.remove('is-disabled');
420	      btnNL.disabled = false;
421	    }
422	  });
423	
424	  modal.append(promoNL, actions);
425	
426	
427	  // 7) montar en DOM
428	  overlay.appendChild(modal);
429	  document.body.appendChild(overlay);
430	}
431	
432	// 3.4. Observer para inicializar contador sólo cuando el DOM esté listo
433	const observer = new MutationObserver(() => {
434	  const contador = document.getElementById("carrito-count");
435	  if (contador) {
436	    actualizarContadorCarrito();
437	    observer.disconnect();
438	  }
439	});
440	observer.observe(document.body, { childList: true, subtree: true });
441	
442	function actualizarTotales() {
443	  const carrito = JSON.parse(localStorage.getItem("carrito") || "[]");
444	  const zona = document.getElementById("zonaDropdown")?.dataset?.selected || "";
445	
446	  const { subtotal, envio, comision, total } = window.recalcularTotales(
447	    carrito,
448	    zona
449	  );
450	
451	  // Calcular número total de ítems (sumando cantidades)
452	  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
453	  const subtotalEl = document.getElementById("subtotal");
454	  const envioEl = document.getElementById("envio");
455	  const totalPagoEl = document.getElementById("total-pago");
456	  const itemsEl = document.getElementById("total-items");
457	
458	  if (itemsEl) itemsEl.textContent = totalItems;
459	  if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2) + "€";
460	  if (envioEl) envioEl.textContent = envio.toFixed(2) + "€";
461	  if (totalPagoEl) totalPagoEl.textContent = total.toFixed(2) + "€";
462	}
463	
464	// Exponerla globalmente
465	window.actualizarTotales = actualizarTotales;
466	
467	// ─── Seguimiento de visitas (auto-hook por página) ───────────────────────────
468	(function trackPageView(){
469	  try {
470	    const pageType = document.body.dataset.pageType || "home";
471	    let clave = pageType;
472	    const url = new URL(window.location.href);
473	    const id = url.searchParams.get("id");
474	
475	    // Acepta "producto" (ES) o "product" (EN) y añade id si está
476	    if ((pageType === "producto" || pageType === "product") && id) {
477	      clave = `producto_${id}`;
478	    }
479	
480	    fetch(`${window.API_BASE}/visitas`, {
481	      method: "POST",
482	      headers: { "Content-Type": "application/json" },
483	      body: JSON.stringify({ clave })
484	    })
485	    .then(r => { if (!r.ok) console.warn('[visitas] respuesta no OK', r.status); })
486	    .catch(err => console.warn('[visitas] error de red', err));
487	  } catch (err) {
488	    console.warn('[visitas] error inesperado', err);
489	  }
490	})();