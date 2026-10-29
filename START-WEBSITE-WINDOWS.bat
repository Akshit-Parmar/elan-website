@echo off
cd /d "%~dp0"
py -3 --version >nul 2>&1
if not errorlevel 1 (
 py -3 start_website.py
 goto finished
)
python --version >nul 2>&1
if not errorlevel 1 (
 python start_website.py
 goto finished
)
echo Python 3 is required for the live-connected local server.
echo Install it from https://www.python.org/downloads/ then try again.
echo You can browse without installing anything: open OPEN-WEBSITE.html instead.
:finished
pause
