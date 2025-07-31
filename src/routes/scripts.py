import os
import subprocess
import json
import time
import random
import threading
import re
import requests
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import uuid

scripts_bp = Blueprint('scripts', __name__)

# Global variables for script execution
script_threads = {}
script_status = {}
uploaded_files = {}

UPLOAD_FOLDER = '/tmp/adb_uploads'
ALLOWED_EXTENSIONS = {'txt', 'csv', 'json'}

# YouTube API configuration
YOUTUBE_API_KEY = "AIzaSyAkU_OI8ld8jrQm7Ev_IkQ9dp6Zgy5kZaw"  # Hardcoded API key
YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3'

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_video_id(video_url):
    """Extract video ID from YouTube URL"""
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/v/([a-zA-Z0-9_-]{11})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, video_url)
        if match:
            return match.group(1)
    return None

def parse_duration(duration_str):
    """Parse ISO 8601 duration format (PT4M13S) to seconds"""
    if not duration_str:
        return 180  # Default 3 minutes
    
    # Remove PT prefix
    duration_str = duration_str.replace('PT', '')
    
    total_seconds = 0
    
    # Extract hours
    hours_match = re.search(r'(\d+)H', duration_str)
    if hours_match:
        total_seconds += int(hours_match.group(1)) * 3600
    
    # Extract minutes
    minutes_match = re.search(r'(\d+)M', duration_str)
    if minutes_match:
        total_seconds += int(minutes_match.group(1)) * 60
    
    # Extract seconds
    seconds_match = re.search(r'(\d+)S', duration_str)
    if seconds_match:
        total_seconds += int(seconds_match.group(1))
    
    return total_seconds if total_seconds > 0 else 180  # Default 3 minutes if parsing fails

