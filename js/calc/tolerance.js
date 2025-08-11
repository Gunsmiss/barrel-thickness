/**
 * Tolerance and Worst-Case Analysis Module
 * Handles manufacturing tolerance calculations and worst-case scenarios
 * 
 * All calculations use SI base units internally:
 * - Lengths in mm
 * - Pressures in MPa
 * - Tolerances in μm (micrometers) for precision
 */

import { analyzeCircle } from './core.js';

// Cache for tolerance data to avoid repeated fetches
let toleranceData = null;

/**
 * Load tolerance data from JSON file
 * @returns {Promise<Object>} Tolerance data object
 */
async function loadToleranceData() {
    if (toleranceData === null) {
        try {
            const response = await fetch('./data/tolerances.json');
            if (!response.ok) {
                throw new Error(`Failed to load tolerance data: ${response.status}`);
            }
            toleranceData = await response.json();
        } catch (error) {
            console.error('Error loading tolerance data:', error);
            // Fallback to basic tolerance data
            toleranceData = getFallbackToleranceData();
        }
    }
    return toleranceData;
}

/**
 * Fallback tolerance data if JSON loading fails
 * @returns {Object} Basic tolerance data
 */
function getFallbackToleranceData() {
    return {
        iso286: {
            fits: {
                "H7/h6": {
                    description: "Precision running fit",
                    hole: { tolerance_factors: { "10": 15, "20": 26, "30": 36, "50": 50 } },
                    shaft: { tolerance_factors: { "10": 9, "20": 16, "30": 23, "50": 32 } }
                },
                "H8/h7": {
                    description: "Standard running fit",
                    hole: { tolerance_factors: { "10": 22, "20": 39, "30": 52, "50": 74 } },
                    shaft: { tolerance_factors: { "10": 15, "20": 26, "30": 36, "50": 50 } }
                }
            }
        },
        pressure_tolerance_factors: {
            factors: {
                precision: 0.02,
                commercial: 0.05,
                field_conditions: 0.10
            }
        }
    };
}

/**
 * Interpolate tolerance value for a given diameter
 * @param {Object} toleranceTable - Table of diameter->tolerance mappings
 * @param {number} diameter - Diameter in mm
 * @returns {number} Interpolated tolerance in μm
 */
function interpolateTolerance(toleranceTable, diameter) {
    const diameters = Object.keys(toleranceTable).map(Number).sort((a, b) => a - b);
    
    // If diameter is smaller than smallest entry, use first entry
    if (diameter <= diameters[0]) {
        return toleranceTable[diameters[0]];
    }
    
    // If diameter is larger than largest entry, use last entry
    if (diameter >= diameters[diameters.length - 1]) {
        return toleranceTable[diameters[diameters.length - 1]];
    }
    
    // Find the two diameters to interpolate between
    for (let i = 0; i < diameters.length - 1; i++) {
        const d1 = diameters[i];
        const d2 = diameters[i + 1];
        
        if (diameter >= d1 && diameter <= d2) {
            const t1 = toleranceTable[d1];
            const t2 = toleranceTable[d2];
            
            // Linear interpolation
            const ratio = (diameter - d1) / (d2 - d1);
            return t1 + ratio * (t2 - t1);
        }
    }
    
    // Fallback (should never reach here)
    return toleranceTable[diameters[0]];
}

/**
 * Get ISO 286 tolerances for given fit and diameters
 * @param {string} fitClass - Fit class (e.g., "H7/h6", "H8/h7")
 * @param {number} innerDiameter - Inner diameter in mm
 * @param {number} outerDiameter - Outer diameter in mm
 * @returns {Promise<Object>} Tolerance values in μm
 */
export async function getISO286Tolerances(fitClass, innerDiameter, outerDiameter) {
    const data = await loadToleranceData();
    
    if (!data.iso286.fits[fitClass]) {
        throw new Error(`Unknown ISO 286 fit class: ${fitClass}`);
    }
    
    const fit = data.iso286.fits[fitClass];
    
    // Get hole (bore) tolerance
    const boreTolerance = interpolateTolerance(fit.hole.tolerance_factors, innerDiameter);
    
    // Get shaft (outer) tolerance  
    const shaftTolerance = interpolateTolerance(fit.shaft.tolerance_factors, outerDiameter);
    
    return {
        bore: {
            tolerance: boreTolerance,
            upper: +boreTolerance / 2,  // ±tolerance/2 for hole
            lower: -boreTolerance / 2
        },
        shaft: {
            tolerance: shaftTolerance,
            upper: +shaftTolerance / 2,  // ±tolerance/2 for shaft
            lower: -shaftTolerance / 2
        },
        fitClass,
        description: fit.description
    };
}

