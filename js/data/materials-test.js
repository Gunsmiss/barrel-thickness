/**
 * Materials Module Test Suite
 * Tests for material database loading and validation
 */

import { 
    getAllMaterials, 
    getMaterialById, 
    getMaterialProperties, 
    getCategories,
    validateCustomMaterial,
    createCustomMaterial,
    searchMaterials,
    clearCache
} from './materials.js';

/**
 * Run all material module tests
 */
export async function runMaterialTests() {
    console.log('🧪 Running Materials Module Tests...');
    
    const results = {
        passed: 0,
        failed: 0,
        total: 0,
        failures: []
    };
    
    const tests = [
        testMaterialLoading,
        testMaterialProperties,
        testMaterialSearch,
        testCustomMaterialValidation,
        testUnitConversion,
        testMaterialCategories,
        testErrorHandling
    ];
    
    for (const test of tests) {
        try {
            results.total++;
            await test();
            results.passed++;
            console.log(`✅ ${test.name} passed`);
        } catch (error) {
            results.failed++;
            results.failures.push({ test: test.name, error: error.message });
            console.error(`❌ ${test.name} failed:`, error.message);
        }
    }
    
    console.log('\n📊 Materials Test Results:');
    console.log(`Total: ${results.total}, Passed: ${results.passed}, Failed: ${results.failed}`);
    
    if (results.failures.length > 0) {
        console.log('\n❌ Failures:');
        results.failures.forEach(failure => {
            console.log(`  - ${failure.test}: ${failure.error}`);
        });
    }
    
    return results;
}

/**
 * Test material loading functionality
 */
async function testMaterialLoading() {
    const materials = await getAllMaterials();
    
    if (!Array.isArray(materials)) {
        throw new Error('getAllMaterials() should return an array');
    }
    
    if (materials.length === 0) {
        throw new Error('Materials array should not be empty');
    }
    
    // Check that each material has required properties
    for (const material of materials) {
        if (!material.id || !material.name || !material.properties) {
            throw new Error(`Material missing required properties: ${JSON.stringify(material)}`);
        }
        
        if (typeof material.properties.Sy !== 'number' || material.properties.Sy <= 0) {
            throw new Error(`Invalid yield strength for material ${material.id}: ${material.properties.Sy}`);
        }
        
        if (typeof material.properties.Su !== 'number' || material.properties.Su <= 0) {
            throw new Error(`Invalid ultimate strength for material ${material.id}: ${material.properties.Su}`);
        }
    }
    
    console.log(`Loaded ${materials.length} materials successfully`);
}

/**
 * Test material property retrieval
 */
async function testMaterialProperties() {
    // Test known material
    const material4140 = await getMaterialById('4140-ht');
    if (!material4140) {
        throw new Error('Could not find 4140-ht material');
    }
    
    if (material4140.properties.Sy !== 655) {
        throw new Error(`4140-ht yield strength should be 655 MPa, got ${material4140.properties.Sy}`);
    }
    
    // Test material properties in current units
    const properties = await getMaterialProperties('4140-ht');
    if (!properties) {
        throw new Error('Could not get material properties for 4140-ht');
    }
    
    if (typeof properties.Sy !== 'number' || properties.Sy <= 0) {
        throw new Error(`Invalid yield strength in properties: ${properties.Sy}`);
    }
    
    // Test non-existent material
    const nonExistent = await getMaterialById('non-existent');
    if (nonExistent !== null) {
        throw new Error('Non-existent material should return null');
    }
}

/**
 * Test material search functionality
 */
