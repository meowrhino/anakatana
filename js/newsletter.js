// newsletter.js — popup + API
(function(){
  if (!window.API_BASE) {
    console.warn('[newsletter] window.API_BASE no está definido. Define window.API_BASE antes de cargar newsletter.js');
  }
  let overlay;

  function openNewsletterPopup(prefill=""){
    if (document.getElementById("popup-newsletter")) return;

    overlay = document.createElement("div");
    overlay.id = "popup-newsletter";
    overlay.className = "popup-carrito";

    const modal = document.createElement("div");
    modal.className = "carrito-modal";
    modal.style.maxWidth = "360px";
    modal.style.padding = "1rem";
    modal.style.position = "relative";

    modal.innerHTML = `
      <button class="carrito-cerrar" aria-label="Cerrar">✕</button>
      <div class="carrito-contenido">
        <h3 style="margin-bottom:.5rem">Newsletter</h3>
        <p style="margin-bottom:.5rem">Deja tu email y recibe 10% en tu compra.</p>
        <input id="nl-email" type="email" placeholder="tu@email"
               style="width:100%;padding:.5rem;margin:.5rem 0" value="${prefill||""}">
        <button id="nl-submit" class="carrito-pagar" type="button">Suscribirme</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modal.querySelector(".carrito-cerrar").addEventListener("click", () => overlay.remove());
    modal.querySelector("#nl-submit").addEventListener("click", submitNewsletter);
  }

  async function submitNewsletter(){
    const email = document.getElementById("nl-email").value.trim().toLowerCase();
    if (!email) return alert("Escribe un email");
    try {
      const r = await fetch(`${window.API_BASE}/newsletter`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ email })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "error");
      localStorage.setItem("nl_email", email);
      alert("¡Gracias! Ya estás suscrita.");
      overlay?.remove();
    } catch (e) {
      alert("No se pudo guardar ahora. Inténtalo más tarde.");
    }
  }

  // expone un helper para otros módulos (checkout/descuento)
  window.NL = {
    async isSuscrita(email){
      email = (email || localStorage.getItem("nl_email") || "").trim().toLowerCase();
      if (!email) return false;
      try {
        const r = await fetch(`${window.API_BASE}/newsletter/${encodeURIComponent(email)}`);
        const j = await r.json();
        return !!j.suscrito;
      } catch {
        return false;
      }
    },
    open: openNewsletterPopup
  };

  // Si tienes un link en menú: <a href="#newsletter">newsletter</a>
  document.addEventListener("click", (ev)=>{
    const a = ev.target.closest('a[href="#newsletter"]');
    if (!a) return;
    ev.preventDefault();
    openNewsletterPopup();
  });
})();