# ADB Device Manager v3.1.0

A comprehensive Python Flask application for controlling multiple Android devices via ADB with a modern web dashboard and live device viewing capabilities.

## 🚀 New Features in v3.0.0 - Live View & Interactive Controls

### Live Device Viewing
- **Real-time Screen Streaming**: View live screens of all connected devices simultaneously
- **Interactive Device Control**: Click directly on device screens to interact with them
- **Maximized View Modal**: Click any device to open a full-screen interactive view
- **Multi-device Monitoring**: Monitor all devices at once with live thumbnail previews

### Interactive Device Controls
- **Touch Interaction**: Tap anywhere on the live screen to interact with the device
- **Hardware Buttons**: Home, Back, Menu, Recent Apps, Power, Volume controls
- **Text Input**: Send text directly to devices through the web interface
- **Screen Recording**: Record device screens with start/stop controls
- **Live Screenshots**: Take screenshots during live viewing sessions

### Advanced Live View Features
- **Server-Sent Events**: Real-time streaming using efficient SSE technology
- **Connection Status**: Visual indicators showing stream connection status
- **Tap Effects**: Visual feedback showing where you tapped on the screen
- **Recording Indicators**: Clear visual indicators when recording is active
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices

## 🎯 Previous Features (v2.0.0)

### Advanced Proxy Management
- **Bulk Proxy Operations**: Clear proxies from all or selected devices at once
- **Real-time Proxy Status**: View current proxy settings and original IP addresses
- **Proxy Status Dashboard**: Comprehensive overview of all device proxy configurations
- **Enhanced Proxy Display**: Visual indicators showing proxy status in device lists

### Enhanced Device Management
- **Custom Device Naming**: Assign meaningful names to devices (defaults to Device 1, Device 2, etc.)
- **Editable Device Names**: Click-to-edit functionality for quick device renaming
- **Device Name Integration**: Use custom names throughout the application and in scripts
- **Persistent Device Names**: Names are remembered across sessions

### Script Management System
- **Import/Export Scripts**: Save and share script configurations as JSON files
- **Local Storage Integration**: Auto-save script data to prevent loss on page refresh
- **Script Library**: Manage multiple saved script configurations
- **Cross-Session Persistence**: Scripts remain available after browser restart

### Improved User Interface
- **Enhanced YouTube Options**: Better visibility and styling for automation checkboxes
- **Modern Device Cards**: Improved layout showing device names, proxy status, and IP information
- **Responsive Design**: Better mobile and tablet support
- **Visual Status Indicators**: Clear proxy status and device information display

## 🎯 Core Features

### Live Device Viewing & Control
- **Real-time Screen Streaming**: Live view of all connected devices with 1-second refresh rate
- **Interactive Touch Control**: Click directly on live screens to interact with devices
- **Hardware Button Controls**: Home, Back, Menu, Recent Apps, Power, Volume Up/Down
- **Text Input**: Send text directly to devices through web interface
- **Screen Recording**: Record device screens with visual recording indicators
- **Multi-device Monitoring**: View all devices simultaneously in grid layout
- **Maximized View**: Full-screen interactive view with comprehensive controls

### Device Management
- **Real-time Device Detection**: Automatic discovery of connected ADB devices
- **Device Information Display**: Brand, model, Android version, and custom names
- **Screenshot Capture**: Take and view device screenshots
- **Proxy Management**: Set, clear, and monitor HTTP proxies on devices
- **Device Naming**: Assign and edit custom device names
- **Bulk Operations**: Perform actions on multiple devices simultaneously

### Script Automation System
- **Proxy Setup**: Upload proxy files and assign to devices sequentially
- **YouTube Automation**: Advanced YouTube automation with multiple options:
  - Sequential playback (play videos one by one with proper completion detection)
  - Shuffle videos (random order playback)
  - Like videos at random times
  - Comment on videos with random comments from uploaded file
  - **NEW**: Intelligent video completion detection using UI automation
  - **NEW**: Maximum wait time per video (10 minutes) to prevent hanging
  - **NEW**: Detailed progress tracking showing current video status
- **Firefox URL Opener**: Open different URLs on each device using Firefox
- **URL Opener**: Open any URL in default browser
- **Google Sign-in**: Automated login through YouTube with combolist support
- **App Launcher**: Launch any app using package names
- **Device Info Collector**: Gather comprehensive device information
- **WiFi Manager**: Enable/disable WiFi and check connection status
- **Custom Scripts**: Execute any ADB commands with custom parameters

