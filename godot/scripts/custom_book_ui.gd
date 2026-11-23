extends RefCounted

const T=preload("res://scripts/design_tokens.gd")
const LEVELS=["all","basic","skip_basic"]
const LEVEL_LABELS=["全部词汇","只练基础","跳过基础"]
const FILE_LIMIT=2000000
var opened=false
var title_draft=""
var words_draft=null
var preview_only=false
var message=""
var failed=false
var imported:JavaScriptObject
var file_picker:JavaScriptObject

static func count(book:Dictionary, difficulty:String) -> int:
	var basic=int(book.get("basicCount",0))
	var total=int(book.get("count",0))
	return basic if difficulty=="basic" else total-basic if difficulty=="skip_basic" else total

func open(h) -> void:
	var saved=h.data.get("customBook")
	title_draft=str(saved.name) if saved is Dictionary else "自定义词书"
	words_draft=saved.text if saved is Dictionary else ""
	preview_only=words_draft==null
	message="当前词书已保存 %d 词，可重新导入替换整本。" % saved.count if preview_only else ""
	failed=false;opened=true
	h.error_text=""
	h.rebuild()
	h.queue_redraw()

func close(h) -> void:
	dismiss()
	h.error_text=""
	h.rebuild()
	h.queue_redraw()

func dismiss() -> void:
	opened=false
	if file_picker:file_picker.unmount()

func bounds(h) -> Rect2:
	var canvas:Vector2=h.mobile_ui.canvas if h.mobile_ui.enabled else T.CANVAS
	if h.mobile_ui.enabled:
		return Rect2(18,18,canvas.x-36,minf(364,canvas.y-36))
	return Rect2(206,94,868,504)

func build(h) -> void:
	var r=bounds(h)
	var x=r.position.x+18
	var width=r.size.x-36
	var single=LineEdit.new()
	single.position=Vector2(x,r.position.y+62)
	single.size=Vector2(width,38)
	single.max_length=16
	single.text=title_draft
	single.placeholder_text="词书名称"
	single.name="CustomBookName"
	single.add_theme_font_override("font",h.font)
	single.add_theme_font_size_override("font_size",17)
	single.text_changed.connect(func(value):title_draft=value)
	h.ui.add_child(single)
	var editor=TextEdit.new()
	editor.position=Vector2(x,r.position.y+118)
	editor.size=Vector2(width,r.size.y-224)
	editor.name="CustomBookWords"
	editor.text=editor_preview()
	editor.editable=not preview_only
	editor.placeholder_text="选择词表文件，或在这里填写英文和释义。" if not preview_only else "保存可修改书名。更新词条时请选择文件。"
	editor.wrap_mode=TextEdit.LINE_WRAPPING_BOUNDARY
	editor.add_theme_font_override("font",h.font)
	editor.add_theme_font_size_override("font_size",17)
	editor.text_changed.connect(func():
		if not preview_only:words_draft=editor.text
	)
	h.ui.add_child(editor)
	var bottom=r.end.y-53
	var action_width=minf(132,(width-20)/3)
	var import_rect=Rect2(x,bottom,action_width,39)
	var import_button=h.button("导入文件",import_rect,func():pick_file(h))
	import_button.name="ImportCustomBook"
	if OS.has_feature("web"):
		import_button.focus_mode=Control.FOCUS_NONE
		mount_web_picker(h,import_rect)
	h.button("取消",Rect2(x+width-action_width*2-10,bottom,action_width,39),func():close(h)).name="CancelCustomBook"
	h.button("保存词书",Rect2(x+width-action_width,bottom,action_width,39),func():
		if h.bridge.busy:return
		h.error_text="";message=""
		h.bridge.request("custom_book_save",{"name":title_draft,"text":words_draft})
	,true).name="SaveCustomBook"

func draw(h) -> void:
	var canvas:Vector2=h.mobile_ui.canvas if h.mobile_ui.enabled else T.CANVAS
	var r=bounds(h)
	h.draw_rect(Rect2(Vector2.ZERO,canvas),T.INK)
	h.panel(r,T.SURFACE,T.EDGE)
	h.draw_rect(Rect2(r.position,Vector2(r.size.x,3)),T.GREEN)
	h.text_at("自定义词书",r.position.x+18,r.position.y+39,25,T.TEXT)
	if r.size.x>=500:
		h.text_at("TXT / CSV / TSV · 每行一词和释义",r.position.x+198,r.position.y+37,14,T.MUTED,r.size.x-218)
	else:
		h.text_at("TXT / CSV / TSV",r.position.x+18,r.position.y+56,12,T.MUTED)
	var detail=str(h.error_text) if not h.error_text.is_empty() else message
	if detail.is_empty():detail="支持整本导入，最多 12000 词。词表保存在当前设备。"
	h.text_at(detail,r.position.x+18,r.end.y-67,14,T.RED if failed or not h.error_text.is_empty() else T.MUTED,r.size.x-36)

