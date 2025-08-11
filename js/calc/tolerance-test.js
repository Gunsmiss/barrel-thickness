/**
 * Unit tests for tolerance.js module
 * Tests tolerance lookup, worst-case calculations, and edge cases
 */

import {
    getISO286Tolerances,
    getANSIB42Tolerances,
    getCustomTolerances,
    calculateWorstCaseDimensions,
    applyPressureTolerance,
    performWorstCaseAnalysis,
    getAvailableToleranceClasses,
    validateToleranceParams
} from './tolerance.js';

// Test utilities
function assertAlmostEqual(actual, expected, tolerance = 1e-6, message = '') {
    const diff = Math.abs(actual - expected);
    if (diff > tolerance) {
        throw new Error(`${message}: Expected ${expected}, got ${actual} (difference: ${diff})`);
    }
}

function assertEqual(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message}: Expected ${expected}, got ${actual}`);
    }
}

function assertThrows(fn, expectedError = null, message = '') {
    try {
        fn();
        throw new Error(`${message}: Expected function to throw an error, but it didn't`);
    } catch (error) {
        if (expectedError && !error.message.includes(expectedError)) {
            throw new Error(`${message}: Expected error containing "${expectedError}", got "${error.message}"`);
        }
    }
}

// Test suite
const tests = [];

// Test 1: ISO 286 tolerance lookup
tests.push({
    name: 'ISO 286 H7/h6 tolerance lookup',
    test: async () => {
        const tolerances = await getISO286Tolerances('H7/h6', 10, 20);
        
        assertEqual(tolerances.fitClass, 'H7/h6', 'Fit class should match input');
        
        // Verify that tolerances are reasonable (positive numbers)
        if (tolerances.bore.tolerance <= 0) {
            throw new Error('Bore tolerance should be positive');
        }
        if (tolerances.shaft.tolerance <= 0) {
            throw new Error('Shaft tolerance should be positive');
        }
        
        // Verify symmetric tolerances for H/h fits
        assertAlmostEqual(Math.abs(tolerances.bore.upper), Math.abs(tolerances.bore.lower), 1e-3, 'Bore tolerance should be symmetric');
        assertAlmostEqual(Math.abs(tolerances.shaft.upper), Math.abs(tolerances.shaft.lower), 1e-3, 'Shaft tolerance should be symmetric');
    }
});

// Test 2: Custom tolerance specification
tests.push({
    name: 'Custom tolerance specification',
    test: () => {
        const customTols = {
            bore_plus: 10,   // +10 μm
            bore_minus: 5,   // -5 μm
            shaft_plus: 8,   // +8 μm
            shaft_minus: 12  // -12 μm
        };
        
        const tolerances = getCustomTolerances(customTols);
        
        assertEqual(tolerances.fitClass, 'custom', 'Should be custom fit class');
        assertEqual(tolerances.bore.upper, 10, 'Bore upper tolerance');
        assertEqual(tolerances.bore.lower, -5, 'Bore lower tolerance');
        assertEqual(tolerances.shaft.upper, 8, 'Shaft upper tolerance');
        assertEqual(tolerances.shaft.lower, -12, 'Shaft lower tolerance');
        assertEqual(tolerances.bore.tolerance, 15, 'Total bore tolerance');
        assertEqual(tolerances.shaft.tolerance, 20, 'Total shaft tolerance');
    }
});

// Test 3: Worst-case dimension calculation
tests.push({
    name: 'Worst-case dimension calculation',
    test: () => {
        const nominalInnerRadius = 5.0; // mm
        const nominalOuterRadius = 10.0; // mm
        
        const tolerances = {
            bore: { upper: 10, lower: -5 }, // μm
            shaft: { upper: 8, lower: -12 }  // μm
        };
        
        const dimensions = calculateWorstCaseDimensions(nominalInnerRadius, nominalOuterRadius, tolerances);
        
        // Worst case: maximum inner radius, minimum outer radius
        assertAlmostEqual(dimensions.worstCase.innerRadius, 5.010, 1e-6, 'Worst-case inner radius');
        assertAlmostEqual(dimensions.worstCase.outerRadius, 9.988, 1e-6, 'Worst-case outer radius');
        
        // Best case: minimum inner radius, maximum outer radius
        assertAlmostEqual(dimensions.bestCase.innerRadius, 4.995, 1e-6, 'Best-case inner radius');
        assertAlmostEqual(dimensions.bestCase.outerRadius, 10.008, 1e-6, 'Best-case outer radius');
        
        // Check wall thickness calculations
        assertAlmostEqual(dimensions.worstCase.wallThickness, 4.978, 1e-6, 'Worst-case wall thickness');
        assertAlmostEqual(dimensions.bestCase.wallThickness, 5.013, 1e-6, 'Best-case wall thickness');
    }
});

