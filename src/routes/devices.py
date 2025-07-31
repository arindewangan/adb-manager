import os
import subprocess
import json
import time
import random
import threading
import os
import requests
from flask import Blueprint, request, jsonify, current_app, Response
from werkzeug.utils import secure_filename
import base64

devices_bp = Blueprint('devices', __name__)

# Global variables for script execution
script_threads = {}
script_status = {}
device_names = {}  # Store custom device names

def run_adb_command(command, device_id=None):
    """Execute ADB command and return result with enhanced error handling"""
    try:
        if device_id:
            cmd = f"adb -s {device_id} {command}"
        else:
            cmd = f"adb {command}"
        
        print(f"[DEBUG] Executing ADB command: {cmd}")
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        
        success = result.returncode == 0
        output = result.stdout.strip() if result.stdout else ''
        error = result.stderr.strip() if result.stderr else ''
        
        if not success:
            print(f"[DEBUG] ADB command failed: {cmd}")
            print(f"[DEBUG] Error output: {error}")
        
        return {
            'success': success,
            'output': output,
            'error': error,
            'returncode': result.returncode
        }
    except subprocess.TimeoutExpired:
        print(f"[DEBUG] ADB command timed out: {cmd}")
        return {
            'success': False,
            'output': '',
            'error': 'Command timed out after 30 seconds',
            'returncode': -1
        }
    except FileNotFoundError:
        print(f"[DEBUG] ADB not found in PATH")
        return {
            'success': False,
            'output': '',
            'error': 'ADB not found. Please ensure Android SDK is installed and ADB is in PATH.',
            'returncode': -1
        }
    except Exception as e:
        print(f"[DEBUG] Unexpected error running ADB command: {e}")
        return {
            'success': False,
            'output': '',
            'error': f'Unexpected error: {str(e)}',
            'returncode': -1
        }



def get_device_info_fast(device_id):
    """Get basic device information quickly"""
    info = {'id': device_id}
    
    # Get device name
    name = device_names.get(device_id)
    if not name:
        # Generate default name based on device index
        result = run_adb_command("devices")
        if result['success']:
            lines = result['output'].split('\n')[1:]  # Skip header
            device_ids = []
            for line in lines:
                if line.strip() and '\t' in line:
                    device_ids.append(line.split('\t')[0])
            
            if device_id in device_ids:
                index = device_ids.index(device_id) + 1
                name = f"Device {index}"
                device_names[device_id] = name
            else:
                name = "Unknown Device"
    
    info['name'] = name
    
    # Get device status (this is fast)
    status_result = run_adb_command("get-state", device_id)
    info['status'] = status_result['output'] if status_result['success'] else 'Unknown'
    
    # Set default values for detailed info (will be loaded on demand)
    info['brand'] = 'Loading...'
    info['model'] = 'Loading...'
    info['android_version'] = 'Loading...'
    
    return info

