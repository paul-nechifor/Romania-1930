/** @constructor */
function Game() {
    this.data = null;
    this.gui = null;
    this.players = {};
    this.pc = null; // Playing character.
    this.webSocket = null;
}

Game.prototype.start = function () {
    var that = this;
    this.loadData(function () {
        that.gui = new Gui(that);
        that.gui.setup();
        //that.createFakePlayers();
        that.createConnection();
    });
};

Game.prototype.loadData = function (callback) {
    var that = this;
    getJson('map.json', function (data) {
        that.data = data;
        callback();
    });
}

Game.prototype.createConnection = function () {
    var address = 'ws://' + GEN.webSocketAddress + ':' + GEN.webSocketPort;
    this.webSocket = new WebSocket(address);
    
    this.webSocket.onclose = this.onWebSocketClose.bind(this);
    this.webSocket.onerror = this.onWebSocketError.bind(this);
    
    var msgFuncs = [];
    var func;
    for (var i = 0, len = GEN.messageCodes.length; i < len; i++) {
        func = this['onWebSocket_' + GEN.messageCodes[i]];
        if (func !== undefined) {
            msgFuncs.push(func.bind(this));
        } else {
            msgFuncs.push(null);
        }
    }
    
    this.webSocket.onmessage = function (e) {
        var data = e.data;
        var code = data.charCodeAt(0);
        var msg = JSON.parse(data.substring(1));
        
        msgFuncs[code](msg);
    };
};

Game.prototype.setPc = function (pc) {
    this.pc = pc;
    this.pc.isRobot = false;
    
    // Replacing the color for the current player.
    changePcColors(this.pc.id);
    
    for (var key in this.pc.zones) {
        this.pc.zones[key].setNewOwner(this.pc);
    }
};

Game.prototype.giveZone = function (playerId, zoneId) {
    var player = this.players[playerId];
    
    var zone = this.gui.map.zones[zoneId];
    var prevOwner = zone.owner;
    
    if (prevOwner !== null) {
        delete prevOwner.zones[zoneId];
    }
    
    zone.setNewOwner(player);
    player.zones[zoneId] = zone;
};

Game.prototype.onWebSocketClose = function () {
    this.fatalError(STR.connectionClosed);
};

Game.prototype.onWebSocketError = function () {
    this.fatalError(STR.connectionError);
};

Game.prototype.onWebSocket_RoomInfoMsg = function (roomInfo) {
    if (roomInfo.isFull) {
        this.fatalError(STR.noMoreFreeSpots);
        return;
    }
    
    var playerInfos = roomInfo.players;
    
    for (var i = 0, len = playerInfos.length; i < len; i++) {
        this.initPlayer(playerInfos[i]);
    }
    
    var self = this.initPlayer(roomInfo.self);
    this.setPc(self);
    
    this.gui.self.add(STR.gameStarted, 'info');
};

Game.prototype.onWebSocket_PlayerTextMsg = function (msg) {
    var player = this.players[msg.id];
    
    var from = player.name;
    if (player.isRobot) {
        from += STR.robot;
    }
    if (msg.id === this.pc.id) {
        from += STR.me;
    }
    
    this.gui.messages.add(msg.text, 'msg', from);
};

Game.prototype.sendMsg = function (code, msg) {
    this.webSocket.send(String.fromCharCode(code) + JSON.stringify(msg));
};

Game.prototype.initPlayer = function (playerInfo) {
    var player = new Player({
        id: playerInfo.id,
        isRobot: !playerInfo.isHuman,
        name: playerInfo.name
    });

    this.players[player.id] = player;
    for (var k = 0; k < playerInfo.zones.length; k++) {
        this.giveZone(player.id, playerInfo.zones[k]);
    }
    
    return player;
};

Game.prototype.sendTextMessage = function (text) {
    text = text.trim();
    
    if (text.length === 0) {
        return;
    }
    
    if (text.length > GEN.maxMessageSize) {
        text = text.substring(0, GEN.maxTextMessageSize);
    }
    
    this.sendMsg(MID.FromTextMsg, {text: text});
}

Game.prototype.fatalError = function (text) {
    this.gui.self.add(text, 'error');
    this.gui.self.makeActive();
};