/**
 * Get ANSI B4.2 tolerances for given fit and diameters
 * @param {string} fitClass - Fit class (e.g., "RC4", "RC5", "LC2")
 * @param {number} innerDiameter - Inner diameter in mm
 * @param {number} outerDiameter - Outer diameter in mm
 * @returns {Promise<Object>} Tolerance values in μm
 */
export async function getANSIB42Tolerances(fitClass, innerDiameter, outerDiameter) {
    const data = await loadToleranceData();
    
    if (!data.ansi_b42.fits[fitClass]) {
        throw new Error(`Unknown ANSI B4.2 fit class: ${fitClass}`);
    }
    
    const fit = data.ansi_b42.fits[fitClass];
    
    // Convert mm to inches for ANSI lookup (approximate)
    const innerDiameterInch = innerDiameter / 25.4;
    const outerDiameterInch = outerDiameter / 25.4;
    
    // Get tolerances in thousandths of an inch, then convert to μm
    const boreTolerance = interpolateTolerance(fit.hole.tolerance_factors, innerDiameterInch) * 25.4;
    const shaftTolerance = interpolateTolerance(fit.shaft.tolerance_factors, outerDiameterInch) * 25.4;
    
    // Get clearance allowances if available
    const clearanceAllowance = fit.hole.clearance_factors ? 
        interpolateTolerance(fit.hole.clearance_factors, innerDiameterInch) * 25.4 : 0;
    
    return {
        bore: {
            tolerance: boreTolerance,
            upper: +boreTolerance / 2,
            lower: -boreTolerance / 2
        },
        shaft: {
            tolerance: shaftTolerance,
            upper: +shaftTolerance / 2,
            lower: -shaftTolerance / 2
        },
        clearanceAllowance,
        fitClass,
        description: fit.description
    };
}

/**
 * Get custom tolerances from user input
 * @param {Object} customTolerances - Custom tolerance specifications
 * @param {number} customTolerances.bore_plus - Bore positive tolerance in μm
 * @param {number} customTolerances.bore_minus - Bore negative tolerance in μm
 * @param {number} customTolerances.shaft_plus - Shaft positive tolerance in μm
 * @param {number} customTolerances.shaft_minus - Shaft negative tolerance in μm
 * @returns {Object} Formatted tolerance values
 */
export function getCustomTolerances(customTolerances) {
    const { bore_plus = 0, bore_minus = 0, shaft_plus = 0, shaft_minus = 0 } = customTolerances;
    
    return {
        bore: {
            tolerance: Math.abs(bore_plus) + Math.abs(bore_minus),
            upper: bore_plus,
            lower: -Math.abs(bore_minus)
        },
        shaft: {
            tolerance: Math.abs(shaft_plus) + Math.abs(shaft_minus),
            upper: shaft_plus,
            lower: -Math.abs(shaft_minus)
        },
        fitClass: 'custom',
        description: 'User-defined tolerances'
    };
}

/**
 * Calculate worst-case dimensions for maximum stress
 * @param {number} nominalInnerRadius - Nominal inner radius in mm
 * @param {number} nominalOuterRadius - Nominal outer radius in mm
 * @param {Object} tolerances - Tolerance specifications
 * @returns {Object} Worst-case dimensions
 */
