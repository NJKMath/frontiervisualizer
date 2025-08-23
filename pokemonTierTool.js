// Version 2.8 - Updated group creation options and placeholder text handling
// Main Pokemon Tier Tool class
class PokemonTierTool {
    constructor() {
        // Check if required classes are available
        if (typeof CanvasRenderer === 'undefined') {
            console.error('CanvasRenderer class not found. Make sure canvasRenderer.js is loaded before pokemonTierTool.js');
            return;
        }
        if (typeof GroupManager === 'undefined') {
            console.error('GroupManager class not found. Make sure groupManager.js is loaded before pokemonTierTool.js');
            return;
        }
        if (typeof UIManager === 'undefined') {
            console.error('UIManager class not found. Make sure uiManager.js is loaded before pokemonTierTool.js');
            return;
        }

        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.data = [];
        this.icons = [];
        this.groups = [];
        this.selectedIcons = [];
        
        // Profile system - separate state for each mode
        this.profiles = {
            free: { groups: [], iconStates: [], selectedIcons: [], initialized: false },
            score: { groups: [], iconStates: [], selectedIcons: [], initialized: false },
            speed: { groups: [], iconStates: [], selectedIcons: [], initialized: false }
        };
        
        // Canvas properties
        this.zoom = 1.0;
        this.panX = 0;
        this.panY = 0;
        this.dragStart = { x: 0, y: 0 };
        this.draggedIcon = null;
        this.draggedGroup = null;
        this.resizingGroup = null;
        this.resizeHandle = null;
        this.contextMenuIcon = null;
        
        // UI properties
        this.viewOnClick = false;
        
        // Score Mode reordering properties
        this.insertionPreview = null;
        
        // Focus modal properties
        this.focusedGroup = null;
        this.draggedFocusCard = null;
        this.focusCardOrder = [];
        
        // Layout properties
        this.iconWidth = 60;
        this.iconHeight = 18;
        this.iconPadding = 3;
        this.separatorY = 0;
        this.poolStartY = 0;
        this.mode = 'free';
        this.scaleWidth = 120;
        
        // Global stat calculation settings
        this.globalIVs = 31;
        this.globalLevel = 100;
        
        // Initialize managers
        try {
            this.canvasRenderer = new CanvasRenderer(this);
            this.groupManager = new GroupManager(this);
            this.uiManager = new UIManager(this);
        } catch (error) {
            console.error('Error initializing managers:', error);
            return;
        }
        
        this.setupEventListeners();
        this.canvasRenderer.setupCanvas();
        
        // Initialize global controls
        document.getElementById('globalIVs').value = this.globalIVs;
        document.getElementById('globalLevel').value = this.globalLevel;
        
        // Initialize speed value section visibility
        if (this.mode === 'speed') {
            this.uiManager.showSpeedValueSection();
        } else {
            this.uiManager.hideSpeedValueSection();
        }
    }

