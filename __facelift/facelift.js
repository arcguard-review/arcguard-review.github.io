(() => {
  'use strict';

  // Resolve the site root from this script's own URL so any injected internal
  // links work on the origin root (production, local proxy) and on subpath
  // hosts like GitHub Pages (/repo/...). Kept for future use even though the
  // facelift no longer injects navigation.
  const SITE_ROOT = (document.currentScript?.src || '').replace(
    /\/(?:__facelift|wp-content\/plugins\/arcguard-facelift\/assets)\/facelift\.js.*$/,
    ''
  );
  const siteHref = path => (path.startsWith('/') ? `${SITE_ROOT}${path}` : path);

  // Styling hooks only. All headlines, copy, buttons, titles and metas are the
  // site's own — the facelift adds no verbiage (client mandate 2026-07-21:
  // only content provided by Arc Guard may appear on the site).
  const PAGE_KEYS = {
    '/': 'home',
    '/products/': 'product',
    '/welding-safety-solutions-by-industries/': 'industries',
    '/resources/': 'resources',
    '/about/': 'about',
    '/contact/': 'contact'
  };

  const ALT_TEXT_BY_FRAGMENT = [
    ['Product-Image-1', 'Red Arc Guard locking sleeve and spring-assisted welding connector cover'],
    ['TM-Vector-LOGO-with-Phrase', 'Arc Guard logo with “No Arc. No Drop. No Excuse.”'],
    ['generated-image-7', 'Arc Guard company logo'],
    ['ArcGuard-logo-white-bg', 'Arc Guard logo'],
    ['welder-background-1', 'Welder working with industrial welding leads'],
    ['ed-boilermaker-confined-space-1', 'Boilermaker welding in a confined industrial work area'],
    ['elevated-welding', 'Welder working from an elevated structural-steel position'],
    ['small-space-welding', 'Welder working in a restricted fabrication space'],
    ['alain-pham-P_qvsF7Yodw', 'Oil and gas industrial infrastructure'],
    ['SS-pot-fab', 'Stainless-steel fabrication work'],
    ['CS-nozzle-backweld', 'Industrial manufacturing weld preparation'],
    ['safety-slogan', 'Arc Guard field-safety message'],
    ['partner_logos', 'Arc Guard partner and industry logos'],
    ['Prevent-Banner', 'Arc Guard safety-message banner']
  ];

  const normalizePath = pathname => {
    if (pathname === '/') return pathname;
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  };

  const pageKey = PAGE_KEYS[normalizePath(window.location.pathname)];
  if (!pageKey || !document.body) return;

  const sourceAttribute = element =>
    element.getAttribute('src') || element.getAttribute('data-src') || element.getAttribute('href') || '';

  const mediaInventory = () => {
    const media = [...document.querySelectorAll('img, video, source, iframe')]
      .map(element => ({
        tag: element.tagName.toLowerCase(),
        url: sourceAttribute(element)
      }))
      .filter(item => item.url)
      .sort((a, b) => `${a.tag}:${a.url}`.localeCompare(`${b.tag}:${b.url}`));

    const documents = [...document.querySelectorAll('a[href]')]
      .map(anchor => anchor.getAttribute('href') || '')
      .filter(href => /\.(?:pdf|docx?)(?:[?#]|$)/i.test(href))
      .sort();

    return { media, documents };
  };

  const inventoryContainsSource = (source, current) => {
    const containsAll = (expected, actual, keyFor) => {
      const counts = new Map();
      actual.forEach(item => {
        const key = keyFor(item);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      return expected.every(item => {
        const key = keyFor(item);
        const remaining = counts.get(key) || 0;
        if (remaining < 1) return false;
        counts.set(key, remaining - 1);
        return true;
      });
    };

    return containsAll(source.media, current.media, item => `${item.tag}:${item.url}`)
      && containsAll(source.documents, current.documents, item => item);
  };

  const mediaBefore = [...document.querySelectorAll('img, video, iframe, source')];
  mediaBefore.forEach((node, index) => {
    node.dataset.agfxPreservedMedia = String(index + 1);
  });

  const initialInventory = mediaInventory();
  let sourceInventory = initialInventory;
  window.__AGFX_AUDIT = {
    route: pageKey,
    sourceInventory,
    finalInventory: null,
    mediaParity: null,
    mediaNodesPreserved: null,
    injectedMediaOverlaps: [],
    horizontalOverflow: null,
    productAssemblyCentered: null,
    homeCarouselState: null,
    homeEmptyCarouselCollapsed: null,
    resourceImagePresentation: null
  };

  document.body.classList.add('agfx-facelift', `agfx-page-${pageKey}`);
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.style.scrollBehavior = 'smooth';
  }
  document.body.dataset.agfxPage = pageKey;

  // The only copy change the facelift makes, ordered by Arc Guard on the
  // recorded 2026-07-16 call: "anything in here that says patent pending,
  // take it off, it is now patented."
  const applyPatentedCopy = () => {
    const replacements = [
      [/patent[ -]pending/gi, 'patented']
    ];

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || parent.closest('script, style, noscript, textarea, pre, code')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let next = node.nodeValue;
      for (const [pattern, replacement] of replacements) next = next.replace(pattern, replacement);
      if (next !== node.nodeValue) node.nodeValue = next.replace(/\s{2,}/g, ' ');
    }
  };

  const addAltText = () => {
    for (const image of document.querySelectorAll('img')) {
      if ((image.getAttribute('alt') || '').trim()) continue;
      const source = sourceAttribute(image);
      const mapping = ALT_TEXT_BY_FRAGMENT.find(([fragment]) => source.includes(fragment));
      image.alt = mapping ? mapping[1] : 'Arc Guard welding connector safety information';
    }
  };

  const refineResourcePostImages = () => {
    if (pageKey !== 'resources') return;

    const specifications = [
      ['post-15765', 'lead', 'Arc Guard logo for ignition risk at welding connectors'],
      ['post-730', 'compact', 'Arc Guard logo for welding connector spark safety'],
      ['post-731', 'compact', 'Arc Guard logo for hot-connector equipment cost']
    ];

    for (const [postId, role, alt] of specifications) {
      const article = document.getElementById(postId);
      const image = article?.querySelector('.entry-thumb img');
      if (!article || !image) continue;
      article.dataset.agfxResourceRole = role;
      image.dataset.agfxResourceRole = role;
      image.alt = alt;
    }
  };

  const manageHomeEmptyCarousel = () => {
    if (pageKey !== 'home') return;

    const container = document.querySelector('.elementor-element-2f132f4');
    const widget = container?.querySelector('.elementor-element-35f70ee');
    const wrapper = widget?.querySelector('.swiper-wrapper');
    if (!container || !widget || !wrapper) {
      window.__AGFX_AUDIT.homeCarouselState = 'missing-source-widget';
      return;
    }

    const hasSubstantiveSlide = () => {
      if (wrapper.querySelector('img[src], video[src], video source[src], iframe[src]')) return true;

      const linkedContent = [...wrapper.querySelectorAll('a[href]')].some(anchor =>
        Boolean(anchor.textContent.trim() || anchor.querySelector('img, video, iframe'))
      );
      if (linkedContent) return true;

      return [...wrapper.querySelectorAll('article, .e-loop-item, [data-elementor-type="loop-item"]')].some(
        item => Boolean(item.textContent.trim() || item.querySelector('img, video, iframe, a[href]'))
      );
    };

    const applyState = () => {
      const hasContent = hasSubstantiveSlide();
      container.classList.toggle('agfx-empty-carousel', !hasContent);
      container.dataset.agfxCarouselState = hasContent ? 'content' : 'empty-collapsed';
      widget.setAttribute('aria-hidden', hasContent ? 'false' : 'true');
      window.__AGFX_AUDIT.homeCarouselState = container.dataset.agfxCarouselState;
      window.__AGFX_AUDIT.homeEmptyCarouselCollapsed = !hasContent;
      document.body.dataset.agfxHomeCarousel = hasContent ? 'content' : 'empty-collapsed';
    };

    applyState();
    const observer = new MutationObserver(applyState);
    observer.observe(wrapper, {
      attributes: true,
      attributeFilter: ['href', 'src'],
      childList: true,
      subtree: true
    });
    window.setTimeout(applyState, 250);
    window.setTimeout(applyState, 1000);
  };

  const improveMediaSemantics = () => {
    const videos = [...document.querySelectorAll('video')];
    videos.forEach((video, index) => {
      video.preload = 'metadata';
      if (!video.getAttribute('aria-label')) {
        video.setAttribute(
          'aria-label',
          index === 0 && pageKey === 'home'
            ? 'Arc Guard brand film'
            : 'Arc Guard product field presentation'
        );
      }
    });

    for (const iframe of document.querySelectorAll('iframe')) {
      const src = sourceAttribute(iframe);
      if (/vimeo\.com/i.test(src) && !iframe.title) iframe.title = 'Arc Guard Assembly Demo';
      if (/google\.com\/maps/i.test(src) && !iframe.title) {
        iframe.title = 'Arc Guard office location in Baton Rouge, Louisiana';
      }
    }
  };

  const improveLinksAndActions = () => {
    for (const anchor of document.querySelectorAll('a')) {
      const href = anchor.getAttribute('href') || '';

      if (/linkedin\.com/i.test(href)) anchor.setAttribute('aria-label', 'Arc Guard on LinkedIn');
      if (/facebook\.com/i.test(href)) anchor.setAttribute('aria-label', 'Arc Guard on Facebook');
    }

    if (pageKey === 'contact') {
      for (const element of document.querySelectorAll('.elementor-widget-text-editor, p')) {
        if (!element.innerHTML.includes('J.Crumholt@ArcGuardInc.com')) continue;
        if (element.querySelector('a[href^="mailto:"]')) continue;
        element.innerHTML = element.innerHTML.replace(
          'J.Crumholt@ArcGuardInc.com',
          '<a href="mailto:J.Crumholt@ArcGuardInc.com">J.Crumholt@ArcGuardInc.com</a>'
        );
      }
    }
  };

  // Styling hook only — the footer keeps exactly the content WordPress renders.
  const enhanceFooter = () => {
    const footer = document.querySelector('#colophon');
    if (!footer || footer.classList.contains('agfx-footer')) return;
    footer.classList.add('agfx-footer');

    const columns = footer.querySelectorAll('.shfb-main_footer_row .shfb-column');
    for (const column of columns) {
      if (!column.textContent.trim()) column.classList.add('agfx-footer-col-empty');
    }
  };

  const addRevealMotion = () => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const candidates = [
      ...document.querySelectorAll(
        '.elementor > .e-con, .elementor > .elementor-section, #main.post-wrap > article'
      )
    ].filter(Boolean);
    candidates.forEach(element => element.classList.add('agfx-reveal'));

    // Touch devices (iOS Safari especially) can freeze the scroll-reveal
    // mid-state — leaving invisible text and half-revealed word masks. Motion
    // stays a desktop-pointer enhancement only.
    const touchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (reduced || touchDevice || !('IntersectionObserver' in window)) {
      candidates.forEach(element => element.classList.add('is-visible'));
      return;
    }

    document.body.classList.add('agfx-motion-ready');
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    candidates.forEach(element => observer.observe(element));
  };

  const addMagnetMotion = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    for (const element of document.querySelectorAll('.agfx-magnet')) {
      element.addEventListener('pointermove', event => {
        const rect = element.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 6;
        element.style.transform = `translate(${x}px, ${y}px)`;
      });
      element.addEventListener('pointerleave', () => {
        element.style.transform = '';
      });
      element.addEventListener('blur', () => {
        element.style.transform = '';
      });
    }
  };

  const rectanglesOverlap = (left, right) =>
    left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;

  const updateAudit = () => {
    const finalInventory = mediaInventory();
    const nodesPreserved = mediaBefore.every(node => node.isConnected);
    const parity = inventoryContainsSource(sourceInventory, finalInventory) && nodesPreserved;
    const media = [...document.querySelectorAll('img, video, iframe')].filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1;
    });
    const injected = [...document.querySelectorAll('[data-agfx-injected]')];
    const overlaps = [];

    for (const layer of injected) {
      const layerRect = layer.getBoundingClientRect();
      for (const item of media) {
        // The source theme's sticky header intentionally sits above page content.
        // Keep its logo in the parity inventory, but do not misreport that global
        // header behavior as an injected content/media collision while scrolling.
        if (item.closest('header, #masthead, .site-header, .shfb-header')) continue;
        if (layer.contains(item) || item.contains(layer)) continue;
        if (rectanglesOverlap(layerRect, item.getBoundingClientRect())) {
          overlaps.push({
            injected: layer.dataset.agfxInjected,
            media: sourceAttribute(item) || item.tagName.toLowerCase()
          });
        }
      }
    }

    const horizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    let productAssemblyCentered = null;
    let homeEmptyCarouselCollapsed = null;
    let resourceImagePresentation = null;

    if (pageKey === 'product') {
      const assembly = document.querySelector('.elementor-element-a110975');
      const mediaRail = document.querySelector('.elementor-element-042cedb');

      if (assembly && mediaRail) {
        const assemblyRect = assembly.getBoundingClientRect();
        const railRect = mediaRail.getBoundingClientRect();
        const assemblyCenter = assemblyRect.left + assemblyRect.width / 2;
        const railCenter = railRect.left + railRect.width / 2;
        productAssemblyCentered = Math.abs(assemblyCenter - railCenter) <= 2;
      }
    }

    if (pageKey === 'home') {
      const emptyCarousel = document.querySelector('.elementor-element-2f132f4.agfx-empty-carousel');
      const rect = emptyCarousel?.getBoundingClientRect();
      homeEmptyCarouselCollapsed = Boolean(
        emptyCarousel &&
          rect &&
          rect.height <= 1 &&
          emptyCarousel.dataset.agfxCarouselState === 'empty-collapsed'
      );
    }

    if (pageKey === 'resources') {
      const expected = [
        ['post-15765', 'lead', 'Arc Guard logo for ignition risk at welding connectors'],
        ['post-730', 'compact', 'Arc Guard logo for welding connector spark safety'],
        ['post-731', 'compact', 'Arc Guard logo for hot-connector equipment cost']
      ];
      resourceImagePresentation = expected.every(([postId, role, alt]) => {
        const article = document.getElementById(postId);
        const image = article?.querySelector('.entry-thumb img');
        const frame = article?.querySelector('.entry-thumb')?.getBoundingClientRect();
        if (!article || !image || !frame) return false;
        const frameWithinRole = role === 'lead' ? frame.height <= 301 : frame.height >= 179 && frame.height <= 221;
        return article.dataset.agfxResourceRole === role && image.alt === alt && frameWithinRole;
      });
    }

    window.__AGFX_AUDIT.finalInventory = finalInventory;
    window.__AGFX_AUDIT.mediaParity = parity;
    window.__AGFX_AUDIT.mediaNodesPreserved = nodesPreserved;
    window.__AGFX_AUDIT.injectedMediaOverlaps = overlaps;
    window.__AGFX_AUDIT.horizontalOverflow = horizontalOverflow;
    window.__AGFX_AUDIT.productAssemblyCentered = productAssemblyCentered;
    window.__AGFX_AUDIT.homeEmptyCarouselCollapsed = homeEmptyCarouselCollapsed;
    window.__AGFX_AUDIT.resourceImagePresentation = resourceImagePresentation;
    document.body.dataset.agfxMediaParity = parity ? 'pass' : 'fail';
    document.body.dataset.agfxOverlap = overlaps.length === 0 ? 'pass' : 'fail';
    document.body.dataset.agfxOverflow = horizontalOverflow ? 'fail' : 'pass';
    if (pageKey === 'product') {
      document.body.dataset.agfxProductAssemblyCentered = productAssemblyCentered ? 'pass' : 'fail';
    }
    if (pageKey === 'home') {
      document.body.dataset.agfxHomeEmptyCarousel = homeEmptyCarouselCollapsed ? 'pass' : 'fail';
    }
    if (pageKey === 'resources') {
      document.body.dataset.agfxResourceImages = resourceImagePresentation ? 'pass' : 'fail';
    }
  };

  applyPatentedCopy();
  addAltText();
  refineResourcePostImages();
  improveMediaSemantics();
  manageHomeEmptyCarousel();
  improveLinksAndActions();
  enhanceFooter();
  for (const headerCta of document.querySelectorAll('.shfb-component-button .button, .shfb-component-button2 .button')) {
    headerCta.classList.add('agfx-magnet');
  }
  addRevealMotion();
  addMagnetMotion();

  requestAnimationFrame(() => requestAnimationFrame(updateAudit));
  window.addEventListener(
    'load',
    () => {
      // Sydney creates the custom-header video late. Capture the complete source
      // DOM after that source behavior finishes; this facelift never creates media.
      sourceInventory = mediaInventory();
      window.__AGFX_AUDIT.sourceInventory = sourceInventory;
      updateAudit();
    },
    { once: true }
  );
  window.addEventListener('resize', updateAudit, { passive: true });
})();
