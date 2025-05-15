// Global variables
let currentDirectoryHandle = null;
let breadcrumbPath = [];
let fileItems = [];
let selectedFileIndex = -1;
let settings = {
    defaultViewHTML: 'preview',
    defaultViewMD: 'preview',
    defaultViewCSV: 'table',
    syntaxHighlight: true,
    theme: 'light',
    fontSize: 16,
    csvDelimiter: ',',
    csvHeader: true,
    videoAutoplay: false,
    videoVolume: 0.7,
    imageFit: 'contain',
    pdfZoom: 'page-fit'
};

// Media specific variables
let currentZoomLevel = 1;
let isDragging = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;
let currentVideoPlayer = null;

// DOM elements
const fileList = document.getElementById('file-list');
const fileViewer = document.getElementById('file-viewer');
const selectFolderBtn = document.getElementById('select-folder-btn');
const currentPathElement = document.getElementById('current-path');
const searchInput = document.getElementById('search-input');
const toggleShortcutsBtn = document.getElementById('toggle-shortcuts-btn');
const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
const shortcutsPanel = document.getElementById('shortcuts-panel');
const settingsPanel = document.getElementById('settings-panel');
const closeShortcutsBtn = document.getElementById('close-shortcuts');
const closeSettingsBtn = document.getElementById('close-settings');
const statusMessage = document.getElementById('status-message');
const selectedInfo = document.getElementById('selected-info');

// Settings elements
const defaultViewHTML = document.getElementById('default-view-html');
const defaultViewMD = document.getElementById('default-view-md');
const defaultViewCSV = document.getElementById('default-view-csv');
const syntaxHighlight = document.getElementById('syntax-highlight');
const themeSelect = document.getElementById('theme-select');
const fontSizeInput = document.getElementById('font-size');
const fontSizeValue = document.getElementById('font-size-value');
const csvDelimiterSelect = document.getElementById('csv-delimiter');
const csvHeaderCheckbox = document.getElementById('csv-header');
const videoAutoplayCheckbox = document.getElementById('video-autoplay');
const videoVolumeInput = document.getElementById('video-volume');
const videoVolumeValue = document.getElementById('video-volume-value');
const imageFitSelect = document.getElementById('image-fit');
const pdfZoomSelect = document.getElementById('pdf-zoom');

// Check if File System Access API is available
if ('showDirectoryPicker' in window) {
    selectFolderBtn.addEventListener('click', selectFolder);
} else {
    fileList.innerHTML = `
        <div class="placeholder">
            <i class="fas fa-exclamation-triangle fa-3x"></i>
            <p>Your browser does not support the File System Access API.<br>Please use Chrome, Edge or another supporting browser.</p>
        </div>`;
    selectFolderBtn.disabled = true;
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Load settings
    loadSettings();
    applySettings();
    
    // Set up event listeners
    fileList.addEventListener('keydown', handleFileListKeyDown);
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    toggleShortcutsBtn.addEventListener('click', toggleShortcutsPanel);
    toggleSettingsBtn.addEventListener('click', toggleSettingsPanel);
    
    closeShortcutsBtn.addEventListener('click', () => {
        shortcutsPanel.classList.remove('active');
    });
    
    closeSettingsBtn.addEventListener('click', () => {
        saveSettings();
        settingsPanel.classList.remove('active');
    });
    
    searchInput.addEventListener('input', handleSearch);
    
    // Settings event listeners
    defaultViewHTML.addEventListener('change', () => { settings.defaultViewHTML = defaultViewHTML.value; });
    defaultViewMD.addEventListener('change', () => { settings.defaultViewMD = defaultViewMD.value; });
    defaultViewCSV.addEventListener('change', () => { settings.defaultViewCSV = defaultViewCSV.value; });
    syntaxHighlight.addEventListener('change', () => { settings.syntaxHighlight = syntaxHighlight.checked; });
    
    themeSelect.addEventListener('change', () => {
        settings.theme = themeSelect.value;
        applyTheme();
    });
    
    fontSizeInput.addEventListener('input', () => {
        settings.fontSize = parseInt(fontSizeInput.value);
        fontSizeValue.textContent = `${settings.fontSize}px`;
        applyFontSize();
    });
    
    csvDelimiterSelect.addEventListener('change', () => { settings.csvDelimiter = csvDelimiterSelect.value; });
    csvHeaderCheckbox.addEventListener('change', () => { settings.csvHeader = csvHeaderCheckbox.checked; });
    
    // Media settings
    videoAutoplayCheckbox.addEventListener('change', () => { 
        settings.videoAutoplay = videoAutoplayCheckbox.checked; 
    });
    
    videoVolumeInput.addEventListener('input', () => {
        settings.videoVolume = parseFloat(videoVolumeInput.value);
        videoVolumeValue.textContent = `${Math.round(settings.videoVolume * 100)}%`;
        if (currentVideoPlayer) {
            currentVideoPlayer.volume = settings.videoVolume;
        }
    });
    
    imageFitSelect.addEventListener('change', () => { settings.imageFit = imageFitSelect.value; });
    pdfZoomSelect.addEventListener('change', () => { settings.pdfZoom = pdfZoomSelect.value; });
    
    // Make file list focusable
    fileList.tabIndex = 0;
    fileList.addEventListener('focus', () => {
        if (selectedFileIndex === -1 && fileItems.length > 0) {
            selectFileItem(0);
        }
    });
});

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('amzViewerSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    }
    
    // Update UI to match settings
    defaultViewHTML.value = settings.defaultViewHTML;
    defaultViewMD.value = settings.defaultViewMD;
    defaultViewCSV.value = settings.defaultViewCSV;
    syntaxHighlight.checked = settings.syntaxHighlight;
    themeSelect.value = settings.theme;
    fontSizeInput.value = settings.fontSize;
    fontSizeValue.textContent = `${settings.fontSize}px`;
    csvDelimiterSelect.value = settings.csvDelimiter;
    csvHeaderCheckbox.checked = settings.csvHeader;
    
    // Media settings
    videoAutoplayCheckbox.checked = settings.videoAutoplay || false;
    videoVolumeInput.value = settings.videoVolume || 0.7;
    videoVolumeValue.textContent = `${Math.round((settings.videoVolume || 0.7) * 100)}%`;
    imageFitSelect.value = settings.imageFit || 'contain';
    pdfZoomSelect.value = settings.pdfZoom || 'page-fit';
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('amzViewerSettings', JSON.stringify(settings));
    updateStatus('Settings saved');
}

