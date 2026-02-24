import {Modal} from 'bootstrap';
import {useContext, useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {GameInfoContext} from './contexts.jsx';
import {ItemIcon} from './icon';
import fuzzysort from 'fuzzysort'
import {pinyin} from 'pinyin-pro';

function ItemSelectPanel({fuzz_result, onSelect, icon_grid}) {
    let fuzz_set = new Set(fuzz_result);

    const doms = icon_grid.icons.map(({col, row, item}) => {
        let class_opacity = fuzz_set.has(item) ? "" : "opacity-25";
        return <div key={col + "#" + row}
                    className={`bg-body-secondary bg-opacity-10 cursor-pointer hover-bg-opacity-50 ${class_opacity}`}
                    style={{gridRow: row, gridColumn: col}}
                    onClick={() => onSelect(item)}>
            <ItemIcon item={item} size={48}/>
        </div>;
    })

    return <div className="p-3 py-4 w-fit rounded-3 gap-1"
                style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${icon_grid.ncol}, max-content)`,
                    gridTemplateRows: `repeat(${icon_grid.nrow}, max-content)`,
                }}>
        {doms}
    </div>;
}

function GroupedItemSelectPanel({ groupedItems, fuzz_result, onSelect, item_types }) {
    let fuzz_set = new Set(fuzz_result);
    
    // Sort levels: 0, 1, 2, ... then -1 (Unknown)
    const levels = Object.keys(groupedItems).sort((a, b) => {
        const la = Number(a);
        const lb = Number(b);
        if (la === -1) return 1;
        if (lb === -1) return -1;
        return la - lb;
    });

    const isBuilding = (item) => {
        if (!item_types) return false;
        const type = item_types[item];
        // 5: Logistics, 6: Production, 8: Defense, 9: Support
        return [5, 6, 8, 9].includes(type);
    };

    return (
        <div className="p-3 py-2 rounded-3" style={{
            maxHeight: '80vh', 
            overflowY: 'auto', 
            minWidth: '600px',
            maxWidth: '90vw'
        }}>
             {levels.map(lvl => {
                 const items = groupedItems[lvl];
                 
                 const buildings = items.filter(isBuilding);
                 const normalItems = items.filter(i => !isBuilding(i));
                 
                 const levelLabel = lvl == -1 ? '未知/未启用等级' : `Lv ${lvl}`;
                 
                 const renderItems = (itemList) => (
                    <div className="d-flex flex-wrap gap-1">
                        {itemList.map(item => {
                            const isMatch = fuzz_set.has(item);
                            return (
                                <div key={item} 
                                     className={`cursor-pointer hover-bg-opacity-50 bg-body-secondary bg-opacity-10 rounded-1 ${isMatch ? '' : 'opacity-25'}`}
                                     onClick={() => onSelect(item)}>
                                    <ItemIcon item={item} size={40} tooltip={true}/>
                                </div>
                            );
                        })}
                    </div>
                 );
                 
                 return (
                    <div key={lvl} className="mb-3">
                        <div className="border-bottom border-secondary mb-2 text-white-50 small fw-bold">
                            {levelLabel}
                        </div>
                        
                        {/* Render Normal Items First */}
                        {normalItems.length > 0 && (
                            <div className="mb-2">
                                {renderItems(normalItems)}
                            </div>
                        )}
                        
                        {/* Render Buildings Second (if any) with a subtle separator if needed, or just below */}
                        {buildings.length > 0 && (
                            <div className="mt-1 pt-1 border-top border-secondary border-opacity-25">
                                <div className="text-white-50 small mb-1" style={{fontSize: '0.75em'}}>建筑设施</div>
                                {renderItems(buildings)}
                            </div>
                        )}
                    </div>
                 );
             })}
        </div>
    );
}

export function ItemSelect({item, set_item, text, btn_class, groupedItems}) {
    const ref = useRef();
    const ref_modal = useRef();
    const input_ref = useRef();

    const game_info = useContext(GameInfoContext);
    const all_target_items = game_info.all_target_items;
    const item_types = game_info.game_data.item_types; // Get item_types
    const [fuzz_result, set_fuzz_result] = useState([]);

    const search_targets = all_target_items.map(item => ({
        item: item,
        py_first: pinyin(item, {pattern: 'first', type: 'array'}).join(""),
        py_full: pinyin(item, {toneType: 'none'})
    }));

    const RESULT_LIMIT = 10;

    useEffect(() => {
        set_fuzz_result(game_info.all_target_items);
    }, [game_info]);

    function do_search(value) {
        if (!value) {
            set_fuzz_result(all_target_items);
        } else {
            let search_result = fuzzysort.go(value, search_targets, {
                keys: ["item", "py_first", "py_full"],
                limit: RESULT_LIMIT,
            });
            set_fuzz_result(search_result.map(e => e.obj.item));
        }
    }

    function on_select_item(item) {
        set_item(item);
        ref_modal.current.hide();
    }

    let search_result_doms = fuzz_result.length > RESULT_LIMIT ? [] : fuzz_result.map((item, i) => {
        let hl_class = i == 0 ? "bg-opacity-75" : "bg-opacity-25";
        return <>
            <div key={item} className={`text-white bg-secondary ${hl_class} rounded-3\
      p-1 d-flex align-items-center gap-2 cursor-pointer`}
                 onClick={() => on_select_item(item)}>
                <ItemIcon item={item} tooltip={false}/>
                <small>{item}</small>
            </div>
        </>
    });

    function on_search_keydown(e) {
        if (e.keyCode == 13 && fuzz_result.length > 0 && fuzz_result.length <= RESULT_LIMIT) {
            on_select_item(fuzz_result[0]);
        }
    }

    useEffect(() => {
        ref_modal.current = new Modal(ref.current);
    }, [ref]);

    btn_class = btn_class || "btn-outline-primary";

    function show() {
        ref_modal.current.show();
        if (input_ref.current) {
            input_ref.current.select();
            input_ref.current.focus();
        }
    }

    return <>
        <button className={`btn py-1 px-2 ${btn_class} d-inline-flex align-items-center`}
                onClick={show}>
            {item && <><ItemIcon item={item} size={24} tooltip={false}/>
                <span className="ms-1"></span></>}
            {(item) ?
                <small className="text-nowrap">{item}</small>
                : <span className="text-nowrap">{text}</span>}
        </button>

        {createPortal(
            <div ref={ref} className="modal" tabIndex="-1">
                <div className="modal-dialog mw-fit">
                    <div className="modal-content bg-dark flex-row" style={{"--bs-bg-opacity": 0.85}}>
                        {groupedItems ? (
                            <GroupedItemSelectPanel groupedItems={groupedItems} fuzz_result={fuzz_result} onSelect={on_select_item} item_types={item_types} />
                        ) : (
                            <ItemSelectPanel fuzz_result={fuzz_result} icon_grid={game_info.icon_grid}
                                         onSelect={on_select_item}/>
                        )}
                        <div className="p-3 d-flex flex-column gap-2">
                            <input ref={input_ref} className="round rounded-3 py-1 px-2 my-1"
                                   placeholder="搜索（支持拼音）"
                                   onChange={e => do_search(e.target.value)} onKeyDown={on_search_keydown}/>
                            {search_result_doms}
                        </div>
                    </div>
                </div>
            </div>
            , document.body)}
    </>;
}
