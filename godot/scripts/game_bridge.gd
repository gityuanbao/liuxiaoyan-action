class_name GameBridge
extends Node

signal updated(data: Dictionary, action: String)
signal failed(message: String)
var snapshot: Dictionary = {}
var snapshot_sequence = 0
var port = 0
var token = ""
var pid = -1
var busy = false
var ready_to_play = false
var action_pending = ""
var client: HTTPRequest
var queued: Array = []
var retries = 0
var startup_clock = 0.0

func _ready() -> void:
	client = HTTPRequest.new()
	client.timeout = 3
	add_child(client)
	client.request_completed.connect(_response)
	port = randi_range(22000, 48000)
	token = str(Time.get_ticks_usec()) + "-" + str(randi())
	var executable = OS.get_environment("WORD_GAME_NODE")
	if executable.is_empty():
		executable = "C:/Program Files/nodejs/node.exe" if OS.get_name() == "Windows" else "node"
	if OS.get_name() == "Windows" and not FileAccess.file_exists(executable):
		executable = "node"
	var base = ProjectSettings.globalize_path("res://bridge/server.mjs")
	var save_path = ProjectSettings.globalize_path("user://learning.json")
	if OS.get_cmdline_user_args().has("--flow-qa"):
		save_path=ProjectSettings.globalize_path("user://qa-flow-learning.json")
		for suffix in ["",".books.json",".study.json"]:
			if FileAccess.file_exists(save_path+suffix): DirAccess.remove_absolute(save_path+suffix)
	elif OS.get_cmdline_user_args().has("--memory-qa"):
		save_path=ProjectSettings.globalize_path("user://qa-memory-learning.json")
	elif OS.get_cmdline_user_args().has("--qa"):
		save_path = ProjectSettings.globalize_path("user://qa-learning.json")
		if FileAccess.file_exists(save_path): DirAccess.remove_absolute(save_path)
	elif OS.get_cmdline_user_args().has("--study-qa"):
		save_path=ProjectSettings.globalize_path("user://qa-study-learning.json")
		for suffix in ["",".books.json",".study.json"]:
			if FileAccess.file_exists(save_path+suffix): DirAccess.remove_absolute(save_path+suffix)
	elif OS.get_cmdline_user_args().has("--voice-qa") or OS.get_cmdline_user_args().has("--smoke") or OS.get_cmdline_user_args().has("--audio-qa") or OS.get_cmdline_user_args().has("--page-voice-qa") or OS.get_cmdline_user_args().has("--startup-qa") or OS.get_cmdline_user_args().has("--meme-qa"):
		save_path = ProjectSettings.globalize_path("user://qa-preview-learning.json")
	pid = OS.create_process(executable, PackedStringArray([base, str(port), token, save_path, str(OS.get_process_id())]), false)
	if pid < 0:
		failed.emit("未找到 Node.js 22.18+。安装后重开，或设置 WORD_GAME_NODE。")
	request("state")

func request(action: String, payload: Dictionary = {}) -> void:
	if busy:
		if action != "tick": queued.append([action, payload])
		return
	busy = true
	action_pending = action
	var error = client.request("http://127.0.0.1:%s/" % port, PackedStringArray(["Content-Type: application/json", "Authorization: Bearer " + token]), HTTPClient.METHOD_POST, JSON.stringify({"action": action, "payload": payload,"transport":"delta-v1","snapshot_sequence":snapshot_sequence}))
	if error != OK:
		busy = false
		failed.emit("本地玩法连接失败。")

func _response(result: int, _code: int, _headers: PackedStringArray, bytes: PackedByteArray) -> void:
	busy = false
	if result != HTTPRequest.RESULT_SUCCESS:
		if not ready_to_play and retries < 30:
			retries += 1
			await get_tree().create_timer(0.25).timeout
			request("state")
		else: failed.emit("玩法服务未连接。请确认 Node.js 22.18+ 可用，查看 bridge 日志。")
		return
	var response = JSON.parse_string(bytes.get_string_from_utf8())
	if not response is Dictionary:
		failed.emit("玩法服务返回无效数据。")
		return
	if not response.get("ok", false):
		failed.emit(response.get("error", "操作失败，进度未保存。"))
	else:
		ready_to_play = true
		# Replace only changed top-level fields in a fresh dictionary. Existing UI
		# snapshots must remain unchanged for hit/reward comparisons.
		var is_patch=bool(response.get("__snapshot_patch",false))
		var removed:Array=response.get("__snapshot_removed",[])
		snapshot_sequence=int(response.get("__snapshot_sequence",0))
		response.erase("__snapshot_sequence")
		response.erase("__snapshot_patch");response.erase("__snapshot_removed")
		if is_patch:
			var merged=snapshot.duplicate()
			for key in removed:merged.erase(key)
			merged.merge(response,true)
			response=merged
		snapshot = response
		updated.emit(snapshot, "daily_start" if action_pending=="mobile_plan_start" else action_pending)
	if not queued.is_empty():
		var next = queued.pop_front()
		request(next[0], next[1])

func _exit_tree() -> void:
	if pid > 0 and OS.is_process_running(pid): OS.kill(pid)
