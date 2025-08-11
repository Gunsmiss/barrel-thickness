/**
 * Compound Cylinder/Trunnion Analysis Module
 * Implements reinforced barrel analysis with trunnion using shrink/interference fit stress superposition
 * 
 * All calculations use SI base units internally:
 * - Lengths in mm
 * - Pressures in MPa
 * - Stresses in MPa
 * - Elastic modulus in MPa
 * - Poisson's ratio dimensionless
 */

import { lameCoefficients, stresses, vonMises, safetyFactors } from './core.js';

/**
 * Calculate contact pressure from interference fit between barrel and trunnion
 * 
 * For two concentric cylinders with interference δ, the contact pressure is:
 * p_c = δ / (C_b + C_t)
 * 
 * Where compliance factors for plane strain conditions are:
 * C_b = (ro_b² + ri_b²) / (E_b * (ro_b² - ri_b²)) * (1 - ν_b²)
 * C_t = (ro_t² + ri_t²) / (E_t * (ro_t² - ri_t²)) * (1 - ν_t²)
 * 
 * @param {Object} barrel - Barrel cylinder properties
 * @param {number} barrel.ri - Inner radius (mm)
 * @param {number} barrel.ro - Outer radius (mm)
 * @param {number} barrel.E - Elastic modulus (MPa)
 * @param {number} barrel.nu - Poisson's ratio
 * @param {Object} trunnion - Trunnion cylinder properties
 * @param {number} trunnion.ri - Inner radius (mm) - should equal barrel.ro - δ
 * @param {number} trunnion.ro - Outer radius (mm)
 * @param {number} trunnion.E - Elastic modulus (MPa)
 * @param {number} trunnion.nu - Poisson's ratio
 * @param {number} interference - Interference δ (mm), positive for compression
 * @returns {number} Contact pressure (MPa)
 * @throws {Error} If geometry or material properties are invalid
 */
export function contactPressure(barrel, trunnion, interference) {
    // Input validation
    if (barrel.ri <= 0) {
        throw new Error('Barrel inner radius must be positive');
    }
    if (barrel.ro <= barrel.ri) {
        throw new Error('Barrel outer radius must be greater than inner radius');
    }
    if (trunnion.ro <= trunnion.ri) {
        throw new Error('Trunnion outer radius must be greater than inner radius');
    }
    if (barrel.E <= 0 || trunnion.E <= 0) {
        throw new Error('Elastic modulus must be positive');
    }
    if (barrel.nu < 0 || barrel.nu >= 0.5 || trunnion.nu < 0 || trunnion.nu >= 0.5) {
        throw new Error('Poisson\'s ratio must be between 0 and 0.5');
    }
    if (interference < 0) {
        throw new Error('Interference must be non-negative');
    }

    // Check geometric compatibility (with small tolerance for numerical precision)
    const expectedTrunnionInner = barrel.ro - interference;
    const tolerance = 1e-6;
    if (Math.abs(trunnion.ri - expectedTrunnionInner) > tolerance) {
        throw new Error(`Trunnion inner radius (${trunnion.ri}) must equal barrel outer radius minus interference (${expectedTrunnionInner})`);
    }

    // Handle zero interference case
    if (interference === 0) {
        return 0;
    }

    // Calculate compliance factors for plane strain conditions
    const ri_b2 = barrel.ri * barrel.ri;
    const ro_b2 = barrel.ro * barrel.ro;
    const ri_t2 = trunnion.ri * trunnion.ri;
    const ro_t2 = trunnion.ro * trunnion.ro;

    const C_barrel = (ro_b2 + ri_b2) / (barrel.E * (ro_b2 - ri_b2)) * (1 - barrel.nu * barrel.nu);
    const C_trunnion = (ro_t2 + ri_t2) / (trunnion.E * (ro_t2 - ri_t2)) * (1 - trunnion.nu * trunnion.nu);

    // Calculate contact pressure
    const p_contact = interference / (C_barrel + C_trunnion);

    return p_contact;
}

/**
 * Analyze compound cylinder system with both preload and operating pressure
 * 
 * @param {Object} params - Analysis parameters
 * @param {Object} params.barrel - Barrel properties {ri, ro, E, nu}
 * @param {Object} params.trunnion - Trunnion properties {ri, ro, E, nu}
 * @param {number} params.interference - Interference fit (mm)
 * @param {number} params.operatingPressure - Internal operating pressure (MPa)
 * @param {number} params.externalPressure - External pressure (MPa), defaults to 0
 * @param {Object} params.material - Material properties {Sy, Su}
 * @param {number} params.sigma_axial - Axial stress (MPa), defaults to 0
 * @returns {Object} Complete compound cylinder analysis results
 */
