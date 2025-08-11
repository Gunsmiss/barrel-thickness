/**
 * Material Database Module
 * Loads and manages material properties for barrel calculations
 */

import { getSystem, fromSI, toSI } from '../units.js';

// Cache for loaded material data
let materialsData = null;
let loadPromise = null;

/**
 * Load materials data from JSON file
 * @returns {Promise<Object>} Material database object
 */
async function loadMaterialsData() {
    if (materialsData) {
        return materialsData;
    }
    
    if (loadPromise) {
        return loadPromise;
    }
    
    loadPromise = (async () => {
        try {
            const response = await fetch('./data/materials.json');
            if (!response.ok) {
                throw new Error(`Failed to load materials database: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Validate the loaded data structure
            if (!validateMaterialsData(data)) {
                throw new Error('Invalid materials database structure');
            }
            
            materialsData = data;
            console.log(`Loaded ${data.materials.length} materials from database`);
            return materialsData;
        } catch (error) {
            console.error('Error loading materials database:', error);
            // Return fallback material data
            materialsData = getFallbackMaterialsData();
            console.warn('Using fallback material data due to load error');
            return materialsData;
        }
    })();
    
    return loadPromise;
}

/**
 * Validate the structure of loaded materials data
 * @param {Object} data - Material database object
 * @returns {boolean} True if valid
 */
function validateMaterialsData(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    if (!Array.isArray(data.materials) || data.materials.length === 0) {
        return false;
    }
    
    // Check that each material has required properties
    for (const material of data.materials) {
        if (!material.id || !material.name || !material.properties) {
            return false;
        }
        
        const props = material.properties;
        if (typeof props.Sy !== 'number' || typeof props.Su !== 'number' || typeof props.E !== 'number') {
            return false;
        }
    }
    
    return true;
}

/**
 * Get fallback material data in case of loading failure
 * @returns {Object} Fallback material database
 */
function getFallbackMaterialsData() {
    return {
        materials: [
            {
                id: '4140-ht',
                name: '4140 Steel (Heat Treated)',
                category: 'Carbon Steel',
                condition: 'Quenched & Tempered',
                properties: { Sy: 655, Su: 827, E: 200, nu: 0.3, density: 7850 },
                notes: 'Fallback material data'
            },
            {
                id: '17-4ph-h900',
                name: '17-4 PH Stainless (H900)',
                category: 'Stainless Steel', 
                condition: 'Precipitation Hardened',
                properties: { Sy: 1172, Su: 1310, E: 197, nu: 0.3, density: 7800 },
                notes: 'Fallback material data'
            }
        ],
        categories: [
            { id: 'carbon-steel', name: 'Carbon Steel' },
            { id: 'stainless-steel', name: 'Stainless Steel' }
        ],
        metadata: {
            version: 'fallback',
            description: 'Fallback material data'
        }
    };
}

/**
 * Get all available materials
 * @returns {Promise<Array>} Array of material objects
 */
export async function getAllMaterials() {
    const data = await loadMaterialsData();
    return data.materials;
}

/**
 * Get material by ID
 * @param {string} materialId - Material identifier
 * @returns {Promise<Object|null>} Material object or null if not found
 */
export async function getMaterialById(materialId) {
    const materials = await getAllMaterials();
    return materials.find(material => material.id === materialId) || null;
}

/**
 * Get materials by category
 * @param {string} categoryId - Category identifier
 * @returns {Promise<Array>} Array of materials in the category
 */
export async function getMaterialsByCategory(categoryId) {
    const materials = await getAllMaterials();
    return materials.filter(material => 
        material.category.toLowerCase().replace(' ', '-') === categoryId ||
        material.category.toLowerCase() === categoryId
    );
}

/**
 * Get all available categories
 * @returns {Promise<Array>} Array of category objects
 */
export async function getCategories() {
    const data = await loadMaterialsData();
    return data.categories || [];
}

/**
 * Get material properties in current unit system
 * @param {string} materialId - Material identifier
 * @returns {Promise<Object|null>} Material properties in current units or null
 */
export async function getMaterialProperties(materialId) {
    const material = await getMaterialById(materialId);
    if (!material) {
        return null;
    }
    
    const currentSystem = getSystem();
    const props = material.properties;
    
    if (currentSystem === 'SI') {
        // Data is already in SI units
        return {
            ...props,
            units: {
                Sy: 'MPa',
                Su: 'MPa', 
                E: 'GPa',
                nu: 'dimensionless',
                density: 'kg/m³'
            }
        };
    } else {
        // Convert to Imperial units
        return {
            Sy: fromSI(props.Sy, 'pressure'),
            Su: fromSI(props.Su, 'pressure'),
            E: fromSI(props.E * 1000, 'pressure'), // Convert GPa to MPa then to PSI
            nu: props.nu, // Dimensionless
            density: fromSI(props.density, 'density'),
            units: {
                Sy: 'ksi',
                Su: 'ksi',
                E: 'ksi',
                nu: 'dimensionless',
                density: 'lb/ft³'
            }
        };
    }
}

/**
 * Search materials by name or description
 * @param {string} searchTerm - Search string
 * @returns {Promise<Array>} Array of matching materials
 */
export async function searchMaterials(searchTerm) {
    if (!searchTerm || searchTerm.trim().length === 0) {
        return await getAllMaterials();
    }
    
    const materials = await getAllMaterials();
    const term = searchTerm.toLowerCase();
    
    return materials.filter(material => 
        material.name.toLowerCase().includes(term) ||
        material.category.toLowerCase().includes(term) ||
        material.condition.toLowerCase().includes(term) ||
        (material.description && material.description.toLowerCase().includes(term)) ||
        (material.applications && material.applications.some(app => app.toLowerCase().includes(term)))
    );
}

/**
 * Validate custom material properties
 * @param {Object} properties - Material properties object
 * @returns {Object} Validation result with isValid flag and errors array
 */
export function validateCustomMaterial(properties) {
    const errors = [];
    
    // Required properties
    const required = ['Sy', 'Su'];
    for (const prop of required) {
        if (!properties[prop] || typeof properties[prop] !== 'number' || properties[prop] <= 0) {
            errors.push(`${prop} must be a positive number`);
        }
    }
    
    // Yield strength should be less than ultimate strength
    if (properties.Sy && properties.Su && properties.Sy >= properties.Su) {
        errors.push('Yield strength must be less than ultimate strength');
    }
    
    // Reasonable ranges (in SI units)
    if (properties.Sy && (properties.Sy < 50 || properties.Sy > 2000)) {
        errors.push('Yield strength should be between 50-2000 MPa');
    }
    
    if (properties.Su && (properties.Su < 100 || properties.Su > 3000)) {
        errors.push('Ultimate strength should be between 100-3000 MPa');
    }
    
    if (properties.E && (properties.E < 50 || properties.E > 500)) {
        errors.push('Elastic modulus should be between 50-500 GPa');
    }
    
    if (properties.nu && (properties.nu < 0.1 || properties.nu > 0.5)) {
        errors.push('Poisson\'s ratio should be between 0.1-0.5');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Create a custom material object
 * @param {string} name - Material name
 * @param {Object} properties - Material properties
 * @param {string} notes - Optional notes
 * @returns {Object} Custom material object
 */
export function createCustomMaterial(name, properties, notes = '') {
    return {
        id: 'custom',
        name: name || 'Custom Material',
        category: 'Custom',
        condition: 'User Defined',
        properties: properties,
        notes: notes,
        isCustom: true
    };
}

/**
 * Get material recommendations based on application
 * @param {string} application - Application type ('high-pressure', 'corrosion-resistant', etc.)
 * @returns {Promise<Array>} Array of recommended materials
 */
export async function getMaterialRecommendations(application) {
    const materials = await getAllMaterials();
    
    switch (application.toLowerCase()) {
        case 'high-pressure':
            return materials.filter(m => m.properties.Sy > 700);
            
        case 'corrosion-resistant':
            return materials.filter(m => 
                m.category.toLowerCase().includes('stainless') ||
                m.id.includes('inconel') ||
                m.id.includes('ti-')
            );
            
        case 'lightweight':
            return materials.filter(m => 
                m.properties.density < 5000 || 
                m.id.includes('ti-')
            );
            
        case 'high-temperature':
            return materials.filter(m => 
                m.id.includes('inconel') ||
                m.id.includes('17-4ph')
            );
            
        case 'budget':
            return materials.filter(m => 
                m.category.toLowerCase().includes('carbon')
            );
            
        default:
            return materials;
    }
}

/**
 * Get database metadata
 * @returns {Promise<Object>} Database metadata
 */
export async function getDatabaseMetadata() {
    const data = await loadMaterialsData();
    return data.metadata || {};
}

/**
 * Clear the materials cache (useful for testing or reloading)
 */
export function clearCache() {
    materialsData = null;
    loadPromise = null;
    console.log('Materials cache cleared');
}

// Initialize loading on module import for faster subsequent access
loadMaterialsData().catch(error => {
    console.warn('Failed to preload materials database:', error.message);
});
