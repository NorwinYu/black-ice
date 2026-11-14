# BLACK ICE · 白夜站 — 构建记录

> **独立构建**：没有使用任何外部模型、贴图、音频素材、参考帧或既有项目代码。
> 全部几何为程序化生成，全部材质为手写 GLSL，全部音效为 WebAudio 合成，
> 单文件 HTML 运行时不发起任何网络请求。

---

## 1. 交付物

| 文件 | 说明 |
|---|---|
| `game.html` | 完整可玩的单文件游戏（打开即玩） |
| `shots/` | 每一轮迭代的固定相机截图、HUD 截图、产品壳层截图 |
| `tools/` | 验收门（见第 6 节），由 skill 的 harness 复制并按项目合同修正 |
| `build.mjs`, `src/` | 可维护源码；`node build.mjs` 生成 `game.html` |

启动：

```bash
# 直接双击 game.html 也可运行；本地服务器更稳
python3 -m http.server 8000    # 然后打开 http://localhost:8000/game.html
```

---

## 2. 美术方向（Step 2 brief）

| 决策 | 内容 |
|---|---|
| 主体 | 北极圈边缘的废弃监听站；人的尺度对比 16 m 通信桅杆、4.5 m 雪猫车 |
| 时间天气 | 极昼边缘的落日，太阳高度 15.4°，细雪、强风、-24°C；蓝调天空 + 冷暖光池 |
| 主光 | 低角度暖阳位于西南（相机背后偏左），色温约 3000K，长影投向东北 |
| 天空/环境 | 深海军蓝天顶、冷钢蓝地平线、暖色云底与反日侧的粉色"维纳斯带"；雪面反弹冷灰蓝 |
| 材质族 | 风压雪（风蚀脊、颗粒、车辙、脚印）、剥落油漆、锈、混凝土、木、油布、玻璃、冰、暖窗/航标发光 |
| 焦点 | 前景雪猫车与左侧舱体作为框，视线进入中央通信桅杆与三座中继；暖窗与红色航标作为亮点 |
| 约束 | 无纯白死白、无纯黑、无平坦雪原、无漂浮物、无霓虹赛博、HUD 克制 |
| 标志性表面系统 | 风蚀雪：高度场风脊 + 顶点色车辙/脚印 + 屏幕空间法线细节 + 雪面颗粒高光 + 吹雪粒子 |
| 相机 | 第一人称（眼高 1.7 m）；hero / close / wide 三台固定静帧相机 |

## 3. 内容预算（vertical slice）

| 槽 | 本作 |
|---|---|
| 目标链 | 1 条，4 拍：ALPHA → BRAVO → CHARLIE → 典狱长 |
| 敌人/交互角色 | 游走者（枪手）、胡蜂（悬停无人机）、重装守卫（盾+霰弹）、典狱长（首领）、补给箱 |
| 工具 | AR-9 步枪（主）+ ARC-9 电弧线圈（副，连锁 3 目标） |
| 玩家动词 | 移动、冲刺、跳跃、瞄准、射击、换弹、切枪、互动 |
| 世界 | 一个站点：中央场院、三栋建筑/车库、三座中继塔、雷达罩、燃料库、16 m 通信桅杆、外围雪堤 |
| 壳层 | 标题、暂停、设置、失败、胜利、帮助、存档、触屏 |
| 单局 | 6–10 分钟 |

## 4. 循环语法

| 槽 | 答案 |
|---|---|
| 动词 | 在压制下推进到中继并接通，用步枪/电弧处理守卫 |
| 系统 | 敌人 AI（接近/侧移/视线/预警射击）、波次、中继激活、首领阶段与召唤 |
| 反馈 | 命中标记、枪口光、弹道、命中火花、雪面弹孔、音频、字幕、HUD、世界状态（中继从红标变青色环） |
| 失败 | 生命归零，屏幕命名死因（谁、用什么武器） |
| 单局 | 6–10 分钟；最佳得分与设置持久化 |

---

## 5. 迭代日志（固定相机 / 固定种子 / 逐轮截图）

> 每轮只认截图和门；"看起来更好"不是证据。所有截图在 `shots/`，不覆盖。

### Round 0 — 骨架与第一次渲染
- 建立页面合同：`__READY / __STATS / __SCENE / __COLLIDERS / __BOUNDS / __TESTMOVE / __TEST / __PRODUCT`。
- 第一次渲染 `r02-title.png`：几乎全黑。
- **缺陷**：`sampler2DShadow` 未写精度；FXAA 没有包含噪声函数。世界/天空着色器整体编译失败。
- **修复**：补 `highp sampler2DShadow`、把 `GLSL_NOISE` 加入 FXAA。重新渲染后世界出现。
- 观测：相机被南侧围栏挡住、燃料罐压在视轴上、整体欠曝 1.5 档。

