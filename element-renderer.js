/**
 * ChemTable: Academic IUPAC Periodic Table & Chemistry Database
 * Element Detail Page & 3D Molecular Laboratory Controller (element-renderer.js)
 */

'use strict';

class ElementDossierRenderer {
  constructor() {
    this.elements = [];
    this.elementsBySymbol = new Map();
    this.elementsByNumber = new Map();
    this.currentElement = null;
    this.currentCompound = null;

    this.bohr = {
      scene: null,
      camera: null,
      renderer: null,
      nucleusGroup: null,
      shellsGroup: null,
      cloudPoints: null,
      electrons: [],
      animationFrameId: null,
      isPaused: false,
      viewMode: 'rings',
      isDragging: false,
      previousMousePosition: { x: 0, y: 0 },
    };

    this.molViewer = null;
    this.molAutoRotate = true;
    this.molCurrentStyle = 'stick';

    this.init();
  }

  async init() {
    await this.loadData();
    this.determineCurrentElement();
    this.renderHeaderAndMeta();
    this.renderHeroSection();
    this.renderQuickFacts();
    this.renderThermodynamics();
    this.initBohrSimulation();
    this.initCompoundDatabase();
    this.setupNavigationListeners();
  }

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
        console.warn(`Could not load dataset from ${url}:`, err);
      }
    }

    if (!this.elements || this.elements.length === 0) {
      console.error('Fatal: Chemistry dataset missing.');
      return;
    }

    this.elements.forEach(el => {
      this.elementsBySymbol.set(el.symbol.toUpperCase(), el);
      this.elementsByNumber.set(el.atomic_number, el);
    });
  }

  determineCurrentElement() {
    const params = new URLSearchParams(window.location.search);
    const symParam = params.get('symbol');
    const zParam = params.get('z');
    const hash = window.location.hash.replace('#', '').trim();

    if (symParam && this.elementsBySymbol.has(symParam.toUpperCase())) {
      this.currentElement = this.elementsBySymbol.get(symParam.toUpperCase());
    } else if (zParam && this.elementsByNumber.has(parseInt(zParam, 10))) {
      this.currentElement = this.elementsByNumber.get(parseInt(zParam, 10));
    } else if (hash && this.elementsBySymbol.has(hash.toUpperCase())) {
      this.currentElement = this.elementsBySymbol.get(hash.toUpperCase());
    } else {
      this.currentElement = this.elementsBySymbol.get('C') || this.elements[0];
    }
  }

  renderHeaderAndMeta() {
    const el = this.currentElement;
    if (!el) return;

    document.title = `${el.name} (${el.symbol}) | IUPAC Academic Element Dossier & 3D Lab`;

    const breadcrumb = document.getElementById('navElementBreadcrumb');
    if (breadcrumb) {
      breadcrumb.textContent = `${el.name} (${el.symbol} - Z=${el.atomic_number})`;
    }

    const prevZ = el.atomic_number === 1 ? 118 : el.atomic_number - 1;
    const nextZ = el.atomic_number === 118 ? 1 : el.atomic_number + 1;
    const prevEl = this.elementsByNumber.get(prevZ);
    const nextEl = this.elementsByNumber.get(nextZ);

    const prevBtn = document.getElementById('navPrevBtn');
    const nextBtn = document.getElementById('navNextBtn');

    if (prevBtn && prevEl) {
      prevBtn.onclick = () => window.location.href = `/element.html?symbol=${prevEl.symbol}`;
      prevBtn.title = `Previous: ${prevEl.name} (${prevEl.symbol}) [Left Arrow]`;
    }
    if (nextBtn && nextEl) {
      nextBtn.onclick = () => window.location.href = `/element.html?symbol=${nextEl.symbol}`;
      nextBtn.title = `Next: ${nextEl.name} (${nextEl.symbol}) [Right Arrow]`;
    }
  }

  formatAtomicWeight(mass) {
    if (mass === null || mass === undefined) return 'N/A';
    if (typeof mass === 'string') return mass;
    if (Number.isInteger(mass)) return `[${mass}]`;
    return mass.toFixed(3);
  }

  formatConfigSuperscripts(configStr) {
    if (!configStr) return 'N/A';
    return configStr.replace(/\^([0-9]+)/g, '<sup>$1</sup>');
  }

  formatFormulaSubscripts(formula) {
    if (!formula) return '';
    return formula.replace(/([A-Z][a-z]?)([0-9]+)/g, '$1<sub>$2</sub>')
                  .replace(/\(([A-Za-z0-9]+)\)([0-9]+)/g, '($1)<sub>$2</sub>');
  }

  renderHeroSection() {
    const el = this.currentElement;
    if (!el) return;

    const catBadge = document.getElementById('heroCategoryBadge');
    if (catBadge) {
      catBadge.textContent = el.category;
      catBadge.className = `${this.getCategoryBadgeClass(el.category)} text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider`;
    }

    const radBadge = document.getElementById('heroRadioactiveBadge');
    if (radBadge) {
      radBadge.classList.toggle('hidden', !el.is_radioactive);
    }

    const blockBadge = document.getElementById('heroBlockBadge');
    if (blockBadge) {
      blockBadge.textContent = `${el.block || '?'}-block`;
    }

    const num = document.getElementById('heroAtomicNumber');
    const sym = document.getElementById('heroSymbol');
    const name = document.getElementById('heroName');
    const mass = document.getElementById('heroAtomicMass');
    const period = document.getElementById('heroPeriod');
    const group = document.getElementById('heroGroup');
    const state = document.getElementById('heroState');
    const shells = document.getElementById('heroShells');
    const discovery = document.getElementById('heroDiscovery');

    if (num) num.textContent = el.atomic_number;
    if (sym) sym.textContent = el.symbol;
    if (name) name.textContent = el.name;
    if (mass) mass.textContent = this.formatAtomicWeight(el.atomic_mass);
    if (period) period.textContent = el.period;
    if (group) group.textContent = el.group;
    if (state) state.textContent = el.state_stp || 'Unknown';
    if (shells) shells.textContent = (el.electron_shells && el.electron_shells.length > 0) ? el.electron_shells.join(', ') : 'N/A';
    if (discovery) discovery.textContent = el.discovery_year ? `${el.discovery_year} (${el.discovered_by || 'Unknown'})` : (el.discovered_by || 'Antiquity');

    const nucStats = document.getElementById('bohrNucleusStats');
    if (nucStats) {
      const protons = el.atomic_number;
      const neutrons = Math.max(0, Math.round((typeof el.atomic_mass === 'number' ? el.atomic_mass : protons) - protons));
      nucStats.textContent = `Protons (Z): ${protons} | Neutrons: ${neutrons} | Electrons: ${protons}`;
    }
  }

  getCategoryBadgeClass(category) {
    if (!category) return 'badge-unknown';
    const clean = category.toLowerCase();
    if (clean.includes('alkali metal') && !clean.includes('alkaline')) return 'badge-alkali-metal';
    if (clean.includes('alkaline earth')) return 'badge-alkaline-earth';
    if (clean.includes('post-transition')) return 'badge-post-transition-metal';
    if (clean.includes('transition')) return 'badge-transition-metal';
    if (clean.includes('metalloid')) return 'badge-metalloid';
    if (clean.includes('noble')) return 'badge-noble-gas';
    if (clean.includes('lanthanide')) return 'badge-lanthanide';
    if (clean.includes('actinide')) return 'badge-actinide';
    if (clean.includes('nonmetal')) return 'badge-reactive-nonmetal';
    return 'badge-unknown';
  }

  renderQuickFacts() {
    const el = this.currentElement;
    if (!el) return;

    const cond = document.getElementById('factConfigCondensed');
    const exp = document.getElementById('factConfigExpanded');
    if (cond) cond.innerHTML = this.formatConfigSuperscripts(el.electron_configuration || 'N/A');
    if (exp) exp.innerHTML = this.formatConfigSuperscripts(el.electron_configuration_expanded || el.electron_configuration || 'N/A');

    const oxContainer = document.getElementById('factOxidationStates');
    if (oxContainer) {
      oxContainer.innerHTML = '';
      if (el.oxidation_states && el.oxidation_states.length > 0) {
        el.oxidation_states.forEach(ox => {
          const badge = document.createElement('span');
          const isCommon = el.standard_oxidation_states && el.standard_oxidation_states.includes(ox);
          badge.className = isCommon
            ? 'px-2 py-0.5 rounded font-mono text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-700'
            : 'px-2 py-0.5 rounded font-mono text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700';
          badge.textContent = ox > 0 ? `+${ox}` : `${ox}`;
          oxContainer.appendChild(badge);
        });
      } else {
        oxContainer.innerHTML = '<span class="text-slate-500 text-xs">0 (Unreactive)</span>';
      }
    }

    const enegVal = document.getElementById('factEnegValue');
    const enegBar = document.getElementById('factEnegBar');
    if (enegVal && enegBar) {
      if (el.electronegativity_pauling) {
        enegVal.textContent = el.electronegativity_pauling.toFixed(2);
        const pct = Math.min(100, Math.max(0, ((el.electronegativity_pauling - 0.7) / (4.0 - 0.7)) * 100));
        enegBar.style.width = `${pct}%`;
      } else {
        enegVal.textContent = 'N/A';
        enegBar.style.width = '0%';
      }
    }

    const ionVal = document.getElementById('factIonization');
    const ionBar = document.getElementById('factIonBar');
    if (ionVal && ionBar) {
      if (el.ionization_energy_first_kj_mol) {
        ionVal.textContent = `${el.ionization_energy_first_kj_mol.toFixed(1)} kJ/mol`;
        const pct = Math.min(100, Math.max(0, (el.ionization_energy_first_kj_mol / 2400) * 100));
        ionBar.style.width = `${pct}%`;
      } else {
        ionVal.textContent = 'N/A';
        ionBar.style.width = '0%';
      }
    }

    const rad = document.getElementById('factAtomicRadius');
    const cry = document.getElementById('factCrystal');
    if (rad) rad.textContent = el.atomic_radius_pm ? `${el.atomic_radius_pm} pm` : 'N/A';
    if (cry) cry.textContent = el.crystal_structure || 'Unknown';

    const isoBody = document.getElementById('factIsotopesBody');
    if (isoBody) {
      isoBody.innerHTML = '';
      if (el.isotopes && el.isotopes.length > 0) {
        el.isotopes.forEach(iso => {
          const tr = document.createElement('tr');
          const massStr = typeof iso.mass_u === 'number' ? iso.mass_u.toFixed(4) : (iso.mass_u || '—');
          const abundStr = iso.abundance_percent !== null && iso.abundance_percent !== undefined
            ? `${iso.abundance_percent.toFixed(2)}%`
            : (iso.is_synthetic ? 'Synthetic' : 'Trace');
          const halfLifeStr = iso.is_stable ? '<span class="text-emerald-400 font-semibold">Stable</span>' : (iso.half_life || 'Radioactive');

          tr.innerHTML = `
            <td class="py-1 font-bold text-white">${iso.nuclide || `${iso.mass_number}${el.symbol}`}</td>
            <td class="py-1 text-slate-300">${massStr}</td>
            <td class="py-1 text-cyan-300">${abundStr}</td>
            <td class="py-1">${halfLifeStr}</td>
          `;
          isoBody.appendChild(tr);
        });
      } else {
        isoBody.innerHTML = '<tr><td colspan="4" class="py-2 text-slate-500">Isotopic data pending IUPAC evaluation</td></tr>';
      }
    }
  }

  renderThermodynamics() {
    const el = this.currentElement;
    if (!el) return;

    const stateSTP = document.getElementById('propStateSTP');
    const melt = document.getElementById('propMeltingPoint');
    const boil = document.getElementById('propBoilingPoint');
    const density = document.getElementById('propDensity');
    const radius = document.getElementById('propRadius');
    const discoverer = document.getElementById('propDiscoverer');

    if (stateSTP) stateSTP.textContent = el.state_stp || 'Unknown';

    if (melt) {
      if (el.melting_point_k !== null && el.melting_point_k !== undefined) {
        const cel = (el.melting_point_k - 273.15).toFixed(1);
        melt.textContent = `${el.melting_point_k} K (${cel} °C)`;
      } else {
        melt.textContent = 'Unknown';
      }
    }

    if (boil) {
      if (el.boiling_point_k !== null && el.boiling_point_k !== undefined) {
        const cel = (el.boiling_point_k - 273.15).toFixed(1);
        boil.textContent = `${el.boiling_point_k} K (${cel} °C)`;
      } else {
        boil.textContent = 'Unknown';
      }
    }

    if (density) {
      density.textContent = el.density_g_cm3 !== null && el.density_g_cm3 !== undefined
        ? `${el.density_g_cm3} g/cm³`
        : 'Unknown';
    }

    if (radius) {
      radius.textContent = el.atomic_radius_pm ? `${el.atomic_radius_pm} pm` : 'N/A';
    }

    if (discoverer) {
      discoverer.textContent = el.discovered_by || 'Antiquity';
    }
  }

  initBohrSimulation() {
    const container = document.getElementById('bohrContainer');
    if (!container || typeof THREE === 'undefined') return;

    container.querySelectorAll('canvas').forEach(c => c.remove());
    if (this.bohr.animationFrameId) {
      cancelAnimationFrame(this.bohr.animationFrameId);
    }

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 380;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 15, 30);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 2.5, 60);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 15);
    scene.add(dirLight);

    const nucleusGroup = new THREE.Group();
    scene.add(nucleusGroup);

    const protons = this.currentElement.atomic_number;
    const neutrons = Math.max(0, Math.round((typeof this.currentElement.atomic_mass === 'number' ? this.currentElement.atomic_mass : protons) - protons));
    const totalNucleons = Math.min(60, protons + neutrons);

    const nucGeo = new THREE.SphereGeometry(0.32, 12, 12);
    const protonMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.2 });
    const neutronMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.2 });

    for (let i = 0; i < totalNucleons; i++) {
      const isProton = i % 2 === 0;
      const mesh = new THREE.Mesh(nucGeo, isProton ? protonMat : neutronMat);
      const r = Math.cbrt(Math.random()) * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      mesh.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      nucleusGroup.add(mesh);
    }

    const glowGeo = new THREE.SphereGeometry(2.0, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.15, wireframe: true });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    nucleusGroup.add(glowMesh);

    const shellsGroup = new THREE.Group();
    scene.add(shellsGroup);

    const electronMeshes = [];
    const shells = this.currentElement.electron_shells && this.currentElement.electron_shells.length > 0
      ? this.currentElement.electron_shells
      : [protons];

    shells.forEach((electronCount, shellIndex) => {
      const radius = 3.8 + (shellIndex * 2.4);
      
      const ringGeo = new THREE.RingGeometry(radius - 0.02, radius + 0.02, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2 + (shellIndex * 0.18);
      ringMesh.rotation.y = shellIndex * 0.25;
      shellsGroup.add(ringMesh);

      const electronGeo = new THREE.SphereGeometry(0.24, 12, 12);
      const electronMat = new THREE.MeshStandardMaterial({
        color: 0x67e8f9,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      });

      for (let e = 0; e < electronCount; e++) {
        const eMesh = new THREE.Mesh(electronGeo, electronMat);
        const baseAngle = (e / electronCount) * Math.PI * 2;
        shellsGroup.add(eMesh);

        electronMeshes.push({
          mesh: eMesh,
          shellRadius: radius,
          baseAngle: baseAngle,
          speed: (0.02 / (shellIndex + 1)),
          angle: baseAngle,
          tiltX: ringMesh.rotation.x,
          tiltY: ringMesh.rotation.y,
        });
      }
    });

    const cloudCount = 1500;
    const cloudGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(cloudCount * 3);
    const colors = new Float32Array(cloudCount * 3);

    for (let i = 0; i < cloudCount; i++) {
      const u = Math.random();
      const r = -Math.log(1 - u) * 4.5 + 1.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const intensity = Math.max(0.2, 1 - (r / 15));
      colors[i * 3] = 0.2 * intensity;
      colors[i * 3 + 1] = 0.7 * intensity;
      colors[i * 3 + 2] = 1.0 * intensity;
    }

    cloudGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    cloudGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const cloudMat = new THREE.PointsMaterial({
      size: 0.25,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
    });
    const cloudPoints = new THREE.Points(cloudGeo, cloudMat);
    cloudPoints.visible = false;
    scene.add(cloudPoints);

    this.bohr.scene = scene;
    this.bohr.camera = camera;
    this.bohr.renderer = renderer;
    this.bohr.nucleusGroup = nucleusGroup;
    this.bohr.shellsGroup = shellsGroup;
    this.bohr.cloudPoints = cloudPoints;
    this.bohr.electrons = electronMeshes;

    renderer.domElement.addEventListener('mousedown', (e) => {
      this.bohr.isDragging = true;
      this.bohr.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.bohr.isDragging = false;
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
      if (!this.bohr.isDragging) return;
      const deltaX = e.clientX - this.bohr.previousMousePosition.x;
      const deltaY = e.clientY - this.bohr.previousMousePosition.y;

      shellsGroup.rotation.y += deltaX * 0.008;
      shellsGroup.rotation.x += deltaY * 0.008;
      nucleusGroup.rotation.y += deltaX * 0.008;
      nucleusGroup.rotation.x += deltaY * 0.008;
      if (cloudPoints.visible) {
        cloudPoints.rotation.y += deltaX * 0.008;
        cloudPoints.rotation.x += deltaY * 0.008;
      }

      this.bohr.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.bohr.isDragging = true;
        this.bohr.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });
    renderer.domElement.addEventListener('touchmove', (e) => {
      if (!this.bohr.isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - this.bohr.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - this.bohr.previousMousePosition.y;

      shellsGroup.rotation.y += deltaX * 0.01;
      shellsGroup.rotation.x += deltaY * 0.01;
      this.bohr.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });
    renderer.domElement.addEventListener('touchend', () => {
      this.bohr.isDragging = false;
    });

    renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      camera.position.z += e.deltaY * 0.03;
      camera.position.z = Math.max(12, Math.min(65, camera.position.z));
    }, { passive: false });

    const ro = new ResizeObserver(() => {
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW > 0 && newH > 0) {
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
      }
    });
    ro.observe(container);

    const animate = () => {
      this.bohr.animationFrameId = requestAnimationFrame(animate);

      if (!this.bohr.isPaused) {
        nucleusGroup.rotation.y += 0.005;
        nucleusGroup.rotation.x += 0.002;

        if (this.bohr.viewMode === 'rings') {
          this.bohr.electrons.forEach(eObj => {
            eObj.angle += eObj.speed;
            const x = Math.cos(eObj.angle) * eObj.shellRadius;
            const z = Math.sin(eObj.angle) * eObj.shellRadius;

            const tiltedY = -z * Math.sin(eObj.tiltX);
            const tiltedZ = z * Math.cos(eObj.tiltX);

            eObj.mesh.position.set(x, tiltedY, tiltedZ);
          });
        } else if (cloudPoints.visible) {
          cloudPoints.rotation.y += 0.003;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const modeBtn = document.getElementById('bohrViewModeBtn');
    const pauseBtn = document.getElementById('bohrPauseBtn');
    const resetBtn = document.getElementById('bohrResetBtn');

    if (modeBtn) {
      modeBtn.onclick = () => {
        if (this.bohr.viewMode === 'rings') {
          this.bohr.viewMode = 'cloud';
          this.bohr.shellsGroup.visible = false;
          this.bohr.cloudPoints.visible = true;
          modeBtn.textContent = 'Probability Cloud';
        } else {
          this.bohr.viewMode = 'rings';
          this.bohr.shellsGroup.visible = true;
          this.bohr.cloudPoints.visible = false;
          modeBtn.textContent = 'Orbital Rings';
        }
      };
    }

    if (pauseBtn) {
      pauseBtn.onclick = () => {
        this.bohr.isPaused = !this.bohr.isPaused;
        pauseBtn.textContent = this.bohr.isPaused ? 'Resume' : 'Pause';
      };
    }

    if (resetBtn) {
      resetBtn.onclick = () => {
        camera.position.set(0, 15, 30);
        camera.lookAt(0, 0, 0);
        shellsGroup.rotation.set(0, 0, 0);
        nucleusGroup.rotation.set(0, 0, 0);
      };
    }
  }

  initCompoundDatabase() {
    const el = this.currentElement;
    const tabsContainer = document.getElementById('compoundTabsContainer');
    if (!tabsContainer) return;
    tabsContainer.innerHTML = '';

    let compounds = (el.compounds && el.compounds.length > 0) ? el.compounds : this.generateFallbackCompounds(el);

    compounds.forEach((cmp, idx) => {
      const tabBtn = document.createElement('button');
      tabBtn.className = idx === 0
        ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 text-white shadow-md transition'
        : 'px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition';
      tabBtn.innerHTML = `${cmp.name} (<span class="font-mono">${cmp.formula}</span>)`;

      tabBtn.addEventListener('click', () => {
        tabsContainer.querySelectorAll('button').forEach(b => {
          b.className = 'px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition';
        });
        tabBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 text-white shadow-md transition';
        this.loadCompound(cmp);
      });

      tabsContainer.appendChild(tabBtn);
    });

    if (compounds.length > 0) {
      this.loadCompound(compounds[0]);
    }

    document.querySelectorAll('.mol-style-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mol-style-btn').forEach(b => {
          b.classList.remove('bg-cyan-600', 'text-white');
          b.classList.add('bg-slate-800', 'text-slate-300');
        });
        btn.classList.add('bg-cyan-600', 'text-white');
        btn.classList.remove('bg-slate-800', 'text-slate-300');

        this.molCurrentStyle = btn.dataset.style;
        this.applyMolStyle();
      });
    });

    const autoRotBtn = document.getElementById('molAutoRotateBtn');
    if (autoRotBtn) {
      autoRotBtn.addEventListener('click', () => {
        this.molAutoRotate = !this.molAutoRotate;
        autoRotBtn.textContent = `Spin: ${this.molAutoRotate ? 'ON' : 'OFF'}`;
        if (this.molViewer) {
          this.molViewer.spin(this.molAutoRotate ? 'y' : false, 0.8);
        }
      });
    }

    const resetCamBtn = document.getElementById('molResetCameraBtn');
    if (resetCamBtn) {
      resetCamBtn.addEventListener('click', () => {
        if (this.molViewer) {
          this.molViewer.zoomTo();
          this.molViewer.render();
        }
      });
    }
  }

  generateFallbackCompounds(element) {
    const sym = element.symbol;
    return [
      {
        name: `${element.name} Dioxide`,
        formula: `${sym}O2`,
        iupac_name: `${element.name}(IV) oxide`,
        type: 'Inorganic Oxide',
        molar_mass_g_mol: (typeof element.atomic_mass === 'number' ? element.atomic_mass : 50) + 32.0,
        bonding_type: 'Ionic / Polymeric Network',
        ionic_character_percent: 65,
        molecular_geometry: 'Linear / Rutile Lattice',
        bond_angles: '180° / 90°',
        dipole_moment_debye: '0.0 D',
        state_stp: 'Solid',
        melting_point_c: '> 1000 °C',
        boiling_point_c: 'Sublimes',
        applications: [
          'High-temperature refractory ceramic applications',
          'Academic materials science and semiconductor research',
        ],
        safety: 'Standard laboratory precautions. Avoid inhaling fine particulate dust.',
        xyz_3d: `3\n${sym}O2 Unit\n${sym} 0.000 0.000 0.000\nO 0.000 0.000 1.750\nO 0.000 0.000 -1.750\n`,
      },
      {
        name: `${element.name} Trichloride`,
        formula: `${sym}Cl3`,
        iupac_name: `${element.name}(III) chloride`,
        type: 'Inorganic Halide',
        molar_mass_g_mol: (typeof element.atomic_mass === 'number' ? element.atomic_mass : 50) + 106.35,
        bonding_type: 'Polar Covalent / Ionic',
        ionic_character_percent: 45,
        molecular_geometry: 'Trigonal Planar / Pyramidal',
        bond_angles: '107° - 120°',
        dipole_moment_debye: '1.2 D',
        state_stp: 'Solid',
        melting_point_c: '580 °C',
        boiling_point_c: 'Decomposes',
        applications: [
          'Chemical synthesis intermediate and catalyst precursor',
          'Coordination chemistry and ligand exchange studies',
        ],
        safety: 'Moisture sensitive. Releases HCl vapors upon hydrolysis.',
        xyz_3d: `4\n${sym}Cl3 Coordination\n${sym} 0.000 0.000 0.000\nCl 2.100 0.000 0.000\nCl -1.050 1.818 0.000\nCl -1.050 -1.818 0.000\n`,
      }
    ];
  }

  loadCompound(cmp) {
    this.currentCompound = cmp;

    const typeBadge = document.getElementById('cmpTypeBadge');
    const molarMass = document.getElementById('cmpMolarMass');
    const iupacName = document.getElementById('cmpIupacName');
    const commonName = document.getElementById('cmpCommonName');
    const bondType = document.getElementById('cmpBondType');
    const ionicPct = document.getElementById('cmpIonicPct');
    const bondAngles = document.getElementById('cmpBondAngles');
    const dipole = document.getElementById('cmpDipole');
    const state = document.getElementById('cmpState');
    const melting = document.getElementById('cmpMelting');
    const boiling = document.getElementById('cmpBoiling');
    const appsList = document.getElementById('cmpApplicationsList');
    const safetyText = document.getElementById('cmpSafetyText');
    const geomLabel = document.getElementById('molGeometryLabel');
    const floatFormula = document.getElementById('molFloatingFormula');
    const floatName = document.getElementById('molFloatingName');

    if (typeBadge) typeBadge.textContent = cmp.type || 'Compound';
    if (molarMass) molarMass.textContent = cmp.molar_mass_g_mol ? `${cmp.molar_mass_g_mol.toFixed(3)} g/mol` : '—';
    if (iupacName) iupacName.textContent = cmp.iupac_name || cmp.name;
    if (commonName) commonName.textContent = `Common: ${cmp.name}`;
    if (bondType) bondType.textContent = cmp.bonding_type || 'Covalent';
    if (ionicPct) ionicPct.textContent = cmp.ionic_character_percent ? `${cmp.ionic_character_percent}%` : 'N/A';
    if (bondAngles) bondAngles.textContent = cmp.bond_angles || 'N/A';
    if (dipole) dipole.textContent = cmp.dipole_moment_debye || '0.0 D';
    if (state) state.textContent = cmp.state_stp || 'Solid';
    if (melting) melting.textContent = cmp.melting_point_c || 'N/A';
    if (boiling) boiling.textContent = cmp.boiling_point_c || 'N/A';
    if (geomLabel) geomLabel.textContent = `Geometry: ${cmp.molecular_geometry || 'Spatial'}`;
    if (floatFormula) floatFormula.innerHTML = this.formatFormulaSubscripts(cmp.formula);
    if (floatName) floatName.textContent = cmp.name;

    if (appsList) {
      appsList.innerHTML = '';
      if (cmp.applications && cmp.applications.length > 0) {
        cmp.applications.forEach(app => {
          const li = document.createElement('li');
          li.textContent = app;
          appsList.appendChild(li);
        });
      } else {
        appsList.innerHTML = '<li>Academic and analytical chemistry research.</li>';
      }
    }

    if (safetyText) {
      safetyText.textContent = cmp.safety || 'Follow standard laboratory chemical safety guidelines.';
    }

    this.render3DMol(cmp.xyz_3d);
  }

  render3DMol(xyzData) {
    const viewerDiv = document.getElementById('mol3dViewer');
    if (!viewerDiv || typeof $3Dmol === 'undefined') {
      console.warn('3Dmol library not loaded yet or container missing.');
      return;
    }

    viewerDiv.innerHTML = '';

    try {
      const config = { backgroundColor: '0x060913' };
      this.molViewer = $3Dmol.createViewer(viewerDiv, config);
      this.molViewer.addModel(xyzData, 'xyz');
      this.applyMolStyle();
      this.molViewer.zoomTo();
      this.molViewer.render();

      if (this.molAutoRotate) {
        this.molViewer.spin('y', 0.8);
      }
    } catch (err) {
      console.error('Error rendering 3Dmol viewer:', err);
    }
  }

  applyMolStyle() {
    if (!this.molViewer) return;

    if (this.molCurrentStyle === 'stick') {
      this.molViewer.setStyle({}, {
        stick: { radius: 0.15, colorscheme: 'Jmol' },
        sphere: { scale: 0.28, colorscheme: 'Jmol' },
      });
    } else if (this.molCurrentStyle === 'sphere') {
      this.molViewer.setStyle({}, {
        sphere: { colorscheme: 'Jmol' },
      });
    } else if (this.molCurrentStyle === 'line') {
      this.molViewer.setStyle({}, {
        line: { colorscheme: 'Jmol', linewidth: 3 },
      });
    }

    this.molViewer.render();
  }

  setupNavigationListeners() {
    window.addEventListener('keydown', (e) => {
      if (document.activeElement && ['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        const prevBtn = document.getElementById('navPrevBtn');
        if (prevBtn) prevBtn.click();
      } else if (e.key === 'ArrowRight') {
        const nextBtn = document.getElementById('navNextBtn');
        if (nextBtn) nextBtn.click();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.elementDossier = new ElementDossierRenderer();
});
