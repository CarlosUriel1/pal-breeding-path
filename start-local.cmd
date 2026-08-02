@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\vite\bin\vite.js" (
  echo Instalando dependencias locales...
  call npm install
  if errorlevel 1 goto :error
)

echo Iniciando Palworld Breeding Path solo en este equipo.
echo Abre http://127.0.0.1:5199 en tu navegador.
call npm run dev
if errorlevel 1 goto :error
goto :eof

:error
echo.
echo No se pudo iniciar la app. Revisa que Node.js este instalado.
pause
exit /b 1