### Round 1 — 构图候选
- 渲染 `cand-A/B/C/D.png` 四台相机。
- A（雪猫车右前景 + 左舱体 + 中央桅杆）最有叙事性；B/C 太空，D 贴墙。
- **修复**：移走挡镜头的围栏与燃料罐；提亮主光/环境；选 A。
- `r03-hero.png`：亮起来了，但扁平、偏粉、雪面没有材质，前景木箱巨大。
- `cand-A.png` → `r03-hero.png`。

### Round 2 — 雪猫车装配事故与着色器噪声
- `r04-hero.png`：雪猫车零件炸开悬浮在半空。
- **归因**：雪猫车构建器 `Builder.at()` 的变换栈没有配平，后续零件不断累积位移。
- **修复**：用只负责"旋转盒"的 `rbox()` 重写整个雪猫车，所有 `at()` 都成对 `done()`；同时降低油漆片状噪声和锈的高频。
- 仍偏灰、偏紫；云像泥。

### Round 3 — 主光换到西南
- **观察**：相机面向东北，而太阳在西北 → 所有朝向相机的面都在阴影里，等于环境光独奏。
- **改动**：主光改到西南 `(-0.42, 0.265, 0.87)`；雪猫车横置、太阳照亮其侧面；天空改为冷蓝地平线 + 反日侧粉色带。
- `r06-hero.png`：第一次出现可读的暖冷对比、长影和蓝色天顶。
- 仍是"平"的雪原；中部密度不足。

### Round 4 — 风蚀雪与地景密度
- 高度场加风脊 + 由高度场求法线；地面网格 0.8 m。
- 车辙/脚印做成几何面片，沿路线交替左右；火箭/油桶/雷达罩/木箱/线缆盘入场。
- 山脊改为三层、加尖峰与岩石色；云改为冷灰蓝、降低"泥"感；加环境光遮蔽接触暗带。
- `r09-hero.png`：雪面有了风蚀脊与深色踏痕，flat tiles 降到 5%。

### Round 5 — 产品层与游戏内视角
- `r13-demo1.png`：HUD、敌人、枪械第一次同框。
- **缺陷**：第一人称枪械过大（占满右下 40%），准星不可见，前景木箱挡住半屏；wide 相机 midtones 91.7% 不过色调门。
- **修复**：枪模缩到 0.74、后移，抬高手部；准星加粗；demo 位置后撤到开阔场院；移走前景木箱。
- `r15-demo1.png` / `r16-demo1.png`：枪、敌人、HUD 可读。

### Round 6 — 色调与验收
- 天空压深、S 曲线 0.48、暗角 0.70；窗光降为深琥珀；雪猫车尾窗加仪表暖光，排气缩短，推雪铲液压臂改为黄色。
- 敌人加青色肩灯/胸灯、红色面罩，并加位置发光精灵，远距离可读。
- 加入战斗 QA：`__TEST('combat')`、`__TEST('threat')`、`__TEST('bossfight')`。
- **发现并修复**：首领死亡时 hook 先把 `boss.dead=true`，导致胜利计时器从未排入 → 击杀首领后永远不结算。移除 hook 的提前置位，改由 `updateBossState()` 统一调度。
- **发现并修复**：一次全局 replace 误把 demo 分支塞进 `startGame()`，导致 `n is not defined`。已用边界匹配移除，并回归验证 start → HUD。
- 最终三台相机：hero 77.5% mid、close 75.2% mid、wide 72.0% mid，均在 45–80% 内；flat 3%/0%/7%。

### 失败与回退
- 先尝试过对称"正面"雪猫车，结果正对相机只剩一团红色；回退到侧面/四分之三。
- 尝试过更亮的白天曝光，midtones 91%，完全洗掉；回退并改深暮色。
- 大范围云层倍频曾产生"电视雪花"；按眼否决（eye veto）回退到低频结构 + 少量卷云。

---

## 6. 验收门（acceptance）

```bash
node tools/verify.mjs --dir . --page game.html --profile refs/profile.json
```

本项目的 `refs/profile.json` 不存在：用户要求不从任何参考材料出发，因此按 skill
的**声明式回退**运行 look 门——只检查 tone（clipped hi/lo、midtones）与空区
（flat tiles / mean），不做跨题材能量比。该模式在 verify 输出中明确打印
`look mode: FALLBACK`。

| 门 | 结果 | 证据 |
|---|---|---|
| shaders | PASS | 无 Shader Error；静态阴影、HDR、Bloom、FXAA 全部编译 |
| census | PASS | 150+ mesh，0 failures；所有近处实体有 identity/parts |
| collide | PASS | 0 穿透、0 越界、0 裸边界、0 穿墙；负向自由行走 ≥0.88 |
| lights | PASS | 所有点光与灯具/灯罩网格距离 0 m |
| playtest | PASS | ALPHA→BRAVO→CHARLIE 进度 1→2→3；死亡有命名死因与结算层；reset 恢复 100 HP |
| product | PASS | 标题/暂停/设置/失败/胜利/存档/触屏/目标链/角色/工具/相机/预算；最终构建 162 calls / 127,337 tris / 12 lights |
| mobile | PASS | 390×844，scroll 390×844，无横向溢出，touch 存在 |
| look | PASS（fallback） | hero mid 77.5% / close 75.2% / wide 72.0%；flat 3% / 0% / 7%；clip hi ≤0.18%，lo ≤0.56% |

