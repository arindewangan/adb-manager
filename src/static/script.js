// Global variables
let devices = [];
let currentScriptId = null;
let scriptStatusInterval = null;

// DOM elements - will be initialized after DOM loads
let sidebarToggle, sidebar, menuItems, contentSections, pageTitle, refreshDevicesBtn, deviceCount, dashboardDeviceCount;

// Initialize DOM elements
function initializeDOMElements() {
    sidebarToggle = document.getElementById('sidebarToggle');
    sidebar = document.querySelector('.sidebar');
    menuItems = document.querySelectorAll('.menu-item');
    contentSections = document.querySelectorAll('.content-section');
    pageTitle = document.getElementById('pageTitle');
    refreshDevicesBtn = document.getElementById('refreshDevices');
    deviceCount = document.getElementById('deviceCount');
    dashboardDeviceCount = document.getElementById('dashboardDeviceCount');
}

// Initialize app
async function updateDeviceVpnStatus() {
    const grid = document.querySelector('.device-vpn-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (const device of devices) {
        const card = document.createElement('div');
        card.className = 'device-vpn-card';
        card.innerHTML = `
            <h4>${device.name || device.id}</h4>
            <div class="vpn-status-info">
                <div class="vpn-status-item">
                    <span class="vpn-status-label">Current IP:</span>
                    <span class="vpn-status-value" id="ip-${device.id}">Loading...</span>
                </div>
                <div class="vpn-status-item">
                    <span class="vpn-status-label">VPN Status:</span>
                    <span class="vpn-status-value" id="vpn-${device.id}">Loading...</span>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
        
        // Fetch device IP and VPN status
        fetchDeviceVpnInfo(device.id);
    }
}

async function fetchDeviceVpnInfo(deviceId) {
    try {
        const response = await fetch(`/api/devices/${deviceId}/vpn-status`);
        const data = await response.json();
        
        if (response.ok) {
            const ipElement = document.getElementById(`ip-${deviceId}`);
            const vpnElement = document.getElementById(`vpn-${deviceId}`);
            
            if (ipElement) ipElement.textContent = data.ip || 'Unknown';
            if (vpnElement) {
                vpnElement.textContent = data.vpn_connected ? 'Connected' : 'Disconnected';
                vpnElement.className = `vpn-status-value ${data.vpn_connected ? 'connected' : 'disconnected'}`;
            }
        }
    } catch (error) {
        console.error('Error fetching VPN info for device', deviceId, error);
        const ipElement = document.getElementById(`ip-${deviceId}`);
        const vpnElement = document.getElementById(`vpn-${deviceId}`);
        
        if (ipElement) ipElement.textContent = 'Error';
        if (vpnElement) vpnElement.textContent = 'Error';
    }
}

async function checkAllProxyStatus() {
    const rows = document.querySelectorAll('#proxies-table tbody tr');
    
    for (const row of rows) {
        const input = row.querySelector('.proxy-string-input');
        if (!input) continue;
        const proxyData = parseProxyString(input.value);
        
        if (proxyData) {
            await checkProxyStatus(row, proxyData);
            // Small delay to avoid overwhelming the network
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

// Proxy Table Management Functions
function updateSelectAllProxyCheckbox() {
    const checkboxes = document.querySelectorAll('#proxies-table .proxy-select');
    const selectAllCheckbox = document.getElementById('selectAllProxyCheckbox');
    const bulkDeleteBtn = document.getElementById('bulkDeleteProxies');
    
    const totalRows = checkboxes.length;
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    // Update status display
    updateProxyStatusDisplay(totalRows, checkedCount);
    
    if (checkboxes.length === 0) {
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
        if (bulkDeleteBtn) bulkDeleteBtn.disabled = true;
        return;
    }
    
    // Update header checkbox state
    if (selectAllCheckbox) {
        if (checkedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedCount === checkboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }
    
    // Update bulk delete button state
    if (bulkDeleteBtn) {
        bulkDeleteBtn.disabled = checkedCount === 0;
    }
}

function updateProxyStatusDisplay(totalRows, selectedRows) {
    const totalElement = document.getElementById('totalProxyRows');
    const selectedElement = document.getElementById('selectedProxyRows');
    
    if (totalElement) totalElement.textContent = totalRows;
    if (selectedElement) selectedElement.textContent = selectedRows;
}

// LocalStorage functions for proxy data
function saveProxyDataToLocalStorage() {
    const proxyData = [];
    const rows = document.querySelectorAll('#proxies-table tbody tr');
    
    rows.forEach(row => {
        const proxyInput = row.querySelector('.proxy-string-input');
        const tagsInput = row.querySelector('.tags-input');
        const locationDisplay = row.querySelector('.location-display');
        const statusDisplay = row.querySelector('.status-display');
        const deviceDisplay = row.querySelector('.device-display');
        
        if (proxyInput) {
            proxyData.push({
                proxyString: proxyInput.value || '',
                tags: tagsInput ? tagsInput.value || '' : '',
                location: locationDisplay ? locationDisplay.textContent || '-' : '-',
                status: statusDisplay ? statusDisplay.textContent || '-' : '-',
                device: deviceDisplay ? deviceDisplay.textContent || '-' : '-'
            });
        }
    });
    
    localStorage.setItem('adb_proxy_data', JSON.stringify(proxyData));
}

function loadProxyDataFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('adb_proxy_data');
        if (!savedData) return;
        
        const proxyData = JSON.parse(savedData);
        const tbody = document.querySelector('#proxies-table tbody');
        
        // Clear existing rows except the first one
        while (tbody.children.length > 1) {
            tbody.removeChild(tbody.lastChild);
        }
        
        // Load saved data
        proxyData.forEach((data, index) => {
            let row;
            if (index === 0) {
                // Use the existing first row
                row = tbody.children[0];
            } else {
                // Create new rows for additional data
                row = addProxyRow();
            }
            
            const proxyInput = row.querySelector('.proxy-string-input');
            const tagsInput = row.querySelector('.tags-input');
            const locationDisplay = row.querySelector('.location-display');
            const statusDisplay = row.querySelector('.status-display');
            const deviceDisplay = row.querySelector('.device-display');
            
            if (proxyInput) proxyInput.value = data.proxyString;
            if (tagsInput) tagsInput.value = data.tags;
            if (locationDisplay) locationDisplay.textContent = data.location;
            if (statusDisplay) statusDisplay.textContent = data.status;
            if (deviceDisplay) deviceDisplay.textContent = data.device;
            
            // Update proxy data if there's a proxy string
            if (data.proxyString && proxyInput) {
                updateProxyData(proxyInput);
                assignDeviceToRow(row);
            }
        });
        
        updateSelectAllProxyCheckbox();
    } catch (error) {
        console.error('Error loading proxy data from localStorage:', error);
    }
}

// LocalStorage functions for YouTube video data
function saveYouTubeDataToLocalStorage() {
    const youtubeData = {
        videoUrl: document.getElementById('videoUrl')?.value || '',
        videoTitle: document.getElementById('videoTitle')?.textContent || '',
        videoDuration: document.getElementById('videoDuration')?.textContent || '',
        videoThumbnail: document.getElementById('videoThumbnail')?.src || ''
    };
    
    localStorage.setItem('adb_youtube_data', JSON.stringify(youtubeData));
}

function loadYouTubeDataFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('adb_youtube_data');
        if (!savedData) return;
        
        const youtubeData = JSON.parse(savedData);
        
        const videoUrlInput = document.getElementById('videoUrl');
        const videoTitle = document.getElementById('videoTitle');
        const videoDuration = document.getElementById('videoDuration');
        const videoThumbnail = document.getElementById('videoThumbnail');
        
        if (videoUrlInput && youtubeData.videoUrl) {
            videoUrlInput.value = youtubeData.videoUrl;
        }
        if (videoTitle && youtubeData.videoTitle) {
            videoTitle.textContent = youtubeData.videoTitle;
        }
        if (videoDuration && youtubeData.videoDuration) {
            videoDuration.textContent = youtubeData.videoDuration;
        }
        if (videoThumbnail && youtubeData.videoThumbnail) {
            videoThumbnail.src = youtubeData.videoThumbnail;
        }
    } catch (error) {
        console.error('Error loading YouTube data from localStorage:', error);
    }
}

function selectAllProxies(select) {
    const checkboxes = document.querySelectorAll('#proxies-table .proxy-select');
    checkboxes.forEach(checkbox => {
        checkbox.checked = select;
    });
    updateSelectAllProxyCheckbox();
}

function bulkDeleteSelectedProxies() {
    const selectedCheckboxes = document.querySelectorAll('#proxies-table .proxy-select:checked');
    const tbody = document.querySelector('#proxies-table tbody');
    
    if (selectedCheckboxes.length === 0) {
        showToast('No proxies selected for deletion', 'warning');
        return;
    }
    
    // Ensure at least one row remains
    const totalRows = tbody.children.length;
    if (selectedCheckboxes.length >= totalRows) {
        showToast('Cannot delete all proxy rows. At least one row is required.', 'warning');
        return;
    }
    
    // Remove selected rows
    selectedCheckboxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        if (row) {
            row.remove();
        }
    });
    
    // Update UI and reassign devices
    updateSelectAllProxyCheckbox();
    reassignAllDevices();
    saveProxyDataToLocalStorage();
    
    showToast(`Successfully deleted ${selectedCheckboxes.length} proxy entries`, 'success');
}

function addProxyRow(proxyString = '') {
    const tbody = document.querySelector('#proxies-table tbody');
    const row = document.createElement('tr');
    row.className = 'proxy-row';
    
    const proxyData = parseProxyString(proxyString);
    
    row.innerHTML = `
        <td><input type="checkbox" class="proxy-select"></td>
        <td>
            <input type="text" class="proxy-string-input" value="${proxyString}" 
                   placeholder="Paste multiple URLs/proxies here (one per line or comma-separated)">
        </td>
        <td class="location-display">-</td>
        <td class="status-display">-</td>
        <td class="device-display">-</td>
        <td>
            <input type="text" class="tags-input" placeholder="Add tags...">
        </td>
        <td>
            <button type="button" class="btn btn-danger btn-sm remove-proxy" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(row);
    console.log('Added new proxy row. Total rows now:', tbody.children.length);
    setupProxyRowEvents(row);
    
    // Focus on the new proxy input
    const proxyInput = row.querySelector('.proxy-string-input');
    proxyInput.focus();
    
    if (proxyString) {
        updateProxyData(proxyInput);
        assignDeviceToRow(row);
    }
    
    updateSelectAllProxyCheckbox();
    saveProxyDataToLocalStorage();
    
    return row;
}

function setupProxyRowEvents(row) {
    if (!row) return;
    
    const proxyInput = row.querySelector('.proxy-string-input');
    const removeBtn = row.querySelector('.remove-proxy');
    const checkbox = row.querySelector('.proxy-select');
    
    if (proxyInput) {
        proxyInput.addEventListener('input', function() {
            if (this.value.trim()) {
                updateProxyData(this);
                assignDeviceToRow(row);
            } else {
                const locationDisplay = row.querySelector('.location-display');
                const statusDisplay = row.querySelector('.status-display');
                const deviceDisplay = row.querySelector('.device-display');
                locationDisplay.textContent = '-';
                statusDisplay.textContent = '-';
                deviceDisplay.textContent = '-';
                row.classList.remove('loading', 'error');
            }
            saveProxyDataToLocalStorage();
        });
        
        proxyInput.addEventListener('paste', function(e) {
            e.preventDefault(); // Prevent default paste behavior
            
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedText = clipboardData.getData('text').trim();
            
            // Handle multiple separators: newlines, commas, or semicolons
            let proxies = [];
            if (pastedText.includes('\n')) {
                proxies = pastedText.split(/\r?\n/).map(proxy => proxy.trim()).filter(proxy => proxy);
            } else if (pastedText.includes(',')) {
                proxies = pastedText.split(',').map(proxy => proxy.trim()).filter(proxy => proxy);
            } else if (pastedText.includes(';')) {
                proxies = pastedText.split(';').map(proxy => proxy.trim()).filter(proxy => proxy);
            } else {
                proxies = [pastedText];
            }
            
            console.log('Pasted text:', pastedText);
            console.log('Split proxies:', proxies);
            console.log('Number of proxies:', proxies.length);
            
            if (proxies.length > 1) {
                // Multiple proxies detected - create new rows for each
                this.value = proxies[0]; // Set first proxy in current row
                console.log('Setting first proxy:', proxies[0]);
                
                // Create new rows for remaining proxies
                for (let i = 1; i < proxies.length; i++) {
                    console.log('Creating row for proxy:', proxies[i]);
                    const newRow = addProxyRow();
                    const newProxyInput = newRow.querySelector('.proxy-string-input');
                    if (newProxyInput) {
                        newProxyInput.value = proxies[i];
                        console.log('Set proxy value:', newProxyInput.value);
                        updateProxyData(newProxyInput);
                        assignDeviceToRow(newRow);
                    }
                }
                
                // Update data for first proxy in current row
                if (proxies[0]) {
                    updateProxyData(this);
                    assignDeviceToRow(row);
                }
                
                showToast(`Successfully added ${proxies.length} proxy entries`, 'success');
            } else if (pastedText) {
                // Single proxy - set it normally
                this.value = pastedText;
                updateProxyData(this);
                assignDeviceToRow(row);
            }
        });
    }
    
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            const tbody = document.querySelector('#proxies-table tbody');
            if (tbody.children.length > 1) {
                row.remove();
                updateSelectAllProxyCheckbox();
                // Reassign devices after removing a row
                reassignAllDevices();
                saveProxyDataToLocalStorage();
            } else {
                showToast('At least one proxy row is required', 'warning');
            }
        });
    }
    
    if (checkbox) {
        checkbox.addEventListener('change', updateSelectAllProxyCheckbox);
    }
    
    // Add event listener for tags input
    const tagsInput = row.querySelector('.tags-input');
    if (tagsInput) {
        tagsInput.addEventListener('input', saveProxyDataToLocalStorage);
    }
}

