class HostController {
  constructor(socket, videoId) {
    this.socket = socket;
    this.playBackState = 0;
    this.isSeeking = false;
    this.videoId = videoId;

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

    this.seekbar = document.querySelector('.seekbar');
    this.seekbar__track = document.querySelector('.seekbar__track');
    this.seekbar__progress = document.querySelector('.seekbar__progress');
    this.seekbar__thumb = document.querySelector('.seekbar__thumb');
    this.controls__time = document.querySelector('.controls__time');
    this.button__play = document.querySelector('.controls__button--play');
    this.button__volume = document.querySelector('.controls__button--volume');

    this.overlay = document.querySelector('.overlay');
    this.roomCodeElement = document.querySelector('.player__room-code');

    this.trackPosition = this.seekbar__track.getBoundingClientRect();

    this.button__play.classList.remove('is-hidden');

    window.controller = this;
  }

  updateTime(seekingTime) {
    const time = seekingTime || this.player.getCurrentTime();
    const ratio = (time / this.videoDuration);

    if (!this.isSeeking && !seekingTime) {
      this.seekbar__progress.style.width = (ratio * 100) + '%';
      this.seekbar__thumb.style.left =
        ratio * this.trackPosition.width +
        this.seekbar__thumb.offsetWidth * .5 + 'px';
    }

    if (!this.isSeeking || (this.isSeeking && seekingTime)) {
      const seconds = Math.round(time);
      const timeString =
        (seconds < 60 ? '00' : (seconds < 600 ? '0' : '') +
          Math.floor(seconds / 60)) +
        ':' +
        ((seconds % 60) < 10 ? '0' : '') + seconds % 60;

      this.controls__time.textContent = timeString;
    }
  }

