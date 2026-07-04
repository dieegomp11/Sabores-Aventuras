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

  // Datos de sitios del mapa (nombre, categoría, dirección, coordenadas,
  // miniatura del vídeo, enlace a TikTok y descripción de lo probado).
  const restaurantes = [
  {
    "nombre": "Ditaly",
    "tipo": "Restaurante",
    "direccion": "C. Madres de la Pl. de Mayo, 1, 02002 Albacete",
    "coords": [
      38.991918,
      -1.853258
    ],
    "imagen": "Miniaturas/Ditaly.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7364325261380193569",
    "opinion": "Pizza de las de verdad, con masa que se deja querer. De los sitios a los que apetece volver un viernes."
  },
  {
    "nombre": "Pepico del tío Ginés",
    "tipo": "Bar",
    "direccion": "C. Ruipérez, 4, 30005 Murcia",
    "coords": [
      37.9848849,
      -1.1333607
    ],
    "imagen": "Miniaturas/PepicoTioGines.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7370370549324844320",
    "opinion": "La marinera y el caballito que mandan en Murcia. Barra de toda la vida: caña, tapa y a ser feliz."
  },
  {
    "nombre": "Barú",
    "tipo": "Cafetería",
    "direccion": "P.º la Libertad, 17, 02001 Albacete",
    "coords": [
      38.9961956,
      -1.8526658
    ],
    "imagen": "Miniaturas/Baru.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7373378618342477088",
    "opinion": "Café serio, croissant crujiente y un New York Roll que quita las penas. Rincón perfecto para desconectar."
  },
  {
    "nombre": "Dolomiti",
    "tipo": "Pizzería",
    "direccion": "C. Alarcón, 2, 02002 Albacete",
    "coords": [
      38.98728,
      -1.8524117
    ],
    "imagen": "Miniaturas/Dolomiti.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7381444366478593312",
    "opinion": "Tabla de quesos, ensalada Dolomiti y su pizza de la casa. Vinimos a por la pizza y nos quedamos con todo."
  },
  {
    "nombre": "Tasca La Feria",
    "tipo": "Bar",
    "direccion": "Paseo de la Feria, Albacete",
    "coords": [
      38.9967146,
      -1.8667424
    ],
    "imagen": "Miniaturas/TascaFeria.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7382530887839141153",
    "opinion": "Caracoles, mancheguito, tigres, oreja, rabo y queso frito. Tapeo de feria del que no se olvida."
  },
  {
    "nombre": "Boulangerie",
    "tipo": "Panadería",
    "direccion": "C/ Feria, 115, 02004 Albacete",
    "coords": [
      38.9962367,
      -1.8672963
    ],
    "imagen": "Miniaturas/Boulangerie.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7386265453758385441",
    "opinion": "Croissants de pistacho, de mantequilla y de almendra recién hechos. Huele a horno desde la puerta."
  },
  {
    "nombre": "Bell's Cookies",
    "tipo": "Cafetería",
    "direccion": "C. del Conde de Peñalver, 66, Salamanca, 28006 Madrid",
    "coords": [
      40.4314106,
      -3.6748618
    ],
    "imagen": "Miniaturas/BellsCookied.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7391420696691313953",
    "opinion": "Cookies chunk, de tarta de queso y de cacahuete. Merienda seria para golosos serios."
  },
  {
    "nombre": "Tasca Javi",
    "tipo": "Bar",
    "direccion": "Paseo de la Feria, Albacete",
    "coords": [
      38.9966601,
      -1.8647999
    ],
    "imagen": "Miniaturas/TascaJavi.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7392598653782756641",
    "opinion": "Caracoles, bravas, calamares, oreja y queso frito. Tasca honesta de caña y tapa que nunca falla."
  },
  {
    "nombre": "Kaiten Sushi",
    "tipo": "Sushi",
    "direccion": "C. de San Bernardo, 10, Centro, 28015 Madrid",
    "coords": [
      40.4219987,
      -3.7076168
    ],
    "imagen": "Miniaturas/KaitenSushi.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7394006104860003616",
    "opinion": "Ensalada japonesa, gyozas, nigiris y pollo al limón. Sushi en cinta que entretiene y cumple."
  },
  {
    "nombre": "La Monda Lironda",
    "tipo": "Bar",
    "direccion": "C. Vienne, 1, 02005 Albacete",
    "coords": [
      39.007035,
      -1.8681204
    ],
    "imagen": "Miniaturas/MondaLironda.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7398143205717331232",
    "opinion": "Bravas, queso frito, croquetas y chusmarro manchego. Tapeo de barrio del bueno."
  },
  {
    "nombre": "La Bahía",
    "tipo": "Restaruante",
    "direccion": "C/ de Sant Pere, 17, 03700 Dénia, Alicante",
    "coords": [
      38.8450292,
      0.1085086
    ],
    "imagen": "Miniaturas/LaBahia.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7403649380303064352",
    "opinion": "Fritura, tortitas de camarones y cazón en adobo. Sabor a sur sin salir de Albacete."
  },
  {
    "nombre": "El Envero",
    "tipo": "Bar",
    "direccion": "C. Herreros, 51, 02001 Albacete",
    "coords": [
      38.9922925,
      -1.8485872
    ],
    "imagen": "Miniaturas/Envero.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7410825558197751073",
    "opinion": "La bomba de queso, bravas y brochetas. Ambiente honesto, precio majo y ganas de volver."
  },
  {
    "nombre": "Hype",
    "tipo": "Hamburgueseria",
    "direccion": "C. Concepción, 35, 02002 Albacete",
    "coords": [
      38.9930577,
      -1.8524776
    ],
    "imagen": "Miniaturas/Hype.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7411493327033371936",
    "opinion": "Su Hyped Chicken, alitas en salsa kimchi y hamburguesas con descaro. Pollo frito del que engancha."
  },
  {
    "nombre": "Catacaldos",
    "tipo": "Restaurante",
    "direccion": "C. Padre Pascual Suárez, 2, 02002 Albacete",
    "coords": [
      38.98889,
      -1.8532489
    ],
    "imagen": "Miniaturas/Catacaldos.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7414500904239385888",
    "opinion": "Milhoja de berenjena y canelón de pato confitado. Producto de verdad y buena mano."
  },
  {
    "nombre": "La Negrita",
    "tipo": "Hamburgueseria",
    "direccion": "C. Parra, 4, La Zona, 02002 Albacete",
    "coords": [
      38.9912874,
      -1.8533625
    ],
    "imagen": "Miniaturas/Negrita.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7424119456240061729",
    "opinion": "Arepas, empanadilla caribeña, patacón y hamburguesas. Sabor caribeño con mucho ritmo."
  },
  {
    "nombre": "Tapería Frida",
    "tipo": "Restaurante paises variados",
    "direccion": "C. José Isbert, 7, 02001 Albacete",
    "coords": [
      38.9969289,
      -1.8495893
    ],
    "imagen": "Miniaturas/Frida.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7424807094722874656",
    "opinion": "Tapas que viajan: Portugal, México y Perú en una misma mesa. Cocina viajera para sentarse con tiempo."
  },
  {
    "nombre": "Taberna Motivos",
    "tipo": "Restaurante",
    "direccion": "C. Jesús Nazareno, 6, 02002 Albacete",
    "coords": [
      38.9909194,
      -1.85367
    ],
    "imagen": "Miniaturas/Motivos.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7431868043761929505",
    "opinion": "Croquetas de las mejores de la ciudad, huevos rotos y fideuá de secreto. Punto."
  },
  {
    "nombre": "Don Cardenal",
    "tipo": "Pastelería",
    "direccion": "C. Torres Quevedo, 14, 02003 Albacete",
    "coords": [
      38.9928416,
      -1.8601268
    ],
    "imagen": "Miniaturas/DonCardenal.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7434857646060096801",
    "opinion": "Pasteles de tiramisú, red velvet y de Oreo. Obrador de los de siempre, vitrina de las que hacen dudar."
  },
  {
    "nombre": "Panadería Esparcia",
    "tipo": "Panadería",
    "direccion": "Cam. la Virgen, 41, 02005 Albacete",
    "coords": [
      39.0006256,
      -1.8674521
    ],
    "imagen": "Miniaturas/Esparcia.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7442246568809401632",
    "opinion": "Su toña es de las que se compran dos por si acaso. Panadería de toda la vida."
  },
  {
    "nombre": "Himawari Ramen",
    "tipo": "Ramen",
    "direccion": "C. Dionisio Guardiola, 34, 02003 Albacete",
    "coords": [
      38.9924969,
      -1.8585844
    ],
    "imagen": "Miniaturas/Himawari.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7447067503055981856",
    "opinion": "Gamba furai, takoyaki y ramen de caldo trabajado. Producto fresco y bien tratado."
  },
  {
    "nombre": "Alba Kebab",
    "tipo": "Kebab",
    "direccion": "C. Cid, 45, b, 02002 Albacete",
    "coords": [
      38.9913978,
      -1.8486137
    ],
    "imagen": "Miniaturas/AlbaKebab.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7450088833489571104",
    "opinion": "Dürüm, pita y pizza kebab sin postureo. Nada de kebab de turismo: de los que repites."
  },
  {
    "nombre": "Delicias de Oriente",
    "tipo": "Pasteleria",
    "direccion": "Pl. Periodista Antonio Andújar, 16, 02005 Albacete",
    "coords": [
      38.9965647,
      -1.8584784
    ],
    "imagen": "Miniaturas/DeliciasOriente.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7463410582184594710",
    "opinion": "Desayuno beldi y fassi como en Marrakech. Dulce árabe que te teletransporta."
  },
  {
    "nombre": "Masterchef Kebab",
    "tipo": "Kebab",
    "direccion": "C. María Marín, 40, 02003 Albacete",
    "coords": [
      38.9896276,
      -1.8628356
    ],
    "imagen": "Miniaturas/Masterchef.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7467513045762313495",
    "opinion": "Patatas gratinadas y pan de pita con queso. Para un antojo a cualquier hora."
  },
  {
    "nombre": "Princesa Maya",
    "tipo": "Restaurante",
    "direccion": "C. Mayor, 55, 02001 Albacete",
    "coords": [
      38.9930045,
      -1.8537636
    ],
    "imagen": "Miniaturas/PrincesaMaya.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7468259887844183318",
    "opinion": "Nachos Maya, tacos gobernador y taco de cochinita. México auténtico en plena calle Mayor."
  },
  {
    "nombre": "Seven Joy",
    "tipo": "Sushi",
    "direccion": "C. Municipio de Molinicos, 7, 02006 Albacete",
    "coords": [
      39.0084841,
      -1.872778
    ],
    "imagen": "Miniaturas/SevenJoy.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7468993406878911746",
    "opinion": "Bao de pato, pulpitos, ternera al sake, gyozas y nigiris. Asiático que sorprende en Albacete."
  },
  {
    "nombre": "Milanga Love",
    "tipo": "Argentino",
    "direccion": "Av. Arquitecto Julio Carrilero, 40, 02005 Albacete",
    "coords": [
      38.9984937,
      -1.8653767
    ],
    "imagen": "Miniaturas/MilangaLove.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7469728861006105879",
    "opinion": "Empanadas argentinas y milanesas de matrícula. Cocina porteña honesta y sin pretensiones."
  },
  {
    "nombre": "Burger Lab",
    "tipo": "Hamburgueseria",
    "direccion": "Av. de la Ilustración, 51, 02006 Albacete",
    "coords": [
      39.0075632,
      -1.8799147
    ],
    "imagen": "Miniaturas/BurgerLab.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7470494558812507415",
    "opinion": "Costillar y las hamburguesas Geisha y Muerte by Cheese. Los nombres prometen y cumplen."
  },
  {
    "nombre": "Hoy Sushi",
    "tipo": "Sushi",
    "direccion": "C/ Feria, 73, 02004 Albacete",
    "coords": [
      38.9962129,
      -1.8639267
    ],
    "imagen": "Miniaturas/HoySushi.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7472709873575251222",
    "opinion": "Carpaccio de atún, gyozas, jackimeshi y su ternera Hoy. Buffet japonés que va en serio."
  },
  {
    "nombre": "La Bechamel",
    "tipo": "Restaurante",
    "direccion": "C. Guzmán el Bueno, 4, 02002 Albacete",
    "coords": [
      38.9918908,
      -1.8531533
    ],
    "imagen": "Miniaturas/LaBechamel.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7473462574764461334",
    "opinion": "Buñuelo de queso, bollito de chorizo y la croqueta campeona de España 2023. Alta cocina que se entiende."
  },
  {
    "nombre": "Khan Kebab",
    "tipo": "Kebab",
    "direccion": "P.º Circunvalación, 91, 02003 Albacete",
    "coords": [
      38.9868403,
      -1.8658556
    ],
    "imagen": "Miniaturas/KhanKebab.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7474183084879957270",
    "opinion": "Patatas gratinadas, pizza kebab y rollo doble con queso. Kebab contundente del que mancha."
  },
  {
    "nombre": "Filo de la Navaja",
    "tipo": "Bar",
    "direccion": "C. Ríos Rosas, 5, 02004 Albacete",
    "coords": [
      38.9938812,
      -1.8605292
    ],
    "imagen": "Miniaturas/FiloNavaja.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7474940351774575894",
    "opinion": "Cascos de patata, bacalao rebozado, ajo mataero, oreja y queso frito. Tapeo albaceteño en estado puro."
  },
  {
    "nombre": "Taha Turk",
    "tipo": "Kebab",
    "direccion": "Av. Ramón Menéndez Pidal, 40, 02005 Albacete",
    "coords": [
      39.0022637,
      -1.8636986
    ],
    "imagen": "Miniaturas/TahaTurk.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7477556003970616598",
    "opinion": "Box al horno, kebab de pita y su súper dürüm. Para un antojo a cualquier hora."
  },
  {
    "nombre": "Dallas",
    "tipo": "Restaurnate",
    "direccion": "Pl. Maestro Chueca, 13, 02005 Albacete",
    "coords": [
      39.0021291,
      -1.866576
    ],
    "imagen": "Miniaturas/Dallas.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7482011167100062998",
    "opinion": "Croquetas, gazpachos manchegos, bravas y solomillo de ternera. Clásico del barrio El Pilar."
  },
  {
    "nombre": "Casa Juanjo",
    "tipo": "Restaurante",
    "direccion": "Av. Castilla, 12, 16230 Villanueva de la Jara, Cuenca",
    "coords": [
      39.4397773,
      -1.9484167
    ],
    "imagen": "Miniaturas/CasaJuanjo.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7483125478241389846",
    "opinion": "Pulpo bien tratado y su hamburguesa Diosa. Cocina para sentarse con tiempo en Villanueva de la Jara."
  },
  {
    "nombre": "Farah",
    "tipo": "Kebab",
    "direccion": "C. María Marín, 34, 02003 Albacete",
    "coords": [
      38.9891459,
      -1.8621015
    ],
    "imagen": "Miniaturas/Farah.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7486461667522481430",
    "opinion": "Alitas, kebab de pita y rollo gratinado. Cumple a cualquier hora y a buen precio."
  },
  {
    "nombre": "Mesón de la Sierra",
    "tipo": "Restaurante",
    "direccion": "Lugar Aldea Fuente Higuera, 0 S/N, 02440 Molinicos, Albacete",
    "coords": [
      38.494542,
      -2.242612
    ],
    "imagen": "Miniaturas/MesonSierra.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7489419512786275606",
    "opinion": "Sopa, alcachofas con jamón y ensalada manchega. Cocina serrana de la que reconforta."
  },
  {
    "nombre": "Titanic II",
    "tipo": "Bar",
    "direccion": "C. Ríos Rosas, 102, 02004 Albacete",
    "coords": [
      38.9884457,
      -1.8658566
    ],
    "imagen": "Miniaturas/Titanic.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7491644144012578070",
    "opinion": "Empanadas, papas locas, nachos y costillar BBQ. Raciones generosas para ir en grupo."
  },
  {
    "nombre": "Piacere",
    "tipo": "Heladeria",
    "direccion": "c/Concepción 10, Albacete",
    "coords": [
      38.994174,
      -1.8551792
    ],
    "imagen": "Miniaturas/Piacere.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7493866071053716758",
    "opinion": "Helados de pistacho, de miguelito y de tiramisú de mango. Artesano del que sabe a de verdad."
  },
  {
    "nombre": "Keiji by Joel",
    "tipo": "Sushi",
    "direccion": "C. Cruz, 1, 02001 Albacete",
    "coords": [
      38.9940662,
      -1.8515342
    ],
    "imagen": "Miniaturas/Keiji.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7499054160239709462",
    "opinion": "Gyoza de rabo de toro, tabla de uramakis y nigiris. Nikkei con cabeza y producto serio."
  },
  {
    "nombre": "Ramen Kagura",
    "tipo": "Ramen",
    "direccion": "C. Salamanca, 7, 02001 Albacete",
    "coords": [
      38.9953677,
      -1.8527723
    ],
    "imagen": "Miniaturas/Kagura.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7504631008168316182",
    "opinion": "Gyozas Kaoru, karaage y su Tokyo Soba Tower. Cuenco que reconforta en cualquier época."
  },
  {
    "nombre": "Loops",
    "tipo": "Cafeteria",
    "direccion": "C. Alcalde Conangla, Centro comercial Albacenter Local B02, 02006 Albacete",
    "coords": [
      38.9906841,
      -1.8463686
    ],
    "imagen": "Miniaturas/Loops.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7508343785953299734",
    "opinion": "Donuts artesanos rellenos que entran solos. Parada dulce obligada en Albacenter."
  },
  {
    "nombre": "Oleana",
    "tipo": "Restaruante",
    "direccion": "C. Caba, 23, 02001 Albacete",
    "coords": [
      38.993509,
      -1.8592978
    ],
    "imagen": "Miniaturas/Oleana.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7510195931451510038",
    "opinion": "Bravas, oreja crujiente, huevos rotos y arroz a la llauna. Con carta sin gluten de verdad."
  },
  {
    "nombre": "La Noguera",
    "tipo": "Cafeteria",
    "direccion": "C. Zapateros, 8, 02001 Albacete",
    "coords": [
      38.9952837,
      -1.8575263
    ],
    "imagen": "Miniaturas/LaNoguera.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7513535205496409366",
    "opinion": "Su tarta de queso es de las que se recuerdan. Obrador serio en la calle Zapateros."
  },
  {
    "nombre": "Tsuruta Ramen",
    "tipo": "Ramen",
    "direccion": "C. Rosario, 4, Loc, 02001 Albacete",
    "coords": [
      38.9954094,
      -1.8554548
    ],
    "imagen": "Miniaturas/Tsuruta.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7515401126993218838",
    "opinion": "Gyozas, wantón frito, bao de pato y combo de chicken curry. Producto fresco y bien tratado."
  },
  {
    "nombre": "Brocata",
    "tipo": "Bar",
    "direccion": "C. Hermanos Jiménez, 3, 02004 Albacete",
    "coords": [
      38.9960051,
      -1.8673686
    ],
    "imagen": "Miniaturas/Brocata.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7517265377219513602",
    "opinion": "Patatas Bro, sándwich japonés y el bocata Brocata. Una de las aperturas del año."
  },
  {
    "nombre": "Barra Pintxos",
    "tipo": "Bar",
    "direccion": "Pl. Altozano, 6, 02001 Albacete",
    "coords": [
      38.9945341,
      -1.8545797
    ],
    "imagen": "Miniaturas/BarraPintxos.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7525077948311915798",
    "opinion": "Ensalada de burrata y brioches de carrillera y de rabo de toro. Pintxos finos en pleno Altozano."
  },
  {
    "nombre": "Monumental",
    "tipo": "Restaurante",
    "direccion": "C. Concepción, 33, 02002 Albacete",
    "coords": [
      38.9931338,
      -1.852645
    ],
    "imagen": "Miniaturas/Monumental.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7537657869064260886",
    "opinion": "Flor de alcachofa, berenjena, canelón de bogavante y tataki de atún. Producto de verdad y buena mano."
  },
  {
    "nombre": "Kebab Estambul",
    "tipo": "Kebab",
    "direccion": "C/ Feria, 121, 02004 Albacete",
    "coords": [
      38.9961905,
      -1.8678108
    ],
    "imagen": "Miniaturas/Estambul.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7543595743005756694",
    "opinion": "Box gratinado y rollo gratinado con queso fundido. Distinto a lo habitual y engancha."
  },
  {
    "nombre": "Xpecado",
    "tipo": "Hamburgueseria",
    "direccion": "C. Gaona, 16, 02001 Albacete",
    "coords": [
      38.993864,
      -1.8533913
    ],
    "imagen": "Miniaturas/Xpecado.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7582593484482301206",
    "opinion": "Alitas Kentucky y smash burgers con buen sello. Un pecado, nunca mejor dicho."
  },
  {
    "nombre": "La Tía Juana",
    "tipo": "Mexicano",
    "direccion": "C. Tejares, 16, 02002 Albacete",
    "coords": [
      38.9914887,
      -1.8538753
    ],
    "imagen": "Miniaturas/TiaJuana.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7568859402799762710",
    "opinion": "El Chacaloso, El Mentiroso, tacos al pastor y birria. Fiesta mexicana en la calle Tejares."
  },
  {
    "nombre": "Vibra",
    "tipo": "Hamburgueseria",
    "direccion": "Av. la Mancha, 2, 02005 Albacete",
    "coords": [
      39.0069063,
      -1.8691232
    ],
    "imagen": "Miniaturas/Vibra.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7574787284071910678",
    "opinion": "Hamburguesas de carne madurada con buen sello. Smash del que engancha."
  },
  {
    "nombre": "La Yema",
    "tipo": "Bar",
    "direccion": "C. Tejares, 17, 02002 Albacete",
    "coords": [
      38.9914037,
      -1.8536421
    ],
    "imagen": "Miniaturas/LaYema.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7577379243672243479",
    "opinion": "Tortillas y croquetas de las de siempre. Tapeo de barrio del bueno."
  },
  {
    "nombre": "St. Patrick's",
    "tipo": "Bar",
    "direccion": "Pl. Periodista Antonio Andújar, 1, 02001 Albacete",
    "coords": [
      38.9963914,
      -1.858191
    ],
    "imagen": "Miniaturas/StPatricks.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7594836839555452182",
    "opinion": "Almuerzo de bocadillo y buena cerveza. Pub clásico del centro que nunca falla."
  },
  {
    "nombre": "+Ideas",
    "tipo": "Restaurante",
    "direccion": "Av. de la Libertad, 3, 02694 Higueruela, Albacete",
    "coords": [
      38.962609,
      -1.443734
    ],
    "imagen": "Miniaturas/+ideas.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7603267260672789782",
    "opinion": "Trampantojo, atascaburras, chupa-chups de queso de cabra y lomo de orza. Merece la escapada a Higueruela."
  },
  {
    "nombre": "La Duna",
    "tipo": "Bar",
    "direccion": "Av. Arquitecto Julio Carrilero, 2, 02005 Albacete",
    "coords": [
      39.0002357,
      -1.8617866
    ],
    "imagen": "Miniaturas/Duna.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7613378635327655171",
    "opinion": "Croqueta de carrillera, pan bao y queso frito con chocolate blanco. Atrevido y funciona."
  },
  {
    "nombre": "El Patio de la Mañica",
    "tipo": "Bar",
    "direccion": "C. A, 39, 02007 Albacete",
    "coords": [
      39.0180935,
      -1.8779947
    ],
    "imagen": "Miniaturas/PatioManica.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7616047679554047254",
    "opinion": "Almuerzos con su bocadillo Baturro. De polígono: abundante y a buen precio."
  },
  {
    "nombre": "Alboroque",
    "tipo": "Cafeteria",
    "direccion": "Pq. Emp. Campollano, Calle C, 16, 02007 Albacete",
    "coords": [
      39.0120965,
      -1.8785972
    ],
    "imagen": "Miniaturas/Alboroque.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7618357343583079702",
    "opinion": "El chivito de Campollano: almuerzo trabajador que no falla nunca."
  },
  {
    "nombre": "El Águila",
    "tipo": "Bar",
    "direccion": "C. Virgen del Pilar, 14, 02006 Albacete",
    "coords": [
      39.0033821,
      -1.867058
    ],
    "imagen": "Miniaturas/ElAguila.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7621588001725975830",
    "opinion": "Almuerzos con bocadillo personalizado. Tapeo de barrio honesto."
  },
  {
    "nombre": "La Fresería",
    "tipo": "Cafeteria",
    "direccion": "C. Rosario, 45, 02001 Albacete",
    "coords": [
      38.9928881,
      -1.857374
    ],
    "imagen": "Miniaturas/Freseria.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7622978413870976278",
    "opinion": "Vasos de fresas con nata y fuente de chocolate. Parada dulce que salva cualquier tarde."
  },
  {
    "nombre": "Magna Casino",
    "tipo": "Restaurante",
    "direccion": "Pl. Gabriel Lodares, 4, 02002 Albacete",
    "coords": [
      38.9908092,
      -1.8564281
    ],
    "imagen": "Miniaturas/MagnaCasino.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7626296791662693654",
    "opinion": "Hamburguesas Korean Krupier y Full Dry. Apuesta segura, nunca mejor dicho."
  },
  {
    "nombre": "Royal Kebab",
    "tipo": "Kebab",
    "direccion": "C. Arquitecto Vandelvira, 40, 02003 Albacete",
    "coords": [
      38.9886068,
      -1.8636226
    ],
    "imagen": "Miniaturas/RoyalKebab.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7628888511986388246",
    "opinion": "Box gratinado, pan de pita y rollo gratinado. Kebab de los que repites."
  },
  {
    "nombre": "Cuerda",
    "tipo": "Restaurante",
    "direccion": "C. Gracia, 8, 02005 Albacete",
    "coords": [
      39.0008883,
      -1.8632283
    ],
    "imagen": "Miniaturas/Cuerda.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7634139059073355010",
    "opinion": "Panipuri de ajo blanco, crème brûlée y tiramisú de bacalao. Cocina que juega y gana."
  },
  {
    "nombre": "Han Fu",
    "tipo": "Coreano",
    "direccion": "C. Tejares, 13, 02002 Albacete",
    "coords": [
      38.9914786,
      -1.8535943
    ],
    "imagen": "Miniaturas/HanFu.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7639653883337329942",
    "opinion": "Te montas el plato a tu gusto: panceta en salsa coreana, sashimi y nigiri de atún. Barbacoa coreana para ir en grupo."
  },
  {
    "nombre": "Las Mariquillas",
    "tipo": "Restaurante",
    "direccion": "Casa de las Mariquillas, B-4, km. 1, 5, 02150 Albacete",
    "coords": [
      39.136382,
      -1.747661
    ],
    "imagen": "Miniaturas/Mariquillas.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7644170362040683778",
    "opinion": "Pisto, patatas al montón, huevo y chuletas de cordero. Manchego de verdad junto al Júcar."
  },
  {
    "nombre": "Luzia",
    "tipo": "Restaurante",
    "direccion": "P.º la Cuba, 33, 02005 Albacete",
    "coords": [
      39.0043558,
      -1.8591934
    ],
    "imagen": "Miniaturas/Luzia.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7644918731012836630",
    "opinion": "Oreja melosa, taco de cochinita pibil y calamar a la andaluza. Producto de verdad y buena mano."
  },
  {
    "nombre": "Tartas Julita",
    "tipo": "Pasteleria",
    "direccion": "Pl. Mayor, 02001 Albacete",
    "coords": [
      38.9948409,
      -1.85724
    ],
    "imagen": "Miniaturas/TartasJulita.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7649763547349568790",
    "opinion": "Tarta de queso con miguelito y tarta de crema catalana. Obrador casero de los de siempre."
  },
  {
    "nombre": "Babilonia",
    "tipo": "Hamburgueseria",
    "direccion": "Av. Eugenio Martínez, 48, 16239 Casasimarro, Cuenca",
    "coords": [
      39.3978691,
      -2.0362799
    ],
    "imagen": "Miniaturas/Babilonia.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7652288139804855574",
    "opinion": "Su hamburguesa Shelby, con costilla de cerdo y vaca gallega. Cena y fiesta en Casasimarro."
  },
  {
    "nombre": "Merendero La Jaula",
    "tipo": "Bar",
    "direccion": "N-322, Km. 2, 1, 02006 Albacete",
    "coords": [
      38.9887011,
      -1.8819093
    ],
    "imagen": "Miniaturas/LaJaula.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7654898496847367446",
    "opinion": "Queso frito, croquetas, chuletón y carne a la brasa. Merendero de sobremesa larga."
  },
  {
    "nombre": "La Mediterránea",
    "tipo": "Restaurante",
    "direccion": "C/ Feria, 6, 02005 Albacete",
    "coords": [
      38.9958342,
      -1.8585762
    ],
    "imagen": "Miniaturas/Mediterranea.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7466761236370279702",
    "opinion": "Hummus, baba ganoush, pastela de pollo con almendra y briwat de atún. Viaje a Oriente en la calle Feria."
  },
  {
    "nombre": "Kebab Albacete",
    "tipo": "Kebab",
    "direccion": "C. Baños, 7, 02004 Albacete",
    "coords": [
      38.9950456,
      -1.8601675
    ],
    "imagen": "Miniaturas/KebabAlbacete.jpg",
    "video": "https://www.tiktok.com/@saboresdeaventuras/video/7483879870129360150",
    "opinion": "Patatas gratinadas, kebab de pita y el doble queso gratinado. El kebab de nuestro vídeo más viral."
  }
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

  // Centrado en Albacete capital (donde está la mayoría de sitios);
  // las escapadas lejanas (Madrid, Murcia, Alicante, Cuenca) se alcanzan
  // alejando el zoom o buscándolas por nombre.
  map.setView([38.9963, -1.8585], 13);

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

    const imgWrap  = document.getElementById('mapa-detail-img-wrap');
    const img      = document.getElementById('mapa-detail-img');
    const tipo     = document.getElementById('mapa-detail-tipo');
    const nombre   = document.getElementById('mapa-detail-nombre');
    const dir      = document.getElementById('mapa-detail-dir');
    const opinion  = document.getElementById('mapa-detail-opinion');
    const cta      = document.getElementById('mapa-detail-cta');
    const video    = document.getElementById('mapa-detail-video');

    // Imagen (miniatura) a tamaño real; si no hay, se oculta el hueco
    if (imgWrap && img) {
      if (r.imagen) {
        img.src = r.imagen;
        img.alt = 'Miniatura del vídeo de ' + r.nombre;
        imgWrap.hidden = false;
      } else {
        img.removeAttribute('src');
        imgWrap.hidden = true;
      }
    }
    if (tipo)    tipo.textContent = r.tipo;
    if (nombre)  nombre.textContent = r.nombre;
    if (dir)     dir.textContent = r.direccion;
    if (opinion) opinion.textContent = r.opinion;

    // Enlace al vídeo de TikTok
    if (video) {
      if (r.video) { video.href = r.video; video.hidden = false; }
      else { video.hidden = true; }
    }

    // Google Maps por coordenadas exactas del sitio
    if (cta && Array.isArray(r.coords)) {
      cta.href = 'https://www.google.com/maps/search/?api=1&query=' +
                 r.coords[0] + ',' + r.coords[1];
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