// Legacy functions removed - functionality moved to individual row paste handling

function initializeProxyTable() {
    const addProxyBtn = document.getElementById('addProxyBtn');
    const selectAllProxyCheckbox = document.getElementById('selectAllProxyCheckbox');
    const bulkDeleteBtn = document.getElementById('bulkDeleteProxies');
    const checkProxyStatusBtn = document.getElementById('checkProxyStatus');
    
    if (addProxyBtn) addProxyBtn.addEventListener('click', addProxyRow);
    
    // Header checkbox to select/deselect all
    if (selectAllProxyCheckbox) {
        selectAllProxyCheckbox.addEventListener('change', function() {
            selectAllProxies(this.checked);
        });
    }
    
    if (bulkDeleteBtn) bulkDeleteBtn.addEventListener('click', bulkDeleteSelectedProxies);
    if (checkProxyStatusBtn) checkProxyStatusBtn.addEventListener('click', checkAllProxyStatus);
    
    // Setup events for existing proxy rows
    const existingRows = document.querySelectorAll('.proxy-row');
    existingRows.forEach(row => {
        setupProxyRowEvents(row);
    });
    
    // Initialize checkbox states
    updateSelectAllProxyCheckbox();
    
    // Load saved data from localStorage
    loadProxyDataFromLocalStorage();
    
    // Initialize device VPN status
    updateDeviceVpnStatus();
}

document.addEventListener('DOMContentLoaded', function() {
    initializeDOMElements();
    initializeApp();
    setupEventListeners();
    loadDevices();
    initializeVideoTable();
    initializeProxyTable();
    
    // Set up periodic refresh for dashboard
    setInterval(() => {
        // Only refresh if we're on the dashboard or devices section
        const activeSection = document.querySelector('.content-section.active');
        if (activeSection && (activeSection.id === 'dashboard' || activeSection.id === 'devices')) {
            loadDevices();
        }
    }, 5000); // Refresh every 5 seconds
});

function initializeApp() {
    // Set up navigation
    if (menuItems) {
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                showSection(section);
                
                // Update active menu item
                if (menuItems) {
                    menuItems.forEach(mi => mi.classList.remove('active'));
                }
                item.classList.add('active');
                
                // Update page title
                if (pageTitle) {
                    pageTitle.textContent = item.textContent.trim();
                }
                
                // Close sidebar on mobile
                if (window.innerWidth <= 768 && sidebar) {
                    sidebar.classList.remove('active');
                }
            });
        });
    }
    
    // Sidebar toggle
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    
    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && sidebar && sidebarToggle &&
            !sidebar.contains(e.target) && 
            !sidebarToggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
}

function setupEventListeners() {
    // Refresh devices
    if (refreshDevicesBtn) {
        refreshDevicesBtn.addEventListener('click', loadDevices);
    }
    
    // File uploads

    setupFileUpload('accountsFile', 'accountsFileUpload', 'accountsFileInfo', 'accounts');
    
    // Select/Deselect All buttons
    setupSelectAllButtons();
    
    // Script buttons
    document.getElementById('startYouTubeAutomation').addEventListener('click', startYouTubeAutomation);
    document.getElementById('fetchChannelVideos').addEventListener('click', fetchChannelVideos);
    
    // Initialize video table
    initializeVideoTable();
    
    // Video control event listeners
    document.getElementById('pauseResumeVideo').addEventListener('click', pauseResumeVideo);
    document.getElementById('skipVideo').addEventListener('click', skipVideo);
    document.getElementById('likeCurrentVideo').addEventListener('click', likeCurrentVideo);
    document.getElementById('subscribeChannel').addEventListener('click', subscribeChannel);
    document.getElementById('commentVideo').addEventListener('click', commentVideo);
    document.getElementById('shareVideo').addEventListener('click', shareVideo);
    
    // YouTube API key management
    document.getElementById('skipForward').addEventListener('click', () => skipSeconds(true));
    document.getElementById('skipBackward').addEventListener('click', () => skipSeconds(false));

    document.getElementById('openUrl').addEventListener('click', openUrl);
    document.getElementById('startGoogleSignin').addEventListener('click', startGoogleSignin);
    document.getElementById('startGoogleSignout').addEventListener('click', startGoogleSignout);
    document.getElementById('startVpnAutomation').addEventListener('click', startVpnAutomation);
    document.getElementById('installVpnApp').addEventListener('click', installVpnApp);
    document.getElementById('launchApp').addEventListener('click', launchApp);

    document.getElementById('executeCustomCommand').addEventListener('click', executeCustomCommand);
    
    // WiFi buttons
    document.getElementById('enableWifi').addEventListener('click', () => manageWifi('enable'));
    document.getElementById('disableWifi').addEventListener('click', () => manageWifi('disable'));
    document.getElementById('checkWifiStatus').addEventListener('click', checkWifiStatus);
}

// Duplicate functions removed - moved earlier in file

function parseProxyString(proxyString) {
    const parts = proxyString.split(':');
    if (parts.length >= 4) {
        return {
            ip: parts[0],
            port: parts[1],
            username: parts[2],
            password: parts[3]
        };
    }
    return null;
}

async function updateProxyData(input) {
    const row = input.closest('tr');
    const proxyString = input.value.trim();
    
    // Handle URLs as well as proxy strings
    if (isValidUrl(proxyString)) {
        // It's a URL, treat it differently
        row.querySelector('.location-display').textContent = 'URL';
        row.querySelector('.status-display').textContent = 'Valid URL';
        row.querySelector('.status-display').className = 'status-display live';
        return;
    }
    
    const proxyData = parseProxyString(proxyString);
    
    if (!proxyData) {
        row.querySelector('.location-display').textContent = 'Invalid format';
        row.querySelector('.status-display').textContent = 'Invalid';
        return;
    }
    
    // Update location
    try {
        const locationCell = row.querySelector('.location-display');
        locationCell.textContent = 'Loading...';
        
        const response = await fetch('/api/proxy/location', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ip: proxyData.ip
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.location) {
            locationCell.textContent = data.location;
        } else {
            locationCell.textContent = 'Unknown';
        }
    } catch (error) {
        console.error('Error fetching location:', error);
        row.querySelector('.location-display').textContent = 'Error';
    }
    
    // Check proxy status
    checkProxyStatus(row, proxyData);
}

async function checkProxyStatus(row, proxyData) {
    const statusCell = row.querySelector('.status-display');
    statusCell.textContent = 'Checking...';
    statusCell.className = 'status-display checking';
    
    try {
        const response = await fetch('/api/proxy/check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                proxy_string: `${proxyData.ip}:${proxyData.port}:${proxyData.username}:${proxyData.password}`
            })
        });
        
        const data = await response.json();
        
        if (data.status === 'live') {
            statusCell.textContent = 'Live';
            statusCell.className = 'status-display live';
        } else {
            statusCell.textContent = 'Dead';
            statusCell.className = 'status-display dead';
        }
    } catch (error) {
        console.error('Error checking proxy status:', error);
        statusCell.textContent = 'Dead';
        statusCell.className = 'status-display dead';
    }
}

// Duplicate functions removed - moved earlier in file

function removeProxyRow(button) {
    const row = button.closest('tr');
    row.remove();
    updateSelectAllProxyCheckbox();
}

function getSelectedProxyData() {
    const selectedRows = document.querySelectorAll('#proxies-table .proxy-select:checked');
    return Array.from(selectedRows).map(checkbox => {
        const row = checkbox.closest('tr');
        const proxyStringInput = row.querySelector('.proxy-string-input');
        const tagsInput = row.querySelector('.tags-input');
        const deviceDisplay = row.querySelector('.device-display');
        
        if (!proxyStringInput || !tagsInput || !deviceDisplay) {
            return null;
        }
        
        const proxyString = proxyStringInput.value;
        const tags = tagsInput.value;
        const device = deviceDisplay.textContent;
        
        return {
            proxyString,
            device: device !== '-' ? device : null,
            tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        };
    }).filter(data => data !== null);
}

// Helper function to validate URLs
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Function to automatically assign devices to proxy rows
function assignDeviceToRow(row) {
    const deviceDisplay = row.querySelector('.device-display');
    const proxyInput = row.querySelector('.proxy-string-input');
    
    if (!deviceDisplay || !proxyInput || !proxyInput.value || !proxyInput.value.trim()) {
        if (deviceDisplay) deviceDisplay.textContent = '-';
        return;
    }
    
    // Get all proxy rows to determine which devices are already assigned
    const allRows = document.querySelectorAll('#proxies-table tbody tr');
    const assignedDevices = new Set();
    
    allRows.forEach(r => {
        if (r !== row) {
            const deviceDisplayElement = r.querySelector('.device-display');
            if (deviceDisplayElement) {
                const deviceText = deviceDisplayElement.textContent;
                if (deviceText !== '-') {
                    assignedDevices.add(deviceText);
                }
            }
        }
    });
    
    // Find the next available device
    let assignedDevice = null;
    for (const device of devices) {
        const deviceName = device.name || device.id;
        if (!assignedDevices.has(deviceName)) {
            assignedDevice = deviceName;
            break;
        }
    }
    
    if (assignedDevice) {
        deviceDisplay.textContent = assignedDevice;
        deviceDisplay.style.color = '#28a745';
    } else {
        deviceDisplay.textContent = 'No device available';
        deviceDisplay.style.color = '#dc3545';
    }
}

