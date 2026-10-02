Set WshShell = CreateObject("WScript.Shell")

' 1. Lanzar Google Antigravity 2.0 (modo normal)
WshShell.Run """C:\Users\Administrador.Serz\AppData\Local\Programs\antigravity\Antigravity.exe""", 1, False

' 2. Lanzar Antigravity Island Companion (modo silencioso sin consola)
WshShell.Run """D:\Proyectos\antigravity-island\release\win-unpacked\Antigravity Island.exe""", 0, False
