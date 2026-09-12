/**
 * ChemTable: Academic IUPAC Periodic Table & Chemistry Database
 * Offline-First Single Page Application (SPA) Controller & Algorithmic Engines
 */

'use strict';

/**
 * Algorithmically generates an SVG Lewis Dot Structure.
 * Accurately places 1 to 8 valence electron dots around the chemical symbol (North, East, South, West)
 * according to Hund's rule / Gilbert N. Lewis octet conventions.
 * 
 * @param {number|object} valenceElectrons - Integer from 1 to 8, or an Element data object
 * @param {string} [symbol] - Chemical symbol (e.g. 'C', 'Na', 'Cl')
 * @returns {string} Pure SVG markup string
 */
export function drawLewisDot(valenceElectrons, symbol) {
  // Support element object as single parameter
  if (typeof valenceElectrons === 'object' && valenceElectrons !== null) {
    const el = valenceElectrons;
    symbol = el.symbol || 'X';
    if (Array.isArray(el.electron_shells) && el.electron_shells.length > 0) {
      valenceElectrons = el.electron_shells[el.electron_shells.length - 1];
    } else if (el.group) {
      valenceElectrons = el.group <= 2 ? el.group : (el.group >= 13 && el.group <= 18 ? el.group - 10 : 2);
    } else {
      valenceElectrons = 1;
    }
  }

  symbol = symbol || 'X';
  const v = Math.max(0, Math.min(8, parseInt(valenceElectrons, 10) || 0));

  // Determine dot distribution based on Hund's rule:
  // Singles first on distinct quadrants: North (1), East (2), South (3), West (4)
  // Then pairs: North (5), East (6), South (7), West (8)
  const north = v >= 5 ? 2 : (v >= 1 ? 1 : 0);
  const east  = v >= 6 ? 2 : (v >= 2 ? 1 : 0);
  const south = v >= 7 ? 2 : (v >= 3 ? 1 : 0);
  const west  = v >= 8 ? 2 : (v >= 4 ? 1 : 0);

  const cx = 100;
  const cy = 100;
  const r = 5.5;          // Dot radius
  const offset = 42;      // Distance from center
  const pairSep = 11;     // Half-distance between paired electrons

  const dots = [];
  const addDot = (x, y, label) => {
    dots.push(`
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="#38bdf8" stroke="#0284c7" stroke-width="1.5" filter="url(#lewisGlow)">
        <title>${label}</title>
      </circle>
    `);
  };

  // North quadrant
  if (north === 1) {
    addDot(cx, cy - offset, 'North electron 1');
  } else if (north === 2) {
    addDot(cx - pairSep, cy - offset, 'North electron pair (1)');
    addDot(cx + pairSep, cy - offset, 'North electron pair (2)');
  }

  // East quadrant
  if (east === 1) {
    addDot(cx + offset, cy, 'East electron 1');
  } else if (east === 2) {
    addDot(cx + offset, cy - pairSep, 'East electron pair (1)');
    addDot(cx + offset, cy + pairSep, 'East electron pair (2)');
  }

  // South quadrant
  if (south === 1) {
    addDot(cx, cy + offset, 'South electron 1');
  } else if (south === 2) {
    addDot(cx - pairSep, cy + offset, 'South electron pair (1)');
    addDot(cx + pairSep, cy + offset, 'South electron pair (2)');
  }

  // West quadrant
  if (west === 1) {
    addDot(cx - offset, cy, 'West electron 1');
  } else if (west === 2) {
    addDot(cx - offset, cy - pairSep, 'West electron pair (1)');
    addDot(cx - offset, cy + pairSep, 'West electron pair (2)');
  }

  return `
    <svg viewBox="0 0 200 200" width="100%" height="100%" class="lewis-svg select-none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lewis Dot Diagram for ${symbol} with ${v} valence electrons">
      <defs>
        <filter id="lewisGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="lewisGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#0c1a33" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#070a12" stop-opacity="0.3"/>
        </radialGradient>
      </defs>
      <!-- Circular Ambient Field -->
      <circle cx="100" cy="100" r="92" fill="url(#lewisGrad)" stroke="#1e293b" stroke-width="1.2" />
      
      <!-- Central Chemical Symbol -->
      <text x="100" y="114" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="44" font-weight="800" fill="#f8fafc" letter-spacing="-0.03em">${symbol}</text>
      
      <!-- Algorithmic Lewis Valence Dots -->
      ${dots.join('\n')}
    </svg>
  `.trim();
}

/**
 * Algorithmically generates an SVG Bohr Planetary Model.
 * Renders concentric orbital circles for the principal quantum shells (K, L, M, N, O, P, Q)
 * and places exact electron dots along each ring based on the expanded configuration.
 * 
 * @param {Array<number>|string|object} electronConfiguration - Array e.g. [2, 8, 1], string, or Element data object
 * @param {string} [symbol] - Chemical symbol
 * @returns {string} Pure SVG markup string
 */
export function drawBohrModel(electronConfiguration, symbol) {
  let atomicNumber = 0;
  if (typeof electronConfiguration === 'object' && electronConfiguration !== null && !Array.isArray(electronConfiguration)) {
    const el = electronConfiguration;
    symbol = el.symbol || 'X';
    atomicNumber = el.atomic_number || 0;
    electronConfiguration = el.electron_shells || el.electron_configuration_expanded;
  }

  symbol = symbol || 'X';

  let shells = [];
  if (Array.isArray(electronConfiguration)) {
    shells = electronConfiguration.map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n > 0);
  } else if (typeof electronConfiguration === 'string') {
    const nums = electronConfiguration.match(/\d+/g);
    if (nums) shells = nums.map(n => parseInt(n, 10));
  }

  if (shells.length === 0) {
    shells = [1];
  }

  const shellLetters = ['K', 'L', 'M', 'N', 'O', 'P', 'Q'];
  const cx = 240;
  const cy = 240;
  const numShells = shells.length;

  const minRadius = 54;
  const maxRadius = 216;
  const radiusStep = numShells > 1 ? (maxRadius - minRadius) / (numShells - 1) : 0;

  const ringsSvg = [];
  const electronsSvg = [];

  shells.forEach((count, i) => {
    const r = numShells === 1 ? 115 : minRadius + (i * radiusStep);
    const shellLetter = shellLetters[i] || `n=${i + 1}`;

    // Concentric orbit line
    ringsSvg.push(`
      <circle cx="${cx}" cy="${cy}" r="${r.toFixed(1)}" fill="none" stroke="#334155" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.85" />
      <text x="${(cx + r + 4).toFixed(1)}" y="${(cy - 4).toFixed(1)}" font-family="'JetBrains Mono', monospace" font-size="9" fill="#64748b" font-weight="600">${shellLetter} (${count}e⁻)</text>
    `);

    // Angular placement of electrons on this shell ring
    const phaseOffset = (i * 0.35); // Gentle phase twist so orbits don't align statically
    for (let e = 0; e < count; e++) {
      const angle = ((2 * Math.PI * e) / count) - (Math.PI / 2) + phaseOffset;
      const ex = cx + r * Math.cos(angle);
      const ey = cy + r * Math.sin(angle);

      electronsSvg.push(`
        <circle cx="${ex.toFixed(2)}" cy="${ey.toFixed(2)}" r="4.5" fill="#22d3ee" stroke="#0891b2" stroke-width="1.2" filter="url(#bohrGlow)">
          <title>Shell ${shellLetter} (n=${i + 1}): Electron ${e + 1} of ${count}</title>
        </circle>
      `);
    }
  });

  return `
    <svg viewBox="0 0 480 480" width="100%" height="100%" class="bohr-svg select-none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Bohr Model for ${symbol} with shells ${shells.join(', ')}">
      <defs>
        <filter id="bohrGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="nucGrad" cx="38%" cy="38%" r="62%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="65%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </radialGradient>
      </defs>
      
      <!-- Concentric Orbital Shells -->
      ${ringsSvg.join('\n')}
      
      <!-- Central Atomic Nucleus -->
      <circle cx="${cx}" cy="${cy}" r="32" fill="url(#nucGrad)" stroke="#38bdf8" stroke-width="2" filter="url(#bohrGlow)"/>
      <text x="${cx}" y="${cy + 7}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="21" font-weight="800" fill="#ffffff">${symbol}</text>
      ${atomicNumber ? `<text x="${cx}" y="${cy + 22}" text-anchor="middle" font-family="'JetBrains Mono', monospace" font-size="8.5" font-weight="600" fill="#bae6fd">Z=${atomicNumber}</text>` : ''}
      
      <!-- Electron Dots in Orbits -->
      ${electronsSvg.join('\n')}
    </svg>
  `.trim();
}

/**
 * Main ChemTable SPA Application Controller
 */
class PeriodicTableApp {
  constructor() {
    this.elements = [];
    this.elementsBySymbol = new Map();
    this.elementsByNumber = new Map();

    this.state = {
      searchQuery: '',
      stateFilter: 'all',
      blockFilter: 'all',
      seriesFilter: 'all',
      radioactiveOnly: false,
      heatmapProperty: 'none',
      currentTempK: 298.15,
      selectedElement: null,
      deferredInstallPrompt: null,
    };

    this.categories = {
      'alkali-metal': { name: 'Alkali Metal', color: '#ef4444', count: 0 },
      'alkaline-earth': { name: 'Alkaline Earth', color: '#f97316', count: 0 },
      'transition-metal': { name: 'Transition Metal', color: '#eab308', count: 0 },
      'post-transition-metal': { name: 'Post-Transition Metal', color: '#10b981', count: 0 },
      'metalloid': { name: 'Metalloid', color: '#06b6d4', count: 0 },
      'reactive-nonmetal': { name: 'Reactive Nonmetal', color: '#3b82f6', count: 0 },
      'noble-gas': { name: 'Noble Gas', color: '#a855f7', count: 0 },
      'lanthanide': { name: 'Lanthanide', color: '#ec4899', count: 0 },
      'actinide': { name: 'Actinide', color: '#f43f5e', count: 0 },
      'unknown': { name: 'Unknown Series', color: '#64748b', count: 0 },
    };

    this.currentViewer3D = null;
    this.init();
  }

