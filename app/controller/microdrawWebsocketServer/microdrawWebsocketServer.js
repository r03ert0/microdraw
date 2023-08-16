const fs = require('fs');
const os = require('os');
const path = require('path');

// data sanitisation
const createDOMPurify = require('dompurify');
const {JSDOM} = require('jsdom');
const {window} = (new JSDOM('', {
  features: {
    FetchExternalResources: false, // disables resource loading over HTTP / filesystem
    ProcessExternalResources: false // do not execute JS within script blocks
  }
}));
const DOMPurify = createDOMPurify(window);

// Get whitelist and blacklist
const useWhitelist = false;
const useBlacklist = true;
const whitelist = JSON.parse(fs.readFileSync(path.join(__dirname, "whitelist.json")));
const blacklist = JSON.parse(fs.readFileSync(path.join(__dirname, "blacklist.json")));

// var http = require('http');
const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;
var websocketserver;

const microdrawWebsocketServer = (function () {
  const me = {
    dataDirectory: '',

    _handleUserWebSocketMessage: ({data, ws}) => {
      switch(data.type) {
      default:
        break;
      }
    },

    _fitsBroadcastExclusionCriteria: ({data}) => {
      return false;
    },
    
    _fitsBroadcastInclusionCriteria: ({data}) => {
      let include = false;
      if (data.type === "chat") {
        include = true;
      }

      return include;
    },
    
    _handleBroadcastWebSocketMessage: function ({data, ws}) {
      // scan through connected users
      websocketserver.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          // check exclusion criteria
          // if(me._fitsBroadcastExclusionCriteria({sourceUS, targetUS})) {
          //   return;
          // }

          // check inclusion criteria
          // if(!me._fitsBroadcastInclusionCriteria({sourceUS, targetUS, data})) {
          //   return;
          // }

          // sanitise data
          const cleanData = DOMPurify.sanitize(JSON.stringify(data));

          // do broadcast
          try {
            client.send(cleanData);
          } catch (err) {
            console.log("ERROR:", err);
          }
        }
      });
    },

    _handleWebSocketMessage: ({msg, ws}) => {
      const data = JSON.parse(msg);

      // handle single user messages
      me._handleUserWebSocketMessage({data, ws});

      // handle message broadcast
      me._handleBroadcastWebSocketMessage({data, ws});
    },

    _handleWebSocketConnection: (ws, req) => {
      ws.on('message', function (msg) {
        me._handleWebSocketMessage({msg, ws});
      });
      ws.on('close', async () => {
        console.log("disconnect user");
      });
    },

    initSocketConnection: () => {
      console.log(`
===================================
Starting microdrawWebsocketServer.js
date: ${new Date()}
free memory: ${os.freemem()}
===================================
`);

      me.server.on("upgrade", (req, socket) => {
        let ip = req.ip
          || req.connection.remoteAddress
          || req.socket.remoteAddress
          || req.connection.socket.remoteAddress;
        ip = ip.split(":").pop();
        console.log("Upgrading server with IP:", ip);

        if(useWhitelist && !whitelist[ip]) {
          console.log("------------------------------> not in whitelist", ip);
          setTimeout(function() {
            console.log("not in whitelist: end");
            socket.destroy();
          }, 5000);
        }

        if (useBlacklist && blacklist[ip]) {
          console.log("------------------------------> blacklist", ip);
          setTimeout(function() {
            console.log("blacklist: end");
            socket.destroy();
          }, 5000);
        }
      });

      // Init WS connection
      try {
        websocketserver = new WebSocketServer({
          server: me.server,
          // verifyClient: me.verifyClient
        });
        websocketserver.on("connection", me._handleWebSocketConnection);
      } catch (ex) {
        console.log("ERROR: Unable to create a Web socket server", ex);
      }
    }
  };

  return me;
} () );

module.exports = microdrawWebsocketServer;
