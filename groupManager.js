// Version 2.12 - Removed unused tierNumber code
// Group and icon management methods
class GroupManager {
    constructor(tool) {
        this.tool = tool;
    }

    calculateTextWidth(text) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = '11px Arial';
        return tempCtx.measureText(text).width;
    }

    saveCurrentStateToProfile(mode) {
        if (!this.tool.profiles[mode]) {
            this.tool.profiles[mode] = { groups: [], iconStates: [], selectedIcons: [], initialized: false };
        }
        
        // Save groups (deep copy)
        this.tool.profiles[mode].groups = this.tool.groups.map(group => ({
            id: group.id,
            name: group.name,
            field: group.field,
            value: group.value,
            x: group.x,
            y: group.y,
            color: group.color,
            locked: group.locked,
            autoArranged: group.autoArranged,
            bounds: group.bounds ? { ...group.bounds } : null,
            iconIds: group.icons.map(icon => icon.id) // Store icon IDs instead of references
        }));
        
        // Save icon states (positions, properties, etc.)
        this.tool.profiles[mode].iconStates = this.tool.icons.map(icon => ({
            id: icon.id,
            dataIndex: icon.dataIndex,
            x: icon.x,
            y: icon.y,
            width: icon.width,
            height: icon.height,
            label: icon.label,
            selected: icon.selected,
            groupId: icon.groupId,
            score: icon.score,
            types: [...icon.types],
            isCombined: icon.isCombined,
            setCount: icon.setCount,
            baseStats: icon.baseStats ? { ...icon.baseStats } : null,
            evs: icon.evs ? { ...icon.evs } : null,
            // For combined icons, save original icon data
            combinedData: icon.combinedData ? [...icon.combinedData] : null,
            originalIconDataIndices: icon.originalIcons ? 
                icon.originalIcons.map(orig => orig.dataIndex) : null
        }));
        
        // Save selected icons (by ID)
        this.tool.profiles[mode].selectedIcons = this.tool.selectedIcons.map(icon => icon.id);
        
        // Save Speed Mode group if in Speed Mode and one exists
        if (mode === 'speed' && this.tool.uiManager.speedModeActiveGroup) {
            this.tool.profiles[mode].speedModeGroup = {
                id: this.tool.uiManager.speedModeActiveGroup.id,
                name: this.tool.uiManager.speedModeActiveGroup.name,
                color: this.tool.uiManager.speedModeActiveGroup.color,
                iconDataIndices: this.tool.uiManager.speedModeActiveGroup.iconDataIndices
            };
        }
        
        // Mark as initialized
        this.tool.profiles[mode].initialized = true;
    }

    loadProfileState(mode) {
        const profile = this.tool.profiles[mode];
        
        if (!profile || !profile.initialized) {
            // Fresh start for this mode
            this.initializeFreshProfile(mode);
            return;
        }
        
        // Clear current state
        this.tool.uiManager.clearSidebar();
        this.tool.groups = [];
        this.tool.selectedIcons = [];
        
        // Recreate icons from data (this gives us fresh icons)
        this.createIcons();
        
        // Create lookup for icons by ID
        const iconLookup = {};
        this.tool.icons.forEach(icon => {
            iconLookup[icon.id] = icon;
        });
        
        // Restore icon states
        const iconsToRemove = new Set();
        const combinedIconsToAdd = [];
        
        profile.iconStates.forEach(iconState => {
            if (iconState.isCombined) {
                // Handle combined icons
                const originalIcons = iconState.originalIconDataIndices
                    .map(dataIndex => this.tool.icons.find(icon => icon.dataIndex === dataIndex))
                    .filter(icon => icon);
                    
                if (originalIcons.length > 1) {
                    // In Speed Mode, check if these icons still have the same calculated speed
                    if (mode === 'speed') {
                        const speeds = originalIcons.map(icon => this.calculateSPEStat(icon));
                        const uniqueSpeeds = [...new Set(speeds)];
                        
                        if (uniqueSpeeds.length === 1) {
                            // Still same speed, recreate combined icon
                            const species = originalIcons[0].data.Species;
                            const calculatedSPE = speeds[0];
                            const setNumbers = originalIcons.map(icon => icon.data['Set#']).sort((a, b) => a - b);
                            const combinedLabel = `${species}-${setNumbers.join('/')}`;
                            const combinedId = `combined-${species}-${calculatedSPE}`;
                            
                            // Mark original icons for removal
                            originalIcons.forEach(icon => iconsToRemove.add(icon.id));
                            
                            const textWidth = this.calculateTextWidth(combinedLabel);
                            const combinedWidth = Math.max(35, textWidth + 12);
                            
                            const combinedIcon = {
                                id: combinedId,
                                dataIndex: iconState.dataIndex,
                                data: originalIcons[0].data,
                                combinedData: originalIcons.map(icon => icon.data),
                                originalIcons: originalIcons,
                                x: iconState.x,
                                y: iconState.y,
                                width: combinedWidth,
                                height: iconState.height,
                                label: combinedLabel,
                                selected: iconState.selected,
                                groupId: iconState.groupId,
                                score: iconState.score,
                                types: originalIcons[0].types,
                                isCombined: true,
                                setCount: originalIcons.length,
                                baseStats: originalIcons[0].baseStats,
                                evs: originalIcons[0].evs
                            };
                            
                            combinedIconsToAdd.push(combinedIcon);
                        }
                        // If speeds are different now, leave as individual icons (don't combine)
                    } else {
                        // Non-Speed Mode: restore combined icon as-is
                        // Mark original icons for removal
                        originalIcons.forEach(icon => iconsToRemove.add(icon.id));
                        
                        // Create combined icon
                        const combinedIcon = {
                            id: iconState.id,
                            dataIndex: iconState.dataIndex,
                            data: originalIcons[0].data,
                            combinedData: iconState.combinedData,
                            originalIcons: originalIcons,
                            x: iconState.x,
                            y: iconState.y,
                            width: iconState.width,
                            height: iconState.height,
                            label: iconState.label,
                            selected: iconState.selected,
                            groupId: iconState.groupId,
                            score: iconState.score,
                            types: iconState.types,
                            isCombined: true,
                            setCount: iconState.setCount,
                            baseStats: iconState.baseStats || originalIcons[0].baseStats,
                            evs: iconState.evs || originalIcons[0].evs
                        };
                        
                        combinedIconsToAdd.push(combinedIcon);
                    }
                }
            } else {
                // Handle regular icons
                const icon = iconLookup[iconState.id];
                if (icon) {
                    icon.x = iconState.x;
                    icon.y = iconState.y;
                    icon.selected = iconState.selected;
                    icon.groupId = iconState.groupId;
                    icon.score = iconState.score;
                }
            }
        });
        
        // Remove original icons that were combined
        this.tool.icons = this.tool.icons.filter(icon => !iconsToRemove.has(icon.id));
        
        // Add combined icons
        combinedIconsToAdd.forEach(combinedIcon => {
            this.tool.icons.push(combinedIcon);
            iconLookup[combinedIcon.id] = combinedIcon;
        });
        
        // Restore groups
        this.tool.groups = profile.groups.map(groupData => {
            const group = {
                id: groupData.id,
                name: groupData.name,
                field: groupData.field,
                value: groupData.value,
                x: groupData.x,
                y: groupData.y,
                color: groupData.color,
                locked: groupData.locked,
                autoArranged: groupData.autoArranged,
                bounds: groupData.bounds ? { ...groupData.bounds } : null,
                icons: []
            };
            
            // Restore icon references to groups
            groupData.iconIds.forEach(iconId => {
                const icon = iconLookup[iconId];
                if (icon) {
                    group.icons.push(icon);
                }
            });
            
            return group;
        });
        
        // Restore selected icons
        this.tool.selectedIcons = profile.selectedIcons
            .map(iconId => iconLookup[iconId])
            .filter(icon => icon);
        
        // Add selected icons to sidebar
        this.tool.selectedIcons.forEach(icon => {
            this.tool.uiManager.addToSidebar(icon);
        });
        
        // In Speed Mode, ensure all icons are properly positioned by speed
        if (mode === 'speed') {
            // Get all ungrouped icons (both individual and combined)
            const ungroupedIcons = this.tool.icons.filter(icon => icon.groupId === null);
            this.positionIconsBySpeed(ungroupedIcons);
            
            // Load Speed Mode group after positioning (now using correct property)
            this.tool.uiManager.loadSpeedModeGroup();
        }
        
        // Update UI
        this.tool.uiManager.updateGroupList();
        this.tool.uiManager.updateCounts();
    }

    initializeFreshProfile(mode) {
        // For Speed Mode, preserve any existing speedModeGroup before clearing
        let preservedSpeedModeGroup = null;
        if (mode === 'speed' && this.tool.profiles[mode] && this.tool.profiles[mode].speedModeGroup) {
            preservedSpeedModeGroup = this.tool.profiles[mode].speedModeGroup;
        }
        
        // Clear current state
        this.tool.uiManager.clearSidebar();
        this.tool.groups = [];
        this.tool.selectedIcons = [];
        
        // Create fresh icons for this mode
        this.createIcons();
        
        // Mark profile as initialized but empty
        this.tool.profiles[mode] = {
            groups: [],
            iconStates: [],
            selectedIcons: [],
            initialized: true
        };
        
        // Restore the preserved speedModeGroup if this is Speed Mode
        if (mode === 'speed' && preservedSpeedModeGroup) {
            this.tool.profiles[mode].speedModeGroup = preservedSpeedModeGroup;
        }
        
        // Update UI
        this.tool.uiManager.updateGroupList();
        this.tool.uiManager.updateCounts();
    }

    createIcons() {
        this.tool.icons = [];
        
        const startX = (this.tool.mode === 'score' || this.tool.mode === 'speed') ? this.tool.scaleWidth + 20 : 20;
        
        this.tool.data.forEach((pokemon, index) => {
            const label = `${pokemon.Species}-${pokemon['Set#']}`;
            const textWidth = this.calculateTextWidth(label);
            const iconWidth = Math.max(35, textWidth + 12);
            
            const icon = {
                id: `icon-${index}`,
                dataIndex: index,
                data: pokemon,
                x: startX,
                y: this.tool.poolStartY,
                width: iconWidth,
                height: this.tool.iconHeight,
                label: label,
                selected: false,
                groupId: null,
                score: null,
                types: this.parseTypes(pokemon.Type),
                baseStats: this.parseBaseStats(pokemon),
                evs: this.parseEVSpread(pokemon['EV Spread'])
            };
            
            this.tool.icons.push(icon);
        });
        
        if (this.tool.mode === 'speed') {
            this.arrangeIconsBySpeed();
        } else {
            this.arrangeAllPoolIcons();
        }
    }

    parseTypes(typeString) {
        if (!typeString) return [];
        return typeString.trim().split(/\s+/);
    }

    parseBaseStats(pokemon) {
        return {
            hp: parseInt(pokemon.HP) || 0,
            atk: parseInt(pokemon.ATK) || 0,
            def: parseInt(pokemon.DEF) || 0,
            spa: parseInt(pokemon.SPA) || 0,
            spd: parseInt(pokemon.SPD) || 0,
            spe: parseInt(pokemon.SPE) || 0
        };
    }

    calculateSPEStat(icon) {
        if (!icon.baseStats || !icon.evs) return 0;
        
        const base = icon.baseStats.spe;
        const evs = icon.evs.spe;
        const ivs = this.tool.globalIVs;
        const level = this.tool.globalLevel;
        const nature = icon.data.Nature || 'Hardy';
        
        // Get nature modifier for speed
        const natureModifier = this.getNatureModifier(nature, 'spe');
        
        // Calculate SPE stat: ⌊ ⌊ (2×Base+IV+⌊ EV/4⌋)×Level/100⌋+5)×Nature⌋
        const baseStat = Math.floor((2 * base + ivs + Math.floor(evs / 4)) * level / 100) + 5;
        return Math.floor(baseStat * natureModifier);
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

    parseEVSpread(evString) {
        if (!evString) return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
        
        // Parse format: HP/ATK/DEF/SPA/SPD/SPE
        const evParts = evString.trim().split('/').map(ev => parseInt(ev.trim()) || 0);
        
        return {
            hp: evParts[0] || 0,
            atk: evParts[1] || 0,
            def: evParts[2] || 0,
            spa: evParts[3] || 0,
            spd: evParts[4] || 0,
            spe: evParts[5] || 0
        };
    }

    hasType(icon, targetType) {
        // Check if this is a dual type search (contains space)
        if (targetType.includes(' ')) {
            const searchTypes = targetType.toLowerCase().trim().split(/\s+/);
            
            // For dual type search, Pokemon must have all specified types
            return searchTypes.every(searchType => 
                icon.types.some(iconType => 
                    iconType.toLowerCase() === searchType
                )
            );
        } else {
            // Single type search - Pokemon must have this type
            return icon.types.some(type => 
                type.toLowerCase() === targetType.toLowerCase()
            );
        }
    }

    hasMove(icon, targetMove) {
        const moves = [
            icon.data['Move 1'],
            icon.data['Move 2'], 
            icon.data['Move 3'],
            icon.data['Move 4']
        ].filter(Boolean);
        
        // Normalize function to handle case and spaces for exact matching
        const normalizeMove = (move) => {
            return move.toLowerCase().replace(/[\s-]/g, '');
        };
        
        const normalizedTarget = normalizeMove(targetMove);
        
        return moves.some(move => {
            if (!move) return false;
            return normalizeMove(move) === normalizedTarget;
        });
    }

    arrangeIconsBySpeed() {
        // First, "uncombine" any existing combined icons to get back to individual icons
        const existingCombinedSelectionStates = {};
        const iconsToRestore = [];
        
        // Store selection states and expand combined icons back to individuals
        this.tool.icons.filter(icon => icon.isCombined).forEach(icon => {
            existingCombinedSelectionStates[icon.id] = icon.selected;
            
            // Remove from selected icons array if present
            this.tool.selectedIcons = this.tool.selectedIcons.filter(selected => selected.id !== icon.id);
            
            // Add the original individual icons back
            if (icon.originalIcons) {
                icon.originalIcons.forEach(originalIcon => {
                    iconsToRestore.push(originalIcon);
                });
            }
        });
        
        // Remove all combined icons and restore individual icons
        this.tool.icons = this.tool.icons.filter(icon => !icon.isCombined);
        iconsToRestore.forEach(icon => {
            if (!this.tool.icons.some(existing => existing.id === icon.id)) {
                this.tool.icons.push(icon);
            }
        });
        
        // Now get all ungrouped, individual icons (excluding speed placeholders)
        const ungroupedIcons = this.tool.icons.filter(icon => 
            icon.groupId === null && !icon.isCombined && !icon.isSpeedPlaceholder
        );
        
        if (ungroupedIcons.length === 0) {
            this.tool.canvasRenderer.render();
            return;
        }
        
        // Group icons by species and calculated speed
        const speciesSpeedGroups = {};
        ungroupedIcons.forEach(icon => {
            const species = icon.data.Species || 'Unknown';
            const calculatedSPE = this.calculateSPEStat(icon);
            const key = `${species}-${calculatedSPE}`;
            
            if (!speciesSpeedGroups[key]) {
                speciesSpeedGroups[key] = [];
            }
            speciesSpeedGroups[key].push(icon);
        });
        
        // Process groups: single icons stay as-is, multiple icons get combined
        const processedIcons = [];
        const iconsToRemove = new Set();
        
        Object.values(speciesSpeedGroups).forEach(group => {
            if (group.length === 1) {
                // Single icon - keep as is
                processedIcons.push(group[0]);
            } else {
                // Multiple icons with same species and speed - combine them
                const species = group[0].data.Species;
                const calculatedSPE = this.calculateSPEStat(group[0]);
                const setNumbers = group.map(icon => icon.data['Set#']).sort((a, b) => a - b);
                const combinedLabel = `${species}-${setNumbers.join('/')}`;
                const combinedId = `combined-${species}-${calculatedSPE}`;
                
                // Mark original icons for removal
                group.forEach(icon => iconsToRemove.add(icon.id));
                
                const textWidth = this.calculateTextWidth(combinedLabel);
                const combinedWidth = Math.max(35, textWidth + 12);
                
                // Restore selection state if this combined icon existed before
                const wasSelected = existingCombinedSelectionStates[combinedId] || false;
                
                const combinedIcon = {
                    id: combinedId,
                    dataIndex: group[0].dataIndex,
                    data: group[0].data,
                    combinedData: group.map(icon => icon.data),
                    originalIcons: group,
                    x: 0,
                    y: 0,
                    width: combinedWidth,
                    height: this.tool.iconHeight,
                    label: combinedLabel,
                    selected: wasSelected,
                    groupId: null,
                    score: null,
                    types: group[0].types,
                    isCombined: true,
                    setCount: group.length,
                    baseStats: group[0].baseStats,
                    evs: group[0].evs
                };
                
                processedIcons.push(combinedIcon);
                
                // Restore to selected icons if it was selected
                if (wasSelected) {
                    this.tool.selectedIcons.push(combinedIcon);
                }
            }
        });
        
        // Remove icons that were combined
        this.tool.icons = this.tool.icons.filter(icon => !iconsToRemove.has(icon.id));
        
        // Add all combined icons to main array
        processedIcons.filter(icon => icon.isCombined).forEach(icon => {
            this.tool.icons.push(icon);
        });
        
        // Position all processed icons by speed
        this.positionIconsBySpeed(processedIcons);
        
        // Reapply Speed Mode group highlights if in Speed Mode
        if (this.tool.mode === 'speed' && this.tool.uiManager.speedModeActiveGroup) {
            this.tool.uiManager.applySpeedModeGroupHighlights();
        }
        
        this.tool.canvasRenderer.render();
    }

    positionIconsBySpeed(icons) {
        const scaleTop = 10;
        const scaleBottom = 766;
        const scaleHeight = 756;
        const maxSpeed = this.tool.globalLevel === 50 ? 200 : 400;
        const startX = this.tool.scaleWidth + 20;
        
        // Determine band size based on level
        const bandSize = this.tool.globalLevel === 50 ? 5 : 10;
        
        // Group icons into speed bands
        const speedBands = {};
        icons.forEach(icon => {
            let calculatedSPE;
            
            // Handle speed placeholders differently
            if (icon.isSpeedPlaceholder) {
                calculatedSPE = icon.baseStats.spe;
            } else {
                calculatedSPE = this.calculateSPEStat(icon);
            }
            
            const bandMin = Math.floor(calculatedSPE / bandSize) * bandSize;
            const bandMax = bandMin + (bandSize - 1);
            const bandKey = `${bandMin}-${bandMax}`;
            
            if (!speedBands[bandKey]) {
                speedBands[bandKey] = [];
            }
            speedBands[bandKey].push(icon);
        });
        
        // Position icons within each band
        Object.keys(speedBands).forEach(bandKey => {
            const [bandMin, bandMax] = bandKey.split('-').map(Number);
            const bandMidpoint = (bandMin + bandMax) / 2;
            const iconsInBand = speedBands[bandKey];
            
            // Calculate Y position for this band (based on midpoint)
            const bandY = scaleBottom - (bandMidpoint / maxSpeed) * scaleHeight;
            
            // Sort icons within band: highest speed first, then by species name
            iconsInBand.sort((a, b) => {
                let speA, speB;
                
                if (a.isSpeedPlaceholder) {
                    speA = a.baseStats.spe;
                } else {
                    speA = this.calculateSPEStat(a);
                }
                
                if (b.isSpeedPlaceholder) {
                    speB = b.baseStats.spe;
                } else {
                    speB = this.calculateSPEStat(b);
                }
                
                if (speB !== speA) return speB - speA; // Higher speed first
                
                // Speed placeholders should appear after real Pokemon of same speed
                if (a.isSpeedPlaceholder && !b.isSpeedPlaceholder) return 1;
                if (!a.isSpeedPlaceholder && b.isSpeedPlaceholder) return -1;
                
                const speciesA = a.data.Species || '';
                const speciesB = b.data.Species || '';
                return speciesA.localeCompare(speciesB); // Then by name
            });
            
            // Position icons horizontally within the band
            let currentX = startX;
            iconsInBand.forEach(icon => {
                icon.x = currentX;
                icon.y = Math.max(scaleTop, Math.min(scaleBottom - icon.height, bandY - icon.height / 2));
                currentX += icon.width + this.tool.iconPadding;
            });
        });
    }

    arrangeAllPoolIcons() {
        const poolIcons = this.tool.icons.filter(icon => {
            // In Score Mode, exclude scored icons from pool arrangement
            if (this.tool.mode === 'score' && icon.score !== null) {
                return false;
            }
            return icon.groupId === null && !icon.isCombined;
        });
        
        if (poolIcons.length === 0) {
            this.tool.canvasRenderer.render();
            return;
        }
        
        const startX = (this.tool.mode === 'score' || this.tool.mode === 'speed') ? this.tool.scaleWidth + 20 : 20;
        const maxWidth = this.tool.canvas.width - startX - 40;
        
        let currentX = startX;
        let currentY = this.tool.poolStartY;
        let rowHeight = this.tool.iconHeight;
        let maxY = currentY;
        
        poolIcons.forEach((icon, index) => {
            if (currentX + icon.width > startX + maxWidth && currentX > startX) {
                currentX = startX;
                currentY += rowHeight + this.tool.iconPadding;
                rowHeight = this.tool.iconHeight;
            }
            
            icon.x = currentX;
            icon.y = currentY;
            
            maxY = Math.max(maxY, currentY + icon.height);
            
            currentX += icon.width + this.tool.iconPadding;
            rowHeight = Math.max(rowHeight, icon.height);
        });
        
        this.tool.canvasRenderer.render();
    }

    createNewGroup() {
        // Disable group creation in Speed Mode - groups should be sent from Free Mode
        if (this.tool.mode === 'speed') {
            alert('Group creation is disabled in Speed Mode. Please create groups in Free Mode and send them to Speed Mode.');
            return;
        }
        
        const field = document.getElementById('groupField').value;
        const value = document.getElementById('groupValue').value.trim();
        
        if (!value) {
            alert('Please enter a value for the group');
            return;
        }

        let matchingIcons = [];
        
        if (field === 'custom') {
            matchingIcons = [];
        } else if (field === 'Type') {
            matchingIcons = this.tool.icons.filter(icon => 
                icon.groupId === null && this.hasType(icon, value)
            );
        } else if (field === 'Species') {
            matchingIcons = this.tool.icons.filter(icon => 
                icon.groupId === null && icon.data.Species === value
            );
        } else if (field === 'Move') {
            matchingIcons = this.tool.icons.filter(icon => 
                icon.groupId === null && this.hasMove(icon, value)
            );
        } else {
            matchingIcons = this.tool.icons.filter(icon => 
                icon.groupId === null && icon.data[field] === value
            );
        }

        if (matchingIcons.length === 0 && field !== 'custom') {
            alert(`No Pokemon found matching ${field}: ${value}`);
            return;
        }

        const groupPosition = this.findGroupPosition();
        
        const groupId = this.tool.groups.length;
        let minWidth = 140;
        let minHeight = 80;
        
        if (matchingIcons.length > 0) {
            const maxIconWidth = Math.max(...matchingIcons.map(icon => icon.width));
            
            if (this.tool.mode === 'score') {
                // Score Mode: Calculate width more precisely
                const maxIconsPerColumn = 36;
                const columnsNeeded = Math.ceil(matchingIcons.length / maxIconsPerColumn);
                
                if (columnsNeeded === 1) {
                    // Single column: minimal padding
                    minWidth = Math.max(140, maxIconWidth + 30);
                } else {
                    // Multiple columns: column-based calculation
                    const columnWidth = maxIconWidth + this.tool.iconPadding;
                    minWidth = Math.max(140, columnsNeeded * columnWidth + 20);
                }
            } else {
                // Free Mode: Calculate optimal columns for 2:1 height:width ratio
                const iconCount = matchingIcons.length;
                const optimalColumns = Math.max(2, Math.ceil(Math.sqrt(iconCount / 2)));
                const columnWidth = maxIconWidth + this.tool.iconPadding;
                minWidth = Math.max(140, optimalColumns * columnWidth + 20);
            }
            
            minHeight = Math.max(80, this.tool.iconHeight * 2 + this.tool.iconPadding + 35);
        }
        
        const group = {
            id: groupId,
            name: field === 'custom' ? value : value, // Just the value, not "Field: value"
            field: field,
            value: value,
            x: groupPosition.x,
            y: groupPosition.y,
            color: this.getGroupColor(groupId),
            icons: [],
            autoArranged: false,
            locked: this.tool.mode === 'score', // Lock by default in Score Mode
            bounds: {
                x: groupPosition.x - 10,
                y: groupPosition.y - 25,
                width: minWidth,
                height: minHeight
            }
        };

        this.tool.groups.push(group);

        matchingIcons.forEach(icon => {
            icon.groupId = groupId;
            group.icons.push(icon);
        });

        if (group.icons.length > 0) {
            this.initialArrangeGroupIcons(group);
            group.autoArranged = true;
            
            if (this.tool.mode === 'speed') {
                this.arrangeIconsBySpeed();
            } else {
                this.arrangeAllPoolIcons();
            }
        }
        
        this.tool.uiManager.updateGroupList();
        this.tool.uiManager.updateCounts();
        
        document.getElementById('groupValue').value = '';
    }

    findGroupPosition() {
        const startX = (this.tool.mode === 'score' || this.tool.mode === 'speed') ? this.tool.scaleWidth + 20 : 20;
        
        if (this.tool.groups.length === 0) {
            return { x: startX, y: 20 };
        }
        
        // For all modes, try to find optimal positions using grid-based approach
        const baseGroupWidth = 140;
        const baseGroupHeight = 80;
        const spacing = 15;
        
        // Calculate available canvas area above separator
        const maxCanvasY = this.tool.separatorY - 20;
        const maxCanvasX = this.tool.canvas.width - 40;
        
        // Try to find open spots in a grid pattern, prioritizing top-left
        for (let row = 0; row < 12; row++) {
            for (let col = 0; col < 10; col++) {
                const testX = startX + col * (baseGroupWidth + spacing);
                const testY = 20 + row * (baseGroupHeight + spacing);
                
                // Skip if position would be outside canvas or below separator
                if (testX + baseGroupWidth >= maxCanvasX || testY + baseGroupHeight >= maxCanvasY) {
                    continue;
                }
                
                // Check for overlaps with existing groups
                const groupOverlaps = this.tool.groups.some(group => {
                    if (!group.bounds) return false;
                    
                    const buffer = 15;
                    return !(testX + baseGroupWidth + buffer < group.bounds.x ||
                           testX - buffer > group.bounds.x + group.bounds.width ||
                           testY + baseGroupHeight + buffer < group.bounds.y ||
                           testY - buffer > group.bounds.y + group.bounds.height);
                });
                
                // Check for overlaps with ungrouped icons
                const iconOverlaps = this.tool.icons.some(icon => {
                    if (icon.groupId !== null) return false;
                    
                    const buffer = 15;
                    return !(testX + baseGroupWidth + buffer < icon.x ||
                           testX - buffer > icon.x + icon.width ||
                           testY + baseGroupHeight + buffer < icon.y ||
                           testY - buffer > icon.y + icon.height);
                });
                
                if (!groupOverlaps && !iconOverlaps) {
                    return { x: testX, y: testY };
                }
            }
        }
        
        // Fallback: place at the bottom of existing groups if no space at top
        if (this.tool.mode === 'score') {
            let maxY = 20;
            this.tool.groups.forEach(group => {
                if (group.bounds) {
                    maxY = Math.max(maxY, group.bounds.y + group.bounds.height + 15);
                }
            });
            return { x: startX, y: Math.min(maxY, maxCanvasY - baseGroupHeight) };
        } else {
            // Final fallback for other modes
            const fallbackX = Math.min(startX + 100, this.tool.canvas.width - baseGroupWidth);
            const fallbackY = Math.min(20, maxCanvasY - baseGroupHeight);
            return { x: fallbackX, y: fallbackY };
        }
    }

    getGroupColor(index) {
        const colors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
            '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
            '#FFB6C1', '#87CEEB', '#DDA0DD', '#F0E68C'
        ];
        return colors[index % colors.length];
    }

    initialArrangeGroupIcons(group) {
        const iconCount = group.icons.length;
        if (iconCount === 0) return;

        if (this.tool.mode === 'score') {
            // Score Mode: Handle same-score overlaps with additional columns
            const maxIconsPerColumn = 36;
            const scoredIcons = group.icons.filter(icon => icon.score !== null);
            const unscoredIcons = group.icons.filter(icon => icon.score === null);
            
            // Sort scored icons by score (highest first)
            scoredIcons.sort((a, b) => b.score - a.score);
            
            // Calculate column width based on widest icon
            const columnWidth = Math.max(...group.icons.map(icon => icon.width)) + this.tool.iconPadding;
            
            // First, calculate Y positions for all scored icons
            const scaleTop = 10;
            const scaleBottom = 766;
            const scaleHeight = 756;
            const maxScore = 100;
            
            scoredIcons.forEach(icon => {
                const absoluteY = scaleBottom - (icon.score / maxScore) * scaleHeight;
                icon.calculatedY = Math.max(scaleTop, Math.min(scaleBottom - icon.height, absoluteY - icon.height / 2));
            });
            
            // Group scored icons by their Y position (same score band)
            const yPositionGroups = {};
            scoredIcons.forEach(icon => {
                const yKey = Math.round(icon.calculatedY / 5) * 5; // Group by 5px intervals
                if (!yPositionGroups[yKey]) {
                    yPositionGroups[yKey] = [];
                }
                yPositionGroups[yKey].push(icon);
            });
            
            // Create column layout considering same-Y-position groups
            const columnLayout = []; // Array of column arrays
            let currentColumn = 0;
            let currentColumnCount = 0;
            
            // Process each Y position group
            Object.keys(yPositionGroups).sort((a, b) => parseFloat(b) - parseFloat(a)).forEach(yKey => {
                const iconsAtThisY = yPositionGroups[yKey];
                
                // If multiple icons at same Y, spread across columns
                iconsAtThisY.forEach((icon, index) => {
                    const targetColumn = currentColumn + index;
                    
                    // Ensure we have enough columns
                    while (columnLayout.length <= targetColumn) {
                        columnLayout.push([]);
                    }
                    
                    columnLayout[targetColumn].push(icon);
                });
                
                // Move to next available row for subsequent icons
                currentColumn = Math.max(currentColumn, currentColumn + iconsAtThisY.length - 1);
                currentColumnCount++;
                
                // If current column is getting full, move to next column
                if (currentColumnCount >= maxIconsPerColumn) {
                    currentColumn++;
                    currentColumnCount = 0;
                }
            });
            
            // Add unscored icons to available spaces
            unscoredIcons.forEach(icon => {
                // Find column with least icons
                let targetColumn = 0;
                let minCount = columnLayout[0] ? columnLayout[0].length : 0;
                
                for (let i = 1; i < columnLayout.length; i++) {
                    const count = columnLayout[i] ? columnLayout[i].length : 0;
                    if (count < minCount && count < maxIconsPerColumn) {
                        targetColumn = i;
                        minCount = count;
                    }
                }
                
                // If all columns are full, create new column
                if (minCount >= maxIconsPerColumn) {
                    targetColumn = columnLayout.length;
                    columnLayout.push([]);
                }
                
                if (!columnLayout[targetColumn]) {
                    columnLayout[targetColumn] = [];
                }
                columnLayout[targetColumn].push(icon);
            });
            
            // Position all icons based on column layout
            columnLayout.forEach((columnIcons, columnIndex) => {
                columnIcons.forEach((icon, indexInColumn) => {
                    // Calculate X position
                    icon.x = group.x + columnIndex * columnWidth;
                    
                    // Calculate Y position
                    if (icon.score !== null) {
                        // Use pre-calculated Y position for scored icons
                        icon.y = icon.calculatedY;
                    } else {
                        // Column-based positioning for unscored icons
                        if (columnIndex > 0) {
                            const iconsInThisColumn = columnIcons.length;
                            const emptyRowsAtTop = maxIconsPerColumn - iconsInThisColumn;
                            const adjustedRowIndex = emptyRowsAtTop + indexInColumn;
                            icon.y = group.y + adjustedRowIndex * (icon.height + this.tool.iconPadding);
                        } else {
                            icon.y = group.y + indexInColumn * (icon.height + this.tool.iconPadding);
                        }
                    }
                });
            });
            
            // Clean up temporary property
            scoredIcons.forEach(icon => delete icon.calculatedY);
            
        } else {
            // Free/Speed Mode: Pack icons within the group area with 2:1 height:width ratio
            const maxIconWidth = Math.max(...group.icons.map(icon => icon.width));
            
            // Calculate optimal columns for roughly 2:1 height:width ratio
            const iconCount = group.icons.length;
            const optimalColumns = Math.max(2, Math.ceil(Math.sqrt(iconCount / 2)));
            const groupWidth = Math.max(180, maxIconWidth * optimalColumns + this.tool.iconPadding * (optimalColumns - 1) + 20);
            
            let currentX = group.x;
            let currentY = group.y;
            let rowHeight = this.tool.iconHeight;
            const maxWidth = groupWidth - 20;
            
            group.icons.forEach((icon) => {
                if (currentX + icon.width > group.x + maxWidth && currentX > group.x) {
                    currentX = group.x;
                    currentY += rowHeight + this.tool.iconPadding;
                    rowHeight = this.tool.iconHeight;
                }
                
                icon.x = currentX;
                icon.y = currentY;
                
                currentX += icon.width + this.tool.iconPadding;
                rowHeight = Math.max(rowHeight, icon.height);
            });
        }

        this.updateGroupBounds(group);
    }

    updateGroupBounds(group) {
        // Calculate minimum based on largest icon in group or default
        let minWidth = 140;
        let minHeight = 80;
        
        if (group.icons.length > 0) {
            const maxIconWidth = Math.max(...group.icons.map(icon => icon.width));
            
            if (this.tool.mode === 'score') {
                // Score Mode: Calculate width based on actual columns needed and be more precise
                const maxIconsPerColumn = 36;
                const columnsNeeded = Math.ceil(group.icons.length / maxIconsPerColumn);
                const columnWidth = maxIconWidth + this.tool.iconPadding;
                
                // More precise calculation: only add minimal padding for single columns
                if (columnsNeeded === 1) {
                    // For single column, just add minimal padding around the icons
                    const calculatedWidth = maxIconWidth + 30; // 15px padding on each side
                    minWidth = Math.max(140, calculatedWidth);
                } else {
                    // For multiple columns, calculate based on actual column layout
                    const calculatedWidth = columnsNeeded * columnWidth + 20; // 10px padding on each side
                    minWidth = Math.max(140, calculatedWidth);
                }
            } else {
                // Free Mode: Use 2:1 height:width ratio layout calculations
                const iconCount = group.icons.length;
                const optimalColumns = Math.max(2, Math.ceil(Math.sqrt(iconCount / 2)));
                const columnWidth = maxIconWidth + this.tool.iconPadding;
                minWidth = Math.max(140, optimalColumns * columnWidth + 20);
            }
            
            minHeight = Math.max(80, this.tool.iconHeight * 2 + this.tool.iconPadding + 35);
        }
        
        if (group.icons.length === 0) {
            // Keep existing bounds for empty groups but enforce minimum size
            if (group.bounds) {
                group.bounds.width = Math.max(group.bounds.width, minWidth);
                group.bounds.height = Math.max(group.bounds.height, minHeight);
            } else {
                group.bounds = {
                    x: group.x - 10,
                    y: group.y - 25,
                    width: minWidth,
                    height: minHeight
                };
            }
            return;
        }
        
        // Calculate bounds that encompass ALL icons (crucial for score mode)
        const minX = Math.min(...group.icons.map(icon => icon.x));
        const maxX = Math.max(...group.icons.map(icon => icon.x + icon.width));
        const minY = Math.min(...group.icons.map(icon => icon.y));
        const maxY = Math.max(...group.icons.map(icon => icon.y + icon.height));
        
        const calculatedWidth = maxX - minX + 20;
        const calculatedHeight = maxY - minY + 35;
        
        // For score mode, be more precise about the width to avoid excess space
        let finalWidth;
        if (this.tool.mode === 'score') {
            // Use the smaller of calculated width or minimum width, but ensure it fits all icons
            finalWidth = Math.max(calculatedWidth, minWidth);
            
            // Additional check: make sure the width isn't excessive for single column layouts
            const maxIconsPerColumn = 36;
            const columnsNeeded = Math.ceil(group.icons.length / maxIconsPerColumn);
            if (columnsNeeded === 1) {
                const maxIconWidth = Math.max(...group.icons.map(icon => icon.width));
                const singleColumnMaxWidth = maxIconWidth + 40; // Reasonable padding for single column
                finalWidth = Math.min(finalWidth, singleColumnMaxWidth);
            }
        } else {
            finalWidth = Math.max(calculatedWidth, minWidth);
        }
        
        // Ensure bounds encompass all icons, including scored ones at absolute positions
        group.bounds = {
            x: minX - 10,
            y: minY - 25,
            width: finalWidth,
            height: Math.max(calculatedHeight, minHeight)
        };
    }

    arrangeGroupIcons(group) {
        const iconCount = group.icons.length;
        if (iconCount === 0) return;

        if (this.tool.mode === 'score') {
            // Score Mode: Handle same-score overlaps with additional columns
            const maxIconsPerColumn = 36;
            const scoredIcons = group.icons.filter(icon => icon.score !== null);
            const unscoredIcons = group.icons.filter(icon => icon.score === null);
            
            // Sort scored icons by score (highest first)
            scoredIcons.sort((a, b) => b.score - a.score);
            
            // Calculate column width based on widest icon
            const columnWidth = Math.max(...group.icons.map(icon => icon.width)) + this.tool.iconPadding;
            
            // First, handle scored icons with overlap detection
            let scoredColumnAssignments = [];
            
            if (scoredIcons.length > 0) {
                // Calculate Y positions for all scored icons
                const scaleTop = 10;
                const scaleBottom = 766;
                const scaleHeight = 756;
                const maxScore = 100;
                
                scoredIcons.forEach(icon => {
                    const absoluteY = scaleBottom - (icon.score / maxScore) * scaleHeight;
                    icon.calculatedY = Math.max(scaleTop, Math.min(scaleBottom - icon.height, absoluteY - icon.height / 2));
                });
                
                // Group scored icons by Y position to detect overlaps
                const yPositionGroups = {};
                scoredIcons.forEach(icon => {
                    const yKey = Math.round(icon.calculatedY / 5) * 5; // Group by 5px intervals
                    if (!yPositionGroups[yKey]) {
                        yPositionGroups[yKey] = [];
                    }
                    yPositionGroups[yKey].push(icon);
                });
                
                // Assign columns for scored icons, spreading overlapping ones
                let maxColumnsUsed = 0;
                Object.keys(yPositionGroups).forEach(yKey => {
                    const iconsAtThisY = yPositionGroups[yKey];
                    iconsAtThisY.forEach((icon, index) => {
                        const columnIndex = index;
                        maxColumnsUsed = Math.max(maxColumnsUsed, columnIndex);
                        
                        // Ensure we have enough column arrays
                        while (scoredColumnAssignments.length <= columnIndex) {
                            scoredColumnAssignments.push([]);
                        }
                        scoredColumnAssignments[columnIndex].push(icon);
                    });
                });
            }
            
            // Now handle unscored icons - prioritize first column, then fill others
            let unscoredColumnAssignments = [];
            
            // Initialize unscored column arrays to match scored ones
            for (let i = 0; i < Math.max(1, scoredColumnAssignments.length); i++) {
                unscoredColumnAssignments.push([]);
            }
            
            // Fill unscored icons prioritizing the first column
            let currentColumn = 0;
            unscoredIcons.forEach(icon => {
                // Check if current column has space (considering both scored and unscored)
                const currentColumnTotal = (scoredColumnAssignments[currentColumn] || []).length + 
                                         (unscoredColumnAssignments[currentColumn] || []).length;
                
                if (currentColumnTotal >= maxIconsPerColumn) {
                    // Move to next column
                    currentColumn++;
                    // Ensure we have this column
                    if (!unscoredColumnAssignments[currentColumn]) {
                        unscoredColumnAssignments[currentColumn] = [];
                    }
                }
                
                unscoredColumnAssignments[currentColumn].push(icon);
            });
            
            // Position all icons based on their column assignments
            const totalColumns = Math.max(scoredColumnAssignments.length, unscoredColumnAssignments.length);
            
            for (let columnIndex = 0; columnIndex < totalColumns; columnIndex++) {
                const scoredInColumn = scoredColumnAssignments[columnIndex] || [];
                const unscoredInColumn = unscoredColumnAssignments[columnIndex] || [];
                
                // Position scored icons at their calculated Y positions
                scoredInColumn.forEach(icon => {
                    icon.x = group.x + columnIndex * columnWidth;
                    icon.y = icon.calculatedY;
                });
                
                // Position unscored icons in column order
                unscoredInColumn.forEach((icon, indexInColumn) => {
                    icon.x = group.x + columnIndex * columnWidth;
                    
                    if (columnIndex > 0) {
                        // For second column and beyond, start from bottom up
                        const iconsInThisColumn = unscoredInColumn.length;
                        const emptyRowsAtTop = maxIconsPerColumn - iconsInThisColumn;
                        const adjustedRowIndex = emptyRowsAtTop + indexInColumn;
                        icon.y = group.y + adjustedRowIndex * (icon.height + this.tool.iconPadding);
                    } else {
                        // First column: normal top-down positioning
                        icon.y = group.y + indexInColumn * (icon.height + this.tool.iconPadding);
                    }
                });
            }
            
            // Clean up temporary properties
            scoredIcons.forEach(icon => delete icon.calculatedY);
            
        } else {
            // Free/Speed Mode: Pack icons within the group area with 2:1 height:width ratio
            const maxIconWidth = Math.max(...group.icons.map(icon => icon.width));
            
            // Calculate optimal columns for roughly 2:1 height:width ratio
            const iconCount = group.icons.length;
            const optimalColumns = Math.max(2, Math.ceil(Math.sqrt(iconCount / 2)));
            const groupWidth = Math.max(180, maxIconWidth * optimalColumns + this.tool.iconPadding * (optimalColumns - 1) + 20);
            
            let currentX = group.x;
            let currentY = group.y;
            let rowHeight = this.tool.iconHeight;
            const maxWidth = groupWidth - 20;
            
            group.icons.forEach((icon) => {
                if (currentX + icon.width > group.x + maxWidth && currentX > group.x) {
                    currentX = group.x;
                    currentY += rowHeight + this.tool.iconPadding;
                    rowHeight = this.tool.iconHeight;
                }
                
                icon.x = currentX;
                icon.y = currentY;
                
                currentX += icon.width + this.tool.iconPadding;
                rowHeight = Math.max(rowHeight, icon.height);
            });
        }

        this.updateGroupBounds(group);
    }

    deleteGroup(groupId) {
        const group = this.tool.groups[groupId];
        if (!group) return;
        
        group.icons.forEach(icon => {
            icon.groupId = null;
            
            // In Score Mode, position icons based on whether they have scores
            if (this.tool.mode === 'score' && icon.score !== null) {
                // Scored icons stay in main area at their score height
                const scaleTop = 10;
                const scaleBottom = 766;
                const scaleHeight = 756;
                const maxScore = 100;
                const absoluteY = scaleBottom - (icon.score / maxScore) * scaleHeight;
                icon.y = Math.max(scaleTop, Math.min(scaleBottom - icon.height, absoluteY - icon.height / 2));
                
                // Position in main area horizontally
                const startX = this.tool.scaleWidth + 20;
                icon.x = startX;
            } else {
                // Unscored icons (or any icons in non-Score modes) go to pool
                icon.y = this.tool.poolStartY;
            }
        });
        
        this.tool.groups = this.tool.groups.filter(g => g.id !== groupId);
        
        this.tool.groups.forEach((g, index) => {
            const oldId = g.id;
            g.id = index;
            
            this.tool.icons.forEach(icon => {
                if (icon.groupId === oldId) {
                    icon.groupId = index;
                }
            });
        });
        
        this.tool.groups.forEach(g => this.updateGroupBounds(g));
        
        if (this.tool.mode === 'speed') {
            this.arrangeIconsBySpeed();
        } else {
            this.arrangeAllPoolIcons();
        }
        this.tool.uiManager.updateGroupList();
        this.tool.uiManager.updateCounts();
    }

    findOpenSpaceInGroup(icon, group) {
        if (!group.bounds) {
            icon.x = group.x + 10;
            icon.y = group.y + 35;
            return;
        }
        
        const padding = 10;
        const headerHeight = 25;
        const step = 5;
        
        const hasOverlap = (testX, testY) => {
            return group.icons.some(existingIcon => {
                if (existingIcon.id === icon.id) return false;
                
                return !(testX + icon.width <= existingIcon.x ||
                       testX >= existingIcon.x + existingIcon.width ||
                       testY + icon.height <= existingIcon.y ||
                       testY >= existingIcon.y + existingIcon.height);
            });
        };
        
        const maxX = group.bounds.x + group.bounds.width - padding - icon.width;
        const maxY = group.bounds.y + group.bounds.height - padding - icon.height;
        
        let startX = group.bounds.x + padding;
        let startY = group.bounds.y + headerHeight + padding;
        
        for (let testY = startY; testY <= maxY; testY += step) {
            for (let testX = startX; testX <= maxX; testX += step) {
                if (!hasOverlap(testX, testY)) {
                    icon.x = testX;
                    icon.y = testY;
                    return;
                }
            }
        }
        
        let lowestY = group.bounds.y + headerHeight + padding;
        group.icons.forEach(existingIcon => {
            if (existingIcon.id !== icon.id) {
                lowestY = Math.max(lowestY, existingIcon.y + existingIcon.height + this.tool.iconPadding);
            }
        });
        
        icon.x = startX;
        icon.y = lowestY;
        
        const newWidth = Math.max(
            group.bounds.width,
            icon.x + icon.width + padding - group.bounds.x
        );
        const newHeight = Math.max(
            group.bounds.height,
            icon.y + icon.height + padding - group.bounds.y
        );
        
        group.bounds.width = newWidth;
        group.bounds.height = newHeight;
    }
}