// Shared-template renderer for /services/:slug and /products/:slug — one physical file
// (template-offering.html) serves every offering; this script resolves the slug from the URL
// and fills the page client-side after fetching from the backend by slug.
import { SERVICE_USE_CASES, SERVICE_FEATURES } from './service-use-cases-data.js';

(function () {
  'use strict';

  function resolveSlugAndBasePath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    let basePath = '/services';
    let slug = '';
    if (parts.length >= 3 && parts[0] === 'pages' && parts[1] === 'services') {
      slug = parts[2] || '';
    } else {
      basePath = '/' + (parts[0] || 'services');
      slug = parts[1] || '';
    }
    slug = slug.replace(/\.html$/, '');
    if (slug === 'software-developement') slug = 'software-development';
    return { basePath, slug };
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const DEFAULT_OFFERINGS = {
    'software-development': {
      title: 'Software Development',
      kind: 'service',
      tagline: 'Where logic meets creativity, crafting digital possibilities endlessly.',
      body: 'Software development is the process of creating, designing, deploying, and maintaining software applications. It involves writing, testing, and fixing code to create applications, websites, or other software products. Leveraging cutting-edge technologies, customer ideas are meticulously translated into tangible realities, forging robust IT solutions of operating power.',
      feature_list: [
        'Custom Web & Mobile Applications',
        'Microservices Architecture & API Design',
        'Enterprise Software Modernization',
        'Quality Assurance & Continuous Testing'
      ]
    },
    'enterprise-ai-solutions': {
      title: 'Enterprise AI Solutions',
      kind: 'service',
      tagline: 'Empowering enterprise decision-making with advanced artificial intelligence.',
      body: 'Enterprise AI Solutions combine deep learning, predictive analytics, and natural language processing to automate complex workflows and uncover operational insights at scale.',
      feature_list: [
        'Custom LLM Fine-Tuning & RAG Pipelines',
        'Computer Vision & Defect Detection',
        'Predictive Asset Maintenance Models',
        'Autonomous Workflow AI Agents'
      ]
    },
    'data-analytics': {
      title: 'Data & Analytics',
      kind: 'service',
      tagline: 'Transforming raw telemetry into actionable business intelligence.',
      body: 'Our Data & Analytics services help organizations consolidate disparate data streams into real-time executive dashboards and predictive analytical models.',
      feature_list: [
        'Executive & Operational Dashboards',
        'Real-Time Streaming ETL Pipelines',
        'Predictive Churn & Demand Forecasting',
        'Automated Financial Reconciliation'
      ]
    },
    'iot-driven-solutions': {
      title: 'IoT Driven Solutions',
      kind: 'service',
      tagline: 'Connecting hardware, sensors, and cloud for real-time telemetry.',
      body: 'We design and deploy end-to-end IoT architectures, connecting edge sensors over LPWAN/MQTT to centralized monitoring and auto-alerting platforms.',
      feature_list: [
        'Municipal Water & Grid Telemetry',
        'Industrial Asset Condition Monitoring',
        'Cold Chain & Environmental Sensing',
        'Edge AI & Gateway Integration'
      ]
    },
    'cloud-platform-services': {
      title: 'Cloud & Platform Services',
      kind: 'service',
      tagline: 'Resilient, high-availability multi-cloud architecture.',
      body: 'From legacy data-center exits to automated CI/CD pipelines, our Cloud Platform Services deliver secure, cost-optimized, and resilient cloud infrastructure.',
      feature_list: [
        'AWS, Azure & GCP Cloud Migration',
        'CI/CD & DevOps Automation',
        'FinOps & Cost Optimization',
        'Multi-Region Disaster Recovery'
      ]
    },
    'drone-services': {
      title: 'Drone & Autonomous Services',
      kind: 'service',
      tagline: 'Survey-grade aerial intelligence and autonomous site surveillance.',
      body: 'Leveraging RTK fixed-wing and multirotor UAV payloads for high-precision topographic mapping, infrastructure inspection, and precision agriculture.',
      feature_list: [
        'Centimeter-Accurate Topographic Surveys',
        'High-Voltage Transmission Tower Inspection',
        'NDVI Crop Health Multispectral Mapping',
        'Autonomous Perimeter Patrol Systems'
      ]
    }
  };

  function renderUseCaseTabs(slug) {
    const wrap = document.getElementById('qpaix-service-use-cases');
    if (!wrap) return;

    const data = SERVICE_USE_CASES[slug];
    if (!data || !Array.isArray(data.tabs) || data.tabs.length === 0) {
      wrap.style.display = 'none';
      return;
    }

    wrap.style.display = '';

    const navBtns = data.tabs.map((tab, i) => `
      <button class="nav-link${i === 0 ? ' active' : ''}" 
              id="use-case-tab-${i + 1}" 
              data-bs-toggle="tab" 
              data-bs-target="#use-case-pane-${i + 1}" 
              type="button" 
              role="tab" 
              aria-controls="use-case-pane-${i + 1}" 
              aria-selected="${i === 0 ? 'true' : 'false'}"
              data-cms="usecase-${slug}-tab-${i + 1}-label">
        ${escapeHtml(tab.label)}
      </button>
    `).join('');

    const panels = data.tabs.map((tab, i) => {
      let cards = tab.cards;
      if (!cards || !cards.length) {
        cards = [
          { title: 'Description', text: tab.desc || (tab.points && tab.points[0] ? tab.points[0].text : ''), icon: '/images/output_oriented.png' },
          { title: tab.points && tab.points[0] ? tab.points[0].label : 'Functionality', text: tab.points && tab.points[0] ? tab.points[0].text : (tab.points && tab.points[1] ? tab.points[1].text : ''), icon: '/images/creative_sol.png' },
          { title: tab.points && tab.points[1] ? tab.points[1].label : 'Outcome', text: tab.points && tab.points[1] ? tab.points[1].text : '', icon: '/images/flexible_approach.png' }
        ];
      }

      const defaultIcons = ['fa-solid fa-file-lines', 'fa-solid fa-sliders', 'fa-solid fa-trophy'];

      const cardsHtml = cards.map((c, cIdx) => {
        const iconVal = c.icon || defaultIcons[cIdx % 3];
        const isFontIcon = iconVal.startsWith('fa-') || iconVal.startsWith('bx-') || iconVal.startsWith('bi-');
        const iconElement = isFontIcon
          ? `<i class="${escapeHtml(iconVal)}" data-cms="usecase-${slug}-tab-${i + 1}-card-${cIdx + 1}-icon"></i>`
          : `<img src="${escapeHtml(iconVal)}" alt="QPAIX" class="how_we_do_image" data-cms="usecase-${slug}-tab-${i + 1}-card-${cIdx + 1}-icon" />`;

        return `
          <div class="col-12 shallow-card wow bounceInLeft" data-wow-delay="${0.1 + cIdx * 0.1}s">
            <div class="info-box">
              <div class="image_wrapper me-3 me-md-4">
                ${iconElement}
              </div>
              <div class="info-content">
                <div class="card_title" data-cms="usecase-${slug}-tab-${i + 1}-card-${cIdx + 1}-title">${escapeHtml(c.title)}</div>
                <div class="description" data-cms="usecase-${slug}-tab-${i + 1}-card-${cIdx + 1}-desc">${escapeHtml(c.text)}</div>
              </div>
            </div>
          </div>
        `;
      }).join('');

      const rightImg = tab.image || '/images/picture_101.png';

      return `
        <div class="tab-pane fade${i === 0 ? ' show active' : ''}" id="use-case-pane-${i + 1}" role="tabpanel" aria-labelledby="use-case-tab-${i + 1}">
          <div class="use-case-${i + 1}">
            <div class="row justify-content-between align-items-center g-4">
              <div class="col-lg-6">
                <div class="row">
                  ${cardsHtml}
                </div>
              </div>
              <div class="col-lg-6 align-items-center d-none d-lg-flex justify-content-center">
                <div class="use-case-visual-wrapper text-center wow zoomInUp" data-wow-delay="0.25s">
                  <div class="use-case-dot-pattern"></div>
                  <img src="${escapeHtml(rightImg)}" 
                       alt="${escapeHtml(tab.label)}" 
                       class="img-fluid use-case-showcase-img" 
                       data-cms="usecase-${slug}-tab-${i + 1}-image" />
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    wrap.innerHTML = `
      <div class="use-cases col-12 p-0 my-4">
        <div class="row">
          <div class="col-12">
            <div class="main-title text-start mb-4 wow fadeInUp" data-wow-delay="0.1s">
              <span class="qpaix-section-pill mb-2" style="background: rgba(26, 46, 92, 0.12); color: #1A2E5C; border: 1px solid rgba(26, 46, 92, 0.3); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 1px; display: inline-block;"><i class="fa-solid fa-layer-group me-2"></i>PROVEN SCENARIOS</span>
              <h3 class="heading-title fw-bold mt-2" style="font-size: 2.2rem;">Proven Real-World <strong>Use Cases</strong></h3>
            </div>
          </div>
        </div>
        <div class="service-use-cases-tab-container mb-lg-0 mb-4">
          <section class="py-2">
            <nav class="q-use-cases-tabs d-flex justify-content-start mb-4 wow fadeInUp" data-wow-delay="0.15s">
              <div class="nav nav-tabs" role="tablist">
                ${navBtns}
              </div>
            </nav>
            <div class="tab-content mt-lg-4 mt-0">
              ${panels}
            </div>
          </section>
        </div>
      </div>
    `;

    // Bind explicit tab switching click handlers
    const tabBtns = wrap.querySelectorAll('.q-use-cases-tabs .nav-link');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        tabBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const targetId = btn.getAttribute('data-bs-target');
        const panelsList = wrap.querySelectorAll('.tab-pane');
        panelsList.forEach((panel) => {
          if ('#' + panel.id === targetId) {
            panel.classList.add('show', 'active');
          } else {
            panel.classList.remove('show', 'active');
          }
        });
      });
    });
  }

  function renderServiceFeatures(slug) {
    const wrap = document.getElementById('qpaix-service-features');
    if (!wrap) return;

    const data = SERVICE_FEATURES[slug];
    if (!data || !Array.isArray(data.features) || data.features.length === 0) {
      return;
    }

    const pillText = data.pill || 'ENGINEERING EXCELLENCE';
    const titleHtml = data.title || 'Core Features & <strong>Capabilities</strong>';
    const subtitleText = data.subtitle || 'Architectural standards and enterprise-grade infrastructure built directly into every deployment.';

    const cardsHtml = data.features.map((feat, i) => {
      const chip1 = feat.chips && feat.chips[0] ? feat.chips[0] : '';
      const chip2 = feat.chips && feat.chips[1] ? feat.chips[1] : '';

      return `
        <div class="col-lg-4 col-md-6 mb-4 d-flex wow fadeInUp" data-wow-delay="${0.1 + i * 0.08}s" data-wow-duration="1.2s">
          <div class="qpaix-feature-card w-100">
            <div class="feature-icon-box mb-3">
              <i class="${escapeHtml(feat.icon)}" data-cms="feature-${slug}-${i + 1}-icon"></i>
            </div>
            <h4 class="feature-title mb-2 text-start" data-cms="feature-${slug}-${i + 1}-title">${escapeHtml(feat.title)}</h4>
            <p class="feature-desc text-start mb-3" data-cms="feature-${slug}-${i + 1}-desc">${escapeHtml(feat.desc)}</p>
            <div class="feature-tag-list mt-auto pt-2 d-flex flex-wrap gap-2">
              ${chip1 ? `<span class="feature-chip" data-cms="feature-${slug}-${i + 1}-chip-1">${escapeHtml(chip1)}</span>` : ''}
              ${chip2 ? `<span class="feature-chip" data-cms="feature-${slug}-${i + 1}-chip-2">${escapeHtml(chip2)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    wrap.innerHTML = `
      <div class="col-12 p-0 mb-4">
        <div class="service-single-page-title text-start mb-4 wow fadeInUp" data-wow-delay="0.1s">
          <span class="qpaix-section-pill mb-2" data-cms="features-${slug}-pill" style="background: rgba(26, 46, 92, 0.12); color: #1A2E5C; border: 1px solid rgba(26, 46, 92, 0.3); padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 1px; display: inline-block;">
            <i class="fa-solid fa-layer-group me-2"></i>${escapeHtml(pillText)}
          </span>
          <h3 class="heading-title fw-bold mt-2" data-cms="features-${slug}-title" style="font-size: 2.2rem;">${titleHtml}</h3>
          <p class="qpaix-section-subtitle text-slate" data-cms="features-${slug}-subtitle" style="color: #64748B; font-size: 1rem; max-width: 750px;">${escapeHtml(subtitleText)}</p>
        </div>
      </div>
      ${cardsHtml}
    `;
  }

  function reinitWowIfNeeded() {
    if (typeof window.WOW === 'undefined') return;
    try {
      if (window.wow && typeof window.wow.doSync === 'function') {
        window.wow.stopped = false;
        window.wow.doSync(document.body);
        if (typeof window.wow.scrollHandler === 'function') {
          window.wow.scrollHandler();
        }
      } else if (window.WOW) {
        window.wow = new window.WOW();
        window.wow.init();
      }
    } catch (e) {
      console.warn('[offering-detail] WOW.js re-init failed', e);
    }
  }

  function applyOfferingToDom(offering, slug) {
    if (!offering) return;

    const titleEl = document.getElementById('qpaix-page-title');
    if (titleEl) titleEl.textContent = `${offering.title} — QPAIX Infitech Private Limited`;

    const kindEl = document.getElementById('qpaix-offering-kind');
    if (kindEl) kindEl.textContent = offering.kind === 'product' ? 'PRODUCT' : 'SERVICE';

    const offTitleEl = document.getElementById('qpaix-offering-title');
    if (offTitleEl) offTitleEl.textContent = offering.title;

    const taglineEl = document.getElementById('qpaix-offering-tagline');
    if (taglineEl) taglineEl.textContent = offering.tagline || '';

    const bodyEl = document.getElementById('qpaix-offering-body');
    if (bodyEl) bodyEl.innerHTML = offering.body ? `<p>${escapeHtml(offering.body)}</p>` : '';

    const features = Array.isArray(offering.feature_list) ? offering.feature_list : [];
    const featWrap = document.getElementById('qpaix-offering-features-wrap');
    const featList = document.getElementById('qpaix-offering-features');
    if (featWrap && featList) {
      if (features.length > 0) {
        featWrap.style.display = '';
        featList.innerHTML = features
          .map((f) => `<li class="mb-2"><i class="fa-solid fa-check me-2"></i>${escapeHtml(f)}</li>`)
          .join('');
      } else {
        featWrap.style.display = 'none';
      }
    }

    if (offering.kind === 'service') {
      renderUseCaseTabs(slug);
      renderServiceFeatures(slug);
      reinitWowIfNeeded();
    } else {
      const useCaseWrap = document.getElementById('qpaix-service-use-cases');
      if (useCaseWrap) useCaseWrap.style.display = 'none';
    }
  }



  async function init() {
    const { basePath, slug } = resolveSlugAndBasePath();
    if (!slug) return;

    // 1. Instant load from static default data — but ONLY when this physical page hasn't
    //    already been baked with this offering's real content (see PROJECT_STATUS.md's
    //    forty-fifth follow-up: every current service/product now has its own real per-slug
    //    static file with the correct title/tagline/body already in the markup). Applying this
    //    hardcoded fallback unconditionally re-introduces the exact "flash of wrong content" bug
    //    Part 1 exists to fix — e.g. DEFAULT_OFFERINGS['iot-driven-solutions'].title is "IoT
    //    Driven Solutions" (no hyphen) while the real, baked, DB-backed title is "IoT-Driven
    //    Solutions", so the fallback would briefly stomp correct baked text with slightly-wrong
    //    text before the live fetch corrects it a moment later. The signal used: the banner
    //    heading's real baked text is anything other than empty/"Loading…" — that's true for
    //    every one of the 12 files Part 1 baked in, and stays false (so this fallback still
    //    fires exactly as before) for any brand-new offering slug that falls through to the
    //    shared template instead of its own static file.
    const titleEl = document.getElementById('qpaix-offering-title');
    const alreadyBaked = !!(titleEl && titleEl.textContent && titleEl.textContent.trim() !== 'Loading...');

    if (!alreadyBaked) {
      const fallback = DEFAULT_OFFERINGS[slug] || {
        title: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        kind: basePath.startsWith('/product') ? 'product' : 'service',
        tagline: 'Engineering enterprise-grade digital systems.',
        body: 'Tailored technology solutions designed for high performance, security, and scalability.'
      };
      applyOfferingToDom(fallback, slug);
    } else {
      // Still need the service-only sections (use-case tabs / core features grid) and WOW.js
      // re-init to run even though the hero/body text is already correct — kind is read straight
      // off the baked DOM rather than re-deriving it, since applyOfferingToDom() itself would
      // otherwise require a full offering object.
      const kind = basePath.startsWith('/product') ? 'product' : 'service';
      if (kind === 'service') {
        renderUseCaseTabs(slug);
        renderServiceFeatures(slug);
        reinitWowIfNeeded();
      }
    }

    // 2. Fetch fresh backend offering if backend is running
    try {
      const res = await fetch(`/api/v2/offerings/${encodeURIComponent(slug)}`, { credentials: 'include' });
      if (res.ok) {
        const offering = await res.json();
        applyOfferingToDom(offering, slug);
      }
    } catch (e) {
      console.warn('[offering-detail] Backend fetch skipped/failed, using fallback', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
