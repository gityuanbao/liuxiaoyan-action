# 刘晓艳行动 · Godot v51

在四级、六级和考研词书中选择学习计划，通过拼写或四选一完成战斗、积累经验和哈弗币。英语总监百词挑战会在选择题反馈后自动推进。

## 在 Godot 编辑器中运行

安装 Godot 4.5.1 标准版和 Node.js 22.18 或更高版本。解压项目，在 Godot 项目管理器中导入 `godot/project.godot`，首次资源导入结束后按 **F5**。桌面版由 Godot 启动本机 Node 进程处理学习与战斗。使用自定义 Node 安装路径时，可将环境变量 `WORD_GAME_NODE` 设为可执行文件的完整路径。

场景位于 `godot/scenes/`，界面、动效和输入在 `godot/scripts/`，词书在 `godot/data/books/`，战斗和复习逻辑在 `godot/bridge/` 与 `godot/legacy/`。本工程的桌面存档保存在独立的 Godot 用户数据目录。

## 发布到 GitHub

解压后，将包含本 README 的目录作为仓库根目录，通过 Git 或 GitHub Desktop 提交并推送。若提供整包下载，也可以将 ZIP 放入 GitHub Release 的附件。

要让访客直接游玩，在仓库 **Settings → Pages** 中选择 **Deploy from a branch**，选择存放游戏的分支和 **/docs**，然后保存。`docs/` 中已经包含 Godot 单线程 Web 导出、字标和单词读音。部署方式见 [GitHub Pages 文档](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

本地预览可在仓库根目录运行 `python -m http.server 8000 --directory docs`，然后访问 `http://localhost:8000/`。手机横屏游玩。网页进度按当前浏览器和站点路径保存在本地，可在顶栏导出 JSON 备份。换设备或清除站点数据后，原浏览器的进度不会自动恢复。

## 修改后重新导出

1. 改动学习规则或浏览器适配时，在 `web/` 中执行 `npm install` 和 `npm run build`，更新 `docs/learning.js`。
2. 改动场景、脚本或美术时，在 Godot 中安装匹配 4.5.1 的导出模板，打开 **项目 → 导出 → Web**，按预设导出到 `docs/index.html`。
3. 在本地 HTTP 预览确认后，将更新的源文件和 `docs/` 一起提交。

## 素材与署名

项目制作署名见 [版权声明](COPYRIGHT.md)。词典、复习算法与依赖见 [项目说明](godot/OPEN_SOURCE.md)。人物、音视频片段和其他第三方素材的出处见 [素材清单](godot/ASSET_SOURCES.md) 与 [许可目录](docs/licenses/)。这些素材按各自的权利与许可使用。
