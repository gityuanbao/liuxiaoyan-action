extends GameBridge
var api: JavaScriptObject
func _ready() -> void:
	api = JavaScriptBridge.get_interface("WordGame")
	request.call_deferred("state")

func request(action: String, payload: Dictionary = {}) -> void:
	if busy:
		if action != "tick": queued.append([action,payload])
		return
	busy = true
	action_pending = action
	_dispatch.call_deferred(action,payload)

func _dispatch(action: String, payload: Dictionary) -> void:
	if not api:
		busy=false
		failed.emit("学习模块未载入，请刷新网页重试。")
		return
	var response=JSON.parse_string(str(api.command(JSON.stringify({"action":action,"payload":payload}))))
	busy=false
	if not response is Dictionary:
		failed.emit("学习模块返回无效数据。")
	elif not response.get("ok",false):
		failed.emit(response.get("error","操作失败，进度未保存。"))
	else:
		ready_to_play=true
		snapshot=response
		updated.emit(snapshot,str(response.get("uiAction",action)))
	if not queued.is_empty():
		var next=queued.pop_front()
		request(next[0],next[1])