// Apply settings to the UI
function applySettings() {
    applyTheme();
    applyFontSize();
}

// Apply theme
function applyTheme() {
    if (settings.theme === 'system') {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
    } else {
        document.documentElement.dataset.theme = settings.theme;
    }
}

// Apply font size
function applyFontSize() {
    document.documentElement.style.setProperty('--font-size-base', `${settings.fontSize}px`);
    document.documentElement.style.setProperty('--font-size-small', `${settings.fontSize - 2}px`);
    document.documentElement.style.setProperty('--font-size-smaller', `${settings.fontSize - 4}px`);
}

// Toggle shortcuts panel
function toggleShortcutsPanel() {
    settingsPanel.classList.remove('active');
    shortcutsPanel.classList.toggle('active');
}

// Toggle settings panel
function toggleSettingsPanel() {
    shortcutsPanel.classList.remove('active');
    settingsPanel.classList.toggle('active');
}

// Function to select a folder using the file system API
async function selectFolder() {
    try {
        updateStatus('Selecting folder...');
        currentDirectoryHandle = await window.showDirectoryPicker();
        breadcrumbPath = [{ name: currentDirectoryHandle.name, handle: currentDirectoryHandle }];
        currentPathElement.textContent = currentDirectoryHandle.name;
        displayDirectoryContents(currentDirectoryHandle);
        updateStatus(`Opened folder: ${currentDirectoryHandle.name}`);
    } catch (error) {
        // User cancelled or error occurred
        updateStatus('Ready');
        console.log('Folder selection was cancelled or failed', error);
    }
}

