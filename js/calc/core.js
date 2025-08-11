/**
 * Core Calculation Engine for Thick-Walled Cylinder Analysis
 * Implements Lamé equations for gunsmith barrel safety calculations
 * 
 * All calculations use SI base units internally:
 * - Lengths in mm
 * - Pressures in MPa
 * - Stresses in MPa
 */

/**
 * Calculate Lamé equation coefficients for thick-walled cylinder
 * 
 * For a thick-walled cylinder with internal pressure p_i and external pressure p_o:
 * σ_r = A - B/r²
 * σ_θ = A + B/r²
 * 
 * Where:
 * A = (p_i * ri² - p_o * ro²) / (ro² - ri²)
 * B = (p_i - p_o) * ri² * ro² / (ro² - ri²)
 * 
 * @param {number} ri - Inner radius (mm)
 * @param {number} ro - Outer radius (mm) 
 * @param {number} p_i - Internal pressure (MPa)
 * @param {number} p_o - External pressure (MPa), defaults to 0
 * @returns {Object} {A, B} - Lamé coefficients
 * @throws {Error} If geometry constraints violated
 */
export function lameCoefficients(ri, ro, p_i, p_o = 0) {
    // Input validation
    if (ri <= 0) {
        throw new Error('Inner radius must be positive');
    }
    if (ro <= ri) {
        throw new Error('Outer radius must be greater than inner radius');
    }
    if (p_i < 0 || p_o < 0) {
        throw new Error('Pressures must be non-negative');
    }

    // Calculate geometry terms
    const ri2 = ri * ri;
    const ro2 = ro * ro;
    const deltaR2 = ro2 - ri2;

    // Calculate Lamé coefficients
    const A = (p_i * ri2 - p_o * ro2) / deltaR2;
    const B = (p_i - p_o) * ri2 * ro2 / deltaR2;

    return { A, B };
}

/**
 * Calculate stresses at a given radius using Lamé equations
 * 
 * @param {number} r - Radius at which to calculate stresses (mm)
 * @param {number} A - Lamé coefficient A
 * @param {number} B - Lamé coefficient B
 * @returns {Object} {sigma_r, sigma_theta} - Radial and hoop stresses (MPa)
 * @throws {Error} If radius is invalid
 */
export function stresses(r, A, B) {
    if (r <= 0) {
        throw new Error('Radius must be positive');
    }

    const r2 = r * r;
    const sigma_r = A - B / r2;
    const sigma_theta = A + B / r2;

    return { sigma_r, sigma_theta };
}

/**
 * Calculate Von Mises equivalent stress
 * 
 * For plane stress conditions (σ_z = 0):
 * σ_vm = √(σ_θ² + σ_r² - σ_θ*σ_r)
 * 
 * For general 3D case:
 * σ_vm = √(σ_θ² + σ_r² + σ_z² - σ_θ*σ_r - σ_θ*σ_z - σ_r*σ_z)
 * 
 * @param {number} sigma_r - Radial stress (MPa)
 * @param {number} sigma_theta - Hoop stress (MPa)
 * @param {number} sigma_axial - Axial stress (MPa), defaults to 0
 * @returns {number} Von Mises equivalent stress (MPa)
 */
export function vonMises(sigma_r, sigma_theta, sigma_axial = 0) {
    // Von Mises stress calculation
    const term1 = sigma_theta * sigma_theta;
    const term2 = sigma_r * sigma_r;
    const term3 = sigma_axial * sigma_axial;
    const term4 = sigma_theta * sigma_r;
    const term5 = sigma_theta * sigma_axial;
    const term6 = sigma_r * sigma_axial;

    const sigma_vm = Math.sqrt(term1 + term2 + term3 - term4 - term5 - term6);
    
    return sigma_vm;
}

/**
 * Calculate safety factors based on Von Mises stress
 * 
 * @param {number} sigma_vm - Von Mises equivalent stress (MPa)
 * @param {number} Sy - Yield strength (MPa)
 * @param {number} Su - Ultimate tensile strength (MPa)
 * @returns {Object} {SF_y, SF_u} - Safety factors against yield and ultimate
 * @throws {Error} If material properties are invalid
 */
export function safetyFactors(sigma_vm, Sy, Su) {
    if (Sy <= 0 || Su <= 0) {
        throw new Error('Material strengths must be positive');
    }
    if (Su < Sy) {
        throw new Error('Ultimate strength must be greater than or equal to yield strength');
    }
    if (sigma_vm < 0) {
        throw new Error('Von Mises stress must be non-negative');
    }

    // Handle case where stress is zero (infinite safety factor)
    if (sigma_vm === 0) {
        return { SF_y: Infinity, SF_u: Infinity };
    }

    const SF_y = Sy / sigma_vm;
    const SF_u = Su / sigma_vm;

    return { SF_y, SF_u };
}

/**
 * Estimate burst pressure using yield criterion at inner surface
 * Uses bisection method to solve for pressure where σ_vm(ri) = Sy
 * 
 * @param {number} ri - Inner radius (mm)
 * @param {number} ro - Outer radius (mm)
 * @param {number} Sy - Yield strength (MPa)
 * @param {number} p_o - External pressure (MPa), defaults to 0
 * @param {Object} options - Solver options
 * @param {number} options.maxIters - Maximum iterations, defaults to 100
 * @param {number} options.tolerance - Convergence tolerance, defaults to 1e-9
 * @returns {number} Estimated burst pressure (MPa)
 * @throws {Error} If convergence fails or inputs invalid
 */
