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

  // Presentation roles only (sizing hooks for CSS) — no authored alt text; per
  // the client mandate, wording (even alt/aria) must come from Arc Guard.
  const refineResourcePostImages = () => {
    if (pageKey !== 'resources') return;

    const specifications = [
      ['post-15765', 'lead'],
      ['post-730', 'compact'],
      ['post-731', 'compact']
    ];

    for (const [postId, role] of specifications) {
      const article = document.getElementById(postId);
      const image = article?.querySelector('.entry-thumb img');
      if (!article || !image) continue;
      article.dataset.agfxResourceRole = role;
      image.dataset.agfxResourceRole = role;
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
    // On phones the Elementor presentation video renders as a black tap-to-play
    // frame (no poster, no playsinline). Client request 2026-07-21: it must
    // autoplay muted and seamless on mobile. Touch devices get background-film
    // behavior; desktop keeps the native controls (viewers can unmute there).
    const touchDevice = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    for (const video of document.querySelectorAll('video.elementor-video, .elementor-widget-video video')) {
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      if (touchDevice) {
        video.muted = true;
        video.defaultMuted = true;
        video.setAttribute('muted', '');
        video.autoplay = true;
        video.loop = true;
        // Keep the native controls: viewers can still scrub, rewind and
        // unmute. The pill below is the obvious unmute affordance.
        video.controls = true;
        video.preload = 'auto';
        const tryPlay = () => video.play().catch(() => {});
        tryPlay();
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(entries => {
            for (const entry of entries) if (entry.isIntersecting) tryPlay();
          }, { threshold: 0.2 }).observe(video);
        }

        const holder = video.parentElement;
        if (holder && !holder.querySelector('.agfx-unmute')) {
          holder.classList.add('agfx-video-holder');
          const unmute = document.createElement('button');
          unmute.type = 'button';
          unmute.className = 'agfx-unmute';
          unmute.setAttribute('aria-label', 'Unmute video');
          unmute.innerHTML = '&#128263; Tap to unmute';
          unmute.addEventListener('click', event => {
            event.stopPropagation();
            video.muted = false;
            video.play().catch(() => {});
          });
          video.addEventListener('volumechange', () => {
            if (!video.muted) unmute.remove();
          });
          holder.append(unmute);
        }
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

  // FAQ access (explicit directive 2026-07-21: the FAQ must be reachable on
  // mobile, homepage included). Label and destination are Arc Guard's own —
  // the client's FAQ PDF that the native Product-page button links to.
  const FAQ_PDF = 'https://www.arcguardinc.com/wp-content/uploads/2026/06/ArcGuard_FAQ-3.pdf';
  const injectFaqAccess = () => {
    const menus = document.querySelectorAll(
      'ul#primary-menu, .sydney-offcanvas-menu ul.menu, .sydney-offcanvas-menu ul.sydney-dropdown-ul'
    );
    for (const menu of menus) {
      if (menu.querySelector('.agfx-nav-faq') || menu.closest('.agfx-nav-faq')) continue;
      const items = [...menu.children].filter(li => li.tagName === 'LI' && li.querySelector('a[href]'));
      const template = items[items.length - 1];
      if (!template) continue;
      const clone = template.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('ul, .sub-menu, button').forEach(el => el.remove());
      clone.className = `${clone.className.replace(/current[-\w]*/g, '').trim()} agfx-nav-faq`;
      const anchor = clone.querySelector('a');
      if (!anchor) continue;
      anchor.setAttribute('href', FAQ_PDF);
      anchor.textContent = 'FAQ';
      anchor.removeAttribute('aria-current');
      template.after(clone);
    }

    // Always-visible FAQ button in the mobile header (hamburger row), so the
    // FAQ is one tap away on phones without opening the menu.
    const mobileColumn = document.querySelector('.shfb-header.shfb-mobile .shfb-main_header_row .shfb-column-3');
    if (mobileColumn && !mobileColumn.querySelector('.agfx-mobile-faq')) {
      const link = document.createElement('a');
      link.className = 'agfx-mobile-faq';
      link.href = FAQ_PDF;
      link.textContent = 'FAQ';
      mobileColumn.prepend(link);
    }

    // The native theme has no header CTA on phones — mirror the desktop
    // "Schedule a Consult" button at the top of the offcanvas menu.
    for (const menu of document.querySelectorAll('.sydney-offcanvas-menu ul.menu, .sydney-offcanvas-menu ul.sydney-dropdown-ul')) {
      if (menu.closest('li') || menu.querySelector('.agfx-offcanvas-consult')) continue;
      const item = document.createElement('li');
      item.innerHTML = `<a class="agfx-button agfx-offcanvas-consult" href="https://calendly.com/m-moran-arcguardinc/30min">Schedule a Consult</a>`;
      menu.prepend(item);
    }
  };

  // ---- Compliance assessment (restored 2026-07-21 at the client's request:
  // "add back the compliance assessment"). Concept approved on the recorded
  // 7/16 Zoom (Marco: "So you think you're compliant? See how you stack up";
  // Corban: "a button that says compliance assessment ... it pops up asking
  // for their email"). Leads: localStorage + prefilled email CC'ing
  // J.Crumholt@ArcGuardInc.com, plus a Google Analytics `generate_lead` event
  // through the site's Site Kit tag (GT-WPL27JSD) so conversion rate is
  // trackable in GA4. No PII is sent to GA.
  const CALENDLY_URL = 'https://calendly.com/m-moran-arcguardinc/30min';

  const trackEvent = (eventName, params) => {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
      } else if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push({ event: eventName, ...params });
      }
    } catch {}
  };

  const ASSESSMENT = {
    questions: [
      { cat: 'Permits & Process', text: 'Do welding tasks at your site require a documented hot work permit before work begins?', options: ['Always — every task', 'Sometimes / task-dependent', 'No formal permit process'] },
      { cat: 'Hierarchy of Controls', text: 'Are engineered controls evaluated before relying on PPE, following the OSHA hierarchy of controls?', options: ['Yes — formally documented', 'Informally considered', 'PPE is our primary control'] },
      { cat: 'Hierarchy of Controls', text: 'How are welding lead connections protected against accidental disconnect during elevated or hot work?', options: ['Engineered locking device', 'Taping welding lead connections', 'No specific protection'] },
      { cat: 'Inspection & Condition', text: 'How often are welding leads and connectors inspected for damage, wear, or exposed terminals?', options: ['Every shift / pre-use', 'Weekly or monthly', 'No set schedule'] },
      { cat: 'Dropped Objects', text: 'Has your site had a near-miss or incident involving a dropped tool or component in the past year?', options: ['No', 'Unsure', 'Yes'] },
      { cat: 'Dropped Objects', text: 'Do you run a dropped-object (DROPS) prevention program that covers hot work at elevation?', options: ['Yes — active program', 'Partial coverage', 'No program'] },
      { cat: 'Inspection & Condition', text: 'Are energized female connector ends physically covered whenever leads are disconnected?', options: ['Always — by design', 'Sometimes / crew-dependent', 'Rarely or never'] },
      { cat: 'Permits & Process', text: 'Is connector-level protection specifically documented in your hot-work JSA or permit process?', options: ['Yes', 'Sometimes', 'No'] }
    ],
    tiers: [
      { min: 13, label: 'Strong Program', note: 'Your controls are layered and documented. The remaining gaps below are refinement opportunities.' },
      { min: 8, label: 'Developing Program', note: 'Good foundations with meaningful gaps — the categories below show where an engineered control would strengthen your program.' },
      { min: 0, label: 'Elevated Exposure', note: 'Several answers indicate reliance on practice rather than engineered controls. The gaps below are where inspectors and incident investigations look first.' }
    ]
  };

  const injectAssessment = () => {
    if (document.querySelector('.agfx-assess')) return;

    const overlay = document.createElement('div');
    overlay.className = 'agfx-assess';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Welding hot-work compliance self-check');
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="agfx-assess__panel">
        <button class="agfx-assess__close" type="button" aria-label="Close self-check">×</button>
        <div class="agfx-assess__stage" data-stage="intro">
          <p class="agfx-section-label">Compliance self-check</p>
          <h2>How exposed is your hot-work program?</h2>
          <p class="agfx-assess__lede">Eight questions, about two minutes. Scored against the themes OSHA hot-work and hierarchy-of-controls guidance emphasizes — permits, engineered controls, inspection, and dropped-object prevention.</p>
          <button class="agfx-button agfx-assess__start" type="button">Start the Self-Check</button>
          <p class="agfx-assess__fine">Educational self-assessment — not a compliance determination or legal advice.</p>
        </div>
        <div class="agfx-assess__stage" data-stage="quiz" hidden>
          <div class="agfx-assess__progress"><span></span></div>
          <p class="agfx-assess__count"></p>
          <p class="agfx-assess__cat"></p>
          <h3 class="agfx-assess__question"></h3>
          <div class="agfx-assess__options"></div>
        </div>
        <div class="agfx-assess__stage" data-stage="gate" hidden>
          <p class="agfx-section-label">Your results are ready</p>
          <h2>See your program scorecard</h2>
          <p class="agfx-assess__lede">Where should we send your category breakdown and recommendations?</p>
          <form class="agfx-assess__form" novalidate>
            <input type="text" name="name" placeholder="Name" autocomplete="name" required>
            <input type="text" name="company" placeholder="Company" autocomplete="organization" required>
            <input type="email" name="email" placeholder="Work email" autocomplete="email" required>
            <button class="agfx-button" type="submit">Show My Scorecard</button>
            <p class="agfx-assess__error" hidden>Please enter your name, company, and a valid work email.</p>
          </form>
        </div>
        <div class="agfx-assess__stage" data-stage="results" hidden>
          <p class="agfx-section-label">Your scorecard</p>
          <div class="agfx-assess__dialwrap">
            <svg class="agfx-assess__dial" viewBox="0 0 120 120" aria-hidden="true">
              <circle class="agfx-assess__dial-track" cx="60" cy="60" r="52"></circle>
              <circle class="agfx-assess__dial-fill" cx="60" cy="60" r="52"></circle>
            </svg>
            <div class="agfx-assess__dial-num"><strong>0</strong><span>/ 16</span></div>
          </div>
          <h2 class="agfx-assess__tier"></h2>
          <p class="agfx-assess__tiernote"></p>
          <div class="agfx-assess__cats"></div>
          <div class="agfx-assess__gap" hidden>
            <strong>Connector-level gap detected</strong>
            <p>Your answers on connector protection are where engineered controls matter most. Arc Guard™ is a patented, documentable engineered control for exactly this gap — a locking cover for welding lead connections that supports your hierarchy-of-controls and DROPS documentation.</p>
          </div>
          <div class="agfx-actions">
            <a class="agfx-button" data-assess-cta href="${CALENDLY_URL}">Schedule a Consult</a>
            <a class="agfx-button agfx-button--secondary" data-assess-email href="#">Email Me This Scorecard</a>
          </div>
          <p class="agfx-assess__fine">Educational self-assessment — not a compliance determination or legal advice.</p>
        </div>
      </div>`;
    document.body.append(overlay);

    const stages = {};
    for (const stage of overlay.querySelectorAll('.agfx-assess__stage')) stages[stage.dataset.stage] = stage;
    const show = name => {
      for (const [key, el] of Object.entries(stages)) el.hidden = key !== name;
      overlay.querySelector('.agfx-assess__panel').scrollTop = 0;
    };

    const answers = [];
    let current = 0;
    const lead = {};

    const renderQuestion = () => {
      const q = ASSESSMENT.questions[current];
      stages.quiz.querySelector('.agfx-assess__progress span').style.width = `${(current / ASSESSMENT.questions.length) * 100}%`;
      stages.quiz.querySelector('.agfx-assess__count').textContent = `Question ${current + 1} of ${ASSESSMENT.questions.length}`;
      stages.quiz.querySelector('.agfx-assess__cat').textContent = q.cat;
      stages.quiz.querySelector('.agfx-assess__question').textContent = q.text;
      const box = stages.quiz.querySelector('.agfx-assess__options');
      box.innerHTML = '';
      q.options.forEach((label, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'agfx-assess__option';
        btn.textContent = label;
        btn.addEventListener('click', () => {
          answers[current] = index;
          current += 1;
          if (current < ASSESSMENT.questions.length) renderQuestion();
          else show('gate');
        });
        box.append(btn);
      });
      stages.quiz.classList.remove('agfx-assess__stage--in');
      requestAnimationFrame(() => stages.quiz.classList.add('agfx-assess__stage--in'));
    };

    const score = () => answers.reduce((sum, a) => sum + (2 - a), 0);

    const renderResults = () => {
      const total = score();
      const max = ASSESSMENT.questions.length * 2;
      const tier = ASSESSMENT.tiers.find(t => total >= t.min);
      stages.results.querySelector('.agfx-assess__tier').textContent = tier.label;
      stages.results.querySelector('.agfx-assess__tiernote').textContent = tier.note;
      stages.results.querySelector('.agfx-assess__dial-num strong').textContent = total;
      const fill = stages.results.querySelector('.agfx-assess__dial-fill');
      const circumference = 2 * Math.PI * 52;
      fill.style.strokeDasharray = circumference;
      fill.style.strokeDashoffset = circumference;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          fill.style.strokeDashoffset = circumference * (1 - total / max);
        })
      );
      const cats = {};
      ASSESSMENT.questions.forEach((q, i) => {
        cats[q.cat] = cats[q.cat] || { got: 0, max: 0 };
        cats[q.cat].got += 2 - (answers[i] ?? 2);
        cats[q.cat].max += 2;
      });
      const catBox = stages.results.querySelector('.agfx-assess__cats');
      catBox.innerHTML = '';
      for (const [name, c] of Object.entries(cats)) {
        const pct = Math.round((c.got / c.max) * 100);
        const row = document.createElement('div');
        row.className = 'agfx-assess__catrow';
        row.innerHTML = `<span>${name}</span><div class="agfx-assess__bar"><i style="width:0%"></i></div><em>${c.got}/${c.max}</em>`;
        catBox.append(row);
        requestAnimationFrame(() => requestAnimationFrame(() => { row.querySelector('i').style.width = `${pct}%`; }));
      }
      const connectorGap = (answers[2] ?? 2) > 0 || (answers[6] ?? 2) > 0;
      stages.results.querySelector('.agfx-assess__gap').hidden = !connectorGap;
      const lines = ASSESSMENT.questions.map((q, i) => `${q.cat} — ${q.text} → ${q.options[answers[i]]}`);
      const body = `Welding Hot-Work Compliance Self-Check scorecard%0D%0A%0D%0A${encodeURIComponent(lead.name || '')} · ${encodeURIComponent(lead.company || '')} · ${encodeURIComponent(lead.email || '')}%0D%0AScore: ${total}/${max} — ${tier.label}%0D%0A%0D%0A${lines.map(l => encodeURIComponent(l)).join('%0D%0A')}`;
      stages.results.querySelector('[data-assess-email]').href =
        `mailto:${encodeURIComponent(lead.email || '')}?cc=J.Crumholt@ArcGuardInc.com&subject=${encodeURIComponent('Your Arc Guard compliance self-check scorecard')}&body=${body}`;
      show('results');
    };

    stages.gate.querySelector('.agfx-assess__form').addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      lead.name = form.name.value.trim();
      lead.company = form.company.value.trim();
      lead.email = form.email.value.trim();
      const valid = lead.name && lead.company && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email);
      form.querySelector('.agfx-assess__error').hidden = valid;
      if (!valid) return;
      try {
        const stash = JSON.parse(localStorage.getItem('agfx-assessment-leads') || '[]');
        stash.push({ ...lead, answers: [...answers], score: score(), at: new Date().toISOString() });
        localStorage.setItem('agfx-assessment-leads', JSON.stringify(stash));
      } catch {}
      // GA4 key event for conversion-rate tracking (no PII sent).
      trackEvent('generate_lead', { method: 'compliance_assessment', assessment_score: score() });
      renderResults();
    });

    const open = () => {
      overlay.hidden = false;
      document.body.classList.add('agfx-assess-open');
      answers.length = 0;
      current = 0;
      show('intro');
      trackEvent('assessment_open', { method: 'compliance_assessment' });
    };
    const close = () => {
      overlay.hidden = true;
      document.body.classList.remove('agfx-assess-open');
      if (window.location.hash === '#compliance-check') history.replaceState(null, '', window.location.pathname + window.location.search);
    };
    overlay.querySelector('.agfx-assess__close').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !overlay.hidden) close(); });
    overlay.querySelector('.agfx-assess__start').addEventListener('click', () => { show('quiz'); renderQuestion(); });

    const bindTriggers = () => {
      for (const anchor of document.querySelectorAll('a[href*="#compliance-check"]')) {
        anchor.addEventListener('click', event => {
          const url = new URL(anchor.href, window.location.href);
          if (url.pathname === window.location.pathname) { event.preventDefault(); open(); }
        });
      }
    };
    bindTriggers();
    if (window.location.hash === '#compliance-check') open();
    window.addEventListener('hashchange', () => { if (window.location.hash === '#compliance-check') open(); });
    window.__AGFX_ASSESS = { open, bindTriggers };
  };

  // Homepage entry band — headline and button wording are the client's own
  // words from the recorded 7/16 call.
  const injectAssessmentBand = () => {
    if (pageKey !== 'home' || document.querySelector('.agfx-assess-band')) return;
    const section = document.createElement('section');
    section.className = 'agfx-assess-band agfx-reveal';
    section.dataset.agfxInjected = 'assessment-band';
    section.setAttribute('aria-label', 'Compliance assessment');
    section.innerHTML = `
      <h2>So You Think You're Compliant?</h2>
      <p>See how you stack up.</p>
      <a class="agfx-button" href="#compliance-check">Compliance Assessment</a>`;
    const problemHeading = [...document.querySelectorAll('h2, h3, h4')].find(heading =>
      /THE PROBLEM/i.test(heading.textContent)
    );
    const problemSection = problemHeading?.closest('.elementor > .e-con, .elementor > .elementor-section');
    if (problemSection) {
      const cardsSection = problemSection.nextElementSibling;
      const anchor =
        cardsSection && /Dropped Object|Costly Shutdowns|Unintentional Arcs/i.test(cardsSection.textContent)
          ? cardsSection
          : problemSection;
      anchor.after(section);
    } else {
      (document.querySelector('.elementor-14043, main, #content') || document.body).append(section);
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
        ['post-15765', 'lead'],
        ['post-730', 'compact'],
        ['post-731', 'compact']
      ];
      resourceImagePresentation = expected.every(([postId, role]) => {
        const article = document.getElementById(postId);
        const image = article?.querySelector('.entry-thumb img');
        const frame = article?.querySelector('.entry-thumb')?.getBoundingClientRect();
        if (!article || !image || !frame) return false;
        const frameWithinRole = role === 'lead' ? frame.height <= 301 : frame.height >= 179 && frame.height <= 221;
        return article.dataset.agfxResourceRole === role && frameWithinRole;
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
  refineResourcePostImages();
  improveMediaSemantics();
  manageHomeEmptyCarousel();
  improveLinksAndActions();
  injectFaqAccess();
  injectAssessmentBand();
  injectAssessment();
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