// Display contents of a directory
async function displayDirectoryContents(directoryHandle) {
    // Clear file list and show loading state
    fileList.innerHTML = '<div class="placeholder"><i class="fas fa-spinner fa-spin"></i> Loading files...</div>';
    fileItems = [];
    selectedFileIndex = -1;
    
    try {
        // Create breadcrumb navigation
        const breadcrumbDiv = document.createElement('div');
        breadcrumbDiv.className = 'breadcrumb';
        
        breadcrumbPath.forEach((item, index) => {
            const breadcrumbItem = document.createElement('span');
            breadcrumbItem.className = 'breadcrumb-item';
            breadcrumbItem.textContent = item.name;
            breadcrumbItem.setAttribute('tabindex', '0');
            
            breadcrumbItem.addEventListener('click', () => {
                // Navigate to this level in breadcrumb
                breadcrumbPath = breadcrumbPath.slice(0, index + 1);
                displayDirectoryContents(item.handle);
            });
            
            breadcrumbItem.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    breadcrumbPath = breadcrumbPath.slice(0, index + 1);
                    displayDirectoryContents(item.handle);
                }
            });
            
            breadcrumbDiv.appendChild(breadcrumbItem);
            
            if (index < breadcrumbPath.length - 1) {
                const separator = document.createElement('span');
                separator.className = 'breadcrumb-separator';
                separator.textContent = ' > ';
                breadcrumbDiv.appendChild(separator);
            }
        });
        
        // Clear and start building file list
        fileList.innerHTML = '';
        fileList.appendChild(breadcrumbDiv);
        
        // Get all entries in the directory
        const entries = [];
        for await (const entry of directoryHandle.values()) {
            entries.push(entry);
        }
        
        // Sort entries - directories first, then files
        entries.sort((a, b) => {
            if (a.kind !== b.kind) {
                return a.kind === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
        
        // No files found
        if (entries.length === 0) {
            const emptyDir = document.createElement('div');
            emptyDir.className = 'placeholder';
            emptyDir.innerHTML = '<i class="fas fa-folder-open"></i> <p>This folder is empty</p>';
            fileList.appendChild(emptyDir);
            return;
        }
        
        // Add entries to the file list
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const item = document.createElement('div');
            item.className = entry.kind === 'directory' ? 'file-item folder' : 'file-item';
            item.setAttribute('tabindex', '0');
            item.dataset.index = i;
            
            const icon = entry.kind === 'directory' ? '<i class="fas fa-folder"></i>' : getFileIconHTML(entry.name);
            item.innerHTML = `
                <div class="file-icon">${icon}</div>
                <div class="file-name">${entry.name}</div>
            `;
            
            // Store file item reference
            fileItems.push({
                element: item,
                entry: entry,
                name: entry.name,
                isDirectory: entry.kind === 'directory'
            });
            
            item.addEventListener('click', (e) => {
                selectFileItem(i);
                handleFileAction(entry);
            });
            
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    selectFileItem(i);
                    handleFileAction(entry);
                    e.preventDefault();
                }
            });
            
            fileList.appendChild(item);
        }
        
        // Auto-focus file list
        fileList.focus();
        if (fileItems.length > 0) {
            selectFileItem(0);
        }
        
        updateStatus(`Displaying ${entries.length} items`);
    } catch (error) {
        fileList.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-exclamation-circle fa-3x"></i>
                <p>Error accessing directory: ${error.message}</p>
            </div>`;
        updateStatus(`Error: ${error.message}`);
    }
}

// Handle file item selection
function selectFileItem(index) {
    if (fileItems.length === 0) return;
    
    // Clear previous selection
    if (selectedFileIndex >= 0 && selectedFileIndex < fileItems.length) {
        fileItems[selectedFileIndex].element.classList.remove('selected');
    }
    
    // Set new selection
    selectedFileIndex = Math.max(0, Math.min(index, fileItems.length - 1));
    fileItems[selectedFileIndex].element.classList.add('selected');
    fileItems[selectedFileIndex].element.scrollIntoView({ block: 'nearest' });
    
    // Update info
    const item = fileItems[selectedFileIndex];
    selectedInfo.textContent = `${item.name} ${item.isDirectory ? '(folder)' : ''}`;
}

// Handle file action (open file or navigate to folder)
async function handleFileAction(entry) {
    if (entry.kind === 'directory') {
        // Navigate to the directory
        breadcrumbPath.push({ name: entry.name, handle: entry });
        displayDirectoryContents(entry);
    } else {
        // Display file content
        displayFileContent(entry);
    }
}

// Get appropriate icon HTML for file type
function getFileIconHTML(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
        case 'html':
            return '<i class="fas fa-code" title="HTML File"></i>';
        case 'css':
            return '<i class="fab fa-css3-alt" title="CSS File"></i>';
        case 'js':
            return '<i class="fab fa-js" title="JavaScript File"></i>';
        case 'json':
            return '<i class="fas fa-file-alt" title="JSON File"></i>';
        case 'txt':
            return '<i class="fas fa-file-alt" title="Text File"></i>';
        case 'md':
            return '<i class="fab fa-markdown" title="Markdown File"></i>';
        case 'jpg':
        case 'jpeg':
        case 'png': 
        case 'gif':
        case 'webp':
            return '<i class="fas fa-image" title="Image File"></i>';
        case 'pdf':
            return '<i class="fas fa-file-pdf" title="PDF File"></i>';
        case 'doc':
        case 'docx':
            return '<i class="fas fa-file-word" title="Word Document"></i>';
        case 'xls':
        case 'xlsx':
            return '<i class="fas fa-file-excel" title="Excel Spreadsheet"></i>';
        case 'csv':
            return '<i class="fas fa-file-csv" title="CSV File"></i>';
        case 'ppt':
        case 'pptx':
            return '<i class="fas fa-file-powerpoint" title="PowerPoint Presentation"></i>';
        case 'zip':
        case 'rar':
        case '7z':
            return '<i class="fas fa-file-archive" title="Archive File"></i>';
        case 'mp3':
        case 'wav':
        case 'ogg':
            return '<i class="fas fa-file-audio" title="Audio File"></i>';
        case 'mp4':
        case 'avi':
        case 'mkv':
        case 'mov':
        case 'webm':
            return '<i class="fas fa-file-video" title="Video File"></i>';
        default:
            return '<i class="fas fa-file" title="File"></i>';
    }
}

// Display file content
async function displayFileContent(fileHandle) {
    fileViewer.innerHTML = `
        <div class="placeholder">
            <i class="fas fa-spinner fa-spin fa-3x"></i>
            <p>Loading file content...</p>
        </div>`;
    updateStatus(`Loading ${fileHandle.name}...`);
    
    try {
        const file = await fileHandle.getFile();
        const filename = file.name;
        const ext = filename.split('.').pop().toLowerCase();
        
        // Reset any global state
        currentZoomLevel = 1;
        translateX = 0;
        translateY = 0;
        isDragging = false;
        
        // Handle different file types
        switch (ext) {
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'webp':
                await displayImage(file);
                break;
                
            case 'mp4':
            case 'webm':
            case 'ogg':
            case 'mov':
                await displayVideo(file);
                break;
                
            case 'html':
                await displayHTML(file);
                break;
                
            case 'md':
                await displayMarkdown(file);
                break;
                
            case 'csv':
                await displayCSV(file);
                break;
                
            case 'txt':
            case 'js':
            case 'css':
            case 'json':
            case 'xml':
                await displayText(file, ext);
                break;
                
            case 'pdf':
                displayPDF(file);
                break;
                
            default:
                displayUnsupported(file);
                break;
        }
        
        updateStatus(`Loaded: ${filename}`);
    } catch (error) {
        fileViewer.innerHTML = `
            <div class="placeholder">
                <i class="fas fa-exclamation-triangle fa-3x"></i>
                <p>Error reading file: ${error.message}</p>
            </div>`;
        updateStatus(`Error: ${error.message}`);
    }
}

// Display image file with zoom and pan functionality
async function displayImage(file) {
    const imgUrl = URL.createObjectURL(file);
    
    const container = document.createElement('div');
    container.className = 'image-container';
    
    const viewer = document.createElement('div');
    viewer.className = 'image-viewer';
    
    const img = document.createElement('img');
    img.src = imgUrl;
    img.alt = file.name;
    img.style.objectFit = settings.imageFit;
    
    viewer.appendChild(img);
    
    const controls = document.createElement('div');
    controls.className = 'image-controls';
    
    // Zoom out button
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.className = 'video-button';
    zoomOutBtn.title = 'Zoom Out (-)';
    zoomOutBtn.innerHTML = '<i class="fas fa-search-minus"></i>';
    zoomOutBtn.addEventListener('click', () => {
        updateZoom(-0.1);
    });
    
    // Zoom level indicator
    const zoomLevel = document.createElement('span');
    zoomLevel.className = 'zoom-level';
    zoomLevel.textContent = '100%';
    
    // Zoom in button
    const zoomInBtn = document.createElement('button');
    zoomInBtn.className = 'video-button';
    zoomInBtn.title = 'Zoom In (+)';
    zoomInBtn.innerHTML = '<i class="fas fa-search-plus"></i>';
    zoomInBtn.addEventListener('click', () => {
        updateZoom(0.1);
    });
    
    // Reset zoom button
    const resetZoomBtn = document.createElement('button');
    resetZoomBtn.className = 'video-button';
    resetZoomBtn.title = 'Reset Zoom (0)';
    resetZoomBtn.innerHTML = '<i class="fas fa-compress-arrows-alt"></i>';
    resetZoomBtn.addEventListener('click', () => {
        resetZoom();
    });
    
    // Fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'video-button';
    fullscreenBtn.title = 'Toggle Fullscreen (F)';
    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    fullscreenBtn.addEventListener('click', () => {
        toggleFullscreen(container);
    });
    
    // Add all controls
    controls.appendChild(zoomOutBtn);
    controls.appendChild(zoomLevel);
    controls.appendChild(zoomInBtn);
    controls.appendChild(resetZoomBtn);
    controls.appendChild(fullscreenBtn);
    
    container.appendChild(viewer);
    container.appendChild(controls);
    
    fileViewer.innerHTML = '';
    fileViewer.appendChild(container);
    
    // Set up zoom and pan functionality
    function updateZoom(delta = 0) {
        currentZoomLevel = Math.max(0.1, Math.min(10, currentZoomLevel + delta));
        img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoomLevel})`;
        zoomLevel.textContent = `${Math.round(currentZoomLevel * 100)}%`;
        
        // Add or remove zoomed class based on zoom level
        if (currentZoomLevel > 1) {
            viewer.classList.add('zoomed');
        } else {
            viewer.classList.remove('zoomed');
            resetZoom();
        }
    }
    
    function resetZoom() {
        currentZoomLevel = 1;
        translateX = 0;
        translateY = 0;
        img.style.transform = 'translate(0, 0) scale(1)';
        zoomLevel.textContent = '100%';
        viewer.classList.remove('zoomed');
    }
    
    // Image drag events for panning
    img.addEventListener('mousedown', (e) => {
        if (currentZoomLevel <= 1) return;
        
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        viewer.classList.add('grabbing');
        e.preventDefault();
    });
    
    viewer.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoomLevel})`;
        e.preventDefault();
    });
    
    viewer.addEventListener('mouseup', () => {
        isDragging = false;
        viewer.classList.remove('grabbing');
    });
    
    viewer.addEventListener('mouseleave', () => {
        isDragging = false;
        viewer.classList.remove('grabbing');
    });
    
    // Double click to toggle zoom
    viewer.addEventListener('dblclick', (e) => {
        if (currentZoomLevel > 1) {
            resetZoom();
        } else {
            currentZoomLevel = 2;
            // Set translation to center on mouse position
            const rect = viewer.getBoundingClientRect();
            translateX = (rect.width / 2 - (e.clientX - rect.left)) * 0.5;
            translateY = (rect.height / 2 - (e.clientY - rect.top)) * 0.5;
            img.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoomLevel})`;
            zoomLevel.textContent = '200%';
            viewer.classList.add('zoomed');
        }
    });
    
    // Mouse wheel zoom
    viewer.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            updateZoom(0.1);
        } else {
            updateZoom(-0.1);
        }
    });
    
    // Keyboard shortcuts for image
    document.addEventListener('keydown', function imageKeyHandler(e) {
        // Only handle keys when this image is in view
        if (!fileViewer.contains(container)) {
            document.removeEventListener('keydown', imageKeyHandler);
            return;
        }
        
        switch (e.key) {
            case '+':
            case '=': // = key is often the unshifted version of +
                updateZoom(0.1);
                e.preventDefault();
                break;
            case '-':
                updateZoom(-0.1);
                e.preventDefault();
                break;
            case '0':
                resetZoom();
                e.preventDefault();
                break;
            case 'f':
            case 'F':
                toggleFullscreen(container);
                e.preventDefault();
                break;
        }
    });
}

