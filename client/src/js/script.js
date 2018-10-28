class HostController {
  constructor(socket, player) {
    this.socket = socket;

    this.player = new YT.Player('player', {
      videoId: 'Ep3Hnc7KZVo'
    });

    this.overlay = document.querySelector('.overlay');
    this.roomcodeElement = document.querySelector('.player__room-code');
  }

  initialise() {
    this.player.addEventListener('onReady', () => {
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
      };

      this.player.addEventListener('onStateChange', stateChangeCallback);
    });

    const messageCallback = (event) => {
      let error, message;

      try {
        message = JSON.parse(event.data);
        console.log(message);

      } catch (error) {
        //
      }

      if (message.header.action === 'host') {
        if (message.body.room_id) {
          this.overlay.classList.add('is-closed');
          this.roomcodeElement.textContent = message.body.room_id;
        }
      }

      if (message.header.action === 'leave') {
        if (message.body.status === 'success') {
          this.overlay.classList.remove('is-closed');
          this.player.stopVideo();
          this.player.destroy();
          this.socket.removeEventListener('message', messageCallback);
        }
      }
    };

    this.socket.addEventListener('message', messageCallback);
  }
}

class GuestController {
  constructor(socket, player) {
    this.socket = socket;
    this.player = new YT.Player('player', {
      videoId: 'Ep3Hnc7KZVo'
    });
    this.overlay = document.querySelector('.overlay');
    this.roomcodeElement = document.querySelector('.player__room-code');
  }

  initialise() {
    this.socket.addEventListener('message', (event) => {
      let error, message;

      try {
        message = JSON.parse(event.data);
        console.log(message);
        // Mimic host state changes

      } catch (error) {
        //
      }

      if (message.header.action === 'join') {
        if (message.body.status === 'success') {
          this.overlay.classList.add('is-closed');
          this.roomcodeElement.textContent = message.body.room_id;
        }
      }

      if (message.header.action === 'leave') {
        if (message.body.status === 'success') {
          this.overlay.classList.remove('is-closed');
          this.player.stopVideo();
          this.player.destroy();
        }
      }

      if (message.header.action === 'stateChange') {
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
        };

        playBackCallbacks[message.body.state]();
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

      // Host a room
      button__host.addEventListener('click', event => {
        controller = new HostController(socket, player);
        controller.initialise();

        controller.socket.sendJSON({
          header: {
            action: 'host'
          }
        });
      });

      // Join a room
      button__join.addEventListener('click', event => {
        const roomCode = input__roomCode.value;

        if (roomCode.length < 7) {
          return;
        }

        controller = new GuestController(socket, player);
        controller.initialise();

        controller.socket.sendJSON({
          header: {
            action: 'join'
          },
          body: {
            room_id: roomCode
          }
        });
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