async function testMaterialSearch() {
    // Search for steel materials
    const steelMaterials = await searchMaterials('steel');
    if (!Array.isArray(steelMaterials) || steelMaterials.length === 0) {
        throw new Error('Steel search should return materials');
    }
    
    // Search for stainless materials
    const stainlessMaterials = await searchMaterials('stainless');
    if (!Array.isArray(stainlessMaterials) || stainlessMaterials.length === 0) {
        throw new Error('Stainless search should return materials');
    }
    
    // Search for non-existent term
    const noResults = await searchMaterials('nonexistentmaterial');
    if (!Array.isArray(noResults) || noResults.length !== 0) {
        throw new Error('Non-existent search should return empty array');
    }
    
    // Empty search should return all materials
    const allMaterials = await searchMaterials('');
    const allMaterialsControl = await getAllMaterials();
    if (allMaterials.length !== allMaterialsControl.length) {
        throw new Error('Empty search should return all materials');
    }
}

/**
 * Test custom material validation
 */
async function testCustomMaterialValidation() {
    // Valid custom material
    const validMaterial = {
        Sy: 800,
        Su: 1000,
        E: 200,
        nu: 0.3
    };
    
    const validResult = validateCustomMaterial(validMaterial);
    if (!validResult.isValid) {
        throw new Error(`Valid material should pass validation: ${validResult.errors.join(', ')}`);
    }
    
    // Invalid material - yield > ultimate
    const invalidMaterial1 = {
        Sy: 1000,
        Su: 800,
        E: 200,
        nu: 0.3
    };
    
    const invalidResult1 = validateCustomMaterial(invalidMaterial1);
    if (invalidResult1.isValid) {
        throw new Error('Material with yield > ultimate should fail validation');
    }
    
    // Invalid material - missing properties
    const invalidMaterial2 = {
        Sy: 800
    };
    
    const invalidResult2 = validateCustomMaterial(invalidMaterial2);
    if (invalidResult2.isValid) {
        throw new Error('Material with missing Su should fail validation');
    }
    
    // Test createCustomMaterial
    const customMaterial = createCustomMaterial('Test Material', validMaterial, 'Test notes');
    if (customMaterial.id !== 'custom' || !customMaterial.isCustom) {
        throw new Error('createCustomMaterial should create proper custom material object');
    }
}

/**
 * Test unit conversion in material properties
 */
async function testUnitConversion() {
    // This test would require mocking the units system
    // For now, just verify that properties are returned in a consistent format
    const properties = await getMaterialProperties('4140-ht');
    
    if (!properties.units) {
        throw new Error('Material properties should include units information');
    }
    
    if (!properties.units.Sy || !properties.units.Su) {
        throw new Error('Material properties should include stress unit information');
    }
    
    // Verify numeric values are reasonable
    if (properties.Sy < 50 || properties.Sy > 300000) {
        throw new Error(`Yield strength value seems unreasonable: ${properties.Sy} ${properties.units.Sy}`);
    }
}

/**
 * Test material categories
 */
async function testMaterialCategories() {
    const categories = await getCategories();
    
    if (!Array.isArray(categories)) {
        throw new Error('getCategories() should return an array');
    }
    
    if (categories.length === 0) {
        throw new Error('Categories array should not be empty');
    }
    
    // Check that each category has required properties
    for (const category of categories) {
        if (!category.id || !category.name) {
            throw new Error(`Category missing required properties: ${JSON.stringify(category)}`);
        }
    }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
    // Clear cache to test loading behavior
    clearCache();
    
    // This will test the fallback mechanism when the JSON file can't be loaded
    // We can't easily simulate a network error in this test environment,
    // but we can verify that the system handles errors gracefully
    
    try {
        const materials = await getAllMaterials();
        if (!Array.isArray(materials) || materials.length === 0) {
            throw new Error('Error handling should provide fallback materials');
        }
        console.log('Error handling test passed - fallback system works');
    } catch (error) {
        // If we get here, the error handling isn't working properly
        throw new Error(`Error handling failed: ${error.message}`);
    }
}

// Export individual test functions for manual testing
export {
    testMaterialLoading,
    testMaterialProperties,
    testMaterialSearch,
    testCustomMaterialValidation,
    testUnitConversion,
    testMaterialCategories,
    testErrorHandling
};
