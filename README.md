# 刘晓艳行动

**把背单词变成一场行动。**

刘晓艳行动是一款把英语单词学习融入闯关战斗的游戏，由 Git源宝团队制作。选择四级、六级或考研词书，通过拼写和四选一练习完成训练，在战斗中积累经验、获得哈弗币，并按学习计划持续复习。

这个公开仓库用于分享游戏项目、提供版本下载、记录后续更新，也欢迎大家反馈体验和问题。

**[下载 v51 完整项目包](https://github.com/gityuanbao/liuxiaoyan-action/releases/download/v51/liuxiaoyan-action-v51-godot-github.zip)** · **[查看所有版本](https://github.com/gityuanbao/liuxiaoyan-action/releases)** · **[反馈问题](https://github.com/gityuanbao/liuxiaoyan-action/issues)**

> 当前版本：**v51（Godot）**。下载包包含完整源码、素材、词库、语音和已导出的网页版；当前未提供独立的 Windows `.exe` 安装包。解压后可按下文运行网页版，或在 Godot 编辑器中运行。

## 可以怎么玩

- **按考试选词书**：大学英语四级、大学英语六级、考研英语。
- **拼写与四选一训练**：拼写练习用于主动回忆；选择题帮助辨认词义，答题后有反馈，错题会穿插重练。
- **制定学习计划**：每轮可选 5 / 10 / 15 个词，每日目标可选 5 / 10 / 20 / 30 个词。
- **战斗与成长**：把单词输入融入战斗，获得经验和哈弗币，体验远征关卡、职业技能和成长系统。
- **百词挑战**：挑战“英语总监”，完成 100 词训练。
- **间隔复习与打卡**：使用 FSRS 安排复习，记录每日目标与学习进度；同一单词在同一天只计一次。
- **单词读音**：网页版已随包提供单词语音资源。

| 词书 | 当前词条数 |
| --- | ---: |
| 大学英语四级 | 3,837 |
| 大学英语六级 | 5,396 |
| 考研英语 | 4,801 |

以上为各词书的词条数，不同词书之间可能包含相同单词。

## 下载与运行

### 方式一：下载后运行网页版

适合想先体验游戏的玩家，无需安装 Godot 或 Node.js。

1. 打开 [Releases 下载页](https://github.com/gityuanbao/liuxiaoyan-action/releases)，在 **Assets** 中下载 `liuxiaoyan-action-v51-godot-github.zip`。
2. 完整解压压缩包，保留目录结构。
3. 安装 Python 3，在解压后的项目根目录打开终端，运行：

   ```bash
   python -m http.server 8000 --bind 127.0.0.1 --directory docs
   ```

   Windows 如果提示找不到 `python`，可尝试将命令开头改为 `py`。

4. 在浏览器中打开 **http://localhost:8000/**，等待资源加载完成，点击“开始行动”。

运行时请保持终端窗口开启；结束后按 `Ctrl+C` 停止本地服务。请通过本地 HTTP 服务打开游戏，不要直接双击 `docs/index.html`。手机游玩时请使用横屏；上面的本地命令仅供当前电脑访问。

### 方式二：在 Godot 编辑器中运行

适合希望查看项目、调整玩法或继续开发的朋友。

**环境要求**

- Godot **4.5.1 标准版**。
- Node.js **22.18 或更高版本**，用于运行本机学习与战斗服务。

**操作步骤**

1. 下载并解压项目，或克隆仓库：

   ```bash
   git clone https://github.com/gityuanbao/liuxiaoyan-action.git
   ```

2. 在 Godot 项目管理器中导入 `godot/project.godot`。
3. 等待首次资源导入结束，按 **F5** 运行。

如果 Node.js 安装在自定义位置，可将环境变量 `WORD_GAME_NODE` 设为 Node 可执行文件的完整路径，然后重新启动 Godot。

## 进度与存档

- **网页版**：进度保存在当前浏览器的本地存储中，并与访问站点及路径关联。
- **备份**：点击网页顶栏的“导出进度”，可下载 JSON 存档备份。当前页面提供导出按钮，不提供导入入口。
- **更换环境**：换浏览器、换设备、改变站点地址或清除站点数据后，原进度不会自动同步。
- **Godot 运行版**：使用独立的本机用户数据目录 `Godot/app_userdata/LiuXiaoyanAction-GitHub`。

建议在清理浏览器数据或切换游玩环境前导出进度，保留备份。

## 项目结构

```text
liuxiaoyan-action/
├── docs/                   # 已导出的网页版、语音与第三方许可
├── godot/
│   ├── project.godot       # Godot 项目入口
│   ├── scenes/             # 游戏场景
│   ├── scripts/            # 界面、输入和动效
│   ├── bridge/             # 学习、复习与战斗服务
│   ├── data/books/         # 词库数据
│   ├── assets/             # 美术、字体、音效等素材
│   ├── legacy/             # 项目保留的原有玩法代码
│   └── vendor/             # 随项目提供的第三方依赖
├── web/                    # 浏览器适配与构建脚本
├── COPYRIGHT.md            # 项目制作与版权声明
├── README.original.md      # v51 压缩包自带的原始说明
└── README.md
```

## 修改后重新构建

修改学习规则或浏览器适配后，在 `web/` 目录运行：

```bash
npm ci
npm run build
```

这会更新 `docs/learning.js`。修改场景、Godot 脚本或美术后，还需在 Godot 中安装与 **4.5.1** 匹配的导出模板，在 **项目 → 导出 → Web** 中按现有预设重新导出到 `docs/index.html`。

重新导出后，先用上面的本地 HTTP 服务检查，再提交修改过的源文件与 `docs/`。

## 常见问题

**下载后为什么找不到安装程序？**

当前 v51 分享的是完整工程和网页版。可以使用“方式一”在浏览器中体验，或使用“方式二”在 Godot 中运行。后续发布的版本和下载附件统一在 [Releases](https://github.com/gityuanbao/liuxiaoyan-action/releases) 查看。

**浏览器打开后没有进入游戏？**

确认通过 `http://localhost:8000/` 访问，压缩包已经完整解压，本地服务仍在运行。首次加载需要读取游戏资源，请等待加载完成后再点击“开始行动”。

**Godot 提示找不到 Node.js 或玩法服务未连接？**

检查 Node.js 版本与安装位置；如使用自定义路径，设置 `WORD_GAME_NODE` 后重启 Godot。

**如何反馈问题？**

请在 [Issues](https://github.com/gityuanbao/liuxiaoyan-action/issues) 中说明游戏版本、操作系统、浏览器或 Godot 版本、复现步骤，并尽量附上截图或错误信息。

## 制作与第三方说明

**Git源宝团队制作。** 项目制作署名见 [版权声明](COPYRIGHT.md)。

- 词典、复习算法及依赖说明：[godot/OPEN_SOURCE.md](godot/OPEN_SOURCE.md)。
- 图片、人物、音视频及其他素材出处：[godot/ASSET_SOURCES.md](godot/ASSET_SOURCES.md)。
- 第三方许可与声明：[docs/licenses/](docs/licenses/)。

仓库保留原项目的版权及许可文件；第三方代码和素材适用各自的许可条款。