def get_video_duration(video_url):
    """Get video duration using YouTube Data API v3"""
    global YOUTUBE_API_KEY
    
    if not YOUTUBE_API_KEY:
        print("[DEBUG] YouTube API key not set, using default duration")
        return 180  # Default 3 minutes
    
    try:
        video_id = extract_video_id(video_url)
        if not video_id:
            print(f"[DEBUG] Could not extract video ID from URL: {video_url}")
            return 180
        
        # Make API request to get video details
        api_url = f"{YOUTUBE_API_BASE_URL}/videos"
        params = {
            'part': 'contentDetails',
            'id': video_id,
            'key': YOUTUBE_API_KEY
        }
        
        print(f"[DEBUG] Making YouTube API request for video ID: {video_id}")
        response = requests.get(api_url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if 'items' in data and len(data['items']) > 0:
            duration_str = data['items'][0]['contentDetails']['duration']
            duration_seconds = parse_duration(duration_str)
            print(f"[DEBUG] Video duration: {duration_seconds} seconds ({duration_str})")
            return duration_seconds
        else:
            print(f"[DEBUG] No video data found for ID: {video_id}")
            return 180
            
    except Exception as e:
        print(f"[DEBUG] Error getting video duration: {e}")
        return 180  # Fallback to default

def set_youtube_api_key(api_key):
    """Set the YouTube API key"""
    global YOUTUBE_API_KEY
    YOUTUBE_API_KEY = api_key
    print(f"[DEBUG] YouTube API key set successfully")

def run_adb_command(command, device_id=None):
    """Execute ADB command and return result"""
    print(f"[DEBUG] run_adb_command called with: command=\"{command}\", device_id={device_id}")
    try:
        if device_id:
            cmd = f"adb -s {device_id} {command}"
        else:
            cmd = f"adb {command}"
        
        print(f"[DEBUG] Full ADB command to execute: {cmd}")
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        print(f"[DEBUG] ADB command execution finished. Return code: {result.returncode}")
        print(f"[DEBUG] ADB stdout: {result.stdout.strip()}")
        print(f"[DEBUG] ADB stderr: {result.stderr.strip()}")
        return {
            'success': result.returncode == 0,
            'output': result.stdout.strip(),
            'error': result.stderr.strip()
        }
    except subprocess.TimeoutExpired:
        print(f"[DEBUG] ADB command timed out: {cmd}")
        return {
            'success': False,
            'output': '',
            'error': 'Command timed out'
        }
    except Exception as e:
        print(f"[DEBUG] Exception in run_adb_command: {e}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'output': '',
            'error': str(e)
        }

















def extract_channel_videos(channel_url, content_filter='videos'):
    """Extract video URLs from a YouTube channel with improved error handling and content filtering"""
    try:
        import requests
        from bs4 import BeautifulSoup
        import re
        
        print(f"[DEBUG] extract_channel_videos called for: {channel_url} with filter: {content_filter}")
        
        # Clean and normalize the channel URL
        channel_url = channel_url.strip()
        
        # Handle 'all' filter by fetching from all content types
        if content_filter == 'all':
            all_videos = []
            for filter_type in ['videos', 'shorts', 'live']:
                videos = extract_single_content_type(channel_url, filter_type)
                # Add category information to each video
                categorized_videos = [{'url': url, 'category': filter_type.capitalize()} for url in videos]
                all_videos.extend(categorized_videos)
            return all_videos
        
        # For specific content types, use the existing logic
        videos = extract_single_content_type(channel_url, content_filter)
        return [{'url': url, 'category': content_filter.capitalize()} for url in videos]
        
    except Exception as e:
        print(f"[DEBUG] Error extracting channel videos: {e}")
        import traceback
        traceback.print_exc()
        return []

def extract_single_content_type(channel_url, content_filter):
    """Extract videos from a specific content type (videos, shorts, live)"""
    try:
        import requests
        import re
        
        # Map content filter to YouTube tab
        filter_mapping = {
            'videos': '/videos',
            'shorts': '/shorts', 
            'live': '/streams'
        }
        
        tab_suffix = filter_mapping.get(content_filter, '/videos')
        
        # Convert different channel URL formats to a standard format
        if '@' in channel_url:
            # Handle @username format
            if channel_url.startswith('@'):
                channel_id = channel_url[1:]
            else:
                channel_id = channel_url.split('@')[1].split('/')[0]
            videos_url = f"https://www.youtube.com/@{channel_id}{tab_suffix}"
        elif '/c/' in channel_url:
            # Handle /c/channelname format
            channel_name = channel_url.split('/c/')[1].split('/')[0]
            videos_url = f"https://www.youtube.com/c/{channel_name}{tab_suffix}"
        elif '/channel/' in channel_url:
            # Handle /channel/channelid format
            channel_id = channel_url.split('/channel/')[1].split('/')[0]
            videos_url = f"https://www.youtube.com/channel/{channel_id}{tab_suffix}"
        elif 'youtube.com' in channel_url:
            # Already a YouTube URL, ensure it has the correct tab
            base_url = channel_url.rstrip('/').split('/videos')[0].split('/shorts')[0].split('/streams')[0]
            videos_url = f"{base_url}{tab_suffix}"
        else:
            # Assume it's a username or channel name
            videos_url = f"https://www.youtube.com/@{channel_url}{tab_suffix}"
        
        print(f"[DEBUG] Videos URL for extraction: {videos_url}")
        
        # Make request to get channel videos page with better headers
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        }
        
        try:
            response = requests.get(videos_url, headers=headers, timeout=30)
            response.raise_for_status()
        except requests.exceptions.RequestException as req_error:
            print(f"[DEBUG] Request failed: {req_error}")
            # Try alternative URL format
            if '@' in channel_url:
                username = channel_url.split('@')[1] if '@' in channel_url else channel_url
                alt_url = f"https://www.youtube.com/c/{username}/videos"
                print(f"[DEBUG] Trying alternative URL: {alt_url}")
                response = requests.get(alt_url, headers=headers, timeout=30)
                response.raise_for_status()
            else:
                raise
        
        print(f"[DEBUG] Successfully fetched channel page. Status code: {response.status_code}")
        
        # Extract video URLs using multiple patterns for better coverage
        video_urls = []
        
        # Pattern 1: videoId in JSON
        video_pattern1 = r'"videoId":"([^"]+)"'
        video_ids1 = re.findall(video_pattern1, response.text)
        
        # Pattern 2: watch?v= URLs
        video_pattern2 = r'"url":"/watch\?v=([^"&]+)"'
        video_ids2 = re.findall(video_pattern2, response.text)
        
        # Pattern 3: Direct watch URLs
        video_pattern3 = r'href="/watch\?v=([^"&]+)"'
        video_ids3 = re.findall(video_pattern3, response.text)
        
        # Pattern 4: Original pattern for backward compatibility
        video_pattern4 = r'"(/watch\\?v=[a-zA-Z0-9_-]{11})"'
        matches4 = re.findall(video_pattern4, response.text)
        video_ids4 = [match.split('v=')[1] for match in matches4 if 'v=' in match]
        
        # Combine all video IDs and remove duplicates
        all_video_ids = video_ids1 + video_ids2 + video_ids3 + video_ids4
        unique_video_ids = list(dict.fromkeys(all_video_ids))
        
        # Filter out invalid video IDs (should be 11 characters)
        valid_video_ids = [vid for vid in unique_video_ids if len(vid) == 11 and vid.replace('_', '').replace('-', '').isalnum()]
        
        # Limit to first 50 videos to avoid overwhelming
        limited_video_ids = valid_video_ids[:50]
        
        # Convert to full YouTube URLs
        video_urls = [f"https://www.youtube.com/watch?v={video_id}" for video_id in limited_video_ids]
        
        print(f"[DEBUG] Found {len(all_video_ids)} total video matches, {len(valid_video_ids)} valid IDs.")
        print(f"[DEBUG] Extracted {len(video_urls)} unique video URLs.")
        
        if not video_urls:
            print(f"[DEBUG] No videos found. Response length: {len(response.text)}")
            # Log first 500 characters for debugging
            print(f"[DEBUG] Response preview: {response.text[:500]}")
        
        return video_urls
        
    except Exception as e:
        print(f"[DEBUG] Error extracting channel videos: {e}")
        import traceback
        traceback.print_exc()
        return []

