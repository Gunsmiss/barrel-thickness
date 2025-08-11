/**
 * Cartridge Database Module
 * Loads and manages cartridge specifications for barrel calculations
 */

import { getSystem, fromSI, toSI } from '../units.js';

// Cache for loaded cartridge data
let cartridgesData = null;
let loadPromise = null;

/**
 * Load cartridges data from JSON file
 * @returns {Promise<Object>} Cartridge database object
 */
async function loadCartridgesData() {
    if (cartridgesData) {
        return cartridgesData;
    }
    
    if (loadPromise) {
        return loadPromise;
    }
    
    loadPromise = (async () => {
        try {
            const response = await fetch('./data/cartridges.json');
            if (!response.ok) {
                throw new Error(`Failed to load cartridges database: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Validate the loaded data structure
            if (!validateCartridgesData(data)) {
                throw new Error('Invalid cartridges database structure');
            }
            
            cartridgesData = data;
            console.log(`Loaded ${data.cartridges.length} cartridges from database`);
            return cartridgesData;
        } catch (error) {
            console.error('Error loading cartridges database:', error);
            // Return fallback cartridge data
            cartridgesData = getFallbackCartridgesData();
            console.warn('Using fallback cartridge data due to load error');
            return cartridgesData;
        }
    })();
    
    return loadPromise;
}

/**
 * Validate the structure of loaded cartridges data
 * @param {Object} data - Cartridge database object
 * @returns {boolean} True if valid
 */
function validateCartridgesData(data) {
    if (!data || typeof data !== 'object') {
        return false;
    }
    
    if (!Array.isArray(data.cartridges) || data.cartridges.length === 0) {
        return false;
    }
    
    // Check that each cartridge has required properties
    for (const cartridge of data.cartridges) {
        if (!cartridge.id || !cartridge.name || 
            typeof cartridge.chamber_diameter !== 'number' ||
            typeof cartridge.max_pressure !== 'number') {
            return false;
        }
        
        // Validate reasonable ranges
        if (cartridge.chamber_diameter <= 0 || cartridge.chamber_diameter > 50) {
            return false;
        }
        
        if (cartridge.max_pressure <= 0 || cartridge.max_pressure > 1000) {
            return false;
        }
    }
    
    return true;
}

/**
 * Get fallback cartridge data in case of loading failure
 * @returns {Object} Fallback cartridge database
 */
function getFallbackCartridgesData() {
    return {
        cartridges: [
            {
                id: '223-rem',
                name: '.223 Remington',
                category: 'Rifle',
                chamber_diameter: 5.69,
                bore_diameter: 5.56,
                max_pressure: 379.21,
                standard: 'SAAMI',
                notes: 'Fallback cartridge data'
            },
            {
                id: '308-win',
                name: '.308 Winchester',
                category: 'Rifle',
                chamber_diameter: 7.85,
                bore_diameter: 7.62,
                max_pressure: 413.69,
                standard: 'SAAMI',
                notes: 'Fallback cartridge data'
            },
            {
                id: '9mm-luger',
                name: '9×19mm Parabellum',
                category: 'Pistol',
                chamber_diameter: 9.93,
                bore_diameter: 9.02,
                max_pressure: 241.32,
                standard: 'SAAMI',
                notes: 'Fallback cartridge data'
            }
        ],
        categories: [
            { id: 'rifle', name: 'Rifle' },
            { id: 'pistol', name: 'Pistol' }
        ],
        metadata: {
            version: 'fallback',
            description: 'Fallback cartridge data'
        }
    };
}

/**
 * Get all available cartridges
 * @returns {Promise<Array>} Array of cartridge objects
 */
export async function getAllCartridges() {
    const data = await loadCartridgesData();
    return data.cartridges;
}

/**
 * Get cartridge by ID
 * @param {string} cartridgeId - Cartridge identifier
 * @returns {Promise<Object|null>} Cartridge object or null if not found
 */
export async function getCartridgeById(cartridgeId) {
    const cartridges = await getAllCartridges();
    return cartridges.find(cartridge => cartridge.id === cartridgeId) || null;
}

/**
 * Get cartridges by category
 * @param {string} categoryId - Category identifier
 * @returns {Promise<Array>} Array of cartridges in the category
 */
export async function getCartridgesByCategory(categoryId) {
    const cartridges = await getAllCartridges();
    return cartridges.filter(cartridge => 
        cartridge.category.toLowerCase().replace(/\s+/g, '-') === categoryId ||
        cartridge.category.toLowerCase() === categoryId
    );
}

/**
 * Get all available categories
 * @returns {Promise<Array>} Array of category objects
 */
export async function getCategories() {
    const data = await loadCartridgesData();
    return data.categories || [];
}

/**
 * Get cartridge specifications in current unit system
 * @param {string} cartridgeId - Cartridge identifier
 * @returns {Promise<Object|null>} Cartridge specs in current units or null
 */
export async function getCartridgeSpecs(cartridgeId) {
    const cartridge = await getCartridgeById(cartridgeId);
    if (!cartridge) {
        return null;
    }
    
    const currentSystem = getSystem();
    
    if (currentSystem === 'SI') {
        // Data is already in SI units
        return {
            chamber_diameter: cartridge.chamber_diameter,
            bore_diameter: cartridge.bore_diameter || cartridge.chamber_diameter,
            max_pressure: cartridge.max_pressure,
            units: {
                diameter: 'mm',
                pressure: 'MPa'
            }
        };
    } else {
        // Convert to Imperial units
        return {
            chamber_diameter: fromSI(cartridge.chamber_diameter, 'diameter'),
            bore_diameter: fromSI(cartridge.bore_diameter || cartridge.chamber_diameter, 'diameter'),
            max_pressure: fromSI(cartridge.max_pressure, 'pressure'),
            units: {
                diameter: 'in',
                pressure: 'psi'
            }
        };
    }
}

/**
 * Search cartridges by name, category, or description
 * @param {string} searchTerm - Search string
 * @returns {Promise<Array>} Array of matching cartridges
 */
export async function searchCartridges(searchTerm) {
    if (!searchTerm || searchTerm.trim().length === 0) {
        return await getAllCartridges();
    }
    
    const cartridges = await getAllCartridges();
    const term = searchTerm.toLowerCase();
    
    return cartridges.filter(cartridge => 
        cartridge.name.toLowerCase().includes(term) ||
        cartridge.category.toLowerCase().includes(term) ||
        (cartridge.description && cartridge.description.toLowerCase().includes(term)) ||
        (cartridge.applications && cartridge.applications.some(app => app.toLowerCase().includes(term))) ||
        cartridge.id.toLowerCase().includes(term.replace(/[^a-z0-9]/g, ''))
    );
}

/**
 * Get cartridges by application
 * @param {string} application - Application type
 * @returns {Promise<Array>} Array of cartridges suitable for the application
 */
export async function getCartridgesByApplication(application) {
    const cartridges = await getAllCartridges();
    const appTerm = application.toLowerCase();
    
    return cartridges.filter(cartridge => 
        cartridge.applications && cartridge.applications.some(app => 
            app.toLowerCase().includes(appTerm)
        )
    );
}

/**
 * Get cartridges by pressure range
 * @param {number} minPressure - Minimum pressure in MPa
 * @param {number} maxPressure - Maximum pressure in MPa
 * @returns {Promise<Array>} Array of cartridges in the pressure range
 */
export async function getCartridgesByPressureRange(minPressure, maxPressure) {
    const cartridges = await getAllCartridges();
    
    return cartridges.filter(cartridge => 
        cartridge.max_pressure >= minPressure && cartridge.max_pressure <= maxPressure
    );
}

/**
 * Get cartridges suitable for a given barrel diameter
 * @param {number} barrelDiameter - Barrel inner diameter in mm
 * @param {number} tolerance - Tolerance for matching (default 0.5mm)
 * @returns {Promise<Array>} Array of compatible cartridges
 */
export async function getCompatibleCartridges(barrelDiameter, tolerance = 0.5) {
    const cartridges = await getAllCartridges();
    
    return cartridges.filter(cartridge => {
        const diameterDiff = Math.abs(cartridge.chamber_diameter - barrelDiameter);
        return diameterDiff <= tolerance;
    });
}

/**
 * Validate cartridge selection for given barrel parameters
 * @param {string} cartridgeId - Cartridge identifier
 * @param {number} barrelInnerDiameter - Barrel inner diameter in mm
 * @param {number} barrelOuterDiameter - Barrel outer diameter in mm
 * @returns {Promise<Object>} Validation result with warnings and recommendations
 */
export async function validateCartridgeSelection(cartridgeId, barrelInnerDiameter, barrelOuterDiameter) {
    const cartridge = await getCartridgeById(cartridgeId);
    const warnings = [];
    const recommendations = [];
    
    if (!cartridge) {
        return {
            isValid: false,
            warnings: ['Cartridge not found'],
            recommendations: []
        };
    }
    
    // Check diameter compatibility
    const diameterDiff = Math.abs(cartridge.chamber_diameter - barrelInnerDiameter);
    if (diameterDiff > 0.1) {
        warnings.push(`Cartridge chamber diameter (${cartridge.chamber_diameter}mm) differs significantly from barrel inner diameter (${barrelInnerDiameter}mm)`);
        recommendations.push('Verify chamber dimensions and headspace requirements');
    }
    
    // Check wall thickness for pressure
    const wallThickness = (barrelOuterDiameter - barrelInnerDiameter) / 2;
    const thicknessRatio = wallThickness / (barrelInnerDiameter / 2);
    
    if (cartridge.max_pressure > 400 && thicknessRatio < 0.5) {
        warnings.push(`High pressure cartridge (${cartridge.max_pressure}MPa) with relatively thin barrel wall`);
        recommendations.push('Consider increasing barrel outer diameter for higher safety factor');
    }
    
    if (cartridge.max_pressure > 450 && thicknessRatio < 0.7) {
        warnings.push(`Very high pressure cartridge with thin barrel wall - potential safety concern`);
        recommendations.push('Strongly recommend thicker barrel wall for this pressure level');
    }
    
    return {
        isValid: warnings.length === 0,
        warnings: warnings,
        recommendations: recommendations
    };
}

/**
 * Get popular cartridges (top used cartridges)
 * @returns {Promise<Array>} Array of popular cartridge objects
 */
export async function getPopularCartridges() {
    const cartridges = await getAllCartridges();
    
    // Define popular cartridge IDs in order of popularity
    const popularIds = [
        '223-rem', '556-nato', '9mm-luger', '308-win', '762-nato',
        '45-acp', '30-06', '300-win-mag'
    ];
    
    const popular = [];
    for (const id of popularIds) {
        const cartridge = cartridges.find(c => c.id === id);
        if (cartridge) {
            popular.push(cartridge);
        }
    }
    
    return popular;
}

/**
 * Get database metadata
 * @returns {Promise<Object>} Database metadata
 */
export async function getDatabaseMetadata() {
    const data = await loadCartridgesData();
    return data.metadata || {};
}

/**
 * Clear the cartridges cache (useful for testing or reloading)
 */
export function clearCache() {
    cartridgesData = null;
    loadPromise = null;
    console.log('Cartridges cache cleared');
}

/**
 * Convert cartridge pressure from standard format to current units
 * @param {number} pressureMPa - Pressure in MPa
 * @returns {number} Pressure in current unit system
 */
export function convertPressureToCurrentUnits(pressureMPa) {
    const currentSystem = getSystem();
    
    if (currentSystem === 'SI') {
        return pressureMPa;
    } else {
        return fromSI(pressureMPa, 'pressure');
    }
}

/**
 * Convert cartridge diameter from standard format to current units
 * @param {number} diameterMm - Diameter in mm
 * @returns {number} Diameter in current unit system
 */
export function convertDiameterToCurrentUnits(diameterMm) {
    const currentSystem = getSystem();
    
    if (currentSystem === 'SI') {
        return diameterMm;
    } else {
        return fromSI(diameterMm, 'diameter');
    }
}

// Initialize loading on module import for faster subsequent access
loadCartridgesData().catch(error => {
    console.warn('Failed to preload cartridges database:', error.message);
});
