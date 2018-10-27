class HostController {
  constructor(socket, player) {
    this.socket = socket;
    this.player = player;
  }

  initialise() {
    this.socket.addEventListener('message', (event) => {
      let error, message;

      try {
        message = JSON.parse(event.data);
      } catch (error) {
        //
      }
    });

    this.player.addEventListener('onStateChange', (event) => {
      // Propagate state changes to the guests
      this.socket.send(JSON.stringify({}));
    });
  }
}

class GuestController {
  constructor(socket, player) {
    this.socket = socket;
    this.player = player;
  }

  initialise() {
    this.socket.addEventListener('message', (event) => {
      let error, message;

      try {
        message = JSON.parse(event.data);
        // Mimic host state changes

      } catch (error) {
        //
      }
    });

    this.player.addEventListener('onStateChange', (event) => {
      //
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
    const player = new YT.Player('player', {
      width: 1280, // 16:
      height: 720 // :9
    });

    const socket = new WebSocket('ws://127.0.0.1:8081');
    const controller = new HostController(socket, player);
    // const controller = new GuestController(socket, player);

    // TODO: Wait for the socket to be ready as well
    player.addEventListener('onReady', () => controller.initialise());
  };
})();
