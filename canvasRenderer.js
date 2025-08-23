// Version 2.4 - Enhanced dual highlighting: group + speed values, removed shadow effects
// Canvas rendering and interaction methods
class CanvasRenderer {
    constructor(tool) {
        this.tool = tool;
    }

    setupCanvas() {
        this.tool.canvas.width = 1600;
        this.tool.canvas.height = 1600;
        
        this.tool.separatorY = 776;
        this.tool.poolStartY = 800;
        
        this.tool.zoom = 1.0;
        this.tool.panX = 0;
        this.tool.panY = 0;
        
        document.getElementById('zoomLevel').textContent = Math.round(this.tool.zoom * 100) + '%';
        
        this.render();
    }

    render() {
        this.tool.ctx.clearRect(0, 0, this.tool.canvas.width, this.tool.canvas.height);
        this.tool.ctx.save();
        
        this.tool.ctx.translate(this.tool.panX, this.tool.panY);

        if (this.tool.mode === 'score' || this.tool.mode === 'speed') {
            this.drawVerticalScale();
        }

        const startX = (this.tool.mode === 'score' || this.tool.mode === 'speed') ? this.tool.scaleWidth : 0;
        const endX = this.tool.canvas.width - 20;
        
        this.tool.ctx.strokeStyle = '#333';
        this.tool.ctx.lineWidth = 4;
        this.tool.ctx.beginPath();
        this.tool.ctx.moveTo(startX, this.tool.separatorY);
        this.tool.ctx.lineTo(endX, this.tool.separatorY);
        this.tool.ctx.stroke();

        this.tool.groups.forEach(group => {
            if (group.bounds) {
                this.tool.ctx.strokeStyle = group.color;
                this.tool.ctx.lineWidth = 3;
                this.tool.ctx.strokeRect(group.bounds.x, group.bounds.y, group.bounds.width, group.bounds.height);
                
                this.tool.ctx.font = 'bold 14px Arial';
                const labelText = group.name;
                const textMetrics = this.tool.ctx.measureText(labelText);
                const textWidth = textMetrics.width;
                
                const bgX = group.bounds.x + 4;
                const bgY = group.bounds.y + 4;
                const bgWidth = textWidth + 8;
                const bgHeight = 16;
                
                this.tool.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                this.tool.ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
                this.tool.ctx.strokeStyle = group.color;
                this.tool.ctx.lineWidth = 1;
                this.tool.ctx.strokeRect(bgX, bgY, bgWidth, bgHeight);
                
                this.tool.ctx.fillStyle = group.color;
                this.tool.ctx.textAlign = 'left';
                this.tool.ctx.textBaseline = 'middle';
                this.tool.ctx.fillText(labelText, bgX + 4, bgY + bgHeight / 2);
                
                this.tool.ctx.textAlign = 'center';
                this.tool.ctx.textBaseline = 'alphabetic';
                
                const handleSize = 10;
                this.tool.ctx.fillStyle = group.color;
                this.tool.ctx.fillRect(
                    group.bounds.x + group.bounds.width - handleSize, 
                    group.bounds.y + group.bounds.height - handleSize, 
                    handleSize, 
                    handleSize
                );
            }
        });

        this.tool.icons.forEach(icon => {
            // Determine fill color based on selection, speed highlight, and group highlight
            let fillColor = '#ffffff';
            let strokeColor = '#333333';
            let lineWidth = 1;
            
            // Handle dual highlighting: group + speed value
            if (icon.speedGroupHighlight && icon.speedHighlight !== undefined) {
                // Group color for fill, speed color for border
                fillColor = '#00e676'; // Bright green group color
                const speedColors = [
                    { fill: '#ff5722', stroke: '#d84315' }, // Deep Orange
                    { fill: '#9c27b0', stroke: '#7b1fa2' }, // Purple
                    { fill: '#2196f3', stroke: '#1976d2' }, // Blue
                    { fill: '#e91e63', stroke: '#c2185b' }, // Pink
                    { fill: '#ff9800', stroke: '#f57c00' }, // Orange
                    { fill: '#00bcd4', stroke: '#0097a7' }, // Cyan
                    { fill: '#795548', stroke: '#5d4037' }, // Brown
                    { fill: '#607d8b', stroke: '#455a64' }  // Blue Grey
                ];
                const colorSet = speedColors[icon.speedHighlight % speedColors.length];
                strokeColor = colorSet.stroke;
                lineWidth = 4;
            } else if (icon.speedGroupHighlight) {
                // Speed Mode group highlight only
                fillColor = '#00e676'; // Bright green
                strokeColor = '#00c853';
                lineWidth = 4;
            } else if (icon.speedHighlight !== undefined) {
                // Speed highlight only
                const speedColors = [
                    { fill: '#ff5722', stroke: '#d84315' }, // Deep Orange
                    { fill: '#9c27b0', stroke: '#7b1fa2' }, // Purple
                    { fill: '#2196f3', stroke: '#1976d2' }, // Blue
                    { fill: '#e91e63', stroke: '#c2185b' }, // Pink
                    { fill: '#ff9800', stroke: '#f57c00' }, // Orange
                    { fill: '#00bcd4', stroke: '#0097a7' }, // Cyan
                    { fill: '#795548', stroke: '#5d4037' }, // Brown
                    { fill: '#607d8b', stroke: '#455a64' }  // Blue Grey
                ];
                const colorSet = speedColors[icon.speedHighlight % speedColors.length];
                fillColor = colorSet.fill;
                strokeColor = colorSet.stroke;
                lineWidth = 3;
            } else if (icon.selected && this.tool.viewOnClick) {
                fillColor = '#ffeb3b';
                strokeColor = '#ff9800';
                lineWidth = 2;
            }
            
            // Bold outline for scored icons (only in Score Mode) - but don't override other highlights
            if (this.tool.mode === 'score' && icon.score !== null && 
                !icon.speedGroupHighlight && icon.speedHighlight === undefined) {
                strokeColor = (icon.selected && this.tool.viewOnClick) ? '#ff9800' : '#333333';
                lineWidth = 3;
            }
            
            this.tool.ctx.fillStyle = fillColor;
            this.tool.ctx.fillRect(icon.x, icon.y, icon.width, icon.height);
            
            this.tool.ctx.strokeStyle = strokeColor;
            this.tool.ctx.lineWidth = lineWidth;
            this.tool.ctx.strokeRect(icon.x, icon.y, icon.width, icon.height);
            
            this.tool.ctx.fillStyle = '#333333';
            this.tool.ctx.font = '11px Arial';
            this.tool.ctx.textAlign = 'center';
            this.tool.ctx.textBaseline = 'middle';
            this.tool.ctx.fillText(
                icon.label, 
                icon.x + icon.width / 2, 
                icon.y + icon.height / 2
            );
            
            this.tool.ctx.textBaseline = 'alphabetic';
            
            // Tier number if assigned (bottom-right corner)
            if (icon.tierNumber !== null) {
                this.tool.ctx.fillStyle = '#ff0000';
                this.tool.ctx.font = 'bold 12px Arial';
                this.tool.ctx.textAlign = 'right';
                this.tool.ctx.textBaseline = 'bottom';
                this.tool.ctx.fillText(
                    icon.tierNumber.toString(),
                    icon.x + icon.width - 2,
                    icon.y + icon.height - 2
                );
                this.tool.ctx.textAlign = 'center';
                this.tool.ctx.textBaseline = 'alphabetic';
            }
        });

        this.tool.ctx.restore();
        
        if (this.tool.insertionPreview && this.tool.mode === 'score') {
            const group = this.tool.groups[this.tool.insertionPreview.groupId];
            if (group && group.locked) {
                this.tool.ctx.save();
                this.tool.ctx.translate(this.tool.panX, this.tool.panY);
                
                this.tool.ctx.strokeStyle = '#ff6b6b';
                this.tool.ctx.lineWidth = 3;
                this.tool.ctx.beginPath();
                this.tool.ctx.moveTo(group.x - 5, this.tool.insertionPreview.y);
                this.tool.ctx.lineTo(group.x + (group.bounds ? group.bounds.width : 100), this.tool.insertionPreview.y);
                this.tool.ctx.stroke();
                
                const arrowSize = 8;
                this.tool.ctx.fillStyle = '#ff6b6b';
                this.tool.ctx.beginPath();
                this.tool.ctx.moveTo(group.x - 5, this.tool.insertionPreview.y);
                this.tool.ctx.lineTo(group.x - 5 + arrowSize, this.tool.insertionPreview.y - arrowSize/2);
                this.tool.ctx.lineTo(group.x - 5 + arrowSize, this.tool.insertionPreview.y + arrowSize/2);
                this.tool.ctx.closePath();
                this.tool.ctx.fill();
                
                this.tool.ctx.restore();
            }
        }
    }

