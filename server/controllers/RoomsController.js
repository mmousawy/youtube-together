const Room = require('../objects/Room.js');

class RoomsController {
	constructor()
	{
		this.rooms = {};
	}

	host(data, client)
	{
		if (client.metadata.room) {
			return;
		}

		const room = new Room(client);

		this.rooms[room.id] = room;

		client.metadata.room = room;
		client.metadata.role = 'host';

		// Return the room ID
		return {
			room_id: room.id
		};
	}

	join(data, client)
	{
		if (client.metadata.room) {
			return;
		}

		const room = this.rooms[data.body.room_id];

		if (!room) {
			console.log('Room does not exist!');
			return;
		}

		room.guests.push(client);

		client.metadata.room = room;
		client.metadata.role = 'guest';

		// Return success
		return {
			room_id: room.id,
			status: 'success'
		};
	}

	leave(data, client)
	{
		const room = client.metadata.room;

		if (!room) {
			console.log('Room does not exist!');
			return;
		}

		console.log('Client is leaving...');

		// Client is host of room
		// Kick out all guests before destroying the room
		if (client.metadata.role === 'host') {
			room.guests.forEach(guest => {
				guest.sendJSON(
					{
						header: data.header,
						body: this.leave(data, guest)
					}
				);
			});

			delete this.rooms[room.id];
		} else {
			// Remove guest client from room
			room.guests = room.guests.filter(clientInRoom => clientInRoom !== client);
		}

		// Remove reference to room for client
		delete client.metadata.room;
		delete client.metadata.role;

		// Return success
		return {
			status: 'success'
		};
	}

	stateChange(data, client)
	{
		const room = client.metadata.room;

		if (!room) {
			return;
		}

		room.guests.forEach(guest => {
			guest.sendJSON({
				header: data.header,
				body: {
					state: data.body.state
				}
			});
		});

		// Return success
		return {
			status: 'success'
		};
	}
}

module.exports = RoomsController;