// Display video file with custom controls
async function displayVideo(file) {
    const videoUrl = URL.createObjectURL(file);
    
    const container = document.createElement('div');
    container.className = 'video-container';
    
    const player = document.createElement('div');
    player.className = 'video-player';
    
    const video = document.createElement('video');
    video.src = videoUrl;
    video.autoplay = settings.videoAutoplay;
    video.volume = settings.videoVolume;
    video.controls = false; // We will use our own controls
    currentVideoPlayer = video; // Store reference to current video player
    
    player.appendChild(video);
    
    const controls = document.createElement('div');
    controls.className = 'video-controls';
    
    // Play/pause button
    const playPauseBtn = document.createElement('button');
    playPauseBtn.className = 'video-button';
    playPauseBtn.title = 'Play/Pause (Space)';
    playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    playPauseBtn.addEventListener('click', togglePlayPause);
    
    // Stop button
    const stopBtn = document.createElement('button');
    stopBtn.className = 'video-button';
    stopBtn.title = 'Stop';
    stopBtn.innerHTML = '<i class="fas fa-stop"></i>';
    stopBtn.addEventListener('click', stopVideo);
    
    // Skip back button
    const skipBackBtn = document.createElement('button');
    skipBackBtn.className = 'video-button';
    skipBackBtn.title = 'Skip Back 5s (Left Arrow)';
    skipBackBtn.innerHTML = '<i class="fas fa-backward"></i>';
    skipBackBtn.addEventListener('click', () => skipTime(-5));
    
    // Skip forward button
    const skipForwardBtn = document.createElement('button');
    skipForwardBtn.className = 'video-button';
    skipForwardBtn.title = 'Skip Forward 5s (Right Arrow)';
    skipForwardBtn.innerHTML = '<i class="fas fa-forward"></i>';
    skipForwardBtn.addEventListener('click', () => skipTime(5));
    
    // Current time / total time
    const videoTime = document.createElement('div');
    videoTime.className = 'video-time';
    videoTime.textContent = '0:00 / 0:00';
    
    // Progress slider
    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'video-slider-container';
    
    const progressSlider = document.createElement('input');
    progressSlider.type = 'range';
    progressSlider.className = 'video-slider';
    progressSlider.min = 0;
    progressSlider.max = 100;
    progressSlider.value = 0;
    progressSlider.addEventListener('input', seekVideo);
    
    sliderContainer.appendChild(progressSlider);
    
    // Volume control
    const volumeContainer = document.createElement('div');
    volumeContainer.className = 'video-volume';
    
    const volumeIcon = document.createElement('button');
    volumeIcon.className = 'video-button';
    volumeIcon.title = 'Toggle Mute';
    volumeIcon.innerHTML = '<i class="fas fa-volume-up"></i>';
    volumeIcon.addEventListener('click', toggleMute);
    
    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.className = 'video-volume-slider';
    volumeSlider.min = 0;
    volumeSlider.max = 1;
    volumeSlider.step = 0.1;
    volumeSlider.value = settings.videoVolume;
    volumeSlider.addEventListener('input', setVolume);
    
    volumeContainer.appendChild(volumeIcon);
    volumeContainer.appendChild(volumeSlider);
    
    // Fullscreen button
    const fullscreenBtn = document.createElement('button');
    fullscreenBtn.className = 'video-button';
    fullscreenBtn.title = 'Toggle Fullscreen (F)';
    fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
    fullscreenBtn.addEventListener('click', () => toggleFullscreen(container));
    
    // Add all controls
    controls.appendChild(playPauseBtn);
    controls.appendChild(stopBtn);
    controls.appendChild(skipBackBtn);
    controls.appendChild(skipForwardBtn);
    controls.appendChild(videoTime);
    controls.appendChild(sliderContainer);
    controls.appendChild(volumeContainer);
    controls.appendChild(fullscreenBtn);
    
    container.appendChild(player);
    container.appendChild(controls);
    
    fileViewer.innerHTML = '';
    fileViewer.appendChild(container);
    
    // Update time display and slider as video plays
    video.addEventListener('timeupdate', updateVideoProgress);
    
    // Update play/pause button when playback state changes
    video.addEventListener('play', () => {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    });
    
    video.addEventListener('pause', () => {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    });
    
    // Update time display when metadata is loaded
    video.addEventListener('loadedmetadata', () => {
        videoTime.textContent = `0:00 / ${formatTime(video.duration)}`;
        updateVideoProgress();
    });
    
    // Video control functions
    function togglePlayPause() {
        if (video.paused || video.ended) {
            video.play();
        } else {
            video.pause();
        }
    }
    
    function stopVideo() {
        video.pause();
        video.currentTime = 0;
        updateVideoProgress();
    }
    
    function skipTime(seconds) {
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
        updateVideoProgress();
    }
    
    function seekVideo() {
        const seekTime = (progressSlider.value / 100) * video.duration;
        video.currentTime = seekTime;
        updateVideoProgress();
    }
    
    function updateVideoProgress() {
        if (isNaN(video.duration)) return;
        
        // Update slider
        progressSlider.value = (video.currentTime / video.duration) * 100;
        
        // Update time display
        videoTime.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    }
    
    function toggleMute() {
        video.muted = !video.muted;
        volumeIcon.innerHTML = video.muted ? 
            '<i class="fas fa-volume-mute"></i>' : 
            '<i class="fas fa-volume-up"></i>';
    }
    
    function setVolume() {
        video.volume = volumeSlider.value;
        video.muted = (volumeSlider.value === 0);
        
        // Update icon based on volume level
        if (video.muted || video.volume === 0) {
            volumeIcon.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (video.volume < 0.5) {
            volumeIcon.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            volumeIcon.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
        
        // Update settings
        settings.videoVolume = video.volume;
        videoVolumeValue.textContent = `${Math.round(settings.videoVolume * 100)}%`;
        videoVolumeInput.value = settings.videoVolume;
    }
    
    // Format seconds to MM:SS
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    // Keyboard shortcuts for video
    document.addEventListener('keydown', function videoKeyHandler(e) {
        // Only handle keys when this video is in view
        if (!fileViewer.contains(container)) {
            document.removeEventListener('keydown', videoKeyHandler);
            return;
        }
        
        switch (e.key) {
            case ' ':
                togglePlayPause();
                e.preventDefault();
                break;
            case 'ArrowRight':
                skipTime(5);
                e.preventDefault();
                break;
            case 'ArrowLeft':
                skipTime(-5);
                e.preventDefault();
                break;
            case 'f':
            case 'F':
                toggleFullscreen(container);
                e.preventDefault();
                break;
            case 'm':
            case 'M':
                toggleMute();
                e.preventDefault();
                break;
        }
    });
    
    // Clean up when removing from DOM
    return () => {
        currentVideoPlayer = null;
        URL.revokeObjectURL(videoUrl);
    };
}

// Toggle fullscreen mode
function toggleFullscreen(element) {
    if (!document.fullscreenElement) {
        // Enter fullscreen
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) { /* Safari */
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) { /* IE11 */
            element.msRequestFullscreen();
        }
        element.classList.add('fullscreen');
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { /* Safari */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE11 */
            document.msExitFullscreen();
        }
        element.classList.remove('fullscreen');
    }
}

// Display HTML file
async function displayHTML(file) {
    const content = await file.text();
    
    const container = document.createElement('div');
    container.className = 'content-container';
    
    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    
    const previewTab = document.createElement('button');
    previewTab.className = `tab ${settings.defaultViewHTML === 'preview' ? 'active' : ''}`;
    previewTab.innerHTML = '<i class="fas fa-eye"></i> Preview';
    previewTab.onclick = () => switchTab('preview');
    
    const sourceTab = document.createElement('button');
    sourceTab.className = `tab ${settings.defaultViewHTML === 'source' ? 'active' : ''}`;
    sourceTab.innerHTML = '<i class="fas fa-code"></i> Source';
    sourceTab.onclick = () => switchTab('source');
    
    tabs.appendChild(previewTab);
    tabs.appendChild(sourceTab);
    
    const previewContent = document.createElement('div');
    previewContent.id = 'preview';
    previewContent.className = `tab-content ${settings.defaultViewHTML === 'preview' ? 'active' : ''}`;
    
    const iframe = document.createElement('iframe');
    iframe.className = 'preview';
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.srcdoc = content;
    previewContent.appendChild(iframe);
    
    const sourceContent = document.createElement('div');
    sourceContent.id = 'source';
    sourceContent.className = `tab-content ${settings.defaultViewHTML === 'source' ? 'active' : ''}`;
    
    const pre = document.createElement('pre');
    pre.className = 'source-view language-html';
    pre.textContent = content;
    sourceContent.appendChild(pre);
    
    container.appendChild(tabs);
    container.appendChild(previewContent);
    container.appendChild(sourceContent);
    
    fileViewer.innerHTML = '';
    fileViewer.appendChild(container);
    
    if (settings.syntaxHighlight) {
        Prism.highlightElement(pre);
    }
    
    function switchTab(tabId) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        if (tabId === 'preview') {
            previewTab.classList.add('active');
            previewContent.classList.add('active');
        } else {
            sourceTab.classList.add('active');
            sourceContent.classList.add('active');
        }
    }
}

