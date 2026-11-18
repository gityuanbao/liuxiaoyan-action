# 开源学习功能的集成

## 实际集成

- [ECDICT](https://github.com/skywind3000/ECDICT)，MIT：四级、六级、考研词条、中文释义和词频。数据及许可证见 `data/books/`。
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs/tree/v5.2.3)，5.2.3，MIT，Copyright (c) 2025 Open Spaced Repetition：直接调用发布包的原始 ESM 实现，使用 FSRS 6 计算下一次复习。文件在 `vendor/ts-fsrs/`，由 npm 发布包 SHA-512 校验来源，许可证和版本信息一并保留。无需运行时 npm 安装或联网。

## 流程参考

[Qwerty Learner](https://github.com/RealKai42/qwerty-learner) 是开源的键盘拼写与单词学习项目，GPL-3.0。本项目参考词书分组、逐词拼写和学习进度的流程，自行实现 Godot 页面；没有复制其代码或词典。界面继续使用当前三角洲主题。

## 游戏中的应用

学习中心选内容 → 每轮 5/10/15 词 → 拼写触发原有战斗函数 → 完整词单后结算 → 每日目标达标打卡 → 到期进入复习。

默认每天 20 个不同单词，可调整；错拼不增加完成数，同词同日只计一次。每次普通词输入都保存独立学习数据，关闭游戏也保留进度。长句大招不计作一个新词。FSRS 的提示/跟打/错拼与独立回忆采用不同评分，避免把照抄当成掌握。

新训练模式增加敌方增援，避免原低血量关卡打几词就结束而漏掉所选内容。所有原始 `legacy/` 文件、十二关远征、职业技能函数和原学习档案结构保持原样。
