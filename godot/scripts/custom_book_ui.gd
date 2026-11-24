extends RefCounted

const T=preload("res://scripts/design_tokens.gd")
const LEVELS=["all","basic","skip_basic"]
const LEVEL_LABELS=["全部词汇","只练基础","跳过基础"]
const FILE_LIMIT=2000000
var opened=false
var title_draft=""
var words_draft=null
var preview_only=false
var preview_lines=""
var import_pending=false
var import_failed=false
var import_id=0
var imported_text=""
var imported_name=""
var message=""
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
	preview_lines=""
	message="当前词书已保存 %d 词，可重新导入替换整本。" % saved.count if preview_only else ""
	import_failed=false
	opened=true
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
	import_id+=1
	import_pending=false
	imported_text=""
	imported_name=""
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
	editor.editable=not preview_only and not import_pending
	editor.placeholder_text="每行一个词条，例如：apple\t苹果\nin time\t及时" if not preview_only else "只改书名可直接保存。更新词条请选择新文件。"
	editor.wrap_mode=TextEdit.LINE_WRAPPING_BOUNDARY
	editor.add_theme_font_override("font",h.font)
	editor.add_theme_font_size_override("font_size",17)
	editor.text_changed.connect(func():
		if preview_only or import_pending or editor.text==words_draft:return
		words_draft=editor.text
		message=""
		import_failed=false
		h.error_text=""
		update_controls(h)
		h.queue_redraw()
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
	var save_button=h.button("保存词书",Rect2(x+width-action_width,bottom,action_width,39),func():
		if h.bridge.busy or import_pending or import_failed:return
		h.error_text=""
		message=""
		h.bridge.request("custom_book_save",{"name":title_draft,"text":words_draft})
	,true)
	save_button.name="SaveCustomBook"
	save_button.disabled=import_pending or import_failed

func draw(h) -> void:
	var canvas:Vector2=h.mobile_ui.canvas if h.mobile_ui.enabled else T.CANVAS
	var r=bounds(h)
	h.draw_rect(Rect2(Vector2.ZERO,canvas),T.INK)
	h.panel(r,T.SURFACE,T.EDGE)
	h.draw_rect(Rect2(r.position,Vector2(r.size.x,3)),T.GREEN)
	h.text_at("自定义词书",r.position.x+18,r.position.y+39,25,T.TEXT)
	if r.size.x>=500:
		h.text_at("TXT / CSV / TSV / JSON · UTF-8",r.position.x+198,r.position.y+37,14,T.MUTED,r.size.x-218)
	else:
		h.text_at("TXT / CSV / TSV / JSON",r.position.x+18,r.position.y+56,12,T.MUTED)
	var detail=str(h.error_text) if not h.error_text.is_empty() else message
	if detail.is_empty():detail="最多 12000 词 · 词库可补全已有词义 · 保存到本机"
	h.text_at(detail,r.position.x+18,r.end.y-67,14,T.RED if import_failed or not h.error_text.is_empty() else T.MUTED,r.size.x-36)

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
			input.accept = '.txt,.csv,.tsv,.json,text/plain,text/csv,text/tab-separated-values,application/json';
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
				if (file.size > 2000000) return callback('', '文件超过 2 MB。', '');
				try { callback(await file.text(), '', file.name); }
				catch { callback('', '文件读取失败。', ''); }
			});
			},
			unmount() {
				if (this.cleanup) this.cleanup();
				this.cleanup = null;
			}
		};""",true)
		file_picker=JavaScriptBridge.get_interface("WordBookFilePicker")
	if file_picker:
		imported=JavaScriptBridge.create_callback(func(args):load_text(h,str(args[0]),str(args[1]),str(args[2])))
		var canvas:Vector2=h.mobile_ui.canvas if h.mobile_ui.enabled else T.CANVAS
		file_picker.mount(rect.position.x,rect.position.y,rect.size.x,rect.size.y,canvas.x,canvas.y,imported)

func pick_file(h) -> void:
	if OS.has_feature("web"):return
	var dialog=FileDialog.new()
	dialog.title="导入自定义词书"
	dialog.file_mode=FileDialog.FILE_MODE_OPEN_FILE
	dialog.access=FileDialog.ACCESS_FILESYSTEM
	dialog.filters=PackedStringArray(["*.txt,*.csv,*.tsv,*.json ; 词书文件"])
	h.add_child(dialog)
	dialog.canceled.connect(dialog.queue_free)
	dialog.file_selected.connect(func(path):
		var file=FileAccess.open(path,FileAccess.READ)
		if not file:load_text(h,"","文件读取失败。")
		elif file.get_length()>FILE_LIMIT:load_text(h,"","文件超过 2 MB。")
		else:load_text(h,file.get_as_text(),"",path.get_file())
		dialog.queue_free()
	)
	dialog.popup_centered_ratio(0.7)

func load_text(h,value:String,error:String,filename:String="") -> void:
	if not opened:return
	h.error_text=""
	import_id+=1
	import_failed=false
	import_pending=false
	imported_text=""
	imported_name=""
	if not error.is_empty():
		show_import_error(h,error)
		return
	if value.is_empty() or value.contains("�"):
		show_import_error(h,"文件为空或编码无法读取，请使用 UTF-8 保存。")
		return
	import_pending=true
	imported_text=value
	imported_name=filename
	message="正在检查词表…"
	update_controls(h)
	h.queue_redraw()
	h.bridge.request("custom_book_preview",{"text":value,"requestId":import_id})

func receive_preview(h,result:Dictionary) -> void:
	if not opened or not import_pending or int(result.get("requestId",-1))!=import_id:return
	import_pending=false
	if result.has("error"):
		show_import_error(h,str(result.error))
		return
	preview_lines=str(result.text)
	preview_only=bool(result.previewOnly)
	words_draft=imported_text if preview_only else preview_lines
	if title_draft=="自定义词书" and not imported_name.is_empty():
		title_draft=imported_name.get_basename().strip_edges().left(16)
		if title_draft.is_empty():title_draft="自定义词书"
		var single=h.ui.get_node_or_null("CustomBookName")
		if single:single.text=title_draft
	imported_text=""
	imported_name=""
	var scope="保存将导入整本" if preview_only else "检查后保存"
	message="%d 词 · 合并 %d 条 · 补释义 %d 条 · %s" % [result.count,result.merged,result.supplemented,scope]
	var editor=h.ui.get_node_or_null("CustomBookWords")
	if editor:editor.text=editor_preview()
	update_controls(h)
	h.queue_redraw()

func bridge_failed(h,error:String) -> void:
	if opened and import_pending and h.bridge.action_pending=="custom_book_preview":
		show_import_error(h,error)

func show_import_error(h,error:String) -> void:
	import_pending=false
	import_failed=true
	imported_text=""
	imported_name=""
	message=error
	update_controls(h)
	h.queue_redraw()

func update_controls(h) -> void:
	var editor=h.ui.get_node_or_null("CustomBookWords")
	if editor:editor.editable=not preview_only and not import_pending
	var save_button=h.ui.get_node_or_null("SaveCustomBook")
	if save_button:save_button.disabled=import_pending or import_failed

func editor_preview() -> String:
	if words_draft==null:return ""
	return preview_lines if preview_only else str(words_draft)
