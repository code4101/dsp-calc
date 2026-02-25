//import structuredClone from '@ungap/structured-clone';
import {createContext, useEffect, useState} from 'react';
import {GameInfo, GlobalState} from './global_state';
import {init_scheme_data} from './scheme_data';
import {default_game_data} from "./GameData.jsx";
import {useSetState} from "ahooks";

/** set_game_name_and_data(game_name, game_data) */
export const GameInfoSetterContext = createContext(null);
export const SchemeDataSetterContext = createContext(null);
/** set_settings({prop: value}) */
export const SettingsSetterContext = createContext(null);
export const GlobalStateContext = createContext(null);
export const SettingsContext = createContext(null);
export const GameInfoContext = createContext(null);

const RARE_ORES = [
    '硅石', '可燃冰', '单极磁石', '氢', '有机晶体', '硫酸'
    // '木材', '植物燃料', '金伯利矿石', '分形硅石', '光栅石', '刺笋结晶' // 用户反馈希望默认启用这些
];

const DEFAULT_SETTINGS = {
    mining_speed_oil: 3.0,
    mining_speed_hydrogen: 1.0,
    mining_speed_deuterium: 0.05,
    mining_speed_gas_hydrate: 0.8,
    mining_speed_helium: 0.02,
    mining_speed_ammonia: 0.3,
    mining_speed_nitrogen: 1.2,
    mining_speed_oxygen: 0.6,
    mining_speed_carbon_dioxide: 0.4,
    mining_speed_sulfur_dioxide: 0.6,

    hide_mines: false,
    covered_veins_small: 8,
    covered_veins_large: 16,
    mining_efficiency_large: 3.0,
    mining_speed_multiple: 1.0,
    enemy_drop_multiple: 1.0,
    icarus_manufacturing_speed: 1.0,
    fractionating_speed: 30,

    is_time_unit_minute: true,
    fixed_num: 2,
    stack_research_lab: 15,
    proliferate_itself: true,
    acc_rate: 1.0,
    inc_rate: 1.0,
    blue_buff: false,

    mineralize_list: [],
    natural_production_line: [],
    
    // New Settings for Level Calculation
    disabled_ores: RARE_ORES, // List of disabled ore names
};
export const DefaultSettingsContext = createContext(DEFAULT_SETTINGS);

export function ContextProvider({children}) {
    const [game_info, set_game_info] = useState(new GameInfo(default_game_data));

    const [scheme_data, set_scheme_data] = useState(init_scheme_data(default_game_data));

        const [settings, set_settings] = useSetState(() => {
        try {
            const storedSettings = localStorage.getItem('dsp-calc-settings');
            if (storedSettings) {
                const parsed = JSON.parse(storedSettings);
                // 自动启用用户反馈希望默认启用的矿物（针对老用户缓存的迁移逻辑）
                if (parsed.disabled_ores) {
                    const oresToEnable = ['木材', '植物燃料', '金伯利矿石', '分形硅石', '光栅石', '刺笋结晶'];
                    parsed.disabled_ores = parsed.disabled_ores.filter(ore => !oresToEnable.includes(ore));
                }
                // Merge with default settings to handle new/missing keys
                return {...DEFAULT_SETTINGS, ...parsed};
            }
        } catch (e) {
            console.error("Failed to parse settings from localStorage", e);
        }
        return DEFAULT_SETTINGS;
    });

    // Persist to localStorage on change
    useEffect(() => {
        try {
            localStorage.setItem('dsp-calc-settings', JSON.stringify(settings));
        } catch (e) {
            console.error("Failed to save settings to localStorage", e);
        }
    }, [settings]);

    console.log("[+] new GlobalState");
    let global_state = new GlobalState(game_info, scheme_data, settings);

    function set_game_data(game_data) {
        set_game_info(new GameInfo(game_data));
    }

    return <GameInfoContext.Provider value={game_info}>
        <GlobalStateContext.Provider value={global_state}>
            <GameInfoSetterContext.Provider value={set_game_data}>
                <SchemeDataSetterContext.Provider value={set_scheme_data}>
                    <SettingsSetterContext.Provider value={set_settings}>
                        <SettingsContext.Provider value={settings}>
                            {children}
                        </SettingsContext.Provider>
                    </SettingsSetterContext.Provider>
                </SchemeDataSetterContext.Provider>
            </GameInfoSetterContext.Provider>
        </GlobalStateContext.Provider>
    </GameInfoContext.Provider>
}
