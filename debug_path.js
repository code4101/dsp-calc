
import { readFileSync } from 'fs';

try {
    const rawData = readFileSync('data/Vanilla.json', 'utf8');
    const data = JSON.parse(rawData);
    
    const recipes = data.recipes;
    const items = data.items;
    
    // Build Item ID -> Name Map
    const itemIdMap = {};
    const itemNameMap = {};
    items.forEach(item => {
        itemIdMap[item.ID] = item.Name;
        itemNameMap[item.Name] = item.ID;
    });
    
    // Build Item Name -> Producing Recipes Map
    const itemProducingRecipes = {};
    
    recipes.forEach((recipe, idx) => {
        if (recipe.Name.includes('[无中生有]')) return;
        
        recipe.Results.forEach(resId => {
            const resName = itemIdMap[resId];
            if (!resName) return;
            
            if (!itemProducingRecipes[resName]) {
                itemProducingRecipes[resName] = [];
            }
            itemProducingRecipes[resName].push(recipe);
        });
    });
    
    const targetItem = "行星内物流运输站";
    const sourceItem = "奇异物质";
    
    console.log(`Searching path from ${targetItem} (Upstream) to ${sourceItem}...`);
    
    const queue = [{ name: targetItem, path: [] }];
    const visited = new Set([targetItem]);
    
    let found = false;
    
    while (queue.length > 0) {
        const { name, path } = queue.shift();
        
        if (name === sourceItem) {
            console.log(`FOUND PATH: ${path.join(' -> ')} -> ${name}`);
            found = true;
            break; 
        }
        
        const recipes = itemProducingRecipes[name] || [];
        
        recipes.forEach(recipe => {
            recipe.Items.forEach(ingId => {
                const ingName = itemIdMap[ingId];
                if (ingName && !visited.has(ingName)) {
                    visited.add(ingName);
                    queue.push({ 
                        name: ingName, 
                        path: [...path, `${name} (via ${recipe.Name})`] 
                    });
                    
                    if (ingName === sourceItem) {
                         console.log(`FOUND PATH: ${path.join(' -> ')} -> ${name} (via ${recipe.Name}) -> ${ingName}`);
                         found = true;
                    }
                }
            });
        });
        
        if (found) break;
    }
    
    if (!found) {
        console.log("No path found.");
    }
    
    // Check direct usage of Strange Matter
    console.log("\nRecipes using Strange Matter:");
    recipes.forEach(r => {
        if (r.Items.includes(itemNameMap["奇异物质"])) {
             const results = r.Results.map(id => itemIdMap[id]);
             console.log(`- Recipe: ${r.Name}, Outputs: ${results.join(', ')}`);
        }
    });

} catch (e) {
    console.error(e);
}
