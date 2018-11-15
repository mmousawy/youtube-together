const shortid = require('shortid');

class Room {
	constructor(host, videoId)
	{
		this.id = shortid.generate();
		this.host = host;
		this.guests = [];
		this.videoId = videoId;
		this.state = 0;

		console.log('New room created:', this.id);
	}
}

module.exports = Room;
