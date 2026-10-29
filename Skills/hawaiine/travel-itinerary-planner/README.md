# 🧭 行迹 · Travel Itinerary Planner

> 把一句旅行愿望，变成**可核验、可对账、能在路上使用的路书**。
>
> Turn a travel wish into a **verified, reconcilable roadbook** you can actually use on the road.

这是一个 Hermes Agent Skill，不是独立的旅行 App。它负责提取旅行条件、核验时效信息、按地理顺序编排行程、核算预算，并在需要时生成手机可读的交互式 HTML 路书。

This is a Hermes Agent Skill, not a standalone travel app. It extracts trip constraints, verifies time-sensitive facts, sequences the route geographically, reconciles the budget, and optionally generates a phone-readable interactive HTML roadbook.

---

## 适合什么任务 / When to use

- “帮我规划一趟旅行 / 自驾 / 多城路线”
- “给我做一份路书 / 行程 / itinerary”
- “这个行程合理吗？预算够不够？每天会不会太赶？”
- 需要把文字方案做成可分享、可离线打开的 HTML 路书
- 海内外自由行、环线、自驾、亲子或多人同行规划

不适合只查一个地点坐标、附近 POI 或单段路线；这类请求直接使用地图能力即可。

---

## 核心特色 / What makes it different

### 1. 事实台账，而不是“看起来很确定”的攻略

影响行程的事实必须标注：

- `已核实`：附来源和查询日期
- `估算`：说明估算依据
- `待确认`：给出官方核验入口，不把未知写成确定

不会编造航班/车次、房间余量、评分、精确到分钟的车程或照片地点。

### 2. 可对账预算，而不是只写一个总价

每项固定使用：

```text
项目说明｜单价 × 数量｜金额
```

覆盖大交通、跨城交通、市内交通、住宿、餐饮、门票、保险/通信等；给出全程总额、人均金额和 10%–15% 机动金。改变住宿或路线时，重新计算受影响的分项。

### 3. 计划强度独立于 MBTI

- **详尽**：时间块、预约顺序、备选方案
- **锚点**：必须完成的事项 + 最多两个可选体验 + 自由时间
- **通用**：每天约 2–3 个核心体验，并保留休息和机动时间

MBTI（如果用户主动提供）只是信息排序和阅读密度的可撤销参考；不会把“I 人”擅自理解成“不爱做计划”。

### 4. 开放地图与可追溯图片

HTML 路书使用 Leaflet + OpenStreetMap，并提供无网络时的静态 SVG 路线兜底。照片必须核对地点、作者、许可和来源；不使用专有地图服务，不把无关图库或生成图冒充实景。

---

## 安装 / Installation

将本目录复制到当前 Hermes profile 的 skills 目录：

```bash
# 在 Oasisic-Skills 仓库根目录执行
export HERMES_HOME=/opt/data   # 按你的实际 profile 调整
mkdir -p "$HERMES_HOME/skills/productivity"
cp -r skills/travel-itinerary-planner "$HERMES_HOME/skills/productivity/"
```

也可以只在对话中临时加载：

```python
skill_view(name="travel-itinerary-planner")
```

新 Skill 通常需要新 Hermes session 才会出现在自动匹配列表中。

---

## 最快用法 / Quick start

直接告诉 Agent：

```text
帮我规划一趟 6 天 5 晚的川西小环线自驾。
成都出发，两个人，10 月出发，预算 6000 元，不含往返成都的大交通。
想去四姑娘山、丹巴、塔公、新都桥和康定，节奏不要太赶。
请先给我一版可核验的文字路书，预算要能对账。
```

Agent 会依次处理：

1. 提取出发地、目的地、日期、天数、人数、预算、交通和偏好
2. 只追问会改变路线或预算的缺项（每轮最多 3 个问题）
3. 使用地图/搜索能力核验路线、开放时间、预约、路况等时效信息
4. 按地理顺序编排每天的移动、停留、用餐、住宿和替代方案
5. 用 `itinerary_check.py` 校验天数、时间和预算
6. 输出两条最有价值的后续调整建议

如果你不想回答追问：

```text
别问了，按两人、中等预算、适中节奏直接安排；所有假设请单独列出。
```

---

## 三种典型示例 / Examples

### 示例 A：详尽城市旅行

```text
帮我做一份东京 5 天 4 晚的自由行路书。
两人，预算 12000 元（含机票），第一次去，喜欢建筑、咖啡和城市散步。
每天排得清楚一点，但不要安排超过 3 个核心地点。
需要标注哪些地方要预约，并把价格分成已核实、估算和待确认。
```

适合得到：逐日时间块、交通耗时区间、预约顺序、住宿区域取舍和预算表。

### 示例 B：随性自驾 / 锚点模式

```text
我们两个人想从武汉自驾去恩施 4 天，不想被行程绑死。
预算 4000 元，必须保留屏山峡谷和返程，其他每天最多给两个可选点。
请告诉我每天最晚什么时候必须决定是否换住宿，以及下雨怎么改。
```

