/* ============================================================
   SABORES DE AVENTURAS — script.js
   Scripts al final del body → DOM ya disponible, no se necesita DOMContentLoaded.
   Leaflet carga sincrónicamente antes de este archivo → L siempre definido.
   ============================================================ */

'use strict';

// Instancia del mapa accesible desde initScrollReveal para invalidateSize()
let _leafletMap = null;

initLoader();
initNavbar();

try {
  initHeroAnimation();
} catch (e) {
  // Si la animación del hero falla, el resto de la página sigue funcionando
  console.warn('[SdA] Hero animation skipped:', e.message);
}

initScrollReveal();
initMap();
initForm();

/* ──────────────────────────────────────────────────────────
   NAVBAR — Hamburger + mobile overlay + scroll shadow
   ────────────────────────────────────────────────────────── */
function initNavbar() {
  const navbar     = document.getElementById('navbar');
  const hamburger  = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  if (!navbar || !hamburger || !mobileMenu) return;

  let menuOpen = false;

  function openMenu() {
    menuOpen = true;
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    menuOpen = false;
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    menuOpen ? closeMenu() : openMenu();
  });

  mobileLinks.forEach(link => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menuOpen) closeMenu();
  });

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

/* ──────────────────────────────────────────────────────────
   HERO — Word-by-word animation
   ────────────────────────────────────────────────────────── */
function initHeroAnimation() {
  const titleEl = document.getElementById('hero-title');
  if (!titleEl) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function wrapWords(node, delay, step) {
    if (node.nodeType === Node.TEXT_NODE) {
      const words = node.textContent.split(/(\s+)/);
      const frag  = document.createDocumentFragment();
      words.forEach(part => {
        if (part.trim() === '') {
          frag.appendChild(document.createTextNode(part));
        } else {
          const span = document.createElement('span');
          span.className = 'hero-word';
          span.textContent = part;
          span.style.animationDelay = delay + 'ms';
          delay += step;
          frag.appendChild(span);
        }
      });
      node.parentNode.replaceChild(frag, node);
    } else if (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('underline-svg')) {
      Array.from(node.childNodes).forEach(child => {
        delay = wrapWords(child, delay, step);
      });
    }
    return delay;
  }

  let delay = 80;
  Array.from(titleEl.childNodes).forEach(node => {
    delay = wrapWords(node, delay, 60);
  });
}

/* ──────────────────────────────────────────────────────────
   SCROLL REVEAL — IntersectionObserver
   ────────────────────────────────────────────────────────── */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -20px 0px'
  });

  els.forEach(el => observer.observe(el));
}

/* ──────────────────────────────────────────────────────────
   MAPA LEAFLET — CartoDB Positron + custom markers
   ────────────────────────────────────────────────────────── */
