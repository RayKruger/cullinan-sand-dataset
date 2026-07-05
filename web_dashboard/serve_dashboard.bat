@echo off
REM ============================================================================
REM  Geotechnical Test Data Dashboard - plain static HTTP server (Windows)
REM
REM  Double-click this file to view the built dashboard in your browser.
REM  It serves the "dist" folder over http://localhost:PORT and opens the
REM  default browser. (The app fetches JSON data, which browsers block over
REM  file:// -- so it must be served over HTTP, which this script does.)
REM
REM  Optional: pass a port number, e.g.  serve_dashboard.bat 9000
REM  Stop the server with Ctrl+C, then close the window.
REM ============================================================================
setlocal

REM ---- port: first argument if given, otherwise 8000 ----
set "PORT=%~1"
if "%PORT%"=="" set "PORT=8000"

REM ---- move into the built dashboard (dist sits next to this .bat) ----
cd /d "%~dp0dist" 2>nul
if errorlevel 1 (
  echo [ERROR] Could not find the "dist" folder next to this script.
  echo         Expected: %~dp0dist
  echo         Build it first from web_dashboard\ with:  npm install ^&^& npm run build
  echo.
  pause
  exit /b 1
)

REM ---- locate a Python launcher (python, then the py launcher) ----
set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY (
  where py >nul 2>nul && set "PY=py"
)
if not defined PY (
  echo [ERROR] Python 3 was not found on your PATH.
  echo         Install it from https://www.python.org/downloads/
  echo         or, from web_dashboard\, run:  npm install ^&^& npm run preview
  echo.
  pause
  exit /b 1
)

echo ================================================================
echo   Geotechnical Test Data Dashboard - static HTTP server
echo   Serving : %CD%
echo   URL     : http://localhost:%PORT%/
echo   Stop    : press Ctrl+C, then close this window
echo ================================================================
echo.

REM ---- open the default browser a moment after the server comes up ----
start "" cmd /c "timeout /t 2 >nul & explorer http://localhost:%PORT%/"

REM ---- start the plain HTTP server (blocks until Ctrl+C) ----
%PY% -m http.server %PORT%

endlocal