适合得到：固定交通/住宿锚点、最多两个可选体验、天气变化时的改住方案和预算影响。

### 示例 C：生成 HTML 路书

先让 Agent 完成文字方案，再提出：

```text
把刚才确认的行程做成手机可读的交互式 HTML 路书。
要有按天切换、路线地图、预算选项、可勾选行前清单和图片署名。
没有确认许可的照片不要放；页面必须离线也能读完文字路书。
生成后实际打开检查桌面和 375px 宽度，并告诉我哪些检查没做。
```

交付通常包含：

```text
roadbook.html
assets/photos/        # 已核对许可的本地图片
assets/fonts/         # 可合法使用的自托管字体（若已提供）
roadbook-data.json
```

---

## 自驾路书的最低信息量 / Self-drive minimum

每个自驾日都应有：

- 完整途经链和主要道路
- 至少 3 个按行车顺序排列的关键节点
- 纯驾驶、景区内移动、停车、接驳、用餐、休息分别计时
- 加油/充电窗口、不能依赖补给的路段
- 当晚住宿区域和停车条件
- 单司机基线、红眼线、最晚收车时间
- 天气/封路时何时停、改住哪里、后续订单和预算如何变化

两位旅客不等于两位司机。驾驶人数未知时，按单司机安全强度规划；超过合理强度必须拆段或明确双司机条件。

---

## HTML 路书交付说明 / HTML output

只有用户明确要求预览、网页、HTML 或可分享路书时才生成页面。文字路书仍是事实源，HTML 不能用照片和动画替代交通、预约和预算信息。

页面包含：

- hero 路线概览与关键约束
- 按天切换和路线地图
- 每天可直接看到的逐段路书
- 至少一个会真正改变选项和预算的交互
- 预算表：单价 × 数量 → 金额 → 合计 → 人均
- 行前避雷与可勾选清单
- 图片作者、原始页面、许可和裁切说明
- 无脚本/打印/窄屏时仍能读完的降级内容

地图使用 Leaflet + OpenStreetMap；不要替换成专有地图服务。HTML 模板和数据结构见：

- [`templates/roadbook.html`](./templates/roadbook.html)
- [`templates/roadbook-data.example.json`](./templates/roadbook-data.example.json)
- [`references/html-roadbook.md`](./references/html-roadbook.md)

---

## 本地验证 / Local verification

### 1. 校验 JSON 和预算

```bash
python3 -m json.tool templates/roadbook-data.example.json >/dev/null
python3 scripts/itinerary_check.py templates/roadbook-data.example.json
```

成功时应看到：

```text
RESULT RECONCILED
```

严格模式会把警告也视为失败：

```bash
python3 scripts/itinerary_check.py templates/roadbook-data.example.json --strict
```

### 2. 生成自己的 HTML

复制模板，准备一个同级的 `assets/` 目录，把 JSON 填入 `roadbook-data` 脚本块：

```bash
cp templates/roadbook.html ./roadbook.html
mkdir -p assets/photos assets/fonts
# 将已获许可的本地照片放入 assets/photos/
# 修改 roadbook.html 中的 <script id="roadbook-data"> JSON
```

直接用浏览器打开即可；如果需要测试相对路径和模块资源，也可以在该目录启动静态服务器：

```bash
python3 -m http.server 8080
# 浏览器访问 http://127.0.0.1:8080/roadbook.html
```

### 3. 浏览器验收

有浏览器能力时至少检查：

- 桌面和 320 / 375 / 414 / 768 px 宽度
- 图片是否加载、地点是否匹配、来源是否可追溯
- 按天切换、地图、预算选项、清单筛选/清空/本地保存
- 页面没有横向滚动，控制台没有错误
- 离线资源是否齐全

如果没有浏览器能力，必须明确说明“视觉、交互和控制台尚未实测”，不能把源码检查说成页面已通过。

---

## 文件结构 / File structure

```text
travel-itinerary-planner/
├── SKILL.md                         # Agent 执行规则
├── README.md                        # 人类使用说明
├── meta.yaml                        # 仓库技能清单元数据
├── references/
│   ├── intake-and-adaptation.md     # 信息提取与可选偏好镜头
│   ├── budget-and-facts.md          # 事实台账、预算口径、交付结构
│   ├── self-drive.md                # 自驾路书规则
│   └── html-roadbook.md             # HTML、地图、照片、交互和验收规范
├── scripts/
│   └── itinerary_check.py           # 天数、时长和预算对账
└── templates/
    ├── roadbook.html                # 交互式页面模板
    └── roadbook-data.example.json   # 数据结构示例
```

---

## 许可 / License

本 Skill 代码和文档按仓库根目录的 MIT 许可证发布。

模板中的地图、字体和照片各自遵循其上游许可证；使用真实照片时必须保留作者、原始链接和许可信息，不要把模板示例的署名当成你自己的素材来源。
