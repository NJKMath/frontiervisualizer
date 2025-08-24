// Version 2.17 - Added advanced filtering system with boolean query support
// User interface management methods
class UIManager {
    constructor(tool) {
        this.tool = tool;
        this.speedValueRowCount = 1; // Track number of speed value rows
        this.speedModeActiveGroup = null; // Track active group in Speed Mode
        this.markedForCombineGroupId = null; // Track which group is marked for combination
        this.advancedGroupCounter = 0; // Track advanced groups for naming
        this.speedBoostMultipliers = {
            '-6': 2/8,   // 0.25
            '-5': 2/7,   // ~0.286
            '-4': 2/6,   // ~0.333
            '-3': 2/5,   // 0.4
            '-2': 2/4,   // 0.5
            '-1': 2/3,   // ~0.667
            '0': 2/2,    // 1.0
            '1': 3/2,    // 1.5
            '2': 4/2,    // 2.0
            '3': 5/2,    // 2.5
            '4': 6/2,    // 3.0
            '5': 7/2,    // 3.5
            '6': 8/2     // 4.0
        };
        this.speedHighlightColors = [
            '#ff5722', // Deep Orange
            '#9c27b0', // Purple
            '#2196f3', // Blue
            '#e91e63', // Pink
            '#ff9800', // Orange
            '#00bcd4', // Cyan
            '#795548', // Brown
            '#607d8b'  // Blue Grey
        ];
        this.setupSpeedValueEvents();
    }

    setupSpeedValueEvents() {
        // Add speed value button
        document.getElementById('addSpeedValueBtn').addEventListener('click', () => {
            this.addSpeedValueRow();
        });
        
        // Initial setup for first row input and boost select
        const firstRow = document.querySelector('.speed-value-row');
        this.setupSpeedValueRow(firstRow, 0);
    }

    setupSpeedValueRow(row, colorIndex) {
        const input = row.querySelector('.speed-value-input');
        const boostSelect = row.querySelector('.speed-boost-select');
        const colorIndicator = row.querySelector('.speed-color-indicator');
        
        // Set the color indicator
        if (colorIndicator) {
            colorIndicator.style.backgroundColor = this.speedHighlightColors[colorIndex % this.speedHighlightColors.length];
        }
        
        // Setup event listeners
        input.addEventListener('input', () => {
            this.updateSpeedHighlights();
        });
        
        input.addEventListener('change', () => {
            this.updateSpeedHighlights();
        });
        
        boostSelect.addEventListener('change', () => {
            this.updateSpeedHighlights();
        });
    }

    addSpeedValueRow() {
        const rowsContainer = document.getElementById('speedValueRows');
        const newRow = document.createElement('div');
        newRow.className = 'speed-value-row';
        newRow.style.cssText = 'display: flex; align-items: center; gap: 6px; margin-bottom: 5px;';
        
        const colorIndex = this.speedValueRowCount;
        const backgroundColor = this.speedHighlightColors[colorIndex % this.speedHighlightColors.length];
        
        newRow.innerHTML = `
            <div class="speed-color-indicator speed-deletable" style="width: 14px; height: 14px; background-color: ${backgroundColor}; border: 1px solid #333; border-radius: 2px; flex-shrink: 0; cursor: pointer; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 9px; text-shadow: 1px 1px 1px rgba(0,0,0,0.5);">&times;</div>
            <label style="font-weight: bold;">Value:</label>
            <input type="number" min="0" max="999" step="1" class="speed-value-input" 
                   style="width: 30px !important; padding: 2px;" placeholder="000">
            <label style="font-weight: bold; margin-left: 2px;">Boost:</label>
            <select class="speed-boost-select" style="width: 45px; padding: 2px;">
                <option value="6">+6</option>
                <option value="5">+5</option>
                <option value="4">+4</option>
                <option value="3">+3</option>
                <option value="2">+2</option>
                <option value="1">+1</option>
                <option value="0" selected>0</option>
                <option value="-1">-1</option>
                <option value="-2">-2</option>
                <option value="-3">-3</option>
                <option value="-4">-4</option>
                <option value="-5">-5</option>
                <option value="-6">-6</option>
            </select>
        `;
        
        rowsContainer.appendChild(newRow);
        this.speedValueRowCount++;
        
        // Setup event listeners for new row
        this.setupSpeedValueRow(newRow, colorIndex);
        
        // Setup delete functionality on the color indicator
        const colorIndicator = newRow.querySelector('.speed-deletable');
        colorIndicator.addEventListener('click', () => {
            this.removeSpeedValueRow(newRow);
        });
    }

    removeSpeedValueRow(row) {
        // Clear any highlights from this row's speed value first
        const input = row.querySelector('.speed-value-input');
        const boostSelect = row.querySelector('.speed-boost-select');
        const baseSpeed = parseInt(input.value);
        const boostValue = parseInt(boostSelect.value);
        
        if (!isNaN(baseSpeed)) {
            const boostedSpeed = this.calculateBoostedSpeed(baseSpeed, boostValue);
            this.clearSpeedHighlight(boostedSpeed);
        }
        
        row.remove();
        this.speedValueRowCount--;
        this.updateSpeedHighlights(); // Refresh remaining highlights
    }

    calculateBoostedSpeed(baseSpeed, boostValue) {
        const multiplier = this.speedBoostMultipliers[boostValue.toString()] || 1.0;
        return Math.floor(baseSpeed * multiplier);
    }

    showSpeedValueSection() {
        document.getElementById('speedValueSection').style.display = 'block';
        
        // Load Speed Mode group if one exists
        this.loadSpeedModeGroup();
    }

    loadSpeedModeGroup() {
        const speedProfile = this.tool.profiles['speed'];
        if (speedProfile && speedProfile.speedModeGroup) {
            // Store the group data directly
            this.speedModeActiveGroup = {
                id: speedProfile.speedModeGroup.id,
                name: speedProfile.speedModeGroup.name,
                color: speedProfile.speedModeGroup.color,
                iconDataIndices: speedProfile.speedModeGroup.iconDataIndices
            };
            
            // Apply group highlights immediately
            this.applySpeedModeGroupHighlights();
            console.log('Speed Mode group loaded and highlighted:', this.speedModeActiveGroup);
        } else {
            this.speedModeActiveGroup = null;
            console.log('No Speed Mode group to load');
        }
    }

    hideSpeedValueSection() {
        document.getElementById('speedValueSection').style.display = 'none';
        this.clearAllSpeedHighlights();
    }

    updateSpeedHighlights() {
        if (this.tool.mode !== 'speed') return;
        
        // Clear all existing speed highlights
        this.clearAllSpeedHighlights();
        
        // Get all speed values from inputs and boost selects
        const speedRows = document.querySelectorAll('.speed-value-row');
        const speedValues = [];
        
        speedRows.forEach((row, index) => {
            const input = row.querySelector('.speed-value-input');
            const boostSelect = row.querySelector('.speed-boost-select');
            
            const baseSpeed = parseInt(input.value);
            const boostValue = parseInt(boostSelect.value) || 0;
            
            if (!isNaN(baseSpeed) && baseSpeed >= 0) {
                const boostedSpeed = this.calculateBoostedSpeed(baseSpeed, boostValue);
                speedValues.push({
                    originalSpeed: baseSpeed,
                    boostedSpeed: boostedSpeed,
                    boost: boostValue,
                    colorIndex: index
                });
            }
        });
        
        // Process each speed value
        speedValues.forEach((speedData) => {
            this.processSpeedValue(speedData.boostedSpeed, speedData.colorIndex, speedData.originalSpeed, speedData.boost);
        });
        
        // Re-render canvas to show highlights
        this.tool.canvasRenderer.render();
    }

