/** @constructor */
function ContextView(gui) {
    this.gui = gui;
    
    this.displayedZone = null;
    this.displayedPlayer = null;
    
    this.element = null;
    this.nonScrolling = null;
    this.scrolling = null;
    this.activeSc = null;
}

ContextView.prototype.setup = function () {
    this.element = createGuiElement('context-view');
    
    this.clearContext();
    this.onResize();
};

ContextView.prototype.onResize = function () {
    var style = this.element.style;
    var pos = this.gui.positions;
    style.width = pos.contextWidth + 'px';
    style.height = pos.uiDivideSize + 'px';
    style.left = pos.minimapWidth + 'px';
    
    if (this.activeSc !== null) {
        this.activeSc.innerChanged();
    }
    
    this.updateScrollingSize();
};

ContextView.prototype.clearContext = function () {
    this.displayedZone = null;
    this.displayedPlayer = null;
    
    this.element.textContent = '';
    this.nonScrolling = null;
    this.scrolling = null;
    this.activeSc = null;
    
    this.nonScrolling = document.createElement('div');
    this.element.appendChild(this.nonScrolling);
    
    this.scrolling = document.createElement('div');
    this.element.appendChild(this.scrolling);
}

ContextView.prototype.refreshContext = function () {
    if (this.displayedZone !== null) {
        this.showZoneInfo(this.displayedZone);
    } else if (this.displayedPlayer !== null) {
        this.showPlayerInfo(this.displayedPlayer);
    }
};

ContextView.prototype.updateScrollingSize = function () {
    var total = this.gui.positions.uiDivideSize;
    var fixed = this.nonScrolling.offsetHeight;
    var left = total - fixed;
    this.scrolling.style.height = left + 'px';
}

ContextView.prototype.showZoneInfo = function (zone) {
    this.clearContext();
    
    this.displayedZone = zone;
    
    var pc = this.gui.game.pc;
    
    var title = this.addContextTitle(this.nonScrolling);
    addText(title, zone.name);
    
    this.addOwnerBar(this.nonScrolling, zone.owner);
    this.addOwnerButton(this.nonScrolling, zone, pc);
    
    if (zone.isAttacking) {
        this.addAttackingState(this.scrolling, zone, pc);
    } else if (zone.owner.id === pc.id) {
        this.addNeighbors(this.scrolling, zone, pc);
    }
};

ContextView.prototype.showPlayerInfo = function (player) {
    this.clearContext();
    
    this.displayedPlayer = player;
    
    var pc = this.gui.game.pc;
    
    var title = this.addContextTitle(this.nonScrolling);
    this.addPlayerNameElement(title, player, pc);
    
    this.addOwnerBar(this.nonScrolling, player);
    this.addPlayerZones(this.scrolling, player);
};

ContextView.prototype.addOwnerBar = function (parent, owner) {
    var bar = document.createElement('div');
    parent.appendChild(bar);
    bar.setAttribute('class', 'owner-bar');
    bar.style.backgroundColor = COLORS.zoneFills[owner.id];
};

ContextView.prototype.addOwnerButton = function (parent, zone, pc) {
    var h4 = document.createElement('h4');
    parent.appendChild(h4);
    this.addPlayerNameElement(h4, zone.owner, pc);
    
    var that = this;
    h4.addEventListener('click', function () {
        that.showPlayerInfo(zone.owner);
    }, true);
};

ContextView.prototype.addPlayerNameElement = function (parent, player, pc) {
    addText(parent, player.rank + ' ');
    
    var name = document.createElement('strong');
    parent.appendChild(name);
    addText(name, player.name);
    
    var extra = player.id === pc.id || !player.isHuman;
    if (extra) {
        var em = document.createElement('em');
        parent.appendChild(em);
        var str = (player.id === pc.id) ? STR.me : STR.robot;
        addText(em, str);
    }
};

ContextView.prototype.addContextTitle = function (parent, name) {
    var h3 = document.createElement('h3');
    parent.appendChild(h3);
    return h3;
};

ContextView.prototype.createScrollingTable = function (parent) {
    this.updateScrollingSize();
    
    this.activeSc = new ScrollContainer();
    this.activeSc.setup(parent);
    this.activeSc.outer.style.height = '100%';
    this.activeSc.inner.style.width = '100%';
    var table = document.createElement('table');
    this.activeSc.inner.appendChild(table);
    
    return table;
};

ContextView.prototype.addAttackingState = function (parent, zone, pc) {
};

ContextView.prototype.addNeighbors = function (parent, zone, pc) {
    var table = this.createScrollingTable(parent);
    
    var neighbours = zone.neighbours;
    for (var i = 0, len = neighbours.length; i < len; i++) {
        this.addNeighbor(table, zone, neighbours[i], pc);
    }
    
    this.activeSc.innerChanged();
};

ContextView.prototype.addNeighbor = function (parent, zone, neighbor, pc) {
    var tr = document.createElement('tr');
    parent.appendChild(tr);
    
    var name = document.createElement('td');
    tr.appendChild(name);
    this.addNeighborName(name, neighbor);
    
    var action = document.createElement('td');
    tr.appendChild(action);
    this.addNeighborAction(action, zone, neighbor, pc);
};

ContextView.prototype.addNeighborName = function (parent, neighbor) {
    parent.setAttribute('class', 'name');
    var color = document.createElement('div');
    parent.appendChild(color);
    color.style.backgroundColor = COLORS.zoneFills[neighbor.owner.id];
    addText(parent, neighbor.name);
}

ContextView.prototype.addNeighborAction = function (parent, zone, neighbor,
        pc) {
    parent.setAttribute('class', 'action');
    
    if (neighbor.owner.id === pc.id) {
        addText(parent, STR.yours);
    } else if (neighbor.isAttacking !== null) {
        addText(parent, STR.cannotBeAttacked);
    } else if (neighbor.isAttackedByPc) {
        addText(parent, STR.youAreAttackingHim);
    } else {
        var span = document.createElement('span');
        parent.appendChild(span);
        addText(span, STR.attack);
        var that = this;
        span.addEventListener('click', function () {
            that.gui.onZoneSelectedForAttack(neighbor);
        }, true);
    }
};

ContextView.prototype.addPlayerZones = function (parent, player) {
    var table = this.createScrollingTable(parent);
    table.setAttribute('class', 'zone-list');
    
    var zones = player.zones;
    for (var key in zones) {
        this.addPlayerZone(table, zones[key]);
    }
    
    this.activeSc.innerChanged();
};

ContextView.prototype.addPlayerZone = function (parent, zone) {
    var tr = document.createElement('tr');
    parent.appendChild(tr);
    
    var name = document.createElement('td');
    tr.appendChild(name);
    addText(name, zone.name);
    
    var that = this;
    name.addEventListener('click', function () {
        that.gui.onZoneClicked(zone);
        var center = zone.zoneData.center;
        that.gui.map.moveCamera(center[0], center[1]);
    }, true);
};