// Function to reassign all devices when rows are added/removed
function reassignAllDevices() {
    const allRows = document.querySelectorAll('#proxies-table tbody tr');
    allRows.forEach(row => {
        const proxyInput = row.querySelector('.proxy-string-input');
        if (proxyInput && proxyInput.value && proxyInput.value.trim()) {
            assignDeviceToRow(row);
        }
    });
}

// Device VPN Status Functions
async function updateDeviceVpnStatus() {
    const grid = document.querySelector('.device-vpn-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (const device of devices) {
        const card = document.createElement('div');
        card.className = 'device-vpn-card';
        card.innerHTML = `
            <h4>${device.name || device.id}</h4>
            <div class="vpn-status-info">
                <div class="vpn-status-item">
                    <span class="vpn-status-label">Current IP:</span>
                    <span class="vpn-status-value" id="ip-${device.id}">Loading...</span>
                </div>
                <div class="vpn-status-item">
                    <span class="vpn-status-label">VPN Status:</span>
                    <span class="vpn-status-value" id="vpn-${device.id}">Loading...</span>
                </div>
            </div>
        `;
        
        grid.appendChild(card);
        
        // Fetch device IP and VPN status
        fetchDeviceVpnInfo(device.id);
    }
}

async function fetchDeviceVpnInfo(deviceId) {
    try {
        // Get device VPN status and current IP from the new API endpoint
        const response = await fetch(`/api/devices/${deviceId}/vpn-status`);
        const data = await response.json();
        
        const ipElement = document.getElementById(`ip-${deviceId}`);
        const vpnElement = document.getElementById(`vpn-${deviceId}`);
        
        if (data.success) {
            if (ipElement) {
                ipElement.textContent = data.current_ip || 'Unknown';
            }
            
            if (vpnElement) {
                const isConnected = data.vpn_connected || false;
                vpnElement.textContent = data.vpn_status || 'Unknown';
                vpnElement.className = `vpn-status-value ${isConnected ? 'connected' : 'disconnected'}`;
            }
        } else {
            if (ipElement) ipElement.textContent = 'Unknown';
            if (vpnElement) {
                vpnElement.textContent = 'Unknown';
                vpnElement.className = 'vpn-status-value disconnected';
            }
        }
    } catch (error) {
        console.error('Error fetching device VPN info:', error);
        const ipElement = document.getElementById(`ip-${deviceId}`);
        const vpnElement = document.getElementById(`vpn-${deviceId}`);
        
        if (ipElement) ipElement.textContent = 'Error';
        if (vpnElement) {
            vpnElement.textContent = 'Error';
            vpnElement.className = 'vpn-status-value disconnected';
        }}
}

function setupSelectAllButtons() {

    
    // YouTube
    document.getElementById('selectAllYouTubeDevices').addEventListener('click', () => selectAllDevices('youtubeDeviceList', true));
    document.getElementById('deselectAllYouTubeDevices').addEventListener('click', () => selectAllDevices('youtubeDeviceList', false));
    

    
    // URL Opener
    document.getElementById('selectAllUrlDevices').addEventListener('click', () => selectAllDevices('urlDeviceList', true));
    document.getElementById('deselectAllUrlDevices').addEventListener('click', () => selectAllDevices('urlDeviceList', false));
    
    // Google Sign-in
    document.getElementById('selectAllSigninDevices').addEventListener('click', () => selectAllDevices('signinDeviceList', true));
    document.getElementById('deselectAllSigninDevices').addEventListener('click', () => selectAllDevices('signinDeviceList', false));
    
    // VPN Automation
    document.getElementById('selectAllVpnDevices').addEventListener('click', () => selectAllDevices('vpnDeviceList', true));
    document.getElementById('deselectAllVpnDevices').addEventListener('click', () => selectAllDevices('vpnDeviceList', false));
    
    // App Launcher
    document.getElementById('selectAllAppDevices').addEventListener('click', () => selectAllDevices('appDeviceList', true));
    document.getElementById('deselectAllAppDevices').addEventListener('click', () => selectAllDevices('appDeviceList', false));
    

    
    // WiFi Manager
    document.getElementById('selectAllWifiDevices').addEventListener('click', () => selectAllDevices('wifiDeviceList', true));
    document.getElementById('deselectAllWifiDevices').addEventListener('click', () => selectAllDevices('wifiDeviceList', false));
    
    // Custom Scripts
    document.getElementById('selectAllCustomDevices').addEventListener('click', () => selectAllDevices('customDeviceList', true));
    document.getElementById('deselectAllCustomDevices').addEventListener('click', () => selectAllDevices('customDeviceList', false));
}

function selectAllDevices(containerId, select) {
    const container = document.getElementById(containerId);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = select;
    });
    
    // Update button states
    updateButtonStates();
}

function setupFileUpload(inputId, uploadId, infoId, type) {
    const input = document.getElementById(inputId);
    const uploadArea = document.getElementById(uploadId);
    const fileInfo = document.getElementById(infoId);
    
    if (!input || !uploadArea || !fileInfo) return;
    
    uploadArea.addEventListener('click', () => input.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#764ba2';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#667eea';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#667eea';
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0], type, fileInfo, uploadArea);
        }
    });
    
    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0], type, fileInfo, uploadArea);
        }
    });
    
    // Remove file button
    const removeBtn = fileInfo.querySelector('.remove-file');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            fileInfo.style.display = 'none';
            uploadArea.querySelector('.upload-area').style.display = 'block';
            input.value = '';
            updateButtonStates();
        });
    }
}

async function handleFileUpload(file, type, fileInfo, uploadArea) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    try {
        const response = await fetch('/api/scripts/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            fileInfo.querySelector('.filename').textContent = file.name;
            fileInfo.style.display = 'flex';
            uploadArea.querySelector('.upload-area').style.display = 'none';
            showToast('File uploaded successfully', 'success');
            updateButtonStates();
        } else {
            showToast(result.error || 'Upload failed', 'error');
        }
    } catch (error) {
        showToast('Upload failed: ' + error.message, 'error');
    }
}

function showSection(sectionId) {
    if (contentSections) {
        contentSections.forEach(section => {
            section.classList.remove('active');
        });
    }
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Update page title based on section
        if (pageTitle) {
            const sectionTitles = {
                'dashboard': 'Dashboard',
                'devices': 'Devices',
                'live-view': 'Live View',
                'youtube': 'YouTube',
                'url-opener': 'URL Opener',
                'google-signin': 'Google Sign-in',
                'vpn-automation': 'VPN Automation',
                'app-launcher': 'App Launcher',
                'wifi-manager': 'WiFi Manager',
                'custom-scripts': 'Custom Scripts'
            };
            pageTitle.textContent = sectionTitles[sectionId] || 'Dashboard';
        }
        
        // Update active menu item
        if (menuItems) {
            menuItems.forEach(item => {
                if (item.dataset.section === sectionId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
        
        // Load devices for sections that need them
        if (sectionId !== 'dashboard' && sectionId !== 'devices') {
            updateDeviceSelectionLists();
        }
    }
}

async function loadDevices() {
    try {
        const response = await fetch('/api/devices');
        const data = await response.json();
        
        if (response.ok) {
            devices = data.devices || [];
            updateDeviceCount();
            updateDevicesGrid();
            updateDeviceSelectionLists();
            updateDashboard();
            
            // Update device VPN status if we're on the VPN automation section
            const activeSection = document.querySelector('.content-section.active');
            if (activeSection && activeSection.id === 'vpn-automation') {
                updateDeviceVpnStatus();
                // Reassign devices to proxy rows after loading devices
                const proxiesTable = document.querySelector('#proxies-table tbody');
                if (proxiesTable && proxiesTable.children.length > 0) {
                    reassignAllDevices();
                }
            }
        } else {
            showToast(data.error || 'Failed to load devices', 'error');
        }
    } catch (error) {
        showToast('Failed to load devices: ' + error.message, 'error');
    }
}





function updateDeviceCount() {
    const count = devices.length;
    
    // Update header device count
    const deviceCountElement = document.getElementById('deviceCount');
    if (deviceCountElement) {
        deviceCountElement.textContent = count;
    }
    
    // Update dashboard device count
    const dashboardDeviceCountElement = document.getElementById('dashboardDeviceCount');
    if (dashboardDeviceCountElement) {
        dashboardDeviceCountElement.textContent = count;
    }
    
    // Update dashboard stats
    const connectedDevicesElement = document.getElementById('connectedDevices');
    if (connectedDevicesElement) {
        connectedDevicesElement.textContent = count;
    }
}

function updateDevicesGrid() {
    const grid = document.getElementById('devicesGrid');
    
    if (devices.length === 0) {
        grid.innerHTML = '<div class="loading">No devices connected</div>';
        return;
    }
    
    grid.innerHTML = devices.map(device => `
        <div class="device-card">
            <div class="device-header">
                <div class="device-name-container">
                    <span class="device-name" data-device-id="${device.id}">${device.name || device.id}</span>
                    <button class="edit-name-btn" data-device-id="${device.id}" title="Edit name" onclick="editDeviceName('${device.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
                <span class="device-status ${device.status === 'device' ? 'online' : 'offline'}">
                    ${device.status === 'device' ? 'Online' : 'Offline'}
                </span>
            </div>
            <div class="device-info">
                <p><strong>ID:</strong> ${device.id}</p>
                <p><strong>Brand:</strong> ${device.brand}</p>
                <p><strong>Model:</strong> ${device.model}</p>
                <p><strong>Android:</strong> ${device.android_version}</p>

            </div>
            <div class="device-actions">
                <button class="btn btn-primary btn-sm" onclick="takeScreenshot('${device.id}')">
                    <i class="fas fa-camera"></i> Screenshot
                </button>


            </div>
        </div>
    `).join('');
}

function updateDeviceSelectionLists() {
    const lists = [
        'youtubeDeviceList', 
        'urlDeviceList', 'signinDeviceList', 'vpnDeviceList', 'appDeviceList', 
        'wifiDeviceList', 'customDeviceList'
    ];
    
    lists.forEach(listId => {
        const list = document.getElementById(listId);
        if (!list) return;
        
        if (devices.length === 0) {
            list.innerHTML = '<p class="no-devices">No devices available</p>';
            return;
        }
        
        list.innerHTML = devices.map(device => `
            <div class="device-checkbox">
                <input type="checkbox" id="${listId}_${device.id}" value="${device.id}" onchange="updateButtonStates()">
                <label for="${listId}_${device.id}" class="device-checkbox-label-enhanced">
                    <div class="device-name-container">
                        <span class="device-name" data-device-id="${device.id}">${device.name || device.id}</span>
                        <button class="edit-name-btn" data-device-id="${device.id}" title="Edit name" onclick="editDeviceName('${device.id}'); event.preventDefault(); event.stopPropagation();">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                    <div class="device-details">
                        <span class="device-model">${device.brand} ${device.model}</span>
                        <span class="device-android">Android ${device.android_version}</span>
                    </div>

                </label>
            </div>
        `).join('');
    });
    
    updateButtonStates();
}

function updateButtonStates() {
    // Update button states based on selections and requirements
    
    const youtubeSelected = getSelectedDevices('youtubeDeviceList').length > 0;
    const selectedVideoData = getSelectedVideoData();
    const hasSelectedVideos = selectedVideoData.length > 0;
    const youtubeChannelUrlElement = document.getElementById('youtubeChannelUrl');
    const youtubeChannelUrl = youtubeChannelUrlElement ? youtubeChannelUrlElement.value.trim() : '';
    const startYouTubeBtn = document.getElementById('startYouTubeAutomation');
    const fetchChannelBtn = document.getElementById('fetchChannelVideos');
    if (startYouTubeBtn) startYouTubeBtn.disabled = !youtubeSelected || (!hasSelectedVideos && !youtubeChannelUrl);
    if (fetchChannelBtn) fetchChannelBtn.disabled = !youtubeChannelUrl;
    

    
    const urlSelected = getSelectedDevices('urlDeviceList').length > 0;
    const defaultBrowserUrlElement = document.getElementById('defaultBrowserUrl');
    const urlValue = defaultBrowserUrlElement ? defaultBrowserUrlElement.value.trim() : '';
    const openUrlBtn = document.getElementById('openUrl');
    if (openUrlBtn) openUrlBtn.disabled = !urlSelected || !urlValue;
    
    const signinSelected = getSelectedDevices('signinDeviceList').length > 0;
    const accountsFileInfoElement = document.getElementById('accountsFileInfo');
    const accountsFileUploaded = accountsFileInfoElement ? accountsFileInfoElement.style.display !== 'none' : false;
    const startGoogleSigninBtn = document.getElementById('startGoogleSignin');
    if (startGoogleSigninBtn) startGoogleSigninBtn.disabled = !signinSelected || !accountsFileUploaded;
    
    const startGoogleSignoutBtn = document.getElementById('startGoogleSignout');
    if (startGoogleSignoutBtn) startGoogleSignoutBtn.disabled = !signinSelected;
    
    const vpnSelected = getSelectedDevices('vpnDeviceList').length > 0;
    const vpnInputTextElement = document.getElementById('vpnInputText');
    const vpnInputText = vpnInputTextElement ? vpnInputTextElement.value.trim() : '';
    const startVpnBtn = document.getElementById('startVpnAutomation');
    if (startVpnBtn) startVpnBtn.disabled = !vpnSelected || !vpnInputText;
    
    const installVpnAppBtn = document.getElementById('installVpnApp');
    if (installVpnAppBtn) installVpnAppBtn.disabled = !vpnSelected;
    
    const appSelected = getSelectedDevices('appDeviceList').length > 0;
    const packageNameElement = document.getElementById('packageName');
    const packageName = packageNameElement ? packageNameElement.value.trim() : '';
    const launchAppBtn = document.getElementById('launchApp');
    if (launchAppBtn) launchAppBtn.disabled = !appSelected || !packageName;
    

    
    const customSelected = getSelectedDevices('customDeviceList').length > 0;
    const customCommandElement = document.getElementById('customCommand');
    const customCommand = customCommandElement ? customCommandElement.value.trim() : '';
    const executeCustomBtn = document.getElementById('executeCustomCommand');
    if (executeCustomBtn) executeCustomBtn.disabled = !customSelected || !customCommand;
}

function getSelectedDevices(listId) {
    const list = document.getElementById(listId);
    const checkboxes = list.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// Script functions

// Video Table Management Functions
function initializeVideoTable() {
    const addVideoBtn = document.getElementById('addVideoRow');
    const selectAllBtn = document.getElementById('selectAllVideos');
    const deselectAllBtn = document.getElementById('deselectAllVideos');
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    
    if (addVideoBtn) {
        addVideoBtn.addEventListener('click', addVideoRow);
    }
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => selectAllVideos(true));
    }
    
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => selectAllVideos(false));
    }
    
    if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
            selectAllVideos(this.checked);
        });
    }
    
    // Initialize existing row
    setupVideoRowEvents(document.querySelector('.video-row'));
}