def youtube_automation_thread(devices, videos, options, script_id, channel_url=None, custom_durations=None, content_filter='all'):
    """Simplified YouTube automation with reliable video playback and detailed logging"""
    print(f"[DEBUG] youtube_automation_thread started for script {script_id}")
    try:
        script_status[script_id] = {"status": "running", "progress": 0, "message": "Starting YouTube automation"}
        print(f"[DEBUG] Starting YouTube automation for script {script_id}")
        print(f"[DEBUG] Devices: {devices}")
        print(f"[DEBUG] Videos: {videos}")
        print(f"[DEBUG] Options: {options}")
        print(f"[DEBUG] Channel URL: {channel_url}")
        print(f"[DEBUG] Content Filter: {content_filter}")
        
        # If channel URL is provided, extract videos from channel
        if channel_url:
            script_status[script_id]["message"] = f"Extracting {content_filter} from YouTube channel..."
            print(f"[DEBUG] Extracting {content_filter} from channel: {channel_url}")
            channel_videos = extract_channel_videos(channel_url, content_filter)
            if channel_videos:
                videos = channel_videos
                script_status[script_id]["message"] = f"Found {len(videos)} {content_filter} from channel"
                print(f"[DEBUG] Found {len(videos)} {content_filter} from channel")
            else:
                script_status[script_id]["status"] = "error"
                script_status[script_id]["message"] = f"Failed to extract {content_filter} from channel"
                print(f"[DEBUG] Failed to extract {content_filter} from channel")
                return
        
        if not videos:
            script_status[script_id]["status"] = "error"
            script_status[script_id]["message"] = "No videos to play"
            print(f"[DEBUG] No videos to play")
            return
        
        # Simplified logic: Always play all videos on all devices sequentially
        script_status[script_id]["message"] = "Playing videos on all selected devices"
        print(f"[DEBUG] Starting video playback on {len(devices)} devices")
        
        # Use videos as-is without shuffling
        video_list = videos
        
        total_videos = len(video_list)
        print(f"[DEBUG] Total videos to play: {total_videos}")
        
        for video_index, video_url in enumerate(video_list):
            if script_status[script_id]["status"] == "stopped":
                print(f"[DEBUG] Script stopped by user")
                break
            
            script_status[script_id]["progress"] = int((video_index / total_videos) * 100)
            script_status[script_id]["message"] = f"Playing video {video_index + 1}/{total_videos} on all devices"
            print(f"[DEBUG] Playing video {video_index + 1}/{total_videos}: {video_url}")
            
            # Play video on all devices simultaneously
            for device_id in devices:
                if script_status[script_id]["status"] == "stopped":
                    break
                
                print(f"[DEBUG] Attempting to play video on device {device_id}")
                
                # Use the most reliable method: direct intent with YouTube app
                # Using -n com.google.android.youtube/.WatchActivity to directly target YouTube\"s watch activity
                # Adding --user 0 to specify the user to run the command as (default user)
                adb_command = f"shell am start -a android.intent.action.VIEW -d \'{video_url}\' com.google.android.youtube"
                print(f"[DEBUG] Executing ADB command: adb -s {device_id} {adb_command}")
                
                result = run_adb_command(adb_command, device_id)
                print(f"[DEBUG] ADB result for device {device_id}: {result}")
                
                if result.get("success", False):
                    print(f"[DEBUG] Successfully started video on device {device_id}")
                    # Add a small delay to allow the video to start playing
                    print(f"[DEBUG] Waiting 5 seconds for video to start on device {device_id}")
                    time.sleep(5) 
                    # Attempt to tap the center of the screen to ensure playback starts
                    print(f"[DEBUG] Tapping center of screen on device {device_id} to ensure playback")
                    tap_result = run_adb_command("shell input tap 500 500", device_id)
                    print(f"[DEBUG] Tap result for device {device_id}: {tap_result}")
                else:
                    print(f"[DEBUG] Failed to start video on device {device_id}: {result.get('error', 'Unknown error')}")
                
                print(f"[DEBUG] Delaying 2 seconds before next device for synchronization")
                time.sleep(2)  # Delay between devices for better synchronization
            
            # Wait for video to complete (hybrid approach with intelligent duration detection)
            # Always wait for video completion, regardless of whether it's the last video
            script_status[script_id]["message"] = f"Getting duration for video {video_index + 1}..."
            print(f"[DEBUG] Getting duration for video {video_index + 1}")
            
            # Get video duration - use custom duration if provided, otherwise fetch from API
            if custom_durations and video_url in custom_durations:
                video_duration = custom_durations[video_url]
                print(f"[DEBUG] Using custom duration: {video_duration}s for {video_url}")
            else:
                video_duration = get_video_duration(video_url)
                print(f"[DEBUG] Using API duration: {video_duration}s for {video_url}")
            # Add 30 seconds buffer for loading and ads
            wait_time = video_duration + 30
            
            script_status[script_id]["message"] = f"Waiting for video {video_index + 1} to complete... (Duration: {video_duration}s)"
            print(f"[DEBUG] Video duration: {video_duration}s, waiting {wait_time}s total")
            
            # Progressive timeout with completion detection
            check_interval = 15  # Check every 15 seconds
            checks_performed = 0
            max_checks = wait_time // check_interval
            
            for i in range(wait_time):
                if script_status[script_id]["status"] == "stopped":
                    print(f"[DEBUG] Script stopped during wait by user")
                    break
                
                # Perform completion detection every check_interval seconds
                if i > 0 and i % check_interval == 0 and checks_performed < max_checks:
                    checks_performed += 1
                    print(f"[DEBUG] Performing completion check {checks_performed}/{max_checks}")
                    
                    # Try to detect if video is still playing by checking if we can find the YouTube app
                    completion_detected = False
                    for device_id in devices:
                        # Check if YouTube app is still in foreground
                        result = run_adb_command("shell dumpsys window windows | grep -E 'mCurrentFocus.*youtube'", device_id)
                        if not result.get('success', False) or not result.get('output', '').strip():
                            print(f"[DEBUG] YouTube may not be in focus on device {device_id}")
                            completion_detected = True
                            break
                    
                    if completion_detected:
                        print(f"[DEBUG] Video completion detected early at {i}s")
                        break
                
                time.sleep(1)
                
                # Update progress during wait
                if i % 30 == 0:  # Update every 30 seconds
                    remaining_time = wait_time - i
                    script_status[script_id]["message"] = f"Video {video_index + 1} playing... ({remaining_time}s remaining, duration: {video_duration}s)"
                    print(f"[DEBUG] Video {video_index + 1} playing... ({remaining_time}s remaining)")
        
        script_status[script_id]["status"] = "completed"
        script_status[script_id]["progress"] = 100
        script_status[script_id]["message"] = f"YouTube automation completed. Played {len(video_list)} videos on {len(devices)} devices."
        print(f"[DEBUG] YouTube automation completed successfully")
        
    except Exception as e:
        script_status[script_id]["status"] = "error"
        script_status[script_id]["message"] = f"Error: {str(e)}"
        print(f"[DEBUG] YouTube automation error: {e}")
        import traceback
        traceback.print_exc()