    processSpeedValue(boostedSpeed, colorIndex, originalSpeed = null, boost = 0) {
        // Find icons with matching speed
        const matchingIcons = this.tool.icons.filter(icon => {
            if (icon.isSpeedPlaceholder) return false; // Skip existing placeholders
            const iconSpeed = this.tool.groupManager.calculateSPEStat(icon);
            return iconSpeed === boostedSpeed;
        });
        
        if (matchingIcons.length > 0) {
            // Highlight existing icons
            matchingIcons.forEach(icon => {
                icon.speedHighlight = colorIndex % 8; // Use modulo for color cycling
            });
            
            // Remove any existing placeholder for this speed
            this.removeSpeedPlaceholder(boostedSpeed);
        } else {
            // Create placeholder icon
            this.createSpeedPlaceholder(boostedSpeed, colorIndex % 8, originalSpeed, boost);
        }
    }

    createSpeedPlaceholder(boostedSpeed, colorIndex, originalSpeed = null, boost = 0) {
        // Remove existing placeholder for this speed first
        this.removeSpeedPlaceholder(boostedSpeed);
        
        // Create label showing boost information if applicable
        let label;
        if (originalSpeed !== null && boost !== 0) {
            const boostSign = boost > 0 ? '+' : '';
            label = `${originalSpeed} (${boostSign}${boost}) → ${boostedSpeed} Speed`;
        } else {
            label = `${boostedSpeed} Speed`;
        }
        
        const textWidth = this.tool.groupManager.calculateTextWidth(label);
        const iconWidth = Math.max(35, textWidth + 12);
        
        const placeholder = {
            id: `speed-placeholder-${boostedSpeed}`,
            dataIndex: -boostedSpeed, // Negative to avoid conflicts
            data: { Species: 'Speed Placeholder', 'Set#': 1 },
            x: 0,
            y: 0,
            width: iconWidth,
            height: this.tool.iconHeight,
            label: label,
            selected: false,
            groupId: null,
            tierNumber: null,
            score: null,
            types: [],
            baseStats: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: boostedSpeed },
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
            isSpeedPlaceholder: true,
            speedHighlight: colorIndex
        };
        
        this.tool.icons.push(placeholder);
        
