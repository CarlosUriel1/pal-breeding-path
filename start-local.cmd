@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\vite\bin\vite.js" (
  echo Instalando dependencias locales...
  call npm install
  if errorlevel 1 goto :install_error
)

echo Iniciando Palworld Breeding Path solo en este equipo.
echo Abre http://127.0.0.1:5199 en tu navegador.
call npm run dev
if errorlevel 1 goto :dev_error
goto :eof

:install_error
echo.
echo No se pudieron instalar las dependencias. Revisa que Node.js este instalado.
pause
exit /b 1

:dev_error
echo.
echo No se pudo iniciar la app. Revisa que el puerto 5199 no este ocupado por otra aplicacion y que Node.js este instalado.
pause
exit /b 1