### User Interface Features
- **Modern Responsive Design**: Gradient background and mobile-friendly layout
- **Intuitive Sidebar Navigation**: Easy access to all features
- **Drag-and-Drop File Upload**: Upload files with visual feedback and preview
- **Real-time Status Monitoring**: Progress tracking with modal dialogs and filters
- **Toast Notifications**: Non-intrusive status messages
- **Select/Deselect All**: Bulk device selection for all script sections
- **Script Management Modal**: Comprehensive script import/export interface

## Requirements

### System Requirements
- Windows 10/11, macOS, or Linux
- Python 3.8 or higher
- ADB (Android Debug Bridge) installed and in PATH
- USB debugging enabled on Android devices

### Python Dependencies
- Flask 3.1.1
- Flask-CORS 6.0.0
- Flask-SQLAlchemy 3.1.1
- requests 2.31.0
- python-dotenv 1.0.0

## Installation

### 1. Download and Extract
Download the ADB Device Manager package and extract it to your desired location.

### 2. Install ADB
**Windows:**
1. Download Android SDK Platform Tools from Google
2. Extract to a folder (e.g., `C:\adb`)
3. Add the folder to your system PATH

**macOS:**
```bash
brew install android-platform-tools
```

**Linux:**
```bash
sudo apt-get install android-tools-adb
```

### 3. Enable USB Debugging
On your Android devices:
1. Go to Settings > About Phone
2. Tap "Build Number" 7 times to enable Developer Options
3. Go to Settings > Developer Options
4. Enable "USB Debugging"
5. Connect device via USB and authorize the computer

### 4. Install Python Dependencies
**Windows:**
Run `start.bat` (this will automatically install dependencies and start the application)

**macOS/Linux:**
```bash
cd adb-device-manager
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Usage

### Starting the Application

**Windows:**
Double-click `start.bat`

**macOS/Linux:**
```bash
cd adb-device-manager
source venv/bin/activate
python src/main.py
```

The application will start on `http://localhost:5000`

### Web Interface

#### Dashboard
- View connected device count
- Monitor running scripts
- Track completed and failed tasks
- View recent activity

#### Device Management
- View all connected devices with detailed information including custom names
- **Device Naming**: Click the edit button next to any device name to rename it
- Take screenshots of device screens
- Set or clear HTTP proxies (individual or bulk operations)
- **Proxy Status**: View real-time proxy status and original IP addresses
- Get comprehensive device information

#### Script Management (NEW in v2.0.0)
- **Save Scripts**: Save current script configurations with custom names
- **Import/Export**: Share script configurations as JSON files
- **Auto-Save**: Scripts are automatically saved to prevent data loss
- **Script Library**: Manage multiple saved script configurations
- Access script management via the "Manage Scripts" button in each section

#### Advanced Proxy Management (NEW in v2.0.0)
- **Bulk Clear**: Clear proxies from all or selected devices at once
- **Status Dashboard**: View proxy status for all devices simultaneously
- **Real-time Monitoring**: See current proxy settings and original IP addresses
- **Visual Indicators**: Proxy status is displayed throughout the interface

#### Live Device View (NEW in v3.0.0)
- **Grid View**: View live screens of all connected devices in a responsive grid layout
- **Start/Stop Streams**: Control live streaming for individual devices or all devices at once
- **Interactive Thumbnails**: Click on any device thumbnail to open the maximized view
- **Real-time Updates**: Live screens update every second showing current device state

**Using Live View:**
1. Navigate to the "Live View" section
2. Click "Start All Live Streams" to begin streaming all devices
3. Click on any device thumbnail to open the interactive modal
4. In the modal, you can:
   - **Tap the screen**: Click anywhere on the live screen to interact with the device
   - **Use hardware buttons**: Home, Back, Menu, Recent Apps, Power, Volume controls
   - **Send text**: Type text and send it directly to the device
   - **Take screenshots**: Capture the current screen state
   - **Record screen**: Start/stop screen recording with visual indicators
   - **Monitor connection**: View real-time connection status

**Interactive Controls:**
- **Navigation**: Home, Back, Menu, Recent Apps buttons
- **System**: Power, Volume Up, Volume Down buttons
- **Text Input**: Send text directly to the active input field on the device
- **Touch Interaction**: Click anywhere on the live screen to simulate touch input
- **Recording**: Start/stop screen recording with duration tracking

#### Script Automation

**Proxy Setup:**
1. Upload a proxy file (format: `host:port` per line)
2. Select target devices
3. Click "Start Proxy Setup" to assign proxies sequentially

**YouTube Automation:**
1. Enter YouTube video URLs (one per line)
2. Configure options:
   - Sequential Playback: Play videos one after another (with intelligent completion detection)
   - Shuffle Videos: Play in random order
   - Like Videos Randomly: Automatically like videos
   - Add Random Comments: Comment using uploaded comment file
