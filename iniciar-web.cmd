@echo off
setlocal EnableExtensions
title Proyecto - Aplicacion web

set "PROJECT_DIR=%~dp0"
set "NODE_DIR=C:\Program Files\nodejs"
set "PATH=%NODE_DIR%;%PATH%"

if not exist "%NODE_DIR%\npm.cmd" (
  echo ERROR: Node.js no esta instalado en "%NODE_DIR%".
  echo Instala Node.js LTS antes de continuar.
  pause
  exit /b 1
)

if not exist "%PROJECT_DIR%web\package.json" (
  echo ERROR: No se encuentra web\package.json.
  pause
  exit /b 1
)

cd /d "%PROJECT_DIR%web"

if not exist "node_modules\.package-lock.json" (
  echo Instalando dependencias del frontend por primera vez...
  call "%NODE_DIR%\npm.cmd" ci
  if errorlevel 1 (
    echo.
    echo ERROR: No se pudieron instalar las dependencias.
    pause
    exit /b 1
  )
)

echo Iniciando la aplicacion web...
echo Para detenerla, pulsa Ctrl+C.
call "%NODE_DIR%\npm.cmd" run dev

if errorlevel 1 (
  echo.
  echo ERROR: La aplicacion web se ha detenido con un error.
  pause
  exit /b 1
)