**最终证据**：

- 完整验收 run：`shots/gate-verify.txt` → `VERDICT: PASS (8/8)`，
  `look mode: FALLBACK (tone + emptiness; no project profile at refs/profile.json)`。
- 验收后只改了壳层/demo 代码（`startGame` 清理、`demo=5..8` 截图入口、demo2 取景），
  场景、材质、相机、碰撞、灯光未变。为避免拿旧构建冒充，最终构建上**重跑了受影响的三项**：
  `gate-product-final.txt`、`gate-playtest-final.txt`、`gate-mobile-final2.txt` → 全部 PASS。
- 性能读数（最终 product 门）：`162` draw calls、`127,337` triangles、`12` lights。

战斗、威胁、首领三组自检（开发期，`__TEST`）：
- `combat`: 目标 HP 72 → 0，dead=true，kills=1。
- `threat`: 5 秒内玩家 100 → 94，tookDamage=true（AI 真的能伤害玩家）。
- `bossfight`: 击杀首领后 3.4 s 进入 `phase = won`。

---

## 7. 质量清单（对图）

- [x] 单主光方向可由画面读出（西南低阳、长影）
- [x] 阴影带天空色（冷蓝），不是黑
- [x] 无地平线接缝（雾色由天空方向驱动）
- [x] 强边无明显锯齿（FXAA + 高画质 1.25 超采样）
- [x] 物体有接触影/接触暗带
- [x] 至少三种尺度和三个景深层（雪猫车 / 舱体与雷达罩 / 桅杆与远山）
- [x] 材质在 albedo/roughness/normal 三个通道变化
- [x] 高光不剪（hi 0.0–0.18%）、暗部不死（lo 0–0.56%）
- [x] 固定相机与种子可复现存档（`?seed`, `?cam`, `?shot=1`）
- [x] 可交互（60fps 目标；SwiftShader 无头渲染下 146 calls / 105k tris）

## 8. 已知限制

- 敌人为刚性分件骨骼（每类一次 draw，part 矩阵动画），不是蒙皮网格；远/中距离可读，贴脸看是硬表面机器人。
- 音频是 WebAudio 合成，无录制素材；方向声像只做左右声道权重。
- 无头截图使用 Chrome SwiftShader，真实 GPU 帧率未在本会话测量；页面报告 draw calls / triangles / lights。
- 触屏布局通过 390×844 门与静态检查，未在实体手机上人工试玩；窄屏 HUD（目标卡与指南针）
  以及枪模会与右下触屏按钮重叠，可玩但拥挤。
- `final/` 里的 hero/title 为 1600×900，其余为 1280×720；移动端两张为 390×844。
- 没有中途存档；仅持久化最佳成绩与设置（与产品合同一致）。

## 9. 截图索引（最终）

| 截图 | 内容 |
|---|---|
| `final/title.png` | 标题键艺（HUD 隐藏、菜单可见） |
| `final/hero.png` | hero 固定相机 |
| `final/close.png` | close 固定相机（雪猫车侧面，3 m） |
| `final/wide.png` | wide 固定相机（仰视天空中的站点） |
| `final/gameplay.png` | 第一人称战斗、HUD、敌人、枪械 |
| `final/boss.png` | 典狱长战（Boss 血条、重装核心） |
| `final/relay.png` | 中继近景与状态灯 |
| `final/pause.png` | 暂停壳层 |
| `final/settings.png` | 设置壳层 |
| `final/lost.png` | 失败结算（命名死因） |
| `final/won.png` | 胜利结算 |
| `final/mobile.png` | 390×844 标题 |
| `final/mobile-gameplay.png` | 390×844 战斗 + 左摇杆/开火/瞄准/换弹/互动 |

`final/` 目录为验收后的固定相机重拍；`gallery.html` 把最终画面与迭代过程和并成一页。


## Late feature pass (after acceptance)

- Added demo modes 9–14 for the feature contact sheet: ARC-9 discharge, hostile roster,
  low-health/supply, ADS combat and clean diagnostics.
- Fixed a real firing bug found by the feature stills: billboard ribbon tracers at
  point-blank range could become screen-filling triangles. Tracers and arc bolts now
  use short additive sprite streaks instead; the giant-star diagnostic frames are
  intentionally not in the public gallery.
- The `?q=` quality query now applies after boot instead of being overwritten by
  persisted settings.
- Final build re-check: product (163 calls / 127,337 tris / 12 lights), playtest and
  mobile all PASS. The full 8/8 acceptance run and the scene/camera gates are unchanged.
- Public Pages site lives in `docs/`; the photo gallery uses optimized JPEGs.
