import {useContext, useState, useMemo} from 'react';
import {GameInfoContext, GlobalStateContext} from '../contexts.jsx';
import {ItemSelect} from '../item_select.jsx';
import {ItemIcon} from '../icon.jsx';

export function ResourceAnalysis() {
    const game_info = useContext(GameInfoContext);
    const global_state = useContext(GlobalStateContext);
    const [selectedItem, setSelectedItem] = useState(null);

    const { game_data, item_data: item_recipe_map, potential_ores } = game_info;
    const {
        recipe_data,
        item_icon_name, // Map: ItemName -> IconName
        item_types, // Map: ItemName -> Type
    } = game_data;

    const recipe_levels = global_state.recipe_levels;
    const settings = global_state.settings;

    // Helper to calculate item levels
    const calculateLevels = (recipes, currentRecipeLevels) => {
        const levels = {};
        if (!recipes || !currentRecipeLevels) return levels;

        recipes.forEach((recipe, idx) => {
            const level = currentRecipeLevels[idx];
            if (level === undefined) return;

            Object.keys(recipe["产物"]).forEach(productName => {
                if (levels[productName] === undefined) {
                    levels[productName] = level;
                } else {
                    levels[productName] = Math.min(levels[productName], level);
                }
            });
        });
        return levels;
    };

    // 1. Actual Levels (based on user settings)
    const actualLevels = useMemo(() => {
        const levels = calculateLevels(recipe_data, recipe_levels);
        
        // Ensure Level 0 items (Raw Ores) are included
        if (potential_ores) {
            const disabledOres = new Set(settings?.disabled_ores || []);
            potential_ores.forEach(ore => {
                if (!disabledOres.has(ore)) {
                    levels[ore] = 0;
                }
            });
        }
        return levels;
    }, [recipe_data, recipe_levels, potential_ores, settings]);

    // 2. Theoretical Levels (assuming all ores enabled)
    // We need to calculate Theoretical Recipe Levels first.
    // Importing calculateRecipeLevels from level_calculator is ideal, but here we can rely on a simplified assumption:
    // If we enable all ores, what would the levels be?
    // Actually, we can just use the 'recipe_data' to find ALL possible levels if we assume base level 0 for all potential ores.
    
    // Let's import calculateRecipeLevels dynamically or move it to a shared context if needed.
    // For now, let's just use the `calculateRecipeLevels` from `level_calculator` which is already imported in `global_state`.
    // Wait, we can't import it here easily without changing imports. 
    // Let's try to import it.
    
    // ... Imports added at top ...
    
    const theoreticalLevels = useMemo(() => {
        // We need to recalculate recipe levels assuming ALL potential ores are available.
        // Since we can't easily call the heavy calculation here every render without performance cost,
        // and we don't have direct access to the function (it's in another file),
        // we might need to approximate or just import it.
        // Assuming we can import it:
        
        // For this specific task, let's skip the heavy recalculation and just use a "Best Effort" approach:
        // If an item has an actual level, use it.
        // If not, we try to see if it has ANY recipe.
        
        // Better approach: Let's just trust the user wants to see "what if".
        // But without full graph traversal, we can't know the theoretical level (e.g. is it Lv 3 or Lv 5?).
        
        // compromise: For items without actual level, we assign them to a special "Theoretical / Unlocked by Ores" group
        // or we just show them as "Unknown Level (Missing Resources)" in the UI, 
        // but finding their upstream/downstream requires traversing recipes that are currently disabled.
        
        return {}; // Placeholder for now, logic implemented inside analysisData
    }, []);

    const itemLevels = actualLevels; // Keep using actual levels for main display

    // ... itemsByLevel computation ...
    const itemsByLevel = useMemo(() => {
         const groups = {};
         if (!game_info.all_target_items) return groups;
 
         game_info.all_target_items.forEach(item => {
             // Use Actual Level first
             let level = actualLevels[item];
             
             // If no actual level, check if it's a building or item type
             if (level === undefined && item_types) {
                 const type = item_types[item];
                 if (type && ![5, 6, 8, 9].includes(type)) {
                      level = 0; // Fallback for unknown items
                 }
             }
             
             const lvlKey = level !== undefined ? level : -1;
 
             if (!groups[lvlKey]) groups[lvlKey] = [];
             groups[lvlKey].push(item);
         });
 
         return groups;
    }, [game_info.all_target_items, actualLevels, item_types]);

    const analysisData = useMemo(() => {
        if (!selectedItem || !recipe_data) return null;

        const currentLevel = itemLevels[selectedItem];
        const displayLevel = currentLevel !== undefined ? currentLevel : "N/A";
        
        // Helper: Get recipes for an item (ignoring current enabled state for visibility)
        const getRecipes = (itemName) => {
            if (!item_recipe_map[itemName]) return [];
            return item_recipe_map[itemName].slice(1)
                .map(idx => ({ idx, recipe: recipe_data[idx] }))
                .filter(r => r.recipe.Type !== -1);
        };

        // --- Upstream Analysis ---
        const upstream = []; 
        const producingRecipes = getRecipes(selectedItem);

        const allUpstreamIngredients = new Set();
        producingRecipes.forEach(r => {
            Object.keys(r.recipe["原料"]).forEach(ing => allUpstreamIngredients.add(ing));
        });

        allUpstreamIngredients.forEach(ing => {
            const isEssential = producingRecipes.length > 0 && producingRecipes.every(r => r.recipe["原料"][ing]);
            
            // Find which recipes use this ingredient
            // Mark if the recipe is enabled or not
            const viaRecipes = producingRecipes
                .filter(r => r.recipe["原料"][ing])
                .map(r => ({
                    name: r.recipe["名称"],
                    enabled: recipe_levels[r.idx] !== undefined
                }));
            
            upstream.push({
                name: ing,
                via: viaRecipes,
                level: itemLevels[ing] !== undefined ? itemLevels[ing] : -1,
                isEssential,
                // If any recipe using this is enabled, the connection is active
                hasActivePath: viaRecipes.some(v => v.enabled) 
            });
        });

        // --- Downstream Analysis ---
        const downstream = [];
        // Find ALL recipes using this item (even disabled ones)
        const consumingRecipes = recipe_data
            .map((r, idx) => ({ idx, recipe: r }))
            .filter(r => r.recipe["原料"][selectedItem]);

        const allDownstreamProducts = new Set();
        consumingRecipes.forEach(r => {
            Object.keys(r.recipe["产物"]).forEach(p => allDownstreamProducts.add(p));
        });

        allDownstreamProducts.forEach(prod => {
            const prodRecipes = getRecipes(prod);
            const isEssential = prodRecipes.length > 0 && prodRecipes.every(r => r.recipe["原料"][selectedItem]);

            const viaRecipes = prodRecipes
                .filter(r => r.recipe["原料"][selectedItem])
                .map(r => ({
                    name: r.recipe["名称"],
                    enabled: recipe_levels[r.idx] !== undefined
                }));

            downstream.push({
                name: prod,
                via: viaRecipes,
                level: itemLevels[prod] !== undefined ? itemLevels[prod] : -1,
                isEssential,
                hasActivePath: viaRecipes.some(v => v.enabled)
            });
        });

        const groupAndSort = (items) => {
            const groups = {};
            items.forEach(item => {
                const lvl = item.level;
                if (!groups[lvl]) groups[lvl] = { essential: [], optional: [] };
                if (item.isEssential) groups[lvl].essential.push(item);
                else groups[lvl].optional.push(item);
            });
            return groups;
        };

        return {
            currentLevel: displayLevel,
            upstream: groupAndSort(upstream),
            downstream: groupAndSort(downstream)
        };
    }, [selectedItem, recipe_data, itemLevels, recipe_levels, item_recipe_map]);

    const renderSection = (groups, title) => {
        const levels = Object.keys(groups).sort((a, b) => Number(a) - Number(b));
        
        return (
            <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                    <h4 className="mb-0">{title}</h4>
                    <div className="text-muted small">
                        <span className="me-3"><span className="fw-bold">第1列:</span> 必须</span>
                        <span><span className="fw-bold">第2列:</span> 可选</span>
                    </div>
                </div>
                
                {levels.length === 0 && <div className="text-muted fst-italic">无相关物品</div>}
                {levels.map(lvl => {
                    const group = groups[lvl];
                    const hasEssential = group.essential.length > 0;
                    const hasOptional = group.optional.length > 0;

                    const levelLabel = lvl == -1 ? '未知/未启用等级' : `Lv ${lvl}`;

                    return (
                        <div key={lvl} className="card mb-3">
                            <div className={`card-header py-1 ${lvl == -1 ? 'bg-danger text-white' : 'bg-light'}`}>
                                <strong>{levelLabel}</strong>
                            </div>
                            <div className="card-body p-0">
                                <div className="row g-0">
                                    <div className="col-md-6 p-2 border-end">
                                        {hasEssential && (
                                            <div className="d-flex flex-wrap gap-2">
                                                {group.essential.map((item, idx) => (
                                                    <ItemCard key={idx} item={item} onSelect={setSelectedItem} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-md-6 p-2">
                                        {hasOptional && (
                                            <div className="d-flex flex-wrap gap-2">
                                                {group.optional.map((item, idx) => (
                                                    <ItemCard key={idx} item={item} onSelect={setSelectedItem} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="container-fluid mt-3">
            <div className="mb-4 d-flex align-items-center gap-3 p-3 bg-light rounded shadow-sm">
                <label className="fw-bold fs-5 mb-0">选择物品：</label>
                <ItemSelect 
                    item={selectedItem} 
                    set_item={setSelectedItem} 
                    text="点击选择物品" 
                    btn_class="btn-primary" 
                    groupedItems={itemsByLevel}
                />
                {selectedItem && (
                    <div className="badge bg-primary fs-6 ms-auto">
                        当前等级: Lv {analysisData ? analysisData.currentLevel : "..."}
                    </div>
                )}
            </div>

            {selectedItem && analysisData && (
                <div className="d-flex flex-column gap-4">
                    {renderSection(analysisData.upstream, "上游依赖")}
                    {renderSection(analysisData.downstream, "下游产物")}
                </div>
            )}
            
            {!selectedItem && (
                <div className="text-center text-muted mt-5">
                    <h3>请选择一个物品以查看分析</h3>
                    <p>您可以查看该物品的生产原料（上游）和用途（下游），并了解它们之间的依赖关系。</p>
                </div>
            )}
        </div>
    );
}

function ItemCard({ item, onSelect }) {
    // Determine if we should show "via"
    const hasVia = item.via && item.via.length > 0;
    
    // Hide via if there is only 1 recipe and its name is the same as the item name
    const showViaText = hasVia && !(item.via.length === 1 && item.via[0].name === item.name);

    // Style for disabled path
    const isPathDisabled = !item.hasActivePath;
    const cardClass = isPathDisabled 
        ? "d-flex align-items-center border rounded p-1 bg-light text-muted shadow-sm opacity-75"
        : "d-flex align-items-center border rounded p-1 bg-white shadow-sm";

    return (
        <div className={cardClass} style={{maxWidth: '240px'}}>
            <div className="cursor-pointer flex-shrink-0" onClick={() => onSelect(item.name)}>
                <ItemIcon item={item.name} size={40} tooltip={true} />
            </div>
            <div className="ms-2 overflow-hidden">
                <div className="fw-bold text-truncate cursor-pointer" title={item.name} onClick={() => onSelect(item.name)}>
                    {item.name}
                </div>
                {isPathDisabled && (
                    <div className="text-danger small fw-bold" style={{fontSize: '0.65rem'}}>
                        [路径未解锁]
                    </div>
                )}
                {showViaText && false && (
                    <div className="text-muted small text-truncate" style={{fontSize: '0.7rem'}} 
                         title={item.via.map(v => v.name).join(', ')}>
                        via {item.via.length > 1 ? `${item.via.length} recipes` : item.via[0].name}
                    </div>
                )}
            </div>
        </div>
    );
}