function addVideoRow() {
    const tbody = document.getElementById('videoTableBody');
    const newRow = document.createElement('tr');
    newRow.className = 'video-row';
    newRow.innerHTML = `
        <td>
            <input type="checkbox" class="video-select">
        </td>
        <td class="video-category">-</td>
        <td>
            <input type="url" class="video-url-input" placeholder="Paste YouTube URL here...">
        </td>
        <td class="duration-display">-</td>
        <td>
            <input type="number" class="play-duration-input" min="1" placeholder="Auto">
        </td>
        <td>
            <button type="button" class="btn-icon remove-video" title="Remove">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    tbody.appendChild(newRow);
    setupVideoRowEvents(newRow);
    
    // Focus on the new URL input
    const urlInput = newRow.querySelector('.video-url-input');
    urlInput.focus();
    
    return newRow;
}

function setupVideoRowEvents(row) {
    if (!row) return;
    
    const urlInput = row.querySelector('.video-url-input');
    const removeBtn = row.querySelector('.remove-video');
    const checkbox = row.querySelector('.video-select');
    
    if (urlInput) {
        urlInput.addEventListener('input', debounce(function() {
            if (this.value.trim() && isValidYouTubeUrl(this.value.trim())) {
                fetchSingleVideoDuration(this.value.trim(), row);
            } else {
                const durationDisplay = row.querySelector('.duration-display');
                durationDisplay.textContent = '-';
                row.classList.remove('loading', 'error');
            }
            saveYouTubeDataToLocalStorage();
        }, 500));
        
        urlInput.addEventListener('paste', function(e) {
            e.preventDefault(); // Prevent default paste behavior
            
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedText = clipboardData.getData('text').trim();
            const urls = pastedText.split('\n').map(url => url.trim()).filter(url => url);
            
            if (urls.length > 1) {
                // Multiple URLs detected - create new rows for each
                this.value = urls[0]; // Set first URL in current row
                
                // Create new rows for remaining URLs
                for (let i = 1; i < urls.length; i++) {
                    const newRow = addVideoRow();
                    const newUrlInput = newRow.querySelector('.video-url-input');
                    if (newUrlInput) {
                        newUrlInput.value = urls[i];
                        if (isValidYouTubeUrl(urls[i])) {
                            fetchSingleVideoDuration(urls[i], newRow);
                        }
                    }
                }
                
                // Fetch duration for first URL in current row
                if (urls[0] && isValidYouTubeUrl(urls[0])) {
                    fetchSingleVideoDuration(urls[0], row);
                }
            } else if (pastedText) {
                // Single URL - set it normally
                this.value = pastedText;
                if (isValidYouTubeUrl(pastedText)) {
                    fetchSingleVideoDuration(pastedText, row);
                }
            }
        });
    }
    
    if (removeBtn) {
        removeBtn.addEventListener('click', function() {
            const tbody = document.getElementById('videoTableBody');
            if (tbody.children.length > 1) {
                row.remove();
                updateSelectAllCheckbox();
            } else {
                showToast('At least one video row is required', 'warning');
            }
        });
    }
    
    if (checkbox) {
        checkbox.addEventListener('change', updateSelectAllCheckbox);
    }
    
    // Add event listener for play duration input
    const playDurationInput = row.querySelector('.play-duration-input');
    if (playDurationInput) {
        playDurationInput.addEventListener('input', saveYouTubeDataToLocalStorage);
    }
}

function isValidYouTubeUrl(url) {
    const youtubeRegex = /^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
}

async function fetchSingleVideoDuration(url, row) {
    const durationDisplay = row.querySelector('.duration-display');
    
    row.classList.add('loading');
    row.classList.remove('error');
    durationDisplay.textContent = 'Loading...';
    
    try {
        const response = await fetch('/api/scripts/youtube/get-durations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videos: [url] })
        });
        
        const result = await response.json();
        
        if (response.ok && result.durations && result.durations.length > 0) {
            const duration = result.durations[0];
            durationDisplay.textContent = duration.duration || 'Unknown';
            row.classList.remove('loading', 'error');
        } else {
            throw new Error(result.error || 'Failed to fetch duration');
        }
    } catch (error) {
        durationDisplay.textContent = 'Error';
        row.classList.remove('loading');
        row.classList.add('error');
        console.error('Error fetching video duration:', error);
    }
}

function selectAllVideos(select) {
    const checkboxes = document.querySelectorAll('.video-select');
    checkboxes.forEach(checkbox => {
        checkbox.checked = select;
    });
    updateSelectAllCheckbox();
}

function updateSelectAllCheckbox() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    const videoCheckboxes = document.querySelectorAll('.video-select');
    const checkedBoxes = document.querySelectorAll('.video-select:checked');
    
    if (checkedBoxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedBoxes.length === videoCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

function getSelectedVideoData() {
    const selectedRows = document.querySelectorAll('.video-select:checked');
    const videoData = [];
    
    selectedRows.forEach(checkbox => {
        const row = checkbox.closest('.video-row');
        const urlInput = row.querySelector('.video-url-input');
        const playDurationInput = row.querySelector('.play-duration-input');
        
        if (urlInput && urlInput.value && urlInput.value.trim()) {
            videoData.push({
                url: urlInput.value.trim(),
                playDuration: playDurationInput && playDurationInput.value ? parseInt(playDurationInput.value) : null
            });
        }
    });
    
    return videoData;
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function fetchChannelVideos() {
    const channelUrlInput = document.getElementById('youtubeChannelUrl');
    const channelUrl = channelUrlInput.value.trim();
    
    if (!channelUrl) {
        showToast('Please enter a YouTube channel URL', 'warning');
        return;
    }
    
    // Get selected content filter
    const contentFilter = document.querySelector('input[name="contentFilter"]:checked').value;
    
    const fetchBtn = document.getElementById('fetchChannelVideos');
    const originalText = fetchBtn.innerHTML;
    
    try {
        // Show loading state
        fetchBtn.disabled = true;
        fetchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching...';
        
        const response = await fetch('/api/scripts/youtube/fetch-channel-videos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                channel_url: channelUrl,
                content_filter: contentFilter
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear existing video table except the first row
            const tbody = document.getElementById('videoTableBody');
            const rows = tbody.querySelectorAll('.video-row');
            
            // Keep the first row, clear others
            for (let i = 1; i < rows.length; i++) {
                rows[i].remove();
            }
            
            // Clear the first row's input
            const firstRowInput = tbody.querySelector('.video-url-input');
            if (firstRowInput) {
                firstRowInput.value = '';
                const firstRowDuration = tbody.querySelector('.duration-display');
                if (firstRowDuration) {
                    firstRowDuration.textContent = '-';
                }
            }
            
            // Add all fetched videos to the table
            data.videos.forEach((video, index) => {
                let row;
                const videoUrl = typeof video === 'string' ? video : video.url;
                const category = typeof video === 'object' ? video.category : 'Video';
                
                if (index === 0) {
                    // Use the first existing row
                    row = tbody.querySelector('.video-row');
                    const urlInput = row.querySelector('.video-url-input');
                    urlInput.value = videoUrl;
                } else {
                    // Create new rows for additional videos
                    row = addVideoRow();
                    const urlInput = row.querySelector('.video-url-input');
                    urlInput.value = videoUrl;
                }
                
                // Add category badge to the row
                const categoryCell = row.querySelector('.video-category');
                if (categoryCell) {
                    categoryCell.textContent = category;
                } else {
                    // Create category cell if it doesn't exist
                    const newCategoryCell = document.createElement('td');
                    newCategoryCell.className = 'video-category';
                    newCategoryCell.textContent = category;
                    newCategoryCell.style.cssText = 'padding: 8px; font-size: 12px; font-weight: bold; color: #666;';
                    row.insertBefore(newCategoryCell, row.children[1]); // Insert after checkbox
                }
                
                // Fetch duration for each video
                if (isValidYouTubeUrl(videoUrl)) {
                    fetchSingleVideoDuration(videoUrl, row);
                }
            });
            
            // Clear the channel URL input
            channelUrlInput.value = '';
            
            showToast(`Successfully fetched ${data.count} videos from the channel`, 'success');
        } else {
            showToast(data.message || 'Failed to fetch channel videos', 'error');
        }
        
    } catch (error) {
        console.error('Error fetching channel videos:', error);
        showToast('Error fetching channel videos. Please try again.', 'error');
    } finally {
        // Restore button state
        fetchBtn.disabled = false;
        fetchBtn.innerHTML = originalText;
    }
}

function displayVideoDurations(durations) {
    const durationsSection = document.getElementById('videoDurations');
    
    let tableHTML = `
        <table class="durations-table">
            <thead>
                <tr>
                    <th>Video URL</th>
                    <th>Actual Duration</th>
                    <th>Play Duration (seconds)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    durations.forEach((item, index) => {
        tableHTML += `
            <tr>
                <td class="video-url-cell">${item.url}</td>
                <td class="duration-cell">${item.formatted_duration}</td>
                <td class="play-duration-cell">
                    <input type="number" 
                           class="play-duration-input" 
                           value="${item.duration}" 
                           min="1" 
                           data-url="${item.url}">
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    durationsSection.innerHTML = tableHTML;
    durationsSection.style.display = 'block';
}

// Legacy function - now handled by getSelectedVideoData()
function getCustomDurations() {
    // This function is kept for compatibility but functionality moved to getSelectedVideoData
    return {};
}

async function startYouTubeAutomation() {
    const selectedDevices = getSelectedDevices('youtubeDeviceList');
    const videoData = getSelectedVideoData();
    const channelUrl = document.getElementById('youtubeChannelUrl').value.trim();
    const options = {};
    
    // Extract videos and custom durations from video table data
    const videos = videoData.map(item => item.url);
    const customDurations = {};
    videoData.forEach(item => {
        if (item.playDuration) {
            customDurations[item.url] = item.playDuration;
        }
    });
    
    if (videos.length === 0 && !channelUrl) {
        showToast('Please add video URLs or enter a channel URL', 'warning');
        return;
    }
    
    if (selectedDevices.length === 0) {
        showToast('Please select at least one device', 'warning');
        return;
    }
    
    // Get content filter if channel URL is provided
    const requestBody = { 
        devices: selectedDevices, 
        videos: videos,
        channel_url: channelUrl,
        options: options,
        custom_durations: customDurations
    };
    
    if (channelUrl) {
        const contentFilter = document.querySelector('input[name="contentFilter"]:checked').value;
        requestBody.content_filter = contentFilter;
    }
    
    try {
        const response = await fetch('/api/scripts/youtube', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentScriptId = result.script_id;
            showProgressModal('YouTube Automation');
            startScriptStatusMonitoring();
            showToast('YouTube automation started', 'success');
            
            // Video controls are always visible
            document.getElementById('startYouTubeAutomation').disabled = true;
        } else {
            showToast(result.error || 'Failed to start YouTube automation', 'error');
        }
    } catch (error) {
        showToast('Failed to start YouTube automation: ' + error.message, 'error');
    }
}

// Video control functions
async function pauseResumeVideo() {
    const selectedDevices = getSelectedDevices('youtubeDeviceList');
    if (selectedDevices.length === 0) {
        showToast('No devices selected', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts/youtube/pause-resume', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices: selectedDevices })
        });
        
        const result = await response.json();
        if (response.ok) {
            showToast('Pause/Resume command sent', 'success');
        } else {
            showToast(result.error || 'Failed to pause/resume video', 'error');
        }
    } catch (error) {
        showToast('Failed to pause/resume video: ' + error.message, 'error');
    }
}

async function skipVideo() {
    const selectedDevices = getSelectedDevices('youtubeDeviceList');
    if (selectedDevices.length === 0) {
        showToast('No devices selected', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts/youtube/skip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices: selectedDevices })
        });
        
        const result = await response.json();
        if (response.ok) {
            showToast('Skip video command sent', 'success');
        } else {
            showToast(result.error || 'Failed to skip video', 'error');
        }
    } catch (error) {
        showToast('Failed to skip video: ' + error.message, 'error');
    }
}

async function likeCurrentVideo() {
    const selectedDevices = getSelectedDevices('youtubeDeviceList');
    if (selectedDevices.length === 0) {
        showToast('No devices selected', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts/youtube/like', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices: selectedDevices })
        });
        
        const result = await response.json();
        if (response.ok) {
            showToast('Like video command sent', 'success');
        } else {
            showToast(result.error || 'Failed to like video', 'error');
        }
    } catch (error) {
        showToast('Failed to like video: ' + error.message, 'error');
    }
}

async function subscribeChannel() {
    const selectedDevices = getSelectedDevices('youtubeDeviceList');
    if (selectedDevices.length === 0) {
        showToast('No devices selected', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts/youtube/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices: selectedDevices })
        });
        
        const result = await response.json();
        if (response.ok) {
            showToast('Subscribe command sent', 'success');
        } else {
            showToast(result.error || 'Failed to subscribe', 'error');
        }
    } catch (error) {
        showToast('Failed to subscribe: ' + error.message, 'error');
    }
}

async function commentVideo() {
    const selectedDevices = getSelectedDevices('youtubeDeviceList');
    if (selectedDevices.length === 0) {
        showToast('No devices selected', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts/youtube/comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices: selectedDevices })
        });
        
        const result = await response.json();
        if (response.ok) {
            showToast('Comment command sent', 'success');
        } else {
            showToast(result.error || 'Failed to comment on video', 'error');
        }
    } catch (error) {
        showToast('Failed to comment on video: ' + error.message, 'error');
    }
}

async function shareVideo() {
    const selectedDevices = getSelectedDevices('youtubeDeviceList');
    if (selectedDevices.length === 0) {
        showToast('No devices selected', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts/youtube/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices: selectedDevices })
        });
        
        const result = await response.json();
        if (response.ok) {
            showToast('Share command sent', 'success');
        } else {
            showToast(result.error || 'Failed to share video', 'error');
        }
    } catch (error) {
        showToast('Failed to share video: ' + error.message, 'error');
    }
}

async function skipSeconds(forward = true) {
    const selectedDevices = getSelectedDevices('youtubeDeviceList');
    const seconds = parseInt(document.getElementById('skipSeconds').value) || 10;
    
    if (selectedDevices.length === 0) {
        showToast('No devices selected', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts/youtube/skip-seconds', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                devices: selectedDevices, 
                seconds: seconds,
                forward: forward
            })
        });
        
        const result = await response.json();
        if (response.ok) {
            const direction = forward ? 'forward' : 'backward';
            showToast(`Skip ${seconds}s ${direction} command sent`, 'success');
        } else {
            showToast(result.error || 'Failed to skip seconds', 'error');
        }
    } catch (error) {
        showToast('Failed to skip seconds: ' + error.message, 'error');
    }
}

// YouTube API key is hardcoded - no user configuration needed



async function openUrl() {
    const selectedDevices = getSelectedDevices('urlDeviceList');
    const url = document.getElementById('defaultBrowserUrl').value.trim();
    
    try {
        const promises = selectedDevices.map(deviceId => 
            fetch(`/api/devices/${deviceId}/url`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url })
            })
        );
        
        const responses = await Promise.all(promises);
        const results = await Promise.all(responses.map(r => r.json()));
        
        const successful = results.filter((r, i) => responses[i].ok).length;
        const failed = results.length - successful;
        
        if (successful > 0) {
            showToast(`URL opened on ${successful} device(s)`, 'success');
        }
        if (failed > 0) {
            showToast(`Failed to open URL on ${failed} device(s)`, 'error');
        }
    } catch (error) {
        showToast('Failed to open URL: ' + error.message, 'error');
    }
}

async function startGoogleSignin() {
    const selectedDevices = getSelectedDevices('signinDeviceList');
    
    try {
        const response = await fetch('/api/scripts/google-signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices: selectedDevices })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentScriptId = result.script_id;
            showProgressModal('Google Sign-in');
            startScriptStatusMonitoring();
            showToast('Google Sign-in started', 'success');
        } else {
            showToast(result.error || 'Failed to start Google Sign-in', 'error');
        }
    } catch (error) {
        showToast('Failed to start Google Sign-in: ' + error.message, 'error');
    }
}

async function startGoogleSignout() {
    const selectedDevices = getSelectedDevices('signinDeviceList');
    
    if (selectedDevices.length === 0) {
        showToast('Please select devices for Google Sign-out', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts/google-signout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices: selectedDevices })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            currentScriptId = result.script_id;
            showProgressModal('Google Sign-out');
            startScriptStatusMonitoring();
            showToast('Google Sign-out started', 'success');
        } else {
            showToast(result.error || 'Failed to start Google Sign-out', 'error');
        }
    } catch (error) {
        showToast('Failed to start Google Sign-out: ' + error.message, 'error');
    }
}

async function startVpnAutomation() {
    const selectedDevices = getSelectedDevices('vpnDeviceList');
    const selectedProxies = getSelectedProxyData();
    
    if (selectedDevices.length === 0) {
        showToast('Please select devices for VPN automation', 'error');
        return;
    }
    
    if (selectedProxies.length === 0) {
        showToast('Please select proxy configurations from the table', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts/vpn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                devices: selectedDevices,
                proxies: selectedProxies
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('VPN automation completed successfully', 'success');
            
            // Show results for each device
            result.results.forEach(deviceResult => {
                const status = deviceResult.success ? 'success' : 'error';
                showToast(`${deviceResult.device}: ${deviceResult.message}`, status);
            });
            
            // Update device VPN status after automation
            setTimeout(() => {
                updateDeviceVpnStatus();
            }, 2000);
        } else {
            showToast(result.error || 'Failed to start VPN automation', 'error');
        }
    } catch (error) {
        showToast('Failed to start VPN automation: ' + error.message, 'error');
    }
}

async function installVpnApp() {
    const selectedDevices = getSelectedDevices('vpnDeviceList');
    
    if (selectedDevices.length === 0) {
        showToast('Please select devices to install VPN app', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/scripts/install-vpn-app', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                devices: selectedDevices
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('VPN app installation completed', 'success');
            
            // Show results for each device
            result.results.forEach(deviceResult => {
                const status = deviceResult.success ? 'success' : 'error';
                showToast(`${deviceResult.device}: ${deviceResult.message}`, status);
            });
        } else {
            showToast(result.error || 'Failed to install VPN app', 'error');
        }
    } catch (error) {
        showToast('Failed to install VPN app: ' + error.message, 'error');
    }
}

async function launchApp() {
    const selectedDevices = getSelectedDevices('appDeviceList');
    const packageName = document.getElementById('packageName').value.trim();
    
    try {
        const promises = selectedDevices.map(deviceId => 
            fetch(`/api/devices/${deviceId}/app`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ package_name: packageName })
            })
        );
        
        const responses = await Promise.all(promises);
        const results = await Promise.all(responses.map(r => r.json()));
        
        const successful = results.filter((r, i) => responses[i].ok).length;
        const failed = results.length - successful;
        
        if (successful > 0) {
            showToast(`App launched on ${successful} device(s)`, 'success');
        }
        if (failed > 0) {
            showToast(`Failed to launch app on ${failed} device(s)`, 'error');
        }
    } catch (error) {
        showToast('Failed to launch app: ' + error.message, 'error');
    }
}



async function executeCustomCommand() {
    const selectedDevices = getSelectedDevices('customDeviceList');
    const command = document.getElementById('customCommand').value.trim();
    const resultsContainer = document.getElementById('commandResults');
    const resultsGrid = document.getElementById('resultsGrid');
    
    resultsContainer.style.display = 'block';
    resultsGrid.innerHTML = '<div class="loading">Executing command...</div>';
    
    try {
        const response = await fetch('/api/scripts/custom-command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ devices: selectedDevices, command: command })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const results = data.results;
            resultsGrid.innerHTML = Object.entries(results).map(([deviceId, result]) => `
                <div class="result-card ${result.success ? 'result-success' : 'result-error'}">
                    <h4>${deviceId}</h4>
                    <p><strong>Status:</strong> ${result.success ? 'Success' : 'Failed'}</p>
                    ${result.output ? `<p><strong>Output:</strong> ${result.output}</p>` : ''}
                    ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
                </div>
            `).join('');
            
            showToast('Command executed', 'success');
        } else {
            resultsGrid.innerHTML = '<p class="error">Failed to execute command</p>';
            showToast(data.error || 'Failed to execute command', 'error');
        }
    } catch (error) {
        resultsGrid.innerHTML = '<p class="error">Failed to execute command</p>';
        showToast('Failed to execute command: ' + error.message, 'error');
    }
}

async function manageWifi(action) {
    const selectedDevices = getSelectedDevices('wifiDeviceList');
    
    if (selectedDevices.length === 0) {
        showToast('Please select devices first', 'warning');
        return;
    }
    
    try {
        const promises = selectedDevices.map(deviceId => 
            fetch(`/api/devices/${deviceId}/wifi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action })
            })
        );
        
        const responses = await Promise.all(promises);
        const results = await Promise.all(responses.map(r => r.json()));
        
        const successful = results.filter((r, i) => responses[i].ok).length;
        const failed = results.length - successful;
        
        if (successful > 0) {
            showToast(`WiFi ${action}d on ${successful} device(s)`, 'success');
        }
        if (failed > 0) {
            showToast(`Failed to ${action} WiFi on ${failed} device(s)`, 'error');
        }
    } catch (error) {
        showToast(`Failed to ${action} WiFi: ` + error.message, 'error');
    }
}