3. Upload comments file if commenting is enabled
4. Select target devices
5. Click "Start YouTube Automation"

**Note**: Sequential playback now includes intelligent video completion detection that:
- Waits for each video to complete before playing the next
- Checks for video end indicators (replay button, "Up next" section)
- Has a maximum wait time of 10 minutes per video to prevent hanging
- Provides detailed progress updates showing current video status

**Firefox URL Opener:**
1. Enter URLs (one per line)
2. Select target devices
3. Click "Open URLs in Firefox"

**URL Opener:**
1. Enter a single URL
2. Select target devices
3. Click "Open URL" to open in default browser

**Google Sign-in:**
1. Upload accounts file (format: `email:password` per line)
2. Select target devices
3. Click "Start Google Sign-in"

**App Launcher:**
1. Enter package name (e.g., `com.android.chrome`)
2. Select target devices
3. Click "Launch App"

**Device Info Collector:**
1. Select target devices
2. Click "Collect Device Info"
3. View comprehensive information for each device

**WiFi Manager:**
1. Select target devices
2. Use "Enable WiFi", "Disable WiFi", or "Check Status" buttons

**Custom Scripts:**
1. Enter ADB command (without `adb -s device_id` prefix)
2. Select target devices
3. Click "Execute Command"
4. View results for each device

### File Formats

**Proxy File (proxies.txt):**
```
192.168.1.100:8080
10.0.0.1:3128
proxy.example.com:8888
```

**Comments File (comments.txt):**
```
Great video!
Thanks for sharing
Love this content
Amazing work
```

**Accounts File (accounts.txt):**
```
user1@gmail.com:password123
user2@gmail.com:mypassword
test@example.com:testpass
```

## API Endpoints

### Device Management
- `GET /api/devices` - List all connected devices
- `GET /api/devices/{device_id}/screenshot` - Take device screenshot
- `GET /api/devices/{device_id}/info` - Get device information
- `POST /api/devices/{device_id}/proxy` - Set device proxy
- `DELETE /api/devices/{device_id}/proxy` - Clear device proxy
- `POST /api/devices/{device_id}/wifi` - Manage WiFi (enable/disable)
- `POST /api/devices/{device_id}/app` - Launch app
- `POST /api/devices/{device_id}/url` - Open URL
- `POST /api/devices/{device_id}/command` - Execute custom command

### Script Automation
- `POST /api/scripts/upload` - Upload files
- `POST /api/scripts/youtube` - Start YouTube automation
- `POST /api/scripts/proxy-setup` - Start proxy setup
- `POST /api/scripts/firefox-urls` - Start Firefox URL opener
- `POST /api/scripts/google-signin` - Start Google Sign-in
- `POST /api/scripts/custom-command` - Execute custom commands
- `GET /api/scripts/status/{script_id}` - Get script status
- `POST /api/scripts/stop/{script_id}` - Stop script execution

## Troubleshooting

### Common Issues

**"adb: not found" Error:**
- Ensure ADB is installed and added to system PATH
- Restart the application after installing ADB

**No Devices Detected:**
- Check USB connections
- Ensure USB debugging is enabled on devices
- Run `adb devices` in terminal to verify ADB can see devices
- Try different USB cables or ports

**Permission Denied:**
- Authorize the computer on Android device when prompted
- Check that developer options are enabled

**Script Execution Fails:**
- Ensure target apps are installed on devices
- Check device screen is unlocked
- Verify network connectivity for web-based scripts

**File Upload Issues:**
- Check file format matches requirements
- Ensure file size is under 16MB
- Use supported file types (.txt, .csv, .json)

### Performance Tips

**For Multiple Devices:**
- Use USB hubs with individual power switches
- Ensure adequate power supply for all devices
- Consider device processing capabilities for complex scripts

**For YouTube Automation:**
- Use shorter video lists for faster execution
- Enable shuffle for varied content consumption
- Monitor device battery levels during long sessions

**For Proxy Setup:**
- Verify proxy servers are accessible
- Test proxy functionality before bulk assignment
- Keep proxy lists updated and valid

## Security Considerations

- Keep device unlock patterns/passwords secure
- Use trusted proxy servers only
- Regularly update ADB and device software
- Monitor script execution for unexpected behavior
- Secure uploaded files containing sensitive information

## Support

For issues, feature requests, or questions:
1. Check the troubleshooting section above
2. Verify all requirements are met
3. Test with a single device first
4. Check browser console for JavaScript errors
5. Review Flask application logs for backend errors

## License

This project is provided as-is for educational and testing purposes. Use responsibly and in accordance with applicable laws and terms of service.