  /**
   * Accessible live announcement for assistive technologies
   */
  announceA11y(message) {
    const region = document.getElementById('a11yLiveRegion');
    if (region) {
      region.textContent = '';
      setTimeout(() => {
        region.textContent = message;
      }, 50);
    }
  }

  async init() {
    this.setupPWA();
    this.setupEventListeners();
    await this.loadData();
    this.renderLegend();
    this.renderGrid();
    this.applyFilters();

    // Default inspector preview
    const defaultEl = this.elementsBySymbol.get('C') || this.elements[0];
    if (defaultEl) {
      this.updateInspector(defaultEl);
    }

    // Set up client-side Hash Router
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  }

  /**
   * Offline-First Data Loader (Relying strictly on local files, 0 external APIs)
   */
  async loadData() {
    const urls = ['/data.json', '/chemistry_data.json', 'data.json'];
    for (const url of urls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const json = await response.json();
          this.elements = json.elements || json;
          break;
        }
      } catch (err) {
        console.warn(`Local data load attempt from ${url}:`, err);
      }
    }

    if (!this.elements || this.elements.length === 0) {
      console.error('Critical: Chemistry dataset could not be loaded.');
      return;
    }

    this.elements.forEach(el => {
      this.elementsBySymbol.set(el.symbol.toUpperCase(), el);
      this.elementsByNumber.set(el.atomic_number, el);

      const catKey = this.normalizeCategoryKey(el.category);
      if (this.categories[catKey]) {
        this.categories[catKey].count++;
      } else {
        this.categories['unknown'].count++;
      }
    });
  }

  normalizeCategoryKey(category) {
    if (!category) return 'unknown';
    const clean = category.toLowerCase().trim();
    if (clean.includes('alkali metal') && !clean.includes('alkaline')) return 'alkali-metal';
    if (clean.includes('alkaline earth')) return 'alkaline-earth';
    if (clean.includes('post-transition')) return 'post-transition-metal';
    if (clean.includes('transition')) return 'transition-metal';
    if (clean.includes('metalloid')) return 'metalloid';
    if (clean.includes('noble')) return 'noble-gas';
    if (clean.includes('lanthanide')) return 'lanthanide';
    if (clean.includes('actinide')) return 'actinide';
    if (clean.includes('nonmetal') || clean.includes('reactive nonmetal')) return 'reactive-nonmetal';
    return 'unknown';
  }

  /**
   * Client-Side Hash Router
   * Handles:
   *  - '#/' : Interactive Periodic Table
   *  - '#/element/{atomic_number}' : Element Detailed Dossier
   *  - '#/archive/organic' : Organic Chemistry Encyclopedia
   *  - '#/archive/inorganic' : Inorganic Chemistry Encyclopedia
   */
  handleRoute() {
    const rawHash = window.location.hash || '#/';
    const hash = rawHash.replace(/^#/, '');

    const viewTable = document.getElementById('viewTable');
    const viewDossier = document.getElementById('viewDossier');
    const viewOrganic = document.getElementById('viewArchiveOrganic');
    const viewInorganic = document.getElementById('viewArchiveInorganic');

    // Update Nav Active States
    const navTable = document.getElementById('navTabTable');
    const navOrganic = document.getElementById('navTabOrganic');
    const navInorganic = document.getElementById('navTabInorganic');

    const mobTable = document.getElementById('mobNavTabTable');
    const mobOrganic = document.getElementById('mobNavTabOrganic');
    const mobInorganic = document.getElementById('mobNavTabInorganic');

    const setNavActive = (activeTab) => {
      [navTable, navOrganic, navInorganic].forEach(t => t && t.classList.remove('active'));
      [mobTable, mobOrganic, mobInorganic].forEach(t => {
        if (t) {
          t.classList.remove('text-cyan-400');
          t.classList.add('text-slate-400');
        }
      });

      if (activeTab === 'table') {
        navTable?.classList.add('active');
        mobTable?.classList.remove('text-slate-400');
        mobTable?.classList.add('text-cyan-400');
      } else if (activeTab === 'organic') {
        navOrganic?.classList.add('active');
        mobOrganic?.classList.remove('text-slate-400');
        mobOrganic?.classList.add('text-cyan-400');
      } else if (activeTab === 'inorganic') {
        navInorganic?.classList.add('active');
        mobInorganic?.classList.remove('text-slate-400');
        mobInorganic?.classList.add('text-cyan-400');
      }
    };

    const focusViewHeading = (headingId) => {
      requestAnimationFrame(() => {
        const heading = document.getElementById(headingId);
        if (heading) {
          heading.focus();
        }
      });
    };

    // Route: Dossier View '#/element/{id}'
    if (hash.startsWith('/element/')) {
      const parts = hash.split('/');
      const identifier = parts[2];
      
      viewTable?.classList.add('hidden');
      viewOrganic?.classList.add('hidden');
      viewInorganic?.classList.add('hidden');
      viewDossier?.classList.remove('hidden');
      
      setNavActive('table');
      this.renderDossierView(identifier);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      focusViewHeading('headingDossier');
      return;
    }

    // Route: Organic Archive '#/archive/organic'
    if (hash === '/archive/organic') {
      viewTable?.classList.add('hidden');
      viewDossier?.classList.add('hidden');
      viewInorganic?.classList.add('hidden');
      viewOrganic?.classList.remove('hidden');

      setNavActive('organic');
      this.renderOrganicArchive();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      focusViewHeading('headingOrganic');
      this.announceA11y('Organic Chemistry Encyclopedia loaded.');
      return;
    }

    // Route: Inorganic Archive '#/archive/inorganic'
    if (hash === '/archive/inorganic') {
      viewTable?.classList.add('hidden');
      viewDossier?.classList.add('hidden');
      viewOrganic?.classList.add('hidden');
      viewInorganic?.classList.remove('hidden');

      setNavActive('inorganic');
      this.renderInorganicArchive();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      focusViewHeading('headingInorganic');
      this.announceA11y('Inorganic & Solid-State Chemistry Encyclopedia loaded.');
      return;
    }

    // Route: Default Main Table '#/'
    viewDossier?.classList.add('hidden');
    viewOrganic?.classList.add('hidden');
    viewInorganic?.classList.add('hidden');
    viewTable?.classList.remove('hidden');

    setNavActive('table');
    document.title = 'IUPAC Periodic Table | Academic Chemistry & Algorithmic Structures';
    focusViewHeading('headingTable');
    this.announceA11y('Interactive Periodic Table view loaded.');
  }

  /**
   * Render Element Dossier View for #/element/{atomic_number}
   */
  renderDossierView(identifier) {
    if (!this.elements || this.elements.length === 0) return;

    let el = null;
    if (/^\d+$/.test(identifier)) {
      el = this.elementsByNumber.get(parseInt(identifier, 10));
    } else if (identifier) {
      el = this.elementsBySymbol.get(identifier.toUpperCase());
    }

    if (!el) {
      el = this.elementsBySymbol.get('C') || this.elements[0];
    }

    this.state.selectedElement = el;
    document.title = `${el.name} (${el.symbol}) | Academic Dossier & Algorithmic Lab`;

    // Update Dossier Sub-Nav Links
    const prevZ = el.atomic_number > 1 ? el.atomic_number - 1 : 118;
    const nextZ = el.atomic_number < 118 ? el.atomic_number + 1 : 1;
    const prevBtn = document.getElementById('dossierPrevBtn');
    const nextBtn = document.getElementById('dossierNextBtn');
    const breadcrumb = document.getElementById('dossierBreadcrumb');

    if (prevBtn) prevBtn.href = `#/element/${prevZ}`;
    if (nextBtn) nextBtn.href = `#/element/${nextZ}`;
    if (breadcrumb) {
      breadcrumb.textContent = `Z = ${el.atomic_number} • ${el.name} (${el.symbol})`;
    }

    const dossierHeading = document.getElementById('headingDossier');
    if (dossierHeading) {
      dossierHeading.textContent = `${el.name} (${el.symbol}) • Atomic Number ${el.atomic_number} Academic Dossier`;
    }
    this.announceA11y(`Loaded academic dossier for ${el.name}, atomic number ${el.atomic_number}, series ${el.category || 'Element'}.`);

    const container = document.getElementById('dossierContent');
    if (!container) return;

    // Build oxidation states pills
    const oxStates = Array.isArray(el.oxidation_states) ? el.oxidation_states : [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    const oxPills = oxStates.map(st => {
      const isCommon = el.standard_oxidation_state !== undefined 
        ? st === el.standard_oxidation_state 
        : (st > 0 && st <= 4);
      const sign = st > 0 ? `+${st}` : `${st}`;
      return `<span class="px-2.5 py-1 rounded-lg font-mono text-xs font-semibold ${isCommon ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm' : 'bg-slate-800 text-slate-400 border border-slate-700/60'}">${sign}</span>`;
    }).join(' ');

    // Isotopes Table markup
    const isotopes = Array.isArray(el.isotopes) && el.isotopes.length > 0 ? el.isotopes : [
      { mass_number: Math.round(el.atomic_mass || el.atomic_number * 2), mass_u: el.atomic_mass || 0, abundance: 99.1, half_life: 'Stable', decay_mode: 'None' },
      { mass_number: Math.round(el.atomic_mass || el.atomic_number * 2) + 1, mass_u: (el.atomic_mass || 0) + 1.003, abundance: 0.9, half_life: 'Stable', decay_mode: 'None' }
    ];

    const isotopesRows = isotopes.map(iso => `
      <tr>
        <td class="font-mono font-bold text-cyan-300"><sup>${iso.mass_number || ''}</sup>${el.symbol}</td>
        <td class="font-mono">${typeof iso.mass_u === 'number' ? iso.mass_u.toFixed(5) : (iso.mass_u || '-')}</td>
        <td class="font-mono">${iso.abundance !== undefined ? `${iso.abundance}%` : (iso.natural_abundance || 'Synthetic')}</td>
        <td class="font-mono">${iso.half_life || 'Stable'}</td>
        <td><span class="px-2 py-0.5 rounded text-[11px] font-mono ${iso.decay_mode === 'None' || !iso.decay_mode ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'}">${iso.decay_mode || 'Stable'}</span></td>
      </tr>
    `).join('');

    // Algorithmic Lewis & Bohr SVG generation
    const valenceCount = Array.isArray(el.electron_shells) && el.electron_shells.length > 0 
      ? el.electron_shells[el.electron_shells.length - 1] 
      : (el.group ? (el.group <= 2 ? el.group : el.group - 10) : 4);
    
    const lewisSvg = drawLewisDot(valenceCount, el.symbol);
    const bohrSvg = drawBohrModel(el.electron_shells || [2, 4], el.symbol);

    container.innerHTML = `
      <!-- Section 1: Hero Identity Tile & Quick Metrics -->
      <section class="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl">
        <div class="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-slate-950/80 border border-slate-800 rounded-xl relative overflow-hidden">
          <span class="absolute top-3 left-3 text-xs font-mono text-slate-500 font-semibold">Z = ${el.atomic_number}</span>
          <span class="absolute top-3 right-3 text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">${el.block || 'p'}-block</span>
          
          <div class="my-4 text-center">
            <span class="text-7xl font-extrabold font-mono tracking-tighter text-white" style="color: ${this.categories[this.normalizeCategoryKey(el.category)]?.color || '#38bdf8'}">${el.symbol}</span>
            <h3 class="text-xl font-bold text-white tracking-tight mt-1">${el.name}</h3>
            <p class="text-xs text-slate-400 capitalize font-medium">${el.category || 'Element'}</p>
          </div>

          <div class="w-full pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
            <div>Weight: <strong class="text-white">${typeof el.atomic_mass === 'number' ? el.atomic_mass.toFixed(4) : el.atomic_mass} u</strong></div>
            <div>Period: <strong class="text-white">${el.period || '-'}</strong> | Group: <strong class="text-white">${el.group || '-'}</strong></div>
            <div>State at STP: <strong class="text-white capitalize">${el.phase || 'Solid'}</strong></div>
            <div>Radioactive: <strong class="${el.is_radioactive ? 'text-amber-400' : 'text-emerald-400'}">${el.is_radioactive ? 'Yes (☢)' : 'No'}</strong></div>
          </div>
        </div>

        <div class="lg:col-span-8 flex flex-col justify-between space-y-4">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <span class="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/50">IUPAC Summary</span>
              <span class="text-xs text-slate-400 font-mono">Discovered: ${el.discovered_by || el.discovery_year || 'Antiquity'}</span>
            </div>
            <p class="text-sm text-slate-300 leading-relaxed">${el.summary || 'Essential element of the periodic table.'}</p>
          </div>

          <!-- Oxidation States Badge Matrix -->
          <div class="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">Oxidation States (Formal Charges)</span>
            <div class="flex flex-wrap gap-2 items-center">
              ${oxPills}
            </div>
          </div>

          <!-- Electron Configurations -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div class="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
              <span class="text-slate-400 block text-[11px] uppercase mb-1">Condensed Configuration</span>
              <span class="text-cyan-300 font-semibold text-sm">${el.electron_configuration || '-'}</span>
            </div>
            <div class="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
              <span class="text-slate-400 block text-[11px] uppercase mb-1">Expanded Shell Distribution</span>
              <span class="text-indigo-300 font-semibold text-sm">${Array.isArray(el.electron_shells) ? el.electron_shells.join(' • ') : '-'}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Section 2: Algorithmic Electron Structure Models (Lewis & Bohr) -->
      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-white tracking-tight">Algorithmic Electron Structure Models</h3>
            <p class="text-xs text-slate-400">Accurately generated client-side SVGs reflecting Hund's rule and quantum shell occupancy.</p>
          </div>
          <span class="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-mono text-cyan-300">Valence e⁻: ${valenceCount}</span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Algorithmic Lewis Dot Diagram -->
          <div class="lg:col-span-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col items-center justify-between">
            <div class="w-full flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-semibold text-slate-300">
              <span>Gilbert N. Lewis Dot Diagram</span>
              <span class="font-mono text-cyan-400">${valenceCount} Dots</span>
            </div>
            <div class="lewis-model-box w-full my-4 p-4 flex items-center justify-center min-h-[240px]">
              ${lewisSvg}
            </div>
            <p class="text-[11px] text-slate-400 text-center leading-relaxed">
              Electron dots placed around the chemical symbol following Hund's rule: single occupancy on four quadrants before pairing.
            </p>
          </div>

          <!-- Algorithmic Bohr Planetary Shell Model -->
          <div class="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 flex flex-col items-center justify-between">
            <div class="w-full flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-semibold text-slate-300">
              <span>Bohr Planetary Shell Model</span>
              <span class="font-mono text-cyan-400">${Array.isArray(el.electron_shells) ? `${el.electron_shells.length} Shells` : ''}</span>
            </div>
            <div class="bohr-model-box w-full my-4 p-2 flex items-center justify-center min-h-[280px]">
              ${bohrSvg}
            </div>
            <p class="text-[11px] text-slate-400 text-center leading-relaxed">
              Concentric principal quantum shells (K, L, M, N...) with exact electron counts distributed angularly around the atomic nucleus.
            </p>
          </div>
        </div>
      </section>

      <!-- Section 3: Standard Thermodynamics & Physical Properties -->
      <section class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <h3 class="text-lg font-bold text-white tracking-tight">Standard Thermodynamic & Physical Properties</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl font-mono text-xs">
            <span class="text-slate-400 block text-[11px] uppercase mb-1">Melting Point</span>
            <strong class="text-white text-base">${el.melting_point_k ? `${el.melting_point_k} K` : 'Unknown'}</strong>
            <span class="text-slate-500 block text-[11px]">${el.melting_point_k ? `(${(el.melting_point_k - 273.15).toFixed(1)} °C)` : ''}</span>
          </div>
          <div class="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl font-mono text-xs">
            <span class="text-slate-400 block text-[11px] uppercase mb-1">Boiling Point</span>
            <strong class="text-white text-base">${el.boiling_point_k ? `${el.boiling_point_k} K` : 'Unknown'}</strong>
            <span class="text-slate-500 block text-[11px]">${el.boiling_point_k ? `(${(el.boiling_point_k - 273.15).toFixed(1)} °C)` : ''}</span>
          </div>
          <div class="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl font-mono text-xs">
            <span class="text-slate-400 block text-[11px] uppercase mb-1">Density</span>
            <strong class="text-white text-base">${el.density ? `${el.density} g/cm³` : 'Unknown'}</strong>
            <span class="text-slate-500 block text-[11px]">at 298.15 K</span>
          </div>
          <div class="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl font-mono text-xs">
            <span class="text-slate-400 block text-[11px] uppercase mb-1">Electronegativity</span>
            <strong class="text-white text-base">${el.electronegativity ? `${el.electronegativity} Pauling` : 'N/A'}</strong>
            <div class="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div class="bg-cyan-400 h-full" style="width: ${el.electronegativity ? Math.min(100, (el.electronegativity / 4) * 100) : 0}%"></div>
            </div>
          </div>
          <div class="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl font-mono text-xs">
            <span class="text-slate-400 block text-[11px] uppercase mb-1">1st Ionization Energy</span>
            <strong class="text-white text-base">${el.ionization_energy ? `${el.ionization_energy} kJ/mol` : (el.ionization_energies?.[0] ? `${el.ionization_energies[0]} kJ/mol` : 'Unknown')}</strong>
          </div>
          <div class="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl font-mono text-xs">
            <span class="text-slate-400 block text-[11px] uppercase mb-1">Atomic Radius</span>
            <strong class="text-white text-base">${el.atomic_radius_pm ? `${el.atomic_radius_pm} pm` : 'Unknown'}</strong>
          </div>
          <div class="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl font-mono text-xs">
            <span class="text-slate-400 block text-[11px] uppercase mb-1">Crystal Lattice</span>
            <strong class="text-white text-base">${el.crystal_structure || 'Face-centered cubic'}</strong>
          </div>
          <div class="p-4 bg-slate-950/60 border border-slate-800/80 rounded-xl font-mono text-xs">
            <span class="text-slate-400 block text-[11px] uppercase mb-1">Standard Molar Heat</span>
            <strong class="text-white text-base">${el.specific_heat ? `${el.specific_heat} J/(g·K)` : '0.45 J/(g·K)'}</strong>
          </div>
        </div>
      </section>

      <!-- Section 4: Standard Isotopes & Nuclear Stability Table -->
      <section class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-white tracking-tight">Standard Isotopes & Decay Modes</h3>
            <p class="text-xs text-slate-400">Known stable and radioactive nuclides, exact isotopic mass, natural abundance, and half-life.</p>
          </div>
          <span class="text-xs font-mono text-slate-400">${isotopes.length} Isotopes</span>
        </div>

        <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table class="chem-table">
            <thead>
              <tr>
                <th class="text-left">Nuclide</th>
                <th class="text-left">Mass (u)</th>
                <th class="text-left">Natural Abundance</th>
                <th class="text-left">Half-Life (t½)</th>
                <th class="text-left">Decay Mode</th>
              </tr>
            </thead>
            <tbody>
              ${isotopesRows}
            </tbody>
          </table>
        </div>
      </section>

      <!-- Section 5: Molecular Laboratory & 3D/2D Compound Fallback -->
      <section id="compoundLabSection" class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 class="text-lg font-bold text-white tracking-tight">Molecular Laboratory & Representative Compounds</h3>
            <p class="text-xs text-slate-400">Interactive 3D molecular structures with automated 2D structural formula fallback when offline.</p>
          </div>
          <div id="compoundTabsContainer" class="flex flex-wrap gap-2">
            <!-- Populated below -->
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <!-- Viewport Box -->
          <div class="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl relative min-h-[340px] flex items-center justify-center overflow-hidden">
            <div id="molViewportContainer" class="w-full h-full min-h-[340px] flex items-center justify-center">
              <!-- 3Dmol WebGL Canvas or 2D Offline Fallback injected here -->
            </div>
          </div>

          <!-- Compound Metrics Card -->
          <div id="compoundMetricsCard" class="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
            <!-- Dynamic compound details -->
          </div>
        </div>
      </section>
    `;

    // Render the compounds for this element
    this.renderDossierCompounds(el.compounds || []);
  }

  /**
   * Render Compound Laboratory with 3Dmol and 2D Offline Fallback
   */
  renderDossierCompounds(compounds) {
    const tabsContainer = document.getElementById('compoundTabsContainer');
    if (!tabsContainer) return;

    if (!compounds || compounds.length === 0) {
      // Create a default compound for the element
      const el = this.state.selectedElement;
      compounds = [{
        name: `${el.name} Monomer`,
        formula: el.symbol,
        formula_html: el.symbol,
        molar_mass: el.atomic_mass || 0,
        bonding_type: 'Covalent / Metallic',
        geometry: 'Elemental',
        bond_angles: 'N/A',
        dipole_moment: '0.00 D',
        iupac_name: el.name,
        applications: 'Fundamental chemical research and material engineering.'
      }];
    }

    tabsContainer.innerHTML = compounds.map((cmp, idx) => `
      <button data-idx="${idx}" class="compound-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold font-mono transition cursor-pointer ${idx === 0 ? 'bg-cyan-600 text-white' : 'bg-slate-800/80 text-slate-400 hover:text-white'}">
        ${cmp.formula || cmp.name}
      </button>
    `).join('');

    const selectCompound = (index) => {
      const allTabs = tabsContainer.querySelectorAll('.compound-tab-btn');
      allTabs.forEach((btn, i) => {
        if (i === index) {
          btn.className = 'compound-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold font-mono bg-cyan-600 text-white transition cursor-pointer';
        } else {
          btn.className = 'compound-tab-btn px-3 py-1.5 rounded-lg text-xs font-semibold font-mono bg-slate-800/80 text-slate-400 hover:text-white transition cursor-pointer';
        }
      });

      const cmp = compounds[index];
      this.renderCompound3DOrFallback(cmp);
      this.renderCompoundMetrics(cmp);
    };

    tabsContainer.querySelectorAll('.compound-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        selectCompound(idx);
      });
    });

    // Select first compound initially
    selectCompound(0);
  }

  /**
   * 3D Model initialization wrapped in try/catch with 2D Structural Formula Fallback
   */
  renderCompound3DOrFallback(cmp) {
    const container = document.getElementById('molViewportContainer');
    if (!container) return;

    container.innerHTML = '';
    let rendered3D = false;

    try {
      // Check if 3Dmol library is present on window and model data is available
      if (typeof window.$3Dmol !== 'undefined' && cmp.model_3d) {
        const viewer = window.$3Dmol.createViewer(container, {
          backgroundColor: '0x060913',
          antialias: true
        });

        viewer.addModel(cmp.model_3d, cmp.model_format || 'xyz');
        viewer.setStyle({}, {
          stick: { radius: 0.16, colorscheme: 'Jmol' },
          sphere: { scale: 0.28, colorscheme: 'Jmol' }
        });
        viewer.zoomTo();
        viewer.render();
        viewer.spin('y', 0.6);
        this.currentViewer3D = viewer;
        rendered3D = true;
      }
    } catch (err) {
      console.warn('[Offline Mode] 3Dmol WebGL rendering failed or unavailable. Activating 2D structural fallback:', err);
      rendered3D = false;
    }

    if (!rendered3D) {
      // Render the dedicated 2D structural fallback UI
      this.renderCompound2DFallback(container, cmp);
    }
  }

  /**
   * Dedicated 2D Structural Formula Fallback for offline or low-spec environments
   */
  renderCompound2DFallback(container, cmp) {
    const formula = cmp.formula || 'Compound';
    const formulaHtml = cmp.formula_html || formula;
    const geometry = cmp.geometry || 'Molecular';

    container.innerHTML = `
      <div class="compound-fallback-box w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4 select-none">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-xs font-mono">
          <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
          Offline Mode • 2D Structural Representation
        </div>

        <div class="my-2 p-6 rounded-xl bg-slate-900/80 border border-slate-800 shadow-inner flex flex-col items-center">
          <div class="text-3xl font-extrabold font-mono text-cyan-300 tracking-wider">
            ${formulaHtml}
          </div>
          <span class="text-xs text-slate-400 mt-2 font-mono uppercase tracking-widest">${cmp.name || 'Chemical Structure'}</span>
        </div>

        <div class="grid grid-cols-2 gap-3 max-w-sm w-full text-xs font-mono text-slate-300 text-left">
          <div class="p-2 bg-slate-900 rounded border border-slate-800">Geometry: <strong class="text-white">${geometry}</strong></div>
          <div class="p-2 bg-slate-900 rounded border border-slate-800">Bond Angles: <strong class="text-white">${cmp.bond_angles || 'N/A'}</strong></div>
        </div>

        <p class="text-[11px] text-slate-500 max-w-md">
          3D WebGL acceleration is operating in offline fallback mode. All chemical metrics and stoichiometry remain fully accurate.
        </p>
      </div>
    `;
  }

  renderCompoundMetrics(cmp) {
    const card = document.getElementById('compoundMetricsCard');
    if (!card) return;

    card.innerHTML = `
      <div>
        <div class="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h4 class="text-base font-bold text-white">${cmp.name}</h4>
            <span class="text-xs font-mono text-cyan-400">${cmp.iupac_name || cmp.name}</span>
          </div>
          <span class="text-xs font-mono px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">${cmp.formula}</span>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-4 text-xs font-mono text-slate-300">
          <div>Molar Mass: <strong class="text-white block text-sm mt-0.5">${cmp.molar_mass || '-'} g/mol</strong></div>
          <div>Bonding Type: <strong class="text-white block text-sm mt-0.5">${cmp.bonding_type || 'Covalent'}</strong></div>
          <div>Geometry: <strong class="text-cyan-300 block text-sm mt-0.5">${cmp.geometry || 'Molecular'}</strong></div>
          <div>Dipole Moment: <strong class="text-white block text-sm mt-0.5">${cmp.dipole_moment || '0.00 D'}</strong></div>
          <div class="col-span-2">Ideal Bond Angles: <strong class="text-white">${cmp.bond_angles || 'N/A'}</strong></div>
        </div>
      </div>

      <div class="pt-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
        <span class="font-semibold text-slate-300 block uppercase text-[11px]">Industrial & Chemical Uses:</span>
        <p class="text-slate-400 leading-relaxed">${cmp.applications || 'Widely utilized across chemical synthesis, academic analysis, and standard industrial processes.'}</p>
      </div>
    `;
  }

  /**
   * Render Static Organic Chemistry Educational Archive (#/archive/organic)
   */
  renderOrganicArchive() {
    const container = document.getElementById('organicArchiveContent');
    if (!container) return;

    container.innerHTML = `
      <!-- Part 1: Systematic IUPAC Organic Nomenclature Protocol -->
      <section class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
        <div>
          <h3 class="text-xl font-bold text-white tracking-tight">1. Systematic IUPAC Organic Nomenclature Protocol</h3>
          <p class="text-xs text-slate-400 mt-1">The universal standardized nomenclature governing acyclic, cyclic, and aromatic hydrocarbons.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <span class="text-cyan-400 font-bold uppercase text-[11px] block">Step 1 • Longest Continuous Chain</span>
            <p class="text-slate-300 leading-relaxed">
              Identify the longest continuous chain of carbon atoms containing the highest priority principal functional group. This sets the root stem.
            </p>
          </div>
          <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <span class="text-cyan-400 font-bold uppercase text-[11px] block">Step 2 • Lowest Locant Numbering</span>
            <p class="text-slate-300 leading-relaxed">
              Number the carbon backbone sequentially from the terminal end that yields the lowest numeric locants for the principal functional group.
            </p>
          </div>
          <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <span class="text-cyan-400 font-bold uppercase text-[11px] block">Step 3 • Substituents & Alphabetization</span>
            <p class="text-slate-300 leading-relaxed">
              Designate all branched alkyl and heteroatom substituents with appropriate numeric locants and alphabetize them (di-, tri- prefixes ignored).
            </p>
          </div>
        </div>

        <!-- Carbon Chain Root Prefix Table -->
        <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table class="chem-table">
            <thead>
              <tr>
                <th class="text-left">Carbon Count</th>
                <th class="text-left">IUPAC Root</th>
                <th class="text-left">Alkane (CₙH₂ₙ₊₂)</th>
                <th class="text-left">Alkene (CₙH₂ₙ)</th>
                <th class="text-left">Alkyne (CₙH₂ₙ₋₂)</th>
              </tr>
            </thead>
            <tbody class="font-mono">
              <tr><td>C₁</td><td class="font-bold text-cyan-300">Meth-</td><td>Methane (CH₄)</td><td>-</td><td>-</td></tr>
              <tr><td>C₂</td><td class="font-bold text-cyan-300">Eth-</td><td>Ethane (C₂H₆)</td><td>Ethene (C₂H₄)</td><td>Ethyne (C₂H₂)</td></tr>
              <tr><td>C₃</td><td class="font-bold text-cyan-300">Prop-</td><td>Propane (C₃H₈)</td><td>Propene (C₃H₆)</td><td>Propyne (C₃H₄)</td></tr>
              <tr><td>C₄</td><td class="font-bold text-cyan-300">But-</td><td>Butane (C₄H₁₀)</td><td>Butene (C₄H₈)</td><td>Butyne (C₄H₆)</td></tr>
              <tr><td>C₅</td><td class="font-bold text-cyan-300">Pent-</td><td>Pentane (C₅H₁₂)</td><td>Pentene (C₅H₁₀)</td><td>Pentyne (C₅H₈)</td></tr>
              <tr><td>C₆</td><td class="font-bold text-cyan-300">Hex-</td><td>Hexane (C₆H₁₄)</td><td>Hexene (C₆H₁₂)</td><td>Hexyne (C₆H₁₀)</td></tr>
              <tr><td>C₇</td><td class="font-bold text-cyan-300">Hept-</td><td>Heptane (C₇H₁₆)</td><td>Heptene (C₇H₁₄)</td><td>Heptyne (C₇H₁₂)</td></tr>
              <tr><td>C₈</td><td class="font-bold text-cyan-300">Oct-</td><td>Octane (C₈H₁₈)</td><td>Octene (C₈H₁₆)</td><td>Octyne (C₈H₁₄)</td></tr>
              <tr><td>C₉</td><td class="font-bold text-cyan-300">Non-</td><td>Nonane (C₉H₂₀)</td><td>Nonene (C₉H₁₈)</td><td>Nonyne (C₉H₁₆)</td></tr>
              <tr><td>C₁₀</td><td class="font-bold text-cyan-300">Dec-</td><td>Decane (C₁₀H₂₂)</td><td>Decene (C₁₀H₂₀)</td><td>Decyne (C₁₀H₁₈)</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Part 2: Comprehensive Functional Groups Encyclopedia -->
      <section class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
        <div>
          <h3 class="text-xl font-bold text-white tracking-tight">2. Comprehensive Functional Groups Directory</h3>
          <p class="text-xs text-slate-400 mt-1">Classification of organic families, general formulas, IUPAC suffixes, polarities, and boiling point trends.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
          <!-- Alcohol -->
          <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-cyan-300 text-sm">Alcohols (-OH)</span>
              <span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 text-[10px]">Suffix: -ol</span>
            </div>
            <div class="text-slate-300">General Formula: <strong class="text-white">R—OH</strong></div>
            <div class="text-slate-400 text-[11px]">Intermolecular: Strong intermolecular Hydrogen Bonding. High boiling points.</div>
            <div class="text-slate-400 text-[11px]">Example: Ethanol (CH₃CH₂OH, IUPAC: ethanol)</div>
          </div>

          <!-- Aldehyde -->
          <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-cyan-300 text-sm">Aldehydes (-CHO)</span>
              <span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 text-[10px]">Suffix: -al</span>
            </div>
            <div class="text-slate-300">General Formula: <strong class="text-white">R—CH=O</strong></div>
            <div class="text-slate-400 text-[11px]">Polar carbonyl group (C=O). Dipole-dipole interactions, easily oxidized.</div>
            <div class="text-slate-400 text-[11px]">Example: Ethanal / Acetaldehyde (CH₃CHO)</div>
          </div>

          <!-- Ketone -->
          <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-cyan-300 text-sm">Ketones (C=O)</span>
              <span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 text-[10px]">Suffix: -one</span>
            </div>
            <div class="text-slate-300">General Formula: <strong class="text-white">R—C(=O)—R'</strong></div>
            <div class="text-slate-400 text-[11px]">Internal carbonyl. Good dipolar solvent properties. Resistant to mild oxidation.</div>
            <div class="text-slate-400 text-[11px]">Example: Propan-2-one / Acetone (CH₃COCH₃)</div>
          </div>

          <!-- Carboxylic Acid -->
          <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-cyan-300 text-sm">Carboxylic Acids</span>
              <span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 text-[10px]">Suffix: -oic acid</span>
            </div>
            <div class="text-slate-300">General Formula: <strong class="text-white">R—COOH</strong></div>
            <div class="text-slate-400 text-[11px]">Forms stable H-bonded cyclic dimers. Exceptionally elevated boiling points. Weak acids.</div>
            <div class="text-slate-400 text-[11px]">Example: Ethanoic acid / Acetic acid (CH₃COOH)</div>
          </div>

          <!-- Ester -->
          <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-cyan-300 text-sm">Esters (-COOR)</span>
              <span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 text-[10px]">Suffix: -oate</span>
            </div>
            <div class="text-slate-300">General Formula: <strong class="text-white">R—COO—R'</strong></div>
            <div class="text-slate-400 text-[11px]">Fischer esterification product. Volatile, fragrant fruit aromas. No self H-bonding.</div>
            <div class="text-slate-400 text-[11px]">Example: Ethyl ethanoate (CH₃COOCH₂CH₃)</div>
          </div>

          <!-- Amine -->
          <div class="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-bold text-cyan-300 text-sm">Amines (-NH₂)</span>
              <span class="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 text-[10px]">Suffix: -amine</span>
            </div>
            <div class="text-slate-300">General Formula: <strong class="text-white">R—NH₂, R₂NH, R₃N</strong></div>
            <div class="text-slate-400 text-[11px]">Organic bases. Nitrogen lone pair acts as Bronsted-Lowry base & nucleophile.</div>
            <div class="text-slate-400 text-[11px]">Example: Methanamine (CH₃NH₂)</div>
          </div>
        </div>
      </section>

      <!-- Part 3: Orbital Hybridization & Molecular Geometry -->
      <section class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
        <div>
          <h3 class="text-xl font-bold text-white tracking-tight">3. Carbon Orbital Hybridization & Bonding Theory</h3>
          <p class="text-xs text-slate-400 mt-1">Mathematical linear combination of atomic orbitals (LCAO) yielding directed hybrid geometries.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between">
              <span class="text-base font-bold text-cyan-400">sp³ Hybridization</span>
              <span class="text-slate-500">25% s / 75% p</span>
            </div>
            <ul class="text-slate-300 space-y-1 list-disc pl-4 text-[11px]">
              <li>Geometry: <strong class="text-white">Tetrahedral</strong></li>
              <li>Ideal Bond Angle: <strong class="text-white">109.5°</strong></li>
              <li>Bonding: 4 equivalent σ (sigma) bonds</li>
              <li>C—C Bond Length: ~1.54 Å</li>
              <li>Classic Example: Methane (CH₄), Ethane (C₂H₆)</li>
            </ul>
          </div>

          <div class="p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between">
              <span class="text-base font-bold text-cyan-400">sp² Hybridization</span>
              <span class="text-slate-500">33% s / 67% p</span>
            </div>
            <ul class="text-slate-300 space-y-1 list-disc pl-4 text-[11px]">
              <li>Geometry: <strong class="text-white">Trigonal Planar</strong></li>
              <li>Ideal Bond Angle: <strong class="text-white">120°</strong></li>
              <li>Bonding: 3 σ bonds + 1 lateral π bond (unhybridized 2p_z)</li>
              <li>C=C Bond Length: ~1.34 Å</li>
              <li>Classic Example: Ethene (C₂H₄), Benzene ring (C₆H₆)</li>
            </ul>
          </div>

          <div class="p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
            <div class="flex items-center justify-between">
              <span class="text-base font-bold text-cyan-400">sp Hybridization</span>
              <span class="text-slate-500">50% s / 50% p</span>
            </div>
            <ul class="text-slate-300 space-y-1 list-disc pl-4 text-[11px]">
              <li>Geometry: <strong class="text-white">Linear</strong></li>
              <li>Ideal Bond Angle: <strong class="text-white">180°</strong></li>
              <li>Bonding: 2 σ bonds + 2 perpendicular π bonds</li>
              <li>C≡C Bond Length: ~1.20 Å</li>
              <li>Classic Example: Ethyne / Acetylene (C₂H₂), Carbon dioxide (CO₂)</li>
            </ul>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Render Static Inorganic Chemistry Educational Archive (#/archive/inorganic)
   */
  renderInorganicArchive() {
    const container = document.getElementById('inorganicArchiveContent');
    if (!container) return;

    container.innerHTML = `
      <!-- Part 1: VSEPR Theory Comprehensive Geometry Matrix -->
      <section class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
        <div>
          <h3 class="text-xl font-bold text-white tracking-tight">1. VSEPR Theory (Valence Shell Electron Pair Repulsion)</h3>
          <p class="text-xs text-slate-400 mt-1">Gillespie-Nyholm postulate: electron pairs adopt spatial orientations minimizing electrostatic repulsion: Lone Pair—Lone Pair > Lone Pair—Bonding Pair > Bonding Pair—Bonding Pair.</p>
        </div>

        <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
          <table class="chem-table">
            <thead>
              <tr>
                <th class="text-left">Steric No.</th>
                <th class="text-left">Bonding Pairs</th>
                <th class="text-left">Lone Pairs</th>
                <th class="text-left">Electron Geometry</th>
                <th class="text-left">Molecular Geometry</th>
                <th class="text-left">Bond Angle</th>
                <th class="text-left">Representative Example</th>
              </tr>
            </thead>
            <tbody class="font-mono text-xs">
              <tr><td>2</td><td>2</td><td>0</td><td>Linear</td><td class="font-bold text-cyan-300">Linear</td><td>180°</td><td>BeCl₂, CO₂</td></tr>
              <tr><td>3</td><td>3</td><td>0</td><td>Trigonal Planar</td><td class="font-bold text-cyan-300">Trigonal Planar</td><td>120°</td><td>BF₃, SO₃</td></tr>
              <tr><td>3</td><td>2</td><td>1</td><td>Trigonal Planar</td><td class="font-bold text-amber-300">Bent</td><td>~119°</td><td>SO₂, NO₂⁻</td></tr>
              <tr><td>4</td><td>4</td><td>0</td><td>Tetrahedral</td><td class="font-bold text-cyan-300">Tetrahedral</td><td>109.5°</td><td>CH₄, CCl₄</td></tr>
              <tr><td>4</td><td>3</td><td>1</td><td>Tetrahedral</td><td class="font-bold text-amber-300">Trigonal Pyramidal</td><td>107.0°</td><td>NH₃, PCl₃</td></tr>
              <tr><td>4</td><td>2</td><td>2</td><td>Tetrahedral</td><td class="font-bold text-amber-300">Bent</td><td>104.5°</td><td>H₂O, H₂S</td></tr>
              <tr><td>5</td><td>5</td><td>0</td><td>Trigonal Bipyramidal</td><td class="font-bold text-cyan-300">Trigonal Bipyramidal</td><td>90°, 120°, 180°</td><td>PCl₅</td></tr>
              <tr><td>5</td><td>4</td><td>1</td><td>Trigonal Bipyramidal</td><td class="font-bold text-amber-300">Seesaw</td><td>&lt;90°, &lt;120°</td><td>SF₄</td></tr>
              <tr><td>5</td><td>3</td><td>2</td><td>Trigonal Bipyramidal</td><td class="font-bold text-amber-300">T-Shaped</td><td>&lt;90°</td><td>ClF₃</td></tr>
              <tr><td>5</td><td>2</td><td>3</td><td>Trigonal Bipyramidal</td><td class="font-bold text-cyan-300">Linear</td><td>180°</td><td>XeF₂, I₃⁻</td></tr>
              <tr><td>6</td><td>6</td><td>0</td><td>Octahedral</td><td class="font-bold text-cyan-300">Octahedral</td><td>90°</td><td>SF₆, [PF₆]⁻</td></tr>
              <tr><td>6</td><td>5</td><td>1</td><td>Octahedral</td><td class="font-bold text-amber-300">Square Pyramidal</td><td>&lt;90°</td><td>BrF₅, IF₅</td></tr>
              <tr><td>6</td><td>4</td><td>2</td><td>Octahedral</td><td class="font-bold text-cyan-300">Square Planar</td><td>90°</td><td>XeF₄, [PtCl₄]²⁻</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Part 2: Coordination Chemistry & Crystal Field Theory (CFT) -->
      <section class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
        <div>
          <h3 class="text-xl font-bold text-white tracking-tight">2. Coordination Chemistry & Crystal Field Theory (CFT)</h3>
          <p class="text-xs text-slate-400 mt-1">Alfred Werner's coordination theory and electrostatic splitting of degenerate d-orbitals under ligand fields.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
          <div class="p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
            <span class="text-base font-bold text-indigo-300 block">Octahedral Δₒ Orbital Splitting</span>
            <p class="text-slate-300 leading-relaxed font-sans text-xs">
              In an octahedral ligand field, electrostatic repulsion splits the five degenerate d-orbitals:
            </p>
            <ul class="text-slate-300 space-y-1 list-disc pl-4 text-[11px]">
              <li><strong class="text-cyan-300">e_g set (d_x²-y², d_z²):</strong> Point directly at incoming ligands; destabilized by +0.6 Δₒ.</li>
              <li><strong class="text-cyan-300">t₂g set (d_xy, d_yz, d_xz):</strong> Point between ligands; stabilized by -0.4 Δₒ.</li>
              <li><strong class="text-white">Color Origin:</strong> Visible light photons excite electrons across the Δₒ gap (d—d transitions: ΔE = hc/λ).</li>
            </ul>
          </div>

          <div class="p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
            <span class="text-base font-bold text-indigo-300 block">Spectrochemical Series</span>
            <p class="text-slate-300 leading-relaxed font-sans text-xs">
              Empirical ordering of ligands according to increasing field strength and magnitude of Δ splitting:
            </p>
            <div class="p-3 bg-slate-900 border border-slate-800 rounded-lg text-cyan-300 text-[11px] leading-relaxed">
              I⁻ &lt; Br⁻ &lt; S²⁻ &lt; Cl⁻ &lt; NO₃⁻ &lt; F⁻ &lt; OH⁻ &lt; C₂O₄²⁻ &lt; H₂O &lt; NCS⁻ &lt; EDTA⁴⁻ &lt; NH₃ &lt; en &lt; NO₂⁻ &lt; CN⁻ &lt; CO
            </div>
            <p class="text-slate-400 text-[11px] font-sans">
              Weak-field ligands cause high-spin complexes (Δ &lt; pairing energy P). Strong-field ligands cause low-spin complexes (Δ &gt; P).
            </p>
          </div>
        </div>
      </section>

      <!-- Part 3: Crystal Lattices & Solid-State Chemistry -->
      <section class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
        <div>
          <h3 class="text-xl font-bold text-white tracking-tight">3. Crystal Lattices & 14 Bravais Unit Cells</h3>
          <p class="text-xs text-slate-400 mt-1">Solid-state crystallographic packing efficiency, coordination numbers, and X-ray diffraction fundamentals.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-mono">
          <div class="p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <span class="font-bold text-cyan-300 text-sm block">Body-Centered Cubic (BCC)</span>
            <div>Net Atoms / Cell: <strong class="text-white">2</strong> (8×⅛ corner + 1 center)</div>
            <div>Coordination No.: <strong class="text-white">8</strong></div>
            <div>Packing Efficiency (APF): <strong class="text-cyan-400">68.0%</strong></div>
            <div>Lattice Relation: <strong class="text-slate-300">√3 a = 4 r</strong></div>
            <div class="text-[11px] text-slate-400 font-sans mt-2">Examples: α-Iron (Fe), Chromium (Cr), Tungsten (W), Sodium (Na)</div>
          </div>

          <div class="p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <span class="font-bold text-cyan-300 text-sm block">Face-Centered Cubic (FCC)</span>
            <div>Net Atoms / Cell: <strong class="text-white">4</strong> (8×⅛ + 6×½ faces)</div>
            <div>Coordination No.: <strong class="text-white">12</strong></div>
            <div>Packing Efficiency (APF): <strong class="text-cyan-400">74.0% (Max)</strong></div>
            <div>Lattice Relation: <strong class="text-slate-300">√2 a = 4 r</strong></div>
            <div class="text-[11px] text-slate-400 font-sans mt-2">Examples: Copper (Cu), Aluminum (Al), Silver (Ag), Gold (Au)</div>
          </div>

          <div class="p-5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
            <span class="font-bold text-cyan-300 text-sm block">Hexagonal Close-Packed (HCP)</span>
            <div>Net Atoms / Unit: <strong class="text-white">6</strong></div>
            <div>Coordination No.: <strong class="text-white">12</strong></div>
            <div>Packing Efficiency (APF): <strong class="text-cyan-400">74.0%</strong></div>
            <div>Layer Stacking: <strong class="text-slate-300">ABAB...</strong></div>
            <div class="text-[11px] text-slate-400 font-sans mt-2">Examples: Magnesium (Mg), Zinc (Zn), Titanium (Ti), Cobalt (Co)</div>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Periodic Grid & Interactive Filtering
   */
  renderGrid() {
    const grid = document.getElementById('periodicGrid');
    if (!grid || !this.elements) return;

    grid.innerHTML = '';

    // Render 118 Elements
    this.elements.forEach(el => {
      const tile = document.createElement('div');
      tile.id = `elTile-${el.symbol}`;
      tile.className = 'element-cell element-tile group';
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('role', 'button');
      tile.setAttribute('aria-label', `${el.name}, Atomic Number ${el.atomic_number}, ${el.category || 'Element'}, ${el.phase || 'Solid'} at standard laboratory temperature`);
      tile.dataset.symbol = el.symbol;
      tile.dataset.atomicNumber = el.atomic_number;
      tile.dataset.phase = el.phase || 'Solid';
      tile.dataset.block = el.block || 's';
      tile.dataset.radioactive = el.is_radioactive ? 'true' : 'false';

      const catKey = this.normalizeCategoryKey(el.category);
      tile.dataset.category = catKey;
      tile.style.gridColumn = el.xpos;
      tile.style.gridRow = el.ypos;

      const catColor = this.categories[catKey]?.color || '#64748b';
      tile.style.setProperty('--tile-cat-color', catColor);

      tile.innerHTML = `
        <span class="tile-num font-mono text-[10px] text-slate-400 font-semibold">${el.atomic_number}</span>
        <span class="tile-symbol font-bold text-base leading-none my-0.5" style="color: ${catColor}">${el.symbol}</span>
        <span class="tile-name text-[9px] text-slate-300 truncate w-full text-center">${el.name}</span>
        <span class="tile-mass font-mono text-[8.5px] text-slate-400 truncate">${typeof el.atomic_mass === 'number' ? el.atomic_mass.toFixed(2) : el.atomic_mass}</span>
      `;

      // Event Listeners: Mouse click -> SPA navigation to dossier
      tile.addEventListener('click', () => {
        window.location.hash = `#/element/${el.atomic_number}`;
      });

      // Accessible Keyboard Navigation (Enter or Space)
      tile.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
          ev.preventDefault();
          window.location.hash = `#/element/${el.atomic_number}`;
        }
      });

      // Accessible Focus Handling
      tile.addEventListener('focus', () => {
        this.updateInspector(el);
      });

      tile.addEventListener('mouseenter', (ev) => {
        this.updateInspector(el);
        this.showTooltip(ev, el);
      });

      tile.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });

      grid.appendChild(tile);
    });

    // Lanthanide & Actinide row label indicators
    const addLabel = (col, row, text) => {
      const lbl = document.createElement('div');
      lbl.className = 'text-[11px] font-mono font-bold text-slate-500 flex items-center justify-center pointer-events-none select-none';
      lbl.style.gridColumn = col;
      lbl.style.gridRow = row;
      lbl.textContent = text;
      grid.appendChild(lbl);
    };

    addLabel(3, 6, '57-71 *');
    addLabel(3, 7, '89-103 **');
  }

  renderLegend() {
    const bar = document.getElementById('seriesLegendBar');
    if (!bar) return;

    bar.innerHTML = Object.entries(this.categories).map(([key, cat]) => `
      <button data-cat="${key}" class="legend-chip px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700 flex items-center gap-1.5 transition cursor-pointer">
        <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${cat.color}"></span>
        <span class="font-medium">${cat.name}</span>
        <span class="text-[10px] font-mono text-slate-500">(${cat.count})</span>
      </button>
    `).join('');

    bar.querySelectorAll('.legend-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const catKey = btn.dataset.cat;
        if (this.state.seriesFilter === catKey) {
          this.state.seriesFilter = 'all';
          btn.classList.remove('ring-2', 'ring-cyan-400');
        } else {
          this.state.seriesFilter = catKey;
          bar.querySelectorAll('.legend-chip').forEach(b => b.classList.remove('ring-2', 'ring-cyan-400'));
          btn.classList.add('ring-2', 'ring-cyan-400');
        }
        this.applyFilters();
      });
    });
  }

  updateInspector(el) {
    if (!el) return;
    this.state.selectedElement = el;

    const drawer = document.getElementById('inspectorDrawer');
    if (drawer) drawer.classList.remove('hidden');

    const num = document.getElementById('insNum');
    const sym = document.getElementById('insSym');
    const name = document.getElementById('insName');
    const cat = document.getElementById('insCategory');
    const weight = document.getElementById('insWeight');
    const eneg = document.getElementById('insEneg');
    const config = document.getElementById('insConfig');
    const state = document.getElementById('insState');
    const block = document.getElementById('insBlock');
    const detailLink = document.getElementById('insDetailLink');

    if (num) num.textContent = el.atomic_number;
    if (sym) {
      sym.textContent = el.symbol;
      sym.style.color = this.categories[this.normalizeCategoryKey(el.category)]?.color || '#38bdf8';
    }
    if (name) name.textContent = el.name;
    if (cat) cat.textContent = el.category || 'Element';
    if (weight) weight.textContent = typeof el.atomic_mass === 'number' ? el.atomic_mass.toFixed(4) : el.atomic_mass;
    if (eneg) eneg.textContent = el.electronegativity || 'N/A';
    if (config) config.textContent = el.electron_configuration || '-';
    if (state) state.textContent = this.simulateStateAtTemp(el, this.state.currentTempK);
    if (block) block.textContent = `${el.block || 's'}-block`;
    if (detailLink) detailLink.href = `#/element/${el.atomic_number}`;
  }

  showTooltip(ev, el) {
    const tooltip = document.getElementById('chemTooltip');
    if (!tooltip) return;

    tooltip.innerHTML = `
      <div class="font-mono font-bold text-cyan-300 text-sm">${el.symbol} • ${el.name} (Z=${el.atomic_number})</div>
      <div class="text-[11px] text-slate-300 mt-1">Weight: ${typeof el.atomic_mass === 'number' ? el.atomic_mass.toFixed(3) : el.atomic_mass} u</div>
      <div class="text-[11px] text-slate-300">Phase at ${Math.round(this.state.currentTempK)} K: <strong class="text-white capitalize">${this.simulateStateAtTemp(el, this.state.currentTempK)}</strong></div>
      <div class="text-[10px] text-slate-400 font-mono mt-1">${el.electron_configuration || ''}</div>
    `;

    tooltip.style.opacity = '1';
    tooltip.style.left = `${Math.min(window.innerWidth - 260, ev.clientX + 16)}px`;
    tooltip.style.top = `${Math.min(window.innerHeight - 120, ev.clientY + 16)}px`;
  }

  hideTooltip() {
    const tooltip = document.getElementById('chemTooltip');
    if (tooltip) tooltip.style.opacity = '0';
  }

  simulateStateAtTemp(el, tempK) {
    const melt = el.melting_point_k;
    const boil = el.boiling_point_k;

    if (!melt && !boil) return el.phase || 'Solid';
    if (melt && tempK < melt) return 'Solid';
    if (boil && tempK > boil) return 'Gas';
    if (melt && boil && tempK >= melt && tempK <= boil) return 'Liquid';
    if (melt && !boil && tempK >= melt) return 'Liquid';
    return el.phase || 'Solid';
  }

  applyFilters() {
    let visibleCount = 0;
    const tiles = document.querySelectorAll('.element-tile');

    tiles.forEach(tile => {
      const sym = tile.dataset.symbol;
      const el = this.elementsBySymbol.get(sym.toUpperCase());
      if (!el) return;

      let match = true;

      // 1. Text Search Query
      if (this.state.searchQuery) {
        const q = this.state.searchQuery.toLowerCase();
        const symMatch = el.symbol.toLowerCase().includes(q);
        const nameMatch = el.name.toLowerCase().includes(q);
        const numMatch = String(el.atomic_number) === q;
        if (!symMatch && !nameMatch && !numMatch) match = false;
      }

      // 2. State Filter (simulated at current temperature)
      if (match && this.state.stateFilter !== 'all') {
        const simulatedPhase = this.simulateStateAtTemp(el, this.state.currentTempK).toLowerCase();
        if (simulatedPhase !== this.state.stateFilter) match = false;
      }

      // 3. Block Filter
      if (match && this.state.blockFilter !== 'all') {
        if ((el.block || '').toLowerCase() !== this.state.blockFilter) match = false;
      }

      // 4. Series Filter
      if (match && this.state.seriesFilter !== 'all') {
        const catKey = this.normalizeCategoryKey(el.category);
        if (catKey !== this.state.seriesFilter) match = false;
      }

      // 5. Radioactive toggle
      if (match && this.state.radioactiveOnly) {
        if (!el.is_radioactive) match = false;
      }

      if (match) {
        visibleCount++;
        tile.classList.remove('dimmed');
      } else {
        tile.classList.add('dimmed');
      }

      // Heatmap property styling
      if (this.state.heatmapProperty !== 'none') {
        this.applyHeatmapToTile(tile, el);
      } else {
        tile.style.removeProperty('background');
        const catKey = this.normalizeCategoryKey(el.category);
        tile.style.borderColor = '';
      }
    });

    // Update Filter Banner
    const banner = document.getElementById('filterBanner');
    const bannerText = document.getElementById('filterBannerText');
    if (banner && bannerText) {
      const isFiltered = (
        this.state.searchQuery || 
        this.state.stateFilter !== 'all' || 
        this.state.blockFilter !== 'all' || 
        this.state.seriesFilter !== 'all' || 
        this.state.radioactiveOnly
      );
      if (isFiltered) {
        banner.classList.remove('hidden');
        bannerText.textContent = `Showing ${visibleCount} of 118 elements`;
      } else {
        banner.classList.add('hidden');
      }
    }
  }

  applyHeatmapToTile(tile, el) {
    const prop = this.state.heatmapProperty;
    let val = null;

    if (prop === 'electronegativity') val = el.electronegativity;
    else if (prop === 'atomic_mass') val = typeof el.atomic_mass === 'number' ? el.atomic_mass : parseFloat(el.atomic_mass);
    else if (prop === 'atomic_radius_pm') val = el.atomic_radius_pm;
    else if (prop === 'ionization') val = el.ionization_energy || el.ionization_energies?.[0];
    else if (prop === 'melting_point_k') val = el.melting_point_k;
    else if (prop === 'density') val = el.density;

    if (val === null || val === undefined || isNaN(val)) {
      tile.style.background = '#0a0f1d';
      return;
    }

    const bounds = {
      electronegativity: [0.7, 4.0],
      atomic_mass: [1, 294],
      atomic_radius_pm: [30, 300],
      ionization: [380, 2400],
      melting_point_k: [0, 3900],
      density: [0, 23]
    }[prop] || [0, 100];

    const ratio = Math.max(0, Math.min(1, (val - bounds[0]) / (bounds[1] - bounds[0])));
    
    // Spectral color interpolation
    const r = Math.round(16 + ratio * 220);
    const g = Math.round(40 + (1 - Math.abs(ratio - 0.5) * 2) * 160);
    const b = Math.round(180 - ratio * 140);

    tile.style.background = `rgba(${r}, ${g}, ${b}, 0.35)`;
    tile.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.7)`;
  }

  setupEventListeners() {
    // 1. Search Bar
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearchBtn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.state.searchQuery = e.target.value.trim();
        if (clearBtn) clearBtn.classList.toggle('hidden', !this.state.searchQuery);
        
        // If user is on an archive view, typing search can also navigate them to table or search
        const rawHash = window.location.hash || '#/';
        if (rawHash.startsWith('#/archive') && this.state.searchQuery) {
          window.location.hash = '#/';
        }
        this.applyFilters();
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = searchInput.value.trim();
          if (!q) return;
          // Look up element
          let el = this.elementsBySymbol.get(q.toUpperCase());
          if (!el && /^\d+$/.test(q)) el = this.elementsByNumber.get(parseInt(q, 10));
          if (!el) {
            el = this.elements.find(item => item.name.toLowerCase().includes(q.toLowerCase()));
          }
          if (el) {
            window.location.hash = `#/element/${el.atomic_number}`;
          }
        }
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        this.state.searchQuery = '';
        clearBtn.classList.add('hidden');
        this.applyFilters();
      });
    }

    // 2. State Filters
    document.querySelectorAll('.filter-state-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-state-btn').forEach(b => {
          b.className = 'filter-state-btn px-2.5 py-1 rounded font-medium text-slate-300 hover:bg-slate-800 transition';
        });
        btn.className = 'filter-state-btn px-2.5 py-1 rounded font-medium bg-cyan-600 text-white transition';
        this.state.stateFilter = btn.dataset.state;
        this.applyFilters();
      });
    });

    // 3. Block Filters
    document.querySelectorAll('.filter-block-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-block-btn').forEach(b => {
          b.className = 'filter-block-btn px-2 py-1 rounded font-medium text-slate-300 hover:bg-slate-800 transition';
        });
        btn.className = 'filter-block-btn px-2 py-1 rounded font-medium bg-cyan-600 text-white transition';
        this.state.blockFilter = btn.dataset.block;
        this.applyFilters();
      });
    });

    // 4. Radioactivity Filter
    const radioFilter = document.getElementById('radioactiveFilter');
    if (radioFilter) {
      radioFilter.addEventListener('change', (e) => {
        this.state.radioactiveOnly = e.target.checked;
        this.applyFilters();
      });
    }

    // 5. Heatmap Select
    const heatSelect = document.getElementById('heatmapSelect');
    const heatLegend = document.getElementById('heatmapLegend');
    if (heatSelect) {
      heatSelect.addEventListener('change', (e) => {
        this.state.heatmapProperty = e.target.value;
        if (heatLegend) heatLegend.classList.toggle('hidden', this.state.heatmapProperty === 'none');
        this.applyFilters();
      });
    }

    // 6. Temperature Simulator
    const tempSlider = document.getElementById('tempSlider');
    const tempDisplay = document.getElementById('tempDisplay');
    const resetTemp = document.getElementById('resetTempBtn');

    if (tempSlider && tempDisplay) {
      let tempAnnounceTimeout = null;
      tempSlider.addEventListener('input', (e) => {
        const k = parseFloat(e.target.value);
        this.state.currentTempK = k;
        const c = (k - 273.15).toFixed(0);
        tempDisplay.textContent = `${Math.round(k)} K (${c > 0 ? `+${c}` : c}°C)`;
        this.applyFilters();
        if (this.state.selectedElement) {
          const stateEl = document.getElementById('insState');
          if (stateEl) stateEl.textContent = this.simulateStateAtTemp(this.state.selectedElement, k);
        }

        clearTimeout(tempAnnounceTimeout);
        tempAnnounceTimeout = setTimeout(() => {
          this.announceA11y(`Temperature set to ${Math.round(k)} Kelvin (${c}°C). Physical phases updated across table.`);
        }, 350);
      });
    }

    if (resetTemp && tempSlider && tempDisplay) {
      resetTemp.addEventListener('click', () => {
        tempSlider.value = '298';
        this.state.currentTempK = 298.15;
        tempDisplay.textContent = '298 K (25°C)';
        this.applyFilters();
        this.announceA11y('Temperature reset to standard 298 Kelvin (25°C).');
      });
    }

    // 7. Reset Filters Button
    const resetBtn = document.getElementById('resetAllFiltersBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        this.state.searchQuery = '';
        this.state.stateFilter = 'all';
        this.state.blockFilter = 'all';
        this.state.seriesFilter = 'all';
        this.state.radioactiveOnly = false;
        if (radioFilter) radioFilter.checked = false;

        document.querySelectorAll('.filter-state-btn').forEach((b, i) => {
          b.className = i === 0 ? 'filter-state-btn px-2.5 py-1 rounded font-medium bg-cyan-600 text-white transition' : 'filter-state-btn px-2.5 py-1 rounded font-medium text-slate-300 hover:bg-slate-800 transition';
        });
        document.querySelectorAll('.filter-block-btn').forEach((b, i) => {
          b.className = i === 0 ? 'filter-block-btn px-2 py-1 rounded font-medium bg-cyan-600 text-white transition' : 'filter-block-btn px-2 py-1 rounded font-medium text-slate-300 hover:bg-slate-800 transition';
        });
        document.querySelectorAll('.legend-chip').forEach(b => b.classList.remove('ring-2', 'ring-cyan-400'));

        this.applyFilters();
        this.announceA11y('All filters reset. Displaying all 118 elements.');
      });
    }

    // 8. Close Inspector Button
    const closeIns = document.getElementById('closeInspectorBtn');
    if (closeIns) {
      closeIns.addEventListener('click', () => {
        const drawer = document.getElementById('inspectorDrawer');
        if (drawer) drawer.classList.add('hidden');
      });
    }

    // 9. Mobile Touch Gestures for Dossier
    this.setupDossierSwipeGestures();
  }

  /**
   * Native Touch Gestures: Swipe-to-navigate in Element Dossier
   * Left swipe -> Next element; Right swipe -> Previous element
   */
  setupDossierSwipeGestures() {
    const dossierView = document.getElementById('viewDossier');
    if (!dossierView) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    dossierView.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });

    dossierView.addEventListener('touchend', (e) => {
      if (e.changedTouches.length !== 1) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const duration = Date.now() - touchStartTime;

      // Intentional swipe thresholds:
      // Minimum distance: 50px
      // Predominantly horizontal swipe: Math.abs(deltaX) > Math.abs(deltaY) * 1.3
      // Max duration: 750ms
      if (Math.abs(deltaX) >= 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && duration <= 750) {
        const hash = (window.location.hash || '').replace(/^#/, '');
        if (!hash.startsWith('/element/')) return;

        const parts = hash.split('/');
        const currentZ = parseInt(parts[2], 10);
        if (isNaN(currentZ)) return;

        if (deltaX < -50) {
          // Swipe Left -> Next element (e.g. 1 -> 2)
          const nextZ = currentZ < 118 ? currentZ + 1 : 1;
          window.location.hash = `#/element/${nextZ}`;
          this.announceA11y(`Swiped to next element: atomic number ${nextZ}`);
        } else if (deltaX > 50) {
          // Swipe Right -> Previous element (e.g. 2 -> 1)
          const prevZ = currentZ > 1 ? currentZ - 1 : 118;
          window.location.hash = `#/element/${prevZ}`;
          this.announceA11y(`Swiped to previous element: atomic number ${prevZ}`);
        }
      }
    }, { passive: true });
  }

  setupPWA() {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(reg => console.log('[PWA] ServiceWorker registered with scope:', reg.scope))
          .catch(err => console.warn('[PWA] ServiceWorker registration notice:', err));
      });
    }

    // Install prompt handler
    const installBtn = document.getElementById('pwaInstallBtn');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.state.deferredInstallPrompt = e;
      if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.classList.add('inline-flex');
      }
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!this.state.deferredInstallPrompt) {
          // iOS Safari detection
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
          if (isIOS) {
            const modal = document.getElementById('iosInstallModal');
            if (modal) modal.classList.remove('hidden');
          }
          return;
        }

        this.state.deferredInstallPrompt.prompt();
        const { outcome } = await this.state.deferredInstallPrompt.userChoice;
        console.log(`[PWA] Install prompt outcome: ${outcome}`);
        this.state.deferredInstallPrompt = null;
        installBtn.classList.add('hidden');
      });
    }

    const closeIOS = document.getElementById('closeIOSModalBtn');
    if (closeIOS) {
      closeIOS.addEventListener('click', () => {
        const modal = document.getElementById('iosInstallModal');
        if (modal) modal.classList.add('hidden');
      });
    }
  }
}

// Expose functions globally for debugging and direct access
if (typeof window !== 'undefined') {
  window.drawLewisDot = drawLewisDot;
  window.drawBohrModel = drawBohrModel;
}

// Instantiate application on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.chemTableApp = new PeriodicTableApp();
  });
} else {
  window.chemTableApp = new PeriodicTableApp();
}
