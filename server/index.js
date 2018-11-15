const WebSocket = require('ws');
const shortid = require('shortid');
const RoomsController = require('./controllers/RoomsController.js');

const WebSocketServer = new WebSocket.Server({
	port: 8081
});

// RoomsController: controls rooms and clients on the server
const rooms = new RoomsController();

// Client connected
WebSocketServer.on('connection', function connection(client) {
	console.log('Client connected');

	// Wrapper function to send JSON encoded data
	client.sendJSON = rawPayload => {
		if (client.readyState === 1) {
			client.send(JSON.stringify(rawPayload));
		}
	}

  client.metadata = {};
  client.metadata.id = shortid.generate();

	// Handle client message events
	client.on('message', function incoming(data) {
		// Always decode the data since
		// we're assuming all data is JSON encoded
		try {
			data = JSON.parse(data);

		} catch (error) {
			console.log(error);
		}

		console.log(data);

		// Data requires at least a "header" and "header.action" property
		if (data.header
				&& data.header.action) {

			const callback = rooms[data.header.action].bind(rooms);

			if (callback && typeof callback === 'function') {
				client.sendJSON(
					{
						header: data.header,
						body: callback(data, client)
					}
				);
			}
		} else {
			console.log('Header or action missing from data');
		}
	});

	client.on('close', function close() {
		console.log('Client disconnected');

		rooms.leave({
			header: {
				action: 'leave'
			}
		}, client)
	});
});