    setupEventListeners() {
        // File input
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.loadCSV(e.target.files[0]);
        });

        // Canvas events
        this.canvas.addEventListener('mousedown', this.canvasRenderer.handleMouseDown.bind(this.canvasRenderer));
        this.canvas.addEventListener('mousemove', this.canvasRenderer.handleMouseMove.bind(this.canvasRenderer));
        this.canvas.addEventListener('mouseup', this.canvasRenderer.handleMouseUp.bind(this.canvasRenderer));
        this.canvas.addEventListener('wheel', this.canvasRenderer.handleWheel.bind(this.canvasRenderer));
        
        this.canvas.style.outline = 'none';
        this.canvas.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Keyboard panning
        document.addEventListener('keydown', this.canvasRenderer.handleKeyDown.bind(this.canvasRenderer));
        
        this.canvas.tabIndex = 0;
        this.canvas.focus();

        // Controls
        document.getElementById('createGroup').addEventListener('click', () => {
            this.groupManager.createNewGroup();
        });

        document.getElementById('clearAllSelected').addEventListener('click', () => {
            this.uiManager.clearSidebar();
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportCSV();
        });

        document.getElementById('saveLayoutBtn').addEventListener('click', () => {
            this.saveLayout();
        });

        document.getElementById('loadLayoutBtn').addEventListener('click', () => {
            document.getElementById('layoutInput').click();
        });

        document.getElementById('layoutInput').addEventListener('change', (e) => {
            this.loadLayout(e.target.files[0]);
        });



        // Auto-fill group value based on field
        document.getElementById('groupField').addEventListener('change', (e) => {
            document.getElementById('groupValue').value = '';
            if (e.target.value === 'Type') {
                document.getElementById('groupValue').placeholder = 'Enter type (e.g. Fire or Fire Flying)...';
            } else if (e.target.value === 'Species') {
                document.getElementById('groupValue').placeholder = 'Enter species name...';
            } else if (e.target.value === 'Move') {
                document.getElementById('groupValue').placeholder = 'Enter move name...';
            } else if (e.target.value === 'custom') {
                document.getElementById('groupValue').placeholder = 'Enter custom group name...';
            } else {
                document.getElementById('groupValue').placeholder = `Enter ${e.target.value}...`;
            }
        });

        // Right-click context menu
        this.canvas.addEventListener('contextmenu', this.uiManager.handleRightClick.bind(this.uiManager));
        document.addEventListener('click', this.uiManager.hideContextMenu.bind(this.uiManager));

        // Mode selection
        document.getElementById('modeSelect').addEventListener('change', (e) => {
            const newMode = e.target.value;
            const oldMode = this.mode;
            
            // Save current state to the old mode's profile
            this.groupManager.saveCurrentStateToProfile(oldMode);
            
            // Switch to new mode
            this.mode = newMode;
            
            // Load the new mode's profile
            this.groupManager.loadProfileState(newMode);
            
            // Handle mode-specific UI and highlighting
            if (newMode === 'speed') {
                this.uiManager.showSpeedValueSection();
                
                // Load Speed Mode group directly from profile
                const speedProfile = this.profiles['speed'];
                console.log('Speed profile when switching to Speed Mode:', speedProfile);
                
                if (speedProfile && speedProfile.speedModeGroup) {
                    console.log('Loading Speed Mode group:', speedProfile.speedModeGroup);
                    
                    // Recreate the active group reference
                    this.uiManager.speedModeActiveGroup = {
                        id: speedProfile.speedModeGroup.id,
                        name: speedProfile.speedModeGroup.name,
                        color: speedProfile.speedModeGroup.color,
                        icons: speedProfile.speedModeGroup.iconDataIndices.map(dataIndex => 
                            this.icons.find(icon => icon.dataIndex === dataIndex)
                        ).filter(icon => icon) // Filter out any missing icons
                    };
                    
                    console.log('Created speedModeActiveGroup:', this.uiManager.speedModeActiveGroup);
                    
                    // Apply group highlights
                    this.uiManager.applySpeedModeGroupHighlights();
                } else {
                    console.log('No Speed Mode group found in profile');
                    this.uiManager.speedModeActiveGroup = null;
                }
                
                // Update speed highlights
                this.uiManager.updateSpeedHighlights();
            } else {
                this.uiManager.hideSpeedValueSection();
                // Clear Speed Mode group highlights when leaving Speed Mode
                this.icons.forEach(icon => {
                    delete icon.speedGroupHighlight;
                });
            }
            
            // Update UI to reflect new mode
            this.uiManager.updateGroupList();
            
            // Only render if not switching to Speed Mode (Speed Mode handles its own rendering)
            if (newMode !== 'speed') {
                this.canvasRenderer.render();
            }
        });

        // View on click checkbox
        document.getElementById('viewOnClickCheckbox').addEventListener('change', (e) => {
            this.viewOnClick = e.target.checked;
        });

        // Global IV/Level controls
        document.getElementById('globalIVs').addEventListener('change', (e) => {
            const ivs = parseInt(e.target.value);
            if (isNaN(ivs) || ivs < 0 || ivs > 31) {
                alert('Please enter a valid IV value between 0 and 31');
                e.target.value = this.globalIVs;
                return;
            }
            this.globalIVs = ivs;
            this.uiManager.updateAllStats();
            
            // In Speed Mode, rearrange icons as IV changes affect speed calculations
            if (this.mode === 'speed') {
                this.groupManager.arrangeIconsBySpeed();
                // Reapply Speed Mode group highlights and speed value highlights
                this.uiManager.loadSpeedModeGroup();
                this.uiManager.updateSpeedHighlights();
            }
        });

        document.getElementById('globalLevel').addEventListener('change', (e) => {
            const level = parseInt(e.target.value);
            if (isNaN(level) || (level !== 50 && level !== 100)) {
                alert('Please select a valid level (50 or 100)');
                e.target.value = this.globalLevel;
                return;
            }
            this.globalLevel = level;
            this.uiManager.updateAllStats();
            
            // In Speed Mode, recalculate and rearrange icons, then render to update scale
            if (this.mode === 'speed') {
                this.groupManager.arrangeIconsBySpeed();
                this.canvasRenderer.render(); // Ensure scale is updated
                // Reapply Speed Mode group highlights and speed value highlights
                this.uiManager.loadSpeedModeGroup();
                this.uiManager.updateSpeedHighlights();
            }
        });

        // Focus modal click outside to close
        document.getElementById('focusModal').addEventListener('click', (e) => {
            if (e.target.id === 'focusModal') {
                this.uiManager.closeFocusModal();
            }
        });
    }

    async loadCSV(file) {
        if (!file) return;

        const text = await file.text();
        const parsed = Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true
        });

        this.data = parsed.data;
        
        // Reset all profiles when new data is loaded
        this.profiles = {
            free: { groups: [], iconStates: [], selectedIcons: [], initialized: false },
            score: { groups: [], iconStates: [], selectedIcons: [], initialized: false },
            speed: { groups: [], iconStates: [], selectedIcons: [], initialized: false }
        };
        
        // Initialize current mode with fresh data
        this.groupManager.initializeFreshProfile(this.mode);
        
        document.getElementById('dataStatus').textContent = 
            `Loaded ${this.data.length} Pokemon`;
        this.uiManager.updateCounts();
    }

    updateIconScore(iconId, scoreValue) {
        let icon;
        if (typeof iconId === 'string') {
            icon = this.icons.find(i => i.id === iconId);
        } else {
            icon = this.icons.find(i => i.dataIndex === iconId);
        }
        
        if (!icon) return;
        
        const score = scoreValue.trim() === '' ? null : parseFloat(scoreValue);
        
        if (score !== null && (isNaN(score) || score < 0 || score > 100)) {
            alert('Please enter a valid score between 0 and 100');
            return;
        }
        
        icon.score = score;
        
        // In Score Mode, position the icon based on its score
        if (this.mode === 'score') {
            if (score !== null) {
                // Calculate Y position based on score
                const scaleTop = 10;
                const scaleBottom = 766;
                const scaleHeight = 756;
                const maxScore = 100;
                const absoluteY = scaleBottom - (score / maxScore) * scaleHeight;
                icon.y = Math.max(scaleTop, Math.min(scaleBottom - icon.height, absoluteY - icon.height / 2));
                
                // Position in main area (not pool)
                const startX = this.scaleWidth + 20;
                if (icon.groupId === null) {
                    // If not in a group, position it in the main area
                    icon.x = startX;
                }
            }
            
            // If icon is in a group, rearrange the group
            if (icon.groupId !== null) {
                const group = this.groups[icon.groupId];
                this.groupManager.arrangeGroupIcons(group);
            }
        }
        
        this.canvasRenderer.render();
    }

    toggleGroupLock(groupId, locked) {
        const group = this.groups[groupId];
        if (group) {
            group.locked = locked;
        }
    }

    updateFocusCardScore(cardIndex, scoreValue) {
        const icon = this.focusCardOrder[cardIndex];
        if (!icon) return;
        
        const score = scoreValue.trim() === '' ? null : parseFloat(scoreValue);
        
        if (score !== null && (isNaN(score) || score < 0 || score > 100)) {
            alert('Please enter a valid score between 0 and 100');
            return;
        }
        
        icon.score = score;
    }

    // Legacy method for compatibility with onclick handlers in UI
    removeFromSidebar(iconRef) {
        this.uiManager.removeFromSidebar(iconRef);
    }

    // Legacy method for compatibility with onclick handlers in UI
    closeFocusModal() {
        this.uiManager.closeFocusModal();
    }

    saveLayout() {
        if (this.data.length === 0) {
            alert('No data loaded - cannot save layout');
            return;
        }

        // Save current state to current mode's profile before exporting
        this.groupManager.saveCurrentStateToProfile(this.mode);

        // Create comprehensive layout data with all profiles
        const layoutData = {
            version: '2.0', // Updated version to indicate profile support
            timestamp: new Date().toISOString(),
            currentMode: this.mode,
            canvas: {
                panX: this.panX,
                panY: this.panY,
                zoom: this.zoom
            },
            profiles: {}
        };

        // Save all three profiles
        Object.keys(this.profiles).forEach(mode => {
            const profile = this.profiles[mode];
            if (profile.initialized) {
                layoutData.profiles[mode] = {
                    initialized: true,
                    groups: profile.groups,
                    iconStates: profile.iconStates,
                    selectedIcons: profile.selectedIcons
                };
            } else {
                layoutData.profiles[mode] = {
                    initialized: false,
                    groups: [],
                    iconStates: [],
                    selectedIcons: []
                };
            }
        });

        // Download as JSON file
        const blob = new Blob([JSON.stringify(layoutData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pokemon_layout_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        console.log('Layout saved successfully');
    }

    async loadLayout(file) {
        if (!file) return;
        
        if (this.data.length === 0) {
            alert('Please load Pokemon data first before loading a layout');
            return;
        }

        try {
            const text = await file.text();
            const layoutData = JSON.parse(text);
            
            if (!layoutData.version) {
                alert('Invalid layout file format');
                return;
            }

            // Clear current state
            this.uiManager.clearSidebar();
            this.groups = [];
            this.selectedIcons = [];

            // Restore canvas state
            if (layoutData.canvas) {
                this.panX = layoutData.canvas.panX || 0;
                this.panY = layoutData.canvas.panY || 0;
                this.zoom = layoutData.canvas.zoom || 1.0;
                document.getElementById('zoomLevel').textContent = Math.round(this.zoom * 100) + '%';
            }

            if (layoutData.version === '2.0' && layoutData.profiles) {
                // New format with profiles
                this.loadProfileFormat(layoutData);
            } else {
                // Legacy format (v1.0) - load into current mode only
                this.loadLegacyFormat(layoutData);
            }

            this.canvasRenderer.render();
            console.log('Layout loaded successfully');
            alert('Layout loaded successfully!');

            // Clear the file input
            document.getElementById('layoutInput').value = '';

        } catch (error) {
            console.error('Error loading layout:', error);
            alert('Error loading layout file. Please check the file format.');
        }
    }

    loadProfileFormat(layoutData) {
        // Load all profiles
        Object.keys(layoutData.profiles).forEach(mode => {
            const profileData = layoutData.profiles[mode];
            if (profileData && profileData.initialized) {
                this.profiles[mode] = {
                    initialized: true,
                    groups: profileData.groups || [],
                    iconStates: profileData.iconStates || [],
                    selectedIcons: profileData.selectedIcons || []
                };
            } else {
                this.profiles[mode] = {
                    initialized: false,
                    groups: [],
                    iconStates: [],
                    selectedIcons: []
                };
            }
        });

        // Set current mode and load its state
        this.mode = layoutData.currentMode || 'free';
        document.getElementById('modeSelect').value = this.mode;
        this.groupManager.loadProfileState(this.mode);
    }

    loadLegacyFormat(layoutData) {
        // For legacy format, load into the current mode's profile
        this.mode = layoutData.mode || 'free';
        document.getElementById('modeSelect').value = this.mode;

        // Reset all profiles
        this.profiles = {
            free: { groups: [], iconStates: [], selectedIcons: [], initialized: false },
            score: { groups: [], iconStates: [], selectedIcons: [], initialized: false },
            speed: { groups: [], iconStates: [], selectedIcons: [], initialized: false }
        };

        // Recreate all icons from current data (reset positions and properties)
        this.groupManager.createIcons();

        // Create a mapping from dataIndex to icon for easy lookup
        const iconsByDataIndex = {};
        this.icons.forEach(icon => {
            iconsByDataIndex[icon.dataIndex] = icon;
        });

        // Restore groups
        if (layoutData.groups && layoutData.groups.length > 0) {
            this.groups = layoutData.groups.map(groupData => ({
                id: groupData.id,
                name: groupData.name,
                field: groupData.field,
                value: groupData.value,
                x: groupData.x,
                y: groupData.y,
                color: groupData.color,
                locked: groupData.locked,
                autoArranged: groupData.autoArranged,
                bounds: { ...groupData.bounds },
                icons: [] // Will be populated when we restore icon assignments
            }));
        }

        // Restore icon states and positions
        if (layoutData.icons) {
            layoutData.icons.forEach(iconData => {
                let targetIcon = null;

                if (iconData.isCombined) {
                    // For combined icons, we need to recreate them
                    const originalIcons = iconData.originalIconDataIndices
                        .map(dataIndex => iconsByDataIndex[dataIndex])
                        .filter(icon => icon);

                    if (originalIcons.length > 1) {
                        const species = originalIcons[0].data.Species;
                        const setNumbers = originalIcons.map(icon => icon.data['Set#']).sort((a, b) => a - b);
                        const combinedLabel = `${species}-${setNumbers.join('/')}`;
                        
                        const textWidth = this.groupManager.calculateTextWidth(combinedLabel);
                        const combinedWidth = Math.max(35, textWidth + 12);
                        
                        const combinedIcon = {
                            id: iconData.id,
                            dataIndex: originalIcons[0].dataIndex,
                            data: originalIcons[0].data,
                            combinedData: originalIcons.map(icon => icon.data),
                            originalIcons: originalIcons,
                            x: iconData.x,
                            y: iconData.y,
                            width: combinedWidth,
                            height: this.iconHeight,
                            label: combinedLabel,
                            selected: iconData.selected,
                            groupId: iconData.groupId,
                            tierNumber: iconData.tierNumber,
                            score: iconData.score,
                            types: originalIcons[0].types,
                            isCombined: true,
                            setCount: originalIcons.length,
                            baseStats: originalIcons[0].baseStats,
                            evs: originalIcons[0].evs
                        };

                        // Remove original icons from the main array
                        originalIcons.forEach(origIcon => {
                            const index = this.icons.indexOf(origIcon);
                            if (index > -1) {
                                this.icons.splice(index, 1);
                            }
                        });

                        // Add combined icon
                        this.icons.push(combinedIcon);
                        targetIcon = combinedIcon;
                    }
                } else {
                    // Regular icon - find by dataIndex
                    targetIcon = iconsByDataIndex[iconData.dataIndex];
                }

                if (targetIcon) {
                    // Restore icon properties
                    targetIcon.x = iconData.x;
                    targetIcon.y = iconData.y;
                    targetIcon.selected = iconData.selected;
                    targetIcon.groupId = iconData.groupId;
                    targetIcon.tierNumber = iconData.tierNumber;
                    targetIcon.score = iconData.score;
                    // Legacy files may have individual IV/Level, but we now use global settings

                    // Add to selected icons if selected
                    if (iconData.selected) {
                        this.selectedIcons.push(targetIcon);
                        this.uiManager.addToSidebar(targetIcon);
                    }

                    // Add to group if assigned
                    if (iconData.groupId !== null && this.groups[iconData.groupId]) {
                        this.groups[iconData.groupId].icons.push(targetIcon);
                    }
                }
            });
        }

        // Save this loaded state to the current mode's profile
        this.groupManager.saveCurrentStateToProfile(this.mode);

        // Update UI
        this.uiManager.updateGroupList();
        this.uiManager.updateCounts();
    }

    exportCSV() {
        if (this.data.length === 0) {
            alert('No data to export');
            return;
        }

        // Make sure current state is saved before export
        this.groupManager.saveCurrentStateToProfile(this.mode);

        const exportData = this.data.map((row, index) => {
            const icon = this.icons.find(i => i.dataIndex === index);
            return {
                ...row,
                TierNumber: icon ? icon.tierNumber : null,
                Score: icon ? icon.score : null,
                GroupName: icon && icon.groupId !== null ? this.groups[icon.groupId].name : null,
                Mode: this.mode // Add current mode to export
            };
        });

        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pokemon_tiers_${this.mode}_mode.csv`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
}

// Initialize the tool when the page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit to ensure all scripts are loaded
    setTimeout(() => {
        if (typeof CanvasRenderer !== 'undefined' && 
            typeof GroupManager !== 'undefined' && 
            typeof UIManager !== 'undefined') {
            window.tool = new PokemonTierTool();
        } else {
            console.error('Required classes not loaded. Check that all script files are present and loading correctly.');
        }
    }, 100);
});