export function analyzeCompoundCylinder(params) {
    const {
        barrel,
        trunnion,
        interference,
        operatingPressure,
        externalPressure = 0,
        material,
        sigma_axial = 0
    } = params;

    try {
        // Calculate contact pressure from interference
        const p_contact = contactPressure(barrel, trunnion, interference);

        // Analyze preload stresses due to interference fit
        const preloadStresses = calculatePreloadStresses(barrel, trunnion, p_contact);

        // Analyze operating pressure stresses
        const operatingStresses = calculateOperatingStresses(barrel, trunnion, operatingPressure, externalPressure);

        // Superpose stresses
        const combinedStresses = superimposeStresses(preloadStresses, operatingStresses, barrel.ro);

        // Calculate Von Mises stresses and safety factors at critical locations
        const analysis = analyzeCriticalLocations(combinedStresses, material, sigma_axial);

        return {
            contactPressure: p_contact,
            preloadStresses,
            operatingStresses,
            combinedStresses,
            analysis,
            geometry: {
                barrel: { ri: barrel.ri, ro: barrel.ro },
                trunnion: { ri: trunnion.ri, ro: trunnion.ro },
                interference
            },
            loadings: {
                operatingPressure,
                externalPressure,
                contactPressure: p_contact
            }
        };
    } catch (error) {
        throw new Error(`Compound cylinder analysis failed: ${error.message}`);
    }
}

/**
 * Calculate preload stresses due to interference fit
 * 
 * @param {Object} barrel - Barrel properties
 * @param {Object} trunnion - Trunnion properties  
 * @param {number} p_contact - Contact pressure (MPa)
 * @returns {Object} Preload stress fields for both barrel and trunnion
 */
function calculatePreloadStresses(barrel, trunnion, p_contact) {
    // Barrel experiences external pressure at its outer surface
    const barrelCoeffs = lameCoefficients(barrel.ri, barrel.ro, 0, p_contact);
    
    // Trunnion experiences internal pressure at its inner surface
    const trunnionCoeffs = lameCoefficients(trunnion.ri, trunnion.ro, p_contact, 0);

    return {
        barrel: {
            coefficients: barrelCoeffs,
            getStresses: (r) => stresses(r, barrelCoeffs.A, barrelCoeffs.B)
        },
        trunnion: {
            coefficients: trunnionCoeffs,
            getStresses: (r) => stresses(r, trunnionCoeffs.A, trunnionCoeffs.B)
        }
    };
}

/**
 * Calculate operating pressure stresses
 * 
 * @param {Object} barrel - Barrel properties
 * @param {Object} trunnion - Trunnion properties
 * @param {number} operatingPressure - Internal pressure (MPa)
 * @param {number} externalPressure - External pressure (MPa)
 * @returns {Object} Operating stress fields
 */
function calculateOperatingStresses(barrel, trunnion, operatingPressure, externalPressure) {
    // For operating pressure, only the barrel sees internal pressure
    // The trunnion is not directly exposed to internal pressure
    const barrelCoeffs = lameCoefficients(barrel.ri, barrel.ro, operatingPressure, externalPressure);
    
    // Trunnion only sees external pressure (if any)
    const trunnionCoeffs = lameCoefficients(trunnion.ri, trunnion.ro, externalPressure, externalPressure);

    return {
        barrel: {
            coefficients: barrelCoeffs,
            getStresses: (r) => stresses(r, barrelCoeffs.A, barrelCoeffs.B)
        },
        trunnion: {
            coefficients: trunnionCoeffs,
            getStresses: (r) => stresses(r, trunnionCoeffs.A, trunnionCoeffs.B)
        }
    };
}

/**
 * Superimpose preload and operating stresses
 * 
 * @param {Object} preloadStresses - Preload stress fields
 * @param {Object} operatingStresses - Operating stress fields
 * @param {number} interfaceRadius - Radius at barrel/trunnion interface (mm)
 * @returns {Object} Combined stress fields
 */
function superimposeStresses(preloadStresses, operatingStresses, interfaceRadius) {
    return {
        barrel: {
            getStresses: (r) => {
                const preload = preloadStresses.barrel.getStresses(r);
                const operating = operatingStresses.barrel.getStresses(r);
                return {
                    sigma_r: preload.sigma_r + operating.sigma_r,
                    sigma_theta: preload.sigma_theta + operating.sigma_theta
                };
            }
        },
        trunnion: {
            getStresses: (r) => {
                const preload = preloadStresses.trunnion.getStresses(r);
                const operating = operatingStresses.trunnion.getStresses(r);
                return {
                    sigma_r: preload.sigma_r + operating.sigma_r,
                    sigma_theta: preload.sigma_theta + operating.sigma_theta
                };
            }
        },
        interfaceRadius
    };
}

