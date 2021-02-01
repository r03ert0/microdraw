/**
 * Websocket
 */

/* global Microdraw */

let wshostname;
if(Microdraw.secure) {
  wshostname = "wss://" + Microdraw.wshostname;
} else {
  wshostname = "ws://" + Microdraw.wshostname;
}
var ws = new window.WebSocket(wshostname);

/**
  * @param {object} data Data received
  * @returns {void}
  */
const receiveChatMessage = (data) => {
  const {dom} = Microdraw;
  const theUsername = (data.username === "Anonymous")?data.uid:data.username;
  const msg = "<b>" + theUsername + ":</b> " + data.msg + "<br />";
  dom.querySelector("#logChat .text").innerHTML += msg;
  dom.querySelector("#logChat .text").scrollTop = dom.querySelector("#logChat .text").scrollHeight;
};

const _getUserName = () => {
  let username = document.querySelector("#MyLogin a").innerText;

  if (typeof username === "undefined" || username === "Log in with GitHub") {
    username = "Anonymous";
  }

  return username;
};

const _makeMessageObject = () => {
  const {dom} = Microdraw;

  const msg = dom.querySelector('input#msg').value;

  return {
    type: "chat",
    msg,
    username: _getUserName()
  };
};

const _displayOwnMessage = (msg) => {
  const {dom} = Microdraw;
  msg = "<b>me: </b>" + msg + "<br />";
  dom.querySelector("#logChat .text").innerHTML += msg;
  dom.querySelector("#logChat .text").scrollTop = dom.querySelector("#logChat .text").scrollHeight;
  dom.querySelector('input#msg').value = "";
};

/**
  * @returns {void}
  */
const sendChatMessage = () => {
  const obj = _makeMessageObject();

  try {
    ws.send(JSON.stringify(obj));
    _displayOwnMessage(obj.msg);
  } catch (ex) {
    console.log("ERROR: Unable to sendChatMessage", ex);
  }
};

const receiveFunctions = {
  "chat": receiveChatMessage
};

/**
* @param {object} msg The message received
* @returns {void}
*/
const receiveSocketMessage = (msg) => {
  var data = JSON.parse(msg.data);
  receiveFunctions[data.type](data);
};

ws.onopen = () => {
  console.log("open");

  const {dom} = Microdraw;
  dom.querySelector("#msg").onkeypress = (e) => {
    if (e.keyCode === 13) {
      sendChatMessage();
    }
  };

  dom.querySelector("#notifications").innerHTML = "Chat";

  const obj = {
    type: "chat",
    msg: "entered",
    username: _getUserName()
  };
  ws.send(JSON.stringify(obj));
};

ws.onmessage = receiveSocketMessage;

ws.onerror = () => {
  console.log("error");
};
