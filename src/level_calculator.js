
// 动态计算配方级别的工具函数

export function calculateRecipeLevels(game_data, availableOres) {
    let item_levels = {};  // item_name -> level
    let recipe_levels = {}; // recipe_index -> level
    let queue = [];

    // 1. Initialize Level 0 items from the definitive list of available ores.
    availableOres.forEach(ore => {
        item_levels[ore] = 0;
        queue.push(ore);
    });

    // 2. Build graph helpers for BFS traversal.
    let item_to_recipes_using_it = {};
    let recipe_ingredients = {};
    let recipe_products = {};
    
    game_data.recipe_data.forEach((recipe, idx) => {
        let recipe_name = recipe["名称"] || "";
        if (recipe_name.includes("[无中生有]")) {
            return;
        }

        let ingredients = Object.keys(recipe["原料"]);
        recipe_ingredients[idx] = ingredients;
        recipe_products[idx] = Object.keys(recipe["产物"]);
        
        ingredients.forEach(ing => {
            if (!item_to_recipes_using_it[ing]) {
                item_to_recipes_using_it[ing] = [];
            }
            item_to_recipes_using_it[ing].push(idx);
        });
    });

    // 3. Initialize BFS state for ALL recipes.
    let recipe_max_ing_level = {};
    let recipe_ing_satisfied_count = {};
    let processed_recipes = new Set();
    
    game_data.recipe_data.forEach((recipe, idx) => {
        // Skip recipes we've already filtered out (e.g. cheats)
        if (recipe_ingredients[idx] === undefined) return;

        recipe_max_ing_level[idx] = 0;
        recipe_ing_satisfied_count[idx] = 0;
        
        // Handle no-ingredient recipes (e.g. mining) based on user's choice
        if (recipe_ingredients[idx].length === 0) {
            const products = recipe_products[idx];
            // This mining/source recipe is only valid if the user has enabled its products as available ores.
            if (products.every(p => availableOres.has(p))) {
                recipe_levels[idx] = 0;
                processed_recipes.add(idx);
            }
            // If not available, this recipe path is disabled. We just ignore it.
            // If another synthesis path exists for the product, the BFS will find it.
            // If not, the product will correctly remain without a level.
        }
    });

    // 4. Run BFS.
    while (queue.length > 0) {
        let current_item = queue.shift();
        let current_level = item_levels[current_item];
        
        // 找到使用该物品的所有配方
        if (item_to_recipes_using_it[current_item]) {
            item_to_recipes_using_it[current_item].forEach(recipe_idx => {
                if (processed_recipes.has(recipe_idx)) return;
                
                // 更新配方状态
                recipe_max_ing_level[recipe_idx] = Math.max(recipe_max_ing_level[recipe_idx], current_level);
                recipe_ing_satisfied_count[recipe_idx]++;
                
                // 检查配方是否解锁
                let total_needed = recipe_ingredients[recipe_idx].length;
                
                if (recipe_ing_satisfied_count[recipe_idx] >= total_needed) {
                    // 配方解锁
                    let new_level = recipe_max_ing_level[recipe_idx] + 1;
                    recipe_levels[recipe_idx] = new_level;
                    processed_recipes.add(recipe_idx);
                    
                    // 更新产物
                    recipe_products[recipe_idx].forEach(prod => {
                        // 如果产物还没等级，或者找到了更短路径（BFS保证第一次就是最短，前提是边权为1）
                        // 注意：这里边权是1（配方+1级）。
                        if (item_levels[prod] === undefined) {
                            item_levels[prod] = new_level;
                            queue.push(prod);
                        }
                    });
                }
            });
        }
    }
    
    return recipe_levels;
}

// 基础原矿列表 (包含所有可以采集/抽取的资源)
const BASE_ORES = [
    '铁矿', '铜矿', '煤矿', '石矿', '原油', '水', '木材', '植物燃料', 
    '硅石', '钛石', '氢', '可燃冰', '分形硅石', '有机晶体', 
    '金伯利矿石', '硫酸', '刺笋结晶', '光栅石', '单极磁石'
];

// 辅助函数：提取所有可能的原矿（用于初始化设置列表）
export function extractPotentialOres(game_data) {
    let potentialOres = new Set(BASE_ORES);
    
    // 1. 遍历所有配方，找到无输入的配方产物
    game_data.recipe_data.forEach(recipe => {
        let recipe_name = recipe["名称"] || "";
        if (recipe_name.includes("[无中生有]")) {
            return;
        }
        if (Object.keys(recipe["原料"]).length === 0) {
            Object.keys(recipe["产物"]).forEach(p => potentialOres.add(p));
        }
    });
    
    // 2. 遍历所有 Type=1 的物品 (如果能访问到 Type)
    // 我们已经在 GameData.jsx 中添加了 item_types 映射
    if (game_data.item_types) {
        for (let item_name in game_data.item_types) {
            // Type 1 usually means raw resources
            if (game_data.item_types[item_name] === 1) {
                potentialOres.add(item_name);
            }
        }
    }
    
    return Array.from(potentialOres).sort();
}