def google_signin_thread(devices, accounts_file, script_id):
    """Google sign-in thread function with enhanced error handling"""
    try:
        script_status[script_id] = {
            'status': 'running', 
            'progress': 0, 
            'message': 'Starting Google sign-in automation',
            'devices_processed': 0,
            'total_devices': len(devices),
            'successful_devices': 0,
            'failed_devices': 0
        }
        
        # Validate accounts file exists
        if not os.path.exists(accounts_file):
            script_status[script_id]['status'] = 'error'
            script_status[script_id]['message'] = f'Accounts file not found: {accounts_file}'
            return
        
        # Read and validate accounts file
        try:
            with open(accounts_file, 'r', encoding='utf-8') as f:
                accounts = [line.strip() for line in f.readlines() if line.strip() and not line.startswith('#')]
        except Exception as e:
            script_status[script_id]['status'] = 'error'
            script_status[script_id]['message'] = f'Error reading accounts file: {str(e)}'
            return
        
        if not accounts:
            script_status[script_id]['status'] = 'error'
            script_status[script_id]['message'] = 'No accounts found in file'
            return
        
        # Validate account formats
        valid_accounts = []
        for account in accounts:
            if ':' in account:
                parts = account.split(':', 1)
                email = parts[0].strip()
                password = parts[1].strip()
                if email and password and '@' in email:
                    valid_accounts.append((email, password))
                else:
                    print(f"[DEBUG] Invalid account format: {account}")
            else:
                print(f"[DEBUG] Invalid account format (missing password): {account}")
        
        if not valid_accounts:
            script_status[script_id]['status'] = 'error'
            script_status[script_id]['message'] = 'No valid accounts found after validation'
            return
        
        print(f"[DEBUG] Found {len(valid_accounts)} valid accounts for {len(devices)} devices")
        total_devices = len(devices)
        successful_count = 0
        failed_count = 0
        
        for i, device_id in enumerate(devices):
            if script_status[script_id]['status'] == 'stopped':
                break
            
            # Check if device is connected
            device_check = run_adb_command('get-state', device_id)
            if not device_check['success'] or 'device' not in device_check['output']:
                print(f"[DEBUG] Device {device_id} is not connected, skipping")
                failed_count += 1
                continue
                
            # Use round-robin to assign accounts
            email, password = valid_accounts[i % len(valid_accounts)]
            
            script_status[script_id]['message'] = f'Signing in on device {device_id} with {email}'
            device_success = True
            
            try:
                print(f"[DEBUG] Starting Google sign-in on device {device_id} with email: {email}")
                
                # Check if browser is available
                browser_check = run_adb_command('shell pm list packages', device_id)
                has_browser = browser_check['success'] and any(browser in browser_check['output'].lower() for browser in ['chrome', 'firefox', 'browser'])
                if not has_browser:
                    print(f"[DEBUG] No browser found on device {device_id}")
                    failed_count += 1
                    device_success = False
                    continue
                
                # Open Android Settings -> Accounts
                settings_result = run_adb_command('shell am start -a android.settings.SYNC_SETTINGS', device_id)
                if not settings_result['success']:
                    print(f"[DEBUG] Failed to open account settings on device {device_id}")
                    failed_count += 1
                    device_success = False
                    continue
                
                time.sleep(3)  # Wait for settings to load
                
                # Try to find and tap "Add account" button with multiple strategies
                # Strategy 1: Look for menu button (3 dots) first
                # run_adb_command('shell input tap 700 200', device_id)  # Top right menu
                # time.sleep(1)
                run_adb_command('shell input tap 600 300', device_id)  # Add account in menu
                time.sleep(2)
                
                
                # Tap on Google option using precise coordinates
                run_adb_command('shell input tap 422 882', device_id)  # Google option
                time.sleep(5)  # Wait for Google sign-in page to load
                
                # Input email using precise coordinates
                run_adb_command('shell input tap 511 873', device_id)  # Tap email field
                time.sleep(1)
                
                # Clear any existing text and input email
                run_adb_command('shell input keyevent 123', device_id)  # Ctrl+A
                time.sleep(0.5)
                run_adb_command('shell input keyevent 67', device_id)   # Delete
                time.sleep(0.5)
                
                email_result = run_adb_command(f'shell input text "{email}"', device_id)
                if not email_result['success']:
                    print(f"[DEBUG] Failed to input email on device {device_id}")
                    failed_count += 1
                    device_success = False
                    continue
                
                time.sleep(1)
                
                # Tap Next button using precise coordinates
                run_adb_command('shell input tap 931 967', device_id)  # Next button
                time.sleep(2)  # Wait for password field
                
                # Input password using precise coordinates
                run_adb_command('shell input tap 579 738', device_id)  # Tap password field
                time.sleep(1)
                
                # Clear any existing text and input password
                run_adb_command('shell input keyevent 123', device_id)  # Ctrl+A
                time.sleep(0.5)
                run_adb_command('shell input keyevent 67', device_id)   # Delete
                time.sleep(0.5)
                
                password_result = run_adb_command(f'shell input text "{password}"', device_id)
                if not password_result['success']:
                    print(f"[DEBUG] Failed to input password on device {device_id}")
                    failed_count += 1
                    device_success = False
                    continue
                
                time.sleep(1)
                
                # Tap Next button for password
                run_adb_command('shell input tap 931 967', device_id)  # Next button after password
                time.sleep(5)  # Wait for sign-in to complete
                
                # Complete Google account setup process
                # Step 1: Scroll to bottom and click Skip
                run_adb_command('shell input swipe 540 1500 540 500', device_id)  # Scroll to bottom
                time.sleep(1)
                run_adb_command('shell input tap 98 1789', device_id)  # Skip button
                time.sleep(3)
                
                # Step 2: Click I Agree
                run_adb_command('shell input tap 868 1442', device_id)  # I Agree button
                time.sleep(3)
                
                # Step 3: Handle backup prompt - Don't turn on
                run_adb_command('shell input tap 98 1789', device_id)  # Don't turn on backup
                time.sleep(3)
                
                # Step 4: Handle home address prompt - Skip
                run_adb_command('shell input tap 156 980', device_id)  # Skip with keyboard
                time.sleep(1)
                run_adb_command('shell input tap 98 1789', device_id)  # Skip alternative
                time.sleep(3)
                
                # Step 5: Click More and Accept
                run_adb_command('shell input tap 891 1804', device_id)  # More button
                time.sleep(1)
                run_adb_command('shell input tap 891 1804', device_id)  # Accept button
                time.sleep(3)
                
                # Step 6: Go back to home
                run_adb_command('shell input keyevent 3', device_id)  # Home button
                time.sleep(2)
                
                # Verify account was added by checking account list
                verification_result = run_adb_command('shell dumpsys account', device_id)
                if verification_result['success'] and 'google' in verification_result['output'].lower():
                    print(f"[DEBUG] Google account successfully added to device {device_id}")
                else:
                    print(f"[DEBUG] Could not verify Google account addition on device {device_id}")
                
                if device_success:
                    successful_count += 1
                    print(f"[DEBUG] Google sign-in completed on device {device_id}")
                
            except Exception as e:
                print(f"[DEBUG] Error during Google sign-in on device {device_id}: {e}")
                failed_count += 1
                device_success = False
            
            # Update progress
            script_status[script_id]['devices_processed'] = i + 1
            script_status[script_id]['successful_devices'] = successful_count
            script_status[script_id]['failed_devices'] = failed_count
            script_status[script_id]['progress'] = int(((i + 1) / total_devices) * 100)
            
            time.sleep(2)  # Small delay between devices
        
        if script_status[script_id]['status'] != 'stopped':
            script_status[script_id]['status'] = 'completed'
            script_status[script_id]['message'] = f'Google sign-in completed: {successful_count} successful, {failed_count} failed out of {total_devices} devices'
        
    except Exception as e:
        script_status[script_id]['status'] = 'error'
        script_status[script_id]['message'] = f'Error during Google sign-in: {str(e)}'
        print(f"[DEBUG] Google sign-in error: {e}")
        import traceback
        traceback.print_exc()

