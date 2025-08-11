/**
 * Unit Tests for Cartridge Database Module
 * Test cartridge data loading, searching, and validation functionality
 */

import { 
    getAllCartridges,
    getCartridgeById,
    getCartridgeSpecs,
    searchCartridges,
    getPopularCartridges,
    getCategories,
    getCartridgesByCategory,
    getCartridgesByApplication,
    getCartridgesByPressureRange,
    getCompatibleCartridges,
    validateCartridgeSelection,
    convertPressureToCurrentUnits,
    convertDiameterToCurrentUnits,
    clearCache
} from './cartridges.js';

import { setSystem } from '../units.js';

// Test data validation
let testResults = [];

function assert(condition, message) {
    if (condition) {
        testResults.push({ test: message, status: 'PASS' });
    } else {
        testResults.push({ test: message, status: 'FAIL' });
        console.error(`FAIL: ${message}`);
    }
}

function assertClose(actual, expected, tolerance, message) {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
        testResults.push({ test: message, status: 'PASS' });
    } else {
        testResults.push({ test: message, status: 'FAIL' });
        console.error(`FAIL: ${message} - Expected ${expected}, got ${actual}, diff ${diff}`);
    }
}

/**
 * Test basic cartridge data loading
 */
async function testCartridgeDataLoading() {
    console.log('Testing cartridge data loading...');
    
    // Test getting all cartridges
    const allCartridges = await getAllCartridges();
    assert(Array.isArray(allCartridges), 'getAllCartridges returns an array');
    assert(allCartridges.length > 0, 'getAllCartridges returns non-empty array');
    
    // Test cartridge structure
    const firstCartridge = allCartridges[0];
    assert(typeof firstCartridge.id === 'string', 'Cartridge has string ID');
    assert(typeof firstCartridge.name === 'string', 'Cartridge has string name');
    assert(typeof firstCartridge.chamber_diameter === 'number', 'Cartridge has numeric chamber diameter');
    assert(typeof firstCartridge.max_pressure === 'number', 'Cartridge has numeric max pressure');
    assert(firstCartridge.chamber_diameter > 0, 'Chamber diameter is positive');
    assert(firstCartridge.max_pressure > 0, 'Max pressure is positive');
    
    // Test getting specific cartridge
    const cartridge223 = await getCartridgeById('223-rem');
    assert(cartridge223 !== null, 'Can retrieve .223 Remington cartridge');
    assert(cartridge223.name === '.223 Remington', '.223 Rem has correct name');
    assertClose(cartridge223.chamber_diameter, 5.69, 0.01, '.223 Rem has correct chamber diameter');
    
    // Test non-existent cartridge
    const nonExistent = await getCartridgeById('non-existent');
    assert(nonExistent === null, 'Non-existent cartridge returns null');
}

/**
 * Test cartridge searching functionality
 */
async function testCartridgeSearch() {
    console.log('Testing cartridge search functionality...');
    
    // Test search by name
    const rifleResults = await searchCartridges('223');
    assert(rifleResults.length > 0, 'Search for "223" returns results');
    assert(rifleResults.some(c => c.id === '223-rem'), 'Search includes .223 Remington');
    
    // Test search by category
    const pistolResults = await searchCartridges('pistol');
    assert(pistolResults.length > 0, 'Search for "pistol" returns results');
    assert(pistolResults.some(c => c.category === 'Pistol'), 'Pistol search includes pistol cartridges');
    
    // Test search by application
    const huntingResults = await searchCartridges('hunting');
    assert(huntingResults.length > 0, 'Search for "hunting" returns results');
    
    // Test empty search
    const emptyResults = await searchCartridges('');
    const allCartridges = await getAllCartridges();
    assert(emptyResults.length === allCartridges.length, 'Empty search returns all cartridges');
    
    // Test no results
    const noResults = await searchCartridges('xyz123nonexistent');
    assert(noResults.length === 0, 'Non-matching search returns empty array');
}

/**
 * Test cartridge categories and filtering
 */
