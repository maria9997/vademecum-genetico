const drugsData = (function() {
    
    // --- BUILDERS PARA GENERAR LOS 47 FÁRMACOS MANTENIENDO EL ESQUEMA STRICTO ---

    function buildBase(id, name, comm, atc, isVND, cats, icd10, inclusion, justif, presDesc, vialMg, freq, mech, expected, alarm, paraclinical) {
        return {
            id: id,
            nombres_comerciales: [comm],
            principio_activo: name,
            codigo_atc: atc,
            categoria: isVND ? "VITAL_NO_DISPONIBLE" : "INVIMA_MIPRES",
            subespecialidades: cats,
            regulatorio: {
                registro_invima: { numero: isVND ? "N/A" : "Vigente (Validar número local)", cum: "N/A", vigente: !isVND },
                estado_excepcional: { tipo: isVND ? "MVND" : "NINGUNO", detalle: isVND ? "Aprobación sujeta a justificación vital" : "N/A" },
                indicaciones_cie10: [icd10],
                criterios_inclusion: inclusion,
                criterios_exclusion: "Hipersensibilidad comprobada al principio activo o excipientes.",
                requiere_junta_medica: true,
                justificacion_no_alternativas: justif,
                fecha_ultima_verificacion: "2026-07-22T00:00:00Z"
            },
            posologia: {
                presentaciones_comerciales: [
                    { id: "PRES-1", descripcion: presDesc, concentracion_valor: vialMg, concentracion_unidad: "mg", unidades_por_caja: 1, forma_farmaceutica: "Vial/Caja" }
                ],
                motor_dosificacion: null, // Asignado por el builder específico
                frecuencia_administracion: freq,
                via_administracion: "Definida por protocolo (IV/SC/Oral/IT)",
                duracion_tratamiento: "Indefinido",
                condiciones_almacenamiento: "Consultar ficha técnica local"
            },
            educacion_paciente: {
                mecanismo_accion_traducido: mech,
                expectativa_tratamiento: "MODIFICADORA_ENFERMEDAD",
                logistica_administracion: `Administración ${freq.toLowerCase()} bajo supervisión clínica o en casa según formulación.`,
                efectos_adversos: [
                    { descripcion: expected, severidad: "ESPERADO_MANEJABLE_EN_CASA" },
                    { descripcion: alarm, severidad: "SIGNO_DE_ALARMA_URGENCIAS" }
                ],
                requisitos_previos: ["Valoración de signos vitales", "Exámenes paraclínicos al día"]
            },
            monitoreo: {
                paraclinicos_control: [{ nombre: paraclinical, frecuencia: "Basal y Trimestral" }],
                escalas_valoracion_clinica: ["Escala de Valoración específica para la patología (Ej. 6MWT, CHOP-INTEND)"]
            }
        };
    }

    function buildLinear(id, name, comm, atc, isVND, cats, icd10, inc, justif, presDesc, vialMg, doseMgKg, freq, mech, exp, al, par) {
        let d = buildBase(id, name, comm, atc, isVND, cats, icd10, inc, justif, presDesc, vialMg, freq, mech, exp, al, par);
        d.posologia.motor_dosificacion = {
            calculation_type: "LINEAL_MG_KG",
            inputs_required: ["peso_kg"],
            dose_mg_kg: doseMgKg,
            vial_mg: vialMg,
            fallback: { trigger: "NINGUN_TIER_COINCIDE", mensaje: "Requiere evaluación clínica individualizada.", accion_ui: "BLOQUEAR_CALCULO_Y_MOSTRAR_ALERTA" },
            rules_matrix: []
        };
        return d;
    }

    function buildFixed(id, name, comm, atc, isVND, cats, icd10, inc, justif, presDesc, fixedMg, minAge, minWeight, freq, mech, exp, al, par) {
        let d = buildBase(id, name, comm, atc, isVND, cats, icd10, inc, justif, presDesc, fixedMg, freq, mech, exp, al, par);
        let inputs = [];
        if (minAge !== null) inputs.push("fecha_nacimiento");
        if (minWeight !== null) inputs.push("peso_kg");
        
        d.posologia.motor_dosificacion = {
            calculation_type: "FIJA_CONDICIONADA",
            inputs_required: inputs,
            fixed_mg: fixedMg,
            vial_mg: fixedMg,
            min_age: minAge,
            min_weight_kg: minWeight,
            fallback: { trigger: "NINGUN_TIER_COINCIDE", mensaje: "Paciente no cumple los umbrales de edad o peso para esta terapia fija.", accion_ui: "BLOQUEAR_CALCULO_Y_MOSTRAR_ALERTA" },
            rules_matrix: []
        };
        return d;
    }

    function buildBSA(id, name, comm, atc, isVND, cats, icd10, inc, justif, presDesc, vialMg, multiplier, freq, mech, exp, al, par) {
        let d = buildBase(id, name, comm, atc, isVND, cats, icd10, inc, justif, presDesc, vialMg, freq, mech, exp, al, par);
        d.posologia.motor_dosificacion = {
            calculation_type: "SUPERFICIE_CORPORAL",
            inputs_required: ["peso_kg", "talla_cm"],
            bsa_multiplier: multiplier,
            vial_mg: vialMg,
            fallback: { trigger: "NINGUN_TIER_COINCIDE", mensaje: "Medidas antropométricas inválidas.", accion_ui: "BLOQUEAR_CALCULO_Y_MOSTRAR_ALERTA" },
            rules_matrix: []
        };
        return d;
    }

    // --- INSTANCIACIÓN DE LOS 47 FÁRMACOS ---

    const list = [];

    // 1. TRIKAFTA (Plantilla Maestra con Bandas Corregidas 2-5 años)
    list.push({
        id: "trikafta", nombres_comerciales: ["Trikafta", "Kaftrio"], principio_activo: "Elexacaftor / Tezacaftor / Ivacaftor",
        codigo_atc: "R07AX32", categoria: "INVIMA_MIPRES", subespecialidades: ["Fibrosis Quística (moduladores CFTR)"],
        regulatorio: {
            registro_invima: { numero: "INVIMA 2021M-0020306", cum: "201824-1", vigente: true },
            estado_excepcional: { tipo: "NINGUNO", detalle: "N/A" },
            indicaciones_cie10: ["E840 - Fibrosis quística con manifestaciones pulmonares"],
            criterios_inclusion: "Presencia de al menos una mutación F508del en CFTR. Edad >= 2 años.",
            criterios_exclusion: "Alteración hepática Child-Pugh C sin ajuste estricto.",
            requiere_junta_medica: true,
            justificacion_no_alternativas: "Actúa directamente sobre el defecto básico de la proteína CFTR, restaurando la función del canal. Las alternativas PBS son sintomáticas y no evitan trasplante pulmonar.",
            fecha_ultima_verificacion: "2026-07-22T00:00:00Z"
        },
        posologia: {
            presentaciones_comerciales: [
                { id: "PRES-A-PED-GRANULOS", descripcion: "Gránulos (Elexa 80mg/Teza 40mg/Iva 60mg + Iva 59.5mg)", concentracion_valor: 80, concentracion_unidad: "mg", unidades_por_caja: 56, forma_farmaceutica: "Gránulos" },
                { id: "PRES-B-PED-GRANULOS", descripcion: "Gránulos (Elexa 100mg/Teza 50mg/Iva 75mg + Iva 75mg)", concentracion_valor: 100, concentracion_unidad: "mg", unidades_por_caja: 56, forma_farmaceutica: "Gránulos" },
                { id: "PRES-C-PED-TABS", descripcion: "Tabletas (Elexa 50mg/Teza 25mg/Iva 37.5mg + Iva 75mg)", concentracion_valor: 50, concentracion_unidad: "mg", unidades_por_caja: 84, forma_farmaceutica: "Tabletas recubiertas" },
                { id: "PRES-D-ADU-TABS", descripcion: "Tabletas (Elexa 100mg/Teza 50mg/Iva 75mg + Iva 150mg)", concentracion_valor: 100, concentracion_unidad: "mg", unidades_por_caja: 84, forma_farmaceutica: "Tabletas recubiertas" }
            ],
            motor_dosificacion: {
                calculation_type: "BANDAS_EDAD_PESO",
                inputs_required: ["peso_kg", "fecha_nacimiento"],
                fallback: {
                    trigger: "NINGUN_TIER_COINCIDE",
                    mensaje: "Paciente menor de 2 años o peso insuficiente. No existe posología aprobada. Evaluación individualizada requerida.",
                    accion_ui: "BLOQUEAR_CALCULO_Y_MOSTRAR_ALERTA"
                },
                rules_matrix: [
                    {
                        tier: 0,
                        conditions: { edad_anios: { min_inclusive: 2, max_exclusive: 6 }, peso_kg: { operator: "<", threshold: 14 } },
                        output: { presentation_ref: "PRES-A-PED-GRANULOS", posology_am: "1 sobre (Elexa 80mg/Teza 40mg/Iva 60mg)", posology_pm: "1 sobre (Iva 59.5mg)", frequency_hours: 12, mipres_monthly_boxes: 1, food_requirement: "Administrar con alimentos ricos en grasas" }
                    },
                    {
                        tier: 1,
                        conditions: { edad_anios: { min_inclusive: 2, max_exclusive: 6 }, peso_kg: { operator: ">=", threshold: 14 } },
                        output: { presentation_ref: "PRES-B-PED-GRANULOS", posology_am: "1 sobre (Elexa 100mg/Teza 50mg/Iva 75mg)", posology_pm: "1 sobre (Iva 75mg)", frequency_hours: 12, mipres_monthly_boxes: 1, food_requirement: "Administrar con alimentos ricos en grasas" }
                    },
                    {
                        tier: 2,
                        conditions: { edad_anios: { min_inclusive: 6, max_exclusive: 12 }, peso_kg: { operator: "<", threshold: 30 } },
                        output: { presentation_ref: "PRES-C-PED-TABS", posology_am: "2 tabletas combinadas", posology_pm: "1 tableta Ivacaftor 75mg", frequency_hours: 12, mipres_monthly_boxes: 1, food_requirement: "Administrar con alimentos ricos en grasas" }
                    },
                    {
                        tier: 3,
                        conditions: { edad_anios: { min_inclusive: 6, max_exclusive: 12 }, peso_kg: { operator: ">=", threshold: 30 } },
                        output: { presentation_ref: "PRES-D-ADU-TABS", posology_am: "2 tabletas combinadas", posology_pm: "1 tableta Ivacaftor 150mg", frequency_hours: 12, mipres_monthly_boxes: 1, food_requirement: "Administrar con alimentos ricos en grasas" }
                    },
                    {
                        tier: 4,
                        conditions: { edad_anios: { min_inclusive: 12, max_exclusive: 999 } },
                        output: { presentation_ref: "PRES-D-ADU-TABS", posology_am: "2 tabletas combinadas", posology_pm: "1 tableta Ivacaftor 150mg", frequency_hours: 12, mipres_monthly_boxes: 1, food_requirement: "Administrar con alimentos ricos en grasas" }
                    }
                ]
            },
            frecuencia_administracion: "Cada 12 horas",
            via_administracion: "Oral",
            duracion_tratamiento: "Indefinido",
            condiciones_almacenamiento: "Temperatura ambiente (< 30°C)"
        },
        educacion_paciente: {
            mecanismo_accion_traducido: "Incrementa el número y la función de las 'puertas' de sal (CFTR) en la superficie de las células, fluidificando las secreciones pulmonares.",
            expectativa_tratamiento: "MODIFICADORA_ENFERMEDAD",
            logistica_administracion: "OBLIGATORIO consumirlas con alimentos altos en grasa (ej. mantequilla, aguacate, leche entera) para asegurar su absorción.",
            efectos_adversos: [
                { descripcion: "Elevación de transaminasas, cefalea", severidad: "ESPERADO_MANEJABLE_EN_CASA" },
                { descripcion: "Ictericia o dolor abdominal severo", severidad: "SIGNO_DE_ALARMA_URGENCIAS" }
            ],
            requisitos_previos: ["Evitar consumo de toronja y naranja agria."]
        },
        monitoreo: {
            paraclinicos_control: [{ nombre: "Perfil Hepático", frecuencia: "Trimestral el primer año, luego anual" }],
            escalas_valoracion_clinica: ["FEV1", "IMC"]
        }
    });

    // 2. ERRORES INNATOS DEL METABOLISMO (INVIMA)
    list.push(buildLinear("acido-carglumico", "Ácido carglúmico", "Carbaglu", "A16AA05", false, ["Errores Innatos del Metabolismo (EIM)"], "E722 - Trastornos del ciclo de la urea", "Deficiencia confirmada de NAGS.", "Falta de NAGS requiere reemplazo enzimático.", "Tabletas 200mg", 200, 100, "Diaria (dividida)", "Reemplaza el activador NAGS.", "Sabor metálico", "Vómitos incontrolables (hiperamonemia)", "Amonio Sérico"));
    list.push(buildLinear("acido-colico", "Ácido cólico", "Orphacol", "A05AA03", false, ["Errores Innatos del Metabolismo (EIM)"], "E806 - Trastornos de bilirrubina/ácidos biliares", "Defectos síntesis ácidos biliares.", "Restaura pool biliar fisiológico.", "Cápsulas 50mg", 50, 15, "Diaria", "Suple el ácido biliar faltante.", "Diarrea leve", "Ictericia severa", "Perfil hepático"));
    list.push(buildLinear("alfa-1-antitripsina", "Alfa-1 antitripsina", "Prolastin", "B02AB02", false, ["Errores Innatos del Metabolismo (EIM)", "Enfermedades Respiratorias Genéticas"], "E880 - Deficiencia Alfa-1 Antitripsina", "Deficiencia genética de AAT con compromiso pulmonar.", "Previene la degradación enzimática del parénquima pulmonar.", "Vial 1000mg", 1000, 60, "Semanal", "Repone la proteína protectora del pulmón.", "Cansancio post-infusión", "Fiebre y dificultad respiratoria (Anafilaxia)", "FEV1, Función Hepática"));
    list.push(buildLinear("nitisinona", "Nitisinona", "Orfadin", "A16AX04", false, ["Errores Innatos del Metabolismo (EIM)"], "E702 - Tirosinemia Tipo 1", "Diagnóstico de HT-1.", "Bloquea formación de succinilacetona hepatotóxica.", "Cápsulas 10mg", 10, 1, "Dos veces al día", "Bloquea paso metabólico tóxico.", "Fotofobia leve", "Dolor ocular agudo (Cristales en córnea)", "Succinilacetona sérica"));
    list.push(buildLinear("sapropterina", "Sapropterina", "Kuvan", "A16AX07", false, ["Errores Innatos del Metabolismo (EIM)"], "E700 - Fenilcetonuria", "Respuesta demostrada a BH4.", "Cofactor necesario para la enzima PAH residual.", "Comprimidos 100mg", 100, 10, "Diaria", "Acelera la enzima natural que procesa fenilalanina.", "Dolor de cabeza", "Hipersensibilidad aguda", "Niveles de Fenilalanina"));
    list.push(buildFixed("pegvaliasa", "Pegvaliasa", "Palynziq", "A16AB19", false, ["Errores Innatos del Metabolismo (EIM)"], "E700 - Fenilcetonuria", "Adultos refractarios a dieta.", "Terapia de sustitución enzimática subcutánea indispensable ante falla dietaria.", "Jeringa 20mg", 20, 18, null, "Diaria", "Enzima circulante que corta la fenilalanina en sangre.", "Dolor en sitio de inyección", "Anafilaxia severa (Epinefrina obligatoria)", "Niveles Phe"));
    list.push(buildLinear("asfotasa-alfa", "Asfotasa alfa", "Strensiq", "A16AB13", false, ["Errores Innatos del Metabolismo (EIM)", "Displasias Óseas / Esqueléticas"], "E833 - Hipofosfatasia", "HPP perinatal/infantil.", "Reemplaza fosfatasa alcalina tisular (TNSALP) permitiendo mineralización ósea.", "Vial 40mg", 40, 2, "3 veces por semana", "Repone la enzima ósea faltante para endurecer los huesos.", "Reacciones cutáneas locales", "Craneosinostosis o papiledema", "Radiografías óseas, Fosfatasa alcalina"));

    // 3. DEPÓSITO LISOSOMAL (INVIMA)
    list.push(buildLinear("agalsidasa-alfa", "Agalsidasa alfa", "Replagal", "A16AB03", false, ["Patologías de Depósito Lisosomal"], "E752 - Enfermedad de Fabry", "Diagnóstico genético/bioquímico Fabry.", "TRE específica para clarificar depósitos de GL-3 endoteliales.", "Vial 3.5mg", 3.5, 0.2, "Cada 14 días", "Repone la enzima celular faltante.", "Fatiga el día de infusión", "Rigores o fiebre muy alta (RIA)", "Proteinuria, Ecocardiograma"));
    list.push(buildLinear("agalsidasa-beta", "Agalsidasa beta", "Fabrazyme", "A16AB04", false, ["Patologías de Depósito Lisosomal"], "E752 - Enfermedad de Fabry", "Diagnóstico genético/bioquímico Fabry.", "TRE (Dosis alta 1.0 mg/kg) esencial para aclaramiento histológico.", "Vial 35mg", 35, 1.0, "Cada 14 días", "Limpia basura lipídica celular.", "Escalofríos leves", "Anafilaxia", "TFG, GL-3 plasmático"));
    list.push(buildLinear("alglucosidasa-alfa", "Alglucosidasa alfa", "Myozyme", "A16AB07", false, ["Patologías de Depósito Lisosomal"], "E740 - Enfermedad de Pompe", "Diagnóstico Pompe.", "Evita falla cardiopulmonar limpiando el glucógeno muscular.", "Vial 50mg", 50, 20, "Cada 14 días", "Barrer azúcares del corazón y músculos.", "Rubor", "Edema laríngeo", "FVC, Anticuerpos anti-GAA"));
    list.push(buildLinear("avalglucosidasa-alfa", "Avalglucosidasa alfa", "Nexviazyme", "A16AB22", false, ["Patologías de Depósito Lisosomal"], "E740 - Enfermedad de Pompe", "Pompe de inicio tardío.", "TRE de nueva generación con mayor captación en receptor M6P muscular.", "Vial 100mg", 100, 20, "Cada 14 días", "Mejor penetración al músculo para limpiar glucógeno.", "Dolor muscular post-infusión", "Reacción alérgica severa", "Anticuerpos, FVC"));
    list.push(buildFixed("eliglustat", "Eliglustat", "Cerdelga", "A16AX10", false, ["Patologías de Depósito Lisosomal"], "E752 - Enfermedad de Gaucher Tipo 1", "Adultos fenotipo metabólico CYP2D6 compatible.", "Inhibe la síntesis de glucosilceramida, evitando invasión esplénica/ósea.", "Cápsula 84mg", 84, 18, null, "Cada 12 horas", "Frena la producción de basura celular antes de que se acumule.", "Dolor abdominal", "Palpitaciones anormales (prolongación PR/QT/QRS)", "Genotipificación CYP2D6 previa, ECG"));
    list.push(buildLinear("elosulfasa-alfa", "Elosulfasa alfa", "Vimizim", "A16AB12", false, ["Patologías de Depósito Lisosomal"], "E762 - Mucopolisacaridosis IVA (Morquio A)", "Diagnóstico MPS IVA.", "Única terapia para degradar keratan sulfato acumulado en huesos.", "Vial 5mg", 5, 2, "Semanal", "Limpia azúcares complejos del cartílago.", "Vómito leve", "Falla respiratoria posicional (riesgo cervical)", "RMN Cervical, Test de Marcha 6min"));
    list.push(buildLinear("galsulfasa", "Galsulfasa", "Naglazyme", "A16AB08", false, ["Patologías de Depósito Lisosomal"], "E762 - Mucopolisacaridosis VI", "Diagnóstico Maroteaux-Lamy.", "Degrada GAGs disminuyendo la organomegalia y morbilidad cardiaca.", "Vial 5mg", 5, 1, "Semanal", "Repone enzima que limpia tejidos conectivos.", "Artralgias", "Compresión medular o apnea aguda", "GAGs urinarios"));
    list.push(buildLinear("idursulfasa", "Idursulfasa", "Elaprase", "A16AB09", false, ["Patologías de Depósito Lisosomal"], "E761 - Mucopolisacaridosis II", "Diagnóstico Síndrome de Hunter.", "TRE específica que revierte esplenomegalia y mejora vía aérea.", "Vial 6mg", 6, 0.5, "Semanal", "Descompone carbohidratos tóxicos.", "Fiebre leve post infusión", "Hipoxia o sibilancias agudas", "Ecocardiograma, Función Pulmonar"));
    list.push(buildLinear("imiglucerasa", "Imiglucerasa", "Cerezyme", "A16AB02", false, ["Patologías de Depósito Lisosomal"], "E752 - Enfermedad de Gaucher Tipo 1/3", "Diagnóstico Gaucher sintomático.", "Restauración enzimática directa en macrófagos, evitando crisis óseas.", "Vial 400 U", 400, 60, "Cada 14 días", "Restaura la limpieza en los glóbulos blancos.", "Prurito", "Reacción infusional anafilactoide", "Volumen esplénico/hepático, Plaquetas"));
    list.push(buildLinear("laronidasa", "Laronidasa", "Aldurazyme", "A16AB05", false, ["Patologías de Depósito Lisosomal"], "E760 - Mucopolisacaridosis I", "Diagnóstico Hurler, Hurler-Scheie o Scheie.", "Descompone dermatán/heparán sulfato mejorando complianza pulmonar.", "Vial 500 U (2.9mg)", 2.9, 0.58, "Semanal", "Limpia polisacáridos de los órganos.", "Rash leve", "Reacción alérgica inmediata grave", "Test de Marcha 6min, GAGs urinarios"));
    list.push(buildFixed("migalastat", "Migalastat", "Galafold", "A16AX14", false, ["Patologías de Depósito Lisosomal"], "E752 - Enfermedad de Fabry", "Adultos con mutaciones susceptibles.", "Chaperona que corrige el plegamiento de la enzima nativa defectuosa.", "Cápsula 123mg", 123, 16, null, "Días alternos", "Dale a la enzima rota la forma correcta para funcionar.", "Cefalea", "Dolor precordial", "TFG (Suspender si <30)"));
    list.push(buildFixed("miglustat", "Miglustat", "Zavesca", "A16AX06", false, ["Patologías de Depósito Lisosomal"], "E752 - Enfermedad de Gaucher Tipo 1", "Adultos que no pueden recibir TRE.", "Inhibición de la glucosilceramida sintasa.", "Cápsula 100mg", 100, 18, null, "Cada 8 horas", "Reduce la producción de la grasa toxica celular.", "Diarrea severa inicial", "Temblor y calambres agudos", "Conteo de Plaquetas"));
    list.push(buildLinear("taliglucerasa-alfa", "Taliglucerasa alfa", "Elelyso", "A16AB11", false, ["Patologías de Depósito Lisosomal"], "E752 - Enfermedad de Gaucher Tipo 1", "Gaucher tipo 1.", "TRE producida en células vegetales.", "Vial 200 U", 200, 60, "Cada 14 días", "Versión vegetal de la enzima humana.", "Fatiga", "Urticaria severa", "Volumen Esplénico"));
    list.push(buildLinear("velaglucerasa-alfa", "Velaglucerasa alfa", "VPRIV", "A16AB10", false, ["Patologías de Depósito Lisosomal"], "E752 - Enfermedad de Gaucher Tipo 1", "Gaucher tipo 1.", "TRE de origen en línea celular humana.", "Vial 400 U", 400, 60, "Cada 14 días", "Versión de línea humana de la enzima.", "Mareo", "Fiebre y rigores", "Conteo de Plaquetas"));

    // 4. NEUROMUSCULARES Y GÉNICAS (INVIMA)
    list.push(buildFixed("inotersen", "Inotersen", "Tegsedi", "N07XX15", false, ["Enfermedades Neuromusculares"], "E851 - Amiloidosis hereditaria", "Amiloidosis por TTR con polineuropatía.", "Oligonucleótido que bloquea la síntesis de proteína amiloidogénica.", "Jeringa 284mg", 284, 18, null, "Semanal", "Silencia genéticamente el defecto.", "Eritema en inyección", "Sangrado, Edema severo (Falla renal)", "Recuento de Plaquetas (Urgente)"));
    list.push(buildFixed("nusinersen", "Nusinersen", "Spinraza", "M09AX07", false, ["Enfermedades Neuromusculares"], "G120 - Atrofia Muscular Espinal", "AME confirmada genéticamente.", "Aumenta la proteína SMN funcional modificando el splicing de SMN2.", "Vial Intratecal 12mg", 12, null, null, "Cada 4 meses", "Inyección en la columna para reprogramar nervios motores.", "Cefalea post punción", "Signos meníngeos", "PLQ, Coagulación pre-punción"));
    
    // Zolgensma (Onasemnogen): Dosis fijada pero calculada matricialmente real es 1.1x10^14 vg/kg. Usaremos Lineal en viales por peso.
    list.push(buildLinear("onasemnogen-abeparvovec", "Onasemnogen abeparvovec", "Zolgensma", "M09AX09", false, ["Enfermedades Neuromusculares", "Terapias Génicas y de Splicing"], "G120 - Atrofia Muscular Espinal", "AME en infantes < 2 años.", "Inserta gen funcional SMN1 humano vía vector AAV9 viral.", "Kits de Viales basados en peso (Vial promedio 1 unidad)", 1, 1, "Única vez en la vida", "Repara el código genético definitivamente con un virus inactivo.", "Piel levemente amarilla", "Sangrado de mucosas, Vómito letárgico", "Transaminasas semanales post-infusión"));
    list.push(buildLinear("patisiran", "Patisiran", "Onpattro", "N07XX12", false, ["Enfermedades Neuromusculares"], "E851 - Amiloidosis hereditaria", "Amiloidosis hTTR.", "Interferencia por ARN (ARNi) para silenciar la producción de proteína amiloide.", "Vial 10mg", 10, 0.3, "Cada 3 semanas", "Usa tecnología ARN para 'apagar' el gen tóxico.", "Reacciones de infusión", "Bloqueo cardiaco", "Niveles de Vitamina A"));
    list.push(buildFixed("risdiplam", "Risdiplam", "Evrysdi", "M09AX10", false, ["Enfermedades Neuromusculares"], "G120 - Atrofia Muscular Espinal", "AME en pacientes >= 2 meses. Peso > 20 kg (dosis tope 5mg).", "Modificador de splicing de SMN2 vía oral.", "Vial 60mg (polvo oral)", 60, null, 20, "Diaria", "Jarabe que corrige la falla genética a nivel sistémico.", "Fiebre, Diarrea", "Dificultad respiratoria basal empeorada", "Monitoreo motor (CHOP)"));
    list.push(buildFixed("trofinetida", "Trofinetida", "Daybue", "N07XX18", false, ["Enfermedades Neuromusculares"], "F842 - Síndrome de Rett", "Síndrome de Rett en adultas/niñas >=2 años.", "Análogo de factor de crecimiento insulinoide, reduce neuroinflamación.", "Frasco solución 200mg/mL", 12000, 2, null, "Dos veces al día", "Ayuda a las conexiones cerebrales a madurar.", "Diarrea muy frecuente", "Deshidratación severa", "Control de peso"));
    list.push(buildFixed("voretigene-neparvovec", "Voretigene neparvovec", "Luxturna", "S01XA22", false, ["Terapias Génicas y de Splicing"], "H355 - Distrofia retiniana", "Distrofia de retina por mutación bialélica RPE65.", "Inyecta una copia normal del gen RPE65 debajo de la retina.", "Vial Subretiniano", 1, null, null, "Única vez en la vida por ojo", "Cirugía ocular que implanta un gen curativo en la retina.", "Catarata", "Infección endocular", "OCT Macular"));

    // 5. HEMATOLOGÍA / COMPLEMENTO Y FQ ADICIONAL (INVIMA)
    list.push(buildLinear("eculizumab", "Eculizumab", "Soliris", "L04AA25", false, ["Hematología / Enfermedades Mediadas por Complemento"], "D593 - Síndrome urémico hemolítico atípico", "SUHa o HPN severa.", "Anticuerpo monoclonal que se une e inhibe a C5 terminal.", "Vial 300mg", 300, 10, "Cada 14 días", "Apaga el sistema inmunológico terminal que ataca los riñones.", "Cefalea, Nasofaringitis", "Fiebre y rigidez de cuello (MENINGITIS LETAL)", "Vacunación meningocócica mandatoria, LDH"));
    list.push(buildLinear("ravulizumab", "Ravulizumab", "Ultomiris", "L04AA43", false, ["Hematología / Enfermedades Mediadas por Complemento"], "D593 - Síndrome urémico hemolítico atípico", "SUHa o HPN.", "Inhibidor de C5 de acción extendida por tecnología de reciclaje lisosomal.", "Vial 300mg/1100mg", 300, 30, "Cada 8 semanas", "Apaga el ataque inmunológico con duración de meses.", "Infección de vías respiratorias", "Meningitis fulminante", "Vacuna meningocócica, LDH"));
    list.push(buildFixed("ivacaftor", "Ivacaftor", "Kalydeco", "R07AX02", false, ["Fibrosis Quística (moduladores CFTR)"], "E840 - Fibrosis quística con manifestaciones pulmonares", "Mutación de apertura del canal CFTR (clase III).", "Potencia la apertura del canal preexistente.", "Tableta 150mg", 150, 6, null, "Cada 12 horas", "Obliga a la puerta celular a quedarse abierta más tiempo.", "Dolor abdominal", "Hepatitis severa", "Transaminasas, Oftalmología"));

    // 6. VITAL NO DISPONIBLE (MVND) - 13 Originales
    list.push(buildFixed("alpelisib", "Alpelisib", "Vijoice", "L01EM03", true, ["Cáncer Hereditario / Oncogenética"], "Q878 - Síndrome de sobrecrecimiento relacionado con PIK3CA (PROS)", "Pacientes con PROS sintomáticos.", "Inhibidor oral de la quinasa PI3K-alfa mutada.", "Tableta 50mg/125mg/200mg", 200, 2, null, "Diaria", "Bloquea la señal de sobrecrecimiento tisular.", "Hiperglucemia, Diarrea", "Erupción severa con descamación (S. Stevens-Johnson), Cetoacidosis", "Glucemia en ayunas"));
    list.push(buildLinear("betaina-anhidra", "Betaína anhidra", "Cystadane", "A16AA06", true, ["Errores Innatos del Metabolismo (EIM)"], "E723 - Trastornos del metabolismo de la metionina", "Homocistinuria clásica.", "Dona grupos metilo para reducir homocisteína a metionina.", "Polvo 100g", 10000, 100, "Dos veces al día", "Ayuda a procesar toxinas vasculares.", "Olor corporal a pescado", "Edema cerebral", "Niveles de Homocisteína"));
    list.push(buildFixed("cerliponasa-alfa", "Cerliponasa alfa", "Brineura", "A16AB17", true, ["Patologías de Depósito Lisosomal"], "E754 - Enfermedad CLN2 (Batten)", "Deficiencia TPP1.", "TRE administrada directamente al líquido cefalorraquídeo.", "Vial 300mg", 300, 3, null, "Cada 14 días", "Infunde enzima directo en el cerebro vía catéter.", "Fiebre post infusión", "Infección de la válvula (Meningitis)", "Examen LCR celular"));
    list.push(buildBSA("cisteamina", "Cisteamina (Mercaptamina)", "Procysbi", "A16AA04", true, ["Errores Innatos del Metabolismo (EIM)"], "E720 - Cistinosis", "Nefropatía por cistinosis.", "Convierte la cistina en cisteína mixta que escapa del lisosoma.", "Cápsulas 75mg/250mg", 250, 1300, "Cada 12 horas", "Químico que se enlaza al desecho celular permitiendo su salida renal.", "Mal aliento, náuseas", "Sangrado gastrointestinal, Encefalopatía", "Cistina intraleucocitaria"));
    list.push(buildLinear("givosiran", "Givosiran", "Givlaari", "A16AX16", true, ["Errores Innatos del Metabolismo (EIM)"], "E802 - Porfiria hepática aguda", "Pacientes con crisis recurrentes de porfiria.", "ARNi que suprime la enzima hepática ALAS1.", "Vial 189mg", 189, 2.5, "Mensual", "Silencia el ARN del hígado para frenar las toxinas porfirínicas.", "Dolor en inyección, Náuseas", "Choque anafiláctico, Embolia pulmonar", "Homocisteína, Función renal"));
    list.push(buildLinear("lumasiran", "Lumasiran", "Oxlumo", "A16AX18", true, ["Errores Innatos del Metabolismo (EIM)"], "E720 - Hiperoxaluria primaria tipo 1", "Diagnóstico de HP1.", "ARNi que bloquea glicolato oxidasa reduciendo oxalato.", "Vial 94.5mg", 94.5, 3, "Mensual", "Evita que el hígado forme los cristales que destruyen los riñones.", "Enrojecimiento", "Falla respiratoria (Raro)", "Oxalato en orina"));
    list.push(buildLinear("metreleptina", "Metreleptina", "Myalept", "A16AA07", true, ["Errores Innatos del Metabolismo (EIM)"], "E881 - Lipodistrofia generalizada", "Complicaciones metabólicas de la deficiencia de leptina.", "Análogo recombinante de la leptina humana.", "Vial 11.3mg", 11.3, 0.06, "Diaria (SC)", "Restaura la hormona faltante que regula energía e insulina.", "Pérdida de peso, Hipoglucemia", "Linfoma (Riesgo asociado a largo plazo), Pancreatitis aguda", "Anticuerpos anti-leptina, Glucosa"));
    list.push(buildLinear("sebelipasa-alfa", "Sebelipasa alfa", "Kanuma", "A16AB14", true, ["Patologías de Depósito Lisosomal"], "E755 - Deficiencia de lipasa ácida lisosomal", "Diagnóstico LAL-D.", "TRE para reducir acumulación de ésteres de colesterol.", "Vial 20mg", 20, 1, "Cada 14 días", "Limpia la grasa tóxica acumulada en hígado.", "Fiebre", "Reacción alérgica severa", "Perfil lipídico, Transaminasas"));
    list.push(buildLinear("trientina", "Trientina", "Syprine", "A16AX12", true, ["Errores Innatos del Metabolismo (EIM)"], "E830 - Enfermedad de Wilson", "Intolerancia demostrada a Penicilamina.", "Quelante fuerte de cobre para excreción urinaria.", "Cápsula 250mg", 250, 15, "Cada 12 horas", "Atrapa el cobre suelto en el cuerpo para expulsarlo por orina.", "Molestia estomacal", "Empeoramiento neurológico agudo inicial, Lupus medicamentoso", "Cobre urinario 24h, Conteo hemático"));
    list.push(buildLinear("triheptanoina", "Triheptanoína", "Dojolvi", "A16AX19", true, ["Errores Innatos del Metabolismo (EIM)"], "E713 - Deficiencia de oxidación de ácidos grasos", "Desorden FAOD de cadena larga documentado.", "Aceite de cadena impar que rodea el defecto metabólico aportando sustrato anaplerótico.", "Líquido oral 100%", 1000, 20, "Con todas las comidas", "Bypass metabólico: un tipo de grasa especial que da energía a los músculos.", "Diarrea severa si no se mezcla con comida", "Crisis metabólica (rabdomiolisis)", "CPK, Perfil hepático"));
    list.push(buildLinear("vestronidasa-alfa", "Vestronidasa alfa", "Mepsevii", "A16AB18", true, ["Patologías de Depósito Lisosomal"], "E762 - Mucopolisacaridosis VII", "Síndrome de Sly.", "TRE para descomponer GAGs generalizados.", "Vial 10mg", 10, 4, "Cada 14 días", "Infusión que devuelve la enzima limpiadora del cuerpo.", "Diarrea", "Anafilaxia (Riesgo alto en Sly)", "GAGs, Alerta médica"));
    list.push(buildLinear("vosoritida", "Vosoritida", "Voxzogo", "H04AA02", true, ["Displasias Óseas / Esqueléticas"], "Q774 - Acondroplasia", "Epífisis abiertas demostradas en rayos X.", "Péptido análogo de CNP que antagoniza la vía hiperactiva de FGFR3.", "Vial 0.4mg/0.56mg/1.2mg", 0.56, 15, "Diaria (SC)", "Bloquea el 'freno' natural del crecimiento óseo.", "Caída de presión arterial (Mareo)", "Síncope agudo si no come antes de inyección", "Velocidad de Crecimiento Anual"));
    list.push(buildLinear("acido-quenodesoxicolico", "Ácido quenodesoxicólico", "Chenodal", "A05AA01", true, ["Errores Innatos del Metabolismo (EIM)"], "E806 - Trastornos de la síntesis de ácidos biliares", "Diagnóstico de Xantomatosis Cerebrotendinosa (CTX).", "Inhibe colesterol 7-alfa-hidroxilasa mediante retroalimentación negativa.", "Cápsula 250mg", 250, 15, "Diaria", "Engaña al cuerpo para que deje de producir las grasas tóxicas cerebrales.", "Cólico", "Falla hepática fulminante", "Perfil Biliar, RMN Cerebral"));

    // 7. DUCHENNE EXTRAS (MVND)
    list.push(buildLinear("eteplirsen", "Eteplirsen", "Exondys 51", "M09AX", true, ["Enfermedades Neuromusculares", "Terapias Génicas y de Splicing"], "G710 - Distrofia muscular", "DMD con mutación susceptible de salto del exón 51.", "Oligonucleótido antisentido que omite el exón 51 creando distrofina funcional corta.", "Vial 50mg/mL", 500, 30, "Semanal (IV)", "Crea un puente genético sobre el error del ADN para restaurar fuerza muscular parcial.", "Dolor en sitio de catéter, Vómitos", "Embolia pulmonar, Falla renal aguda", "Función renal exhaustiva pre-infusión"));
    list.push(buildLinear("golodirsen", "Golodirsen", "Vyondys 53", "M09AX", true, ["Enfermedades Neuromusculares", "Terapias Génicas y de Splicing"], "G710 - Distrofia muscular", "DMD con mutación susceptible de salto del exón 53.", "Oligonucleótido antisentido que omite el exón 53.", "Vial 50mg/mL", 500, 30, "Semanal (IV)", "Crea puente genético saltando el exón 53.", "Dolor de cabeza", "Proteinuria masiva (Nefrotoxicidad grave)", "Creatinina y orina al mes"));

    return list;
})();