async function checkWifiStatus() {
    const selectedDevices = getSelectedDevices('wifiDeviceList');
    
    if (selectedDevices.length === 0) {
        showToast('Please select devices first', 'warning');
        return;
    }
    
    try {
        const promises = selectedDevices.map(deviceId => 
            fetch(`/api/devices/${deviceId}/info`)
        );
        
        const responses = await Promise.all(promises);
        const results = await Promise.all(responses.map(r => r.json()));
        
        results.forEach((result, i) => {
            if (responses[i].ok) {
                showToast(`${selectedDevices[i]}: ${result.wifi_status || 'Unknown'}`, 'info');
            }
        });
    } catch (error) {
        showToast('Failed to check WiFi status: ' + error.message, 'error');
    }
}

// Device actions
async function takeScreenshot(deviceId) {
    try {
        const response = await fetch(`/api/devices/${deviceId}/screenshot`);
        const result = await response.json();
        
        if (response.ok) {
            showScreenshotModal(result.screenshot, deviceId);
        } else {
            showToast(result.error || 'Failed to take screenshot', 'error');
        }
    } catch (error) {
        showToast('Failed to take screenshot: ' + error.message, 'error');
    }
}





async function takeAllScreenshots() {
    if (devices.length === 0) {
        showToast('No devices available', 'warning');
        return;
    }
    
    showToast('Taking screenshots...', 'info');
    
    for (const device of devices) {
        try {
            await takeScreenshot(device.id);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between screenshots
        } catch (error) {
            console.error(`Failed to take screenshot for ${device.id}:`, error);
        }
    }
}



