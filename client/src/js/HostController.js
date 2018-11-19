export default class HostController {
  constructor(elements, socket, videoId) {
    // Bind self to window
    window.controller = this;

    // Bind parameters to self
    this.elements = elements;
    this.socket = socket;
    this.videoId = videoId;

    // Default states
    this.playBackState = 0;
    this.isSeeking = false;

    // Calculate defaults
    this.trackPosition = this.elements.seekbar__track.getBoundingClientRect();
    this.elements.button__play.classList.remove('is-hidden');

    // Load YT player
    this.player = new YT.Player('player', {
      videoId: videoId,
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
  }

  leftPad(str, length, pad = '0') {
    str = str.toString();

    while(str.length < length) {
      str = pad.toString() + str;
    }

    return str;
  }

  updateTime(seekingTime) {
    const time = seekingTime || this.player.getCurrentTime();
    const ratio = (time / this.videoDuration);

    if (!this.isSeeking && !seekingTime) {
      this.elements.seekbar__progress.style.width = (ratio * 100) + '%';
      this.elements.seekbar__thumb.style.left =
        ratio * this.trackPosition.width +
        this.elements.seekbar__thumb.offsetWidth * .5 + 'px';
    }

    if (!this.isSeeking || (this.isSeeking && seekingTime)) {
      const elapsed = Math.round(time);
      const hours = Math.floor((elapsed % 86400) / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;
      const timeString = (hours < 1 ? '' : this.leftPad(hours, 2) + ':') + this.leftPad(minutes, 2) + ':' + this.leftPad(seconds, 2);

      this.elements.controls__time.textContent = timeString;
    }
  }

  initialise() {
    this.videoDuration = this.player.getDuration();
    this.elements.overlay.classList.remove('is-loading');

    this.updateTime(0);

    this.socket.sendJSON({
      header: {
        action: 'host'
      },
      body: {
        videoId: this.videoId
      }
    });

    const stateChangeCallback = (event) => {
      // Propagate state changes to the guests
      this.socket.sendJSON({
        header: {
          action: 'stateChange'
        },
        body: {
          state: event.data,
          timestamp: new Date().getTime()
        }
      });

      if (event.data === 1) {
        this.elements.button__play.classList.add('controls__button--is-playing');
        this.playBackState = 1;

        window.clearInterval(this.timer);
        this.timer = window.setInterval(this.updateTime.bind(this), 100);
      } else {
        this.elements.button__play.classList.remove('controls__button--is-playing');
        this.playBackState = 0;
        window.clearInterval(this.timer);
      }
    };

    this.player.addEventListener('onStateChange', stateChangeCallback);

    const messageCallback = (event) => {
      let error, message;

      try {
        message = JSON.parse(event.data);
      } catch (error) {
        // Handle error
      }

      if (message.header.action === 'host') {
        if (message.body.room_id) {
          this.elements.overlay.classList.add('is-closed');
          this.elements.player__roomCode.textContent = message.body.room_id;
          this.elements.player__viewerCount.textContent = message.body.viewerCount;
        }
      }

      if (message.header.action === 'updateViewerCount') {
        if (message.body.viewerCount) {
          this.elements.player__viewerCount.textContent = message.body.viewerCount;
        }
      }

      if (message.header.action === 'requestState') {
        this.socket.sendJSON({
          header: {
            action: 'updateState'
          },
          body: {
            guest: message.body.guest,
            state: this.player.getPlayerState(),
            time: this.player.getCurrentTime(),
            timestamp: new Date().getTime()
          }
        });
      }

      if (message.header.action === 'leave') {
        if (message.body.status === 'success') {
          this.elements.overlay.classList.remove('is-closed');
          this.player.stopVideo();
          this.player.destroy();
          this.socket.removeEventListener('message', messageCallback);
          clearInterval(this.timer);
          delete window.controller;
        }
      }
    };

    this.socket.addEventListener('message', messageCallback);
  }
}