async function testCartridgeCategories() {
    console.log('Testing cartridge categories...');
    
    // Test getting categories
    const categories = await getCategories();
    assert(Array.isArray(categories), 'getCategories returns an array');
    assert(categories.length > 0, 'Categories array is not empty');
    assert(categories.some(c => c.name === 'Rifle'), 'Categories include Rifle');
    assert(categories.some(c => c.name === 'Pistol'), 'Categories include Pistol');
    
    // Test getting cartridges by category
    const rifleCartridges = await getCartridgesByCategory('rifle');
    assert(rifleCartridges.length > 0, 'Rifle category has cartridges');
    assert(rifleCartridges.every(c => c.category === 'Rifle'), 'All results are rifle cartridges');
    
    const pistolCartridges = await getCartridgesByCategory('pistol');
    assert(pistolCartridges.length > 0, 'Pistol category has cartridges');
    assert(pistolCartridges.every(c => c.category === 'Pistol'), 'All results are pistol cartridges');
}

/**
 * Test unit conversion functionality
 */
async function testUnitConversion() {
    console.log('Testing unit conversion...');
    
    // Clear cache to ensure fresh data
    clearCache();
    
    // Test in SI units
    setSystem('SI');
    const cartridge223SI = await getCartridgeSpecs('223-rem');
    assert(cartridge223SI !== null, 'Can get .223 specs in SI');
    assertClose(cartridge223SI.chamber_diameter, 5.69, 0.01, 'SI chamber diameter correct');
    assertClose(cartridge223SI.max_pressure, 379.21, 1, 'SI pressure correct');
    assert(cartridge223SI.units.diameter === 'mm', 'SI diameter units are mm');
    assert(cartridge223SI.units.pressure === 'MPa', 'SI pressure units are MPa');
    
    // Test in Imperial units
    setSystem('IP');
    const cartridge223IP = await getCartridgeSpecs('223-rem');
    assert(cartridge223IP !== null, 'Can get .223 specs in Imperial');
    assertClose(cartridge223IP.chamber_diameter, 0.224, 0.001, 'Imperial chamber diameter correct');
    assertClose(cartridge223IP.max_pressure, 55000, 100, 'Imperial pressure correct');
    assert(cartridge223IP.units.diameter === 'in', 'Imperial diameter units are in');
    assert(cartridge223IP.units.pressure === 'psi', 'Imperial pressure units are psi');
    
    // Reset to SI for other tests
    setSystem('SI');
}

/**
 * Test cartridge filtering by pressure range
 */
async function testPressureRangeFiltering() {
    console.log('Testing pressure range filtering...');
    
    // Test high-pressure cartridges (> 400 MPa)
    const highPressure = await getCartridgesByPressureRange(400, 1000);
    assert(highPressure.length > 0, 'High pressure range returns results');
    assert(highPressure.every(c => c.max_pressure >= 400), 'All results are high pressure');
    
    // Test low-pressure cartridges (< 250 MPa)
    const lowPressure = await getCartridgesByPressureRange(0, 250);
    assert(lowPressure.length > 0, 'Low pressure range returns results');
    assert(lowPressure.every(c => c.max_pressure <= 250), 'All results are low pressure');
    
    // Test specific range
    const midRange = await getCartridgesByPressureRange(300, 400);
    assert(midRange.every(c => c.max_pressure >= 300 && c.max_pressure <= 400), 'Mid range results are within bounds');
}

/**
 * Test compatible cartridge matching
 */
async function testCompatibleCartridges() {
    console.log('Testing compatible cartridge matching...');
    
    // Test 9mm bore diameter compatibility
    const compatible9mm = await getCompatibleCartridges(9.0, 0.5);
    assert(compatible9mm.length > 0, '9mm diameter has compatible cartridges');
    assert(compatible9mm.some(c => c.id === '9mm-luger'), '9mm Luger is compatible with 9mm bore');
    
    // Test .223/5.56 compatibility
    const compatible556 = await getCompatibleCartridges(5.56, 0.2);
    assert(compatible556.length > 0, '5.56mm diameter has compatible cartridges');
    assert(compatible556.some(c => c.id === '223-rem' || c.id === '556-nato'), '.223/5.56 cartridges are compatible');
    
    // Test unrealistic diameter
    const compatibleLarge = await getCompatibleCartridges(50.0, 0.1);
    assert(compatibleLarge.length === 0, 'Unrealistic large diameter has no compatible cartridges');
}

/**
 * Test cartridge validation
 */
