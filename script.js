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
      coords: [38.9918908, -1.8531533],
      puntuacion: 9.5,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Cocina creativa con estrella Michelin. La croqueta de jamón se llevó el primer premio en Madrid Fusión 2023 y no es marketing: se come y se entiende. Imprescindible si quieres ver qué hace Albacete en la liga de los grandes.'
    },
    {
      nombre: 'Keiji by Joel',
      tipo: 'Nikkei',
      direccion: 'C/ Cruz, 1, 02001 Albacete',
      coords: [38.9940662, -1.8515342],
      puntuacion: 9.0,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Joel hace en Albacete lo que no esperarías de un nikkei de provincia. El canelón de aguacate y el nigiri de atún rojo son la prueba: aquí se cocina con cabeza y producto serio.'
    },
    {
      nombre: 'Taberna Motivos',
      tipo: 'Tapeo',
      direccion: 'C/ Jesús Nazareno, 6, 02002 Albacete',
      coords: [38.9909194, -1.8536700],
      puntuacion: 9.2,
      imagen: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=800&q=80',
      opinion: 'Para nosotros, las mejores croquetas de la ciudad. Punto. Por 18,50 € comes un menú al que no se le puede poner ninguna pega — y tomamos café con leche caliente al salir.'
    },
    {
      nombre: 'Tapería Dallas',
      tipo: 'Tapeo',
      direccion: 'Pl. Maestro Chueca, 13, 02005 Albacete',
      coords: [39.0021291, -1.8665760],
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
      coords: [38.9935090, -1.8592978],
      puntuacion: 8.3,
      imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      opinion: 'Bravas en serio, croquetas decentes y la carta gluten-free no es decorativa: tienen platos reales. Aquí entras y nadie celíaco siente que molesta.'
    },
    {
      nombre: 'Brocata',
      tipo: 'Bocatería gourmet',
      direccion: 'C/ Hermanos Jiménez, 3, 02004 Albacete',
      coords: [38.9960051, -1.8673686],
      puntuacion: 8.9,
      imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
      opinion: 'Abrieron en junio de 2025 y arrasaron. El bocata "Brocata" y el sandwich japonés son los dos platos que ya hemos hecho virales. Una de las mejores aperturas del año.'
    },
    {
      nombre: 'Kebab Albacete',
      tipo: 'Kebab',
      direccion: 'C/ Baños, 7, 02004 Albacete',
      coords: [38.9950456, -1.8601675],
      puntuacion: 9.1,
      imagen: 'https://images.unsplash.com/photo-1548340748-6af6a29ca4e0?w=800&q=80',
      opinion: 'El kebab que nos dio el vídeo más viral. Carne marinada como pocas, salsa de yogur hecha en casa, pan tierno. No es kebab de turismo, es kebab de los que repites.'
    },
    {
      nombre: 'Taha Turk Kebab',
      tipo: 'Kebab',
      direccion: 'Av. Ramón Menéndez Pidal, 40, 02005 Albacete',
      coords: [39.0022637, -1.8636986],
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
      coords: [38.9962129, -1.8639267],
      puntuacion: 7.5,
      imagen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
      opinion: 'Buffet japonés que cumple en zona feria. El tartar de atún picante es el plato que justifica reservar otra vez.'
    },
    {
      nombre: 'Milanga Love',
      tipo: 'Argentina',
      direccion: 'Av. Arquitecto Julio Carrilero, 40, 02005 Albacete',
      coords: [38.9984937, -1.8653767],
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
      coords: [39.0120965, -1.8785972],
      puntuacion: 8.4,
      imagen: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80',
      opinion: 'Chivito completo más bebida más café por 5,80 €. Nota 8,40 de almuerzo trabajador que no te falla nunca. Si vas a la zona de Campollano, paras aquí.'
    },
    {
      nombre: 'La Monda Lironda',
      tipo: 'Tapeo',
      direccion: 'C/ Vienne, 1, 02005 Albacete',
      coords: [39.0070350, -1.8681204],
      puntuacion: 7.8,
      imagen: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
      opinion: 'Caracoles bien hechos y hamburguesas serias en la carretera de Madrid. Sitio para ir con tiempo y reservar mesa los fines de semana.'
    },
    {
      nombre: 'HAN FU Barbacoa Coreana',
      tipo: 'Barbacoa coreana',
      direccion: 'C/ Tejares, 13, 02002 Albacete',
      coords: [38.9914786, -1.8535943],
      puntuacion: 8.8,
      imagen: 'https://images.unsplash.com/photo-1583187854833-1d0c2f9f2ba5?w=800&q=80',
      opinion: 'Barbacoa coreana de hacerte tú la carne en la mesa. El bulgogi de ternera marinado y el pollo picante con kimchi son un planazo en grupo. Sales oliendo a brasa y feliz.'
    },
    {
      nombre: 'La Yema',
      tipo: 'Bar',
      direccion: 'C/ Tejares, 17, 02002 Albacete',
      coords: [38.9914037, -1.8536421],
      puntuacion: 8,
      imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      opinion: 'Bar de barrio de los de toda la vida en Tejares. Tapa generosa con la caña, trato cercano y precios de otra época. De los que no fallan para un vermut de mediodía.'
    },
    {
      nombre: 'Delicias de Oriente',
      tipo: 'Asiática',
      direccion: 'Plaza Periodista Antonio Andújar, 16A, 02005 Albacete',
      coords: [38.9965647, -1.8584784],
      puntuacion: 8.2,
      imagen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
      opinion: 'Buffet asiático con muchísima variedad y rotación rápida, así que todo sale fresco. El pato a la naranja y los rollitos caseros son lo que más repetimos.'
    },
    {
      nombre: 'St. Patrick’s',
      tipo: 'Pub',
      direccion: 'Plaza Periodista Antonio Andújar, 1, 02001 Albacete',
      coords: [38.9963914, -1.8581910],
      puntuacion: 8.3,
      imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      opinion: 'Pub irlandés con tirada de cerveza seria y ambiente top los findes. La Guinness bien servida y las alitas picantes acompañan cualquier partido. Clásico del centro.'
    },
    {
      nombre: 'Gaia',
      tipo: 'Almuerzos',
      direccion: 'C/ Daoiz, 5, 02004 Albacete',
      coords: [38.9949735, -1.8698890],
      puntuacion: 8.6,
      imagen: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80',
      opinion: 'Almuerzos de cuchara y plato contundente sin pasarte de presupuesto. El bocadillo de panceta y el café con leche cumplen como el primer día. Sitio de currantes.'
    },
    {
      nombre: 'Kebab Estambul Gratinado',
      tipo: 'Kebab',
      direccion: 'C/ Feria, 121, 02004 Albacete',
      coords: [38.9961905, -1.8678108],
      puntuacion: 8.4,
      imagen: 'https://images.unsplash.com/photo-1548340748-6af6a29ca4e0?w=800&q=80',
      opinion: 'El kebab gratinado al horno marca la diferencia: queso fundido por encima y carne jugosa por dentro. Distinto a lo habitual y engancha. Buen tamaño por el precio.'
    },
    {
      nombre: 'Merendero San Ginés',
      tipo: 'Merendero',
      direccion: 'Camino de San Ginés, s/n, 02006 Albacete',
      coords: [38.9786913, -1.8638851],
      puntuacion: 8.5,
      imagen: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80',
      opinion: 'Merendero a las afueras ideal para gachas y migas con los amigos. Producto de la tierra, raciones generosas y sobremesa larga. Albacete manchego de verdad.'
    },
    {
      nombre: 'Loops',
      tipo: 'Dulce',
      direccion: 'C.C. Albacenter, C/ Alcalde Conangla, s/n, 02002 Albacete',
      coords: [38.9906841, -1.8463686],
      puntuacion: 8.1,
      imagen: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80',
      opinion: 'Donuts artesanos rellenos que entran solos. El de pistacho y el de Lotus son una perdición y el café acompaña. Capricho dulce en pleno Albacenter.'
    },
    {
      nombre: 'Alba Kebab',
      tipo: 'Kebab',
      direccion: 'C/ Cid, 45, 02002 Albacete',
      coords: [38.9913978, -1.8486137],
      puntuacion: 8,
      imagen: 'https://images.unsplash.com/photo-1548340748-6af6a29ca4e0?w=800&q=80',
      opinion: 'Kebab honrado en la calle Cid: carne marinada, salsas caseras y durum bien liado. Cumple a cualquier hora y el precio sigue siendo imbatible.'
    },
    {
      nombre: 'Khan Kebab',
      tipo: 'Kebab',
      direccion: 'C/ Octavio Cuartero, 53, 02003 Albacete',
      coords: [38.9922767, -1.8612153],
      puntuacion: 8.2,
      imagen: 'https://images.unsplash.com/photo-1548340748-6af6a29ca4e0?w=800&q=80',
      opinion: 'Cadena local que mantiene el nivel en todos sus puntos. Carne abundante, pan tierno y salsa de ajo seria. Para un antojo rápido va sobrado.'
    },
    {
      nombre: 'El Patio de la Mañica',
      tipo: 'Almuerzos',
      direccion: 'C/ A, 39, 02007 Albacete (Pol. Campollano)',
      coords: [39.0180935, -1.8779947],
      puntuacion: 8.7,
      imagen: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=80',
      opinion: 'Almuerzo de polígono de los buenos: plato del día abundante, postre casero y café por menos de lo que esperas. En Campollano es parada obligada.'
    },
    {
      nombre: 'MasterChef Kebab',
      tipo: 'Kebab',
      direccion: 'C/ María Marín, 40, 02003 Albacete',
      coords: [38.9896276, -1.8628356],
      puntuacion: 7.9,
      imagen: 'https://images.unsplash.com/photo-1548340748-6af6a29ca4e0?w=800&q=80',
      opinion: 'Kebab correcto en María Marín, con buena mano para las salsas. El durum mixto llena de sobra y el servicio es rápido. Cumple lo que promete.'
    },
    {
      nombre: 'Xpecado',
      tipo: 'Hamburguesas',
      direccion: 'C/ Gaona, 16, 02001 Albacete',
      coords: [38.9938640, -1.8533913],
      puntuacion: 8.6,
      imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
      opinion: 'Hamburguesas smash bien ejecutadas: pan brioche, carne jugosa y patatas crujientes. La de doble queso y bacon es un pecado, nunca mejor dicho.'
    },
    {
      nombre: 'El Filo de la Navaja',
      tipo: 'Restaurante',
      direccion: 'C/ Ríos Rosas, 5, 02004 Albacete',
      coords: [38.9938812, -1.8605292],
      puntuacion: 8.8,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Cocina de producto con puntos clavados. El arroz meloso y el rabo de toro están a un nivel alto. Carta corta pero todo bien pensado.'
    },
    {
      nombre: 'La Fresería',
      tipo: 'Heladería',
      direccion: 'C/ Rosario, 45, 02001 Albacete',
      coords: [38.9928881, -1.8573740],
      puntuacion: 8.4,
      imagen: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80',
      opinion: 'Helado artesano cremoso y fresa natural que se nota. El cucurucho de pistacho y los granizados salvan cualquier tarde de verano albaceteño.'
    },
    {
      nombre: 'La Mediterránea',
      tipo: 'Restaurante',
      direccion: 'C/ Feria, 6, 02005 Albacete',
      coords: [38.9958342, -1.8585762],
      puntuacion: 8.5,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Cocina mediterránea de mercado en plena Feria. Pescaíto fresco, arroces de los que repites y buen vino. Sitio fiable para una comida con tiempo.'
    },
    {
      nombre: 'Cuerda',
      tipo: 'Restaurante',
      direccion: 'C/ Gracia, 8, 02005 Albacete',
      coords: [39.0008883, -1.8632283],
      puntuacion: 8.7,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Propuesta moderna con producto local y presentaciones cuidadas. Los platos para compartir vuelan y la carta de vinos acompaña. Una grata sorpresa.'
    },
    {
      nombre: 'La Duna',
      tipo: 'Restaurante',
      direccion: 'Av. Arquitecto Julio Carrilero, 2, 02005 Albacete',
      coords: [39.0002357, -1.8617866],
      puntuacion: 8.6,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Ambiente top y cocina fusión que entra por los ojos y por la boca. El tartar y los bao bun son los fijos de la mesa. Para quedar bien, acierto seguro.'
    },
    {
      nombre: 'Burger Lab',
      tipo: 'Hamburguesas',
      direccion: 'C.C. Imaginalia, Av. de la Ilustración, 51, 02006 Albacete',
      coords: [39.0075632, -1.8799147],
      puntuacion: 8.9,
      imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
      opinion: 'Hamburguesas gourmet con carne madurada y combinaciones atrevidas que funcionan. La Lab con cebolla caramelizada es un must. De las mejores de la ciudad.'
    },
    {
      nombre: 'La Noguera',
      tipo: 'Dulce',
      direccion: 'C/ Zapateros, 8, 02001 Albacete',
      coords: [38.9952837, -1.8575263],
      puntuacion: 8.8,
      imagen: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80',
      opinion: 'La tarta de queso al horno es de las que recuerdas: cremosa por dentro, justa de dulzor. Obrador serio en Zapateros. El café también va fino.'
    },
    {
      nombre: 'Magna Casinos',
      tipo: 'Cafetería',
      direccion: 'Plaza Gabriel Lodares, 4, 02002 Albacete',
      coords: [38.9908092, -1.8564281],
      puntuacion: 8.2,
      imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      opinion: 'Cafetería de toda la vida en Lodares para desayunar como Dios manda. Tostada con tomate, buen café y terraza para ver pasar la mañana. Clásico que no falla.'
    },
    {
      nombre: 'Farah Kebab',
      tipo: 'Kebab',
      direccion: 'C/ María Marín, 34, 02003 Albacete',
      coords: [38.9891459, -1.8621015],
      puntuacion: 8.1,
      imagen: 'https://images.unsplash.com/photo-1548340748-6af6a29ca4e0?w=800&q=80',
      opinion: 'Kebab abundante y sabroso con salsas que pican lo justo. Varios puntos en la ciudad y siempre cumplen. El durum de pollo es apuesta segura.'
    },
    {
      nombre: 'Vibra Burger',
      tipo: 'Hamburguesas',
      direccion: 'Av. de la Mancha, 2, 02006 Albacete',
      coords: [39.0069063, -1.8691232],
      puntuacion: 8.5,
      imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
      opinion: 'Smash burgers con buen sello y patatas que enganchan. Local nuevo con buen rollo frente a la Ciudad de la Justicia. La doble con cheddar manda.'
    },
    {
      nombre: 'Titanic II',
      tipo: 'Restaurante',
      direccion: 'C/ Ríos Rosas, 102, 02004 Albacete',
      coords: [38.9884457, -1.8658566],
      puntuacion: 8.3,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Cocina casera de raciones generosas y precio amable. Las carnes a la brasa y el entrecot salen en su punto. Para comer mucho y bien sin complicarse.'
    },
    {
      nombre: 'Monumental',
      tipo: 'Cafetería',
      direccion: 'C/ Concepción, 33, 02002 Albacete',
      coords: [38.9931338, -1.8526450],
      puntuacion: 8,
      imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      opinion: 'Cafetería clásica en Concepción para un desayuno o una merienda tranquila. Bollería fresca, café correcto y servicio de barrio. Punto de encuentro de siempre.'
    },
    {
      nombre: 'Barra de Pintxos',
      tipo: 'Pintxos',
      direccion: 'Plaza del Altozano, 6, 02001 Albacete',
      coords: [38.9945341, -1.8545797],
      puntuacion: 8.6,
      imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      opinion: 'Pintxos variados y bien montados en pleno Altozano. La barra entra por los ojos y el de solomillo con foie es un fijo. Tapeo de pie del bueno.'
    },
    {
      nombre: 'El Águila',
      tipo: 'Tapeo',
      direccion: 'C/ Virgen del Pilar, 14, 02006 Albacete',
      coords: [39.0033821, -1.8670580],
      puntuacion: 8.2,
      imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      opinion: 'Tapeo de barrio honesto con buena tapa de regalo. Las bravas y el lomo a la plancha acompañan la caña perfecta. Sin postureo, solo bueno y barato.'
    },
    {
      nombre: 'Anubis Coctelería',
      tipo: 'Coctelería',
      direccion: 'Plaza del Altozano, 6, 02001 Albacete',
      coords: [38.9946557, -1.8545463],
      puntuacion: 8.5,
      imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      opinion: 'Coctelería con combinados de autor bien equilibrados y ambiente cuidado. El gin-tonic de la casa y los premium para empezar la noche fino.'
    },
    {
      nombre: 'Princesa Maya',
      tipo: 'Mexicana',
      direccion: 'C/ Mayor, 55, 02002 Albacete',
      coords: [38.9930045, -1.8537636],
      puntuacion: 8.4,
      imagen: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
      opinion: 'Mexicano auténtico con tacos al pastor jugosos y guacamole recién hecho. La margarita acompaña y el picante es de verdad. Fiesta para el paladar.'
    },
    {
      nombre: 'Ramen Kagura',
      tipo: 'Asiática',
      direccion: 'C/ Salamanca, 7, 02001 Albacete',
      coords: [38.9953677, -1.8527723],
      puntuacion: 8.6,
      imagen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
      opinion: 'Ramen de caldo trabajado durante horas, fideos al punto y chashu que se deshace. El tonkotsu es de los mejores de Albacete. Cuenco que reconforta.'
    },
    {
      nombre: 'Don Cardenal',
      tipo: 'Dulce',
      direccion: 'C/ Torres Quevedo, 14, 02003 Albacete',
      coords: [38.9928416, -1.8601268],
      puntuacion: 8.7,
      imagen: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80',
      opinion: 'Pastelería de las de vitrina que te hace dudar. Los miguelitos y las tartas por encargo son de matrícula. Tradición repostera albaceteña en estado puro.'
    },
    {
      nombre: 'La Tía Juana',
      tipo: 'Mexicana',
      direccion: 'C/ Tejares, 16, 02002 Albacete',
      coords: [38.9914887, -1.8538753],
      puntuacion: 8.3,
      imagen: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
      opinion: 'Mexicano con nachos cargados y burritos que llenan de sobra. Ambiente animado en Tejares y margaritas para acompañar. Para ir en grupo, ideal.'
    },
    {
      nombre: 'Heladería Piaccere',
      tipo: 'Heladería',
      direccion: 'C/ Concepción, 10, 02002 Albacete',
      coords: [38.9941740, -1.8551792],
      puntuacion: 8.5,
      imagen: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80',
      opinion: 'Helado artesano italiano con sabores que cambian según temporada. El stracciatella y el de avellana están de cine. Cucurucho obligado paseando por el centro.'
    },
    {
      nombre: 'Seven Joy',
      tipo: 'Asiática',
      direccion: 'C/ Municipio de Molinicos, 7, 02006 Albacete',
      coords: [39.0084841, -1.8727780],
      puntuacion: 8.6,
      imagen: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
      opinion: 'Sushi fresco y buffet con muchísima variedad junto a Imaginalia. Los makis crujientes y el salmón flameado son los fijos. Calidad y cantidad muy bien resueltas.'
    },
    {
      nombre: 'Luzia Gastrobar',
      tipo: 'Gastrobar',
      direccion: 'Paseo de la Cuba, 33, 02005 Albacete',
      coords: [39.0043558, -1.8591934],
      puntuacion: 8.7,
      imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      opinion: 'Gastrobar con tapas de autor y producto de temporada en el Paseo de la Cuba. El steak tartar y las croquetas cremosas marcan nivel. Para picar fino.'
    },
    {
      nombre: 'Panadería Esparcia',
      tipo: 'Panadería',
      direccion: 'Camino de la Virgen, 41, 02005 Albacete',
      coords: [39.0006256, -1.8674521],
      puntuacion: 8.5,
      imagen: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80',
      opinion: 'Pan de masa madre de verdad y bollería que huele a horno desde la calle. La barra rústica y los croissants son un clásico. Panadería de confianza.'
    },
    {
      nombre: 'Restaurante +Ideas',
      tipo: 'Restaurante',
      direccion: 'Av. de la Libertad, 3, 02694 Higueruela',
      coords: [38.9626090, -1.4437340],
      puntuacion: 8.6,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Vale la escapada a Higueruela: cocina con producto de la tierra y platos de cuchara que reconfortan. Las migas y el cordero salen serios. Trato familiar.'
    },
    {
      nombre: 'Cañitas Maite',
      tipo: 'Cocina creativa',
      direccion: 'C/ Tomás Pérez Úbeda, 6, 02200 Casas-Ibáñez',
      coords: [39.2873459, -1.4694905],
      puntuacion: 9.4,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Alta cocina de Javier Sanz y Juan Sahuquillo, dos estrellas Michelin que se entienden en cada bocado. Menú degustación de los que se recuerdan durante años. Templo gastronómico de la provincia.'
    },
    {
      nombre: 'Tapería Da Vinci 19',
      tipo: 'Tapeo',
      direccion: 'C/ La Paz, 16, 02200 Casas-Ibáñez',
      coords: [39.2863767, -1.4727785],
      puntuacion: 8.6,
      imagen: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
      opinion: 'Tapería con producto serio y tapas creativas en Casas-Ibáñez. Mayte y su equipo te tratan de lujo. La croqueta y el atún rojo merecen el viaje.'
    },
    {
      nombre: 'Miguelitos Ruiz',
      tipo: 'Dulce',
      direccion: 'Zona Ind. el Amanecer, Autovía de Alicante, 02630 La Roda',
      coords: [39.1988328, -2.1412242],
      puntuacion: 8.8,
      imagen: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&q=80',
      opinion: 'El miguelito de La Roda en su salsa: hojaldre crujiente y crema infinita. Fábrica con tienda donde caen recién hechos. Imposible parar en uno.'
    },
    {
      nombre: 'Las Mariquillas del Río Júcar',
      tipo: 'Restaurante',
      direccion: 'Valdeganga (Albacete), junto al río Júcar, 02150',
      coords: [39.1363820, -1.7476610],
      puntuacion: 8.7,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Comer junto al Júcar con gachas, ajoarriero y pescado de río. Entorno espectacular y cocina manchega de la buena. Escapada redonda desde Albacete.'
    },
    {
      nombre: 'Casa Juanjo',
      tipo: 'Restaurante',
      direccion: 'Av. Castilla, 12, 16230 Villanueva de la Jara',
      coords: [39.4397773, -1.9484167],
      puntuacion: 8.5,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Cocina manchega abundante y bien hecha en Villanueva de la Jara. El cordero y las migas con tropezones cumplen de sobra. Trato cercano de pueblo.'
    },
    {
      nombre: 'Babilonia Club',
      tipo: 'Hamburguesas',
      direccion: 'Av. Eugenio Martínez, 48, 16239 Casasimarro',
      coords: [39.3978691, -2.0362799],
      puntuacion: 8.3,
      imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
      opinion: 'Hamburguesas serias con música en directo en Casasimarro. Plan completo: cenas bien y te quedas a la fiesta. La burger con bacon y el ambiente mandan.'
    },
    {
      nombre: 'El Buen Paladar',
      tipo: 'Colombiana',
      direccion: 'C/ Luis de Góngora, s/n, 30011 Murcia',
      coords: [37.9779816, -1.1252981],
      puntuacion: 8.4,
      imagen: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
      opinion: 'Cocina colombiana auténtica: bandeja paisa que alimenta para el día entero y arepas recién hechas. Sabor casero y porciones de campeonato. Sorpresa en Murcia.'
    },
    {
      nombre: 'The VicBros Burger',
      tipo: 'Hamburguesas',
      direccion: 'Carrer lo Torrent, 1, 03690 San Vicente del Raspeig (Alicante)',
      coords: [38.3946073, -0.5144098],
      puntuacion: 8.8,
      imagen: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
      opinion: 'Smash burgers de las que crean afición: carne jugosa, queso fundido y pan brioche tostado. Merece el desvío a San Vicente. La doble bacon es ley.'
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
    if (score)   score.textContent = (typeof r.puntuacion === 'number')
                                        ? r.puntuacion.toFixed(1) + ' / 10'
                                        : r.puntuacion;
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
