Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir
WshShell.Run "cmd.exe /c """ & scriptDir & "\auto-backup-hourly.bat""", 0, False
Set WshShell = Nothing
Set fso = Nothing