async function testCartridgeValidation() {
    console.log('Testing cartridge validation...');
    
    // Test valid .223 Rem setup
    const validation223Good = await validateCartridgeSelection('223-rem', 5.69, 19.05);
    assert(typeof validation223Good.isValid === 'boolean', 'Validation returns isValid boolean');
    assert(Array.isArray(validation223Good.warnings), 'Validation returns warnings array');
    assert(Array.isArray(validation223Good.recommendations), 'Validation returns recommendations array');
    
    // Test diameter mismatch
    const validationMismatch = await validateCartridgeSelection('223-rem', 9.0, 20.0);
    assert(validationMismatch.warnings.length > 0, 'Diameter mismatch generates warnings');
    
    // Test thin wall with high pressure
    const validationThinWall = await validateCartridgeSelection('338-lapua', 8.58, 12.0);
    assert(validationThinWall.warnings.length > 0, 'Thin wall with high pressure generates warnings');
    
    // Test non-existent cartridge
    const validationNonExistent = await validateCartridgeSelection('non-existent', 5.69, 19.05);
    assert(!validationNonExistent.isValid, 'Non-existent cartridge validation fails');
}

/**
 * Test popular cartridges functionality
 */
async function testPopularCartridges() {
    console.log('Testing popular cartridges...');
    
    const popular = await getPopularCartridges();
    assert(Array.isArray(popular), 'getPopularCartridges returns array');
    assert(popular.length > 0, 'Popular cartridges array is not empty');
    assert(popular.some(c => c.id === '223-rem'), 'Popular cartridges include .223 Rem');
    assert(popular.some(c => c.id === '9mm-luger'), 'Popular cartridges include 9mm Luger');
    
    // Check that popular cartridges are a subset of all cartridges
    const allCartridges = await getAllCartridges();
    assert(popular.every(p => allCartridges.some(a => a.id === p.id)), 'All popular cartridges exist in full database');
}

/**
 * Test cartridge applications filtering
 */
async function testApplicationFiltering() {
    console.log('Testing application filtering...');
    
    // Test hunting applications
    const huntingCartridges = await getCartridgesByApplication('hunting');
    assert(huntingCartridges.length > 0, 'Hunting application returns results');
    assert(huntingCartridges.every(c => 
        c.applications && c.applications.some(app => 
            app.toLowerCase().includes('hunting')
        )
    ), 'All results have hunting applications');
    
    // Test military applications
    const militaryCartridges = await getCartridgesByApplication('military');
    assert(militaryCartridges.length > 0, 'Military application returns results');
    
    // Test target shooting
    const targetCartridges = await getCartridgesByApplication('target');
    assert(targetCartridges.length > 0, 'Target shooting application returns results');
}

/**
 * Test data consistency and validation
 */
async function testDataConsistency() {
    console.log('Testing data consistency...');
    
    const allCartridges = await getAllCartridges();
    
    // Test that all cartridges have required fields
    for (const cartridge of allCartridges) {
        assert(typeof cartridge.id === 'string' && cartridge.id.length > 0, `Cartridge ${cartridge.id} has valid ID`);
        assert(typeof cartridge.name === 'string' && cartridge.name.length > 0, `Cartridge ${cartridge.id} has valid name`);
        assert(typeof cartridge.category === 'string' && cartridge.category.length > 0, `Cartridge ${cartridge.id} has valid category`);
        assert(typeof cartridge.chamber_diameter === 'number' && cartridge.chamber_diameter > 0, `Cartridge ${cartridge.id} has valid chamber diameter`);
        assert(typeof cartridge.max_pressure === 'number' && cartridge.max_pressure > 0, `Cartridge ${cartridge.id} has valid max pressure`);
        assert(typeof cartridge.standard === 'string' && cartridge.standard.length > 0, `Cartridge ${cartridge.id} has valid standard`);
        
        // Check reasonable ranges
        assert(cartridge.chamber_diameter >= 2.5 && cartridge.chamber_diameter <= 50, `Cartridge ${cartridge.id} chamber diameter in reasonable range`);
        assert(cartridge.max_pressure >= 50 && cartridge.max_pressure <= 1000, `Cartridge ${cartridge.id} pressure in reasonable range`);
        
        // If bore diameter is specified, it should be reasonable
        if (cartridge.bore_diameter) {
            assert(cartridge.bore_diameter > 0 && cartridge.bore_diameter <= cartridge.chamber_diameter, 
                `Cartridge ${cartridge.id} bore diameter is reasonable`);
        }
    }
    
    // Test unique IDs
    const ids = allCartridges.map(c => c.id);
    const uniqueIds = [...new Set(ids)];
    assert(ids.length === uniqueIds.length, 'All cartridge IDs are unique');
}

/**
 * Test error handling
 */