// Display Markdown file
async function displayMarkdown(file) {
    const content = await file.text();
    
    const container = document.createElement('div');
    container.className = 'content-container';
    
    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    
    const previewTab = document.createElement('button');
    previewTab.className = `tab ${settings.defaultViewMD === 'preview' ? 'active' : ''}`;
    previewTab.innerHTML = '<i class="fas fa-eye"></i> Preview';
    previewTab.onclick = () => switchTab('preview');
    
    const sourceTab = document.createElement('button');
    sourceTab.className = `tab ${settings.defaultViewMD === 'source' ? 'active' : ''}`;
    sourceTab.innerHTML = '<i class="fas fa-code"></i> Source';
    sourceTab.onclick = () => switchTab('source');
    
    tabs.appendChild(previewTab);
    tabs.appendChild(sourceTab);
    
    const previewContent = document.createElement('div');
    previewContent.id = 'preview';
    previewContent.className = `tab-content preview-view ${settings.defaultViewMD === 'preview' ? 'active' : ''}`;
    previewContent.innerHTML = marked.parse(content);
    
    const sourceContent = document.createElement('div');
    sourceContent.id = 'source';
    sourceContent.className = `tab-content ${settings.defaultViewMD === 'source' ? 'active' : ''}`;
    
    const pre = document.createElement('pre');
    pre.className = 'source-view language-markdown';
    pre.textContent = content;
    sourceContent.appendChild(pre);
    
    container.appendChild(tabs);
    container.appendChild(previewContent);
    container.appendChild(sourceContent);
    
    fileViewer.innerHTML = '';
    fileViewer.appendChild(container);
    
    if (settings.syntaxHighlight) {
        Prism.highlightElement(pre);
    }
    
    function switchTab(tabId) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        if (tabId === 'preview') {
            previewTab.classList.add('active');
            previewContent.classList.add('active');
        } else {
            sourceTab.classList.add('active');
            sourceContent.classList.add('active');
        }
    }
}