export function burstPressureEstimate(ri, ro, Sy, p_o = 0, options = {}) {
    const { maxIters = 100, tolerance = 1e-9 } = options;

    // Input validation
    if (ri <= 0) {
        throw new Error('Inner radius must be positive');
    }
    if (ro <= ri) {
        throw new Error('Outer radius must be greater than inner radius');
    }
    if (Sy <= 0) {
        throw new Error('Yield strength must be positive');
    }

    // Objective function: Von Mises stress at inner radius minus yield strength
    function objective(p_i) {
        try {
            const { A, B } = lameCoefficients(ri, ro, p_i, p_o);
            const { sigma_r, sigma_theta } = stresses(ri, A, B);
            const sigma_vm = vonMises(sigma_r, sigma_theta);
            return sigma_vm - Sy;
        } catch (error) {
            return NaN;
        }
    }

    // Initial bounds for bisection
    let p_low = 0;
    let p_high = 10 * Sy; // Conservative upper bound

    // Ensure we bracket the root
    let f_low = objective(p_low);
    let f_high = objective(p_high);

    // Expand upper bound if necessary
    let expansions = 0;
    while (f_high < 0 && expansions < 20) {
        p_high *= 2;
        f_high = objective(p_high);
        expansions++;
    }

    if (f_high < 0) {
        throw new Error('Could not find upper bound for burst pressure');
    }

    // Bisection method
    for (let iter = 0; iter < maxIters; iter++) {
        const p_mid = (p_low + p_high) / 2;
        const f_mid = objective(p_mid);

        if (isNaN(f_mid)) {
            throw new Error('Numerical error in burst pressure calculation');
        }

        // Check convergence
        if (Math.abs(f_mid) < tolerance || (p_high - p_low) < tolerance) {
            return p_mid;
        }

        // Update bounds
        if (f_mid * f_low < 0) {
            p_high = p_mid;
            f_high = f_mid;
        } else {
            p_low = p_mid;
            f_low = f_mid;
        }
    }

    throw new Error(`Burst pressure calculation failed to converge after ${maxIters} iterations`);
}

/**
 * Complete cylinder analysis for given parameters
 * 
 * @param {Object} params - Calculation parameters
 * @param {number} params.ri - Inner radius (mm)
 * @param {number} params.ro - Outer radius (mm)
 * @param {number} params.p_i - Internal pressure (MPa)
 * @param {number} params.p_o - External pressure (MPa), defaults to 0
 * @param {number} params.Sy - Yield strength (MPa)
 * @param {number} params.Su - Ultimate tensile strength (MPa)
 * @param {number} params.sigma_axial - Axial stress (MPa), defaults to 0
 * @returns {Object} Complete analysis results
 */
export function analyzeCircle(params) {
    const { ri, ro, p_i, p_o = 0, Sy, Su, sigma_axial = 0 } = params;

    try {
        // Calculate Lamé coefficients
        const { A, B } = lameCoefficients(ri, ro, p_i, p_o);

        // Calculate stresses at inner radius (worst case)
        const stressesInner = stresses(ri, A, B);
        const sigma_vm_inner = vonMises(stressesInner.sigma_r, stressesInner.sigma_theta, sigma_axial);

        // Calculate stresses at outer radius
        const stressesOuter = stresses(ro, A, B);
        const sigma_vm_outer = vonMises(stressesOuter.sigma_r, stressesOuter.sigma_theta, sigma_axial);

        // Calculate safety factors at worst case location
        const safetyFactorsResult = safetyFactors(sigma_vm_inner, Sy, Su);

        // Estimate burst pressure
        const burstPressure = burstPressureEstimate(ri, ro, Sy, p_o);

        return {
            lameCoefficients: { A, B },
            stresses: {
                inner: {
                    ...stressesInner,
                    sigma_vm: sigma_vm_inner
                },
                outer: {
                    ...stressesOuter,
                    sigma_vm: sigma_vm_outer
                }
            },
            safetyFactors: safetyFactorsResult,
            burstPressure,
            geometry: { ri, ro, p_i, p_o },
            material: { Sy, Su }
        };
    } catch (error) {
        throw new Error(`Analysis failed: ${error.message}`);
    }
}

/**
 * Generate stress field data for visualization
 * 
 * @param {number} ri - Inner radius (mm)
 * @param {number} ro - Outer radius (mm)
 * @param {number} A - Lamé coefficient A
 * @param {number} B - Lamé coefficient B
 * @param {number} numPoints - Number of points to sample, defaults to 100
 * @returns {Array} Array of {r, sigma_r, sigma_theta, sigma_vm} objects
 */
export function generateStressField(ri, ro, A, B, numPoints = 100) {
    const results = [];
    
    for (let i = 0; i < numPoints; i++) {
        const r = ri + (ro - ri) * i / (numPoints - 1);
        const { sigma_r, sigma_theta } = stresses(r, A, B);
        const sigma_vm = vonMises(sigma_r, sigma_theta);
        
        results.push({
            r,
            sigma_r,
            sigma_theta,
            sigma_vm
        });
    }
    
    return results;
}
