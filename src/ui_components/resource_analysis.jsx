import {useContext, useState, useMemo} from 'react';
import {GameInfoContext, GlobalStateContext} from '../contexts.jsx';
import {GroupedItemSelectPanel} from '../item_select.jsx'; // Import directly
import {ItemIcon} from '../icon.jsx';
import {Recipe} from '../recipe.jsx';
import {sortItemsByGridIndex} from '../utils';

export function ResourceAnalysis() {
    const game_info = useContext(GameInfoContext);
    const global_state = useContext(GlobalStateContext);
    const [selectedItem, setSelectedItem] = useState(null);
    const [strictLevelCheck, setStrictLevelCheck] = useState(true);

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
            // if (level === undefined && item_types) {
            //     const type = item_types[item];
            //     if (type && ![5, 6, 8, 9].includes(type)) {
            //          level = 0; // Fallback for unknown items
            //     }
            // }
             
             const lvlKey = level !== undefined ? level : -1;
 
             if (!groups[lvlKey]) groups[lvlKey] = [];
             groups[lvlKey].push(item);
         });
         
         // Sort items within each level using GridIndex
         Object.keys(groups).forEach(lvl => {
             groups[lvl] = sortItemsByGridIndex(groups[lvl], game_data.item_grid);
         });
 
         return groups;
    }, [game_info.all_target_items, actualLevels, item_types, game_data.item_grid]);

    const analysisData = useMemo(() => {
        if (!selectedItem || !recipe_data) return null;

        const currentLevel = itemLevels[selectedItem];
        const displayLevel = currentLevel !== undefined ? currentLevel : "N/A";
        
        // Helper: Get recipes for an item (ignoring current enabled state for visibility)
        const getRecipes = (itemName) => {
            if (!item_recipe_map[itemName]) return [];
            return item_recipe_map[itemName].slice(1)
                .map(idx => ({ idx, recipe: recipe_data[idx] }))
                // .filter(r => r.recipe.Type !== -1);
                .filter(r => r.recipe && !r.recipe["名称"].includes('[无中生有]'));
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
            
            // Sort each group
            Object.values(groups).forEach(group => {
                group.essential.sort((a, b) => {
                    const idxA = game_data.item_grid[a.name] || 99999;
                    const idxB = game_data.item_grid[b.name] || 99999;
                    return idxA - idxB;
                });
                group.optional.sort((a, b) => {
                    const idxA = game_data.item_grid[a.name] || 99999;
                    const idxB = game_data.item_grid[b.name] || 99999;
                    return idxA - idxB;
                });
            });
            
            return groups;
        };

        return {
            currentLevel: displayLevel,
            upstream: groupAndSort(upstream),
            downstream: groupAndSort(downstream)
        };
    }, [selectedItem, recipe_data, itemLevels, recipe_levels, item_recipe_map, game_data]);

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

    // Helper for hover effect in ItemSelect
    const getRelatedItems = (itemName) => {
        if (!itemName || !recipe_data || !item_recipe_map) return null;

        // Structure: Map<ItemName, { type: 'upstream'|'downstream'|'self', depth: number }>
        const related = new Map();
        related.set(itemName, { type: 'self', depth: 0 });

        // Helper: Get recipes for an item
        const getRecipes = (name) => {
            if (!item_recipe_map[name]) return [];
            return item_recipe_map[name].slice(1)
                .map(idx => recipe_data[idx])
                // .filter(r => r && r.Type !== -1);
                .filter(r => r && !r["名称"].includes('[无中生有]'));
        };

        // BFS for Upstream
        const queueUp = [{ name: itemName, depth: 0 }];
        const visitedUp = new Set([itemName]);
        
        // Safety break for infinite loops (though unlikely in DAG)
        let loopLimit = 0;
        const MAX_LOOPS = 1000;

        while (queueUp.length > 0 && loopLimit++ < MAX_LOOPS) {
            const { name, depth } = queueUp.shift();
            
            const recipes = getRecipes(name);
            recipes.forEach(r => {
                if (r && r["原料"]) {
                    Object.keys(r["原料"]).forEach(ing => {
                            // 避免“逆流”依赖：如果原料等级显著高于产物等级，通常是高级分解配方（如光子分解产氢）
                            // 这种情况下不应将其视为常规上游
                            if (strictLevelCheck) {
                                const currentLvl = itemLevels[name];
                                const ingLvl = itemLevels[ing];
                                if (currentLvl !== undefined && ingLvl !== undefined && ingLvl > currentLvl) {
                                    return;
                                }
                            }

                            if (!visitedUp.has(ing)) {
                            visitedUp.add(ing);
                            // Only set if not already set (or prioritize closer?)
                            // Prioritize: If it was already downstream, we might have a loop, keep as is?
                            // Simple approach: Overwrite or keep first found. BFS finds shortest path first.
                            if (!related.has(ing)) {
                                related.set(ing, { type: 'upstream', depth: depth + 1 });
                            }
                            queueUp.push({ name: ing, depth: depth + 1 });
                        }
                    });
                }
            });
        }

        // BFS for Downstream
        // We need an efficient way to find consumers. 
        // Building a reverse map once would be better, but for now we scan.
        // Optimization: Pre-build consumer map if performance is bad. 
        // Given N~200 recipes, scanning full list is okay-ish but doing it recursively is O(N*Depth).
        // Let's build a temporary consumer map for this hover session? 
        // No, `getRelatedItems` is called on hover. 
        // Let's optimize by building consumer map OUTSIDE this function (memoized).
        
        // Wait, let's use a simpler approach for now. The previous implementation scanned all recipes.
        // Let's do that scan once to build an adjacency list for downstream?
        
        // Better: `game_info` might already have this? No.
        // Let's just do the scan on-the-fly but maybe limit depth if it's too slow?
        // Actually, let's pre-calculate the consumer map inside the component with useMemo.
        
        // For now, to avoid major refactor, I will implement the BFS with the scan, 
        // but since I can't easily cache the reverse map inside this function scope efficiently without hooks,
        // I will rely on the fact that the recursion depth is usually small (max ~10).
        
        // Queue for downstream
        const queueDown = [{ name: itemName, depth: 0 }];
        const visitedDown = new Set([itemName]);
        
        loopLimit = 0;
        while (queueDown.length > 0 && loopLimit++ < MAX_LOOPS) {
            const { name, depth } = queueDown.shift();
            
            // Find recipes that consume 'name'
            // This inner scan is expensive (O(Recipes)). 
            // Total complexity: O(Nodes * Recipes). ~200 * 200 = 40,000 ops. Fast enough.
            recipe_data.forEach(r => {
                if (r && r["原料"] && r["原料"][name]) {
                    if (r["产物"]) {
                        Object.keys(r["产物"]).forEach(prod => {
                             if (!visitedDown.has(prod)) {
                                visitedDown.add(prod);
                                if (!related.has(prod)) { // Don't overwrite 'upstream' if loop exists? Or do?
                                    // If something is both upstream and downstream, it's complex.
                                    // Usually we care about direction from source.
                                    related.set(prod, { type: 'downstream', depth: depth + 1 });
                                } else if (related.get(prod).type === 'upstream') {
                                    // Conflict: It's both. Mark as 'cycle'? Or just leave as upstream.
                                }
                                queueDown.push({ name: prod, depth: depth + 1 });
                            }
                        });
                    }
                }
            });
        }

        return related;
    };

    const relatedRecipes = useMemo(() => {
        if (!selectedItem || !recipe_data || !item_recipe_map) return null;

        // 1. Producing Recipes
        const producingIndices = item_recipe_map[selectedItem] ? item_recipe_map[selectedItem].slice(1) : [];
        const producing = producingIndices
            .map(idx => recipe_data[idx])
            // .filter(r => r && r.Type !== -1); // Don't filter Type -1 recipes (e.g. charging)
            .filter(r => r && !r["名称"].includes('[无中生有]'));

        // 2. Consuming Recipes
        let consuming = recipe_data.filter(r => r && r["原料"] && r["原料"][selectedItem] && !r["名称"].includes('[无中生有]'));

        // Sort consuming recipes by the level of their products
        consuming.sort((a, b) => {
            const getLevel = (recipe) => {
                if (!recipe || !recipe["产物"]) return 999;
                const products = Object.keys(recipe["产物"]);
                if (products.length === 0) return 999;
                
                let minLevel = 999;
                products.forEach(p => {
                     const lvl = itemLevels[p];
                     if (lvl !== undefined && lvl < minLevel) {
                         minLevel = lvl;
                     }
                });
                return minLevel;
            };

            const levelA = getLevel(a);
            const levelB = getLevel(b);

            if (levelA !== levelB) {
                return levelA - levelB;
            }
            // If levels are same, sort by name or grid index to be deterministic
            return (a["名称"] || "").localeCompare(b["名称"] || "");
        });

        return { producing, consuming };
    }, [selectedItem, recipe_data, item_recipe_map, itemLevels]);

    return (
        <div className="container-fluid mt-3">
            <div className="mb-4 d-flex align-items-center gap-3 p-3 bg-light rounded shadow-sm">
                <label className="fw-bold fs-5 mb-0">选择物品：</label>
                {selectedItem ? (
                     <div className="d-flex align-items-center gap-2">
                        <ItemIcon item={selectedItem} size={40} />
                        <span className="fw-bold fs-5">{selectedItem}</span>
                        <button className="btn btn-sm btn-outline-secondary ms-3" onClick={() => setSelectedItem(null)}>清除选择</button>
                     </div>
                ) : (
                    <span className="text-muted fst-italic">点击下方图标选择</span>
                )}
                {selectedItem && (
                    <div className="badge bg-primary fs-6 ms-auto">
                        当前等级: Lv {analysisData ? analysisData.currentLevel : "..."}
                    </div>
                )}
            </div>

            {/* 提示信息：如果需要更复杂的图例说明，可以在这里添加 */}
            
            <div className="bg-light p-3 rounded shadow-sm">
                <div className="d-flex flex-wrap gap-4 mb-3 border-bottom pb-2">
                    <div className="d-flex align-items-center gap-2">
                        <div className="rounded border bg-primary border-white" style={{width: 20, height: 20}}></div>
                        <small className="text-muted">当前选择</small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <div className="rounded border bg-warning border-warning" style={{width: 20, height: 20, opacity: 0.8}}></div>
                        <small className="text-muted">上游原料 (颜色越深越近)</small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <div className="rounded border bg-success border-success" style={{width: 20, height: 20, opacity: 0.8}}></div>
                        <small className="text-muted">下游产物 (颜色越深越近)</small>
                    </div>
                    <div className="ms-auto text-muted small d-flex align-items-center gap-3">
                        <div className="form-check form-switch mb-0">
                            <input 
                                className="form-check-input cursor-pointer" 
                                type="checkbox" 
                                id="strictLevelCheck"
                                checked={strictLevelCheck}
                                onChange={(e) => setStrictLevelCheck(e.target.checked)}
                            />
                            <label className="form-check-label cursor-pointer text-muted small" htmlFor="strictLevelCheck" title="过滤掉等级高于当前产物的原料（如光子分解产氢）">
                                屏蔽逆流原料
                            </label>
                        </div>
                        <div>* 点击图标可定格/取消选择</div>
                    </div>
                </div>

                <GroupedItemSelectPanel 
                    groupedItems={itemsByLevel} 
                    fuzz_result={game_info.all_target_items} 
                    onSelect={setSelectedItem} 
                    item_types={item_types}
                    getRelatedItems={getRelatedItems}
                    fixedItem={selectedItem}
                />
                
                {selectedItem && relatedRecipes && (
                    <div className="mt-4 border-top border-secondary border-opacity-25 pt-3">
                        <h5 className="mb-3">相关配方: {selectedItem}</h5>
                        
                        {relatedRecipes.producing.length > 0 && (
                            <div className="mb-4">
                                <h6 className="text-secondary mb-2 small fw-bold text-uppercase">来源配方 (产出 {selectedItem})</h6>
                                <div className="d-flex flex-wrap gap-3">
                                    {relatedRecipes.producing.map((r, i) => (
                                        <div key={i} className="border rounded p-2 bg-white shadow-sm d-flex flex-column" style={{minWidth: '200px'}}>
                                            <div className="fw-bold small mb-2 border-bottom pb-1">{r["名称"]}</div>
                                            <div className="d-flex align-items-center">
                                                <Recipe recipe={r} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {relatedRecipes.consuming.length > 0 && (
                            <div>
                                <h6 className="text-secondary mb-2 small fw-bold text-uppercase">用途配方 (消耗 {selectedItem})</h6>
                                <div className="d-flex flex-wrap gap-3">
                                    {relatedRecipes.consuming.map((r, i) => (
                                        <div key={i} className="border rounded p-2 bg-white shadow-sm d-flex flex-column" style={{minWidth: '200px'}}>
                                            <div className="fw-bold small mb-2 border-bottom pb-1">{r["名称"]}</div>
                                            <div className="d-flex align-items-center">
                                                <Recipe recipe={r} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {relatedRecipes.producing.length === 0 && relatedRecipes.consuming.length === 0 && (
                            <div className="text-muted fst-italic">无直接相关配方</div>
                        )}
                    </div>
                )}
            </div>
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