// Progress monitoring
function startScriptStatusMonitoring() {
    if (scriptStatusInterval) {
        clearInterval(scriptStatusInterval);
    }
    
    scriptStatusInterval = setInterval(async () => {
        if (!currentScriptId) return;
        
        try {
            const response = await fetch(`/api/scripts/status/${currentScriptId}`);
            const status = await response.json();
            
            if (response.ok) {
                updateProgressModal(status);
                
                if (status.status === 'completed' || status.status === 'error' || status.status === 'stopped') {
                    clearInterval(scriptStatusInterval);
                    scriptStatusInterval = null;
                    
                    // Re-enable start button
                    document.getElementById('startYouTubeAutomation').disabled = false;
                    
                    setTimeout(() => {
                        closeProgressModal();
                        updateDashboard();
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Failed to get script status:', error);
        }
    }, 1000);
}

async function stopCurrentScript() {
    if (!currentScriptId) return;
    
    try {
        const response = await fetch(`/api/scripts/stop/${currentScriptId}`, {
            method: 'POST'
        });
        
        if (response.ok) {
            showToast('Script stopped', 'info');
        }
    } catch (error) {
        showToast('Failed to stop script: ' + error.message, 'error');
    }
}

// Modal functions
function showProgressModal(title) {
    document.getElementById('progressTitle').textContent = title;
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = 'Initializing...';
    document.getElementById('progressModal').classList.add('active');
}

function updateProgressModal(status) {
    document.getElementById('progressFill').style.width = status.progress + '%';
    document.getElementById('progressText').textContent = status.message;
}

function closeProgressModal() {
    document.getElementById('progressModal').classList.remove('active');
    currentScriptId = null;
    if (scriptStatusInterval) {
        clearInterval(scriptStatusInterval);
        scriptStatusInterval = null;
    }
}

function showScreenshotModal(screenshot, deviceId) {
    document.getElementById('screenshotTitle').textContent = `Screenshot - ${deviceId}`;
    document.getElementById('screenshotImage').src = screenshot;
    document.getElementById('screenshotModal').classList.add('active');
}

function closeScreenshotModal() {
    document.getElementById('screenshotModal').classList.remove('active');
}

// Toast notifications
function showToast(message, type = 'info') {
    // Input validation
    if (!message || typeof message !== 'string') {
        console.warn('showToast: Invalid message provided');
        return;
    }
    
    // Sanitize message to prevent XSS
    const sanitizedMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    try {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${getToastIcon(type)}"></i>
            <span>${sanitizedMessage}</span>
            <button class="toast-close" title="Close">&times;</button>
        `;
        
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.error('showToast: Toast container not found');
            return;
        }
        
        container.appendChild(toast);
        
        // Determine auto-remove timeout based on type and message length
        let timeout = 5000; // Default 5 seconds
        if (type === 'error') {
            timeout = Math.max(8000, Math.min(15000, sanitizedMessage.length * 100)); // 8-15 seconds for errors
        } else if (type === 'warning') {
            timeout = 7000; // 7 seconds for warnings
        } else if (sanitizedMessage.length > 100) {
            timeout = 7000; // Longer messages get more time
        }
        
        // Auto remove after calculated timeout
        const autoRemoveTimer = setTimeout(() => {
            removeToast(toast);
        }, timeout);
        
        // Manual close with timer cleanup
        const closeButton = toast.querySelector('.toast-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                clearTimeout(autoRemoveTimer);
                removeToast(toast);
            });
        }
        
        // Add fade-in animation
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            toast.style.transition = 'all 0.3s ease-in-out';
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);
        
    } catch (error) {
        console.error('showToast: Error creating toast:', error);
        // Fallback to alert for critical errors
        if (type === 'error') {
            alert('Error: ' + sanitizedMessage);
        }
    }
}

function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    
    try {
        // Add fade-out animation
        toast.style.transition = 'all 0.3s ease-in-out';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    } catch (error) {
        console.error('removeToast: Error removing toast:', error);
        // Force removal if animation fails
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Dashboard updates
function updateDashboard() {
    // Update device count
    updateDeviceCount();
    
    // Update other dashboard stats
    const runningScriptsElement = document.getElementById('runningScripts');
    if (runningScriptsElement) {
        runningScriptsElement.textContent = currentScriptId ? '1' : '0';
    }
    
    // Update completed tasks (placeholder)
    const completedTasksElement = document.getElementById('completedTasks');
    if (completedTasksElement) {
        completedTasksElement.textContent = '0';
    }
    
    // Update failed tasks (placeholder)
    const failedTasksElement = document.getElementById('failedTasks');
    if (failedTasksElement) {
        failedTasksElement.textContent = '0';
    }
    
    // Add activity log entry
    const activityList = document.getElementById('activityList');
    if (activityList && devices.length > 0 && activityList.querySelector('.no-activity')) {
        activityList.innerHTML = `
            <div class="activity-item">
                <p>Devices refreshed - ${new Date().toLocaleTimeString()}</p>
            </div>
        `;
    }
}

// Input event listeners for real-time validation
document.addEventListener('DOMContentLoaded', function() {
    // Add input event listeners
    const youtubeChannelUrlInput = document.getElementById('youtubeChannelUrl');
    if (youtubeChannelUrlInput) {
        youtubeChannelUrlInput.addEventListener('input', updateButtonStates);
        youtubeChannelUrlInput.addEventListener('input', saveYouTubeDataToLocalStorage);
    }

    document.getElementById('defaultBrowserUrl').addEventListener('input', updateButtonStates);
    document.getElementById('packageName').addEventListener('input', updateButtonStates);
    document.getElementById('customCommand').addEventListener('input', updateButtonStates);
    
    // Load saved data from localStorage
    loadYouTubeDataFromLocalStorage();
});


// Script Import/Export and Local Storage Functions
const STORAGE_KEY = 'adb_device_manager_scripts';

function saveScriptToLocalStorage(scriptName, scriptData) {
    try {
        const savedScripts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        savedScripts[scriptName] = {
            ...scriptData,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedScripts));
        showToast('Script saved successfully', 'success');
        updateScriptsList();
    } catch (error) {
        showToast('Failed to save script: ' + error.message, 'error');
    }
}

function loadScriptFromLocalStorage(scriptName) {
    try {
        const savedScripts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (savedScripts[scriptName]) {
            return savedScripts[scriptName];
        }
        return null;
    } catch (error) {
        showToast('Failed to load script: ' + error.message, 'error');
        return null;
    }
}

function deleteScriptFromLocalStorage(scriptName) {
    try {
        const savedScripts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        delete savedScripts[scriptName];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedScripts));
        showToast('Script deleted successfully', 'success');
        updateScriptsList();
    } catch (error) {
        showToast('Failed to delete script: ' + error.message, 'error');
    }
}

function getAllSavedScripts() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
        return {};
    }
}

function exportScript(scriptName, scriptData) {
    try {
        const exportData = {
            name: scriptName,
            data: scriptData,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${scriptName.replace(/[^a-z0-9]/gi, '_')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Script exported successfully', 'success');
    } catch (error) {
        showToast('Failed to export script: ' + error.message, 'error');
    }
}

function importScript(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importData = JSON.parse(e.target.result);
                if (importData.name && importData.data) {
                    resolve(importData);
                } else {
                    reject(new Error('Invalid script file format'));
                }
            } catch (error) {
                reject(new Error('Failed to parse script file: ' + error.message));
            }
        };
        reader.onerror = function() {
            reject(new Error('Failed to read file'));
        };
        reader.readAsText(file);
    });
}

function getCurrentScriptData(section) {
    const data = { section };
    
    switch (section) {
        case 'youtube':
            data.videos = document.getElementById('youtubeVideos').value.split('\n').filter(v => v.trim());
            data.channelUrl = document.getElementById('youtubeChannelUrl').value.trim();
            data.options = {};
            break;
            

            
        case 'url-opener':
            data.url = document.getElementById('defaultBrowserUrl').value;
            break;
            
        case 'app-launcher':
            data.packageName = document.getElementById('packageName').value;
            break;
            
        case 'custom-scripts':
            data.command = document.getElementById('customCommand').value;
            break;
            
        default:
            break;
    }
    
    return data;
}

function loadScriptData(scriptData) {
    const section = scriptData.section;
    
    // Switch to the appropriate section
    showSection(section);
    menuItems.forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === section) {
            item.classList.add('active');
            pageTitle.textContent = item.textContent.trim();
        }
    });
    
    // Load data based on section
    switch (section) {
        case 'youtube':
            document.getElementById('youtubeVideos').value = scriptData.videos ? scriptData.videos.join('\n') : '';
            if (scriptData.options) {
                document.getElementById('sequentialPlayback').checked = scriptData.options.sequential || false;
            }
            break;
            

            
        case 'url-opener':
            document.getElementById('defaultBrowserUrl').value = scriptData.url || '';
            break;
            
        case 'app-launcher':
            document.getElementById('packageName').value = scriptData.packageName || '';
            break;
            
        case 'custom-scripts':
            document.getElementById('customCommand').value = scriptData.command || '';
            break;
            
        default:
            break;
    }
    
    updateButtonStates();
    showToast('Script loaded successfully', 'success');
}

function createScriptManagementUI() {
    // Create script management modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'scriptManagementModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Script Management</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="script-actions">
                    <div class="action-group">
                        <h4>Save Current Script</h4>
                        <div class="input-group">
                            <input type="text" id="scriptNameInput" placeholder="Enter script name">
                            <button class="btn btn-primary" id="saveScriptBtn">Save</button>
                        </div>
                    </div>
                    
                    <div class="action-group">
                        <h4>Import Script</h4>
                        <div class="input-group">
                            <input type="file" id="importScriptFile" accept=".json" style="display: none;">
                            <button class="btn btn-secondary" id="importScriptBtn">Import from File</button>
                        </div>
                    </div>
                    
                    <div class="action-group">
                        <h4>Saved Scripts</h4>
                        <div id="savedScriptsList" class="scripts-list">
                            <!-- Saved scripts will be populated here -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    document.getElementById('saveScriptBtn').addEventListener('click', () => {
        const scriptName = document.getElementById('scriptNameInput').value.trim();
        if (!scriptName) {
            showToast('Please enter a script name', 'warning');
            return;
        }
        
        const currentSection = document.querySelector('.content-section.active').id;
        const scriptData = getCurrentScriptData(currentSection);
        saveScriptToLocalStorage(scriptName, scriptData);
        document.getElementById('scriptNameInput').value = '';
    });
    
    document.getElementById('importScriptBtn').addEventListener('click', () => {
        document.getElementById('importScriptFile').click();
    });
    
    document.getElementById('importScriptFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const importData = await importScript(file);
                saveScriptToLocalStorage(importData.name, importData.data);
                e.target.value = ''; // Reset file input
            } catch (error) {
                showToast(error.message, 'error');
            }
        }
    });
    
    return modal;
}

function updateScriptsList() {
    const scriptsList = document.getElementById('savedScriptsList');
    if (!scriptsList) return;
    
    const savedScripts = getAllSavedScripts();
    const scriptNames = Object.keys(savedScripts);
    
    if (scriptNames.length === 0) {
        scriptsList.innerHTML = '<p class="no-scripts">No saved scripts</p>';
        return;
    }
    
    scriptsList.innerHTML = scriptNames.map(name => {
        const script = savedScripts[name];
        return `
            <div class="script-item">
                <div class="script-info">
                    <h5>${name}</h5>
                    <p>Section: ${script.section} | Saved: ${new Date(script.savedAt).toLocaleDateString()}</p>
                </div>
                <div class="script-actions">
                    <button class="btn btn-sm btn-primary" onclick="loadScript('${name}')">Load</button>
                    <button class="btn btn-sm btn-secondary" onclick="exportScriptByName('${name}')">Export</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteScript('${name}')">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

function loadScript(scriptName) {
    const scriptData = loadScriptFromLocalStorage(scriptName);
    if (scriptData) {
        loadScriptData(scriptData);
        document.getElementById('scriptManagementModal').style.display = 'none';
    }
}

function exportScriptByName(scriptName) {
    const scriptData = loadScriptFromLocalStorage(scriptName);
    if (scriptData) {
        exportScript(scriptName, scriptData);
    }
}

function deleteScript(scriptName) {
    if (confirm(`Are you sure you want to delete the script "${scriptName}"?`)) {
        deleteScriptFromLocalStorage(scriptName);
    }
}

// Auto-save functionality
function enableAutoSave() {
    const inputs = [
        'youtubeVideos', 'defaultBrowserUrl', 
        'packageName', 'customCommand'
    ];
    
    const checkboxes = [
        'sequentialPlayback'
    ];
    
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', () => {
                const currentSection = document.querySelector('.content-section.active').id;
                const scriptData = getCurrentScriptData(currentSection);
                localStorage.setItem('adb_autosave_' + currentSection, JSON.stringify(scriptData));
            });
        }
    });
    
    checkboxes.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                const currentSection = document.querySelector('.content-section.active').id;
                const scriptData = getCurrentScriptData(currentSection);
                localStorage.setItem('adb_autosave_' + currentSection, JSON.stringify(scriptData));
            });
        }
    });
}

