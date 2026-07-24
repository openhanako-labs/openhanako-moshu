# 墨述 (mo-shu) 开发日志

## 项目缘起
整合 Storydex/Storyworks 的版本控制能力到墨述。Storyworks 有"AI 输出预览-应用-回滚闭环"和全实体版本快照；墨述原有 `chapter revise` 已留 `{id}_rev_N` 快照，但 `chapter write` 覆盖已存在章节时不留版本，AI/作者用 write 覆盖会直接冲掉原文且无法回滚。本批次聚焦补齐这一缺口（P0a）。

## 想要的效果
用 `novel_chapter write` 覆盖已存在章节时，旧内容自动归档为 `{id}_rev_N.md`，与 revise 行为一致，可随时回退。不再有"write 覆盖丢原文"的隐患。

## 当前版本
0.3.1（manifest.json）

## 外部依赖
无新增。依赖既有 `lib/config.js`（getDataDir/safeProjectId）、`lib/wqueue.js`（enqueue）、`lib/chapter-extract.js`（syncChaptersToGraphDebounced）。

## 当前进度
- [x] Clone 仓库到本地工作区
- [x] 确认 lib/config.js、lib/wqueue.js 签名
- [x] 初始化 PROJECT_LOG + 备份 chapter.js
- [x] 实现 P0a：write 覆盖已存在章节走快照
- [x] 回归测试（15 项全 PASS，含 revise 回归）
- [x] 更新本日志（成功经验 + 验证清单）
- [x] 实现 P1：人物卡 visibility 双视角（all/developer，get_context 默认 player 脱敏）
- [x] P1 visibility 回归测试（16 项全 PASS）
- [x] 实现 P1：Preset 写作风格系统（style 卡多套切换 + 编译注入文风约束段）
- [x] P1 Preset 回归测试（21 项全 PASS）
- [x] 合规 gap：28 个工具补 sessionPermission（readOnly 8 / plugin_output 20），三套回归测试全 PASS
- [x] 打包 moshu-dev.zip 交付

## 已知问题 / TODO
- [x] (P1) Preset 写作风格系统：升级现有 style 卡为多套 Preset + 编译注入 — 2026-07-24 完成
- [x] (P1) 人物卡 visibility 字段：加 player/developer/all 视角，get_context 按视角注入 — 2026-07-24 完成
- [x] (合规 gap) sessionPermission — 2026-07-24 完成：28 工具全声明（readOnly 8 / plugin_output 20）。按 04-best-practices 反模式5"每个工具都声明"；值映射：只读→readOnly、写dataDir→plugin_output；6 个写操作委托 lib 的工具（create-project/update-card/fact-mgr/knowledge/structure/graph）手动修正为 plugin_output
- [x] (P2) graph 快照确认 — 2026-07-24 不做。graph 是纯派生视图（sync/rebuild/sync_plot/sync_facts 全从 cards/chapters/facts 提取边，查询走 buildAdjacencyGraph 内存构建，无手工编辑边的入口），快照冗余；要历史图状态正解是给 cards 加版本快照（未来增强）而非给派生图加快照

## 经验记录
### 🐛 踩坑
- 2026-07-24 测试脚本末尾 `fs.rmSync(TEST_DIR)` 触发沙箱 safe-delete 包装的 trash 失败（"Some operations were aborted"）。原因：沙箱拦截 rmSync 走回收站。处置：断言在清理前已全 PASS，不影响结论；后续测试脚本清理改用 try/catch 或外部清理。

### ✅ 成功经验
- 2026-07-24 P0a：write 覆盖分支的快照逻辑完全复用 revise 的实现（base64 封面提取正则 + _rev_N 归档 + [base64-cover-image] 还原）。好处：①两处行为一致，用户认知统一；②base64 封面这种易漏边界自动覆盖。代价：revise 若改快照逻辑需同步两处（后续可抽 helper 去重）。
- 2026-07-24 回归测试用独立 node 脚本 `_test_p0a.mjs` 模拟 execute() 调用 + 设 `MO_SHU_DIR` 指向临时目录，不依赖 OpenHanako 运行时，可重复跑。
- 2026-07-24 P1 visibility：选卡片级（all/developer）而非字段级，向后兼容老数据（无字段视为 all）。`get_context` 默认 `viewAs=player`（安全默认——AI 写章节调默认就脱敏，防 AI 误选 developer 剧透自己）。脱敏只藏 content、保留 name+type，避免 AI 因不知人物存在而凭空编造。非 characters 卡传 visibility 被静默忽略（upsert 里 type 守卫），world/style 不受影响。
- 2026-07-24 P1 改动极小（4 文件 +14/-3），核心是 context.js 输出段 +8 行脱敏分支；update-card 靠 `cardInput={...input}` 自动透传 visibility 给 upsert，execute 不用改。
- 2026-07-24 P1 Preset：复用 style 卡作 Preset 载体（每张 style 卡即一套 Preset），不另造数据结构，避免与现有 style+get_context 重复设计。`get_context` 加 `presetId`：指定时把该 style 卡编译为"## ✍️ 文风约束"段（字段→标签语句，object→子项，array→要点），其余 style 卡不注入避免多套矛盾；未指定 fallback 全 style 注入（向后兼容）。PRESET_LABELS 映射常用键（pov→叙事视角等）让编译输出更友好。关键修正：设定卡片段须跳过整个 style 类型（不只选中那张），否则其他 style 卡仍会矛盾注入。

## 功能验证清单
### 后端工具
- [x] `novel_chapter write` 覆盖已存在章节 — 自动: 是 — 输入：projectId + 已存在 chapterId + 新 content / 预期：生成 `{id}_rev_N.md`，旧内容进快照，正文为新 content — 2026-07-24 PASS
- [x] `novel_chapter write` 新建章节 — 自动: 是 — 输入：projectId + title + content（无 chapterId）/ 预期：不生成快照，直接创建（回归不破） — 2026-07-24 PASS
- [x] `novel_chapter revise` 修订 — 自动: 是 — 输入：projectId + chapterId + content / 预期：保留旧版为 `_rev_N`（既有功能，回归不破） — 2026-07-24 PASS
- [x] `novel_update_card` 人物卡存 visibility — 自动: 是 — 输入：characters + visibility:developer / 预期：card.visibility=developer；非 characters 传 visibility 被忽略 — 2026-07-24 PASS
- [x] `novel_get_cards` 返回 visibility — 自动: 是 — 预期：characters 返回 visibility 字段，老卡回退 all — 2026-07-24 PASS
- [x] `novel_get_context` 默认 player 脱敏 — 自动: 是 — 预期：developer 卡藏 content 只给名，developer 视角全显 — 2026-07-24 PASS
- [x] `novel_get_context` Preset 切换编译 — 自动: 是 — 预期：presetId 指定时该 style 卡编译为文风约束段，其余 style 卡不注入；未指定 fallback 全注入 — 2026-07-24 PASS

### 前端 UI
- [ ] 章节列表版本数展示（依赖 extra.js 的 chapter_history，如有 UI 改动再补）

## 备份记录
- 2026-07-24 14:23 — P0a 改动前 — `_backups/chapter.js.pre-p0a.bak`（14595 字节）
- 2026-07-24 14:33 — P1 改动前 — `_backups/{cards,update-card,get-cards,context}.js.pre-p1.bak`（4 文件）
- 2026-07-24 14:42 — P1 Preset 改动前 — `_backups/context.js.pre-preset.bak`

## 审查记录
（待最终审查）
