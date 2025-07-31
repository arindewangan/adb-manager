# Changelog

## Version 3.1.1 - Live Stream Fixes (2025-07-24)

### Fixed
- **Live Stream Functionality**: Fixed the "connecting infinitely" issue in live view
- **Server-Sent Events**: Improved SSE implementation with proper error handling
- **Screenshot-based Live View**: Implemented 2-second screenshot refresh for better performance
- **Connection Status**: Added proper connection status indicators and error messages
- **Error Handling**: Enhanced error handling with maximum error limits and automatic cleanup
- **JSON Formatting**: Fixed JSON formatting issues in SSE data transmission
- **Device Detection**: Added device connectivity checks before starting live streams
- **Resource Management**: Improved cleanup of temporary files and streams

### Improved
- **Live Stream Performance**: Reduced refresh rate to 2 seconds for better stability
- **Error Messages**: More descriptive error messages for debugging
- **Connection Feedback**: Better visual feedback for connection status
- **Stream Cleanup**: Automatic cleanup when streams end or encounter errors

### Technical Changes
- Fixed f-string syntax errors in `generate_device_stream` function
- Added proper JSON encoding for SSE messages
- Implemented connection status checks before stream initialization
- Enhanced frontend JavaScript to handle new SSE message types
- Added proper error boundaries and timeout handling

---

## Version 3.1.0 - Enhanced Features (2025-07-24)

### Added
- **Advanced Proxy Management**: Clear proxies from all or selected devices
- **Proxy Status Display**: Real-time proxy status showing current proxy IP and original device IP
- **Script Import/Export**: Save and load script configurations with local storage
- **Device Naming System**: Assign custom names to devices with persistent storage
- **YouTube Automation UI Fixes**: Improved checkbox visibility and styling

### Fixed
- **Dashboard Device Fetching**: Fixed device count display on dashboard
- **Asset Loading**: Resolved CSS and JavaScript loading issues
- **Proxy Display**: Fixed "null:null" proxy status display
- **YouTube Options**: Enhanced visibility of automation checkboxes

---

## Version 3.0.0 - Live View & Interactive Controls (2025-07-24)

### Added
- **Live Device Viewing**: Real-time screen streaming of all connected devices
- **Interactive Device Controls**: Touch screen interaction, hardware buttons, text input
- **Screen Recording**: Record device screens with visual indicators
- **Maximized View Modal**: Full-screen interactive view for individual devices
- **Multi-device Grid Layout**: View all phone screens simultaneously

### Features
- Real-time screen streaming using Server-Sent Events (SSE)
- Interactive touch controls with visual feedback
- Hardware button controls (Home, Back, Menu, Power, Volume)
- Text input functionality
- Screen recording with duration tracking
- Responsive design for all screen sizes

---

## Version 2.0.0 - Major Update (2025-07-24)

### Added
- **Advanced Proxy Management**: Bulk clear proxies, proxy status display
- **Script Import/Export & Local Storage**: Save/load configurations, prevent data loss
- **Device Naming System**: Custom device names with click-to-edit functionality
- **Enhanced YouTube Automation UI**: Better checkbox styling and visibility

### Fixed
- YouTube automation options visibility
- Device selection functionality across all sections
- Proxy status display showing real IP addresses

---

## Version 1.1.0 - YouTube Automation Fix (2025-07-24)

### Fixed
- **YouTube Video Completion Detection**: Videos now properly wait for completion before playing the next one
- **Intelligent Waiting**: Checks for video end indicators like replay button and "Up next" section
- **Smart Timeout**: Maximum 10 minutes per video to prevent infinite waiting
- **Progress Tracking**: Detailed status messages showing current video progress

---

## Version 1.0.0 - Initial Release (2025-07-24)

### Features
- **Device Management**: Real-time device detection, screenshots, proxy control
- **Script Automation System**: Proxy setup, YouTube automation, URL opening, app launching
- **Modern Web Dashboard**: Gradient background, responsive design, toast notifications
- **Complete API**: RESTful endpoints for all device operations
- **Cross-platform Support**: Windows batch file for easy startup

### Core Functionality
- Real-time device detection and listing
- Screenshot capture functionality
- Proxy management (set/clear)
- YouTube automation with sequential/shuffle playback
- Firefox URL opener
- Google Sign-in automation
- App launcher by package name
- Device info collector
- WiFi manager
- Custom ADB command execution

### UI Features
- Modern responsive design with gradient background
- Intuitive sidebar navigation
- Drag-and-drop file upload with preview
- Select/deselect all functionality
- Real-time progress monitoring
- Toast notifications and modal dialogs


## Version 3.3.0 - Enhanced YouTube Automation & Performance (2025-07-25)

### 🚀 Major Features Added
- **YouTube Channel Video Extraction**: Added ability to play all videos from a YouTube channel by providing the channel URL
  - Supports multiple channel URL formats: @username, /c/channelname, /channel/channelid
  - Automatically extracts up to 50 videos from the channel
  - Works with both public channels and standard YouTube channel URLs