func mount_web_picker(h,rect:Rect2) -> void:
	if not file_picker:
		JavaScriptBridge.eval("""window.WordBookFilePicker = {
			mount(x, y, width, height, viewWidth, viewHeight, callback) {
			this.unmount();
			const canvas = document.getElementById('canvas');
			const control = document.createElement('label');
			const input = document.createElement('input');
			input.type = 'file';
			input.id = 'word-book-file';
			input.accept = '.txt,.csv,.tsv,text/plain,text/csv,text/tab-separated-values';
			input.setAttribute('aria-label', '导入词书文件');
			control.htmlFor = input.id;
			control.id = 'word-book-file-control';
			Object.assign(control.style, {position:'fixed', zIndex:'12', opacity:'0', cursor:'pointer'});
			Object.assign(input.style, {position:'absolute', width:'1px', height:'1px', clipPath:'inset(50%)'});
			control.appendChild(input);
			const position = () => {
				const bounds = canvas.getBoundingClientRect();
				const sx = bounds.width / viewWidth, sy = bounds.height / viewHeight;
				Object.assign(control.style, {
					left:(bounds.left + x * sx) + 'px', top:(bounds.top + y * sy) + 'px',
					width:width * sx + 'px', height:height * sy + 'px'
				});
			};
			position();
			document.body.appendChild(control);
			const observer = new ResizeObserver(position);
			observer.observe(canvas);
			addEventListener('resize', position);
			this.cleanup = () => {
				observer.disconnect();
				removeEventListener('resize', position);
				control.remove();
			};
			input.addEventListener('change', async () => {
				const file = input.files[0];
				input.value = '';
				if (!file) return;
				if (file.size > 2000000) return callback('', '文件超过 2 MB。');
				try { callback(await file.text(), ''); }
				catch { callback('', '文件读取失败。'); }
			});
			},
			unmount() {
				if (this.cleanup) this.cleanup();
				this.cleanup = null;
			}
		};""",true)
		file_picker=JavaScriptBridge.get_interface("WordBookFilePicker")
	if file_picker:
		imported=JavaScriptBridge.create_callback(func(args):load_text(h,str(args[0]),str(args[1])))
		var canvas:Vector2=h.mobile_ui.canvas if h.mobile_ui.enabled else T.CANVAS
		file_picker.mount(rect.position.x,rect.position.y,rect.size.x,rect.size.y,canvas.x,canvas.y,imported)

func pick_file(h) -> void:
	if OS.has_feature("web"):return
	var dialog=FileDialog.new()
	dialog.title="导入自定义词书"
	dialog.file_mode=FileDialog.FILE_MODE_OPEN_FILE
	dialog.access=FileDialog.ACCESS_FILESYSTEM
	dialog.filters=PackedStringArray(["*.txt,*.csv,*.tsv ; 词书文件"])
	h.add_child(dialog)
	dialog.canceled.connect(dialog.queue_free)
	dialog.file_selected.connect(func(path):
		var file=FileAccess.open(path,FileAccess.READ)
		if not file:load_text(h,"","文件读取失败。")
		elif file.get_length()>FILE_LIMIT:load_text(h,"","文件超过 2 MB。")
		else:load_text(h,file.get_as_text(),"")
		dialog.queue_free()
	)
	dialog.popup_centered_ratio(0.7)

func load_text(h,value:String,error:String) -> void:
	if not opened:return
	h.error_text=""
	failed=not error.is_empty()
	if failed:
		message=error
	elif value.is_empty() or value.contains("�"):
		failed=true;message="文件为空或编码无法读取，请使用 UTF-8 保存。"
	else:
		words_draft=value
		preview_only=value.length()>24000 or value.count("\n")>200
		var editor=h.ui.get_node_or_null("CustomBookWords")
		if editor:
			editor.text=editor_preview()
			editor.editable=not preview_only
		message="正在预览开头，保存将导入整本词表。" if preview_only else "已读取文件，可检查词条后保存。"
	h.queue_redraw()

func editor_preview() -> String:
	if words_draft==null:return ""
	if not preview_only:return words_draft
	return "\n".join(str(words_draft).substr(0,1600).split("\n",true,13).slice(0,13))
