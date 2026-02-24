
import { extractPotentialOres } from './level_calculator';

/**
 * Updates item_recipe_choices based on disabled_ores settings.
 * 
 * @param {object} scheme_data - Current scheme data
 * @param {object} game_data - Game data containing recipes
 * @param {object} item_data - Item data mapping items to recipe indices
 * @param {Array<string>} disabled_ores - List of currently disabled ores
 * @param {Array<string>} [target_ores] - Optional list of specific ores to update. If null, updates all potential ores.
 * @returns {object} New scheme_data with updated choices
 */
export function updateRecipeChoices(scheme_data, game_data, item_data, disabled_ores, target_ores) {
    const new_scheme = { ...scheme_data };
    const new_choices = { ...scheme_data.item_recipe_choices };
    
    const potential_ores = extractPotentialOres(game_data);
    const disabledSet = new Set(disabled_ores || []);
    
    const oresToProcess = target_ores || potential_ores;

    oresToProcess.forEach(ore => {
        if (!item_data[ore] || item_data[ore].length <= 1) return;

        const availableRecipes = item_data[ore].slice(1); 
        const is_disabled = disabledSet.has(ore);
        const current_choice_idx = new_choices[ore];
        
        let best_choice_idx = -1;

        if (!is_disabled) {
            // Case: Ore is AVAILABLE (Enabled). We WANT Mining/Raw recipe.
            
            // Check if current choice is already Mining/Raw
            if (current_choice_idx) {
                const rIdx = item_data[ore][current_choice_idx];
                const recipe = game_data.recipe_data[rIdx];
                if (recipe && (Object.keys(recipe.原料).length === 0 || recipe.名称.includes("无中生有"))) {
                    // Current choice is valid. Keep it.
                    return; 
                }
            }
            
            // Find first valid Mining/Raw recipe
            for (let i = 0; i < availableRecipes.length; i++) {
                const rIdx = availableRecipes[i];
                const recipe = game_data.recipe_data[rIdx];
                if (Object.keys(recipe.原料).length === 0 || recipe.名称.includes("无中生有")) {
                    best_choice_idx = i + 1;
                    break;
                }
            }
        } else {
            // Case: Ore is DISABLED. We WANT Synthesis recipe.
            
            // Check if current choice is already Synthesis
            if (current_choice_idx) {
                const rIdx = item_data[ore][current_choice_idx];
                const recipe = game_data.recipe_data[rIdx];
                if (recipe && Object.keys(recipe.原料).length > 0 && !recipe.名称.includes("无中生有")) {
                    // Current choice is valid. Keep it.
                    return;
                }
            }
            
            // Find first valid Synthesis recipe
            for (let i = 0; i < availableRecipes.length; i++) {
                const rIdx = availableRecipes[i];
                const recipe = game_data.recipe_data[rIdx];
                if (Object.keys(recipe.原料).length > 0 && !recipe.名称.includes("无中生有")) {
                    best_choice_idx = i + 1;
                    break;
                }
            }
        }

        if (best_choice_idx !== -1) {
            new_choices[ore] = best_choice_idx;
        }
    });

    new_scheme.item_recipe_choices = new_choices;
    return new_scheme;
}