function initMap() {
  if (typeof L === 'undefined') {
    console.error('[SdA] Leaflet no cargado. Comprueba la conexión a CDN.');
    return;
  }

  const mapEl = document.getElementById('map');
  if (!mapEl) return;

  // Direcciones y coordenadas verificadas por el equipo de Sabores de Aventuras.
  // TODO: Reemplazar `imagen` por foto propia y ajustar `puntuacion` con la nota real del vídeo.
  const restaurantes = [
    {
      nombre: 'La Bechamel',
      tipo: 'Cocina creativa — Michelin',
      direccion: 'C/ Guzmán el Bueno, 4, 02002 Albacete',
      coords: [38.9919, -1.8532],
      puntuacion: 9.5,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Cocina creativa con estrella Michelin. La croqueta de jamón se llevó el primer premio en Madrid Fusión 2023 y no es marketing: se come y se entiende. Imprescindible si quieres ver qué hace Albacete en la liga de los grandes.'
    },
    {
      nombre: 'Keiji by Joel',
      tipo: 'Nikkei',
      direccion: 'C/ Cruz, 1, 02001 Albacete',
      coords: [38.9941, -1.8515],
      puntuacion: 9.0,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Joel hace en Albacete lo que no esperarías de un nikkei de provincia. El canelón de aguacate y el nigiri de atún rojo son la prueba: aquí se cocina con cabeza y producto serio.'
    },
    {
      nombre: 'Taberna Motivos',
      tipo: 'Tapeo',
      direccion: 'C/ Jesús Nazareno, 6, 02002 Albacete',
      coords: [38.9909, -1.8537],
      puntuacion: 9.2,
      imagen: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=800&q=80',
      opinion: 'Para nosotros, las mejores croquetas de la ciudad. Punto. Por 18,50 € comes un menú al que no se le puede poner ninguna pega — y tomamos café con leche caliente al salir.'
    },
    {
      nombre: 'Tapería Dallas',
      tipo: 'Tapeo',
      direccion: 'Pl. Maestro Chueca, 13, 02005 Albacete',
      coords: [39.0021, -1.8666],
      puntuacion: 8.5,
      imagen: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
      opinion: 'Croqueta de txangurro y de piquillo. Las dos te las acabas mojando en la salsa que sobra. Sitio honesto, sin filtros, con producto que se nota.'
    },
    {
      nombre: 'Tapería Envero',
      tipo: 'Tapeo',
      direccion: 'C/ Herreros, 51, 02001 Albacete',
      coords: [38.9923, -1.8486],
      puntuacion: 8.7,
      imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      opinion: 'La bomba de queso de las que te paran la conversación. Y la tarta de queso, la de toda la vida, también merece el viaje. Servicio rápido y precio justo.'
    },
    {
      nombre: 'Catacaldos',
      tipo: 'Tapeo',
      direccion: 'C/ Padre Pascual Suárez, 2, 02002 Albacete',
      coords: [38.9889, -1.8532],
      puntuacion: 6.8,
      imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      opinion: 'Reseña mixta. No todo cumple, pero el canelón y la milhoja salvan la visita. Volveremos a ver si se afinan en el resto de la carta.'
    },
    {
      nombre: 'Sueños del Este',
      tipo: 'Tapeo',
      direccion: 'C/ Mayor, 59, 02002 Albacete',
      coords: [38.9929, -1.8535],
      puntuacion: 8.4,
      imagen: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=800&q=80',
      opinion: 'Croqueta de oreja estofada y manchego. Suena raro, está buenísima. Un clásico de la calle Mayor que no necesita venderse.'
    },
    {
      nombre: 'Gran Hotel',
      tipo: 'Tapeo',
      direccion: 'C/ Marqués de Molins, 1, 02001 Albacete',
      coords: [38.9944, -1.8539],
      puntuacion: 8.6,
      imagen: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=800&q=80',
      opinion: 'Croqueta de gamba roja con cabeza de gamba que se nota. Ambiente clásico de Albacete y cocina que sube un punto por encima del estándar.'
    },
    {
      nombre: 'La Bonita',
      tipo: 'Tapeo',
      direccion: 'C/ Tejares, 10, 02002 Albacete',
      coords: [38.9918, -1.8539],
      puntuacion: 8.8,
      imagen: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=800&q=80',
      opinion: 'Croqueta de queso azul, nueces y membrillo. Es la combinación que no te imaginas hasta que la pruebas — después, ya no comes croquetas normales.'
    },
    {
      nombre: 'Oleana',
      tipo: 'Tapeo',
      direccion: 'C/ Caba, 23, 02001 Albacete',
      coords: [38.9935, -1.8593],
      puntuacion: 8.3,
      imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      opinion: 'Bravas en serio, croquetas decentes y la carta gluten-free no es decorativa: tienen platos reales. Aquí entras y nadie celíaco siente que molesta.'
    },
    {
      nombre: 'Brocata',
      tipo: 'Bocatería gourmet',
      direccion: 'C/ Hermanos Jiménez, 3, 02004 Albacete',
      coords: [38.9960, -1.8674],
      puntuacion: 8.9,
      imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
      opinion: 'Abrieron en junio de 2025 y arrasaron. El bocata "Brocata" y el sandwich japonés son los dos platos que ya hemos hecho virales. Una de las mejores aperturas del año.'
    },
    {
      nombre: 'Kebab Albacete',
      tipo: 'Kebab',
      direccion: 'C/ Baños, 7, 02004 Albacete',
      coords: [38.9950, -1.8602],
      puntuacion: 9.1,
      imagen: 'https://images.unsplash.com/photo-1548340748-6af6a29ca4e0?w=800&q=80',
      opinion: 'El kebab que nos dio el vídeo más viral. Carne marinada como pocas, salsa de yogur hecha en casa, pan tierno. No es kebab de turismo, es kebab de los que repites.'
    },
    {
      nombre: 'Taha Turk Kebab',
      tipo: 'Kebab',
      direccion: 'Av. Ramón Menéndez Pidal, 40, 02005 Albacete',
      coords: [39.0023, -1.8637],
      puntuacion: 8.5,
      imagen: 'https://images.unsplash.com/photo-1548340748-6af6a29ca4e0?w=800&q=80',
      opinion: 'Kebab pakistaní con feta, una combinación poco común. Nota 8,5/10 y volvemos seguro: el feta cambia la jugada.'
    },
    {
      nombre: 'Tsuruta Ramen',
      tipo: 'Asiática',
      direccion: 'C/ Rosario, 4, 02001 Albacete',
      coords: [38.9954, -1.8555],
      puntuacion: 7.0,
      imagen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
      opinion: 'Gyuniku Ramen Spicy con caldo trabajado, fideos al punto. 7/10 — buena base, todavía sube si afinan el huevo.'
    },
    {
      nombre: 'Hoy Sushi',
      tipo: 'Asiática',
      direccion: 'C/ Feria, 73, 02004 Albacete',
      coords: [38.9962, -1.8639],
      puntuacion: 7.5,
      imagen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
      opinion: 'Buffet japonés que cumple en zona feria. El tartar de atún picante es el plato que justifica reservar otra vez.'
    },
    {
      nombre: 'Milanga Love',
      tipo: 'Argentina',
      direccion: 'Av. Arquitecto Julio Carrilero, 40, 02005 Albacete',
      coords: [38.9985, -1.8654],
      puntuacion: 8.0,
      imagen: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=800&q=80',
      opinion: 'Empanadilla de ternera con masa que se deshace. Cocina argentina sin pretensiones, honesta, de las que quitan el hambre y dejan ganas de volver.'
    },
    {
      nombre: 'Barú',
      tipo: 'Cafetería y dulce',
      direccion: 'Pº la Libertad, 17, 02001 Albacete',
      coords: [38.9961, -1.8527],
      puntuacion: 9.0,
      imagen: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80',
      opinion: 'El New York Roll de pistacho a 3,70 € es de los mejores que hemos probado en cualquier sitio. El café también va serio, lo cual ya es decir mucho.'
    },
    {
      nombre: 'Alboroque',
      tipo: 'Almuerzo',
      direccion: 'Pq. Emp. Campollano, C/ C, 16, 02007 Albacete',
      coords: [39.0121, -1.8786],
      puntuacion: 8.4,
      imagen: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80',
      opinion: 'Chivito completo más bebida más café por 5,80 €. Nota 8,40 de almuerzo trabajador que no te falla nunca. Si vas a la zona de Campollano, paras aquí.'
    },
    {
      nombre: 'La Monda Lironda',
      tipo: 'Tapeo',
      direccion: 'C/ Vienne, 1, 02005 Albacete',
      coords: [39.0070, -1.8681],
      puntuacion: 7.8,
      imagen: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
      opinion: 'Caracoles bien hechos y hamburguesas serias en la carretera de Madrid. Sitio para ir con tiempo y reservar mesa los fines de semana.'
    },
  ];

  const map = L.map('map', {
    center:           [38.9963, -1.8585],
    zoom:             14,
    zoomControl:      false,        // lo añadimos manualmente abajo-derecha
    scrollWheelZoom:  false,
  });

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Guardar instancia globalmente
  _leafletMap = map;

  // Forzar recalculo de tamaño en dos momentos distintos como seguro
  setTimeout(() => map.invalidateSize({ animate: false }), 100);
  window.addEventListener('load', () => map.invalidateSize({ animate: false }), { once: true });

  // CartoDB Positron — tiles limpios, beige-friendly
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains:  'abcd',
    maxZoom:     20,
  }).addTo(map);

  // Marcador SVG personalizado en --color-tomato-soft
  // IMPORTANTE: el hover se hace por CSS sobre el <svg> hijo, NO sobre
  // el contenedor del marcador (Leaflet usa transform para posicionarlo).
  function mkIcon() {
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="38" viewBox="0 0 30 38">',
      '<path d="M15 0C6.716 0 0 6.716 0 15c0 9.375 15 23 15 23S30 24.375 30 15C30 6.716 23.284 0 15 0z"',
      ' fill="#E89B7A" stroke="#FFFCF7" stroke-width="1.5"/>',
      '<circle cx="15" cy="14" r="5.5" fill="#FFFCF7" opacity=".9"/>',
      '</svg>',
    ].join('');

    return L.divIcon({
      html:       svg,
      className:  'sabores-marker',
      iconSize:   [30, 38],
      iconAnchor: [15, 38],
      popupAnchor:[0, -42],
    });
  }

  // Añadir marcadores y guardar referencias para búsqueda/selección
  const markers = [];
  restaurantes.forEach((r, i) => {
    const marker = L.marker(r.coords, { icon: mkIcon() }).addTo(map);
    marker._restaurante = r;
    marker._idx = i;
    markers.push(marker);

    marker.on('mouseover', function () { this.setZIndexOffset(1000); });
    marker.on('mouseout',  function () {
      // Sólo bajar el zIndex si NO es el marcador seleccionado
      if (this._icon && !this._icon.classList.contains('selected')) {
        this.setZIndexOffset(0);
      }
    });

    marker.on('click', () => selectRestaurante(r, marker));
  });

  // Ajustar encuadre para que se vean TODOS los marcadores con padding cómodo
  const bounds = L.latLngBounds(restaurantes.map(r => r.coords));
  map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });

  // Activar scroll wheel solo cuando el usuario interactúa con el mapa
  mapEl.addEventListener('click', () => map.scrollWheelZoom.enable(),  { passive: true });
  map.on('blur', () => map.scrollWheelZoom.disable());

  // ─── Selección de restaurante (marker + buscador) ─────────────
  let _selectedMarker = null;

  function selectRestaurante(r, marker) {
    // Resetear el marker anterior (clase + zIndexOffset)
    if (_selectedMarker && _selectedMarker !== marker) {
      if (_selectedMarker._icon) _selectedMarker._icon.classList.remove('selected');
      _selectedMarker.setZIndexOffset(0);
    }
    _selectedMarker = marker;

    if (marker && marker._icon) {
      marker._icon.classList.add('selected');
      marker.setZIndexOffset(1000);
    }

    // FlyTo al marcador
    map.flyTo(r.coords, Math.max(map.getZoom(), 16), { duration: 0.7 });

    // Actualizar panel de detalle
    updateDetailPanel(r);

    // Cerrar dropdown de búsqueda si está abierto
    closeSearchDropdown();

    // En mobile, hacer scroll al panel para que el usuario vea la info
    if (window.innerWidth < 1025) {
      setTimeout(() => {
        const panel = document.getElementById('mapa-detail');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 250);
    }
  }

  function updateDetailPanel(r) {
    const empty   = document.getElementById('mapa-detail-empty');
    const content = document.getElementById('mapa-detail-content');
    if (!empty || !content) return;

    const img      = document.getElementById('mapa-detail-img');
    const tipo     = document.getElementById('mapa-detail-tipo');
    const score    = document.getElementById('mapa-detail-score');
    const nombre   = document.getElementById('mapa-detail-nombre');
    const dir      = document.getElementById('mapa-detail-dir');
    const opinion  = document.getElementById('mapa-detail-opinion');
    const cta      = document.getElementById('mapa-detail-cta');

    if (img)     { img.src = r.imagen; img.alt = 'Foto representativa de ' + r.nombre; }
    if (tipo)    tipo.textContent = r.tipo;
    if (score)   score.textContent = r.puntuacion.toFixed(1) + ' / 10';
    if (nombre)  nombre.textContent = r.nombre;
    if (dir)     dir.textContent = r.direccion;
    if (opinion) opinion.textContent = r.opinion;
    if (cta) {
      cta.href = 'https://www.google.com/maps/search/?api=1&query=' +
                 encodeURIComponent(r.nombre + ', ' + r.direccion);
    }

    // Animar transición
    empty.hidden = true;
    content.hidden = false;
    content.classList.remove('fade-in');
    void content.offsetWidth; // forzar reflow para reiniciar animación
    content.classList.add('fade-in');
  }

  // ─── Buscador ─────────────────────────────────────────────────
  const searchInput   = document.getElementById('mapa-search-input');
  const searchResults = document.getElementById('mapa-search-results');

  // Normaliza para búsqueda — quita acentos y pasa a minúsculas.
  // Rango ̀-ͯ = Combining Diacritical Marks (Unicode block).
  function normalize(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function renderSearchResults(query) {
    if (!searchResults) return;
    const q = normalize(query.trim());

    if (q.length === 0) {
      closeSearchDropdown();
      return;
    }

    const matches = restaurantes
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) =>
        normalize(r.nombre).includes(q) || normalize(r.tipo).includes(q)
      )
      .slice(0, 6);

    if (matches.length === 0) {
      searchResults.innerHTML =
        '<li class="mapa-search-empty">Sin resultados para "' + query + '"</li>';
      searchResults.hidden = false;
      return;
    }

    searchResults.innerHTML = matches.map(({ r, idx }) =>
      '<li class="mapa-search-result" data-idx="' + idx + '" role="option" tabindex="0">' +
        '<div class="mapa-search-result-name">' + r.nombre + '</div>' +
        '<div class="mapa-search-result-tipo">' + r.tipo + '</div>' +
      '</li>'
    ).join('');
    searchResults.hidden = false;
  }

  function closeSearchDropdown() {
    if (searchResults) {
      searchResults.hidden = true;
      searchResults.innerHTML = '';
    }
  }

  if (searchInput && searchResults) {
    searchInput.addEventListener('input', e => renderSearchResults(e.target.value));

    searchInput.addEventListener('focus', e => {
      if (e.target.value.trim()) renderSearchResults(e.target.value);
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        searchInput.value = '';
        closeSearchDropdown();
        searchInput.blur();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const first = searchResults.querySelector('.mapa-search-result');
        if (first) first.click();
      }
    });

    // Delegación de click sobre resultados
    searchResults.addEventListener('click', e => {
      const li = e.target.closest('.mapa-search-result');
      if (!li) return;
      const idx = parseInt(li.dataset.idx, 10);
      const r   = restaurantes[idx];
      const m   = markers[idx];
      if (r && m) {
        searchInput.value = r.nombre;
        selectRestaurante(r, m);
      }
    });

    // Click fuera del buscador → cerrar
    document.addEventListener('click', e => {
      if (!e.target.closest('.mapa-search')) closeSearchDropdown();
    });
  }
}

