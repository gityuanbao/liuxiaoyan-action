最新补充：标题已改为独立生成的战术字标，开场、加载与各页顶部统一使用。见 [WORDMARK_V18.md](WORDMARK_V18.md)。

# 极简三角徽记 · v17

2026-11-12，使用内置 image_gen 编辑生成。参考项目原有的银发、眼镜、叼笔教师图标，以及用户指定的 [三角洲新版启动动画](https://www.bilibili.com/video/BV1cWNJeoEPb/) 中黑底白色三角标志的简洁程度。保留自己的教师剪影和游戏名称。

去除写实面部纹理、背心细节和橙色外框，以白色大块轮廓、眼镜负形、斜向笔形和炭黑内底表达身份。外部透明；游戏角色美术没有通过代码重新绘制。生成后仅做 PNG 尺寸与 ICO 格式转换。

- `demulan-emblem-v17-master.png`：1254 × 1254，生成原图。
- `demulan-emblem-v17.png`：256 × 256，项目与窗口图标、开场及大厅标志。
- `demulan-header-v17.png`：44 × 44，大厅图标使用预缩小版本以保留边缘平滑。
- `demulan-v17.ico`：16 / 24 / 32 / 48 / 64 / 128 / 256 像素 Windows 图标。
- 新版本文件名同步到 `project.godot`、`boot_loader.gd`、`delta_ui.gd`、`Create-Shortcut.ps1`。当前电脑的项目快捷方式与桌面快捷方式亦已更新。
- 原图标保留在 `demulan-icon-master.png` / `demulan-icon.png` / `demulan.ico`，供历史比对。

## 生成提示词

Use case: logo-brand / identity-preserve. Create ONE exceptionally simple production game emblem for the fan vocabulary game 刘晓燕行动, no text. Image 1 is the character identity to simplify: silver slicked-back hair, low angular glasses, stern eyes, pen held diagonally at mouth. Image 2 is ONLY a reference for extreme simplicity, solid white geometric silhouette and triangular tactical silhouette on black; do not copy its lightning symbol or its lettering. Replace the complex realistic portrait from Image 1 with a bold compact angular stencil emblem: a thick upright WHITE triangular frame filled with solid near-black charcoal interior, containing a very simplified WHITE silhouette of that teacher's face, recognizable ONLY from three large silver-hair spikes, one thick glasses brow shape and one diagonal pen slash. At most 5-7 large connected white/charcoal shape masses for the face. Front-facing and symmetrical except the diagonal pen. Strong negative space, large openings, no fine lines, no wrinkles, no vest detailing, no neck accessories, no extra rings, no rectangle, no rounded-square plate, no orange border, no shading, no gradients, no light effects, no texture, no bevel, no 3D. The triangle should be wide and squat enough to be readable in a 32px desktop icon; triangle occupies about 88% of square canvas width and 82% of height with generous clear margins. Preserve a genuinely transparent exterior outside the triangular emblem; the triangular interior is opaque charcoal so it reads on both light and dark desktops. Crisp professional graphic designer mark, flat two-tone white and charcoal, centered single icon on transparent canvas. Do NOT return a contact sheet, logo mockup or variations.

---

历史版本记录：

# 德穆兰游戏图标

采用用户前面提供的银发、眼镜、战术背心形象，由内置 image_gen 按该参考生成。不是官方图标。未使用先前黑发笑脸的候选图。

- `demulan-icon-master.png`：生成原图。
- `demulan-icon.png`：256×256 项目/窗口图标。
- `demulan.ico`：Windows 16、24、32、48、64、128、256 像素图标。
- `project.godot` 已接入 PNG 与 Windows 原生图标；项目中的“创建游戏快捷方式.cmd”可在当前目录建立带此图标的启动入口，移动项目后重新创建即可。
- 游戏所有页面左上角“刘晓燕行动”旁也使用此图标，显示尺寸 44×44，标题和导航留有独立间距。

仅做尺寸和格式转换，未使用代码绘制图像。

生成提示词：

Use case: identity-preserve. Asset: one square game desktop icon for 刘晓燕行动. The attached image is the required character identity reference. Use ONLY the CENTRAL SILVER-HAIRED ELDERLY ENGLISH TEACHER character in tactical vest and round wire eyeglasses, whose mouth holds a short pen. Preserve her exact distinctive silver combed-back short hair, thin glasses low on her nose, deeply furrowed raised eyebrows, eyes almost closed, comically stern unimpressed wrinkled expression, grey shirt and black plate carrier. Make a refined high-quality game illustration/icon, realistic painted texture, crisp shape readable at small sizes. Crop to a very large centered head and upper shoulders; do not include the soldiers or scene behind her, or the text banner, the red insignia, white top strip, triangle collectible badges or any extra person. Surround the close-up with a simple charcoal-black and dark military-green clipped-corner square badge with one thin tactical-orange outline, nearly filling the entire square. Face about 70 percent of frame, silver hair clearly readable, controlled soft lighting, dark uncluttered background. No text, no lettering, no words, no watermarks, no grids or multiple variations, no other franchise characters, no mockup. The final image is a single ready-to-use app icon. This silver-haired version replaces the previous dark-haired smiley icon; do not use the previous version's face.