// Test 4: Pressure tolerance application
tests.push({
    name: 'Pressure tolerance application',
    test: async () => {
        const nominalPressure = 400; // MPa
        const pressureVariations = await applyPressureTolerance(nominalPressure, 'commercial');
        
        assertEqual(pressureVariations.nominal, 400, 'Nominal pressure should be unchanged');
        assertEqual(pressureVariations.tolerance, 0.05, 'Commercial tolerance should be 5%');
        assertEqual(pressureVariations.worstCase, 420, 'Worst-case pressure should be 5% higher');
        assertEqual(pressureVariations.bestCase, 380, 'Best-case pressure should be 5% lower');
        assertEqual(pressureVariations.variation, 20, 'Pressure variation should be 20 MPa');
    }
});

// Test 5: Complete worst-case analysis
tests.push({
    name: 'Complete worst-case analysis',
    test: async () => {
        const params = {
            nominalInnerRadius: 5.0,    // mm
            nominalOuterRadius: 10.0,   // mm
            nominalPressure: 400,       // MPa
            toleranceClass: 'H8/h7',
            toleranceStandard: 'iso286',
            pressureToleranceLevel: 'commercial',
            yieldStrength: 850,         // MPa
            ultimateStrength: 1000,     // MPa
            externalPressure: 0,
            axialStress: 0
        };
        
        const analysis = await performWorstCaseAnalysis(params);
        
        // Verify structure
        if (!analysis.tolerances) throw new Error('Missing tolerances');
        if (!analysis.dimensions) throw new Error('Missing dimensions');
        if (!analysis.pressureVariations) throw new Error('Missing pressure variations');
        if (!analysis.analyses) throw new Error('Missing analyses');
        if (!analysis.summary) throw new Error('Missing summary');
        
        // Verify that worst-case safety factor is lower than nominal
        if (analysis.summary.worstCaseSafetyFactor >= analysis.summary.nominalSafetyFactor) {
            throw new Error('Worst-case safety factor should be lower than nominal');
        }
        
        // Verify that safety margin is less than 1.0 (meaning degradation)
        if (analysis.summary.safetyMargin >= 1.0) {
            throw new Error('Safety margin should be less than 1.0 for worst-case');
        }
        
        // Verify analyses exist for all cases
        if (!analysis.analyses.nominal) throw new Error('Missing nominal analysis');
        if (!analysis.analyses.worstCase) throw new Error('Missing worst-case analysis');
        if (!analysis.analyses.bestCase) throw new Error('Missing best-case analysis');
    }
});

// Test 6: Invalid tolerance class
tests.push({
    name: 'Invalid tolerance class handling',
    test: async () => {
        await assertThrows(
            async () => await getISO286Tolerances('INVALID/CLASS', 10, 20),
            'Unknown ISO 286 fit class',
            'Should throw error for invalid fit class'
        );
    }
});

// Test 7: Tolerance resulting in negative wall thickness
tests.push({
    name: 'Negative wall thickness detection',
    test: () => {
        const nominalInnerRadius = 5.0;
        const nominalOuterRadius = 5.1; // Very thin wall
        
        const extremeTolerances = {
            bore: { upper: 200, lower: -100 },  // Large bore tolerance
            shaft: { upper: 50, lower: -200 }   // Large negative shaft tolerance
        };
        
        assertThrows(
            () => calculateWorstCaseDimensions(nominalInnerRadius, nominalOuterRadius, extremeTolerances),
            'negative wall thickness',
            'Should detect negative wall thickness'
        );
    }
});