/* ──────────────────────────────────────────────────────────
   FORMULARIO — Validación + éxito + contador de caracteres
   ────────────────────────────────────────────────────────── */
function initForm() {
  const form        = document.getElementById('contact-form');
  const formSuccess = document.getElementById('form-success');
  const mensajeTA   = document.getElementById('mensaje');
  const charCounter = document.getElementById('mensaje-counter');

  if (!form) return;

  // Contador de caracteres en tiempo real
  if (mensajeTA && charCounter) {
    mensajeTA.addEventListener('input', () => {
      const len = mensajeTA.value.length;
      charCounter.textContent = len + ' / 800';
      charCounter.style.color = len > 720 ? '#c0392b' : '';
    });
  }

  function setError(inputEl, errorId, show) {
    const errEl = document.getElementById(errorId);
    if (!errEl) return;
    inputEl.classList.toggle('error', show);
    errEl.classList.toggle('visible', show);
  }

  function validateNombre() {
    const el = document.getElementById('nombre');
    const ok = el && el.value.trim().length > 0;
    if (el) setError(el, 'nombre-error', !ok);
    return ok;
  }

  function validateEmail() {
    const el = document.getElementById('email');
    const ok = el && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
    if (el) setError(el, 'email-error', !ok);
    return ok;
  }

  function validateTipo() {
    const el = document.getElementById('tipo');
    const ok = el && el.value !== '';
    if (el) setError(el, 'tipo-error', !ok);
    return ok;
  }

  function validateMensaje() {
    const el = document.getElementById('mensaje');
    const ok = el && el.value.trim().length > 0;
    if (el) setError(el, 'mensaje-error', !ok);
    return ok;
  }

  function validatePrivacidad() {
    const el  = document.getElementById('privacidad');
    const err = document.getElementById('privacidad-error');
    const ok  = el && el.checked;
    if (err) err.classList.toggle('visible', !ok);
    return ok;
  }

  // Validación en blur
  const nombre    = document.getElementById('nombre');
  const email     = document.getElementById('email');
  const tipo      = document.getElementById('tipo');
  const mensaje   = document.getElementById('mensaje');
  const privacidad = document.getElementById('privacidad');

  if (nombre)     nombre.addEventListener('blur', validateNombre);
  if (email)      email.addEventListener('blur', validateEmail);
  if (tipo)       tipo.addEventListener('change', validateTipo);
  if (mensaje)    mensaje.addEventListener('blur', validateMensaje);
  if (privacidad) privacidad.addEventListener('change', validatePrivacidad);

  form.addEventListener('submit', e => {
    e.preventDefault();

    const valid = [
      validateNombre(),
      validateEmail(),
      validateTipo(),
      validateMensaje(),
      validatePrivacidad(),
    ].every(Boolean);

    if (!valid) {
      const firstErr = form.querySelector('.form-error-msg.visible');
      if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Éxito — ocultar formulario, mostrar confirmación
    form.style.display = 'none';
    if (formSuccess) formSuccess.classList.add('visible');
  });
}

/* ──────────────────────────────────────────────────────────
   LOADER — pantalla de carga
   ────────────────────────────────────────────────────────── */
function initLoader() {
  const loader = document.getElementById('loader');
  if (!loader) return;

  const hide = () => loader.classList.add('hidden');

  if (document.readyState === 'complete') {
    // Página ya cargada (caché, navegación rápida): desaparece tras breve pausa
    setTimeout(hide, 400);
  } else {
    window.addEventListener('load', () => setTimeout(hide, 300), { once: true });
    // Fallback: si tarda más de 4 s, desaparece igualmente
    setTimeout(hide, 4000);
  }
}
