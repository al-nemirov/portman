' === PORTMAN — тихий запуск без окна консоли ===
' Двойной клик: сервер стартует в фоне, браузер открывается на UI.
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = dir
sh.Run "node """ & dir & "\bin\portman.js"" ui", 0, False
