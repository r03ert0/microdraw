/*
	Microdraw Server
	Roberto Toro, 24 February 2016
*/

var	debug=1;

var WebSocketServer=require("ws").Server; //https://github.com/websockets/ws

console.log("microdrawServer.js");

initSocketConnection();

function initSocketConnection() {
	// WS connection
	var host = "ws://localhost:8080";
	
	try {
		websocket = new WebSocketServer({port:8080});
		websocket.on("connection",function(s) {

			s.on('message',function(msg) {
				var	data=JSON.parse(msg);
				
				// integrate paint messages
				switch(data.type) {
					case "setBounds":
						// broadcast
						for(var i in websocket.clients) {
							if(websocket.clients[i]==s)
								continue;
							websocket.clients[i].send(JSON.stringify(data));
						}
						break;
				}

			});
			
			s.on('close',function(msg) {
				console.log(new Date(),"[connection: close]");
			});
		});
	} catch (ex) {
		console.log(new Date(),"ERROR: Unable to create a server",ex);
	}
}