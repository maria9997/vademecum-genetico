const app = {
    data: drugsData,
    activeCategories: new Set(),
    activeStatuses: new Set(),
    searchQuery: '',
    currentDrug: null,

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.renderCategoryFilters();
        this.renderGrid();
    },

    cacheDOM() {
        this.grid = document.getElementById('drugs-grid');
        this.searchInput = document.getElementById('searchInput');
        this.clearSearchBtn = document.getElementById('clearSearch');
        this.resultsCount = document.getElementById('results-count');
        this.categoryFiltersContainer = document.getElementById('category-filters');
        
        this.modal = document.getElementById('drug-modal');
        this.modalBody = document.getElementById('modal-body');
        this.closeModalBtn = document.getElementById('close-modal');
        this.statusFilters = document.querySelectorAll('.status-filter');
    },

    bindEvents() {
        this.searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.clearSearchBtn.style.display = this.searchQuery ? 'block' : 'none';
            this.renderGrid();
        });

        this.clearSearchBtn.addEventListener('click', () => {
            this.searchInput.value = '';
            this.searchQuery = '';
            this.clearSearchBtn.style.display = 'none';
            this.renderGrid();
        });

        this.closeModalBtn.addEventListener('click', () => {
            this.modal.classList.remove('active');
        });

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.modal.classList.remove('active');
        });

        this.statusFilters.forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) this.activeStatuses.add(e.target.value);
                else this.activeStatuses.delete(e.target.value);
                this.renderGrid();
            });
        });
    },

    renderCategoryFilters() {
        let cats = new Set();
        this.data.forEach(d => {
            d.subespecialidades.forEach(sub => cats.add(sub));
        });
        
        const categories = Array.from(cats).sort();
        
        this.categoryFiltersContainer.innerHTML = categories.map(cat => `
            <label class="filter-label">
                <input type="checkbox" value="${cat}" class="category-filter">
                ${cat}
            </label>
        `).join('');

        document.querySelectorAll('.category-filter').forEach(cb => {
            cb.addEventListener('change', (e) => {
                if (e.target.checked) this.activeCategories.add(e.target.value);
                else this.activeCategories.delete(e.target.value);
                this.renderGrid();
            });
        });
    },

    filterData() {
        return this.data.filter(drug => {
            if (this.activeCategories.size > 0) {
                const hasMatch = drug.subespecialidades.some(sub => this.activeCategories.has(sub));
                if (!hasMatch) return false;
            }
            if (this.activeStatuses.size > 0 && !this.activeStatuses.has(drug.categoria)) return false;
            if (this.searchQuery) {
                const query = this.searchQuery;
                const searchStr = `
                    ${drug.nombres_comerciales.join(' ')} ${drug.principio_activo} ${drug.codigo_atc} 
                    ${drug.regulatorio.indicaciones_cie10.join(' ')}
                `.toLowerCase();
                if (!searchStr.includes(query)) return false;
            }
            return true;
        });
    },

    renderGrid() {
        const filtered = this.filterData();
        this.resultsCount.textContent = filtered.length;

        if (filtered.length === 0) {
            this.grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 3rem; color: var(--text-muted);">
                <i data-lucide="search-x" style="width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                <p>No se encontraron medicamentos que coincidan con los criterios.</p>
            </div>`;
            lucide.createIcons();
            return;
        }

        this.grid.innerHTML = filtered.map(drug => {
            const isPending = drug.codigo_atc === "PENDIENTE_VERIFICACION";
            const badgeClass = drug.categoria === "VITAL_NO_DISPONIBLE" ? "badge-vnd" : "badge-invima";
            const statusLabel = drug.categoria === "VITAL_NO_DISPONIBLE" ? "MVND" : "INVIMA";
            
            return `
            <div class="drug-card" onclick="app.openModal('${drug.id}')">
                <div class="drug-card-header">
                    <div class="card-commercial">${drug.nombres_comerciales.join(' / ')}</div>
                    <div class="card-generic">${drug.principio_activo}</div>
                    <div class="card-badges">
                        <span class="badge ${badgeClass}">${statusLabel}</span>
                        ${isPending ? `<span class="badge badge-pending" title="Datos Pendientes">PENDIENTE</span>` : `<span class="badge badge-atc">ATC: ${drug.codigo_atc}</span>`}
                    </div>
                </div>
                <div class="card-category" style="margin-top:0.5rem; font-size:0.8rem;">
                    ${drug.subespecialidades.slice(0,2).join(', ')}${drug.subespecialidades.length > 2 ? '...' : ''}
                </div>
                <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: auto; padding-top:0.5rem;">
                    <i data-lucide="activity" style="width:14px; height:14px; display:inline;"></i> ${drug.regulatorio.indicaciones_cie10[0]}
                </div>
            </div>
            `;
        }).join('');
        lucide.createIcons();
    },

    openModal(id) {
        this.currentDrug = this.data.find(d => d.id === id);
        if (!this.currentDrug) return;
        
        const d = this.currentDrug;
        const isPending = d.codigo_atc === "PENDIENTE_VERIFICACION";
        const badgeClass = d.categoria === "VITAL_NO_DISPONIBLE" ? "badge-vnd" : "badge-invima";
        const statusLabel = d.categoria === "VITAL_NO_DISPONIBLE" ? "VITAL NO DISPONIBLE" : "INVIMA VIGENTE";
        
        this.modalBody.innerHTML = `
            ${isPending ? `
            <div class="pending-banner">
                <i data-lucide="alert-triangle"></i> Datos en verificación — no usar para formulación hasta su validación.
            </div>` : ''}
            
            <div class="ficha-header">
                <div class="ficha-title-area">
                    <div class="ficha-commercial">${d.nombres_comerciales.join(' / ')}</div>
                    <div class="ficha-generic">(${d.principio_activo})</div>
                </div>
                <div class="card-badges">
                    <span class="badge ${badgeClass}">${statusLabel}</span>
                    <span class="badge badge-atc">ATC: ${d.codigo_atc}</span>
                    ${d.regulatorio.requiere_junta_medica ? '<span class="badge badge-vnd">⚠️ REQUIERE ACTA DE JUNTA</span>' : ''}
                </div>
                <div class="ficha-icd"><i data-lucide="activity"></i> ${d.regulatorio.indicaciones_cie10.join(', ')}</div>
            </div>

            <div class="tabs-header">
                <button class="tab-btn active" onclick="app.switchTab('tecnica')"><i data-lucide="clipboard-list"></i> Vista Técnica / MIPRES</button>
                <button class="tab-btn" onclick="app.switchTab('paciente')"><i data-lucide="user-check"></i> Vista Paciente / Clave Práctica</button>
            </div>

            <!-- TAB TÉCNICA -->
            <div id="tab-tecnica" class="tab-content active">
                <div class="info-grid">
                    <div class="info-box">
                        <h4><i data-lucide="file-check-2"></i> Clínico & Regulatorio</h4>
                        <div class="data-row"><span class="data-label">Registro INVIMA / CUM</span><span class="data-value">${d.regulatorio.registro_invima.numero} | CUM: ${d.regulatorio.registro_invima.cum}</span></div>
                        <div class="data-row"><span class="data-label">Criterios de Inclusión</span><span class="data-value">${d.regulatorio.criterios_inclusion}</span></div>
                        <div class="data-row"><span class="data-label">Criterios de Exclusión</span><span class="data-value">${d.regulatorio.criterios_exclusion}</span></div>
                        <div class="justification-box">
                            <div class="data-label" style="color: #9C640C;"><i data-lucide="alert-circle" style="width: 14px; height: 14px; display: inline; vertical-align: middle;"></i> Justificación No Alternativas PBS</div>
                            <div class="justification-text">"${d.regulatorio.justificacion_no_alternativas}"</div>
                            <button class="btn-copy" onclick="app.copyJustification()"><i data-lucide="copy"></i> Copiar para MIPRES</button>
                        </div>
                    </div>

                    <div class="info-box">
                        <h4><i data-lucide="package"></i> Logística de Dispensación</h4>
                        <div class="data-row"><span class="data-label">Presentaciones Comerciales</span><span class="data-value">${d.posologia.presentaciones_comerciales.map(p => `• ${p.descripcion}`).join('<br>')}</span></div>
                        <div class="data-row"><span class="data-label">Frecuencia y Duración</span><span class="data-value">${d.posologia.frecuencia_administracion} — ${d.posologia.duracion_tratamiento}</span></div>
                        <div class="data-row"><span class="data-label">Almacenamiento (Ruta EPS)</span><span class="data-value">${d.posologia.condiciones_almacenamiento}</span></div>
                        <div class="data-row" style="margin-top: 1rem;"><span class="data-label">Paraclínicos de Control</span><span class="data-value">${d.monitoreo.paraclinicos_control.map(p => `${p.nombre} (${p.frecuencia})`).join(' | ')}</span></div>
                        <div class="data-row"><span class="data-label">Escalas de Valoración</span><span class="data-value">${d.monitoreo.escalas_valoracion_clinica.join(' | ')}</span></div>
                    </div>
                </div>

                <!-- WIDGET CALCULADORA POSOLÓGICA -->
                <div class="calc-widget" id="calc-widget">
                    <div class="calc-header">⚙️ CALCULADORA POSOLÓGICA AUTOMATIZADA MIPRES</div>
                    <div class="calc-inputs" id="calc-inputs"></div>
                    <hr>
                    <div id="calc-results"><div style="text-align: center; color: #777;">Ingrese datos para calcular...</div></div>
                </div>
            </div>

            <!-- TAB PACIENTE -->
            <div id="tab-paciente" class="tab-content">
                <div class="patient-grid">
                    <div class="patient-view-card">
                        <h3>Traducción Clínica</h3>
                        <div class="data-row"><span class="data-label">Mecanismo de Acción</span><span class="data-value" style="font-size: 1.05rem;">${d.educacion_paciente.mecanismo_accion_traducido}</span></div>
                        <div class="data-row" style="margin-top: 1rem;"><span class="data-label">Logística para el Paciente</span><span class="data-value">${d.educacion_paciente.logistica_administracion}</span></div>
                        <div class="data-row" style="margin-top: 1rem;"><span class="data-label">Requisitos Previos</span><span class="data-value"><ul style="margin-left: 1.5rem; margin-top: 0.5rem;">${d.educacion_paciente.requisitos_previos.map(r => `<li>${r}</li>`).join('')}</ul></span></div>
                    </div>

                    <div class="patient-view-card">
                        <h3>Efectos Adversos</h3>
                        <div class="adverse-section">
                            <h4>Esperados (Manejables en casa):</h4>
                            <ul class="adverse-list">${d.educacion_paciente.efectos_adversos.filter(e => e.severidad === 'ESPERADO_MANEJABLE_EN_CASA').map(ef => `<li>${ef.descripcion}</li>`).join('')}</ul>
                        </div>
                        <div class="adverse-section" style="margin-top: 1.5rem;">
                            <h4 style="color: var(--danger);"><i data-lucide="siren" style="width:16px; height:16px; display:inline; vertical-align:middle;"></i> Signos de Alarma (Urgencias):</h4>
                            <ul class="adverse-list alarm">${d.educacion_paciente.efectos_adversos.filter(e => e.severidad === 'SIGNO_DE_ALARMA_URGENCIAS').map(ef => `<li>${ef.descripcion}</li>`).join('')}</ul>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="modal-footer-disclaimer">
                Herramienta de referencia clínica. Toda dosificación debe verificarse contra ficha técnica local INVIMA vigente.
            </div>
        `;

        lucide.createIcons();
        this.renderCalculatorInputs(d);
        this.modal.classList.add('active');
    },

    switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.add('active');
        event.currentTarget.classList.add('active');
    },

    copyJustification() {
        if(!this.currentDrug) return;
        navigator.clipboard.writeText(this.currentDrug.regulatorio.justificacion_no_alternativas).then(() => alert('Copiado para MIPRES'));
    },

    // --- RULES ENGINE ---
    renderCalculatorInputs(drug) {
        const inputsContainer = document.getElementById('calc-inputs');
        const engine = drug.posologia.motor_dosificacion;
        let html = '';

        if (!engine || engine.calculation_type === 'PENDIENTE') {
            html = `<div style="color: #F44336;">[ Módulo deshabilitado ]</div>`;
            inputsContainer.innerHTML = html;
            return;
        }

        if (engine.inputs_required.includes('peso_kg')) {
            html += `<div class="calc-input-group"><label>Peso:</label><input type="number" id="calc-peso" placeholder="0.0" oninput="app.calculateDose()"><span style="color:#569CD6">kg</span></div>`;
        }
        if (engine.inputs_required.includes('talla_cm')) {
            html += `<div class="calc-input-group"><label>Talla:</label><input type="number" id="calc-talla" placeholder="0" oninput="app.calculateDose()"><span style="color:#569CD6">cm</span></div>`;
        }
        if (engine.inputs_required.includes('fecha_nacimiento')) {
            html += `<div class="calc-input-group"><label>Nacimiento:</label><input type="date" id="calc-dob" oninput="app.calculateDose()"></div>`;
        }
        
        inputsContainer.innerHTML = html;
        document.getElementById('calc-results').innerHTML = `<div style="text-align: center; color: #777;">Ingrese datos para calcular...</div>`;
    },

    getAgeInYears(dobString) {
        if (!dobString) return -1;
        const dob = new Date(dobString);
        if(dob > new Date()) return -1; 
        const diffMs = Date.now() - dob.getTime();
        const ageDt = new Date(diffMs); 
        return Math.abs(ageDt.getUTCFullYear() - 1970);
    },

    calculateVials(dosis_mg, vial_mg) {
        const vialesExactos = dosis_mg / vial_mg;
        const vialesRedondeados = Math.ceil(vialesExactos);
        const sobrante_mg = (vialesRedondeados * vial_mg) - dosis_mg;
        
        return {
            dosis_mg: dosis_mg.toFixed(2),
            viales_a_solicitar: vialesRedondeados,
            desperdicio_mg: sobrante_mg.toFixed(2),
            alerta_desperdicio: sobrante_mg > 0
        };
    },

    calculateDose() {
        const drug = this.currentDrug;
        if (!drug || !drug.posologia.motor_dosificacion) return;
        const engine = drug.posologia.motor_dosificacion;
        const resContainer = document.getElementById('calc-results');
        
        let peso = null, edad = null, talla = null;
        
        if (engine.inputs_required.includes('peso_kg')) {
            peso = parseFloat(document.getElementById('calc-peso')?.value);
            if (!peso || peso <= 0 || peso > 300) { resContainer.innerHTML = `<div style="color:#F44336">Ingrese peso válido.</div>`; return; }
        }
        if (engine.inputs_required.includes('talla_cm')) {
            talla = parseFloat(document.getElementById('calc-talla')?.value);
            if (!talla || talla <= 0 || talla > 300) { resContainer.innerHTML = `<div style="color:#F44336">Ingrese talla válida (cm).</div>`; return; }
        }
        if (engine.inputs_required.includes('fecha_nacimiento')) {
            const dobString = document.getElementById('calc-dob')?.value;
            edad = this.getAgeInYears(dobString);
            if (edad < 0) { resContainer.innerHTML = `<div style="color:#F44336">Ingrese fecha válida.</div>`; return; }
        }

        // --- CALCULATION LOGIC BY STATE ---
        let htmlOut = "";

        if (engine.calculation_type === 'BANDAS_EDAD_PESO') {
            let matchedRule = null;
            for (let rule of engine.rules_matrix) {
                let match = true;
                if (rule.conditions.edad_anios) {
                    if (edad < rule.conditions.edad_anios.min_inclusive || edad >= rule.conditions.edad_anios.max_exclusive) match = false;
                }
                if (match && rule.conditions.peso_kg) {
                    if (rule.conditions.peso_kg.operator === '<' && peso >= rule.conditions.peso_kg.threshold) match = false;
                    if (rule.conditions.peso_kg.operator === '>=' && peso < rule.conditions.peso_kg.threshold) match = false;
                }
                if (match) { matchedRule = rule; break; }
            }

            if (!matchedRule) {
                resContainer.innerHTML = `<div style="color:#F44336">⚠️ ${engine.fallback.mensaje}</div>`; return;
            }

            htmlOut = `
                <div style="color: #CE9178;">⚖️ Rango detectado: Tier ${matchedRule.tier} (Verificado)</div>
                <hr>
                <div class="calc-output">• Cantidad AM: ${matchedRule.output.posology_am}</div>
                <div class="calc-output">• Cantidad PM: ${matchedRule.output.posology_pm || 'N/A'}</div>
                <div class="calc-output">• Cajas / mes: ${matchedRule.output.mipres_monthly_boxes} caja(s)</div>
                <div class="calc-warning">📝 ${matchedRule.output.food_requirement || ''}</div>
            `;
        }

        else if (engine.calculation_type === 'LINEAL_MG_KG') {
            const dosisTotal = peso * engine.dose_mg_kg;
            const res = this.calculateVials(dosisTotal, engine.vial_mg);
            htmlOut = `
                <div style="color: #9CDCFE;">⚖️ Cálculo Lineal: ${engine.dose_mg_kg} mg/kg x ${peso} kg</div>
                <div class="calc-output" style="font-size:1.2rem; font-weight:bold; margin-top:0.5rem;">Total a infundir: ${res.dosis_mg} mg</div>
                <div class="calc-output">Viales a prescribir (MIPRES): ${res.viales_a_solicitar} vial(es) de ${engine.vial_mg}mg</div>
                ${res.alerta_desperdicio ? `<div class="calc-waste-alert">⚠️ Sobrante a desechar: ${res.desperdicio_mg} mg (Justificar en MIPRES)</div>` : ''}
            `;
        }

        else if (engine.calculation_type === 'SUPERFICIE_CORPORAL') {
            // Formula Mosteller: sqrt((peso * talla) / 3600)
            const bsa = Math.sqrt((peso * talla) / 3600);
            const dosisTotal = bsa * engine.bsa_multiplier;
            const res = this.calculateVials(dosisTotal, engine.vial_mg);
            htmlOut = `
                <div style="color: #9CDCFE;">⚖️ Sup. Corporal (Mosteller): ${bsa.toFixed(2)} m²</div>
                <div class="calc-output" style="font-size:1.2rem; font-weight:bold; margin-top:0.5rem;">Total a infundir: ${res.dosis_mg} mg</div>
                <div class="calc-output">Viales a prescribir (MIPRES): ${res.viales_a_solicitar} vial(es) de ${engine.vial_mg}mg</div>
                ${res.alerta_desperdicio ? `<div class="calc-waste-alert">⚠️ Sobrante a desechar: ${res.desperdicio_mg} mg</div>` : ''}
            `;
        }

        else if (engine.calculation_type === 'FIJA_CONDICIONADA') {
            let pass = true;
            if (engine.min_age !== null && edad < engine.min_age) pass = false;
            if (engine.min_weight_kg !== null && peso < engine.min_weight_kg) pass = false;

            if (!pass) {
                resContainer.innerHTML = `<div style="color:#F44336">⚠️ ${engine.fallback.mensaje}</div>`; return;
            }

            const res = this.calculateVials(engine.fixed_mg, engine.vial_mg);
            htmlOut = `
                <div style="color: #9CDCFE;">⚖️ Umbrales de inclusión superados (Dosis Fija)</div>
                <div class="calc-output" style="font-size:1.2rem; font-weight:bold; margin-top:0.5rem;">Dosis Total: ${engine.fixed_mg} mg</div>
                <div class="calc-output">Viales / Unidades: ${res.viales_a_solicitar} de ${engine.vial_mg}mg</div>
            `;
        }

        resContainer.innerHTML = htmlOut;
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