// Display CSV file
async function displayCSV(file) {
    const content = await file.text();
    
    const container = document.createElement('div');
    container.className = 'content-container';
    
    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    
    const tableTab = document.createElement('button');
    tableTab.className = `tab ${settings.defaultViewCSV === 'table' ? 'active' : ''}`;
    tableTab.innerHTML = '<i class="fas fa-table"></i> Table';
    tableTab.onclick = () => switchTab('table');
    
    const sourceTab = document.createElement('button');
    sourceTab.className = `tab ${settings.defaultViewCSV === 'source' ? 'active' : ''}`;
    sourceTab.innerHTML = '<i class="fas fa-code"></i> Source';
    sourceTab.onclick = () => switchTab('source');
    
    tabs.appendChild(tableTab);
    tabs.appendChild(sourceTab);
    
    const tableContent = document.createElement('div');
    tableContent.id = 'table';
    tableContent.className = `tab-content ${settings.defaultViewCSV === 'table' ? 'active' : ''}`;
    tableContent.appendChild(parseCSVToTable(content, settings.csvDelimiter, settings.csvHeader));
    
    const sourceContent = document.createElement('div');
    sourceContent.id = 'source';
    sourceContent.className = `tab-content ${settings.defaultViewCSV === 'source' ? 'active' : ''}`;
    
    const pre = document.createElement('pre');
    pre.className = 'source-view';
    pre.textContent = content;
    sourceContent.appendChild(pre);
    
    container.appendChild(tabs);
    container.appendChild(tableContent);
    container.appendChild(sourceContent);
    
    fileViewer.innerHTML = '';
    fileViewer.appendChild(container);
    
    function switchTab(tabId) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        if (tabId === 'table') {
            tableTab.classList.add('active');
            tableContent.classList.add('active');
        } else {
            sourceTab.classList.add('active');
            sourceContent.classList.add('active');
        }
    }
}