function loadAutoSavedData() {
    const sections = ['youtube', 'url-opener', 'app-launcher', 'custom-scripts'];
    
    sections.forEach(section => {
        const autoSavedData = localStorage.getItem('adb_autosave_' + section);
        if (autoSavedData) {
            try {
                const scriptData = JSON.parse(autoSavedData);
                // Store for later use when section is activated
                window.autoSavedScripts = window.autoSavedScripts || {};
                window.autoSavedScripts[section] = scriptData;
            } catch (error) {
                console.error('Failed to parse auto-saved data for section:', section);
            }
        }
    });
}

// Initialize script management
document.addEventListener('DOMContentLoaded', function() {
    // Create script management UI
    const scriptModal = createScriptManagementUI();
    
    // Add script management button to each section
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        if (section.id !== 'dashboard' && section.id !== 'devices') {
            const header = section.querySelector('.section-header');
            if (header) {
                const scriptBtn = document.createElement('button');
                scriptBtn.className = 'btn btn-outline btn-sm script-management-btn';
                scriptBtn.innerHTML = '<i class="fas fa-cog"></i> Manage Scripts';
                scriptBtn.addEventListener('click', () => {
                    updateScriptsList();
                    scriptModal.style.display = 'block';
                });
                header.appendChild(scriptBtn);
            }
        }
    });
    
    // Enable auto-save
    enableAutoSave();
    
    // Load auto-saved data
    loadAutoSavedData();
    
    // Load auto-saved data when switching sections
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            setTimeout(() => {
                const section = item.dataset.section;
                if (window.autoSavedScripts && window.autoSavedScripts[section]) {
                    loadScriptData(window.autoSavedScripts[section]);
                }
            }, 100);
        });
    });
});


// Device naming functions
async function editDeviceName(deviceId) {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;
    
    const currentName = device.name || device.id;
    const newName = prompt(`Enter new name for device:`, currentName);
    
    if (newName && newName.trim() && newName.trim() !== currentName) {
        try {
            const response = await fetch(`/api/devices/${deviceId}/name`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Update device name in local array
                device.name = result.name;
                
                // Update all displays
                updateDevicesGrid();
                updateDeviceSelectionLists();
                
                showToast('Device name updated successfully', 'success');
            } else {
                showToast(result.error || 'Failed to update device name', 'error');
            }
        } catch (error) {
            showToast('Failed to update device name: ' + error.message, 'error');
        }
    }
}












// Live View functionality
let liveStreams = {};
let currentLiveDevice = null;
let isRecording = false;

// Initialize live view when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Live view controls
    const startAllStreamsBtn = document.getElementById('startAllLiveStreams');
    const stopAllStreamsBtn = document.getElementById('stopAllLiveStreams');
    const refreshLiveViewBtn = document.getElementById('refreshLiveView');
    
    if (startAllStreamsBtn) {
        startAllStreamsBtn.addEventListener('click', startAllLiveStreams);
    }
    if (stopAllStreamsBtn) {
        stopAllStreamsBtn.addEventListener('click', stopAllLiveStreams);
    }
    if (refreshLiveViewBtn) {
        refreshLiveViewBtn.addEventListener('click', refreshLiveView);
    }
    
    // Live view modal controls
    const closeLiveViewModal = document.getElementById('closeLiveViewModal');
    const liveViewScreenshot = document.getElementById('liveViewScreenshot');
    const liveViewRecord = document.getElementById('liveViewRecord');
    const sendTextBtn = document.getElementById('sendText');
    const liveScreenOverlay = document.getElementById('liveScreenOverlay');
    
    if (closeLiveViewModal) {
        closeLiveViewModal.addEventListener('click', closeLiveViewModalHandler);
    }
    if (liveViewScreenshot) {
        liveViewScreenshot.addEventListener('click', takeLiveScreenshot);
    }
    if (liveViewRecord) {
        liveViewRecord.addEventListener('click', toggleRecording);
    }
    if (sendTextBtn) {
        sendTextBtn.addEventListener('click', sendTextToDevice);
    }
    if (liveScreenOverlay) {
        liveScreenOverlay.addEventListener('click', handleScreenTap);
    }
    
    // Control buttons
    document.querySelectorAll('.control-btn').forEach(btn => {
        btn.addEventListener('click', handleControlAction);
    });
    
    // Text input enter key
    const textInput = document.getElementById('textInput');
    if (textInput) {
        textInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendTextToDevice();
            }
        });
    }
});

function refreshLiveView() {
    updateLiveViewGrid();
}