def get_device_info(device_id):
    """Get detailed device information with enhanced error handling"""
    info = {
        'id': device_id,
        'brand': 'Unknown',
        'model': 'Unknown',
        'android_version': 'Unknown',
        'api_level': 'Unknown',
        'status': 'Unknown',
        'battery_level': 'Unknown',
        'battery_status': 'Unknown',
        'wifi_status': 'Unknown',
        'screen_status': 'Unknown',
        'resolution': 'Unknown',
        'density': 'Unknown',
        'last_updated': time.time()
    }
    
    try:
        print(f"[DEBUG] Getting detailed info for device {device_id}")
        
        # Check if device is connected first
        status_result = run_adb_command('get-state', device_id)
        if not status_result['success']:
            info['status'] = 'disconnected'
            info['error'] = status_result['error']
            return info
        
        info['status'] = status_result['output']
        
        # Only proceed if device is in 'device' state
        if info['status'] != 'device':
            print(f"[DEBUG] Device {device_id} is not ready (status: {info['status']})")
            return info
        
        # Get basic device properties
        properties = {
            'brand': 'ro.product.brand',
            'model': 'ro.product.model',
            'android_version': 'ro.build.version.release',
            'api_level': 'ro.build.version.sdk',
            'density': 'ro.sf.lcd_density'
        }
        
        for key, prop in properties.items():
            try:
                result = run_adb_command(f'shell getprop {prop}', device_id)
                if result['success'] and result['output']:
                    info[key] = result['output']
                else:
                    print(f"[DEBUG] Failed to get {prop} for device {device_id}")
            except Exception as e:
                print(f"[DEBUG] Error getting {prop}: {e}")
        
        # Get screen resolution
        try:
            resolution_result = run_adb_command('shell wm size', device_id)
            if resolution_result['success'] and 'Physical size:' in resolution_result['output']:
                info['resolution'] = resolution_result['output'].split('Physical size: ')[1].strip()
        except Exception as e:
            print(f"[DEBUG] Error getting screen resolution: {e}")
        
        # Get battery information
        try:
            battery_result = run_adb_command('shell dumpsys battery', device_id)
            if battery_result['success']:
                battery_output = battery_result['output']
                
                # Extract battery level
                for line in battery_output.split('\n'):
                    if 'level:' in line:
                        info['battery_level'] = line.split(':')[1].strip() + '%'
                    elif 'status:' in line:
                        status_code = line.split(':')[1].strip()
                        status_map = {
                            '1': 'Unknown',
                            '2': 'Charging',
                            '3': 'Discharging',
                            '4': 'Not charging',
                            '5': 'Full'
                        }
                        info['battery_status'] = status_map.get(status_code, f'Code {status_code}')
        except Exception as e:
            print(f"[DEBUG] Error getting battery info: {e}")
        
        # Get WiFi status
        try:
            wifi_result = run_adb_command('shell dumpsys wifi', device_id)
            if wifi_result['success'] and 'Wi-Fi is' in wifi_result['output']:
                if 'enabled' in wifi_result['output'].lower():
                    info['wifi_status'] = 'enabled'
                elif 'disabled' in wifi_result['output'].lower():
                    info['wifi_status'] = 'disabled'
                else:
                    info['wifi_status'] = 'unknown'
            else:
                # Alternative method
                wifi_alt = run_adb_command('shell settings get global wifi_on', device_id)
                if wifi_alt['success']:
                    info['wifi_status'] = 'enabled' if wifi_alt['output'] == '1' else 'disabled'
        except Exception as e:
            print(f"[DEBUG] Error getting WiFi status: {e}")
        
        # Get screen status
        try:
            screen_result = run_adb_command('shell dumpsys power', device_id)
            if screen_result['success'] and 'Display Power' in screen_result['output']:
                info['screen_status'] = 'on' if 'ON' in screen_result['output'] else 'off'
            else:
                # Alternative method
                screen_alt = run_adb_command('shell dumpsys display', device_id)
                if screen_alt['success'] and 'mScreenState' in screen_alt['output']:
                    info['screen_status'] = 'on' if 'ON' in screen_alt['output'] else 'off'
        except Exception as e:
            print(f"[DEBUG] Error getting screen status: {e}")
    
    except Exception as e:
        print(f"[DEBUG] Error getting device info for {device_id}: {e}")
        info['error'] = str(e)
    
    # Get device name
    name = device_names.get(device_id)
    if not name:
        # Generate default name based on device index
        result = run_adb_command("devices")
        if result['success']:
            lines = result['output'].split('\n')[1:]  # Skip header
            device_ids = []
            for line in lines:
                if line.strip() and '\t' in line:
                    device_ids.append(line.split('\t')[0])
            
            if device_id in device_ids:
                index = device_ids.index(device_id) + 1
                name = f"Device {index}"
                device_names[device_id] = name
            else:
                name = "Unknown Device"
    
    info['name'] = name
    
    return info

@devices_bp.route('/devices', methods=['GET'])
def list_devices():
    """List all connected devices with basic info for fast loading"""
    try:
        result = run_adb_command("devices")
        if not result['success']:
            return jsonify({'error': result['error']}), 500
        
        devices = []
        lines = result['output'].split('\n')[1:]  # Skip header
        
        for line in lines:
            if line.strip() and '\t' in line:
                device_id = line.split('\t')[0]
                device_info = get_device_info_fast(device_id)
                devices.append(device_info)
        
        return jsonify({'devices': devices})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/vpn-status', methods=['GET'])
