import React, {useContext, useState, useMemo} from 'react';
import {GameInfoContext, GlobalStateContext, SettingsSetterContext, SchemeDataSetterContext} from './contexts';
import {ItemIcon} from './icon';
import {updateRecipeChoices} from './recipe_selector';
import {sortItemsByGridIndex} from './utils';

export function MiningSettings() {
    const game_info = useContext(GameInfoContext);
    const global_state = useContext(GlobalStateContext);
    const set_settings = useContext(SettingsSetterContext);
    const set_scheme_data = useContext(SchemeDataSetterContext);
    
    const [expanded, setExpanded] = useState(false);
    
    const potential_ores = useMemo(() => {
        const base_ores = ['铁矿', '铜矿', '煤矿', '石矿', '原油', '水', '木材', '植物燃料', '硅石', '钛石', '氢', '可燃冰', '分形硅石', '有机晶体', '金伯利矿石', '硫酸', '刺笋结晶', '光栅石', '单极磁石'];
        const additional_ores = (game_info.potential_ores || []).filter(ore => !base_ores.includes(ore));
        
        // Combine and deduplicate
        const combined = Array.from(new Set([...base_ores, ...additional_ores]));
        
        // Sort by GridIndex to match game UI order
        return sortItemsByGridIndex(combined, game_info.game_data.item_grid);
    }, [game_info.potential_ores, game_info.game_data.item_grid]);

    const disabled_ores = new Set(global_state.settings.disabled_ores || []);
    
    const toggleOre = (ore) => {
        let new_disabled = new Set(disabled_ores);
        if (new_disabled.has(ore)) {
            new_disabled.delete(ore);
        } else {
            new_disabled.add(ore);
        }
        const disabledArray = Array.from(new_disabled);
        set_settings({disabled_ores: disabledArray});

        // Force GlobalState update? 
        // No, ContextProvider updates GlobalState when settings change.
        // However, we might want to manually trigger scheme update if needed.
        // Actually, set_settings updates the context, which updates GlobalState, which recalculates recipe_levels.
        
        // Automatically update recipe choices for the toggled ore
        const new_scheme = updateRecipeChoices(global_state.scheme_data, game_info.game_data, game_info.item_data, disabledArray, [ore]);
        set_scheme_data(new_scheme);
    };
    
    const toggleAll = () => {
        let disabledArray = [];
        if (disabled_ores.size > 0) {
            // Enable all
            disabledArray = [];
        } else {
            // Disable all (not very useful but consistent)
            disabledArray = [...potential_ores];
        }
        set_settings({disabled_ores: disabledArray});
        
        // Automatically update recipe choices
        const new_scheme = updateRecipeChoices(global_state.scheme_data, game_info.game_data, game_info.item_data, disabledArray);
        set_scheme_data(new_scheme);
    };

    if (potential_ores.length === 0) return null;

    return (
        <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center cursor-pointer"
                 onClick={() => setExpanded(!expanded)}>
                <span className="fw-bold">可用原矿/资源设置 (影响配方级别计算)</span>
                <span className="small text-muted">{expanded ? '收起' : '展开'}</span>
            </div>
            {expanded && (
                <div className="card-body">
                    <div className="mb-2">
                        <button className="btn btn-sm btn-outline-secondary me-2" onClick={toggleAll}>
                            {disabled_ores.size > 0 ? "全部启用" : "全部禁用"}
                        </button>
                        <small className="text-muted">
                            取消勾选代表该资源不可直接获取，必须通过合成获得（如果存在合成配方），这将提高相关产物的生产级别。
                        </small>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        {potential_ores.map(ore => {
                            const is_disabled = disabled_ores.has(ore);
                            return (
                                <div key={ore} 
                                     className={`d-flex align-items-center border rounded p-1 cursor-pointer user-select-none ${is_disabled ? 'bg-light text-muted opacity-50' : 'bg-white border-primary'}`}
                                     onClick={() => toggleOre(ore)}
                                     style={{minWidth: '120px'}}>
                                    <div className="me-2">
                                        <input type="checkbox" checked={!is_disabled} onChange={() => {}} 
                                               style={{pointerEvents: 'none'}}/>
                                    </div>
                                    <ItemIcon item={ore} size={24}/>
                                    <span className="ms-1 small text-nowrap">{ore}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