        // Rearrange all ungrouped icons to properly position the placeholder
        const ungroupedIcons = this.tool.icons.filter(icon => icon.groupId === null);
        this.tool.groupManager.positionIconsBySpeed(ungroupedIcons);
    }

    removeSpeedPlaceholder(boostedSpeed) {
        const hadPlaceholder = this.tool.icons.some(icon => 
            icon.isSpeedPlaceholder && icon.baseStats && icon.baseStats.spe === boostedSpeed
        );
        
        this.tool.icons = this.tool.icons.filter(icon => 
            !(icon.isSpeedPlaceholder && icon.baseStats && icon.baseStats.spe === boostedSpeed)
        );
        
        // If we removed a placeholder, rearrange remaining icons to close gaps
        if (hadPlaceholder) {
            const ungroupedIcons = this.tool.icons.filter(icon => icon.groupId === null);
            this.tool.groupManager.positionIconsBySpeed(ungroupedIcons);
        }
    }

    clearSpeedHighlight(boostedSpeed) {
        // Remove highlights for specific speed value
        this.tool.icons.forEach(icon => {
            if (!icon.isSpeedPlaceholder) {
                const iconSpeed = this.tool.groupManager.calculateSPEStat(icon);
                if (iconSpeed === boostedSpeed) {
                    delete icon.speedHighlight;
                }
            }
        });
        
        // Remove placeholder for this speed
        this.removeSpeedPlaceholder(boostedSpeed);
    }

    clearAllSpeedHighlights() {
        // Remove all speed highlights and placeholders
        this.tool.icons.forEach(icon => {
            delete icon.speedHighlight;
        });
        
        // Remove all speed placeholders
        this.tool.icons = this.tool.icons.filter(icon => !icon.isSpeedPlaceholder);
        
        this.tool.canvasRenderer.render();
    }

    getNatureModifier(nature, stat) {
        // Nature stat modifiers
        const natureEffects = {
            'Hardy': {}, 'Docile': {}, 'Serious': {}, 'Bashful': {}, 'Quirky': {}, // Neutral natures
            'Lonely': { atk: 1.1, def: 0.9 }, 'Brave': { atk: 1.1, spe: 0.9 }, 'Adamant': { atk: 1.1, spa: 0.9 }, 'Naughty': { atk: 1.1, spd: 0.9 },
            'Bold': { def: 1.1, atk: 0.9 }, 'Relaxed': { def: 1.1, spe: 0.9 }, 'Impish': { def: 1.1, spa: 0.9 }, 'Lax': { def: 1.1, spd: 0.9 },
            'Timid': { spe: 1.1, atk: 0.9 }, 'Hasty': { spe: 1.1, def: 0.9 }, 'Jolly': { spe: 1.1, spa: 0.9 }, 'Naive': { spe: 1.1, spd: 0.9 },
            'Modest': { spa: 1.1, atk: 0.9 }, 'Mild': { spa: 1.1, def: 0.9 }, 'Quiet': { spa: 1.1, spe: 0.9 }, 'Rash': { spa: 1.1, spd: 0.9 },
            'Calm': { spd: 1.1, atk: 0.9 }, 'Gentle': { spd: 1.1, def: 0.9 }, 'Sassy': { spd: 1.1, spe: 0.9 }, 'Careful': { spd: 1.1, spa: 0.9 }
        };
        
        const natureEffect = natureEffects[nature] || {};
        return natureEffect[stat] || 1.0;
    }

    calculateStats(icon) {
        if (!icon.baseStats || !icon.evs) {
            return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        }
        
        const base = icon.baseStats;
        const evs = icon.evs;
        const ivs = this.tool.globalIVs;
        const level = this.tool.globalLevel;
        const nature = icon.data.Nature || 'Hardy';
        
        // HP calculation: ⌊(2×Base+IV+⌊EV/4⌋)×Level/100⌋+Level+10
        const hp = Math.floor((2 * base.hp + ivs + Math.floor(evs.hp / 4)) * level / 100) + level + 10;
        
        // Other stats: ⌊(⌊(2×Base+IV+⌊EV/4⌋)×Level/100⌋+5)×Nature⌋
        const stats = {};
        ['atk', 'def', 'spa', 'spd', 'spe'].forEach(stat => {
            const baseStat = Math.floor((2 * base[stat] + ivs + Math.floor(evs[stat] / 4)) * level / 100) + 5;
            const natureModifier = this.getNatureModifier(nature, stat);
            stats[stat] = Math.floor(baseStat * natureModifier);
        });
        
        return { hp, ...stats };
    }

    selectIcon(icon) {
        const isAlreadySelected = icon.selected;
        
        if (isAlreadySelected) {
            icon.selected = false;
            this.tool.selectedIcons = this.tool.selectedIcons.filter(i => i.id !== icon.id);
            this.removeFromSidebar(icon.isCombined ? {dataIndex: icon.id} : {dataIndex: icon.dataIndex});
        } else {
            icon.selected = true;
            
            const alreadyInSelection = this.tool.selectedIcons.some(i => i.id === icon.id);
            if (!alreadyInSelection) {
                this.tool.selectedIcons.push(icon);
                this.addToSidebar(icon);
            }
        }
        
        // Don't re-render in Speed Mode to avoid losing combined icons
        if (this.tool.mode !== 'speed') {
            this.tool.canvasRenderer.render();
        }
    }

    addToSidebar(icon) {
        const sidebar = document.getElementById('sidebarContent');
        
        const elementId = icon.isCombined ? 
            `info-${icon.id.replace(/[^a-zA-Z0-9-]/g, '-')}` : 
            `info-${icon.dataIndex}`;
        
        if (document.getElementById(elementId)) {
            return;
        }
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'icon-info';
        infoDiv.id = elementId;
        
        if (icon.isCombined) {
            let combinedHtml = `
                <button class="close-btn" onclick="window.tool?.uiManager.removeFromSidebar({dataIndex: '${icon.id}'})">&times;</button>
                <h3>${icon.label} (${icon.setCount} sets)</h3>
                <div style="font-size: 11px; color: #666; margin-bottom: 8px;">Combined sets with same speed</div>
            `;
            
            // Only show score input in Score Mode
            if (this.tool.mode === 'score') {
                combinedHtml += `
                    <div style="margin-bottom: 8px;">
                        <label style="font-weight: bold; margin-right: 8px;">Score:</label>
                        <input type="number" min="0" max="100" step="1" value="${icon.score || ''}" 
                               style="width: 30px; padding: 2px;" 
                               onchange="window.tool?.updateIconScore('${icon.id}', this.value)">
                    </div>
                `;
            }
            
            icon.combinedData.forEach((data, index) => {
                const moves = [
                    data['Move 1'],
                    data['Move 2'], 
                    data['Move 3'],
                    data['Move 4']
                ].filter(Boolean);
                
                const movesHtml = moves.length > 0 ? 
                    moves.map(move => `<div class="detail">${move}</div>`).join('') :
                    '<div class="detail">No moves</div>';
                
                // Calculate stats for this set
                const tempIcon = { ...icon, data: data };
                const stats = this.calculateStats(tempIcon);
                
                combinedHtml += `
                    <div style="border-top: 1px solid #eee; padding-top: 8px; margin-top: 8px;">
                        <h4 style="font-size: 12px; margin-bottom: 4px;">Set ${data['Set#']}</h4>
                        <div class="icon-info-content">
                            <div>
                                <div class="detail"><strong>Type:</strong> ${data.Type || 'N/A'}</div>
                                <div class="detail"><strong>Nature:</strong> ${data.Nature || 'N/A'}</div>
                                <div class="detail"><strong>Item:</strong> ${data.Item || 'N/A'}</div>
                                <div class="detail"><strong>Ability:</strong> ${data['Possible Ability'] || 'N/A'}</div>
                            </div>
                            <div>
                                <div class="detail"><strong>Moves:</strong></div>
                                ${movesHtml}
                            </div>
                        </div>
                        <div style="margin-top: 6px; font-size: 12px; color: #666;">
                            <div>HP: ${stats.hp} ATK: ${stats.atk} DEF: ${stats.def}</div>
                            <div>SPA: ${stats.spa} SPD: ${stats.spd} SPE: ${stats.spe}</div>
                        </div>
                    </div>
                `;
            });
            
            infoDiv.innerHTML = combinedHtml;
        } else {
            const moves = [
                icon.data['Move 1'],
                icon.data['Move 2'], 
                icon.data['Move 3'],
                icon.data['Move 4']
            ].filter(Boolean);
            
            const movesHtml = moves.length > 0 ? 
                moves.map(move => `<div class="detail">${move}</div>`).join('') :
                '<div class="detail">No moves</div>';
            
            // Calculate stats
            const stats = this.calculateStats(icon);
            
            let regularHtml = `
                <button class="close-btn" onclick="window.tool?.uiManager.removeFromSidebar({dataIndex: ${icon.dataIndex}})">&times;</button>
                <h3>${icon.label}</h3>
            `;
            
            // Only show score input in Score Mode
            if (this.tool.mode === 'score') {
                regularHtml += `
                    <div style="margin-bottom: 8px;">
                        <label style="font-weight: bold; margin-right: 8px;">Score:</label>
                        <input type="number" min="0" max="100" step="1" value="${icon.score || ''}" 
                               style="width: 30px; padding: 2px;" 
                               onchange="window.tool?.updateIconScore(${icon.dataIndex}, this.value)">
                    </div>
                `;
            }
            
            regularHtml += `
                <div class="icon-info-content">
                    <div>
                        <div class="detail"><strong>Type:</strong> ${icon.data.Type || 'N/A'}</div>
                        <div class="detail"><strong>Nature:</strong> ${icon.data.Nature || 'N/A'}</div>
                        <div class="detail"><strong>Item:</strong> ${icon.data.Item || 'N/A'}</div>
                        <div class="detail"><strong>Ability:</strong> ${icon.data['Possible Ability'] || 'N/A'}</div>
                    </div>
                    <div>
                        <div class="detail"><strong>Moves:</strong></div>
                        ${movesHtml}
                    </div>
                </div>
                <div style="margin-top: 6px; font-size: 12px; color: #666;">
                    <div>HP: ${stats.hp} ATK: ${stats.atk} DEF: ${stats.def}</div>
                    <div>SPA: ${stats.spa} SPD: ${stats.spd} SPE: ${stats.spe}</div>
                </div>
            `;
            
            infoDiv.innerHTML = regularHtml;
        }
        
        sidebar.appendChild(infoDiv);
    }

    removeFromSidebar(iconRef) {
        const elementId = typeof iconRef.dataIndex === 'string' ? 
            `info-${iconRef.dataIndex.replace(/[^a-zA-Z0-9-]/g, '-')}` : 
            `info-${iconRef.dataIndex}`;
            
        const element = document.getElementById(elementId);
        if (element) {
            element.remove();
        }
        
        const icon = this.tool.icons.find(i => 
            i.id === iconRef.dataIndex || i.dataIndex === iconRef.dataIndex
        );
        if (icon) {
            icon.selected = false;
            this.tool.selectedIcons = this.tool.selectedIcons.filter(i => i.id !== icon.id);
        }
        
        // Don't re-render in Speed Mode to avoid losing combined icons
        if (this.tool.mode !== 'speed') {
            this.tool.canvasRenderer.render();
        }
    }

    clearSidebar() {
        document.getElementById('sidebarContent').innerHTML = 
            '<p>Click on Pokemon icons to view details here.</p>';
        this.tool.selectedIcons.forEach(icon => icon.selected = false);
        this.tool.selectedIcons = [];
        
        // Don't re-render in Speed Mode to avoid losing combined icons
        if (this.tool.mode !== 'speed') {
            this.tool.canvasRenderer.render();
        }
    }

    updateGroupList() {
        const groupList = document.getElementById('groupList');
        groupList.innerHTML = '';
        
        // Show regular groups
        this.tool.groups.forEach(group => {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'group-item';
            groupDiv.style.cssText = 'background: white; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 5px; display: flex; flex-direction: column; gap: 5px;';
            
            // First row: name/count, buttons
            const firstRow = document.createElement('div');
            firstRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
            
            const nameSection = document.createElement('div');
            nameSection.style.cssText = 'display: flex; align-items: center; gap: 8px;';
            
            const colorSpan = document.createElement('span');
            colorSpan.className = 'group-color';
            colorSpan.style.cssText = `width: 20px; height: 20px; border-radius: 3px; display: inline-block; background-color: ${group.color};`;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${group.name} (${group.icons.length})`;
            
            nameSection.appendChild(colorSpan);
            nameSection.appendChild(nameSpan);
            
            const buttonsSection = document.createElement('div');
            buttonsSection.style.cssText = 'display: flex; align-items: center; gap: 5px;';
            
            // Create focus button if in score mode and group has 36 or fewer members
            if (this.tool.mode === 'score' && group.icons.length <= 36 && group.icons.length > 0) {
                const focusBtn = document.createElement('button');
                focusBtn.className = 'group-focus-btn';
                focusBtn.textContent = 'Focus';
                focusBtn.onclick = () => this.openFocusModal(group.id);
                buttonsSection.appendChild(focusBtn);
            }
            
            // Create "Send to Speed Mode" button if in Free Mode and group has icons
            if (this.tool.mode === 'free' && group.icons.length > 0) {
                const sendBtn = document.createElement('button');
                sendBtn.className = 'send-to-speed-btn';
                sendBtn.textContent = 'Send to Speed';
                sendBtn.onclick = () => this.sendGroupToSpeedMode(group.id);
                buttonsSection.appendChild(sendBtn);
            }
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'close-btn';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = () => this.tool.groupManager.deleteGroup(group.id);
            buttonsSection.appendChild(deleteBtn);
            
            firstRow.appendChild(nameSection);
            firstRow.appendChild(buttonsSection);
            
            // Second row: lock checkbox, combine checkbox
            const secondRow = document.createElement('div');
            secondRow.style.cssText = 'display: flex; align-items: center; gap: 15px;';
            
            // Lock control
            const lockLabel = document.createElement('label');
            lockLabel.className = 'lock-control';
            const lockCheckbox = document.createElement('input');
            lockCheckbox.type = 'checkbox';
            lockCheckbox.checked = group.locked;
            lockCheckbox.onchange = (e) => this.tool.toggleGroupLock(group.id, e.target.checked);
            lockLabel.appendChild(lockCheckbox);
            lockLabel.appendChild(document.createTextNode(' Lock'));
            
            // Combine control
            const combineLabel = document.createElement('label');
            combineLabel.className = 'lock-control'; // Reuse same styling
            const combineCheckbox = document.createElement('input');
            combineCheckbox.type = 'checkbox';
            combineCheckbox.checked = this.markedForCombineGroupId === group.id;
            combineCheckbox.onchange = (e) => this.handleCombineCheckbox(group.id, e.target.checked);
            combineLabel.appendChild(combineCheckbox);
            combineLabel.appendChild(document.createTextNode(' Combine Group'));
            
            secondRow.appendChild(lockLabel);
            secondRow.appendChild(combineLabel);
            
            groupDiv.appendChild(firstRow);
            groupDiv.appendChild(secondRow);
            groupList.appendChild(groupDiv);
        });
        
        // Show Speed Mode group if in Speed Mode and one exists
        if (this.tool.mode === 'speed' && this.speedModeActiveGroup) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'group-item';
            groupDiv.style.cssText = 'background: white; border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 5px; display: flex; justify-content: space-between; align-items: center;';
            
            const nameSection = document.createElement('div');
            nameSection.style.cssText = 'display: flex; align-items: center; gap: 8px;';
            
            const colorSpan = document.createElement('span');
            colorSpan.className = 'group-color';
            colorSpan.style.cssText = `width: 20px; height: 20px; border-radius: 3px; display: inline-block; background-color: ${this.speedModeActiveGroup.color};`;
            
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${this.speedModeActiveGroup.name} (${this.speedModeActiveGroup.iconDataIndices.length}) - Speed Highlight`;
            
            nameSection.appendChild(colorSpan);
            nameSection.appendChild(nameSpan);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'close-btn';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = () => this.clearSpeedModeGroup();
            
            groupDiv.appendChild(nameSection);
            groupDiv.appendChild(deleteBtn);
            groupList.appendChild(groupDiv);
        }
    }

    handleCombineCheckbox(groupId, checked) {
        if (checked) {
            if (this.markedForCombineGroupId === null) {
                // First group marked for combination
                this.markedForCombineGroupId = groupId;
            } else if (this.markedForCombineGroupId !== groupId) {
                // Second group marked - combine them
                this.combineGroups(this.markedForCombineGroupId, groupId);
                this.markedForCombineGroupId = null; // Reset after combining
            }
        } else {
            // Unchecking - clear the marked group if it's this one
            if (this.markedForCombineGroupId === groupId) {
                this.markedForCombineGroupId = null;
            }
        }
    }

    combineGroups(groupId1, groupId2) {
        const group1 = this.tool.groups[groupId1];
        const group2 = this.tool.groups[groupId2];
        
        if (!group1 || !group2) return;
        
        // Combine the group names
        const combinedName = `${group1.name} + ${group2.name}`;
        
        // Move all icons from group2 to group1
        group2.icons.forEach(icon => {
            icon.groupId = groupId1;
            group1.icons.push(icon);
        });
        
        // Update group1 properties
        group1.name = combinedName;
        group1.field = 'combined'; // Mark as a combined group
        
        // Rearrange group1 to accommodate all icons
        if (this.tool.mode === 'score') {
            this.tool.groupManager.arrangeGroupIcons(group1);
        } else {
            // For non-score modes, find open spaces for all icons
            group1.icons.forEach(icon => {
                this.tool.groupManager.findOpenSpaceInGroup(icon, group1);
            });
            this.tool.groupManager.updateGroupBounds(group1);
        }
        
        // Delete group2
        this.tool.groups = this.tool.groups.filter(g => g.id !== groupId2);
        
        // Renumber groups to maintain sequential IDs
        this.tool.groups.forEach((g, index) => {
            const oldId = g.id;
            g.id = index;
            
            // Update icon groupId references
            this.tool.icons.forEach(icon => {
                if (icon.groupId === oldId) {
                    icon.groupId = index;
                }
            });
        });
        
        // Update UI
        this.updateGroupList();
        this.updateCounts();
        this.tool.canvasRenderer.render();
    }

    // Advanced Filter Methods
    openAdvancedFilterModal() {
        document.getElementById('advancedFilterModal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Reset the form
        document.getElementById('filterQuery').value = '';
        document.getElementById('filterMatchCount').textContent = '0';
    }

    closeAdvancedFilterModal() {
        document.getElementById('advancedFilterModal').style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    testAdvancedFilter() {
        const query = document.getElementById('filterQuery').value.trim();
        if (!query) {
            document.getElementById('filterMatchCount').textContent = '0';
            return;
        }
        
        try {
            const matchingIcons = this.executeAdvancedFilter(query);
            document.getElementById('filterMatchCount').textContent = matchingIcons.length.toString();
        } catch (error) {
            document.getElementById('filterMatchCount').textContent = 'Error: ' + error.message;
        }
    }

    createAdvancedGroup() {
        const query = document.getElementById('filterQuery').value.trim();
        if (!query) {
            alert('Please enter a filter query');
            return;
        }
        
        try {
            const matchingIcons = this.executeAdvancedFilter(query);
            
            if (matchingIcons.length === 0) {
                alert('No Pokemon match the current filter');
                return;
            }
            
            // Create the advanced group
            this.advancedGroupCounter++;
            const groupName = `Adv ${this.advancedGroupCounter}`;
            
            const groupPosition = this.tool.groupManager.findGroupPosition();
            const groupId = this.tool.groups.length;
            
            // Calculate bounds based on matching icons
            let minWidth = 140;
            let minHeight = 80;
            
            if (matchingIcons.length > 0) {
                const maxIconWidth = Math.max(...matchingIcons.map(icon => icon.width));
                
                if (this.tool.mode === 'score') {
                    const maxIconsPerColumn = 36;
                    const columnsNeeded = Math.ceil(matchingIcons.length / maxIconsPerColumn);
                    
                    if (columnsNeeded === 1) {
                        minWidth = Math.max(140, maxIconWidth + 30);
                    } else {
                        const columnWidth = maxIconWidth + this.tool.iconPadding;
                        minWidth = Math.max(140, columnsNeeded * columnWidth + 20);
                    }
                } else {
                    minWidth = Math.max(140, maxIconWidth * 2 + this.tool.iconPadding + 20);
                }
                
                minHeight = Math.max(80, this.tool.iconHeight * 2 + this.tool.iconPadding + 35);
            }
            
            const group = {
                id: groupId,
                name: groupName,
                field: 'advanced',
                value: query,
                x: groupPosition.x,
                y: groupPosition.y,
                color: this.tool.groupManager.getGroupColor(groupId),
                icons: [],
                autoArranged: false,
                locked: this.tool.mode === 'score',
                bounds: {
                    x: groupPosition.x - 10,
                    y: groupPosition.y - 25,
                    width: minWidth,
                    height: minHeight
                }
            };
            
            this.tool.groups.push(group);
            
            // Add matching icons to the group
            matchingIcons.forEach(icon => {
                icon.groupId = groupId;
                group.icons.push(icon);
            });
            
            // Arrange the group
            if (group.icons.length > 0) {
                this.tool.groupManager.initialArrangeGroupIcons(group);
                group.autoArranged = true;
                
                if (this.tool.mode === 'speed') {
                    this.tool.groupManager.arrangeIconsBySpeed();
                } else {
                    this.tool.groupManager.arrangeAllPoolIcons();
                }
            }
            
            this.updateGroupList();
            this.updateCounts();
            this.closeAdvancedFilterModal();
            
        } catch (error) {
            alert('Error in filter query: ' + error.message);
        }
    }

    executeAdvancedFilter(query) {
        // Only get ungrouped icons
        const availableIcons = this.tool.icons.filter(icon => icon.groupId === null);
        
        if (availableIcons.length === 0) {
            return [];
        }
        
        // Parse and execute the query
        const result = this.parseFilterQuery(query, availableIcons);
        return result;
    }

    parseFilterQuery(query, icons) {
        // Normalize the query - replace logical operators with symbols for easier parsing
        let normalizedQuery = query
            .replace(/\bAND\b/gi, ' && ')
            .replace(/\bOR\b/gi, ' || ')
            .replace(/\bNOT\b/gi, ' ! ');
        
        // Find all Type: and Move: expressions
        const expressions = [];
        const typeRegex = /Type:\s*([^&|!()]+)/gi;
        const moveRegex = /Move:\s*([^&|!()]+)/gi;
        
        let match;
        let exprIndex = 0;
        
        // Replace Type: expressions with placeholders
        while ((match = typeRegex.exec(normalizedQuery)) !== null) {
            const placeholder = `__TYPE_${exprIndex}__`;
            expressions[exprIndex] = {
                type: 'type',
                value: match[1].trim()
            };
            normalizedQuery = normalizedQuery.replace(match[0], placeholder);
            exprIndex++;
        }
        
        // Reset regex and Replace Move: expressions with placeholders
        const moveRegexReset = /Move:\s*([^&|!()]+)/gi;
        while ((match = moveRegexReset.exec(normalizedQuery)) !== null) {
            const placeholder = `__MOVE_${exprIndex}__`;
            expressions[exprIndex] = {
                type: 'move',
                value: match[1].trim()
            };
            normalizedQuery = normalizedQuery.replace(match[0], placeholder);
            exprIndex++;
        }
        
        // Filter icons based on the query
        return icons.filter(icon => {
            try {
                return this.evaluateFilterExpression(normalizedQuery, expressions, icon);
            } catch (error) {
                console.error('Error evaluating filter for icon:', icon.label, error);
                return false;
            }
        });
    }

    evaluateFilterExpression(expression, expressions, icon) {
        // Replace placeholders with actual boolean evaluations
        let evalExpression = expression;
        
        expressions.forEach((expr, index) => {
            let result = false;
            
            if (expr.type === 'type') {
                result = this.tool.groupManager.hasType(icon, expr.value);
            } else if (expr.type === 'move') {
                result = this.tool.groupManager.hasMove(icon, expr.value);
            }
            
            const placeholder = expr.type === 'type' ? `__TYPE_${index}__` : `__MOVE_${index}__`;
            evalExpression = evalExpression.replace(placeholder, result.toString());
        });
        
        // Clean up the expression for evaluation
        evalExpression = evalExpression
            .replace(/\s+/g, ' ')
            .trim();
        
        // Safely evaluate the boolean expression
        try {
            return Function('"use strict"; return (' + evalExpression + ')')();
        } catch (error) {
            throw new Error('Invalid query syntax');
        }
    }

    sendGroupToSpeedMode(groupId) {
        const group = this.tool.groups[groupId];
        if (!group || group.icons.length === 0) return;
        
        // Store the group data for Speed Mode (but don't switch modes)
        if (!this.tool.profiles['speed']) {
            this.tool.profiles['speed'] = { groups: [], iconStates: [], selectedIcons: [], initialized: false };
        }
        
        // Store the group data for Speed Mode (replaces any existing group)
        this.tool.profiles['speed'].speedModeGroup = {
            id: group.id,
            name: group.name,
            color: group.color,
            iconDataIndices: group.icons.map(icon => icon.dataIndex)
        };
        
        console.log('Group sent to Speed Mode:', this.tool.profiles['speed'].speedModeGroup);
    }

    applySpeedModeGroupHighlights() {
        if (!this.speedModeActiveGroup) {
            console.log('No Speed Mode active group to highlight');
            return;
        }
        
        console.log('Applying Speed Mode group highlights for:', this.speedModeActiveGroup.name);
        console.log('Group contains data indices:', this.speedModeActiveGroup.iconDataIndices);
        
        // Clear existing group highlights
        this.tool.icons.forEach(icon => {
            delete icon.speedGroupHighlight;
        });
        
        let highlightCount = 0;
        
        // Apply group highlights
        this.tool.icons.forEach(icon => {
            if (this.isIconInSpeedModeGroup(icon)) {
                icon.speedGroupHighlight = true;
                highlightCount++;
                console.log(`Highlighted icon: ${icon.label}`);
            }
        });
        
        console.log(`Applied highlights to ${highlightCount} icons`);
        this.tool.canvasRenderer.render();
    }

    isIconInSpeedModeGroup(icon) {
        if (!this.speedModeActiveGroup) return false;
        
        if (icon.isCombined) {
            // For combined icons, check if any component is in the group
            if (icon.originalIcons) {
                const result = icon.originalIcons.some(originalIcon => 
                    this.speedModeActiveGroup.iconDataIndices.includes(originalIcon.dataIndex)
                );
                if (result) {
                    console.log(`Combined icon ${icon.label} matches group via component icon with dataIndex:`, 
                        icon.originalIcons.find(orig => 
                            this.speedModeActiveGroup.iconDataIndices.includes(orig.dataIndex)
                        )?.dataIndex
                    );
                }
                return result;
            }
        } else {
            // For regular icons, check direct membership
            const result = this.speedModeActiveGroup.iconDataIndices.includes(icon.dataIndex);
            if (result) {
                console.log(`Regular icon ${icon.label} (dataIndex: ${icon.dataIndex}) matches group directly`);
            }
            return result;
        }
        
        return false;
    }

    clearSpeedModeGroup() {
        console.log('Clearing Speed Mode group...');
        
        // Clear the active group reference
        this.speedModeActiveGroup = null;
        
        // Clear group from Speed Mode profile
        if (this.tool.profiles['speed']) {
            delete this.tool.profiles['speed'].speedModeGroup;
        }
        
        // Clear group highlights from all icons
        this.tool.icons.forEach(icon => {
            delete icon.speedGroupHighlight;
        });
        
        // Update the group list display
        this.updateGroupList();
        
        // Re-render the canvas to show changes
        this.tool.canvasRenderer.render();
        
        console.log('Speed Mode group cleared successfully');
    }

    updateCounts() {
        const poolCount = this.tool.icons.filter(icon => 
            icon.groupId === null && icon.y >= this.tool.separatorY
        ).length;
        const groupedCount = this.tool.icons.filter(icon => icon.groupId !== null).length;
        
        let maxY = 0;
        this.tool.icons.forEach(icon => {
            maxY = Math.max(maxY, icon.y + icon.height);
        });
        
        document.getElementById('poolCount').textContent = poolCount;
        document.getElementById('groupedCount').textContent = groupedCount;
        document.getElementById('canvasUsage').textContent = `${maxY}/${this.tool.canvas.height}px`;
    }

    // Context Menu Methods
    hideContextMenu() {
        const menu = document.getElementById('contextMenu');
        if (menu) {
            menu.remove();
        }
        const scoreSubmenu = document.getElementById('scoreSubmenu');
        if (scoreSubmenu) {
            scoreSubmenu.remove();
        }
        const groupSubmenu = document.getElementById('groupSubmenu');
        if (groupSubmenu) {
            groupSubmenu.remove();
        }
        this.tool.contextMenuIcon = null;
    }

    handleRightClick(e) {
        e.preventDefault();
        const rect = this.tool.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) - this.tool.panX;
        const y = (e.clientY - rect.top) - this.tool.panY;

        for (let icon of this.tool.icons) {
            if (x >= icon.x && x <= icon.x + icon.width &&
                y >= icon.y && y <= icon.y + icon.height) {
                
                this.showContextMenu(e.clientX, e.clientY, icon);
                return;
            }
        }
        
        this.hideContextMenu();
    }

    showContextMenu(clientX, clientY, icon) {
        this.hideContextMenu();
        
        // In Speed Mode, don't show context menu - icons are locked to speed positions
        if (this.tool.mode === 'speed') {
            return;
        }
        
        const menu = document.createElement('div');
        menu.id = 'contextMenu';
        menu.style.cssText = `
            position: fixed;
            left: ${clientX}px;
            top: ${clientY}px;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            min-width: 150px;
        `;
        
        // Only show score assignment in Score Mode
        if (this.tool.mode === 'score') {
            const assignScoreItem = document.createElement('div');
            assignScoreItem.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #eee;
                position: relative;
            `;
            assignScoreItem.textContent = 'Assign Score >';
            assignScoreItem.addEventListener('mouseenter', () => {
                assignScoreItem.style.backgroundColor = '#f0f0f0';
                this.showScoreSubmenu(assignScoreItem, icon);
            });
            assignScoreItem.addEventListener('mouseleave', () => {
                assignScoreItem.style.backgroundColor = 'white';
            });
            
            menu.appendChild(assignScoreItem);
        }
        
        // Add "Remove from Group" option if icon is in a group
        if (icon.groupId !== null) {
            const removeFromGroupItem = document.createElement('div');
            removeFromGroupItem.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #eee;
            `;
            removeFromGroupItem.textContent = 'Remove from Group';
            removeFromGroupItem.addEventListener('mouseenter', () => {
                removeFromGroupItem.style.backgroundColor = '#f0f0f0';
            });
            removeFromGroupItem.addEventListener('mouseleave', () => {
                removeFromGroupItem.style.backgroundColor = 'white';
            });
            removeFromGroupItem.addEventListener('click', () => {
                this.removeIconFromGroup(icon);
                this.hideContextMenu();
            });
            
            menu.appendChild(removeFromGroupItem);
            
            // Add "Remove All from Group" option
            const removeAllFromGroupItem = document.createElement('div');
            removeAllFromGroupItem.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                border-bottom: 1px solid #eee;
            `;
            removeAllFromGroupItem.textContent = 'Remove All from Group';
            removeAllFromGroupItem.addEventListener('mouseenter', () => {
                removeAllFromGroupItem.style.backgroundColor = '#f0f0f0';
            });
            removeAllFromGroupItem.addEventListener('mouseleave', () => {
                removeAllFromGroupItem.style.backgroundColor = 'white';
            });
            removeAllFromGroupItem.addEventListener('click', () => {
                this.removeAllFromGroup(icon);
                this.hideContextMenu();
            });
            
            menu.appendChild(removeAllFromGroupItem);
        }
        
        if (this.tool.groups.length > 0) {
            const addToGroupItem = document.createElement('div');
            addToGroupItem.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                position: relative;
                border-bottom: 1px solid #eee;
            `;
            addToGroupItem.textContent = 'Add to Group >';
            addToGroupItem.addEventListener('mouseenter', () => {
                this.showGroupSubmenu(addToGroupItem, icon, false);
            });
            
            menu.appendChild(addToGroupItem);
            
            // Add "Move All to Group" option
            const moveAllToGroupItem = document.createElement('div');
            moveAllToGroupItem.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                position: relative;
            `;
            moveAllToGroupItem.textContent = 'Move All to Group >';
            moveAllToGroupItem.addEventListener('mouseenter', () => {
                this.showGroupSubmenu(moveAllToGroupItem, icon, true);
            });
            
            menu.appendChild(moveAllToGroupItem);
        }
        
        document.body.appendChild(menu);
        
        this.tool.contextMenuIcon = icon;
    }

    showScoreSubmenu(parentItem, icon) {
        const existingSubmenu = document.getElementById('scoreSubmenu');
        if (existingSubmenu) {
            existingSubmenu.remove();
        }
        
        const submenu = document.createElement('div');
        submenu.id = 'scoreSubmenu';
        submenu.style.cssText = `
            position: absolute;
            left: 100%;
            top: 0;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1001;
            min-width: 120px;
            padding: 8px;
        `;
        
        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;
        
        const label = document.createElement('label');
        label.textContent = 'Score (0-100):';
        label.style.cssText = `
            font-size: 12px;
            font-weight: bold;
        `;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = '100';
        input.step = '1';
        input.value = icon.score !== null ? icon.score : '';
        input.style.cssText = `
            width: 30px;
            padding: 4px;
            border: 1px solid #ccc;
            border-radius: 2px;
        `;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 4px;
        `;
        
        const setButton = document.createElement('button');
        setButton.textContent = 'Set';
        setButton.style.cssText = `
            padding: 4px 8px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 11px;
        `;
        setButton.addEventListener('click', () => {
            this.tool.updateIconScore(typeof icon.id === 'string' ? icon.id : icon.dataIndex, input.value);
            this.hideContextMenu();
        });
        
        const clearButton = document.createElement('button');
        clearButton.textContent = 'Clear';
        clearButton.style.cssText = `
            padding: 4px 8px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            font-size: 11px;
        `;
        clearButton.addEventListener('click', () => {
            this.tool.updateIconScore(typeof icon.id === 'string' ? icon.id : icon.dataIndex, '');
            this.hideContextMenu();
        });
        
        buttonContainer.appendChild(setButton);
        buttonContainer.appendChild(clearButton);
        
        inputContainer.appendChild(label);
        inputContainer.appendChild(input);
        inputContainer.appendChild(buttonContainer);
        submenu.appendChild(inputContainer);
        
        parentItem.appendChild(submenu);
        
        // Focus the input
        setTimeout(() => input.focus(), 50);
        
        // Handle Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                setButton.click();
            }
        });
    }

    showGroupSubmenu(parentItem, icon, moveAll = false) {
        const existingSubmenu = document.getElementById('groupSubmenu');
        if (existingSubmenu) {
            existingSubmenu.remove();
        }
        
        const submenu = document.createElement('div');
        submenu.id = 'groupSubmenu';
        submenu.style.cssText = `
            position: absolute;
            left: 100%;
            top: 0;
            background: white;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1001;
            min-width: 120px;
        `;
        
        this.tool.groups.forEach(group => {
            const groupItem = document.createElement('div');
            groupItem.style.cssText = `
                padding: 6px 10px;
                cursor: pointer;
                font-size: 12px;
                border-bottom: 1px solid #eee;
            `;
            groupItem.textContent = group.name;
            groupItem.addEventListener('mouseenter', () => {
                groupItem.style.backgroundColor = '#f0f0f0';
            });
            groupItem.addEventListener('mouseleave', () => {
                groupItem.style.backgroundColor = 'white';
            });
            groupItem.addEventListener('click', () => {
                if (moveAll) {
                    this.moveAllIconsToGroup(icon, group);
                } else {
                    this.addIconToGroup(icon, group);
                }
                this.hideContextMenu();
            });
            
            submenu.appendChild(groupItem);
        });
        
        parentItem.appendChild(submenu);
    }

    removeIconFromGroup(icon) {
        if (icon.groupId === null) return;
        
        const group = this.tool.groups[icon.groupId];
        if (!group) return;
        
        // Remove icon from group
        group.icons = group.icons.filter(i => i.id !== icon.id);
        this.tool.groupManager.updateGroupBounds(group);
        
        // Position icon based on mode and score
        icon.groupId = null;
        
        if (this.tool.mode === 'score' && icon.score !== null) {
            // Scored icons in Score Mode: position at score height in main area
            const scaleTop = 10;
            const scaleBottom = 766;
            const scaleHeight = 756;
            const maxScore = 100;
            const absoluteY = scaleBottom - (icon.score / maxScore) * scaleHeight;
            icon.y = Math.max(scaleTop, Math.min(scaleBottom - icon.height, absoluteY - icon.height / 2));
            
            // Position in main area horizontally
            const startX = this.tool.scaleWidth + 20;
            icon.x = startX;
        } else if (this.tool.mode !== 'speed') {
            // Unscored icons or non-Score modes: go to pool
            // In Speed Mode, icon stays where it is (locked to speed position)
            icon.y = this.tool.poolStartY;
        }
        
        // Rearrange ungrouped icons (but not in Speed Mode)
        if (this.tool.mode === 'speed') {
            // Speed Mode: no rearrangement, icons stay in speed positions
        } else {
            this.tool.groupManager.arrangeAllPoolIcons();
        }
        
        this.updateGroupList();
        this.updateCounts();
        this.tool.canvasRenderer.render();
    }

    removeAllFromGroup(referenceIcon) {
        if (referenceIcon.groupId === null) return;
        
        const group = this.tool.groups[referenceIcon.groupId];
        if (!group) return;
        
        const species = referenceIcon.data.Species;
        if (!species) return;
        
        // Find all icons in this specific group with the same species
        const sameSpeciesIconsInGroup = group.icons.filter(icon => 
            icon.data.Species === species
        );
        
        if (sameSpeciesIconsInGroup.length === 0) return;
        
        // Remove all matching icons from the group
        sameSpeciesIconsInGroup.forEach(icon => {
            // Remove from group
            group.icons = group.icons.filter(i => i.id !== icon.id);
            
            // Position icon based on mode and score
            icon.groupId = null;
            
            if (this.tool.mode === 'score' && icon.score !== null) {
                // Scored icons in Score Mode: position at score height in main area
                const scaleTop = 10;
                const scaleBottom = 766;
                const scaleHeight = 756;
                const maxScore = 100;
                const absoluteY = scaleBottom - (icon.score / maxScore) * scaleHeight;
                icon.y = Math.max(scaleTop, Math.min(scaleBottom - icon.height, absoluteY - icon.height / 2));
                
                // Position in main area horizontally
                const startX = this.tool.scaleWidth + 20;
                icon.x = startX;
            } else if (this.tool.mode !== 'speed') {
                // Unscored icons or non-Speed modes: go to pool
                // In Speed Mode, icon stays where it is (locked to speed position)
                icon.y = this.tool.poolStartY;
            }
        });
        
        this.tool.groupManager.updateGroupBounds(group);
        
        // Rearrange ungrouped icons (but not in Speed Mode)
        if (this.tool.mode === 'speed') {
            // Speed Mode: no rearrangement, icons stay in speed positions
        } else {
            this.tool.groupManager.arrangeAllPoolIcons();
        }
        
        this.updateGroupList();
        this.updateCounts();
        this.tool.canvasRenderer.render();
    }

    moveAllIconsToGroup(referenceIcon, targetGroup) {
        // Extract species name from the reference icon
        const species = referenceIcon.data.Species;
        if (!species) return;
        
        // Find all icons with the same species
        const sameSpeciesIcons = this.tool.icons.filter(icon => 
            icon.data.Species === species && !icon.isCombined
        );
        
        if (sameSpeciesIcons.length === 0) return;
        
        // Move each icon to the target group
        sameSpeciesIcons.forEach(icon => {
            // Remove from old group if any
            if (icon.groupId !== null) {
                const oldGroup = this.tool.groups[icon.groupId];
                oldGroup.icons = oldGroup.icons.filter(i => i.id !== icon.id);
                this.tool.groupManager.updateGroupBounds(oldGroup);
            }
            
            // Add to target group
            icon.groupId = targetGroup.id;
            targetGroup.icons.push(icon);
        });
        
        // Arrange the target group
        if (this.tool.mode === 'score') {
            this.tool.groupManager.arrangeGroupIcons(targetGroup);
        } else {
            // For non-score modes, find open spaces for all icons
            sameSpeciesIcons.forEach(icon => {
                this.tool.groupManager.findOpenSpaceInGroup(icon, targetGroup);
            });
            this.tool.groupManager.updateGroupBounds(targetGroup);
        }
        
        // Rearrange remaining ungrouped icons
        if (this.tool.mode === 'speed') {
            this.tool.groupManager.arrangeIconsBySpeed();
        } else {
            this.tool.groupManager.arrangeAllPoolIcons();
        }
        
        this.updateGroupList();
        this.updateCounts();
        this.tool.canvasRenderer.render();
    }

    addIconToGroup(icon, targetGroup) {
        if (icon.groupId !== null) {
            const oldGroup = this.tool.groups[icon.groupId];
            oldGroup.icons = oldGroup.icons.filter(i => i.id !== icon.id);
            this.tool.groupManager.updateGroupBounds(oldGroup);
        }
        
        icon.groupId = targetGroup.id;
        targetGroup.icons.push(icon);
        
        // In Score Mode, immediately rearrange by score; otherwise find open space
        if (this.tool.mode === 'score') {
            this.tool.groupManager.arrangeGroupIcons(targetGroup);
        } else {
            this.tool.groupManager.findOpenSpaceInGroup(icon, targetGroup);
            this.tool.groupManager.updateGroupBounds(targetGroup);
        }
        
        if (this.tool.mode === 'speed') {
            this.tool.groupManager.arrangeIconsBySpeed();
        } else {
            this.tool.groupManager.arrangeAllPoolIcons();
        }
        this.updateGroupList();
        this.updateCounts();
        this.tool.canvasRenderer.render();
    }

    // Focus Modal Functionality
    openFocusModal(groupId) {
        const group = this.tool.groups[groupId];
        if (!group || group.icons.length === 0 || group.icons.length > 36) {
            return;
        }

        this.tool.focusedGroup = group;
        this.tool.focusCardOrder = [...group.icons]; // Copy current order
        
        document.getElementById('focusModalTitle').textContent = `Focus: ${group.name}`;
        document.getElementById('focusModal').style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        this.createFocusGrid();
    }

    closeFocusModal() {
        if (this.tool.focusedGroup) {
            // Apply the new order back to the main group
            this.tool.focusedGroup.icons = [...this.tool.focusCardOrder];
            this.tool.groupManager.arrangeGroupIcons(this.tool.focusedGroup);
            this.tool.canvasRenderer.render();
        }
        
        document.getElementById('focusModal').style.display = 'none';
        document.body.style.overflow = 'auto'; // Restore scrolling
        this.tool.focusedGroup = null;
        this.tool.focusCardOrder = [];
        this.tool.draggedFocusCard = null;
    }

    createFocusGrid() {
        const grid = document.getElementById('focusGrid');
        grid.innerHTML = '';
        
        // Create 36 slots (4 rows × 9 columns)
        for (let i = 0; i < 36; i++) {
            const slot = document.createElement('div');
            slot.className = 'focus-card-slot';
            slot.style.cssText = `
                border: 2px dashed #ddd;
                border-radius: 6px;
                min-height: 120px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #999;
                font-size: 12px;
            `;
            
            // Add drop event listeners
            slot.addEventListener('dragover', this.handleFocusCardDragOver.bind(this));
            slot.addEventListener('drop', (e) => this.handleFocusCardDrop(e, i));
            
            if (i < this.tool.focusCardOrder.length) {
                const card = this.createFocusCard(this.tool.focusCardOrder[i], i);
                slot.appendChild(card);
                slot.style.border = 'none';
                slot.style.padding = '0';
            } else {
                slot.textContent = 'Empty';
            }
            
            grid.appendChild(slot);
        }
    }

    createFocusCard(icon, index) {
        const card = document.createElement('div');
        card.className = 'focus-card';
        card.draggable = true;
        card.dataset.index = index;
        
        // Add drag event listeners
        card.addEventListener('dragstart', this.handleFocusCardDragStart.bind(this));
        card.addEventListener('dragend', this.handleFocusCardDragEnd.bind(this));
        
        const moves = [
            icon.data['Move 1'],
            icon.data['Move 2'], 
            icon.data['Move 3'],
            icon.data['Move 4']
        ].filter(Boolean);
        
        const movesHtml = moves.length > 0 ? 
            moves.map(move => `<div class="detail">${move}</div>`).join('') :
            '<div class="detail">No moves</div>';
        
        // Calculate stats
        const stats = this.calculateStats(icon);
        
        // Calculate ranking (1-based index)
        const ranking = index + 1;
        
        let cardHtml = `
            <div style="position: relative;">
                <div style="position: absolute; top: 2px; right: 2px; background: #ff6b6b; color: white; 
                            border-radius: 3px; padding: 1px 4px; font-size: 10px; font-weight: bold;">
                    ${ranking}
                </div>
                <h4>${icon.label}</h4>
            </div>
            <div class="score-input">
                <label style="font-size: 11px; font-weight: bold;">Score:</label>
                <input type="number" min="0" max="100" step="1" value="${icon.score || ''}" 
                       onchange="window.tool?.updateFocusCardScore(${index}, this.value)">
            </div>
            <div class="focus-card-content">
                <div>
                    <div class="detail"><strong>Type:</strong> ${icon.data.Type || 'N/A'}</div>
                    <div class="detail"><strong>Nature:</strong> ${icon.data.Nature || 'N/A'}</div>
                    <div class="detail"><strong>Item:</strong> ${icon.data.Item || 'N/A'}</div>
                    <div class="detail"><strong>Ability:</strong> ${icon.data['Possible Ability'] || 'N/A'}</div>
                </div>
                <div class="moves-section">
                    <div class="detail"><strong>Moves:</strong></div>
                    ${movesHtml}
                </div>
            </div>
            <div class="stats-section" style="font-size: 12px;">
                <div>HP: ${stats.hp} ATK: ${stats.atk} DEF: ${stats.def}</div>
                <div>SPA: ${stats.spa} SPD: ${stats.spd} SPE: ${stats.spe}</div>
            </div>
        `;
        
        card.innerHTML = cardHtml;
        return card;
    }

    updateFocusCardScore(cardIndex, scoreValue) {
        const icon = this.tool.focusCardOrder[cardIndex];
        if (!icon) return;
        
        const score = scoreValue.trim() === '' ? null : parseFloat(scoreValue);
        
        if (score !== null && (isNaN(score) || score < 0 || score > 100)) {
            alert('Please enter a valid score between 0 and 100');
            return;
        }
        
        icon.score = score;
    }

    handleFocusCardDragStart(e) {
        const card = e.target.closest('.focus-card');
        const index = parseInt(card.dataset.index);
        
        this.tool.draggedFocusCard = {
            element: card,
            index: index,
            icon: this.tool.focusCardOrder[index]
        };
        
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', card.outerHTML);
    }

    handleFocusCardDragEnd(e) {
        if (this.tool.draggedFocusCard) {
            this.tool.draggedFocusCard.element.classList.remove('dragging');
        }
        
        // Remove drag-over styling from all slots
        document.querySelectorAll('.focus-card-slot').forEach(slot => {
            slot.classList.remove('drag-over');
        });
    }

    handleFocusCardDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Remove drag-over from all other slots
        document.querySelectorAll('.focus-card-slot').forEach(slot => {
            slot.classList.remove('drag-over');
        });
        
        const slot = e.target.closest('.focus-card-slot');
        if (slot) {
            slot.classList.add('drag-over');
        }
    }

    handleFocusCardDrop(e, targetIndex) {
        e.preventDefault();
        
        if (!this.tool.draggedFocusCard) return;
        
        const sourceIndex = this.tool.draggedFocusCard.index;
        
        if (sourceIndex === targetIndex) return;
        
        // Reorder the icons array
        const icon = this.tool.focusCardOrder.splice(sourceIndex, 1)[0];
        
        if (targetIndex >= this.tool.focusCardOrder.length) {
            this.tool.focusCardOrder.push(icon);
        } else {
            this.tool.focusCardOrder.splice(targetIndex, 0, icon);
        }
        
        // Recreate the grid with new order
        this.createFocusGrid();
        
        this.tool.draggedFocusCard = null;
    }

    updateSidebarStats(icon) {
        // Find the sidebar element for this icon
        const elementId = icon.isCombined ? 
            `info-${icon.id.replace(/[^a-zA-Z0-9-]/g, '-')}` : 
            `info-${icon.dataIndex}`;
        
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Re-add the complete sidebar content with updated stats
        element.remove();
        this.addToSidebar(icon);
    }

    updateFocusCardStats(cardIndex) {
        // Recreate the entire focus grid to ensure stats are updated
        this.createFocusGrid();
    }

    updateAllStats() {
        // Update all selected Pokemon in sidebar
        this.tool.selectedIcons.forEach(icon => {
            this.updateSidebarStats(icon);
        });
        
        // Update focus modal if open
        if (this.tool.focusedGroup) {
            this.createFocusGrid();
        }
        
        // In Speed Mode, rearrange icons when level changes to update positioning
        if (this.tool.mode === 'speed') {
            this.tool.groupManager.arrangeIconsBySpeed();
            // Note: Speed Mode group highlights are reapplied in the IV/Level event handlers
            // to avoid double application here
        } else {
            // Re-render canvas in other modes
            this.tool.canvasRenderer.render();
        }
    }
}