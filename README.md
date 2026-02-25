# html版戴森球量化计算器

![](https://img.shields.io/github/license/DSPCalculator/dsp-calc)
![](https://img.shields.io/github/stars/DSPCalculator/dsp-calc)
![Contributors](https://img.shields.io/github/contributors/DSPCalculator/dsp-calc)
![GitHub Release](https://img.shields.io/github/v/release/DSPCalculator/dsp-calc)

## ✨ code4101新增功能 (Extended Features)

本项目在原版基础上进行了扩展，新增了以下核心特性：

### 1. 产线等级系统 (Dynamic Tier System)
- **等级定义**：引入产线等级概念。将**原矿**定义为 **Lv.0**，基于 Lv.0 能直接生产的资源为 **Lv.1**，基于 Lv.1 生产的为 **Lv.2**，以此类推。
- **动态计算**：产线等级并非固定，而是根据当前配置的“可用原矿”动态计算。用户可以通过修改原矿配置（如模拟不同科技阶段），实时查看不同时期的产线层级变化。
- **量化集成**：在量化计算的每个配方中，均可直观查看其对应的产线等级。

### 2. 资源查看视图 (Resource Analysis)
- 新增 **"资源查看"** 标签页。
- 支持按 **产线等级** 分层浏览所有资源。
- 提供清晰的 **上下游依赖** 物品查询，方便规划生产物流。

### 3. 流程图功能 (Flowchart)
- 集成产线流程图生成功能，可视化展示复杂的生产依赖关系。

## 在线使用方式

- 新功能预览站: https://code4101.com/dsp/calculator
- 主站 (Netlify) https://dsp-calc.pro/ &emsp;&emsp; 分支/PR预览 https://b.dsp-calc.pro/

- Github Pages: https://dspcalculator.github.io/dsp-calc/

已经废弃的站点：~~https://shi-sang.gitee.io/dsp_calculator/~~

## 本地开发环境

- 下载nodejs，并确认npm指令可以运行
- `npm install`
- `npm run dev`，然后根据提示打开浏览器链接即可

## 部署

- 您可以使用本项目release分支内的静态文件直接部署
- 或使用 `npm run build` 来生成静态文件

## 简介

对于以戴森球计划为例的生产类游戏，通过提取循环关键物品（以下简称关键物品）简化生产关系图，
仅对其中不得不参与线性规划的物品进行线性规划，绝大部分只有一条生产路径的物品直接通过递归获得上游产线数据。减少了不必要的耗时和单纯形法潜在的指数时间复杂度的隐患
并且通过这种方式获得了由上游低级材料到下游高级材料的物品列表，利用这个物品列表进行动态规划可以用于自动计算最优增产决策

同时，在代码中以item_graph记录了一个物品的上下生产关系，之后可以通过这个来追踪物品的用途，
与其他量化计算器不同的另一点是这边的喷涂不是按增产剂等级而是按增产点数层数计算的，这是为了后期方便计算摇匀混喷的情况

还有许多铺好了路但是还没完善的功能，在此就不一一细说了

具体思路可见：https://www.bilibili.com/read/readlist/rl630834 中涉及量化计算器的部分

## 开发路线图：

### 功能完善

- [ ] 界面优化和UI交互(希望大家广泛提意见)
- [ ] 限制/不限制物品获取来源时自动计算最优增产策略
- [ ] 自定义增产剂成本(其实已经可以实现了，但是不知道UI放哪比较好)
- [ ] 自定义矿物成本(同上)
- [ ] 自定义新配方(按自己的想法创造配方，不知道有没有用不过这边可以加)
- [ ] 自带mod或其它游戏的数据(按game_data的格式导入即可)

### 部署平台

- [ ] PWA
- [ ] 桌面端应用
- [ ] 移动端UI适配
- [ ] 游戏内插件
