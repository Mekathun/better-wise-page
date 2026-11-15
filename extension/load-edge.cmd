@echo off
rem Quit Edge completely first (no msedge.exe in Task Manager), then run this file.
rem It starts Edge with the default profile and loads the extension from this folder.
setlocal
set "EXT=%~dp0"
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" (
  echo Microsoft Edge not found.
  pause
  exit /b 1
)
start "" "%EDGE%" --load-extension="%EXT%"
endlocal