async function testErrorHandling() {
    console.log('Testing error handling...');
    
    // Test with invalid inputs
    const nullCartridge = await getCartridgeById(null);
    assert(nullCartridge === null, 'getCartridgeById handles null input');
    
    const undefinedCartridge = await getCartridgeById(undefined);
    assert(undefinedCartridge === null, 'getCartridgeById handles undefined input');
    
    // Test search with invalid inputs
    const nullSearch = await searchCartridges(null);
    assert(Array.isArray(nullSearch), 'searchCartridges handles null input');
    
    // Test validation with invalid inputs
    const invalidValidation = await validateCartridgeSelection('valid-cartridge', NaN, 20);
    assert(typeof invalidValidation.isValid === 'boolean', 'validateCartridgeSelection handles NaN input');
}

/**
 * Run all tests
 */
export async function runCartridgeTests() {
    console.log('🧪 Running Cartridge Module Tests...');
    testResults = [];
    
    try {
        await testCartridgeDataLoading();
        await testCartridgeSearch();
        await testCartridgeCategories();
        await testUnitConversion();
        await testPressureRangeFiltering();
        await testCompatibleCartridges();
        await testCartridgeValidation();
        await testPopularCartridges();
        await testApplicationFiltering();
        await testDataConsistency();
        await testErrorHandling();
        
        // Calculate results
        const passed = testResults.filter(r => r.status === 'PASS').length;
        const failed = testResults.filter(r => r.status === 'FAIL').length;
        const total = testResults.length;
        
        console.log(`\n📊 Test Results: ${passed}/${total} passed, ${failed} failed`);
        
        if (failed > 0) {
            console.log('\n❌ Failed tests:');
            testResults.filter(r => r.status === 'FAIL').forEach(r => {
                console.log(`  - ${r.test}`);
            });
        } else {
            console.log('\n✅ All tests passed!');
        }
        
        return {
            passed,
            failed,
            total,
            results: testResults
        };
        
    } catch (error) {
        console.error('❌ Test suite failed with error:', error);
        return {
            passed: 0,
            failed: 1,
            total: 1,
            results: [{ test: 'Test suite execution', status: 'FAIL', error: error.message }]
        };
    }
}

/**
 * Display test results in HTML format
 */
export function displayCartridgeTestResults(results) {
    const { passed, failed, total } = results;
    const successRate = ((passed / total) * 100).toFixed(1);
    
    let html = `
        <div class="card">
            <div class="card-header">
                <h5 class="card-title mb-0">🧪 Cartridge Module Test Results</h5>
            </div>
            <div class="card-body">
                <div class="row mb-3">
                    <div class="col-md-3">
                        <div class="text-center">
                            <div class="h3 ${failed === 0 ? 'text-success' : 'text-warning'}">${passed}/${total}</div>
                            <div class="text-muted">Tests Passed</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="text-center">
                            <div class="h3 ${failed === 0 ? 'text-success' : 'text-danger'}">${failed}</div>
                            <div class="text-muted">Tests Failed</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="text-center">
                            <div class="h3 ${successRate >= 90 ? 'text-success' : successRate >= 70 ? 'text-warning' : 'text-danger'}">${successRate}%</div>
                            <div class="text-muted">Success Rate</div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="text-center">
                            <div class="h3 ${failed === 0 ? 'text-success' : 'text-danger'}">${failed === 0 ? '✅' : '❌'}</div>
                            <div class="text-muted">Status</div>
                        </div>
                    </div>
                </div>
                
                <div class="accordion" id="testDetailsAccordion">
                    <div class="accordion-item">
                        <h6 class="accordion-header">
                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#testDetails">
                                View Detailed Results
                            </button>
                        </h6>
                        <div id="testDetails" class="accordion-collapse collapse" data-bs-parent="#testDetailsAccordion">
                            <div class="accordion-body">
                                <div class="table-responsive">
                                    <table class="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Test</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
    `;
    
    results.results.forEach(result => {
        const badgeClass = result.status === 'PASS' ? 'bg-success' : 'bg-danger';
        html += `
            <tr>
                <td>${result.test}</td>
                <td><span class="badge ${badgeClass}">${result.status}</span></td>
            </tr>
        `;
    });
    
    html += `
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
            </div>
        </div>
    `;
    
    return html;
}

// Export for standalone testing
if (typeof window !== 'undefined') {
    window.runCartridgeTests = runCartridgeTests;
    window.displayCartridgeTestResults = displayCartridgeTestResults;
}