// Parse CSV to HTML table
function parseCSVToTable(csvText, delimiter = ',', hasHeader = true) {
    // Parse CSV
    const rows = csvText.split(/\r?\n/).filter(row => row.trim());
    const data = rows.map(row => {
        // Handle quoted fields with commas inside
        let fields = [];
        let inQuote = false;
        let field = '';
        
        for (let i = 0; i < row.length; i++) {
            const char = row[i];
            
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === delimiter && !inQuote) {
                fields.push(field);
                field = '';
            } else {
                field += char;
            }
        }
        
        // Add the last field
        fields.push(field);
        
        return fields;
    });
    
    // Create table
    const table = document.createElement('table');
    table.className = 'csv-table';
    
    // Create header
    if (hasHeader && data.length > 0) {
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        data[0].forEach(cell => {
            const th = document.createElement('th');
            th.textContent = cell.replace(/^"|"$/g, ''); // Remove quotes
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
    }
    
    // Create body
    const tbody = document.createElement('tbody');
    const startRow = hasHeader ? 1 : 0;
    
    for (let i = startRow; i < data.length; i++) {
        const tr = document.createElement('tr');
        
        data[i].forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell.replace(/^"|"$/g, ''); // Remove quotes
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    }
    
    table.appendChild(tbody);
    return table;
}

// Display text file
async function displayText(file, fileType) {
    const content = await file.text();
    
    const container = document.createElement('div');
    container.className = 'content-container';
    
    const pre = document.createElement('pre');
    pre.className = `source-view ${settings.syntaxHighlight ? `language-${fileType}` : ''}`;
    pre.textContent = content;
    
    container.appendChild(pre);
    fileViewer.innerHTML = '';
    fileViewer.appendChild(container);
    
    if (settings.syntaxHighlight) {
        Prism.highlightElement(pre);
    }
}

// Display PDF file
function displayPDF(file) {
    const pdfUrl = URL.createObjectURL(file);
    
    // Create container for PDF
    const container = document.createElement('div');
    container.className = 'pdf-container';
    
    // Create embed element with zoom parameter based on settings
    const embed = document.createElement('embed');
    embed.src = `${pdfUrl}#zoom=${settings.pdfZoom}`;
    embed.type = 'application/pdf';
    
    container.appendChild(embed);
    fileViewer.innerHTML = '';
    fileViewer.appendChild(container);
}

// Display unsupported file type
function displayUnsupported(file) {
    fileViewer.innerHTML = `
        <div class="placeholder">
            <i class="fas fa-file fa-3x"></i>
            <p>File: ${file.name}</p>
            <p>Type: ${file.type || 'Unknown'}</p>
            <p>Size: ${formatFileSize(file.size)}</p>
            <p>Modified: ${new Date(file.lastModified).toLocaleString()}</p>
            <p>This file type cannot be previewed directly.</p>
        </div>
    `;
}

// Format file size in KB, MB, etc.
function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Handle keyboard navigation in file list
function handleFileListKeyDown(e) {
    if (fileItems.length === 0) return;
    
    switch (e.key) {
        case 'ArrowDown':
            selectFileItem(selectedFileIndex + 1);
            e.preventDefault();
            break;
        case 'ArrowUp':
            selectFileItem(selectedFileIndex - 1);
            e.preventDefault();
            break;
        case 'Home':
            selectFileItem(0);
            e.preventDefault();
            break;
        case 'End':
            selectFileItem(fileItems.length - 1);
            e.preventDefault();
            break;
        case 'Enter':
        case ' ': // Space key
            if (selectedFileIndex >= 0) {
                const selectedEntry = fileItems[selectedFileIndex].entry;
                handleFileAction(selectedEntry);
            }
            e.preventDefault();
            break;
    }
}

// Handle global keyboard shortcuts
function handleGlobalKeyDown(e) {
    // Don't trigger shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' && e.key !== 'Escape') return;
    
    // Ctrl + O: Open folder
    if (e.ctrlKey && e.key === 'o') {
        selectFolder();
        e.preventDefault();
        return;
    }
    
    // Ctrl + F: Focus search
    if (e.ctrlKey && e.key === 'f') {
        searchInput.focus();
        e.preventDefault();
        return;
    }
    
    // Ctrl + S: Toggle Source/Preview
    if (e.ctrlKey && e.key === 's') {
        const activeTab = document.querySelector('.tab.active');
        if (activeTab) {
            const tabs = document.querySelectorAll('.tab');
            if (tabs.length > 1) {
                const currentIndex = Array.from(tabs).indexOf(activeTab);
                const nextIndex = (currentIndex + 1) % tabs.length;
                tabs[nextIndex].click();
            }
            e.preventDefault();
        }
        return;
    }
    
    // Backspace: Navigate to parent directory
    if (e.key === 'Backspace' && breadcrumbPath.length > 1 && 
        e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        breadcrumbPath.pop();
        displayDirectoryContents(breadcrumbPath[breadcrumbPath.length - 1].handle);
        e.preventDefault();
        return;
    }
    
    // ?: Show shortcuts
    if (e.key === '?') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            toggleShortcutsPanel();
            e.preventDefault();
        }
        return;
    }
    
    // Comma: Show settings
    if (e.key === ',') {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            toggleSettingsPanel();
            e.preventDefault();
        }
        return;
    }
    
    // Escape: Close panels
    if (e.key === 'Escape') {
        if (shortcutsPanel.classList.contains('active')) {
            shortcutsPanel.classList.remove('active');
        }
        if (settingsPanel.classList.contains('active')) {
            saveSettings();
            settingsPanel.classList.remove('active');
        }
        return;
    }
}

// Search functionality
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    
    if (!searchTerm) {
        // Reset all items to visible
        fileItems.forEach((item) => {
            item.element.style.display = '';
        });
        return;
    }
    
    let foundAny = false;
    let firstFoundIndex = -1;
    
    fileItems.forEach((item, index) => {
        const matches = item.name.toLowerCase().includes(searchTerm);
        item.element.style.display = matches ? '' : 'none';
        
        if (matches && firstFoundIndex === -1) {
            firstFoundIndex = index;
            foundAny = true;
        }
    });
    
    if (foundAny) {
        selectFileItem(firstFoundIndex);
        updateStatus(`Found ${searchTerm} in files`);
    } else {
        updateStatus(`No matches for "${searchTerm}"`);
    }
}

// Update status bar message
function updateStatus(message) {
    statusMessage.textContent = message;
}