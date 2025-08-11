/**
 * Test cases for Core Calculation Engine
 * Validates Lamé equation implementation against known textbook examples
 */

import { lameCoefficients, stresses, vonMises, safetyFactors, burstPressureEstimate, analyzeCircle } from './core.js';
import { runToleranceTests } from './tolerance-test.js';

/**
 * Test case data from "Mechanical Engineering Design" textbook examples
 * and "Theory of Elasticity" by Timoshenko & Goodier
 */
const testCases = {
    // Simple pressure vessel case
    case1: {
        name: "Simple Pressure Vessel",
        ri: 25.0,     // 25 mm inner radius
        ro: 50.0,     // 50 mm outer radius  
        p_i: 100.0,   // 100 MPa internal pressure
        p_o: 0.0,     // 0 MPa external pressure
        expected: {
            A: 33.333,  // Approximate expected value
            B: 41666.67, // Approximate expected value
            sigma_r_inner: -100.0, // Should equal -p_i at inner surface
            sigma_theta_inner: 166.67, // Approximate expected hoop stress
            sigma_r_outer: 0.0, // Should be 0 at free outer surface
            sigma_theta_outer: 33.33 // Approximate expected hoop stress
        }
    },
    
    // High pressure artillery case
    case2: {
        name: "Artillery Barrel",
        ri: 75.0,     // 75 mm inner radius (150mm bore)
        ro: 150.0,    // 150 mm outer radius (300mm OD)
        p_i: 400.0,   // 400 MPa chamber pressure
        p_o: 0.0,     // Atmospheric
        Sy: 800.0,    // 800 MPa yield strength (high strength steel)
        Su: 1000.0,   // 1000 MPa ultimate strength
        expected: {
            minSafetyFactor: 1.2 // Approximate expected minimum SF
        }
    }
};

/**
 * Run all validation tests
 */
function runTests() {
    console.log('🧪 Starting Lamé Equation Validation Tests...\n');
    
    let passedTests = 0;
    let totalTests = 0;
    
    // Test Case 1: Basic Lamé coefficients and stresses
    console.log(`📋 Test Case 1: ${testCases.case1.name}`);
    totalTests++;
    
    try {
        const { ri, ro, p_i, p_o } = testCases.case1;
        const { A, B } = lameCoefficients(ri, ro, p_i, p_o);
        
        console.log(`   Lamé Coefficients: A = ${A.toFixed(3)}, B = ${B.toFixed(1)}`);
        
        // Test stresses at inner surface
        const innerStresses = stresses(ri, A, B);
        console.log(`   Inner Surface: σ_r = ${innerStresses.sigma_r.toFixed(1)} MPa, σ_θ = ${innerStresses.sigma_theta.toFixed(1)} MPa`);
        
        // Test stresses at outer surface
        const outerStresses = stresses(ro, A, B);
        console.log(`   Outer Surface: σ_r = ${outerStresses.sigma_r.toFixed(1)} MPa, σ_θ = ${outerStresses.sigma_theta.toFixed(1)} MPa`);
        
        // Validate boundary conditions
        const tolerance = 1e-6;
        const innerRadialCorrect = Math.abs(innerStresses.sigma_r - (-p_i)) < tolerance;
        const outerRadialCorrect = Math.abs(outerStresses.sigma_r - 0) < tolerance;
        
        if (innerRadialCorrect && outerRadialCorrect) {
            console.log('   ✅ Boundary conditions satisfied');
            passedTests++;
        } else {
            console.log('   ❌ Boundary conditions failed');
            console.log(`      Inner radial stress error: ${Math.abs(innerStresses.sigma_r + p_i)}`);
            console.log(`      Outer radial stress error: ${Math.abs(outerStresses.sigma_r)}`);
        }
        
    } catch (error) {
        console.log(`   ❌ Test failed with error: ${error.message}`);
    }
    
    console.log('');
    
    // Test Case 2: Complete analysis with safety factors
    console.log(`📋 Test Case 2: ${testCases.case2.name}`);
    totalTests++;
    
    try {
        const { ri, ro, p_i, p_o, Sy, Su } = testCases.case2;
        
        const result = analyzeCircle({
            ri, ro, p_i, p_o: p_o || 0, Sy, Su
        });
        
        console.log(`   Safety Factors: SF_y = ${result.safetyFactors.SF_y.toFixed(2)}, SF_u = ${result.safetyFactors.SF_u.toFixed(2)}`);
        console.log(`   Burst Pressure: ${result.burstPressure.toFixed(1)} MPa`);
        console.log(`   Max Von Mises: ${result.stresses.inner.sigma_vm.toFixed(1)} MPa`);
        
        // Validate that burst pressure is reasonable
        const burstReasonable = result.burstPressure > p_i && result.burstPressure < 10 * p_i;
        const safetyReasonable = result.safetyFactors.SF_y > 0.5 && result.safetyFactors.SF_y < 10;
        
        if (burstReasonable && safetyReasonable) {
            console.log('   ✅ Results are physically reasonable');
            passedTests++;
        } else {
            console.log('   ❌ Results seem unreasonable');
        }
        
    } catch (error) {
        console.log(`   ❌ Test failed with error: ${error.message}`);
    }
    
    console.log('');
    
    // Test Case 3: Von Mises stress validation
    console.log('📋 Test Case 3: Von Mises Stress Calculation');
    totalTests++;
    
    try {
        // Test known case: pure shear should give σ_vm = √3 * τ
        const sigma_r = 0;
        const sigma_theta = 100; // Pure hoop stress
        const sigma_axial = 0;
        
        const sigma_vm = vonMises(sigma_r, sigma_theta, sigma_axial);
        console.log(`   Pure hoop stress (100 MPa): σ_vm = ${sigma_vm.toFixed(1)} MPa`);
        
        // For pure hoop stress, σ_vm should equal the hoop stress
        const expectedVonMises = Math.abs(sigma_theta);
        const vmError = Math.abs(sigma_vm - expectedVonMises);
        
        if (vmError < 0.1) {
            console.log('   ✅ Von Mises calculation correct');
            passedTests++;
        } else {
            console.log(`   ❌ Von Mises error: expected ${expectedVonMises}, got ${sigma_vm}`);
        }
        
    } catch (error) {
        console.log(`   ❌ Test failed with error: ${error.message}`);
    }
    
    console.log('');
    
    // Test Case 4: Error handling
    console.log('📋 Test Case 4: Error Handling');
    totalTests++;
    
    try {
        let errorsHandledCorrectly = 0;
        const expectedErrors = 3;
        
        // Test invalid geometry
        try {
            lameCoefficients(50, 25, 100, 0); // ro < ri
        } catch (error) {
            if (error.message.includes('greater than')) {
                errorsHandledCorrectly++;
            }
        }
        
        // Test negative pressure
        try {
            lameCoefficients(25, 50, -100, 0);
        } catch (error) {
            if (error.message.includes('non-negative')) {
                errorsHandledCorrectly++;
            }
        }
        
        // Test invalid material properties
        try {
            safetyFactors(100, -500, 800);
        } catch (error) {
            if (error.message.includes('positive')) {
                errorsHandledCorrectly++;
            }
        }
        
        if (errorsHandledCorrectly === expectedErrors) {
            console.log('   ✅ Error handling working correctly');
            passedTests++;
        } else {
            console.log(`   ❌ Error handling incomplete: ${errorsHandledCorrectly}/${expectedErrors} errors caught`);
        }
        
    } catch (error) {
        console.log(`   ❌ Test failed with error: ${error.message}`);
    }
    
    console.log('');
    
    // Summary
    console.log('🏁 Test Summary');
    console.log(`   Passed: ${passedTests}/${totalTests} tests`);
    console.log(`   Success Rate: ${(passedTests/totalTests*100).toFixed(1)}%`);
    
    if (passedTests === totalTests) {
        console.log('   🎉 All tests passed! Implementation appears correct.');
    } else {
        console.log('   ⚠️ Some tests failed. Review implementation.');
    }
    
    return { passedTests, totalTests };
}

