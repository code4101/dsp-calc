import {Modal} from 'bootstrap';
import {useContext, useEffect, useRef, useState, useMemo} from 'react';
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

export function GroupedItemSelectPanel({ groupedItems, fuzz_result, onSelect, item_types, getRelatedItems, fixedItem }) {
    let fuzz_set = new Set(fuzz_result);
    
    // State for hover effect
    const [hoveredItem, setHoveredItem] = useState(null);

    // Determine which item is the "source" for highlighting
    // If hovering, use hoveredItem.
    // If not hovering but fixedItem (selected) is present, use fixedItem.
    // Otherwise null.
    const activeSourceItem = hoveredItem || fixedItem;

    const relatedMap = useMemo(() => {
        if (activeSourceItem && getRelatedItems) {
            return getRelatedItems(activeSourceItem);
        }
        return null;
    }, [activeSourceItem, getRelatedItems]);

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
    
    // Check if we are in highlight mode (any item is highlighted)
    // If we are, we should NOT separate buildings/items because it breaks the visual continuity of the graph.
    // The user wants to see connections, not categories.
    // Wait, the user specifically asked "Where did the categories go?".
    // So we should ALWAYS keep the categories.
    // The previous implementation kept them. Let's check why they might seem gone.
    // Ah, if `activeSourceItem` is set, `className` logic changes.
    // But the structure (HTML layout) is still:
    // Level -> Normal Items -> Buildings
    
    // Maybe the user means that when highlighting, the dimming makes the headers hard to see?
    // Or maybe because I removed the old table which had clear headers, and now this panel is used standalone?
    
    // The `GroupedItemSelectPanel` DOES have headers:
    // <div className="border-bottom border-secondary mb-2 text-white-50 small fw-bold">{levelLabel}</div>
    // And "建筑设施" separator.
    
    // Let's ensure these headers are visible even when dimming occurs.
    // Actually, the dimming only applies to the item icons (<div>...<ItemIcon/></div>), not the container or headers.
    
    return (
        <div className="p-3 py-2 rounded-3" style={{
            maxHeight: '80vh', 
            overflowY: 'auto', 
            minWidth: '750px',
            maxWidth: '90vw',
            paddingBottom: '50px'
        }}>
             {levels.map(lvl => {
                 const items = groupedItems[lvl];
                 
                 const buildings = items.filter(isBuilding);
                 const normalItems = items.filter(i => !isBuilding(i));
                 
                 const levelLabel = lvl == -1 ? '未知' : `Lv.${lvl}`;
                 
                const renderItems = (itemList) => (
                   <div className="d-flex flex-wrap gap-1">
                       {itemList.map(item => {
                           const isMatch = fuzz_set.has(item);
                           const relation = relatedMap && relatedMap.get(item);
                           
                           let className = "cursor-pointer rounded-1 border ";
                           let style = {};
                           
                           if (relatedMap) {
                               // Highlight mode active
                               if (relation) {
                                   if (relation.type === 'self') {
                                       className += "bg-primary border-white "; 
                                   } else if (relation.type === 'upstream') {
                                       const depth = relation.depth;
                                       const opacity = Math.max(0.3, 0.9 - (depth * 0.2));
                                       className += "bg-warning border-warning ";
                                       style = { 
                                           "--bs-bg-opacity": opacity, 
                                           "--bs-border-opacity": Math.min(1, opacity + 0.3) 
                                       };
                                   } else if (relation.type === 'downstream') {
                                       const depth = relation.depth;
                                       const opacity = Math.max(0.3, 0.9 - (depth * 0.2));
                                       className += "bg-success border-success ";
                                       style = { 
                                           "--bs-bg-opacity": opacity, 
                                           "--bs-border-opacity": Math.min(1, opacity + 0.3) 
                                       };
                                   }
                               } else {
                                   // Unrelated items - keep them visible but dimmed, 
                                   // but DO NOT hide them completely or break layout.
                                   className += "bg-body-secondary bg-opacity-10 opacity-25 grayscale border-transparent "; 
                               }
                           } else {
                               // Normal Mode (Search Filter)
                               className += "hover-bg-opacity-50 bg-body-secondary bg-opacity-10 border-transparent ";
                               if (!isMatch) {
                                   className += "opacity-25 ";
                               }
                           }

                           return (
                               <div key={item} 
                                    className={className}
                                    style={style}
                                    onClick={() => onSelect(item === fixedItem ? null : item)}
                                    onMouseEnter={() => setHoveredItem(item)}
                                    onMouseLeave={() => setHoveredItem(null)}
                               >
                                   <ItemIcon item={item} size={40} tooltip={true}/>
                               </div>
                           );
                       })}
                   </div>
                );
                 
                 return (
                    <div key={lvl} className="d-flex mb-2 align-items-start">
                        <div className="me-2 pt-2 text-secondary fw-bold text-nowrap" style={{width: '45px', fontSize: '0.9rem'}}>
                            {levelLabel}
                        </div>
                        <div className="flex-grow-1">
                            {/* Render Normal Items First */}
                            {normalItems.length > 0 && (
                                <div className="mb-1">
                                    {renderItems(normalItems)}
                                </div>
                            )}
                            
                            {/* Render Buildings Second (if any) with a subtle separator if needed, or just below */}
                            {buildings.length > 0 && (
                                <div className={`${normalItems.length > 0 ? "mt-1 pt-1 border-top border-secondary border-opacity-10" : ""}`}>
                                    {renderItems(buildings)}
                                </div>
                            )}
                        </div>
                    </div>
                 );
             })}
             
             {/* Empty placeholder level to ensure tooltip space */}
             <div className="d-flex mb-2 align-items-start" style={{height: '50px', visibility: 'hidden'}}>
                <div className="me-2 pt-2 text-secondary fw-bold text-nowrap" style={{width: '45px', fontSize: '0.9rem'}}>
                    Lv.X
                </div>
                <div className="flex-grow-1"></div>
             </div>
        </div>
    );
}

export function ItemSelect({item, set_item, text, btn_class, groupedItems, getRelatedItems}) {
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
                            <GroupedItemSelectPanel groupedItems={groupedItems} fuzz_result={fuzz_result} onSelect={on_select_item} item_types={item_types} getRelatedItems={getRelatedItems} />
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