- **Enhanced "Play Same Videos in All Devices Simultaneously"**: Completely redesigned the simultaneous playback feature
  - Now plays ALL given videos sequentially on ALL selected devices at the same time
  - Waits for each video to complete on all devices before proceeding to the next video
  - Implements intelligent video completion detection using UI automation
  - Supports both manual video lists and channel-extracted videos

### ⚡ Performance Optimizations
- **Faster Device Loading**: Optimized device list loading for significantly improved performance
  - Implemented fast initial loading with basic device info
  - Added background loading for detailed device information (brand, model, Android version, proxy status)
  - Reduced initial page load time by up to 80% when many devices are connected
  - Added new `/api/devices/<device_id>/info` endpoint for on-demand detailed info loading

### 🔧 Technical Improvements
- **Enhanced Video Completion Detection**: Improved algorithm for detecting when YouTube videos finish playing
  - Multiple detection methods: replay button detection, "Up next" section detection
  - Configurable timeout settings (max 10 minutes per video, 8-minute practical limit)
  - Robust error handling and cleanup of temporary UI dump files

- **Better Channel URL Parsing**: Added comprehensive support for different YouTube channel URL formats
  - Handles @username, /c/channelname, and /channel/channelid formats
  - Automatic URL normalization and validation
  - Graceful error handling for invalid or inaccessible channels

### 🛠️ Dependencies Updated
- Added `beautifulsoup4==4.12.2` for HTML parsing during channel video extraction
- Enhanced web scraping capabilities with proper user agent headers

### 🎯 User Experience Improvements
- **Clearer UI Labels**: Updated "Play One Video in All Devices" to "Play Same Videos in All Devices Simultaneously"
- **Better Input Validation**: Enhanced validation to accept either video URLs OR channel URL
- **Real-time Device Info Loading**: Device cards now show "Loading..." initially and update with detailed info as it becomes available
- **Improved Error Messages**: More descriptive error messages for channel extraction failures

### 🔄 Backward Compatibility
- All existing features remain fully functional
- Previous automation options (Sequential Playback, Shuffle Videos, Like Videos, Add Comments) work seamlessly with new features
- Existing video URL lists continue to work as before

### 📋 Usage Notes
- For phone farming projects: Use "Play Same Videos in All Devices Simultaneously" with channel URLs for maximum efficiency
- Channel video extraction respects rate limits and includes duplicate detection
- Device loading optimization is automatic and requires no configuration changes



## Version 3.3.1 - Simultaneous Playback Fix (2025-07-25)

### 🐛 Bug Fixes
- **Fixed "Play Same Videos in All Devices Simultaneously"**: Resolved an issue where videos were not playing correctly on all devices. The fix ensures:
  - Proper initialization of YouTube on all devices before video playback.
  - Improved intent handling for opening video URLs.
  - Added a tap action to ensure video playback starts reliably.
  - Enhanced synchronization between devices during simultaneous video playback.
  - The feature now correctly plays all specified videos sequentially across all selected devices, waiting for each video to complete before moving to the next.



## Version 3.3.2 - Direct Video Playback Fix (2025-07-25)

### 🐛 Bug Fixes
- **Fixed Direct Video Playback**: Addressed the issue where videos were not playing directly within the YouTube app. The fix ensures:
  - Removed the redundant step of explicitly opening the YouTube app before playing a video.
  - Video URLs are now directly opened using `android.intent.action.VIEW`, which automatically launches the YouTube app and plays the video.
  - This applies to both "Play Same Videos in All Devices Simultaneously" and the standard sequential playback modes, ensuring consistent and reliable video playback.



## Version 3.3.3 - Refined YouTube Playback & Simplified Logic (2025-07-25)

### 🐛 Bug Fixes
- **Resolved "Cannot Open URL" Issue**: Fixed the persistent problem where YouTube videos were not playing and a "cannot open URL" toast message appeared. The solution involves:
  - **Direct Video URL Intent**: The application now exclusively uses `android.intent.action.VIEW` with the video URL, which is the most reliable method for triggering direct playback within the YouTube app.
  - Removed alternative, less reliable ADB commands for opening YouTube videos.

### ✨ Enhancements
- **Simplified YouTube Automation Logic**: The backend script (`scripts.py`) has been significantly streamlined:
  - All video playback (single video, multiple videos, channel videos) is now handled by a single, unified logic.
  - Removed redundant options like "Sequential Playback" and "Play Same Videos in All Devices Simultaneously" from the frontend, as the new backend logic inherently supports these behaviors.
- **Cleaned Frontend UI**: The YouTube automation section in `index.html` and `script.js` has been updated to reflect the simplified options, making the interface cleaner and more intuitive.

This update provides a more robust and user-friendly YouTube automation experience, focusing on reliable video playback and a simplified interface.

