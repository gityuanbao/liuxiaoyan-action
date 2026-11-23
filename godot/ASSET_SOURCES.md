# 美术素材与参考

## v56 野火

立绘来自[三角洲行动官方干员页](https://df.qq.com/cp/a20240906main/index.html)。特战干员页使用项目内的全身动作帧，文件和播放节奏见 [野火动画清单](assets/characters/wildfire/animations.json)。第三方素材的相关权利归各权利方。

## v31 哈弗币图标

使用[哈夫币资料页](https://orzice.com/v/info/p1393)链接的[腾讯游戏 CDN 原始 PNG](https://game.gtimg.cn/images/dfm/cp/a20240807community/profile/gold_icon.png)，21×21 RGBA，未经重绘；按用户本轮用字显示“哈弗币”。本地 `assets/ui/currency/haf_coin.png`，文件校验与使用位置见同目录 `SOURCE.md`。

## v30 朝右总监头像

以用户上传的小头像及现有总监贴图为参照，通过内置 image_gen 生成五组 2×2 对话头像动画；全部朝右，保留原角色银发、眼镜、叼笔和战术服特征。每组提示词、原始图、处理记录与最终 GIF 在 `assets/portraits/director-v30/`。仅去背景、分帧、统一缩放及轮廓去品红；没有用程序绘制角色或生成新语音。

## v29 加长原声与同步表情

沿用用户指定 BV1FtBkBUEYj 的原片缓存，胜利两段扩展至 5.6 / 7.0 秒，失败两段各 7.4 秒。剪辑参数与原始时间窗详见 `assets/result_video/manifest.json`，无静帧补尾、无人工空音；两段连接使用 50 毫秒音画交叠。同步笑脸、问号和挥手来自用户已提供的 `assets/memes/` 原图，未新增生成配音。

## v28 结算视频表情包

用户指定 [《⚡艳の音⚡》BV1FtBkBUEYj](https://www.bilibili.com/video/BV1FtBkBUEYj/)。从原视频截取 4 段短片，保留原声并裁成角色近景；源时间窗、裁切、时长和字幕记录在 `assets/result_video/manifest.json`。成功使用“哈哈，真好啊”“没有一个单词你不会写”；失败使用“回家吧，好不好”“回家睡觉去吧”。没有克隆或生成新声音。仅随项目提供短截取，不包含完整原视频；不代表原作者参与或授权项目发布。

## v27 护盾方向

内置 image_gen 新生成两套 2×2 透明图集：侧向朝右的弧形护盾、亮尖朝右/拖尾朝后的飞行弹头。提示词和完整处理记录分别在 `assets/fx/shield-v27/`、`assets/fx/direction-v27/`；旧盾面与旧火光保留但不再用于对应运行效果。底部技能图标和人物 GIF 未改。枪口短火花复用原有生成的径向火花，和飞行弹头分层显示。

项目名称按用户要求保留“刘晓燕行动”。检索资料中的老师通常写作“刘晓艳”。项目是二创原型，生成图不代表本人或《三角洲行动》官方参与。

## 实际使用素材

生成素材由内置 image_gen 制作并由 Godot 加载；官方宣传素材按下列来源下载。角色通过 AtlasTexture 划分图集，代码仅负责透明处理、固定格裁切、贴图播放与 UI 排版。

- `assets/generated/mentor.png`：用户提供的银发背头、眼镜、叼笔、黑色战术背心形象，四种表情的 2×2 透明图集。
- `assets/generated/allies.png`：参考官方哈夫克图鉴的狙击兵、喷火兵、机枪兵、盾兵，2×2 透明图集。
- `assets/generated/enemies.png`：参考官方阿萨拉图鉴的机枪兵、火箭兵、喷火兵、盾兵，2×2 透明图集。
- `assets/generated/base.png`：零号大坝军事整备车库背景；去除了早期方案中的课堂、书本和奇幻元素。
- `assets/generated/zero-dam-battle-v15.png`：2026-11-12 使用内置 image_gen 新生成的 1672×941 大坝外场贴图。用于战斗背景和地图、结算的暗色底图；不是官方实机截图。按真实画面比例裁切，人物沿用已有 GIF 帧。完整生成要求与应用范围见 `VISUAL_UPDATE.md`。
- `assets/official/operator-01..06.jpg`、`portrait-01..06.jpg`：三角洲官方 Garena 网站上的红狼、牧羊人、露娜、蜂医、威龙、骇爪宣传图与头像。大图作为角色生成参考，头像用于选择卡片；大厅和干员主立绘改为 GIF 动画。
- `assets/generated/operators/`：六位干员 3×2 图集，顺序为红狼、牧羊人、露娜、骇爪、蜂医、威龙。参考官方角色，使用 image_gen 生成后去底、固定比例和脚底对齐。威龙源图夜视仪接近单元格上边，人工检查完整无截断；输出帧有透明安全边距。
- `assets/fx/muzzle/`、`assets/fx/impact/`：各六帧开火 / 弹着效果，由 image_gen 生成；固定来源格裁切，保留共同发射原点。GIF 为预览，运行时加载透明 PNG。
- `assets/characters/`：上述六位干员、四种阿萨拉兵种各 3 组动作，总监 2 组动作，共 32 组。每个动作使用 image_gen 依据角色主图和共同锚点模板单独生成 2×2 四帧图，再去底、脚底对齐、共享比例检查和透明 GIF 编码。待机循环为 6 帧（总监为 4 帧）；开火、受击、说话各 4 帧。运行时图片逐帧从 GIF 母版解码，画面与时长一致。完整生成指令位于各动作的 `prompt-used.txt`，处理记录为 `pipeline-meta.json`。
- `data/books/`：来源 [ECDICT](https://github.com/skywind3000/ECDICT) 的考试标签词库；本地附 MIT 许可证、来源说明与筛选规则。

## 参考来源

1. 用户上传形象：`assets/references/user-mentor-reference.png`。
2. 刘晓艳尬笑与课堂梗图资料：[BB姬 / 新浪文章](https://k.sina.com.cn/article_5938544491_161f6ff6b00102jzjs.html)。下载留存 smile / reactions 两张作为参考，没有直接用作游戏立绘。
3. 课堂表情截图：[图片来源](https://i2.hdslb.com/bfs/archive/58fafa618d75d090f1d8f55f976fec4debc98f95.jpg)，检索入口为 [表情资料页](https://ecywang.com/pic/%E5%88%98%E6%99%93%E8%89%B3%E8%80%81%E5%B8%88%E8%A1%A8%E6%83%85%E5%8C%85/)。后由用户指定形象替代。
4. 阿萨拉兵种参考：[三角洲行动官方 TapTap 图鉴](https://www.taptap.cn/moment/588731281915773370)，原图保存在 `delta-asara.jpg`。
5. 哈夫克兵种参考：[三角洲行动官方账号 / 小米游戏中心图鉴](https://game.xiaomi.com/viewpoint/1543075652_1733220000177_16)，原图保存在 `delta-haavk.jpg`。
6. 干员图与头像：[三角洲 Garena 官方网站](https://deltaforce.garena.com/en/?redirect=0)。图片位于 `https://web.df.garena.com/02_h5/240923_official_website/en/pc/operator_bg_01.jpg` 至 `06.jpg`，头像为同目录 `operator_list_01.jpg` 至 `06.jpg`。资料核对：[官方宇宙 / 干员介绍](https://www.playdeltaforce.com/en/universe/)。
7. 实际大厅参考：[TapTap 大厅截图](https://www.taptap.cn/moment/807716240205284338)；特战干员页：[TapTap 界面截图](https://www.taptap.cn/moment/629648909102219410)；配装布局：[配装界面说明](https://shouji.vmos.cn/guides/sjz/63251.html)。这些截图仅作为布局参考，不直接作为游戏 UI 背景。
8. 用户指定原声：[挨骂纯享版（八）德穆兰限定版](https://www.bilibili.com/video/BV1hTnb6XEju/)，本版剪辑 12 段原有视频音轨；另导入用户本地“刘晓艳_30组梗图与原声”的全部 30 段音频及 30 张图片，本地清单记录来源为 [晓艳教英语 / 你可能没见过我，但一定听过我的声音](https://www.bilibili.com/video/BV16iEFzYEm2/)。只统一音量和游戏播放格式，保留源音色、语气、背景声音及已有音效。当前使用全部 42 段原声，旧版合成音频不再启用。字幕在原音频上对齐，来源、截取位置与时间点见 `assets/voice/manifest.json`；30 张截图用于游戏内“原声库”。

原参考图和视频音轨的权利归原作者；未将搜索到的素材视为公共领域。正式商用发行需要另行确认相应素材和形象使用权限。视频原声字幕对应现有片段，不将编辑后视频中的话语视为相关人物对本项目的真实发言或背书。

## 最终提示词摘要

- 导师：严格匹配用户图中央银发角色的脸、发型、眼镜、叼笔和黑色战术背心；2×2 表情图集；无背景、无文字、无三角徽章；精细二维像素质感。
- 阿萨拉：以官方图鉴为装备参考；红黑机枪兵、火箭兵、喷火兵、盾兵；完整全身，2×2 布局，真实透明背景，三分之四朝左；无图鉴文字与地面阴影。
- 哈夫克：以官方图鉴和用户图右后方士兵为参考；灰黑狙击兵、黄色面罩喷火兵、重装机枪兵、盾兵；2×2 全身图集，朝右，透明背景；不含动物、精灵或其他游戏元素。
- 基地：三角洲行动零号大坝军事工业环境，整备车库、巨大混凝土坝体、储备箱、武器柜、电台、信号弹；中间留人物空间；16:9 二维背景，无文字、人物、书本、黑板或奇幻道具。

## 本轮新增声音

- 用户文件 `英语属于刘晓艳.mp3`：原文件按字节保留，另转换 OGG，配文“天空属于哈夫克，英语属于刘晓艳”。用于开场及语音库。
- 18 条考研新台词：使用上述德穆兰视频 38.13–54.22 秒音色参考，经 Qwen 音色复刻与语音合成生成。是游戏新台词，不是源视频原话；播放清单以 `reference_synthesis` 标识。
- 17 个游戏音效来自 Kenney 的 Interface Sounds、Impact Sounds、Digital Audio（CC0）以及 Vincent Sevedge 的枪声素材。后者下载包内写有 CC BY 3.0，因此保留署名并按该许可证附说明；页面标注差异见 `assets/sfx/SOURCE.md`。剪短、单声道、归一音量并制作为 OGG，连射由三段原枪声拼接。具体素材文件、作者、许可证见 `assets/sfx/manifest.json` 和 `licenses/`。
- 单词朗读优先复用原有 WAV，其余使用系统已安装的英语 TTS；不需要在线账号。

## 游戏图标

`assets/branding/` 使用用户提供的银发德穆兰形象，由内置 image_gen 生成单独图标。保留银发、眼镜、叼笔和战术背心，深军绿底、橙色切角边框，无文字。生成原图保留，运行 PNG 和 Windows ICO 仅做尺寸、格式转换；完整提示词和文件说明见 `assets/branding/SOURCE.md`。先前黑发笑脸候选图没有加入项目。

## v18 字标与开场音

- 战术字标由内置 image_gen 生成并修订，提示词、参考及文件清单见 `assets/branding/WORDMARK_V18.md`。
- 新增开场标志音取自用户指定的 [三角洲新版启动动画](https://www.bilibili.com/video/BV1cWNJeoEPb/) 2.72–6.42 秒，原速立体声，做首尾淡化；来源权利保留给原权利方，不列入 CC0 / CC BY 玩法音效集合。详见 `assets/sfx/startup-signature-v18.json`。


## v22 英语总监与小兵精修

本轮角色参考为用户上传 `codex-clipboard-ee0d33d5-eb42-472e-beff-4c6f93f34c74.jpg`：中间银发、眼镜、深蓝外套、灰色胸甲的英语总监，以及两侧面罩重装兵与黑橙兜帽兵。通过内置 image_gen 重绘为独立全身动作素材，没有将原截图、背景或字幕整张贴入游戏。共重做 5 个角色、18 组动作；总监开火 6 帧，其余每组 4 帧。提示词、生成文件来源、逐帧处理信息在 [assets/characters/refined-v22/](assets/characters/refined-v22/)。六位己方干员不变。对话头像与语音库立绘共用新总监素材。本轮未新增或重制任何语音。

## v21 技能图标

新增 16 张内置 image_gen 生成的战术图标，运行格式为透明 PNG；两项通用技能、六位干员的战技与大招、播报和暂停状态。完整提示词、生成任务来源、逐格用途与加工参数见 [assets/ui/skills/README.md](assets/ui/skills/README.md)。字幕头像继续使用原总监 GIF 的同一帧做运行时局部显示，没有替换人物形象。本轮没有新增或重制语音文件。

## v19 三角洲短音效

新增命中、普通击杀、爆头击杀、侦察提示和完成提示共 5 段。前 3 段来自 [Hit_Kill_Sounds](https://github.com/m4a1deathDawn/Hit_Kill_Sounds)，后 2 段来自 [DeltaForceAnimation](https://github.com/TFR-Studios/DeltaForceAnimation)。这是社区整理的游戏音轨，权利仍归原游戏权利方，不随仓库代码许可证变成 CC0 / GPL 素材。文件级来源、原文件 SHA-256、时长和音量处理均记在 `assets/sfx/delta-manifest.json`。详细使用点见 [AUDIO_LEARNING_V19.md](AUDIO_LEARNING_V19.md)。原枪械素材仍按原 CC BY 署名保留。


## v23 干员动作、环境图与背景音乐

- 6 位己方干员以各自原 idle/raw-sheet.png 为参考，由内置 image_gen 分别生成战技和大招，12 张独立 2×2 动作图。主体不包含脱离身体的火焰/烟尘；沿用旧角色比例档案，单帧 512×512，保留真实屈膝与后坐。动画路径 `assets/characters/skills-v23/`，提示词、原始生成文件、严格 QC 和 GIF/runtime 一致性记录均可追溯。
- 6 组独立透明特效由内置 image_gen 生成，4 帧一组；确定性处理仅拆帧、统一裁剪可见包围盒、留安全边距和等比缩放。路径 `assets/fx/skills-v23/`，透明发光保留，没有用代码绘制替代人物或特效贴图。
- 4 张环境背景由内置 image_gen 参考原大坝图的视角和画风生成，分别为溪谷、城区、航天基地、指挥中庭；路径 `assets/maps/v23/`。它们是本项目的重绘场景，不是官方地图截图。
- 模式选择布局参考三角洲实际模式卡片的大小关系、低饱和背景和高亮主入口，未把截图整张贴入界面。参考页面：https://www.sohu.com/a/896339698_121827464 、https://gnn.gamer.com.tw/detail.php?sn=284035 。页面内容仍为本游戏实际支持的学习和远征模式。
- 新增三首 CC0 战术氛围音乐，第三方作品而非三角洲官方 OST。作品、作者、来源、授权和加工记录见 [assets/music/CREDITS.md](assets/music/CREDITS.md) 和 manifest.json。原有开场音效、原声与语音文件未更换。