// Test 8: Parameter validation
tests.push({
    name: 'Parameter validation',
    test: () => {
        // Test valid parameters
        const validParams = {
            nominalInnerRadius: 5.0,
            nominalOuterRadius: 10.0,
            nominalPressure: 400,
            yieldStrength: 850,
            ultimateStrength: 1000
        };
        
        const validResult = validateToleranceParams(validParams);
        assertEqual(validResult.isValid, true, 'Valid parameters should pass');
        assertEqual(validResult.errors.length, 0, 'Valid parameters should have no errors');
        
        // Test invalid parameters
        const invalidParams = {
            nominalInnerRadius: -1,     // Invalid: negative
            nominalOuterRadius: 4,      // Invalid: less than inner radius
            nominalPressure: -100,      // Invalid: negative
            yieldStrength: -500,        // Invalid: negative
            ultimateStrength: 800       // Invalid: less than yield strength
        };
        
        const invalidResult = validateToleranceParams(invalidParams);
        assertEqual(invalidResult.isValid, false, 'Invalid parameters should fail');
        if (invalidResult.errors.length === 0) {
            throw new Error('Invalid parameters should have errors');
        }
    }
});

// Test 9: Available tolerance classes retrieval
tests.push({
    name: 'Available tolerance classes retrieval',
    test: async () => {
        const iso286Classes = await getAvailableToleranceClasses('iso286');
        const ansiClasses = await getAvailableToleranceClasses('ansi_b42');
        
        if (!Array.isArray(iso286Classes) || iso286Classes.length === 0) {
            throw new Error('Should return array of ISO 286 classes');
        }
        
        if (!Array.isArray(ansiClasses) || ansiClasses.length === 0) {
            throw new Error('Should return array of ANSI B4.2 classes');
        }
        
        // Check structure of returned objects
        const firstIso = iso286Classes[0];
        if (!firstIso.value || !firstIso.label) {
            throw new Error('ISO tolerance class should have value and label');
        }
        
        const firstAnsi = ansiClasses[0];
        if (!firstAnsi.value || !firstAnsi.label) {
            throw new Error('ANSI tolerance class should have value and label');
        }
    }
});

// Test 10: Interpolation edge cases
tests.push({
    name: 'Tolerance interpolation edge cases',
    test: async () => {
        // Test with very small diameter (should use smallest table entry)
        const smallDiameterTol = await getISO286Tolerances('H7/h6', 1, 2);
        if (!smallDiameterTol.bore.tolerance || !smallDiameterTol.shaft.tolerance) {
            throw new Error('Should handle small diameters');
        }
        
        // Test with very large diameter (should use largest table entry)
        const largeDiameterTol = await getISO286Tolerances('H7/h6', 100, 200);
        if (!largeDiameterTol.bore.tolerance || !largeDiameterTol.shaft.tolerance) {
            throw new Error('Should handle large diameters');
        }
        
        // Verify that larger diameters generally have larger tolerances
        if (largeDiameterTol.bore.tolerance < smallDiameterTol.bore.tolerance) {
            console.warn('Warning: Larger diameter has smaller tolerance than smaller diameter');
        }
    }
});

/**
 * Run all tolerance module tests
 * @returns {Promise<Object>} Test results
 */
export async function runToleranceTests() {
    const results = {
        passed: 0,
        failed: 0,
        errors: []
    };
    
    console.log('Running tolerance module tests...');
    
    for (const test of tests) {
        try {
            console.log(`Running: ${test.name}`);
            await test.test();
            results.passed++;
            console.log(`✅ ${test.name}`);
        } catch (error) {
            results.failed++;
            results.errors.push({
                test: test.name,
                error: error.message
            });
            console.error(`❌ ${test.name}: ${error.message}`);
        }
    }
    
    console.log(`\nTolerance Tests Summary:`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📊 Total: ${tests.length}`);
    
    if (results.failed > 0) {
        console.log('\nFailures:');
        results.errors.forEach(err => {
            console.log(`  - ${err.test}: ${err.error}`);
        });
    }
    
    return results;
}

// Export test runner for manual execution
if (typeof window !== 'undefined') {
    window.runToleranceTests = runToleranceTests;
}
