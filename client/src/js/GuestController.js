class GuestController {
  constructor(elements, socket, roomCode) {
    window.controller = this;

    this.socket = socket;
    this.isGuest = true;
    this.roomCode = roomCode;
    this.playerIsReady = false;
    this.elements = elements;
    this.elements.button__play.classList.add('is-hidden');
    this.trackPosition = this.elements.seekbar__track.getBoundingClientRect();
    this.updateTime(0);

    this.socket.sendJSON({
      header: {
        action: 'join'
      },
      body: {
        room_id: this.roomCode
      }
    });

    const messageCallback = (event) => {
      let error, message;

      try {
        message = JSON.parse(event.data);
        // Mimic host state changes

      } catch (error) {
        // Handle error
      }

      if (message.header.action === 'join') {
        if (message.body && message.body.status === 'success') {
          this.elements.overlay.classList.add('is-closed');
          this.elements.player__roomCode.textContent = message.body.room_id;
          this.elements.player__viewerCount.textContent = message.body.viewerCount;

          this.player = new YT.Player('player', {
            videoId: message.body.videoId,
            playerVars: {
              'autoplay': 0,
              'controls': 0,
              'rel' : 0,
              'fs' : 0
            },
            events: {
              'onReady': this.initialise.bind(this)
            }
          });
        } else {
          // Room does not exist
          this.elements.responseMessage.textContent = 'Room does not exist';
          delete window.controller;
        }
      }

      if (message.header.action === 'updateViewerCount') {
        if (message.body.viewerCount) {
          this.elements.player__viewerCount.textContent = message.body.viewerCount;
        }
      }

      if (message.header.action === 'leave') {
        if (message.body.status === 'success') {
          this.elements.overlay.classList.remove('is-closed');
          this.player.stopVideo();
          this.player.destroy();
          this.socket.removeEventListener('message', messageCallback);
          window.clearInterval(this.timer);
          delete window.controller;
        }
      }

      if (message.header.action == 'updateState') {
        if (this.player && this.player.seekTo) {
          const timeDifference = (new Date().getTime() - message.body.timestamp) * 0.001;

          this.player.seekTo(message.body.time + timeDifference);
          this.stateHandler(message.body.state);
        } else {
          this.lastState = message.body;
        }
      }

      if (message.header.action === 'stateChange') {
        if (this.player.seekTo) {
          this.stateHandler(message.body.state);
        } else {
          this.state = message.body.state;
        }
      }
    }

    this.socket.addEventListener('message', messageCallback);
  }

  leftPad(str, length, pad = '0') {
    str = str.toString();

    while(str.length < length) {
      str = pad.toString() + str;
    }

    return str;
  }

  updateTime(seekingTime) {
    this.videoDuration = this.player ? this.player.getDuration() : null;
    const time = seekingTime || this.player ? this.player.getCurrentTime() : 0;
    const ratio = this.videoDuration ? (time / this.videoDuration) : 0;

    this.elements.seekbar__progress.style.width = (ratio * 100) + '%';
    this.elements.seekbar__thumb.style.left =
      ratio * this.trackPosition.width +
      this.elements.seekbar__thumb.offsetWidth * .5 + 'px';

    const elapsed = Math.round(time);
    const hours = Math.floor((elapsed % 86400) / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    const timeString = (hours < 1 ? '' : this.leftPad(hours, 2) + ':') + this.leftPad(minutes, 2) + ':' + this.leftPad(seconds, 2);

    this.elements.controls__time.textContent = timeString;
  }

  stateHandler(state) {
    const playBackCallbacks = {
      '-1': () => {
        // Unstarted
        this.player.playVideo();
      },
      '0': () => {
        // Ended
        this.player.stopVideo();
      },
      '1': () => {
        // Playing
        this.player.playVideo();
      },
      '2': () => {
        // Paused
        this.player.pauseVideo();
      },
      '3': () => {
        // Buffering
        this.player.pauseVideo();
      },
      '5': () => {
        // Queued
        this.player.stopVideo();
      }
    };

    if (state === 1) {
      window.clearInterval(this.timer);
      this.timer = window.setInterval(this.updateTime.bind(this), 100);
    } else {
      window.clearInterval(this.timer);
    }

    playBackCallbacks[state]();
  }

  initialise() {
    this.videoDuration = this.player.getDuration();
    this.playerIsReady = true;
    this.elements.overlay.classList.remove('is-loading');

    if (this.lastState) {
      const timeDifference = (new Date().getTime() - this.lastState.timestamp) * 0.001;

      this.player.seekTo(this.lastState.time + timeDifference, true);
      this.stateHandler(this.lastState.state);
    }
  }
}