export function calculateWorstCaseDimensions(nominalInnerRadius, nominalOuterRadius, tolerances) {
    // Convert tolerances from μm to mm
    const boreUpperTol = tolerances.bore.upper / 1000;
    const boreLowerTol = tolerances.bore.lower / 1000;
    const shaftUpperTol = tolerances.shaft.upper / 1000;
    const shaftLowerTol = tolerances.shaft.lower / 1000;
    
    // For maximum hoop stress, we want:
    // - Maximum inner radius (largest bore)
    // - Minimum outer radius (smallest shaft)
    const worstCaseInnerRadius = nominalInnerRadius + boreUpperTol;
    const worstCaseOuterRadius = nominalOuterRadius + shaftLowerTol;
    
    // Calculate best-case (minimum stress) for comparison
    const bestCaseInnerRadius = nominalInnerRadius + boreLowerTol;
    const bestCaseOuterRadius = nominalOuterRadius + shaftUpperTol;
    
    // Validate that worst-case dimensions are physically possible
    if (worstCaseInnerRadius >= worstCaseOuterRadius) {
        throw new Error('Worst-case tolerances result in negative wall thickness');
    }
    
    return {
        worstCase: {
            innerRadius: worstCaseInnerRadius,
            outerRadius: worstCaseOuterRadius,
            wallThickness: worstCaseOuterRadius - worstCaseInnerRadius
        },
        bestCase: {
            innerRadius: bestCaseInnerRadius,
            outerRadius: bestCaseOuterRadius,
            wallThickness: bestCaseOuterRadius - bestCaseInnerRadius
        },
        nominal: {
            innerRadius: nominalInnerRadius,
            outerRadius: nominalOuterRadius,
            wallThickness: nominalOuterRadius - nominalInnerRadius
        },
        wallThicknessVariation: {
            min: worstCaseOuterRadius - worstCaseInnerRadius,
            max: bestCaseOuterRadius - bestCaseInnerRadius,
            nominal: nominalOuterRadius - nominalInnerRadius
        }
    };
}

/**
 * Apply pressure tolerance to nominal pressure
 * @param {number} nominalPressure - Nominal pressure in MPa
 * @param {string} toleranceLevel - Tolerance level ("precision", "commercial", etc.)
 * @returns {Promise<Object>} Pressure variations
 */
export async function applyPressureTolerance(nominalPressure, toleranceLevel = 'commercial') {
    const data = await loadToleranceData();
    
    const toleranceFactor = data.pressure_tolerance_factors.factors[toleranceLevel] || 0.05;
    const pressureVariation = nominalPressure * toleranceFactor;
    
    return {
        nominal: nominalPressure,
        tolerance: toleranceFactor,
        worstCase: nominalPressure + pressureVariation,  // Higher pressure = worst case
        bestCase: nominalPressure - pressureVariation,
        variation: pressureVariation
    };
}

/**
 * Perform complete worst-case analysis
 * @param {Object} params - Analysis parameters
 * @param {number} params.nominalInnerRadius - Nominal inner radius in mm
 * @param {number} params.nominalOuterRadius - Nominal outer radius in mm
 * @param {number} params.nominalPressure - Nominal pressure in MPa
 * @param {string} params.toleranceClass - Tolerance class or "custom"
 * @param {Object} params.customTolerances - Custom tolerance values (if toleranceClass is "custom")
 * @param {string} params.toleranceStandard - "iso286" or "ansi_b42"
 * @param {string} params.pressureToleranceLevel - Pressure tolerance level
 * @param {number} params.yieldStrength - Material yield strength in MPa
 * @param {number} params.ultimateStrength - Material ultimate strength in MPa
 * @param {number} params.externalPressure - External pressure in MPa (default 0)
 * @param {number} params.axialStress - Axial stress in MPa (default 0)
 * @returns {Promise<Object>} Complete worst-case analysis results
 */
