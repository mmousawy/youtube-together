class HostController {
  constructor(player) {
    this.player = player;
    this.player.addEventListener('onReady', this.ready);
    this.player.addEventListener('onStateChange', this.stateChange);
  }

  ready() {
    // Connect to the node server
  }

  stateChange() {
    //
  }

  //
}

class GuestController {
  constructor(player) {
    this.player = player;
    this.player.addEventListener('onReady', this.ready);
    this.player.addEventListener('onStateChange', this.stateChange);
  }

  ready() {
    // Connect to the node server
  }

  stateChange() {

  }
}

(function() {
  // Load the YouTube iFrame API
  const scriptNode = document.createElement('script');
  scriptNode.src = 'https://www.youtube.com/iframe_api';
  document.body.appendChild(scriptNode);

  /* Instantiate the YouTube Player and the controller
     once the iFrame API has been loaded */
  window.onYouTubeIframeAPIReady = () => {
    let player = new YT.Player('player', {
      width: 1280, // 16
      height: 720 // 9
    });

    let controller = new HostController(player);
    // let controller = new GuestController(player);
  };
})();
