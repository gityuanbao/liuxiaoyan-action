extends Control

const T = preload("res://scripts/design_tokens.gd")
const VERSION = "v58"
const CHANGES = [
	["词书导入", "支持 TXT、CSV、TSV 和 JSON。导入前可核对词条数量、重复项和释义。"],
	["学习排行榜", "B 站 Toy 展示累计学习经验前十名。每天可膜拜一位榜上玩家，领取 10 哈弗币。"],
	["训练复盘", "结算显示本轮单词和释义。答错过的词会重点标记，方便回顾。"],
]

var card: PanelContainer
var close_button: Button
var return_focus: WeakRef

func show_for(host: Control) -> void:
	name = "VersionNotes"
	var focused = host.get_viewport().gui_get_focus_owner()
	if focused:
		return_focus = weakref(focused)
	z_index = 150
	mouse_filter = MOUSE_FILTER_STOP
	host.add_child(self)
	set_anchors_and_offsets_preset(PRESET_FULL_RECT)

	var shade = ColorRect.new()
	shade.color = Color(T.INK, 0.85)
	shade.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(shade)
	shade.set_anchors_and_offsets_preset(PRESET_FULL_RECT)

	card = PanelContainer.new()
	var card_style = T.style(T.DEEP, T.EDGE)
	card_style.content_margin_top = 16
	card_style.content_margin_bottom = 16
	card.add_theme_stylebox_override("panel", card_style)
	add_child(card)
	var content = VBoxContainer.new()
	content.add_theme_constant_override("separation", 12)
	card.add_child(content)

	var header = HBoxContainer.new()
	header.add_theme_constant_override("separation", 10)
	content.add_child(header)
	var title = make_label("版本更新  " + VERSION, host.get("display_font"), 24, T.GREEN)
	title.size_flags_horizontal = SIZE_EXPAND_FILL
	header.add_child(title)
	close_button = Button.new()
	close_button.name = "CloseVersionNotes"
	close_button.text = "关闭"
	close_button.custom_minimum_size = Vector2(76, 40)
	close_button.add_theme_font_override("font", host.get("font"))
	close_button.add_theme_font_size_override("font_size", 16)
	close_button.add_theme_stylebox_override("normal", T.style(T.PANEL, T.EDGE))
	close_button.add_theme_stylebox_override("hover", T.style(T.SELECTED, T.GREEN))
	close_button.add_theme_stylebox_override("focus", T.style(Color.TRANSPARENT, T.GREEN, 2))
	close_button.focus_next = NodePath(".")
	close_button.focus_previous = NodePath(".")
	close_button.pressed.connect(close)
	header.add_child(close_button)

	var divider = ColorRect.new()
	divider.color = T.EDGE
	divider.custom_minimum_size.y = 1
	content.add_child(divider)

	var scroll = ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	scroll.size_flags_vertical = SIZE_EXPAND_FILL
	content.add_child(scroll)
	var list = VBoxContainer.new()
	list.size_flags_horizontal = SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation", 10)
	scroll.add_child(list)
	for change in CHANGES:
		var item = VBoxContainer.new()
		item.add_theme_constant_override("separation", 2)
		item.add_child(make_label(change[0], host.get("display_font"), 17, T.TEXT))
		var description = make_label(change[1], host.get("font"), 16, T.MUTED)
		description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		item.add_child(description)
		list.add_child(item)

	resized.connect(update_card_bounds)
	update_card_bounds()
	close_button.grab_focus()

func make_label(value: String, typeface: Font, px: int, color: Color) -> Label:
	var label = Label.new()
	label.text = value
	label.add_theme_font_override("font", typeface)
	label.add_theme_font_size_override("font_size", px)
	label.add_theme_color_override("font_color", color)
	return label

func update_card_bounds() -> void:
	var desired = Vector2(minf(size.x - 32, 588), minf(size.y - 32, 324))
	card.size = desired
	card.position = (size - card.size) / 2.0

func close() -> void:
	hide()
	if return_focus and is_instance_valid(return_focus.get_ref()):
		return_focus.get_ref().grab_focus()
	queue_free()