function updateLiveViewGrid() {
    const grid = document.getElementById('liveViewGrid');
    if (!grid) return;
    
    if (devices.length === 0) {
        grid.innerHTML = '<div class="loading">No devices available for live view</div>';
        return;
    }
    
    grid.innerHTML = devices.map(device => `
        <div class="live-device-card" data-device-id="${device.id}" onclick="openLiveViewModal('${device.id}')">
            <div class="live-device-header">
                <div class="live-device-name">${device.name || device.id}</div>
                <div class="live-device-status">
                    <div class="status-indicator ${device.status === 'device' ? '' : 'disconnected'}"></div>
                    ${device.status === 'device' ? 'Connected' : 'Disconnected'}
                </div>
            </div>
            <div class="live-screen-preview" id="preview-${device.id}">
                <div class="live-screen-loading">
                    <i class="fas fa-mobile-alt"></i>
                    <span>Click to start live view</span>
                </div>
            </div>
            <div class="live-device-controls">
                <button class="live-control-btn" onclick="event.stopPropagation(); startLiveStream('${device.id}')" title="Start Live Stream">
                    <i class="fas fa-play"></i>
                </button>
                <button class="live-control-btn" onclick="event.stopPropagation(); stopLiveStream('${device.id}')" title="Stop Live Stream">
                    <i class="fas fa-stop"></i>
                </button>
                <button class="live-control-btn" onclick="event.stopPropagation(); takeScreenshot('${device.id}')" title="Screenshot">
                    <i class="fas fa-camera"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function updateLivePreview(deviceId, imageData) {
    const preview = document.getElementById(`preview-${deviceId}`);
    if (preview) {
        preview.innerHTML = `<img src="${imageData}" alt="Live Preview" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    }
    
    // Update modal if this device is currently being viewed
    if (currentLiveDevice === deviceId) {
        const liveScreenImage = document.getElementById("liveScreenImage");
        const connectionStatus = document.getElementById("connectionStatus");
        
        if (liveScreenImage) {
            liveScreenImage.src = imageData;
        }
        if (connectionStatus) {
            connectionStatus.classList.add("hidden");
        }
    }
}

async function startLiveStream(deviceId) {
    try {
        if (liveStreams[deviceId]) {
            showToast("Live stream already active for this device", "warning");
            return;
        }
        
        const preview = document.getElementById(`preview-${deviceId}`);
        if (preview) {
            preview.innerHTML = `
                <div class="live-screen-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Starting live stream...</span>
                </div>
            `;
        }
        
        // Create EventSource for live stream
        const eventSource = new EventSource(`/api/devices/${deviceId}/live-stream`);
        
        eventSource.onopen = function(event) {
            console.log("Live stream connection opened:", event);
            showToast(`Live stream connected for ${deviceId}`, "success");
            const connectionStatus = document.getElementById("connectionStatus");
            if (connectionStatus && currentLiveDevice === deviceId) {
                connectionStatus.classList.add("hidden");
            }
        };

        eventSource.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === "screenshot") {
                    updateLivePreview(deviceId, data.data);
                } else if (data.type === "error") {
                    console.error("Live stream error:", data.error);
                    stopLiveStream(deviceId);
                    showToast(`Live stream error for ${deviceId}: ${data.error}`, "error");
                } else if (data.type === "connected") {
                    console.log("Live stream connected message:", data.message);
                } else if (data.type === "disconnected") {
                    console.log("Live stream disconnected message:", data.message);
                    stopLiveStream(deviceId);
                    showToast(`Live stream disconnected for ${deviceId}: ${data.message}`, "info");
                }
            } catch (e) {
                console.error("Error parsing live stream data:", e);
            }
        };
        
        eventSource.onerror = function(event) {
            console.error("Live stream connection error:", event);
            stopLiveStream(deviceId);
            showToast(`Live stream connection lost for ${deviceId}`, "error");
            const connectionStatus = document.getElementById("connectionStatus");
            if (connectionStatus && currentLiveDevice === deviceId) {
                connectionStatus.classList.remove("hidden");
                connectionStatus.innerHTML = 
                    `<i class="fas fa-exclamation-triangle"></i> Connection Lost`;
            }
        };
        
        liveStreams[deviceId] = eventSource;
        
    } catch (error) {
        console.error("Error starting live stream:", error);
        showToast("Failed to start live stream: " + error.message, "error");
    }
}

async function stopLiveStream(deviceId) {
    try {
        if (liveStreams[deviceId]) {
            liveStreams[deviceId].close();
            delete liveStreams[deviceId];
            
            // Stop backend stream
            await fetch(`/api/devices/${deviceId}/live-stream`, {
                method: 'DELETE'
            });
            
            const preview = document.getElementById(`preview-${deviceId}`);
            if (preview) {
                preview.innerHTML = `
                    <div class="live-screen-loading">
                        <i class="fas fa-mobile-alt"></i>
                        <span>Click to start live view</span>
                    </div>
                `;
            }
            
            showToast('Live stream stopped', 'info');
        }
    } catch (error) {
        console.error('Error stopping live stream:', error);
        showToast('Failed to stop live stream: ' + error.message, 'error');
    }
}

function updateLivePreview(deviceId, imageData) {
    const preview = document.getElementById(`preview-${deviceId}`);
    if (preview) {
        preview.innerHTML = `<img src="${imageData}" alt="Live Preview" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    }
    
    // Update modal if this device is currently being viewed
    if (currentLiveDevice === deviceId) {
        const liveScreenImage = document.getElementById('liveScreenImage');
        const connectionStatus = document.getElementById('connectionStatus');
        
        if (liveScreenImage) {
            liveScreenImage.src = imageData;
        }
        if (connectionStatus) {
            connectionStatus.classList.add('hidden');
        }
    }
}

async function startAllLiveStreams() {
    for (const device of devices) {
        if (device.status === 'device') {
            await startLiveStream(device.id);
            // Small delay between starting streams
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

async function stopAllLiveStreams() {
    for (const deviceId of Object.keys(liveStreams)) {
        await stopLiveStream(deviceId);
    }
}

function openLiveViewModal(deviceId) {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;
    
    currentLiveDevice = deviceId;
    
    const modal = document.getElementById('liveViewModal');
    const modalTitle = document.getElementById('liveViewModalTitle');
    const liveScreenImage = document.getElementById('liveScreenImage');
    const connectionStatus = document.getElementById('connectionStatus');
    
    if (modalTitle) {
        modalTitle.textContent = `${device.name || device.id} - Live View`;
    }
    
    if (liveScreenImage) {
        liveScreenImage.src = '';
    }
    
    if (connectionStatus) {
        connectionStatus.classList.remove('hidden');
        connectionStatus.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
    }
    
    modal.style.display = 'block';
    
    // Start live stream for this device if not already started
    if (!liveStreams[deviceId]) {
        startLiveStream(deviceId);
    }
}

function closeLiveViewModalHandler() {
    const modal = document.getElementById('liveViewModal');
    modal.style.display = 'none';
    currentLiveDevice = null;
    
    // Stop recording if active
    if (isRecording) {
        toggleRecording();
    }
}

async function takeLiveScreenshot() {
    if (!currentLiveDevice) return;
    
    try {
        const response = await fetch(`/api/devices/${currentLiveDevice}/screenshot`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Screenshot taken successfully', 'success');
            // The screenshot will be automatically updated via live stream
        } else {
            showToast(result.error || 'Failed to take screenshot', 'error');
        }
    } catch (error) {
        showToast('Failed to take screenshot: ' + error.message, 'error');
    }
}

async function toggleRecording() {
    if (!currentLiveDevice) return;
    
    const recordBtn = document.getElementById('liveViewRecord');
    const liveScreenWrapper = document.querySelector('.live-screen-wrapper');
    
    try {
        if (!isRecording) {
            // Start recording
            const response = await fetch(`/api/devices/${currentLiveDevice}/record/start`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                isRecording = true;
                recordBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
                recordBtn.classList.add('btn-danger');
                recordBtn.classList.remove('btn-secondary');
                
                // Add recording indicator
                const indicator = document.createElement('div');
                indicator.className = 'recording-indicator';
                indicator.innerHTML = '<i class="fas fa-circle"></i> Recording';
                liveScreenWrapper.appendChild(indicator);
                
                showToast('Recording started', 'success');
            } else {
                showToast(result.error || 'Failed to start recording', 'error');
            }
        } else {
            // Stop recording
            const response = await fetch(`/api/devices/${currentLiveDevice}/record/stop`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (response.ok) {
                isRecording = false;
                recordBtn.innerHTML = '<i class="fas fa-video"></i> Record';
                recordBtn.classList.remove('btn-danger');
                recordBtn.classList.add('btn-secondary');
                
                // Remove recording indicator
                const indicator = liveScreenWrapper.querySelector('.recording-indicator');
                if (indicator) {
                    indicator.remove();
                }
                
                showToast(`Recording saved (${result.duration}s)`, 'success');
            } else {
                showToast(result.error || 'Failed to stop recording', 'error');
            }
        }
    } catch (error) {
        showToast('Recording error: ' + error.message, 'error');
    }
}

async function handleControlAction(event) {
    if (!currentLiveDevice) return;
    
    const action = event.currentTarget.getAttribute('data-action');
    let endpoint = '';
    let method = 'POST';
    let body = null;
    
    switch (action) {
        case 'home':
            endpoint = `/api/devices/${currentLiveDevice}/control/home`;
            break;
        case 'back':
            endpoint = `/api/devices/${currentLiveDevice}/control/back`;
            break;
        case 'menu':
            endpoint = `/api/devices/${currentLiveDevice}/control/menu`;
            break;
        case 'recent':
            endpoint = `/api/devices/${currentLiveDevice}/control/recent-apps`;
            break;
        case 'power':
            endpoint = `/api/devices/${currentLiveDevice}/control/power`;
            break;
        case 'volume-up':
            endpoint = `/api/devices/${currentLiveDevice}/control/volume-up`;
            break;
        case 'volume-down':
            endpoint = `/api/devices/${currentLiveDevice}/control/volume-down`;
            break;
        default:
            return;
    }
    
    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: body
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message, 'success');
            
            // Visual feedback
            event.currentTarget.style.transform = 'scale(0.95)';
            setTimeout(() => {
                event.currentTarget.style.transform = '';
            }, 150);
        } else {
            showToast(result.error || 'Control action failed', 'error');
        }
    } catch (error) {
        showToast('Control action error: ' + error.message, 'error');
    }
}

async function sendTextToDevice() {
    if (!currentLiveDevice) return;
    
    const textInput = document.getElementById('textInput');
    const text = textInput.value.trim();
    
    if (!text) {
        showToast('Please enter text to send', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`/api/devices/${currentLiveDevice}/control/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast('Text sent successfully', 'success');
            textInput.value = '';
        } else {
            showToast(result.error || 'Failed to send text', 'error');
        }
    } catch (error) {
        showToast('Text send error: ' + error.message, 'error');
    }
}

async function handleScreenTap(event) {
    if (!currentLiveDevice) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const img = document.getElementById('liveScreenImage');
    
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    
    // Calculate relative coordinates
    const x = ((event.clientX - rect.left) / rect.width) * img.naturalWidth;
    const y = ((event.clientY - rect.top) / rect.height) * img.naturalHeight;
    
    // Create tap effect
    const tapEffect = document.createElement('div');
    tapEffect.className = 'tap-effect';
    tapEffect.style.left = (event.clientX - rect.left - 20) + 'px';
    tapEffect.style.top = (event.clientY - rect.top - 20) + 'px';
    event.currentTarget.appendChild(tapEffect);
    
    // Remove tap effect after animation
    setTimeout(() => {
        tapEffect.remove();
    }, 600);
    
    try {
        const response = await fetch(`/api/devices/${currentLiveDevice}/control/tap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: Math.round(x), y: Math.round(y) })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // Don't show toast for taps to avoid spam
            console.log('Tap successful:', result.message);
        } else {
            showToast(result.error || 'Tap failed', 'error');
        }
    } catch (error) {
        showToast('Tap error: ' + error.message, 'error');
    }
}

// Update the showSection function to handle live view
const originalShowSection = showSection;
showSection = function(sectionId) {
    originalShowSection(sectionId);
    
    if (sectionId === 'live-view') {
        updateLiveViewGrid();
    }
};

// Cleanup live streams when page unloads
window.addEventListener('beforeunload', function() {
    Object.keys(liveStreams).forEach(deviceId => {
        stopLiveStream(deviceId);
    });
});

