import React, {useMemo} from 'react';
import {ItemIcon} from './icon';
import itemColors from './data/item_colors.json';

// 工厂类型颜色定义
const FACTORY_COLORS = {
    "熔炉": "#E74C3C",      // Red
    "制造台": "#3498DB",    // Blue
    "原油精炼厂": "#F39C12", // Orange
    "化工厂": "#2ECC71",    // Green
    "强子对撞机": "#9B59B6", // Purple
    "矩阵研究站": "#E91E63", // Pink
    "分馏塔": "#82E0AA",    // Light Green
    "采矿机": "#95A5A6",    // Gray
    "抽水站": "#95A5A6",    // Gray
    "原油萃取站": "#95A5A6", // Gray
    "轨道采集器": "#95A5A6", // Gray
    "其他": "#BDC3C7"       // Light Gray
};

const FACTORY_KEYWORDS = {
    "熔炉": "熔炉",
    "制造台": "制造台",
    "精炼厂": "原油精炼厂",
    "化工厂": "化工厂",
    "对撞机": "强子对撞机",
    "研究站": "矩阵研究站",
    "分馏塔": "分馏塔",
    "采矿机": "采矿机",
    "大型采矿机": "采矿机",
    "抽水站": "抽水站",
    "原油萃取站": "原油萃取站",
    "轨道采集器": "轨道采集器",
    "大气采集站": "轨道采集器", // Treat as collector
    "组装厂": "制造台", // Mod support?
};

// 格式化数字：保留最多2位小数，去除末尾0
const formatNumber = (num) => {
    const n = Number(num);
    if (Math.abs(n) < 1e-6) return "0";
    if (n >= 10000) return n.toExponential(2);
    // 处理浮点数精度问题，例如 0.99999999 -> 1
    const rounded = Number(n.toFixed(6));
    return Number(rounded.toFixed(2)); // 再转回2位小数显示
};

// 求最大公约数
const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);

// 求最小公倍数
const lcm = (a, b) => {
    if (a === 0 || b === 0) return 0;
    return Math.abs((a * b) / gcd(a, b));
};

// 将小数转换为分数 (近似)
const toFraction = (num, tolerance = 1e-4) => {
    if (Math.abs(Math.round(num) - num) < tolerance) {
        return { n: Math.round(num), d: 1 };
    }
    
    let bestD = 1;
    let bestDist = Math.abs(Math.round(num) - num);
    
    // 尝试寻找分母，限制最大分母以避免性能问题和不合理的倍率
    for (let d = 2; d <= 3600; d++) {
        const n = num * d;
        const dist = Math.abs(Math.round(n) - n);
        if (dist < tolerance) {
            return { n: Math.round(n), d: d };
        }
        if (dist < bestDist) {
            bestD = d;
            bestDist = dist;
        }
    }
    return { n: Math.round(num * bestD), d: bestD };
};