    drawVerticalScale() {
        const scaleHeight = 756;
        const scaleBottom = 766;
        const scaleTop = 10;
        const scaleRight = this.tool.scaleWidth - 30;
        
        this.tool.ctx.strokeStyle = '#333';
        this.tool.ctx.lineWidth = 6;
        this.tool.ctx.beginPath();
        this.tool.ctx.moveTo(scaleRight, scaleTop);
        this.tool.ctx.lineTo(scaleRight, scaleBottom);
        this.tool.ctx.stroke();
        
        let maxValue, stepSize, label;
        if (this.tool.mode === 'score') {
            maxValue = 100;
            stepSize = 10;
            label = 'Score';
        } else if (this.tool.mode === 'speed') {
            // Dynamic max value based on level: 200 for level 50, 400 for level 100
            maxValue = this.tool.globalLevel === 50 ? 200 : 400;
            stepSize = this.tool.globalLevel === 50 ? 25 : 50;
            label = 'Speed';
        }
        
        this.tool.ctx.fillStyle = '#333';
        this.tool.ctx.font = 'bold 14px Arial';
        this.tool.ctx.textAlign = 'right';
        
        for (let value = 0; value <= maxValue; value += stepSize) {
            const y = scaleBottom - (value / maxValue) * scaleHeight;
            
            this.tool.ctx.strokeStyle = '#333';
            this.tool.ctx.lineWidth = 3;
            this.tool.ctx.beginPath();
            this.tool.ctx.moveTo(scaleRight - 15, y);
            this.tool.ctx.lineTo(scaleRight, y);
            this.tool.ctx.stroke();
            
            const textWidth = this.tool.ctx.measureText(value.toString()).width;
            this.tool.ctx.fillStyle = '#ffffff';
            this.tool.ctx.fillRect(scaleRight - textWidth - 25, y - 8, textWidth + 10, 16);
            this.tool.ctx.strokeStyle = '#333';
            this.tool.ctx.lineWidth = 1;
            this.tool.ctx.strokeRect(scaleRight - textWidth - 25, y - 8, textWidth + 10, 16);
            
            this.tool.ctx.fillStyle = '#333';
            this.tool.ctx.fillText(value.toString(), scaleRight - 20, y + 4);
        }
        
        this.tool.ctx.save();
        this.tool.ctx.translate(40, scaleTop + scaleHeight / 2);
        this.tool.ctx.rotate(-Math.PI / 2);
        this.tool.ctx.textAlign = 'center';
        this.tool.ctx.font = 'bold 20px Arial';
        this.tool.ctx.fillStyle = '#333';
        this.tool.ctx.fillText(label, 0, 0);
        this.tool.ctx.restore();
    }

