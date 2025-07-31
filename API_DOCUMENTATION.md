# ADB Device Manager API Documentation

This document provides detailed information about the REST API endpoints available in the ADB Device Manager application.

## Base URL
```
http://localhost:5000
```

## Authentication
No authentication is required for local usage.

## Response Format
All API responses are in JSON format with the following structure:

**Success Response:**
```json
{
  "data": {...},
  "message": "Success message"
}
```

**Error Response:**
```json
{
  "error": "Error message"
}
```

## Device Management Endpoints

### List All Devices
**GET** `/api/devices`

Returns a list of all connected Android devices.

**Response:**
```json
{
  "devices": [
    {
      "id": "device_serial_number",
      "brand": "Samsung",
      "model": "Galaxy S21",
      "android_version": "11",
      "status": "device"
    }
  ]
}
```

### Take Device Screenshot
**GET** `/api/devices/{device_id}/screenshot`

Captures a screenshot from the specified device.

**Parameters:**
- `device_id` (path): Device serial number

**Response:**
```json
{
  "screenshot": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### Get Device Information
**GET** `/api/devices/{device_id}/info`

Retrieves comprehensive information about the specified device.

**Parameters:**
- `device_id` (path): Device serial number

**Response:**
```json
{
  "id": "device_serial_number",
  "brand": "Samsung",
  "model": "Galaxy S21",
  "android_version": "11",
  "battery": "85",
  "wifi_status": "enabled",
  "screen_status": "on"
}
```

### Set Device Proxy
**POST** `/api/devices/{device_id}/proxy`

Sets HTTP proxy for the specified device.

**Parameters:**
- `device_id` (path): Device serial number

**Request Body:**
```json
{
  "host": "192.168.1.100",
  "port": "8080"
}
```

**Response:**
```json
{
  "message": "Proxy set successfully"
}
```

### Clear Device Proxy
**DELETE** `/api/devices/{device_id}/proxy`

Clears HTTP proxy for the specified device.

**Parameters:**
- `device_id` (path): Device serial number

**Response:**
```json
{
  "message": "Proxy cleared successfully"
}
```

### Manage WiFi
**POST** `/api/devices/{device_id}/wifi`

Enables or disables WiFi on the specified device.

**Parameters:**
- `device_id` (path): Device serial number

**Request Body:**
```json
{
  "action": "enable"  // or "disable"
}
```

**Response:**
```json
{
  "message": "WiFi enabled successfully"
}
```

### Launch App
**POST** `/api/devices/{device_id}/app`

Launches an application on the specified device.

**Parameters:**
- `device_id` (path): Device serial number

**Request Body:**
```json
{
  "package_name": "com.android.chrome"
}
```

**Response:**
```json
{
  "message": "App com.android.chrome launched successfully"
}
```

### Open URL
**POST** `/api/devices/{device_id}/url`

Opens a URL in the default browser on the specified device.

**Parameters:**
- `device_id` (path): Device serial number

**Request Body:**
```json
{
  "url": "https://www.example.com"
}
```

**Response:**
```json
{
  "message": "URL opened successfully"
}
```

### Execute Custom Command
**POST** `/api/devices/{device_id}/command`

Executes a custom ADB command on the specified device.

**Parameters:**
- `device_id` (path): Device serial number

**Request Body:**
```json
{
  "command": "shell input tap 500 500"
}
```

**Response:**
```json
{
  "success": true,
  "output": "Command output",
  "error": ""
}
```

## Script Automation Endpoints

### Upload File
**POST** `/api/scripts/upload`

Uploads a file for use in script automation.

**Request:**
- Content-Type: `multipart/form-data`
- Form fields:
  - `file`: File to upload
  - `type`: File type (proxies, comments, accounts)

**Response:**
```json
{
  "message": "File uploaded successfully",
  "filename": "proxies.txt",
  "type": "proxies"
}
```

### YouTube Automation
**POST** `/api/scripts/youtube`

Starts YouTube automation script.

**Request Body:**
```json
{
  "devices": ["device1", "device2"],
  "videos": [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=9bZkp7q19f0"
  ],
  "options": {
    "sequential": true,
    "shuffle": false,
    "like_videos": true,
    "add_comments": false
  }
}
```

**Response:**
```json
{
  "message": "YouTube automation started",
  "script_id": "uuid-string"
}
```

### Proxy Setup
**POST** `/api/scripts/proxy-setup`

Starts proxy setup script.

**Request Body:**
```json
{
  "devices": ["device1", "device2"]
}
```

**Response:**
```json
{
  "message": "Proxy setup started",
  "script_id": "uuid-string"
}
```

### Firefox URL Opener
**POST** `/api/scripts/firefox-urls`

Opens URLs in Firefox on selected devices.

**Request Body:**
```json
{
  "devices": ["device1", "device2"],
  "urls": [
    "https://www.google.com",
    "https://www.github.com"
  ]
}
```

**Response:**
```json
{
  "message": "Firefox URL opener started",
  "script_id": "uuid-string"
}
```

### Google Sign-in
**POST** `/api/scripts/google-signin`

Starts Google Sign-in automation.

**Request Body:**
```json
{
  "devices": ["device1", "device2"]
}
```

**Response:**
```json
{
  "message": "Google Sign-in started",
  "script_id": "uuid-string"
}
```

### Custom Command Execution
**POST** `/api/scripts/custom-command`

Executes custom ADB commands on multiple devices.

**Request Body:**
```json
{
  "devices": ["device1", "device2"],
  "command": "shell input tap 500 500"
}
```

**Response:**
```json
{
  "results": {
    "device1": {
      "success": true,
      "output": "Command output",
      "error": ""
    },
    "device2": {
      "success": false,
      "output": "",
      "error": "Command failed"
    }
  }
}
```

### Get Script Status
**GET** `/api/scripts/status/{script_id}`

Retrieves the current status of a running script.

**Parameters:**
- `script_id` (path): Script UUID

**Response:**
```json
{
  "status": "running",  // running, completed, error, stopped
  "progress": 50,       // 0-100
  "message": "Processing device 2 of 4"
}
```

### Stop Script
**POST** `/api/scripts/stop/{script_id}`

Stops a running script.

**Parameters:**
- `script_id` (path): Script UUID

**Response:**
```json
{
  "message": "Script stopped"
}
```

## Error Codes

| HTTP Status | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Device or script not found |
| 500 | Internal Server Error - ADB command failed or server error |

## Common Error Messages

- `"adb: not found"` - ADB is not installed or not in PATH
- `"No devices selected"` - No devices provided in request
- `"Device not found"` - Specified device is not connected
- `"Command timed out"` - ADB command took too long to execute
- `"No file provided"` - File upload request without file
- `"Invalid file type"` - Uploaded file type not supported

## Rate Limiting

No rate limiting is currently implemented for local usage.

## WebSocket Support

The application does not currently support WebSocket connections. Use polling with the status endpoint for real-time updates.

## Examples

### Python Example
```python
import requests

# List devices
response = requests.get('http://localhost:5000/api/devices')
devices = response.json()['devices']

# Take screenshot
device_id = devices[0]['id']
response = requests.get(f'http://localhost:5000/api/devices/{device_id}/screenshot')
screenshot_data = response.json()['screenshot']

# Execute custom command
command_data = {'command': 'shell input tap 500 500'}
response = requests.post(f'http://localhost:5000/api/devices/{device_id}/command', 
                        json=command_data)
result = response.json()
```

### JavaScript Example
```javascript
// List devices
fetch('/api/devices')
  .then(response => response.json())
  .then(data => {
    console.log('Devices:', data.devices);
  });

// Start YouTube automation
const automationData = {
  devices: ['device1'],
  videos: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
  options: {
    sequential: true,
    like_videos: true
  }
};

fetch('/api/scripts/youtube', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(automationData)
})
.then(response => response.json())
.then(data => {
  console.log('Script started:', data.script_id);
});
```