@scripts_bp.route('/upload', methods=['POST'])
def upload_file():
    """Upload files for scripts"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        file_type = request.form.get('type', 'general')
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(UPLOAD_FOLDER, f"{file_type}_{filename}")
            file.save(file_path)
            
            uploaded_files[file_type] = file_path
            
            return jsonify({
                'message': 'File uploaded successfully',
                'filename': filename,
                'type': file_type
            })
        else:
            return jsonify({'error': 'Invalid file type'}), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scripts_bp.route('/google-signin', methods=['POST'])
def google_signin():
    """Google Sign-in script"""
    try:
        data = request.get_json()
        devices = data.get('devices', [])
        
        if not devices:
            return jsonify({'error': 'No devices selected'}), 400
        
        if 'accounts' not in uploaded_files:
            return jsonify({'error': 'No accounts file uploaded'}), 400
        
        script_id = str(uuid.uuid4())
        
        # Start Google Sign-in thread
        thread = threading.Thread(
            target=google_signin_thread,
            args=(devices, uploaded_files['accounts'], script_id)
        )
        thread.daemon = True
        thread.start()
        
        script_threads[script_id] = thread
        
        return jsonify({
            'message': 'Google Sign-in started',
            'script_id': script_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scripts_bp.route('/status/<script_id>', methods=['GET'])
def get_script_status(script_id):
    """Get script execution status"""
    try:
        if script_id in script_status:
            return jsonify(script_status[script_id])
        else:
            return jsonify({'error': 'Script not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scripts_bp.route('/stop/<script_id>', methods=['POST'])
def stop_script(script_id):
    """Stop script execution"""
    try:
        if script_id in script_status:
            script_status[script_id]['status'] = 'stopped'
            return jsonify({'message': 'Script stopped'})
        else:
            return jsonify({'error': 'Script not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scripts_bp.route('/custom-command', methods=['POST'])
def custom_command():
    """Execute custom ADB commands on multiple devices"""
    try:
        data = request.get_json()
        devices = data.get('devices', [])
        command = data.get('command', '')
        
        if not devices:
            return jsonify({'error': 'No devices selected'}), 400
        
        if not command:
            return jsonify({'error': 'No command provided'}), 400
        
        results = {}
        
        for device_id in devices:
            result = run_adb_command(command, device_id)
            results[device_id] = result
        
        return jsonify({'results': results})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# YouTube API key is hardcoded - no user configuration needed

@scripts_bp.route("/youtube", methods=["POST"])
def youtube_automation():
    """Start YouTube automation with simplified logic"""
    try:
        data = request.get_json()
        devices = data.get("devices", [])
        videos = [v.strip() for v in data.get("videos", []) if v.strip()]  # Filter out empty strings
        options = data.get("options", {})
        channel_url = data.get("channel_url", "").strip()
        custom_durations = data.get("custom_durations", {})
        content_filter = data.get("content_filter", "all")  # Default to 'all'
        
        # Validate content filter
        valid_filters = ['all', 'videos', 'shorts', 'live']
        if content_filter not in valid_filters:
            content_filter = 'all'
        
        print(f"[DEBUG] YouTube automation endpoint called")
        print(f"[DEBUG] Received data: {data}")
        print(f"[DEBUG] Devices: {devices}")
        print(f"[DEBUG] Videos: {videos}")
        print(f"[DEBUG] Options: {options}")
        print(f"[DEBUG] Channel URL: {channel_url}")
        print(f"[DEBUG] Content Filter: {content_filter}")
        
        if not devices:
            print(f"[DEBUG] No devices selected, returning error")
            return jsonify({"success": False, "message": "No devices selected"})
        
        if not videos and not channel_url:
            print(f"[DEBUG] No videos or channel URL provided, returning error")
            return jsonify({"success": False, "message": "No videos or channel URL provided"})
        
        # Generate unique script ID
        script_id = str(uuid.uuid4())
        print(f"[DEBUG] Generated script ID: {script_id}")
        
        # Initialize script status immediately
        script_status[script_id] = {"status": "starting", "progress": 0, "message": "Initializing YouTube automation"}
        print(f"[DEBUG] Initialized script status for {script_id}")
        
        # Start automation in background thread
        print(f"[DEBUG] Creating thread for youtube_automation_thread with args: devices={devices}, videos={videos}, options={options}, script_id={script_id}, channel_url={channel_url}, custom_durations={custom_durations}, content_filter={content_filter}")
        thread = threading.Thread(
            target=youtube_automation_thread,
            args=(devices, videos, options, script_id, channel_url, custom_durations, content_filter)
        )
        thread.daemon = True
        print(f"[DEBUG] Starting thread...")
        thread.start()
        print(f"[DEBUG] Thread started successfully")
        
        # Store thread reference
        script_threads[script_id] = thread
        
        return jsonify({
            "success": True,
            "message": "YouTube automation started",
            "script_id": script_id
        })
        
    except Exception as e:
        print(f"[DEBUG] Exception in youtube_automation endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": f"Error starting YouTube automation: {str(e)}"
        })

@scripts_bp.route('/youtube/pause-resume', methods=['POST'])
def youtube_pause_resume():
    """Pause or resume YouTube video playback"""
    try:
        data = request.get_json()
        devices = data.get('devices', [])
        
        if not devices:
            return jsonify({'error': 'No devices selected'}), 400
        
        results = []
        for device_id in devices:
            # Send space key to pause/resume video
            result = run_adb_command('shell input keyevent KEYCODE_SPACE', device_id)
            results.append({
                'device': device_id,
                'success': result.get('success', False),
                'message': result.get('output', result.get('error', 'Unknown error'))
            })
        
        return jsonify({
            'message': 'Pause/Resume command sent to all devices',
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scripts_bp.route('/youtube/skip', methods=['POST'])
def youtube_skip():
    """Skip to next video"""
    try:
        data = request.get_json()
        devices = data.get('devices', [])
        
        if not devices:
            return jsonify({'error': 'No devices selected'}), 400
        
        results = []
        for device_id in devices:
            # Try multiple methods to skip video
            # Method 1: Swipe left to skip to next video
            result1 = run_adb_command('shell input swipe 800 500 200 500 300', device_id)
            time.sleep(0.5)
            
            # Method 2: Try next button tap (bottom right area)
            result2 = run_adb_command('shell input tap 950 500', device_id)
            time.sleep(0.5)
            
            # Method 3: Try KEYCODE_MEDIA_NEXT
            result3 = run_adb_command('shell input keyevent KEYCODE_MEDIA_NEXT', device_id)
            
            results.append({
                'device': device_id,
                'success': True,
                'message': 'Skip video commands sent (swipe + tap + media next)'
            })
        
        return jsonify({
            'message': 'Skip video command sent to all devices',
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scripts_bp.route('/youtube/like', methods=['POST'])
def youtube_like():
    """Like current video"""
    try:
        data = request.get_json()
        devices = data.get('devices', [])
        
        if not devices:
            return jsonify({'error': 'No devices selected'}), 400
        
        results = []
        for device_id in devices:
            # Tap on like button coordinates (lower position, below title)
            # Try multiple positions for like button
            result1 = run_adb_command('shell input tap 150 950', device_id)
            time.sleep(0.3)
            result2 = run_adb_command('shell input tap 180 920', device_id)
            time.sleep(0.3)
            result3 = run_adb_command('shell input tap 120 980', device_id)
            
            results.append({
                'device': device_id,
                'success': True,
                'message': 'Like button tapped at multiple positions'
            })
        
        return jsonify({
            'message': 'Like video command sent to all devices',
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scripts_bp.route('/youtube/subscribe', methods=['POST'])
def youtube_subscribe():
    """Subscribe to current channel"""
    try:
        data = request.get_json()
        devices = data.get('devices', [])
        
        if not devices:
            return jsonify({'error': 'No devices selected'}), 400
        
        results = []
        for device_id in devices:
            # Tap on subscribe button coordinates (lower position, below title)
            # Try multiple positions for subscribe button
            result1 = run_adb_command('shell input tap 300 950', device_id)
            time.sleep(0.3)
            result2 = run_adb_command('shell input tap 350 920', device_id)
            time.sleep(0.3)
            result3 = run_adb_command('shell input tap 280 980', device_id)
            
            results.append({
                'device': device_id,
                'success': True,
                'message': 'Subscribe button tapped at multiple positions'
            })
        
        return jsonify({
            'message': 'Subscribe command sent to all devices',
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scripts_bp.route('/youtube/share', methods=['POST'])
def youtube_share():
    """Share current video"""
    try:
        data = request.get_json()
        devices = data.get('devices', [])
        
        if not devices:
            return jsonify({'error': 'No devices selected'}), 400
        
        results = []
        for device_id in devices:
            # First tap slightly to the right of the next button to access share section
            run_adb_command('shell input tap 720 850', device_id)
            time.sleep(0.5)
            
            # Alternative positions slightly to the right of next button
            run_adb_command('shell input tap 750 870', device_id)
            time.sleep(0.5)
            run_adb_command('shell input tap 690 830', device_id)
            time.sleep(1)
            
            # Now tap at center bottom of screen to open share options
            run_adb_command('shell input tap 540 950', device_id)
            time.sleep(0.5)
            
            # Try alternative center bottom positions
            run_adb_command('shell input tap 500 930', device_id)
            time.sleep(0.5)
            run_adb_command('shell input tap 560 970', device_id)
            
            results.append({
                'device': device_id,
                'success': True,
                'message': 'Share section accessed and options displayed'
            })
        
        return jsonify({
            'message': 'Share command sent to all devices',
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scripts_bp.route('/youtube/comment', methods=['POST'])
def youtube_comment():
    """Comment on current video"""
    try:
        data = request.get_json()
        devices = data.get('devices', [])
        
        if not devices:
            return jsonify({'error': 'No devices selected'}), 400
        
        results = []
        for device_id in devices:
            # Get screen size first to understand coordinate system
            screen_info = run_adb_command('shell wm size', device_id)
            print(f"Screen size for device {device_id}: {screen_info}")
            
            # Try common comment button positions based on typical YouTube layout
            # These are educated guesses for different screen sizes
            run_adb_command('shell input tap 639 890', device_id)  # First touch position
            time.sleep(0.5)
            run_adb_command('shell input tap 521 1866', device_id)  # Second touch position
            time.sleep(0.5)
            
            results.append({
                'device': device_id,
                'success': True,
                'message': 'Comment section accessed and input field tapped'
            })
        
        return jsonify({
            'message': 'Comment command sent to all devices',
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scripts_bp.route('/youtube/skip-seconds', methods=['POST'])
def youtube_skip_seconds():
    """Skip forward or backward by specified seconds"""
    try:
        data = request.get_json()
        devices = data.get('devices', [])
        seconds = data.get('seconds', 10)
        forward = data.get('forward', True)
        
        if not devices:
            return jsonify({'error': 'No devices selected'}), 400
        
        results = []
        for device_id in devices:
            if forward:
                # Skip forward using right arrow key multiple times
                for _ in range(seconds // 10):  # Each press skips ~10 seconds
                    result = run_adb_command('shell input keyevent KEYCODE_DPAD_RIGHT', device_id)
                    time.sleep(0.1)
            else:
                # Skip backward using left arrow key multiple times
                for _ in range(seconds // 10):  # Each press skips ~10 seconds
                    result = run_adb_command('shell input keyevent KEYCODE_DPAD_LEFT', device_id)
                    time.sleep(0.1)
            
            results.append({
                'device': device_id,
                'success': True,
                'message': f'Skipped {seconds}s {"forward" if forward else "backward"}'
            })
        
        return jsonify({
            'message': f'Skip {seconds}s {"forward" if forward else "backward"} command sent to all devices',
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scripts_bp.route('/youtube/get-durations', methods=['POST'])
def get_youtube_durations():
    """Get durations for multiple YouTube videos"""
    try:
        data = request.get_json()
        video_urls = data.get('videos', [])  # Changed from 'video_urls' to 'videos' to match frontend
        
        if not video_urls:
            return jsonify({'error': 'No video URLs provided'}), 400
        
        durations = []
        for url in video_urls:
            duration = get_video_duration(url.strip())
            durations.append({
                'url': url.strip(),
                'duration': duration,
                'formatted_duration': f"{duration // 60}:{duration % 60:02d}"
            })
        
        return jsonify({
            'success': True,
            'durations': durations
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scripts_bp.route('/youtube/fetch-channel-videos', methods=['POST'])
def fetch_channel_videos():
    """Fetch all videos from a YouTube channel with content filtering"""
    try:
        data = request.get_json()
        channel_url = data.get('channel_url', '').strip()
        content_filter = data.get('content_filter', 'all')  # Default to 'all'
        
        if not channel_url:
            return jsonify({"success": False, "message": "No channel URL provided"})
        
        # Validate content filter
        valid_filters = ['all', 'videos', 'shorts', 'live']
        if content_filter not in valid_filters:
            content_filter = 'all'
        
        print(f"[DEBUG] Fetching {content_filter} from channel: {channel_url}")
        video_urls = extract_channel_videos(channel_url, content_filter)
        
        if not video_urls:
            return jsonify({"success": False, "message": f"No {content_filter} found or unable to extract content from this channel"})
        
        print(f"[DEBUG] Successfully extracted {len(video_urls)} {content_filter} from channel")
        return jsonify({
            "success": True,
            "videos": video_urls,
            "count": len(video_urls)
        })
        
    except Exception as e:
        print(f"[DEBUG] Error fetching channel videos: {e}")
        return jsonify({"success": False, "message": str(e)})

@scripts_bp.route('/vpn', methods=['POST'])
def vpn_automation():
    """VPN automation script"""
    try:
        data = request.get_json()
        devices = data.get('devices', [])
        input_text = data.get('input_text', '')
        
        if not devices:
            return jsonify({'error': 'No devices selected'}), 400
        
        if not input_text:
            return jsonify({'error': 'Input text is required'}), 400
        
        results = []
        for device_id in devices:
            try:
                # Open VPN app
                result1 = run_adb_command('shell am start -n vpnclient.click/.MainActivity', device_id)
                time.sleep(2)
                
                # Click on coordinates 445, 964
                result2 = run_adb_command('shell input tap 445 964', device_id)
                time.sleep(1)
                
                # Type the given input
                result3 = run_adb_command(f'shell input text "{input_text}"', device_id)
                time.sleep(1)
                
                # Click on coordinates 1005, 1832
                result4 = run_adb_command('shell input tap 1005 1832', device_id)
                time.sleep(1)
                
                # Click on coordinates 503, 1134
                result5 = run_adb_command('shell input tap 503 1134', device_id)
                
                success = all([result1['success'], result2['success'], result3['success'], 
                             result4['success'], result5['success']])
                
                results.append({
                    'device': device_id,
                    'success': success,
                    'message': 'VPN automation completed successfully' if success else 'VPN automation failed'
                })
                
            except Exception as e:
                results.append({
                    'device': device_id,
                    'success': False,
                    'message': f'Error: {str(e)}'
                })
        
        return jsonify({
            'message': 'VPN automation completed',
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

