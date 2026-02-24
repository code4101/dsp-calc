
import fs from 'fs';
import path from 'path';

try {
    const vanillaPath = 'd:/home/chenkunze/slns+/dsp-calc/data/Vanilla.json';
    if (fs.existsSync(vanillaPath)) {
        const raw = fs.readFileSync(vanillaPath, 'utf8');
        const data = JSON.parse(raw);
        
        const idToName = {};
        data.items.forEach(i => idToName[i.ID] = i.Name);
        
        const nameToId = {};
        data.items.forEach(i => nameToId[i.Name] = i.ID);
        
        const targetItems = ['有机晶体', '刺笋结晶', '金伯利矿石', '可燃冰', '分形硅石', '光栅石', '单极磁石', '硫酸', '重氢'];
        
        console.log("--- Recipe Analysis ---");
        
        targetItems.forEach(itemName => {
            const targetId = nameToId[itemName];
            if (!targetId) {
                console.log(`\nItem: ${itemName} (ID not found)`);
                return;
            }
            console.log(`\nItem: ${itemName} (ID: ${targetId})`);
            
            const recipes = data.recipes.filter(r => {
                // Check if item is in Results
                return r.Results.includes(targetId);
            });
            
            if (recipes.length === 0) {
                console.log("  No recipes produce this item.");
            }
            
            recipes.forEach(r => {
                const ingredients = r.Items.map(id => idToName[id] || id);
                console.log(`  Recipe: ${r.Name} (ID: ${r.ID})`);
                console.log(`    Ingredients: ${ingredients.length > 0 ? ingredients.join(', ') : 'NONE (Mining/Raw)'}`);
                console.log(`    Time: ${r.TimeSpend}`);
            });
        });
    } else {
        console.log("Vanilla.json not found at " + vanillaPath);
    }
} catch (e) {
    console.error(e);
}