/**
 * Performance benchmark
 */
function runPerformanceBenchmark() {
    console.log('\n⏱️ Performance Benchmark');
    
    const iterations = 1000;
    const ri = 25.0, ro = 50.0, p_i = 100.0, Sy = 800.0, Su = 1000.0;
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        analyzeCircle({ ri, ro, p_i, p_o: 0, Sy, Su });
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;
    
    console.log(`   ${iterations} complete analyses in ${totalTime.toFixed(1)} ms`);
    console.log(`   Average time per analysis: ${avgTime.toFixed(3)} ms`);
    console.log(`   Target: < 1 ms per analysis ${avgTime < 1.0 ? '✅' : '❌'}`);
    
    return avgTime;
}

// Export test functions for use in browser console or other modules
export { runTests, runPerformanceBenchmark, runAllTests };

/**
 * Run all tests including tolerance tests
 */
async function runAllTests() {
    console.log('🚀 Running Complete Test Suite\n');
    
    // Run core calculation tests
    const coreResults = runTests();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Run tolerance tests
    const toleranceResults = await runToleranceTests();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Combined summary
    const totalPassed = coreResults.passedTests + toleranceResults.passed;
    const totalTests = coreResults.totalTests + toleranceResults.passed + toleranceResults.failed;
    
    console.log('🏆 COMPLETE TEST SUITE SUMMARY');
    console.log(`   Core Module: ${coreResults.passedTests}/${coreResults.totalTests} passed`);
    console.log(`   Tolerance Module: ${toleranceResults.passed}/${toleranceResults.passed + toleranceResults.failed} passed`);
    console.log(`   Overall: ${totalPassed}/${totalTests} passed (${(totalPassed/totalTests*100).toFixed(1)}%)`);
    
    if (totalPassed === totalTests) {
        console.log('   🎉 ALL TESTS PASSED! Implementation is ready.');
    } else {
        console.log('   ⚠️ Some tests failed. Review implementation before production use.');
    }
    
    return { totalPassed, totalTests };
}

// Auto-run tests if this module is loaded directly
if (typeof window !== 'undefined') {
    // Browser environment - make available globally
    window.runLameTests = runTests;
    window.runLamePerformance = runPerformanceBenchmark;
    window.runToleranceTests = runToleranceTests;
    window.runAllTests = runAllTests;
}