def get_device_vpn_status(device_id):
    """Get device VPN status and current IP"""
    try:
        # Get current IP address
        ip_result = run_adb_command('shell curl -s ifconfig.me', device_id)
        current_ip = ip_result['output'].strip() if ip_result['success'] else 'Unknown'
        
        # Check VPN connection status by looking for VPN interfaces
        vpn_result = run_adb_command('shell ip route | grep tun', device_id)
        vpn_connected = vpn_result['success'] and 'tun' in vpn_result['output']
        
        # Alternative check: look for VPN apps running
        if not vpn_connected:
            vpn_apps_result = run_adb_command('shell ps | grep -i vpn', device_id)
            vpn_connected = vpn_apps_result['success'] and vpn_apps_result['output'].strip() != ''
        
        return jsonify({
            'success': True,
            'current_ip': current_ip,
            'vpn_connected': vpn_connected,
            'vpn_status': 'Connected' if vpn_connected else 'Disconnected'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'current_ip': 'Unknown',
            'vpn_connected': False,
            'vpn_status': 'Unknown'
        }), 500

@devices_bp.route('/proxy/check', methods=['POST'])
def check_proxy_status():
    """Check if a proxy is live or dead"""
    try:
        data = request.get_json()
        proxy_string = data.get('proxy_string', '')
        
        if not proxy_string:
            return jsonify({'error': 'Proxy string is required'}), 400
        
        # Parse proxy string (ip:port:user:pass)
        parts = proxy_string.split(':')
        if len(parts) != 4:
            return jsonify({'error': 'Invalid proxy format. Expected ip:port:user:pass'}), 400
        
        ip, port, username, password = parts
        
        # Test proxy connection using requests with timeout
        try:
            proxy_url = f'http://{username}:{password}@{ip}:{port}'
            proxies = {
                'http': proxy_url,
                'https': proxy_url
            }
            
            response = requests.get('http://httpbin.org/ip', proxies=proxies, timeout=15)
            
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    proxy_ip = response_data.get('origin', ip)
                    return jsonify({
                        'status': 'live',
                        'proxy_ip': proxy_ip,
                        'response_time': 'Good'
                    })
                except json.JSONDecodeError:
                    return jsonify({
                        'status': 'live',
                        'proxy_ip': ip,
                        'response_time': 'Good'
                    })
            else:
                return jsonify({
                    'status': 'dead',
                    'error': f'HTTP {response.status_code}'
                })
        except requests.RequestException as e:
            return jsonify({
                'status': 'dead',
                'error': str(e)
            })
            
    except Exception as e:
        return jsonify({
            'status': 'dead',
            'error': str(e)
        }), 500

@devices_bp.route('/proxy/location', methods=['POST'])
def get_proxy_location():
    """Get location information for an IP address"""
    try:
        data = request.get_json()
        ip_address = data.get('ip', '')
        
        if not ip_address:
            return jsonify({'error': 'IP address is required'}), 400
        
        # Use a free IP geolocation service
        try:
            response = requests.get(f'http://ip-api.com/json/{ip_address}', timeout=10)
            
            if response.status_code == 200:
                location_data = response.json()
                if location_data.get('status') == 'success':
                    return jsonify({
                        'success': True,
                        'country': location_data.get('country', 'Unknown'),
                        'city': location_data.get('city', 'Unknown'),
                        'region': location_data.get('regionName', 'Unknown'),
                        'location': f"{location_data.get('city', 'Unknown')}, {location_data.get('country', 'Unknown')}"
                    })
                else:
                    return jsonify({
                        'success': False,
                        'location': 'Unknown',
                        'error': 'Location lookup failed'
                    })
            else:
                return jsonify({
                    'success': False,
                    'location': 'Unknown',
                    'error': 'Location service unavailable'
                })
        except requests.RequestException:
            return jsonify({
                'success': False,
                'location': 'Unknown',
                'error': 'Request failed'
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'location': 'Unknown',
            'error': str(e)
        }), 500