export async function performWorstCaseAnalysis(params) {
    const {
        nominalInnerRadius,
        nominalOuterRadius,
        nominalPressure,
        toleranceClass,
        customTolerances = {},
        toleranceStandard = 'iso286',
        pressureToleranceLevel = 'commercial',
        yieldStrength,
        ultimateStrength,
        externalPressure = 0,
        axialStress = 0
    } = params;
    
    try {
        // Get dimensional tolerances
        let tolerances;
        if (toleranceClass === 'custom') {
            tolerances = getCustomTolerances(customTolerances);
        } else if (toleranceStandard === 'iso286') {
            tolerances = await getISO286Tolerances(toleranceClass, nominalInnerRadius * 2, nominalOuterRadius * 2);
        } else if (toleranceStandard === 'ansi_b42') {
            tolerances = await getANSIB42Tolerances(toleranceClass, nominalInnerRadius * 2, nominalOuterRadius * 2);
        } else {
            throw new Error(`Unknown tolerance standard: ${toleranceStandard}`);
        }
        
        // Calculate worst-case dimensions
        const dimensions = calculateWorstCaseDimensions(nominalInnerRadius, nominalOuterRadius, tolerances);
        
        // Apply pressure tolerance
        const pressureVariations = await applyPressureTolerance(nominalPressure, pressureToleranceLevel);
        
        // Perform analyses for different scenarios
        const nominalAnalysis = analyzeCircle({
            ri: dimensions.nominal.innerRadius,
            ro: dimensions.nominal.outerRadius,
            p_i: pressureVariations.nominal,
            p_o: externalPressure,
            Sy: yieldStrength,
            Su: ultimateStrength,
            sigma_axial: axialStress
        });
        
        const worstCaseAnalysis = analyzeCircle({
            ri: dimensions.worstCase.innerRadius,
            ro: dimensions.worstCase.outerRadius,
            p_i: pressureVariations.worstCase,
            p_o: externalPressure,
            Sy: yieldStrength,
            Su: ultimateStrength,
            sigma_axial: axialStress
        });
        
        const bestCaseAnalysis = analyzeCircle({
            ri: dimensions.bestCase.innerRadius,
            ro: dimensions.bestCase.outerRadius,
            p_i: pressureVariations.bestCase,
            p_o: externalPressure,
            Sy: yieldStrength,
            Su: ultimateStrength,
            sigma_axial: axialStress
        });
        
        // Calculate safety factor margins
        const safetyFactorMargin = {
            yield: worstCaseAnalysis.safetyFactors.SF_y / nominalAnalysis.safetyFactors.SF_y,
            ultimate: worstCaseAnalysis.safetyFactors.SF_u / nominalAnalysis.safetyFactors.SF_u
        };
        
        return {
            tolerances,
            dimensions,
            pressureVariations,
            analyses: {
                nominal: nominalAnalysis,
                worstCase: worstCaseAnalysis,
                bestCase: bestCaseAnalysis
            },
            safetyFactorMargin,
            summary: {
                worstCaseSafetyFactor: worstCaseAnalysis.safetyFactors.SF_y,
                nominalSafetyFactor: nominalAnalysis.safetyFactors.SF_y,
                safetyMargin: safetyFactorMargin.yield,
                wallThicknessReduction: ((dimensions.nominal.wallThickness - dimensions.worstCase.wallThickness) / dimensions.nominal.wallThickness) * 100,
                pressureIncrease: ((pressureVariations.worstCase - pressureVariations.nominal) / pressureVariations.nominal) * 100
            }
        };
        
    } catch (error) {
        throw new Error(`Worst-case analysis failed: ${error.message}`);
    }
}

/**
 * Get available tolerance classes for a given standard
 * @param {string} standard - "iso286" or "ansi_b42"
 * @returns {Promise<Array>} Array of available tolerance classes
 */
export async function getAvailableToleranceClasses(standard = 'iso286') {
    const data = await loadToleranceData();
    
    if (standard === 'iso286') {
        return Object.keys(data.iso286.fits).map(key => ({
            value: key,
            label: `${key} - ${data.iso286.fits[key].description}`
        }));
    } else if (standard === 'ansi_b42') {
        return Object.keys(data.ansi_b42.fits).map(key => ({
            value: key,
            label: `${key} - ${data.ansi_b42.fits[key].description}`
        }));
    } else {
        throw new Error(`Unknown tolerance standard: ${standard}`);
    }
}

/**
 * Validate tolerance input parameters
 * @param {Object} params - Parameters to validate
 * @returns {Object} Validation result
 */
export function validateToleranceParams(params) {
    const errors = [];
    
    if (params.nominalInnerRadius <= 0) {
        errors.push('Inner radius must be positive');
    }
    
    if (params.nominalOuterRadius <= params.nominalInnerRadius) {
        errors.push('Outer radius must be greater than inner radius');
    }
    
    if (params.nominalPressure < 0) {
        errors.push('Pressure must be non-negative');
    }
    
    if (params.yieldStrength <= 0) {
        errors.push('Yield strength must be positive');
    }
    
    if (params.ultimateStrength < params.yieldStrength) {
        errors.push('Ultimate strength must be greater than or equal to yield strength');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}