    handleMouseDown(e) {
        const rect = this.tool.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) - this.tool.panX;
        const y = (e.clientY - rect.top) - this.tool.panY;

        for (let icon of this.tool.icons) {
            if (x >= icon.x && x <= icon.x + icon.width &&
                y >= icon.y && y <= icon.y + icon.height) {
                
                this.tool.insertionPreview = null;
                
                if (this.tool.viewOnClick) {
                    this.tool.uiManager.selectIcon(icon);
                }
                
                // In Speed Mode, don't allow any dragging - icons are locked to speed positions
                if (this.tool.mode === 'speed') {
                    return;
                }
                
                this.tool.draggedIcon = icon;
                this.tool.dragStart = { x: x - icon.x, y: y - icon.y };
                
                return;
            }
        }

        // In Speed Mode, don't allow group resizing or moving either
        if (this.tool.mode === 'speed') {
            return;
        }

        for (let group of this.tool.groups) {
            if (group.bounds) {
                const handleSize = 10;
                const handle = this.getResizeHandle(group, x, y, handleSize);
                if (handle) {
                    this.tool.resizingGroup = group;
                    this.tool.resizeHandle = handle;
                    this.tool.dragStart = { x, y };
                    return;
                }
            }
        }

        for (let group of this.tool.groups) {
            if (group.bounds && 
                x >= group.bounds.x && x <= group.bounds.x + group.bounds.width &&
                y >= group.bounds.y && y <= group.bounds.y + group.bounds.height) {
                
                const clickedOnIcon = group.icons.some(icon => 
                    x >= icon.x && x <= icon.x + icon.width &&
                    y >= icon.y && y <= icon.y + icon.height
                );
                
                if (!clickedOnIcon) {
                    this.tool.draggedGroup = group;
                    this.tool.dragStart = { x: x - group.x, y: y - group.y };
                    return;
                }
            }
        }
    }

    getResizeHandle(group, x, y, handleSize) {
        const bounds = group.bounds;
        
        if (x >= bounds.x + bounds.width - handleSize && x <= bounds.x + bounds.width &&
            y >= bounds.y + bounds.height - handleSize && y <= bounds.y + bounds.height) {
            return 'se';
        }
        
        return null;
    }

    updateInsertionPreview(draggedIcon, targetY, group) {
        const iconHeight = this.tool.iconHeight + this.tool.iconPadding;
        const relativeY = targetY - group.y;
        let targetRow = Math.max(0, Math.floor(relativeY / iconHeight));
        
        targetRow = Math.max(0, Math.min(group.icons.length - 1, targetRow));
        
        this.tool.insertionPreview = {
            groupId: group.id,
            insertIndex: targetRow,
            y: group.y + targetRow * iconHeight
        };
    }

    reorderIconsInLockedGroup(draggedIcon, targetY, group) {
        const iconHeight = this.tool.iconHeight + this.tool.iconPadding;
        
        const relativeY = targetY - group.y;
        let targetRow = Math.max(0, Math.floor(relativeY / iconHeight));
        
        targetRow = Math.max(0, Math.min(group.icons.length - 1, targetRow));
        
        const currentIndex = group.icons.indexOf(draggedIcon);
        if (currentIndex === -1) return;
        
        const targetIndex = targetRow;
        
        if (targetIndex === currentIndex) return;
        
        group.icons.splice(currentIndex, 1);
        
        const adjustedTargetIndex = currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
        group.icons.splice(adjustedTargetIndex, 0, draggedIcon);
        
        this.tool.groupManager.arrangeGroupIcons(group);
    }

    handleMouseMove(e) {
        const rect = this.tool.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) - this.tool.panX;
        const y = (e.clientY - rect.top) - this.tool.panY;

        if (this.tool.draggedIcon) {
            const currentGroup = this.tool.draggedIcon.groupId !== null ? this.tool.groups[this.tool.draggedIcon.groupId] : null;
            
            if (this.tool.mode === 'score' && currentGroup && currentGroup.locked) {
                const newX = x - this.tool.dragStart.x;
                const newY = y - this.tool.dragStart.y;
                
                this.tool.draggedIcon.x = Math.max(0, Math.min(this.tool.canvas.width - this.tool.draggedIcon.width, newX));
                this.tool.draggedIcon.y = Math.max(0, Math.min(this.tool.canvas.height - this.tool.draggedIcon.height, newY));
                
                this.updateInsertionPreview(this.tool.draggedIcon, y, currentGroup);
                
                this.render();
                return;
            }
            
            // In Score Mode, prevent vertical movement of scored icons
            if (this.tool.mode === 'score' && this.tool.draggedIcon.score !== null) {
                // Only allow horizontal movement for scored icons
                const newX = x - this.tool.dragStart.x;
                this.tool.draggedIcon.x = Math.max(0, Math.min(this.tool.canvas.width - this.tool.draggedIcon.width, newX));
                
                // Y position stays locked to the score position
                const scaleTop = 10;
                const scaleBottom = 766;
                const scaleHeight = 756;
                const maxScore = 100;
                const absoluteY = scaleBottom - (this.tool.draggedIcon.score / maxScore) * scaleHeight;
                this.tool.draggedIcon.y = Math.max(scaleTop, Math.min(scaleBottom - this.tool.draggedIcon.height, absoluteY - this.tool.draggedIcon.height / 2));
                
                this.render();
                return;
            }
            
            // Normal dragging behavior for other modes or unscored icons
            const newX = x - this.tool.dragStart.x;
            const newY = y - this.tool.dragStart.y;
            
            this.tool.draggedIcon.x = Math.max(0, Math.min(this.tool.canvas.width - this.tool.draggedIcon.width, newX));
            this.tool.draggedIcon.y = Math.max(0, Math.min(this.tool.canvas.height - this.tool.draggedIcon.height, newY));
            
            // If icon is in a locked group (non-Score Mode), dynamically resize the group bounds
            if (currentGroup && currentGroup.locked && currentGroup.bounds && this.tool.mode !== 'score') {
                const groupBounds = currentGroup.bounds;
                const expandedBounds = {
                    x: Math.min(groupBounds.x, this.tool.draggedIcon.x - 10),
                    y: Math.min(groupBounds.y, this.tool.draggedIcon.y - 25),
                    width: Math.max(groupBounds.x + groupBounds.width, this.tool.draggedIcon.x + this.tool.draggedIcon.width + 10) - Math.min(groupBounds.x, this.tool.draggedIcon.x - 10),
                    height: Math.max(groupBounds.y + groupBounds.height, this.tool.draggedIcon.y + this.tool.draggedIcon.height + 10) - Math.min(groupBounds.y, this.tool.draggedIcon.y - 25)
                };
                
                currentGroup.bounds = expandedBounds;
            }
            
            this.render();
        } else if (this.tool.resizingGroup) {
            const deltaX = x - this.tool.dragStart.x;
            const deltaY = y - this.tool.dragStart.y;
            
            if (this.tool.resizeHandle === 'se') {
                let minWidth = 140;
                let minHeight = 80;
                
                if (this.tool.resizingGroup.icons.length > 0) {
                    const maxIconWidth = Math.max(...this.tool.resizingGroup.icons.map(icon => icon.width));
                    minWidth = Math.max(140, maxIconWidth * 2 + this.tool.iconPadding + 20);
                    minHeight = Math.max(80, this.tool.iconHeight * 2 + this.tool.iconPadding + 35);
                }
                
                this.tool.resizingGroup.bounds.width = Math.max(minWidth, this.tool.resizingGroup.bounds.width + deltaX);
                this.tool.resizingGroup.bounds.height = Math.max(minHeight, this.tool.resizingGroup.bounds.height + deltaY);
            }
            
            this.tool.dragStart = { x, y };
            this.render();
        } else if (this.tool.draggedGroup) {
            const newX = x - this.tool.dragStart.x;
            const newY = y - this.tool.dragStart.y;
            
            const deltaX = newX - this.tool.draggedGroup.x;
            const deltaY = newY - this.tool.draggedGroup.y;
            
            this.tool.draggedGroup.x = newX;
            this.tool.draggedGroup.y = newY;
            
            this.tool.draggedGroup.icons.forEach(icon => {
                // Always update X position
                icon.x += deltaX;
                
                // Only update Y position for unscored icons in Score Mode
                if (this.tool.mode === 'score' && icon.score !== null) {
                    // Scored icons keep their absolute Y position - don't move vertically with group
                } else {
                    // Unscored icons or non-Score Mode: move with the group
                    icon.y += deltaY;
                }
            });
            
            if (this.tool.draggedGroup.bounds) {
                this.tool.draggedGroup.bounds.x += deltaX;
                this.tool.draggedGroup.bounds.y += deltaY;
            }
            
            // In Score Mode, expand group bounds to encompass any scored icons that might be outside
            if (this.tool.mode === 'score') {
                this.tool.groupManager.updateGroupBounds(this.tool.draggedGroup);
            }
            
            this.render();
        }
    }

    handleWheel(e) {
        e.preventDefault();
        
        const container = this.tool.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        const excessWidth = Math.max(0, this.tool.canvas.width - containerRect.width);
        const excessHeight = Math.max(0, this.tool.canvas.height - containerRect.height);
        
        const scrollSpeed = 30;
        const deltaY = e.deltaY > 0 ? scrollSpeed : -scrollSpeed;
        const deltaX = e.shiftKey ? (e.deltaY > 0 ? scrollSpeed : -scrollSpeed) : 0;
        
        if (excessHeight > 0) {
            this.tool.panY = Math.max(-excessHeight, Math.min(0, this.tool.panY - deltaY));
        }
        
        if (excessWidth > 0 && e.shiftKey) {
            this.tool.panX = Math.max(-excessWidth, Math.min(0, this.tool.panX - deltaX));
        }
        
        this.render();
    }

    handleKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        const container = this.tool.canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        const excessWidth = Math.max(0, this.tool.canvas.width - containerRect.width);
        const excessHeight = Math.max(0, this.tool.canvas.height - containerRect.height);
        
        const panSpeed = 30;
        let moved = false;
        
        switch(e.key.toLowerCase()) {
            case 'arrowleft':
            case 'a':
                if (excessWidth > 0) {
                    this.tool.panX = Math.min(0, this.tool.panX + panSpeed);
                    moved = true;
                }
                break;
            case 'arrowright':
            case 'd':
                if (excessWidth > 0) {
                    this.tool.panX = Math.max(-excessWidth, this.tool.panX - panSpeed);
                    moved = true;
                }
                break;
            case 'arrowup':
            case 'w':
                if (excessHeight > 0) {
                    this.tool.panY = Math.min(0, this.tool.panY + panSpeed);
                    moved = true;
                }
                break;
            case 'arrowdown':
            case 's':
                if (excessHeight > 0) {
                    this.tool.panY = Math.max(-excessHeight, this.tool.panY - panSpeed);
                    moved = true;
                }
                break;
        }
        
        if (moved) {
            e.preventDefault();
            this.render();
        }
    }

    handleMouseUp(e) {
        if (this.tool.draggedIcon) {
            const currentGroup = this.tool.draggedIcon.groupId !== null ? this.tool.groups[this.tool.draggedIcon.groupId] : null;
            
            if (this.tool.mode === 'score' && currentGroup && currentGroup.locked) {
                if (this.tool.insertionPreview && this.tool.insertionPreview.groupId === currentGroup.id) {
                    const rect = this.tool.canvas.getBoundingClientRect();
                    const y = (e.clientY - rect.top) - this.tool.panY;
                    this.reorderIconsInLockedGroup(this.tool.draggedIcon, y, currentGroup);
                } else {
                    this.tool.groupManager.arrangeGroupIcons(currentGroup);
                }
            } else if (!currentGroup || !currentGroup.locked) {
                const rect = this.tool.canvas.getBoundingClientRect();
                const x = (e.clientX - rect.left) - this.tool.panX;
                const y = (e.clientY - rect.top) - this.tool.panY;
                
                this.handleIconDrop(this.tool.draggedIcon, x, y);
            }
            
            this.tool.draggedIcon = null;
            this.tool.insertionPreview = null;
        } else if (this.tool.draggedGroup) {
            this.tool.draggedGroup = null;
        } else if (this.tool.resizingGroup) {
            this.tool.resizingGroup = null;
            this.tool.resizeHandle = null;
        }
        
        this.render();
    }

    handleIconDrop(icon, x, y) {
        // In Speed Mode, icons cannot be moved - they're locked to speed positions
        if (this.tool.mode === 'speed') {
            return;
        }
        
        const iconCenterX = icon.x + icon.width / 2;
        const iconCenterY = icon.y + icon.height / 2;
        
        const currentGroup = icon.groupId !== null ? this.tool.groups[icon.groupId] : null;
        
        if (currentGroup && currentGroup.locked && this.tool.mode !== 'score') {
            return;
        }
        
        for (let group of this.tool.groups) {
            if (group.bounds && 
                iconCenterX >= group.bounds.x && iconCenterX <= group.bounds.x + group.bounds.width &&
                iconCenterY >= group.bounds.y && iconCenterY <= group.bounds.y + group.bounds.height) {
                
                if (icon.groupId === group.id) return;
                
                if (icon.groupId !== null) {
                    const oldGroup = this.tool.groups[icon.groupId];
                    oldGroup.icons = oldGroup.icons.filter(i => i.id !== icon.id);
                    this.tool.groupManager.updateGroupBounds(oldGroup);
                }
                
                icon.groupId = group.id;
                group.icons.push(icon);
                
                // In Score Mode, immediately rearrange by score
                if (this.tool.mode === 'score') {
                    this.tool.groupManager.arrangeGroupIcons(group);
                } else {
                    this.tool.groupManager.updateGroupBounds(group);
                }
                
                this.tool.uiManager.updateGroupList();
                this.tool.uiManager.updateCounts();
                return;
            }
        }

        if (iconCenterY >= this.tool.separatorY) {
            if (icon.groupId !== null) {
                const oldGroup = this.tool.groups[icon.groupId];
                oldGroup.icons = oldGroup.icons.filter(i => i.id !== icon.id);
                this.tool.groupManager.updateGroupBounds(oldGroup);
                icon.groupId = null;
                
                // Only move to pool if unscored or not in Score Mode
                if (this.tool.mode !== 'score' || icon.score === null) {
                    icon.y = this.tool.poolStartY;
                }
                
                this.tool.groupManager.arrangeAllPoolIcons();
                this.tool.uiManager.updateGroupList();
                this.tool.uiManager.updateCounts();
            } else {
                // Only move to pool if unscored or not in Score Mode
                if (this.tool.mode !== 'score' || icon.score === null) {
                    icon.y = this.tool.poolStartY;
                }
                
                this.tool.groupManager.arrangeAllPoolIcons();
            }
        } else {
            if (icon.groupId !== null) {
                const oldGroup = this.tool.groups[icon.groupId];
                oldGroup.icons = oldGroup.icons.filter(i => i.id !== icon.id);
                this.tool.groupManager.updateGroupBounds(oldGroup);
                icon.groupId = null;
                
                this.tool.uiManager.updateGroupList();
                this.tool.uiManager.updateCounts();
            }
        }
    }
}