// 字符串转颜色 (Hash)
const stringToColor = (str) => {
    if (!str) return "#adb5bd";
    
    // 优先使用从图标计算的平均颜色
    if (itemColors[str]) {
        return itemColors[str];
    }

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // 使用 HSL 颜色空间确保颜色鲜艳且可辨识
    // H: 0-360, S: 60-80%, L: 40-50%
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 45%)`; 
};

// 贝塞尔曲线连线组件
    const Connection = ({x1, y1, x2, y2, amount, totalAmount, strokeWidth, color, item, isHighlighted, isDimmed, bendY}) => {
        // 计算路径
        let path = '';
        
        if (bendY && bendY > y1 && bendY > y2) {
            // 下沉绕行路径
            // 策略：起点 -> 下沉 -> 平移 -> 上浮/下沉 -> 终点
            const radius = 20; // 圆角半径
            const midX = (x1 + x2) / 2;
            
            // 使用三次贝塞尔曲线分段拟合
            // 1. 起点平滑下沉
            const cp1x = x1 + 50; 
            const cp1y = y1;
            const cp2x = x1 + 50;
            const cp2y = bendY;
            
            // 2. 终点平滑连接
            const cp3x = x2 - 50;
            const cp3y = bendY;
            const cp4x = x2 - 50;
            const cp4y = y2;
            
            // 简单的三段式曲线：
            // M start -> Q control end
            // 这里为了简单，我们用一段 C 曲线模拟前半段下沉，再用直线，再用曲线
            // 或者直接用一个很夸张的 C 曲线？不行，会穿过中间。
            
            // 采用路径：M -> Q -> L -> Q
            path = `M ${x1} ${y1} 
                    C ${x1 + 60} ${y1}, ${x1 + 60} ${bendY}, ${x1 + 100} ${bendY}
                    L ${x2 - 100} ${bendY}
                    C ${x2 - 60} ${bendY}, ${x2 - 60} ${y2}, ${x2} ${y2}`;
        } else {
            // 标准路径
            // 控制点，使曲线平滑
            const midX = (x1 + x2) / 2;
            // 调整曲率：如果是同层或者跨度很大，可以适当调整控制点
            // 这里简化处理，仍然使用水平中点
            path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
        }
        
        // 统一连线颜色
        const strokeColor = color || "#adb5bd";
        
        // 动态样式
        const opacity = isHighlighted ? 1 : (isDimmed ? 0.1 : 0.6);
        const actualWidth = isHighlighted ? Math.max(strokeWidth, 2) : strokeWidth;

        return (
            <g className="connection-group">
                <path d={path} stroke={strokeColor} strokeWidth={actualWidth} fill="none" opacity={opacity} 
                      style={{transition: 'opacity 0.2s, stroke-width 0.2s'}}>
                    <title>{item ? `${item}\n` : ''}流量: {formatNumber(amount)}, 总流向: {formatNumber(totalAmount)}/min</title>
                </path>
                {/* 箭头 */}
                <path d={`M ${x2} ${y2} L ${x2-4} ${y2-3} L ${x2-4} ${y2+3} Z`} fill={strokeColor} opacity={opacity} 
                      style={{transition: 'opacity 0.2s'}}/>
            </g>
        );
    };

// 图例组件
const Legend = () => {
    // 去重显示主要类型
    const legendItems = [
        {name: "熔炉", color: FACTORY_COLORS["熔炉"]},
        {name: "制造台", color: FACTORY_COLORS["制造台"]},
        {name: "化工厂", color: FACTORY_COLORS["化工厂"]},
        {name: "精炼厂", color: FACTORY_COLORS["原油精炼厂"]},
        {name: "对撞机", color: FACTORY_COLORS["强子对撞机"]},
        {name: "研究站", color: FACTORY_COLORS["矩阵研究站"]},
        {name: "分馏塔", color: FACTORY_COLORS["分馏塔"]},
        {name: "采集/其他", color: FACTORY_COLORS["采矿机"]},
    ];

    return (
        <div className="d-flex flex-wrap gap-3 mb-3 p-2 border-bottom">
            <span className="fw-bold small me-2">连线颜色说明:</span>
            {legendItems.map(item => (
                <div key={item.name} className="d-flex align-items-center small">
                    <span className="d-inline-block me-1 rounded-circle" style={{width: 10, height: 10, backgroundColor: item.color}}></span>
                    <span>{item.name}</span>
                </div>
            ))}
        </div>
    );
};

export function ProductionGraph({result_dict, item_graph, mineralize_list, game_data, item_data, scheme_data, settings, side_products}) {
    // 1. 构建节点 (基于配方合并)
    const nodes = useMemo(() => {
        const nodeMap = new Map();

        // 辅助函数：获取物品对应的 Key (配方ID 或 资源ID)
        const getKey = (item) => {
            if (mineralize_list[item]) return `resource-${item}`;
            // 尝试获取配方ID
            const recipeId = item_data[item]?.[scheme_data.item_recipe_choices[item]];
            if (recipeId !== undefined) return `recipe-${recipeId}`;
            return `item-${item}`; // 兜底
        };

        // 辅助函数：计算工厂信息
        const calculateFactoryInfo = (item, amount) => {
            if (mineralize_list[item]) return null;

            try {
                const recipe_id = item_data[item][scheme_data.item_recipe_choices[item]];
                if (recipe_id === undefined) return null;

                const recipe = game_data.recipe_data[recipe_id];
                if (!recipe) return null;

                const factory_kind = recipe["设施"];
                const factory_idx = scheme_data.scheme_for_recipe[recipe_id]["建筑"];
                const factory_list = game_data.factory_data[factory_kind];

                if (!factory_list || !factory_list[factory_idx]) return null;

                const factory_name = factory_list[factory_idx]["名称"];
                
                const time_tick = settings?.is_time_unit_minute ? 60 : 1;
                // 注意：这里假设 amount 是主产物的总产量
                const factory_per_yield = 1 / item_graph[item]["产出倍率"] / factory_list[factory_idx]["倍率"];
                let build_number = amount / time_tick * factory_per_yield;
                
                return {
                    name: factory_name,
                    count: formatNumber(build_number),
                    rawCount: build_number // 用于计算 LCM
                };
            } catch (e) {
                console.error("Error calc factory info", e);
                return null;
            }
        };

        // 辅助函数：获取工厂颜色
        const getFactoryColor = (factoryName) => {
            if (!factoryName) return FACTORY_COLORS["其他"];
            for (const [keyword, type] of Object.entries(FACTORY_KEYWORDS)) {
                if (factoryName.includes(keyword)) {
                    return FACTORY_COLORS[type];
                }
            }
            return FACTORY_COLORS["其他"];
        };

        // 1.1 处理副产物 (先处理，以便计算主产物的净需求)
        // side_products: { item: { sourceItem: amount } }
        const sideProductAmounts = {}; // item -> total side amount
        
        if (side_products) {
            Object.keys(side_products).forEach(item => {
                const sources = side_products[item];
                if (!sources) return;

                Object.entries(sources).forEach(([sourceItem, amount]) => {
                    if (amount <= 1e-6) return;

                    // 找到生产 sourceItem 的节点 (即 sourceItem 的主配方节点)
                    const sourceKey = getKey(sourceItem);
                    
                    if (!nodeMap.has(sourceKey)) {
                         nodeMap.set(sourceKey, {
                            id: sourceKey,
                            type: sourceKey.startsWith('recipe') ? 'recipe' : 'resource',
                            outputs: [],
                            inputs: [],
                            factory: null,
                            mainItem: sourceItem // 暂定 sourceItem 为主产物
                        });
                    }
                    const node = nodeMap.get(sourceKey);
                    
                    // 添加副产物到该节点的输出列表
                    // 检查是否已存在 (避免重复)
                    let output = node.outputs.find(o => o.name === item);
                    if (!output) {
                        output = { name: item, amount: 0, type: 'side' };
                        node.outputs.push(output);
                    }
                    output.amount += amount;

                    // 记录副产物总量
                    sideProductAmounts[item] = (sideProductAmounts[item] || 0) + amount;
                });
            });
        }

        // 1.2 处理主产物 (result_dict)
        Object.keys(result_dict).forEach(item => {
            if (result_dict[item] <= 1e-6) return;

            const key = getKey(item);
            
            // 计算主产物的净需求量 (减去作为副产物已经生产的部分)
            const totalRequired = result_dict[item];
            const alreadyProduced = sideProductAmounts[item] || 0;
            const netAmount = totalRequired - alreadyProduced;

            if (netAmount > 1e-6) {
                if (!nodeMap.has(key)) {
                    nodeMap.set(key, {
                        id: key,
                        type: key.startsWith('recipe') ? 'recipe' : 'resource',
                        outputs: [],
                        inputs: [],
                        factory: null,
                        mainItem: item
                    });
                }
                const node = nodeMap.get(key);
                
                // 添加主产物
                let output = node.outputs.find(o => o.name === item);
                if (!output) {
                    output = { name: item, amount: 0, type: 'main' };
                    node.outputs.unshift(output); // 主产物放前面
                } else {
                    // 如果已经存在 (可能是之前作为 sourceItem 被创建了节点，但那是为了挂载副产物)
                    output.type = 'main'; // 确认为主产物
                }
                output.amount += netAmount;
            }
        });

        // 1.3 完善节点信息
        const nodeList = Array.from(nodeMap.values());
        nodeList.forEach(node => {
            // 计算工厂信息 (仅针对 recipe 类型)
            if (node.type === 'recipe') {
                // 找到主产物用于计算
                const mainOutput = node.outputs.find(o => o.type === 'main');
                if (mainOutput) {
                    node.factory = calculateFactoryInfo(mainOutput.name, mainOutput.amount);
                    if (node.factory) {
                        node.color = getFactoryColor(node.factory.name);
                    }
                    
                    // 计算原料 inputs
                    if (item_graph[mainOutput.name] && item_graph[mainOutput.name]["原料"]) {
                        const ingredients = item_graph[mainOutput.name]["原料"];
                        node.inputs = Object.keys(ingredients).sort((a, b) => {
                            // 按数量（比率）降序，数量相同保持相对顺序
                            return ingredients[b] - ingredients[a];
                        });
                    }
                }
            } else {
                // 资源类型
                node.color = FACTORY_COLORS["采矿机"];
                // 资源没有原料输入
            }
            
            // 确保 outputs 排序：按数量多到少排序
            node.outputs.sort((a, b) => {
                return b.amount - a.amount;
            });
        });

        return nodeList;
    }, [result_dict, side_products, mineralize_list, item_data, scheme_data, game_data, item_graph, settings]);

    // 2. 计算层级
    const levels = useMemo(() => {
        const nodeLevels = {};
        const calculating = new Set();

        // 建立物品到节点的映射 (用于查找原料来源)
        const itemToNodes = {}; 
        nodes.forEach(node => {
            node.outputs.forEach(out => {
                if (!itemToNodes[out.name]) itemToNodes[out.name] = [];
                itemToNodes[out.name].push(node);
            });
        });

        function getLevel(nodeId) {
            if (nodeLevels[nodeId] !== undefined) return nodeLevels[nodeId];
            if (calculating.has(nodeId)) return 0;
            
            calculating.add(nodeId);
            
            const node = nodes.find(n => n.id === nodeId);
            let maxIngLevel = -1;
            
            if (node && node.inputs) {
                node.inputs.forEach(ingName => {
                    const sourceNodes = itemToNodes[ingName];
                    if (sourceNodes) {
                        sourceNodes.forEach(sourceNode => {
                            if (sourceNode.id !== nodeId) {
                                maxIngLevel = Math.max(maxIngLevel, getLevel(sourceNode.id));
                            }
                        });
                    }
                });
            }
            
            calculating.delete(nodeId);
            
            const level = maxIngLevel + 1;
            nodeLevels[nodeId] = level;
            return level;
        }

        nodes.forEach(node => getLevel(node.id));
        return nodeLevels;
    }, [nodes]);

    // 3. 布局计算
    const layout = useMemo(() => {
        const layers = [];
        nodes.forEach(node => {
            const lv = levels[node.id];
            if (!layers[lv]) layers[lv] = [];
            layers[lv].push(node);
        });

        // 简单排序：ID排序
        layers.forEach(layer => {
            if(layer) layer.sort((a, b) => a.id.localeCompare(b.id));
        });

        // 启发式布局优化：重心法 (Barycenter Method) 减少交叉
        // 重复几轮 前向/后向 扫描
        for (let pass = 0; pass < 3; pass++) {
            // 前向扫描 (Forward): 根据上一层节点位置调整当前层
            for (let i = 1; i < layers.length; i++) {
                const layer = layers[i];
                const prevLayer = layers[i-1];
                if (!layer || !prevLayer) continue;

                // 计算每个节点的重心权重 (输入来源的平均位置)
                const nodeWeights = layer.map(node => {
                    let sum = 0;
                    let count = 0;
                    if (node.inputs) {
                        node.inputs.forEach(ingName => {
                            // 查找上一层哪个节点产出这个原料
                            prevLayer.forEach((prevNode, prevIdx) => {
                                const outIndex = prevNode.outputs.findIndex(o => o.name === ingName);
                                if (outIndex !== -1) {
                                    // 加上输出端口偏移
                                    const portOffset = (outIndex - (prevNode.outputs.length - 1) / 2) * 0.5;
                                    sum += prevIdx + portOffset;
                                    count++;
                                }
                            });
                        });
                    }
                    // 如果没有输入来源，保持原位
                    return count === 0 ? 9999 + (node.id.charCodeAt(0) || 0) : sum / count;
                });

                // 根据权重排序
                const pairs = layer.map((n, idx) => ({ node: n, weight: nodeWeights[idx], originalIdx: idx }));
                pairs.sort((a, b) => {
                    if (Math.abs(a.weight - b.weight) < 0.001) return a.originalIdx - b.originalIdx;
                    return a.weight - b.weight;
                });
                
                // 更新层级顺序
                layers[i] = pairs.map(p => p.node);
            }

            // 后向扫描 (Backward): 根据下一层节点位置调整当前层
            for (let i = layers.length - 2; i >= 0; i--) {
                const layer = layers[i];
                const nextLayer = layers[i+1];
                if (!layer || !nextLayer) continue;

                // 计算每个节点的重心权重 (输出目标的平均位置)
                const nodeWeights = layer.map(node => {
                    let sum = 0;
                    let count = 0;
                    
                    // 查找下一层哪些节点消耗这个节点的产出
                    node.outputs.forEach(out => {
                        nextLayer.forEach((nextNode, nextIdx) => {
                            if (nextNode.inputs) {
                                const inputIndex = nextNode.inputs.indexOf(out.name);
                                if (inputIndex !== -1) {
                                    // 加上端口偏移权重
                                    // inputIndex 越小，说明连线越靠上，源节点也应该越靠上
                                    // 偏移量范围 -0.5 到 0.5
                                    const portOffset = (inputIndex - (nextNode.inputs.length - 1) / 2) * 0.5;
                                    sum += nextIdx + portOffset;
                                    count++;
                                }
                            }
                        });
                    });
                    
                    // 如果没有连接到下一层，保持在底部或基于ID稳定排序
                    return count === 0 ? 9999 + (node.id.charCodeAt(0) || 0) : sum / count;
                });

                // 根据权重排序
                const pairs = layer.map((n, idx) => ({ node: n, weight: nodeWeights[idx], originalIdx: idx }));
                pairs.sort((a, b) => {
                    if (Math.abs(a.weight - b.weight) < 0.001) return a.originalIdx - b.originalIdx;
                    return a.weight - b.weight;
                });

                // 更新层级顺序
                layers[i] = pairs.map(p => p.node);
            }
        }

        const nodeWidth = 200; // 增加宽度以容纳左侧工厂图标
        const headerHeight = 0; 
        const rowHeight = 40;
        const padding = 50;
        const xGap = 120;
        const yGap = 20;

        const nodePositions = {};
        let maxWidth = 0;
        let maxHeight = 0;

        layers.forEach((layerItems, level) => {
            if (!layerItems) return;
            
            const x = padding + level * (nodeWidth + xGap);
            let currentY = padding;
            
            layerItems.forEach(node => {
                // 计算节点高度：基于产出物数量
                // 至少要有 50px 高度来显示工厂图标
                const contentHeight = node.outputs.length * rowHeight;
                const height = Math.max(60, contentHeight + 10); 
                
                nodePositions[node.id] = {
                    x, 
                    y: currentY, 
                    width: nodeWidth, 
                    height,
                    level
                };
                
                currentY += height + yGap;
                maxWidth = Math.max(maxWidth, x + nodeWidth);
                maxHeight = Math.max(maxHeight, currentY);
            });
        });

        // 计算每层的边界 (用于连线避让)
        const levelBounds = {};
        layers.forEach((layerItems, level) => {
            if (!layerItems) return;
            let maxY = 0;
            layerItems.forEach(node => {
                const pos = nodePositions[node.id];
                if (pos) maxY = Math.max(maxY, pos.y + pos.height);
            });
            levelBounds[level] = maxY;
        });

        return { nodePositions, maxWidth: maxWidth + padding, maxHeight: maxHeight + padding, levelBounds };
    }, [nodes, levels]);

    // 4. 生成连线
    const {connections, globalGcd} = useMemo(() => {
        const conns = [];
        const { nodePositions, levelBounds } = layout;
        const rowHeight = 40;
        const flows = []; // 收集所有流量值
        
        // 记录底部通道的占用情况，防止重叠
        // level -> currentBottomOffset
        const bottomOffsets = {}; 

        // 建立物品到节点的映射 (带位置信息)
        const itemSources = {}; 
        nodes.forEach(node => {
            const pos = nodePositions[node.id];
            if (!pos) return;
            
            node.outputs.forEach((out, idx) => {
                if (!itemSources[out.name]) itemSources[out.name] = [];
                // 计算产出行的 Y 坐标中心
                // 假设产出列表垂直居中或者从顶开始
                // 这里我们让它从顶部开始，padding-top 5px
                const rowY = pos.y + 5 + idx * rowHeight + rowHeight / 2;
                
                itemSources[out.name].push({
                    nodeId: node.id,
                    x: pos.x + pos.width,
                    y: rowY,
                    amount: out.amount,
                    type: out.type
                });
            });
        });

        nodes.forEach(node => {
            const targetPos = nodePositions[node.id];
            if (!targetPos) return;

            // 遍历该节点的原料需求
            if (node.inputs) {
                node.inputs.forEach(ingName => {
                    const sources = itemSources[ingName];
                    if (sources && sources.length > 0) {
                        // 计算目标节点该原料的总需求量
                        let totalNeed = 0;
                        const mainOut = node.outputs.find(o => o.type === 'main');
                        if (mainOut) {
                            // 注意：item_graph[mainOut.name] 可能不存在，或者原料为空
                            // 我们需要确保能找到配方比例
                            const itemInfo = item_graph[mainOut.name];
                            if (itemInfo && itemInfo["原料"] && itemInfo["原料"][ingName]) {
                                const ratio = itemInfo["原料"][ingName];
                                totalNeed = mainOut.amount * ratio;
                            }
                        }
                        
                        // 计算所有来源的总供应量 (用于分配比例)
                        const totalSupply = sources.reduce((sum, s) => sum + s.amount, 0);

                        sources.forEach(source => {
                            // 避免自环
                            if (source.nodeId === node.id) return;
                            
                            // 估算该连线的流量：按供应比例分配需求
                            // flow = totalNeed * (source.amount / totalSupply)
                            const flow = totalSupply > 0 ? totalNeed * (source.amount / totalSupply) : 0;
                            
                            if (flow > 1e-4) {
                                flows.push(flow);
                                
                                // 计算输入锚点的 Y 坐标偏移
                                const inputIndex = node.inputs.indexOf(ingName);
                                const inputCount = node.inputs.length;
                                const inputY = targetPos.y + (targetPos.height * (inputIndex + 1)) / (inputCount + 1);

                                // 连线路径优化：检查是否跨层
                                let bendY = null;
                                // 检查层级跨度
                                const sourceLevel = layout.nodePositions[source.nodeId]?.level;
                                const targetLevel = layout.nodePositions[node.id]?.level;
                                
                                if (sourceLevel !== undefined && targetLevel !== undefined && targetLevel > sourceLevel + 1) {
                                    // 跨层连接，寻找中间最大高度
                                    let maxIntermediateY = 0;
                                    for (let l = sourceLevel; l < targetLevel; l++) {
                                        if (levelBounds[l]) {
                                            maxIntermediateY = Math.max(maxIntermediateY, levelBounds[l]);
                                        }
                                    }
                                    
                                    // 分配一个通道高度，避免重叠
                                    // 使用简单的哈希或者累加器
                                    const channelKey = `${sourceLevel}-${targetLevel}`; // 共享通道
                                    // 这里我们简单地全局累加底部偏移，或者分层累加
                                    // 为了简单有效，我们统一在最大高度下方分配空间
                                    // 每次分配 15px
                                    if (!bottomOffsets['global']) bottomOffsets['global'] = 20;
                                    bendY = maxIntermediateY + bottomOffsets['global'];
                                    bottomOffsets['global'] += 15;
                                }

                                conns.push({
                                    x1: source.x,
                                    y1: source.y,
                                    x2: targetPos.x,
                                    y2: inputY, // 使用分散的锚点
                                    amount: flow, 
                                    totalAmount: source.amount, 
                                    item: ingName,
                                    sourceNodeId: source.nodeId,
                                    targetNodeId: node.id,
                                    bendY: bendY // 传递拐点Y坐标
                                });
                            }
                        });
                    }
                });
            }
        });
        
        // 计算全局 GCD (用于确定连线宽度基准)
        let g = 0;
        if (flows.length > 0) {
            // 将浮点数转换为整数 (x10000)
            const intFlows = flows.map(f => Math.round(f * 10000));
            // 求所有整数的 GCD
            const arrayGcd = (arr) => {
                let result = arr[0];
                for (let i = 1; i < arr.length; i++) {
                    result = gcd(result, arr[i]);
                    if (result === 1) return 1;
                }
                return result;
            };
            const intGcd = arrayGcd(intFlows);
            // 还原为浮点数
            g = intGcd / 10000;
            if (g < 0.1) g = 0.1; 
        }

        return {connections: conns, globalGcd: g};
    }, [nodes, layout]);

    // 5. 计算连接线的最大高度（处理下沉绕行的情况）
    const maxConnectionY = useMemo(() => {
        let maxY = 0;
        connections.forEach(conn => {
            if (conn.bendY) {
                // bendY 是线条中心的 Y 坐标，加上线条宽度的一半和一些 padding
                maxY = Math.max(maxY, conn.bendY + 40);
            }
        });
        return maxY;
    }, [connections]);

    // 6. 计算建议倍率 (LCM)
    const suggestedMultiplier = useMemo(() => {
        let currentLcm = 1;
        for (const node of nodes) {
            if (node.factory && node.factory.rawCount > 1e-6) {
                const { d } = toFraction(node.factory.rawCount);
                if (d > 1) currentLcm = lcm(currentLcm, d);
            }
        }
        return (currentLcm > 1 && currentLcm <= 3600) ? currentLcm : null;
    }, [nodes]);

    // 状态管理：高亮
    const [hovered, setHovered] = React.useState(null); // { type: 'node'|'link', id: string }

    if (nodes.length === 0) return null;

    return (
        <div className="mt-4">
             <div className="mb-3">
                <h5 className="fw-bold">生产流程图</h5>
                {suggestedMultiplier && (
                    <div className="text-secondary small mt-1">
                        提示: 放大 {suggestedMultiplier} 倍可使工厂数量为整数
                    </div>
                )}
            </div>
            <div>
                <svg width={Math.max(layout.maxWidth, 100)} height={Math.max(layout.maxHeight, maxConnectionY, 100)}>
                    {/* 连线层 */}
                    {connections.map((conn, idx) => {
                        // 计算线条宽度
                        // 使用全局 GCD 作为基准单位
                        // GCD 对应 1px 宽度
                        // width = 1 * (amount / globalGcd)
                        let width = 1;
                        if (globalGcd > 0) {
                            width = 1 * (conn.amount / globalGcd);
                        }
                        // 限制最大宽度，例如 20px
                        width = Math.min(20, Math.max(1, width));

                        // 生成颜色
                        const color = stringToColor(conn.item);
                        
                        // 高亮逻辑
                        let isDimmed = false;
                        let isHighlighted = false;
                        
                        if (hovered) {
                            if (hovered.type === 'node') {
                                // 如果 hover 的是节点，高亮与该节点相连的线
                                isHighlighted = conn.sourceNodeId === hovered.id || conn.targetNodeId === hovered.id;
                                isDimmed = !isHighlighted;
                            } else if (hovered.type === 'item') {
                                // 如果 hover 的是物品（图例或图标），高亮该物品的所有连线
                                isHighlighted = conn.item === hovered.id;
                                isDimmed = !isHighlighted;
                            }
                        }

                        return (
                            <Connection 
                                key={`conn-${idx}`}
                                x1={conn.x1} y1={conn.y1}
                                x2={conn.x2} y2={conn.y2}
                                amount={conn.amount}
                                totalAmount={conn.totalAmount}
                                strokeWidth={width}
                                color={color}
                                item={conn.item}
                                isHighlighted={isHighlighted}
                                isDimmed={isDimmed}
                                bendY={conn.bendY}
                            />
                        );
                    })}
                    
                    {/* 节点层 */}
                    {nodes.map(node => {
                        const pos = layout.nodePositions[node.id];
                        if (!pos) return null;
                        
                        const isNodeHovered = hovered?.type === 'node' && hovered.id === node.id;
                        const isNodeDimmed = hovered && !isNodeHovered && hovered.type === 'node' && 
                                            // 检查是否与当前hover的节点有连接
                                            !connections.some(c => (c.sourceNodeId === hovered.id && c.targetNodeId === node.id) || 
                                                                 (c.targetNodeId === hovered.id && c.sourceNodeId === node.id));

                        return (
                            <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}
                               onMouseEnter={() => setHovered({type: 'node', id: node.id})}
                               onMouseLeave={() => setHovered(null)}
                               style={{cursor: 'pointer', opacity: isNodeDimmed ? 0.3 : 1, transition: 'opacity 0.2s'}}
                            >
                                {/* 节点背景 */}
                                <rect 
                                    width={pos.width} 
                                    height={pos.height} 
                                    rx="6" 
                                    fill={isNodeHovered ? '#f8f9fa' : 'white'} 
                                    stroke={isNodeHovered ? '#0d6efd' : '#dee2e6'} 
                                    strokeWidth={isNodeHovered ? 2 : 2}
                                    style={{filter: isNodeHovered ? 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))' : 'drop-shadow(0px 2px 2px rgba(0,0,0,0.05))', transition: 'all 0.2s'}}
                                />
                                
                                <foreignObject width={pos.width} height={pos.height}>
                                    <div className="d-flex h-100 align-items-center">
                                        {/* 左侧：工厂信息 */}
                                        <div className="d-flex flex-column align-items-center justify-content-center border-end bg-light" 
                                             style={{width: '60px', height: '100%', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px'}}>
                                            {node.factory ? (
                                                <>
                                                    <ItemIcon item={node.factory.name} size={32} tooltip={true}/>
                                                    <span className="fw-bold text-primary small mt-1">x{node.factory.count}</span>
                                                </>
                                            ) : (
                                                <span className="text-muted small">资源</span>
                                            )}
                                        </div>

                                        {/* 右侧：产物列表 */}
                                        <div className="flex-grow-1 d-flex flex-column justify-content-center py-1">
                                            {node.outputs.map((out, idx) => (
                                                <div key={idx} className="d-flex align-items-center px-2" style={{height: '40px'}}>
                                                    <div className="flex-shrink-0">
                                                        <ItemIcon item={out.name} size={28} />
                                                    </div>
                                                    <div className="ms-2 overflow-hidden flex-grow-1" style={{lineHeight: '1.2'}}>
                                                        <div className="text-truncate fw-bold small" title={out.name}>{out.name}</div>
                                                        <div className="text-muted" style={{fontSize: '11px'}}>
                                                            {formatNumber(out.amount)} /min
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </foreignObject>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