@devices_bp.route('/devices/<device_id>/info', methods=['GET'])
def get_device_detailed_info(device_id):
    """Get detailed information for a specific device"""
    try:
        device_info = get_device_info(device_id)
        return jsonify(device_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/screenshot', methods=['GET'])
def take_screenshot(device_id):
    """Take screenshot of device"""
    try:
        # Take screenshot
        screenshot_result = run_adb_command("shell screencap -p /sdcard/screenshot.png", device_id)
        if not screenshot_result['success']:
            return jsonify({'error': 'Failed to take screenshot'}), 500
        
        # Pull screenshot
        pull_result = run_adb_command(f"pull /sdcard/screenshot.png /tmp/screenshot_{device_id}.png", device_id)
        if not pull_result['success']:
            return jsonify({'error': 'Failed to pull screenshot'}), 500
        
        # Read and encode screenshot
        screenshot_path = f"/tmp/screenshot_{device_id}.png"
        if os.path.exists(screenshot_path):
            with open(screenshot_path, 'rb') as f:
                screenshot_data = base64.b64encode(f.read()).decode('utf-8')
            
            # Clean up
            os.remove(screenshot_path)
            run_adb_command("shell rm /sdcard/screenshot.png", device_id)
            
            return jsonify({'screenshot': f"data:image/png;base64,{screenshot_data}"})
        else:
            return jsonify({'error': 'Screenshot file not found'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500





@devices_bp.route('/devices/<device_id>/wifi', methods=['POST'])
def manage_wifi(device_id):
    """Enable/disable WiFi"""
    try:
        data = request.get_json()
        action = data.get('action')  # 'enable' or 'disable'
        
        if action == 'enable':
            wifi_result = run_adb_command("shell svc wifi enable", device_id)
        elif action == 'disable':
            wifi_result = run_adb_command("shell svc wifi disable", device_id)
        else:
            return jsonify({'error': 'Invalid action. Use enable or disable'}), 400
        
        if wifi_result['success']:
            return jsonify({'message': f'WiFi {action}d successfully'})
        else:
            return jsonify({'error': wifi_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/app', methods=['POST'])
def launch_app(device_id):
    """Launch app by package name"""
    try:
        data = request.get_json()
        package_name = data.get('package_name')
        
        if not package_name:
            return jsonify({'error': 'Package name is required'}), 400
        
        # Launch app
        launch_result = run_adb_command(f"shell monkey -p {package_name} -c android.intent.category.LAUNCHER 1", device_id)
        
        if launch_result['success']:
            return jsonify({'message': f'App {package_name} launched successfully'})
        else:
            return jsonify({'error': launch_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/url', methods=['POST'])
def open_url(device_id):
    """Open URL in default browser"""
    try:
        data = request.get_json()
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        # Open URL
        url_result = run_adb_command(f"shell am start -a android.intent.action.VIEW -d '{url}'", device_id)
        
        if url_result['success']:
            return jsonify({'message': f'URL opened successfully'})
        else:
            return jsonify({'error': url_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/command', methods=['POST'])
def execute_command(device_id):
    """Execute custom ADB command"""
    try:
        data = request.get_json()
        command = data.get('command')
        
        if not command:
            return jsonify({'error': 'Command is required'}), 400
        
        # Execute command
        result = run_adb_command(command, device_id)
        
        return jsonify({
            'success': result['success'],
            'output': result['output'],
            'error': result['error']
        })
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Device naming storage (in production, this should be in a database)
device_names = {}

@devices_bp.route('/devices/<device_id>/name', methods=['GET'])
def get_device_name(device_id):
    """Get custom name for device"""
    try:
        name = device_names.get(device_id)
        if not name:
            # Generate default name based on device index
            result = run_adb_command("devices")
            if result['success']:
                lines = result['output'].split('\n')[1:]  # Skip header
                device_ids = []
                for line in lines:
                    if line.strip() and '\t' in line:
                        device_ids.append(line.split('\t')[0])
                
                if device_id in device_ids:
                    index = device_ids.index(device_id) + 1
                    name = f"Device {index}"
                    device_names[device_id] = name
                else:
                    name = "Unknown Device"
        
        return jsonify({'name': name})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/name', methods=['POST'])
def set_device_name(device_id):
    """Set custom name for device"""
    try:
        data = request.get_json()
        name = data.get('name', '').strip()
        
        if not name:
            return jsonify({'error': 'Name is required'}), 400
        
        if len(name) > 50:
            return jsonify({'error': 'Name must be 50 characters or less'}), 400
        
        device_names[device_id] = name
        return jsonify({'message': 'Device name updated successfully', 'name': name})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/names', methods=['GET'])
def get_all_device_names():
    """Get all device names"""
    try:
        # Get all connected devices and ensure they have names
        result = run_adb_command("devices")
        if not result['success']:
            return jsonify({'error': result['error']}), 500
        
        lines = result['output'].split('\n')[1:]  # Skip header
        device_ids = []
        for line in lines:
            if line.strip() and '\t' in line:
                device_ids.append(line.split('\t')[0])
        
        # Ensure all devices have names
        for i, device_id in enumerate(device_ids):
            if device_id not in device_names:
                device_names[device_id] = f"Device {i + 1}"
        
        # Return only names for connected devices
        connected_names = {device_id: device_names[device_id] for device_id in device_ids if device_id in device_names}
        
        return jsonify({'names': connected_names})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/names', methods=['POST'])
def update_multiple_device_names():
    """Update multiple device names at once"""
    try:
        data = request.get_json()
        names = data.get('names', {})
        
        updated_names = {}
        for device_id, name in names.items():
            name = name.strip()
            if name and len(name) <= 50:
                device_names[device_id] = name
                updated_names[device_id] = name
        
        return jsonify({'message': 'Device names updated successfully', 'names': updated_names})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


import threading
import time
import base64
# Live view streaming
live_streams = {}
stream_threads = {}

def generate_device_stream(device_id):
    """Generate continuous screenshot stream for device"""
    error_count = 0
    max_errors = 5
    
    # Send initial connection message
    yield f"data: {json.dumps({'type': 'connected', 'device_id': device_id, 'message': 'Live stream connected'})}\n\n"
    
    while device_id in live_streams and live_streams[device_id]:
        try:
            # Check if ADB is available
            adb_check = run_adb_command("version")
            if not adb_check['success']:
                yield f"data: {json.dumps({'type': 'error', 'device_id': device_id, 'error': 'ADB not available. Please install ADB and ensure it is in your PATH.'})}\n\n"
                break
            
            # Check if device is still connected
            device_check = run_adb_command("get-state", device_id)
            if not device_check['success'] or device_check['output'] != 'device':
                yield f"data: {json.dumps({'type': 'error', 'device_id': device_id, 'error': 'Device disconnected or not available'})}\n\n"
                break
            
            # Take screenshot
            screenshot_result = run_adb_command("shell screencap -p /sdcard/live_screenshot.png", device_id)
            if screenshot_result['success']:
                # Pull screenshot
                pull_result = run_adb_command(f"pull /sdcard/live_screenshot.png /tmp/live_{device_id}.png", device_id)
                if pull_result['success']:
                    screenshot_path = f"/tmp/live_{device_id}.png"
                    if os.path.exists(screenshot_path):
                        try:
                            with open(screenshot_path, 'rb') as f:
                                screenshot_data = base64.b64encode(f.read()).decode('utf-8')
                            
                            # Clean up
                            os.remove(screenshot_path)
                            run_adb_command("shell rm /sdcard/live_screenshot.png", device_id)
                            
                            # Reset error count on success
                            error_count = 0
                            
                            # Yield screenshot data as Server-Sent Event
                            data = {
                                'type': 'screenshot',
                                'device_id': device_id,
                                'data': f'data:image/png;base64,{screenshot_data}',
                                'timestamp': int(time.time() * 1000)
                            }
                            yield f"data: {json.dumps(data)}\n\n"
                        except Exception as file_error:
                            error_count += 1
                            yield f"data: {json.dumps({'type': 'error', 'device_id': device_id, 'error': f'File processing error: {str(file_error)}'})}\n\n"
                    else:
                        error_count += 1
                        yield f"data: {json.dumps({'type': 'error', 'device_id': device_id, 'error': 'Screenshot file not found'})}\n\n"
                else:
                    error_count += 1
                    error_msg = pull_result.get('error', 'Unknown error')
                    yield f"data: {json.dumps({'type': 'error', 'device_id': device_id, 'error': f'Failed to pull screenshot: {error_msg}'})}\n\n"
            else:
                error_count += 1
                error_msg = screenshot_result.get('error', 'Unknown error')
                yield f"data: {json.dumps({'type': 'error', 'device_id': device_id, 'error': f'Failed to take screenshot: {error_msg}'})}\n\n"
            
            # Stop streaming if too many errors
            if error_count >= max_errors:
                yield f"data: {json.dumps({'type': 'error', 'device_id': device_id, 'error': 'Too many errors, stopping stream'})}\n\n"
                break
            
            # Wait 2 seconds between screenshots for better performance
            time.sleep(2)
            
        except Exception as e:
            error_count += 1
            error_msg = str(e)
            yield f"data: {json.dumps({'type': 'error', 'device_id': device_id, 'error': f'Stream error: {error_msg}'})}\n\n"
            if error_count >= max_errors:
                break
            time.sleep(1)  # Wait before retry
    
    # Send disconnection message
    yield f"data: {json.dumps({'type': 'disconnected', 'device_id': device_id, 'message': 'Live stream disconnected'})}\n\n"
    
    # Cleanup when stream ends
    if device_id in live_streams:
        del live_streams[device_id]
    if device_id in stream_threads:
        del stream_threads[device_id]

@devices_bp.route('/devices/<device_id>/live-stream', methods=['GET'])
def start_live_stream(device_id):
    """Start live screenshot stream for device"""
    try:
        # Check if device exists and is connected
        device_check = run_adb_command("get-state", device_id)
        if not device_check['success'] or device_check['output'] != 'device':
            return jsonify({'error': f'Device {device_id} is not connected or available'}), 404
        
        # Check if ADB is available
        adb_check = run_adb_command("version")
        if not adb_check['success']:
            return jsonify({'error': 'ADB is not available. Please install ADB and ensure it is in your PATH.'}), 500
        
        # Mark stream as active
        live_streams[device_id] = True
        
        def event_stream():
            try:
                for data in generate_device_stream(device_id):
                    yield data
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'device_id': device_id, 'error': f'Stream generation error: {str(e)}'})}\n\n"
            finally:
                # Cleanup
                if device_id in live_streams:
                    del live_streams[device_id]
        
        response = Response(event_stream(), mimetype='text/event-stream')
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['Connection'] = 'keep-alive'
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Cache-Control'
        
        return response
        
    except Exception as e:
        return jsonify({'error': f'Failed to start live stream: {str(e)}'}), 500

@devices_bp.route('/devices/<device_id>/live-stream', methods=['DELETE'])
def stop_live_stream(device_id):
    """Stop live screenshot stream for device"""
    try:
        if device_id in live_streams:
            live_streams[device_id] = False
            del live_streams[device_id]
        
        return jsonify({'message': 'Live stream stopped'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/live-streams', methods=['GET'])
def get_all_live_streams():
    """Get status of all live streams"""
    try:
        return jsonify({'active_streams': list(live_streams.keys())})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Interactive device controls
@devices_bp.route('/devices/<device_id>/control/tap', methods=['POST'])
def tap_device(device_id):
    """Tap on device screen at coordinates"""
    try:
        data = request.get_json()
        x = data.get('x')
        y = data.get('y')
        
        if x is None or y is None:
            return jsonify({'error': 'x and y coordinates are required'}), 400
        
        tap_result = run_adb_command(f"shell input tap {x} {y}", device_id)
        
        if tap_result['success']:
            return jsonify({'message': f'Tapped at ({x}, {y})'})
        else:
            return jsonify({'error': tap_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/control/swipe', methods=['POST'])
def swipe_device(device_id):
    """Swipe on device screen"""
    try:
        data = request.get_json()
        x1 = data.get('x1')
        y1 = data.get('y1')
        x2 = data.get('x2')
        y2 = data.get('y2')
        duration = data.get('duration', 300)  # Default 300ms
        
        if None in [x1, y1, x2, y2]:
            return jsonify({'error': 'x1, y1, x2, y2 coordinates are required'}), 400
        
        swipe_result = run_adb_command(f"shell input swipe {x1} {y1} {x2} {y2} {duration}", device_id)
        
        if swipe_result['success']:
            return jsonify({'message': f'Swiped from ({x1}, {y1}) to ({x2}, {y2})'})
        else:
            return jsonify({'error': swipe_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/control/key', methods=['POST'])
def send_key(device_id):
    """Send key event to device"""
    try:
        data = request.get_json()
        keycode = data.get('keycode')
        
        if not keycode:
            return jsonify({'error': 'keycode is required'}), 400
        
        key_result = run_adb_command(f"shell input keyevent {keycode}", device_id)
        
        if key_result['success']:
            return jsonify({'message': f'Key {keycode} sent'})
        else:
            return jsonify({'error': key_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/control/text', methods=['POST'])
def send_text(device_id):
    """Send text input to device"""
    try:
        data = request.get_json()
        text = data.get('text')
        
        if not text:
            return jsonify({'error': 'text is required'}), 400
        
        # Escape special characters
        escaped_text = text.replace(' ', '%s').replace('&', '\\&')
        
        text_result = run_adb_command(f"shell input text '{escaped_text}'", device_id)
        
        if text_result['success']:
            return jsonify({'message': f'Text sent: {text}'})
        else:
            return jsonify({'error': text_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/control/home', methods=['POST'])
def press_home(device_id):
    """Press home button"""
    try:
        home_result = run_adb_command("shell input keyevent KEYCODE_HOME", device_id)
        
        if home_result['success']:
            return jsonify({'message': 'Home button pressed'})
        else:
            return jsonify({'error': home_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/control/back', methods=['POST'])
def press_back(device_id):
    """Press back button"""
    try:
        back_result = run_adb_command("shell input keyevent KEYCODE_BACK", device_id)
        
        if back_result['success']:
            return jsonify({'message': 'Back button pressed'})
        else:
            return jsonify({'error': back_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/control/menu', methods=['POST'])
def press_menu(device_id):
    """Press menu button"""
    try:
        menu_result = run_adb_command("shell input keyevent KEYCODE_MENU", device_id)
        
        if menu_result['success']:
            return jsonify({'message': 'Menu button pressed'})
        else:
            return jsonify({'error': menu_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/control/power', methods=['POST'])
def press_power(device_id):
    """Press power button"""
    try:
        power_result = run_adb_command("shell input keyevent KEYCODE_POWER", device_id)
        
        if power_result['success']:
            return jsonify({'message': 'Power button pressed'})
        else:
            return jsonify({'error': power_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/control/volume-up', methods=['POST'])
def press_volume_up(device_id):
    """Press volume up button"""
    try:
        volume_result = run_adb_command("shell input keyevent KEYCODE_VOLUME_UP", device_id)
        
        if volume_result['success']:
            return jsonify({'message': 'Volume up pressed'})
        else:
            return jsonify({'error': volume_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/control/volume-down', methods=['POST'])
def press_volume_down(device_id):
    """Press volume down button"""
    try:
        volume_result = run_adb_command("shell input keyevent KEYCODE_VOLUME_DOWN", device_id)
        
        if volume_result['success']:
            return jsonify({'message': 'Volume down pressed'})
        else:
            return jsonify({'error': volume_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/control/recent-apps', methods=['POST'])
def press_recent_apps(device_id):
    """Press recent apps button"""
    try:
        recent_result = run_adb_command("shell input keyevent KEYCODE_APP_SWITCH", device_id)
        
        if recent_result['success']:
            return jsonify({'message': 'Recent apps button pressed'})
        else:
            return jsonify({'error': recent_result['error']}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Screen recording functionality
recording_processes = {}

@devices_bp.route('/devices/<device_id>/record/start', methods=['POST'])
def start_recording(device_id):
    """Start screen recording"""
    try:
        if device_id in recording_processes:
            return jsonify({'error': 'Recording already in progress'}), 400
        
        # Start recording in background
        record_file = f"/sdcard/recording_{int(time.time())}.mp4"
        
        def record_screen():
            record_result = run_adb_command(f"shell screenrecord {record_file}", device_id)
            if device_id in recording_processes:
                del recording_processes[device_id]
        
        thread = threading.Thread(target=record_screen)
        thread.daemon = True
        thread.start()
        
        recording_processes[device_id] = {
            'thread': thread,
            'file': record_file,
            'start_time': time.time()
        }
        
        return jsonify({'message': 'Recording started', 'file': record_file})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/record/stop', methods=['POST'])
def stop_recording(device_id):
    """Stop screen recording"""
    try:
        if device_id not in recording_processes:
            return jsonify({'error': 'No recording in progress'}), 400
        
        # Stop recording by sending interrupt
        run_adb_command("shell pkill -SIGINT screenrecord", device_id)
        
        record_info = recording_processes[device_id]
        record_file = record_info['file']
        
        # Wait a moment for file to be written
        time.sleep(2)
        
        # Pull the recording file
        local_file = f"/tmp/recording_{device_id}_{int(time.time())}.mp4"
        pull_result = run_adb_command(f"pull {record_file} {local_file}", device_id)
        
        if pull_result['success']:
            # Clean up device file
            run_adb_command(f"shell rm {record_file}", device_id)
            
            del recording_processes[device_id]
            
            return jsonify({
                'message': 'Recording stopped and saved',
                'local_file': local_file,
                'duration': int(time.time() - record_info['start_time'])
            })
        else:
            return jsonify({'error': 'Failed to pull recording file'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@devices_bp.route('/devices/<device_id>/record/status', methods=['GET'])
def recording_status(device_id):
    """Get recording status"""
    try:
        if device_id in recording_processes:
            record_info = recording_processes[device_id]
            return jsonify({
                'recording': True,
                'duration': int(time.time() - record_info['start_time']),
                'file': record_info['file']
            })
        else:
            return jsonify({'recording': False})
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

