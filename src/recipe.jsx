import React, { useContext } from 'react';
import {ItemIcon} from './icon';
import { GlobalStateContext } from './contexts';

export function Recipe({recipe}) {
    const global_state = useContext(GlobalStateContext);
    
    // Find recipe index to look up level
    // This is a bit inefficient (O(N)), but recipe list is not huge in context of one render?
    // Wait, global_state.game_data.recipe_data contains all recipes.
    // The `recipe` prop passed here is an object reference from that array.
    // So we can find its index by reference? Or maybe we should pass index/ID.
    
    // Better way: Let's assume the parent component passes the level or we find it.
    // game_data.recipe_data is an array.
    // Let's try to find the index.
    
    // Optimization: If recipe object has an ID or we can find it easily.
    // Actually, in `GameData.jsx`, we are pushing objects to `recipe_data`.
    // We added "级别" property to the object itself in the static version.
    // BUT now we want DYNAMIC level.
    // The `recipe` object in `game_data` is persistent.
    // `global_state` is re-created when settings change?
    // Let's check `contexts.jsx`: `global_state` is a new object when settings change.
    // `global_state.recipe_levels` is what we want.
    
    // We need the index of this recipe in `game_data.recipe_data`.
    // Since `recipe` is a reference to an object in that array, we can use `indexOf`.
    let recipeIndex = global_state.game_data.recipe_data.indexOf(recipe);
    let level = global_state.recipe_levels[recipeIndex];

    function findNonZeroPosition(num) {
        const numStr = num.toString();
        const dotIndex = numStr.indexOf('.');//1
        if (dotIndex === -1) {
            // 没有小数点，返回undefined
            return undefined;
        }
        // 寻找第一个不为0的数字的位置
        for (let i = dotIndex + 1; i < numStr.length; i++) {
            if (numStr[i] !== '0') {
                return i - dotIndex; // 返回小数点后的位置
            }
        }
        // 所有小数位都是0，返回undefined
        return undefined;
    }

    function item_to_doms([item, count]) {
        const count_used = count >= 1
            ? Math.round(count * 100) / 100
            : count.toFixed(findNonZeroPosition(count) + 2);
        return <React.Fragment key={item}>
            <ItemIcon item={item} size={28}/>
            <span className="me-1 ssmall align-self-end">{count_used}</span>
        </React.Fragment>;
    }

    const input_doms = Object.entries(recipe["原料"]).map(item_to_doms);
    const output_doms = Object.entries(recipe["产物"]).map(item_to_doms);
    //时间向上取整，因为工厂也是向上取整
    const time = Math.ceil(recipe["时间"] * 100) / 100;
    // const level = recipe["级别"]; // Use dynamic level instead

    return <span className="d-inline-flex position-relative pe-4">
        {level !== undefined && level >= 0 && <span className="position-absolute text-danger fw-bold font-monospace" style={{top: "-8px", right: "-8px", fontSize: "0.85em"}}>Lv.{level}</span>}
        {input_doms.length > 0 && <>
            {input_doms}
            <span className="me-1 position-relative"
                  style={{fontSize: "32px", lineHeight: "20px"}}>
                &#10230;
                <span className="position-absolute text-center text-recipe-time"
                      style={{left: 0, width: "100%", top: "50%", fontSize: "12px"}}>
                    {time}s
                </span>
            </span>
        </>}
        {output_doms}

        {input_doms.length === 0 && <small className="ms-1 align-self-end text-recipe-time">
            ({time}s)
        </small>}
    </span>;
}

export function HorizontalMultiButtonSelect({choice, options, onChange, no_gap, className}) {
    let gap_class = no_gap ? "" : "gap-1";
    let option_doms = options.map(({value, label, item_icon, className}) => {
        let selected_class = choice == value ? "bg-selected" : "bg-unselected";
        // insert 1px white border if [no_gap == true]
        let gap_class = no_gap ? "border-between border-white" : "";
        return <div key={value}
                    className={`py-1 px-1 text-nowrap d-flex align-items-center cursor-pointer small
                ${selected_class} ${gap_class} ${className || ""}`}
                    onClick={() => onChange(value)}
        >{item_icon && <ItemIcon item={item_icon} size={32}/>}
            {label && <span className="mx-1">{label}</span>}
        </div>;
    })

    return <div className={`d-flex ${gap_class} ${className || ""}`}>{option_doms}</div>;
}