const shortid = require('shortid');

class Room {
	constructor(host)
	{
		this.id = shortid.generate();
		this.host = host;
		this.guests = [];
		this.videoId;
		this.state = 0;

		console.log('New room created:', this.id);
	}
}

module.exports = Room;