  initialise() {
    this.videoDuration = this.player.getDuration();
    this.overlay.classList.remove('is-loading');

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
          state: event.data
        }
      });

      if (event.data === 1) {
        this.button__play.classList.add('controls__button--is-playing');
        this.playBackState = 1;
        this.timer = window.setInterval(this.updateTime.bind(this), 100);
      } else {
        this.button__play.classList.remove('controls__button--is-playing');
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
          this.overlay.classList.add('is-closed');
          this.roomCodeElement.textContent = message.body.room_id;
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
            time: this.player.getCurrentTime()
          }
        });
      }

      if (message.header.action === 'leave') {
        if (message.body.status === 'success') {
          this.overlay.classList.remove('is-closed');
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

class GuestController {
  constructor(socket, roomCode) {
    this.socket = socket;
    this.playBackState = 0;
    this.isGuest = true;
    this.roomCode = roomCode;


    this.player = new YT.Player('player', {
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

    this.seekbar = document.querySelector('.seekbar');
    this.seekbar__track = document.querySelector('.seekbar__track');
    this.seekbar__progress = document.querySelector('.seekbar__progress');
    this.seekbar__thumb = document.querySelector('.seekbar__thumb');
    this.controls__time = document.querySelector('.controls__time');
    this.button__play = document.querySelector('.controls__button--play');
    this.button__volume = document.querySelector('.controls__button--volume');
    this.responseMessage = document.querySelector('.overlay__response-message');

    this.overlay = document.querySelector('.overlay');
    this.roomCodeElement = document.querySelector('.player__room-code');

    this.button__play.classList.add('is-hidden');

    this.trackPosition = this.seekbar__track.getBoundingClientRect();

    window.controller = this;
  }

  updateTime() {
    const time = this.player.getCurrentTime();
    const ratio = (time / this.videoDuration);

    this.seekbar__progress.style.width = (ratio * 100) + '%';
    this.seekbar__thumb.style.left =
      ratio * this.trackPosition.width +
      this.seekbar__thumb.offsetWidth * .5 + 'px';

    const seconds = Math.round(time);
    const timeString =
      (seconds < 60 ? '00' : (seconds < 600 ? '0' : '') +
        Math.floor(seconds / 60)) +
      ':' +
      ((seconds % 60) < 10 ? '0' : '') + seconds % 60;

    this.controls__time.textContent = timeString;
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
      this.timer = window.setInterval(this.updateTime.bind(this), 100);
    } else {
      window.clearInterval(this.timer);
    }

    playBackCallbacks[state]();
  }

  initialise() {
    this.overlay.classList.remove('is-loading');
    this.videoDuration = this.player.getDuration();

    this.updateTime(0);

    this.socket.sendJSON({
      header: {
        action: 'join'
      },
      body: {
        room_id: this.roomCode
      }
    });

    this.socket.addEventListener('message', (event) => {
      let error, message;

      try {
        message = JSON.parse(event.data);
        // Mimic host state changes

      } catch (error) {
        // Handle error
      }

      if (message.header.action === 'join') {
        if (message.body && message.body.status === 'success') {
          this.overlay.classList.add('is-closed');
          this.roomCodeElement.textContent = message.body.room_id;
          this.player.loadVideoById({
            videoId: message.body.videoId
          });

          this.videoDuration = this.player.getDuration();
        } else {
          // Room does not exist
          this.responseMessage.textContent = 'Room does not exist';
          this.player.destroy();
          delete window.controller;
        }
      }

      if (message.header.action === 'leave') {
        if (message.body.status === 'success') {
          this.overlay.classList.remove('is-closed');
          this.player.stopVideo();
          this.player.destroy();
          clearInterval(this.timer);
          delete window.controller;
        }
      }

      if (message.header.action == 'updateState') {
        this.player.seekTo(message.body.time, true);
        this.stateHandler(message.body.state);
      }

      if (message.header.action === 'stateChange') {
        this.stateHandler(message.body.state);
      }
    });
  }
}

(function() {
  // Load the YouTube iFrame API
  const scriptNode = document.createElement('script');
  scriptNode.src = 'http://www.youtube.com/iframe_api';
  document.body.appendChild(scriptNode);

  /* Instantiate the YouTube Player and the controller
     once the iFrame API has been loaded */
  window.onYouTubeIframeAPIReady = () => {
    let socket;

    socket = new WebSocket('ws://127.0.0.1:8081');

    // Wrapper function to send JSON encoded data
    socket.sendJSON = rawPayload => socket.send(JSON.stringify(rawPayload));

    socket.addEventListener('open', () => {
      initialisePage();
    });

    const initialisePage = () => {
      let controller;

      // Page interaction
      const button__host = document.querySelector('.button--host');
      const button__join = document.querySelector('.button--join');
      const button__leave = document.querySelector('.button--leave');
      const input__roomCode = document.querySelector('.input--join');
      const input__videoId = document.querySelector('.input--video-id');

      const overlay__hostForm = document.querySelector('.overlay__host-form');
      const overlay__joinForm = document.querySelector('.overlay__join-form');

      // Controls interaction
      const seekbar = document.querySelector('.seekbar');
      const seekbar__track = document.querySelector('.seekbar__track');
      const seekbar__progress = document.querySelector('.seekbar__progress');
      const seekbar__thumb = document.querySelector('.seekbar__thumb');
      const button__play = document.querySelector('.controls__button--play');
      const button__volume = document.querySelector('.controls__button--volume');

      const overlay = document.querySelector('.overlay');
      const responseMessage = document.querySelector('.overlay__response-message');

      overlay__hostForm.addEventListener('submit', event => {
        event.preventDefault();
        return false;
      });

      overlay__joinForm.addEventListener('submit', event => {
        event.preventDefault();
        return false;
      });

      // Play/pause
      button__play.addEventListener('click', event => {
        if (controller.isGuest) {
          return;
        }

        if (controller.playBackState === 0) {
          button__play.classList.add('controls__button--is-playing');
          controller.playBackState = 1;
          controller.player.playVideo();

          return;
        }

        button__play.classList.remove('controls__button--is-playing');
        controller.playBackState = 0;
        controller.player.pauseVideo();
      });

      // Seek
      seekbar.addEventListener('mousedown', event => {
        if (controller.isGuest) {
          return;
        }

        controller.isSeeking = true;

        addEventListener('mousemove', updateSeekbar);

        updateSeekbar(event);
      });

      updateSeekbar = (event) => {
        if (!event || !event.clientX) {
          return;
        }

        const seekbarPosition = seekbar.getBoundingClientRect();
        const trackPosition = seekbar__track.getBoundingClientRect();
        let position = Math.round(
          event.clientX - seekbarPosition.left + (seekbarPosition.left - trackPosition.left)
        );

        position = (position < 0 ? 0 : (position > trackPosition.width ? trackPosition.width : position));

        const positionRatio = position / trackPosition.width;
        const positionPercentage = positionRatio * 100;

        seekbar__progress.style.width = positionPercentage + '%';
        seekbar__thumb.style.left = position + seekbar__thumb.offsetWidth * .5 + 'px';

        controller.seekPositionRatio = positionRatio;
        controller.trackPosition = trackPosition;
        controller.seekPositionTime = positionRatio * controller.videoDuration;

        controller.updateTime.bind(controller, controller.seekPositionTime)();
      }

      // Seek
      window.addEventListener('mouseup', event => {
        if (!controller
          || controller.isGuest
          || !controller.isSeeking) {
          return;
        }

        controller.player.seekTo(controller.seekPositionTime, true);

        controller.socket.sendJSON({
          header: {
            action: 'updateState'
          },
          body: {
            state: controller.player.getPlayerState(),
            time: controller.seekPositionTime
          }
        })

        window.removeEventListener('mousemove', updateSeekbar);

        controller.isSeeking = false;
      });

      // Host a room
      button__host.addEventListener('click', event => {
        overlay.classList.add('is-loading');
        responseMessage.textContent = '';
        const videoId = input__videoId.value;

        controller = new HostController(socket, videoId);
      });

      // Join a room
      button__join.addEventListener('click', event => {
        const roomCode = input__roomCode.value;

        if (roomCode.length < 7 || roomCode.length > 14) {
          return;
        }

        overlay.classList.add('is-loading');

        responseMessage.textContent = '';
        controller = new GuestController(socket, roomCode);
      });

      // Leave current room
      button__leave.addEventListener('click', event => {
        controller.socket.sendJSON({
          header: {
            action: 'leave'
          }
        });
      });
    };
  };
})();