/**
 * Analyze stresses and safety factors at critical locations
 * 
 * @param {Object} combinedStresses - Combined stress fields
 * @param {Object} material - Material properties {Sy, Su}
 * @param {number} sigma_axial - Axial stress (MPa)
 * @returns {Object} Analysis results at critical locations
 */
function analyzeCriticalLocations(combinedStresses, material, sigma_axial) {
    const { Sy, Su } = material;
    
    // Critical locations for analysis
    const locations = {
        barrelInner: combinedStresses.barrel.getStresses(combinedStresses.interfaceRadius * 0.999), // Just inside interface
        barrelInterface: combinedStresses.barrel.getStresses(combinedStresses.interfaceRadius),
        trunnionInterface: combinedStresses.trunnion.getStresses(combinedStresses.interfaceRadius),
        trunnionOuter: combinedStresses.trunnion.getStresses(combinedStresses.interfaceRadius * 1.5) // Representative outer location
    };

    const results = {};
    
    for (const [locationName, stressState] of Object.entries(locations)) {
        const sigma_vm = vonMises(stressState.sigma_r, stressState.sigma_theta, sigma_axial);
        const sf = safetyFactors(sigma_vm, Sy, Su);
        
        results[locationName] = {
            stresses: stressState,
            sigma_vm,
            safetyFactors: sf
        };
    }

    return results;
}

/**
 * Generate piecewise stress field data for visualization
 * 
 * @param {Object} combinedStresses - Combined stress fields
 * @param {Object} geometry - Geometry parameters
 * @param {number} numPointsPerRegion - Number of points per region, defaults to 50
 * @returns {Object} Stress field data separated by region
 */
export function generateCompoundStressField(combinedStresses, geometry, numPointsPerRegion = 50) {
    const { barrel, trunnion } = geometry;
    const { interfaceRadius } = combinedStresses;
    
    const barrelField = [];
    const trunnionField = [];
    
    // Generate barrel region (inner radius to interface)
    for (let i = 0; i < numPointsPerRegion; i++) {
        const r = barrel.ri + (interfaceRadius - barrel.ri) * i / (numPointsPerRegion - 1);
        const stressState = combinedStresses.barrel.getStresses(r);
        const sigma_vm = vonMises(stressState.sigma_r, stressState.sigma_theta);
        
        barrelField.push({
            r,
            ...stressState,
            sigma_vm,
            region: 'barrel'
        });
    }
    
    // Generate trunnion region (interface to outer radius)
    for (let i = 0; i < numPointsPerRegion; i++) {
        const r = interfaceRadius + (trunnion.ro - interfaceRadius) * i / (numPointsPerRegion - 1);
        const stressState = combinedStresses.trunnion.getStresses(r);
        const sigma_vm = vonMises(stressState.sigma_r, stressState.sigma_theta);
        
        trunnionField.push({
            r,
            ...stressState,
            sigma_vm,
            region: 'trunnion'
        });
    }
    
    return {
        barrel: barrelField,
        trunnion: trunnionField,
        combined: [...barrelField, ...trunnionField].sort((a, b) => a.r - b.r)
    };
}

/**
 * Validate compound cylinder geometry
 * 
 * @param {Object} barrel - Barrel properties
 * @param {Object} trunnion - Trunnion properties  
 * @param {number} interference - Interference fit (mm)
 * @returns {boolean} True if geometry is valid
 * @throws {Error} If geometry is invalid with detailed message
 */
export function validateGeometry(barrel, trunnion, interference) {
    // Basic dimensional checks
    if (barrel.ri <= 0) {
        throw new Error('Barrel inner radius must be positive');
    }
    if (barrel.ro <= barrel.ri) {
        throw new Error('Barrel outer radius must be greater than inner radius');
    }
    if (trunnion.ri <= 0) {
        throw new Error('Trunnion inner radius must be positive');
    }
    if (trunnion.ro <= trunnion.ri) {
        throw new Error('Trunnion outer radius must be greater than inner radius');
    }
    if (interference < 0) {
        throw new Error('Interference must be non-negative');
    }

    // Geometric compatibility
    const expectedTrunnionInner = barrel.ro - interference;
    const tolerance = 1e-6;
    if (Math.abs(trunnion.ri - expectedTrunnionInner) > tolerance) {
        throw new Error(`Geometry incompatible: trunnion inner radius (${trunnion.ri}) must equal barrel outer radius minus interference (${expectedTrunnionInner})`);
    }

    // Physical reasonableness checks
    const barrelThickness = barrel.ro - barrel.ri;
    const trunnionThickness = trunnion.ro - trunnion.ri;
    const maxReasonableInterference = Math.min(barrelThickness, trunnionThickness) * 0.01; // 1% of thickness

    if (interference > maxReasonableInterference) {
        console.warn(`Warning: Large interference (${interference} mm) relative to wall thickness. This may cause excessive stresses.`);
    }

    return true;
}
